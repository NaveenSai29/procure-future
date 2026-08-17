import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ImageGeneratorService } from '@/services/image-generator.service';

// POST - Generate AI image for product
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id },
      include: { supplier: { select: { id: true, businessName: true } } },
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productId, action } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Verify product belongs to supplier
    const product = await prisma.product.findFirst({
      where: { 
        id: productId,
        supplierId: supplierStaff.supplierId,
      },
      include: { category: { select: { name: true } }, brand: { select: { name: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    switch (action) {
      case 'generate': {
        // Check generation allowed (credits + per-product limit)
        const check = await ImageGeneratorService.checkGenerationAllowed(
          supplierStaff.supplierId,
          productId
        );

        if (!check.allowed) {
          return NextResponse.json({
            success: false,
            error: check.reason,
            blocked: true,
            data: {
              creditsRemaining: check.creditsRemaining || 0,
              generationsUsed: check.generationsUsed,
              maxGenerations: check.maxGenerations,
            },
          }, { status: 403 });
        }

        // Generate single AI image
        const result = await ImageGeneratorService.generateAI(
          product.name,
          product.category?.name || 'Product',
          product.description || '',
          product.weight ? String(product.weight) : '',
          product.unit || 'PCS'
        );

        return NextResponse.json({
          success: result.success,
          data: result,
        });
      }

      case 'generate-temp': {
        // Check generation allowed (credits + per-product limit)
        const check = await ImageGeneratorService.checkGenerationAllowed(
          supplierStaff.supplierId,
          productId
        );

        if (!check.allowed) {
          return NextResponse.json({
            success: false,
            error: check.reason,
            blocked: true,
            data: {
              creditsRemaining: check.creditsRemaining || 0,
              generationsUsed: check.generationsUsed,
              maxGenerations: check.maxGenerations,
            },
          }, { status: 403 });
        }

        // Get current generation count for angle tracking
        const existingGenerations = await prisma.aIGenerationLog.count({
          where: {
            supplierId: supplierStaff.supplierId,
            productId,
            status: 'SUCCESS',
            action: 'GENERATE',
          },
        });

        // Generate AI image (temporary - not saved to database)
        const result = await ImageGeneratorService.generateAI(
          product.name,
          product.category?.name || 'Product',
          product.description || '',
          product.weight ? String(product.weight) : '',
          product.unit || 'PCS',
          product.brand?.name || '',
          existingGenerations
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Deduct credit immediately
        const settings = await ImageGeneratorService.getSettings();
        await ImageGeneratorService.deductCredits(supplierStaff.supplierId, settings.creditCostPerGeneration);
        
        // Log generation (status: PENDING_Save - will update on submit)
        await ImageGeneratorService.logGeneration(
          supplierStaff.supplierId,
          productId,
          'GENERATE',
          result.prompt,
          result.imageUrl,
          'SUCCESS'
        );

        // Get updated credits
        const creditInfo = await ImageGeneratorService.getSupplierCredits(supplierStaff.supplierId);

        return NextResponse.json({
          success: true,
          data: {
            ...result,
            imageUrl: result.imageUrl,
            creditsRemaining: creditInfo.creditsRemaining,
            creditsDeducted: settings.creditCostPerGeneration,
          },
        });
      }

      case 'variations': {
        // Check generation allowed
        const check = await ImageGeneratorService.checkGenerationAllowed(
          supplierStaff.supplierId,
          productId
        );

        if (!check.allowed) {
          return NextResponse.json({
            success: false,
            error: check.reason,
            blocked: true,
            data: {
              creditsRemaining: check.creditsRemaining || 0,
              generationsUsed: check.generationsUsed,
              maxGenerations: check.maxGenerations,
            },
          }, { status: 403 });
        }

        // Generate multiple AI variations
        const variations = await ImageGeneratorService.generateAIVariations(
          product.name,
          product.category?.name || 'Product',
          product.description || '',
          product.weight ? String(product.weight) : '',
          product.unit || 'PCS',
          3
        );

        return NextResponse.json({
          success: true,
          data: { 
            images: variations,
            creditsRemaining: check.creditsRemaining,
          },
        });
      }

      case 'search': {
        // Search web images (free - no credit deduction)
        const query = body.query || product.name;
        const count = body.count || 10;
        const images = await ImageGeneratorService.searchWebImages(query, count);

        return NextResponse.json({
          success: true,
          data: { images },
        });
      }

      case 'save-generated': {
        // Save all generated images to product (called on submit)
        const imageUrls = body.imageUrls || [];
        
        if (imageUrls.length === 0) {
          return NextResponse.json({ error: 'No images to save' }, { status: 400 });
        }

        const savedImages = [];
        
        for (const imageUrl of imageUrls) {
          // Download and save to server
          const savedImage = await ImageGeneratorService.downloadAndSaveImage(
            imageUrl,
            productId,
            'AI_GENERATED'
          );

          if (savedImage.success) {
            // Attach to product
            const productImage = await prisma.productImage.create({
              data: {
                productId,
                url: savedImage.url,
                alt: product.name,
                sortOrder: 0,
                isPrimary: false,
              },
            });
            
            // Save to Media library
            await prisma.media.create({
              data: {
                fileName: savedImage.url.split('/').pop(),
                originalName: `${product.name}-ai-generated.jpg`,
                fileUrl: savedImage.url,
                fileType: 'image/jpeg',
                fileSize: 0,
                entityType: 'PRODUCT',
                entityId: productId,
              },
            });
            
            savedImages.push(productImage);
          }
        }

        return NextResponse.json({
          success: true,
          data: { images: savedImages },
        });
      }

      case 'save': {
        // Save selected image to product (deduct credits if AI generated)
        const imageUrl = body.imageUrl;
        const source = body.source || 'SELECTED';

        if (!imageUrl) {
          return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        // If source is AI_GENERATED, check and deduct credits
        if (source === 'AI_GENERATED') {
          const check = await ImageGeneratorService.checkGenerationAllowed(
            supplierStaff.supplierId,
            productId
          );

          if (!check.allowed) {
            return NextResponse.json({
              success: false,
              error: check.reason,
              blocked: true,
            }, { status: 403 });
          }

          const settings = await ImageGeneratorService.getSettings();
          await ImageGeneratorService.deductCredits(supplierStaff.supplierId, settings.creditCostPerGeneration);
          await ImageGeneratorService.logGeneration(
            supplierStaff.supplierId,
            productId,
            'GENERATE',
            body.prompt || '',
            imageUrl,
            'SUCCESS'
          );
        }

        const savedImage = await ImageGeneratorService.downloadAndSaveImage(
          imageUrl,
          productId,
          source
        );

        if (!savedImage.success) {
          return NextResponse.json({ error: savedImage.error }, { status: 500 });
        }

        // Attach to product
        const productImage = await prisma.productImage.create({
          data: {
            productId,
            url: savedImage.url,
            alt: product.name,
            sortOrder: 0,
            isPrimary: true,
          },
        });

        // Get updated credits
        const creditInfo = await ImageGeneratorService.getSupplierCredits(supplierStaff.supplierId);

        return NextResponse.json({
          success: true,
          data: { 
            image: productImage,
            creditsRemaining: creditInfo.creditsRemaining,
          },
        });
      }

      case 'auto-generate-and-attach': {
        // Auto-generate and attach image (with credit check built-in)
        const result = await ImageGeneratorService.autoGenerateForProduct(
          product,
          supplierStaff.supplier.businessName
        );

        if (!result.success) {
          if (result.blocked) {
            return NextResponse.json({
              success: false,
              error: result.error,
              blocked: true,
              data: {
                creditsRemaining: result.creditsRemaining || 0,
                generationsUsed: result.generationsUsed,
                maxGenerations: result.maxGenerations,
              },
            }, { status: 403 });
          }
          
          return NextResponse.json({ 
            success: false,
            error: result.error,
            blocked: false,
          }, { status: 500 });
        }

        const createdImage = await prisma.productImage.findFirst({
          where: { 
            productId,
            url: result.url,
          },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
          success: true,
          data: {
            ...result,
            imageId: createdImage?.id || null,
          },
        });
      }

      case 'credits': {
        const creditInfo = await ImageGeneratorService.getSupplierCredits(supplierStaff.supplierId);
        
        return NextResponse.json({
          success: true,
          data: creditInfo,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}