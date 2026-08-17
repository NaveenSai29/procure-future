import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ImageGeneratorService } from '@/services/image-generator.service';

// POST - Bulk auto-generate images for multiple products
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id },
      include: { supplier: { select: { businessName: true } } },
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const body = await request.json();
    const { productIds, autoSubmit = false } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 });
    }

    // Verify all products belong to supplier
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        supplierId: supplierStaff.supplierId,
      },
      include: { category: { select: { name: true } } },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    // Filter products that don't have images yet
    const productsWithoutImages = [];
    
    for (const product of products) {
      const existingImages = await prisma.productImage.count({
        where: { productId: product.id },
      });
      
      if (existingImages === 0) {
        productsWithoutImages.push(product);
      }
    }

    if (productsWithoutImages.length === 0) {
      return NextResponse.json({ 
        error: 'All selected products already have images' 
      }, { status: 400 });
    }

    // Generate images (this may take time for many products)
    const results = await ImageGeneratorService.bulkAutoGenerate(
      productsWithoutImages,
      supplierStaff.supplier.businessName
    );

    // Auto-submit for approval if requested
    if (autoSubmit) {
      const validProducts = productsWithoutImages.filter(p => {
        // Check mandatory fields
        return p.name && 
               p.categoryId && 
               p.weight && 
               p.sku; // Basic validation
      });

      for (const product of validProducts) {
        // Check if product has pricing and inventory
        const [pricingCount, inventoryCount] = await Promise.all([
          prisma.productPricing.count({ where: { productId: product.id } }),
          prisma.warehouseInventory.count({ where: { productId: product.id } }),
        ]);

        if (pricingCount > 0 && inventoryCount > 0) {
          // Auto-submit for approval
          await prisma.product.update({
            where: { id: product.id },
            data: {
              isActive: true,
              isApproved: false,
              rejectionReason: null,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: products.length,
        productsWithoutImages: productsWithoutImages.length,
        imagesGenerated: results.success,
        imagesFailed: results.failed,
        autoSubmitted: autoSubmit,
        products: results.products,
      },
    });

  } catch (error) {
    console.error('Bulk image generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate images' },
      { status: 500 }
    );
  }
}

// GET - Check generation status (for polling)
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id },
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Get products without images (pending generation)
    const productsWithoutImages = await prisma.product.findMany({
      where: {
        supplierId: supplierStaff.supplierId,
        images: { none: {} },
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        pendingCount: productsWithoutImages.length,
        products: productsWithoutImages,
      },
    });

  } catch (error) {
    console.error('Bulk image status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}