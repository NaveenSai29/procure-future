import prisma from '@/lib/prisma';

export class ImageGeneratorService {
  /**
   * Get AI generation settings
   */
  static async getSettings() {
    try {
      let settings = await prisma.aIGenerationSetting.findFirst();
      
      if (!settings) {
        // Create default settings
        settings = await prisma.aIGenerationSetting.create({
          data: {
            freeCredits: 100,
            maxGenerationsPerProduct: 3,
            creditCostPerGeneration: 1,
            creditPricePerUnit: 1.0,
            isEnabled: true,
          },
        });
      }
      
      return settings;
    } catch (error) {
      console.error('Get AI settings error:', error);
      return {
        freeCredits: 100,
        maxGenerationsPerProduct: 3,
        creditCostPerGeneration: 1,
        creditPricePerUnit: 1.0,
        isEnabled: true,
      };
    }
  }

  /**
   * Check if supplier can generate AI image for a product
   */
  static async checkGenerationAllowed(supplierId, productId) {
    const settings = await this.getSettings();
    
    // Check if AI generation is enabled
    if (!settings.isEnabled) {
      return { allowed: false, reason: 'AI generation is currently disabled' };
    }
    
    // Check supplier credits
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { aiCredits: true },
    });
    
    if (!supplier) {
      return { allowed: false, reason: 'Supplier not found' };
    }
    
    if (supplier.aiCredits <= 0) {
      return { 
        allowed: false, 
        reason: 'No AI credits remaining',
        creditsRemaining: 0,
      };
    }
    
    // Check per-product generation limit
    const generationCount = await prisma.aIGenerationLog.count({
      where: {
        supplierId,
        productId,
        status: 'SUCCESS',
        action: 'GENERATE',
      },
    });
    
    if (generationCount >= settings.maxGenerationsPerProduct) {
      return { 
        allowed: false, 
        reason: `Maximum ${settings.maxGenerationsPerProduct} AI generations per product reached`,
        generationsUsed: generationCount,
        maxGenerations: settings.maxGenerationsPerProduct,
      };
    }
    
    return { 
      allowed: true,
      creditsRemaining: supplier.aiCredits,
      creditCost: settings.creditCostPerGeneration,
      generationsUsed: generationCount,
      maxGenerations: settings.maxGenerationsPerProduct,
    };
  }

  /**
   * Deduct credits from supplier
   */
  static async deductCredits(supplierId, creditCost = 1) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: {
        aiCredits: { decrement: creditCost },
        aiGenerationsUsed: { increment: 1 },
      },
    });
  }

  /**
   * Log AI generation
   */
  static async logGeneration(supplierId, productId, action, prompt, imageUrl, status, errorMessage = null) {
    return prisma.aIGenerationLog.create({
      data: {
        supplierId,
        productId,
        action,
        prompt,
        imageUrl,
        status,
        errorMessage,
      },
    });
  }

  /**
   * Get supplier's AI credits info
   */
  static async getSupplierCredits(supplierId) {
    const [supplier, settings] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { aiCredits: true, aiGenerationsUsed: true },
      }),
      this.getSettings(),
    ]);
    
    return {
      creditsRemaining: supplier?.aiCredits || 0,
      totalGenerationsUsed: supplier?.aiGenerationsUsed || 0,
      creditCostPerGeneration: settings.creditCostPerGeneration,
      maxGenerationsPerProduct: settings.maxGenerationsPerProduct,
      creditPricePerUnit: settings.creditPricePerUnit,
    };
  }

  /**
   * Build smart prompt from product details - fully dynamic, scales to 2000+ categories
   */
  static buildPrompt(productName, category, description = '', weight = '', unit = '', brand = '') {
    const parts = [];
    
    // Product name (most important - contains type, material, size info)
    if (productName) {
      parts.push(productName);
    }
    
    // Brand (adds brand identity if available)
    if (brand && brand.trim()) {
      parts.push(`${brand} brand product`);
    }
    
    // Category (product classification)
    if (category && category.toLowerCase() !== 'general' && category.toLowerCase() !== 'other') {
      parts.push(`${category} category`);
    }
    
    // Description (supplier knows exact product details)
    if (description && description.trim()) {
      const shortDesc = description.trim().substring(0, 150);
      parts.push(shortDesc);
    }
    
    // Unit context for measurement understanding
    if (unit) {
      const unitContext = {
        'PCS': 'single unit',
        'KG': 'by weight in kilograms',
        'LTR': 'by volume in liters',
        'MTR': 'by length in meters',
        'BOX': 'packaged in a box',
        'SET': 'complete set',
        'BAG': 'packaged in a bag',
        'ROLL': 'in roll form',
        'PAIR': 'pair of items',
        'DOZEN': 'dozen pack',
      };
      if (unitContext[unit]) parts.push(unitContext[unit]);
    }
    
    // Weight for size reference
    if (weight && parseFloat(weight) > 0) {
      const w = parseFloat(weight);
      if (w < 0.1) parts.push('tiny lightweight item');
      else if (w < 0.5) parts.push('very small item');
      else if (w < 1) parts.push('small item');
      else if (w < 5) parts.push('handheld-sized item');
      else if (w < 20) parts.push('medium-sized item');
      else if (w < 100) parts.push('large item');
      else parts.push('heavy industrial-sized item');
    }
    
    // Photography instructions (universal for all products)
    parts.push('isolated product shot');
    parts.push('pure white background');
    parts.push('e-commerce product photography');
    parts.push('professional studio lighting');
    parts.push('sharp focus');
    parts.push('high resolution');
    parts.push('no people');
    parts.push('no hands');
    parts.push('no text');
    parts.push('no watermark');
    parts.push('no logo overlay');
    
    return parts.join(', ');
  }

  /**
   * Generate AI image using Pollinations.ai (FREE, no API key)
   */
  static async generateAI(productName, category, description = '', weight = '', unit = '', brand = '', angleIndex = 0) {
    try {
      const prompt = this.buildPrompt(productName, category, description, weight, unit, brand);
      
      // Angle-specific descriptions (same product, different views)
      const anglePrompts = [
        'front view, straight on shot',
        'side view, profile angle',
        'back view, rear shot',
        'top view, overhead shot',
        '45 degree angle, three-quarter view',
        'close-up detail shot, macro view',
      ];
      
      const anglePrompt = anglePrompts[angleIndex % anglePrompts.length];
      
      // Enhanced prompt with angle context
      const enhancedPrompt = `${prompt}, ${anglePrompt}, ultra sharp, crisp details, realistic product, professional quality, 8k resolution`;
      
      // Negative prompt to avoid common AI issues
      const negativePrompt = 'blurry, distorted, cartoon, illustration, sketch, low quality, pixelated, grainy, deformed, ugly, bad proportions, extra fingers, cropped, out of frame';
      
      // Use consistent seed for same product (based on product name hash)
      const baseSeed = this.getProductSeed(productName);
      const angleSeed = baseSeed + angleIndex * 100;
      
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&seed=${angleSeed}&negative_prompt=${encodeURIComponent(negativePrompt)}&model=flux`;
      
      return {
        success: true,
        imageUrl,
        source: 'AI_GENERATED',
        prompt: enhancedPrompt,
        angleIndex,
        angleLabel: anglePrompt,
      };
    } catch (error) {
      console.error('AI generation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate consistent seed from product name (so same product = same base image)
   */
  static getProductSeed(productName) {
    let hash = 0;
    const str = productName || 'product';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 10000;
  }

  /**
   * Generate multiple AI image variations
   */
  static async generateAIVariations(productName, category, description = '', weight = '', unit = '', count = 3, brand = '') {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      const basePrompt = this.buildPrompt(productName, category, description, weight, unit, brand);
      const anglePrompt = `${basePrompt}, angle ${i + 1}, view ${i + 1}`;
      const seed = Math.floor(Math.random() * 10000);
      
      const enhancedAnglePrompt = `${anglePrompt}, ultra sharp, crisp details, realistic product, professional quality, 8k resolution`;
      const negativePrompt = 'blurry, distorted, cartoon, illustration, sketch, low quality, pixelated, grainy, deformed, ugly, bad proportions, extra fingers, cropped, out of frame';
      
      variations.push({
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedAnglePrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&negative_prompt=${encodeURIComponent(negativePrompt)}&model=flux`,
        source: 'AI_GENERATED',
        prompt: enhancedAnglePrompt,
      });
    }
    
    return variations;
  }

  /**
   * Search web images using Openverse API (FREE, no API key)
   */
  static async searchWebImages(query, count = 10) {
    try {
      // Openverse API - completely free, no API key required
      const searchUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${count}&license_type=commercial`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results.map(result => ({
          url: result.url,
          thumbnail: result.thumbnail,
          title: result.title,
          source: 'WEB_SEARCH',
          foreign_landing_url: result.foreign_landing_url,
          license: result.license,
          creator: result.creator,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  /**
   * Generate text-based image (fallback if AI fails)
   */
  static generateTextPlaceholder(productName, category, supplierName = '') {
    // SVG-based placeholder with product name
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="800" height="800" fill="#F8FAFC"/>
  <rect x="40" y="40" width="720" height="720" fill="#F1F5F9" rx="16"/>
  <text x="400" y="350" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#334155" text-anchor="middle">${productName}</text>
  <text x="400" y="420" font-family="Arial, sans-serif" font-size="32" fill="#64748B" text-anchor="middle">${category || ''}</text>
  <text x="400" y="480" font-family="Arial, sans-serif" font-size="24" fill="#94A3B8" text-anchor="middle">${supplierName || 'PROCURE'}</text>
  <rect x="250" y="550" width="300" height="80" fill="#F97316" rx="40"/>
  <text x="400" y="600" font-family="Arial, sans-serif" font-size="28" fill="#FFFFFF" text-anchor="middle" font-weight="bold">PROCURE</text>
</svg>`;
    
    const svgBase64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${svgBase64}`;
  }

  /**
   * Download image from URL and save to server
   */
  static async downloadAndSaveImage(imageUrl, productId, source = 'AI_GENERATED') {
    try {
      // For data URLs (SVG placeholders)
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `placeholder-${Date.now()}.svg`;
        const filePath = `public/uploads/products/${fileName}`;
        
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), filePath);
        fs.writeFileSync(fullPath, buffer);
        
        return {
          success: true,
          url: `/uploads/products/${fileName}`,
          source,
        };
      }
      
      // For external URLs
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const extension = this.getImageExtension(response.headers.get('content-type'));
      const fileName = `product-${productId}-${Date.now()}.${extension}`;
      const filePath = `public/uploads/products/${fileName}`;
      
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), filePath);
      fs.writeFileSync(fullPath, buffer);
      
      return {
        success: true,
        url: `/uploads/products/${fileName}`,
        source,
      };
    } catch (error) {
      console.error('Download image error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get file extension from content type
   */
  static getImageExtension(contentType) {
    const typeMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/gif': 'gif',
    };
    return typeMap[contentType] || 'jpg';
  }

  /**
   * Find existing image from identical product (same name, category, brand, weight)
   */
  static async findExistingImage(product) {
    try {
      // Search for identical products (any supplier) with images
      const identicalProduct = await prisma.product.findFirst({
        where: {
          name: { equals: product.name },
          categoryId: product.categoryId,
          brandId: product.brandId || null,
          weight: product.weight,
          images: { some: {} }, // Has at least one image
          id: { not: product.id }, // Not the same product
        },
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'asc' }, // Oldest first (most established image)
      });

      if (identicalProduct && identicalProduct.images.length > 0) {
        return {
          success: true,
          imageUrl: identicalProduct.images[0].url,
          source: 'REUSED',
          sourceProductId: identicalProduct.id,
          sourceProductName: identicalProduct.name,
        };
      }

      // Also check by SKU if provided
      if (product.sku) {
        const skuMatch = await prisma.product.findFirst({
          where: {
            sku: { equals: product.sku },
            images: { some: {} },
            id: { not: product.id },
          },
          include: {
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        });

        if (skuMatch && skuMatch.images.length > 0) {
          return {
            success: true,
            imageUrl: skuMatch.images[0].url,
            source: 'REUSED',
            sourceProductId: skuMatch.id,
            sourceProductName: skuMatch.name,
          };
        }
      }

      return {
        success: false,
      };
    } catch (error) {
      console.error('Find existing image error:', error);
      return { success: false };
    }
  }

  /**
   * Auto-generate image for product with credit check
   */
  static async autoGenerateForProduct(product, supplierName = '') {
    try {
      // Check if generation is allowed (credits + per-product limit)
      const check = await this.checkGenerationAllowed(product.supplierId, product.id);
      
      if (!check.allowed) {
        return {
          success: false,
          error: check.reason,
          creditsRemaining: check.creditsRemaining || 0,
          generationsUsed: check.generationsUsed,
          maxGenerations: check.maxGenerations,
          blocked: true,
        };
      }
      
      const settings = await this.getSettings();
      
      // Check if identical product already has an image (reuse - no credit cost)
      const existingImage = await this.findExistingImage(product);
      
      if (existingImage.success) {
        // Attach existing image to this product
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: existingImage.imageUrl,
            alt: product.name,
            sortOrder: 0,
            isPrimary: true,
          },
        });
        
        // Save to Media library
        await prisma.media.create({
          data: {
            fileName: existingImage.imageUrl.split('/').pop(),
            originalName: `${product.name}-reused.jpg`,
            fileUrl: existingImage.imageUrl,
            fileType: 'image/jpeg',
            fileSize: 0,
            entityType: 'PRODUCT',
            entityId: product.id,
          },
        });
        
        // Log reuse (no credit deduction)
        await this.logGeneration(
          product.supplierId,
          product.id,
          'REUSE',
          `Reused image from product: ${existingImage.sourceProductName}`,
          existingImage.imageUrl,
          'SUCCESS'
        );
        
        return {
          success: true,
          source: 'REUSED',
          url: existingImage.imageUrl,
          prompt: `Reused from ${existingImage.sourceProductName}`,
          creditsDeducted: 0,
          creditsRemaining: check.creditsRemaining,
          reusedFrom: existingImage.sourceProductName,
        };
      }
      
      // Get current generation count for angle tracking
      const existingGenerations = await prisma.aIGenerationLog.count({
        where: {
          supplierId: product.supplierId,
          productId: product.id,
          status: 'SUCCESS',
          action: 'GENERATE',
        },
      });
      
      // Try AI generation with angle based on generation count
      const aiResult = await this.generateAI(
        product.name,
        product.category?.name || 'Product',
        product.description || '',
        product.weight ? String(product.weight) : '',
        product.unit || 'PCS',
        product.brand?.name || '',
        existingGenerations // 0=front, 1=side, 2=back, etc.
      );
      
      if (aiResult.success) {
        const savedImage = await this.downloadAndSaveImage(aiResult.imageUrl, product.id, 'AI_GENERATED');
        
        if (savedImage.success) {
          // Attach to product
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: savedImage.url,
              alt: product.name,
              sortOrder: 0,
              isPrimary: true,
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
              entityId: product.id,
            },
          });
          
          // Deduct credits
          await this.deductCredits(product.supplierId, settings.creditCostPerGeneration);
          
          // Log generation
          await this.logGeneration(
            product.supplierId,
            product.id,
            'GENERATE',
            aiResult.prompt,
            savedImage.url,
            'SUCCESS'
          );
          
          return {
            success: true,
            source: 'AI_GENERATED',
            url: savedImage.url,
            prompt: aiResult.prompt,
            creditsDeducted: settings.creditCostPerGeneration,
            creditsRemaining: check.creditsRemaining - settings.creditCostPerGeneration,
          };
        }
      }
      
      // Log failed AI generation
      await this.logGeneration(
        product.supplierId,
        product.id,
        'GENERATE',
        aiResult.prompt || '',
        null,
        'FAILED',
        'AI generation failed'
      );
      
      // Fallback to text placeholder (doesn't cost credits)
      const placeholderUrl = this.generateTextPlaceholder(product.name, product.category?.name || '', supplierName);
      const savedPlaceholder = await this.downloadAndSaveImage(placeholderUrl, product.id, 'TEXT_PLACEHOLDER');
      
      if (savedPlaceholder.success) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: savedPlaceholder.url,
            alt: product.name,
            sortOrder: 0,
            isPrimary: true,
          },
        });
        
        // Save to Media library
        await prisma.media.create({
          data: {
            fileName: savedPlaceholder.url.split('/').pop(),
            originalName: `${product.name}-placeholder.svg`,
            fileUrl: savedPlaceholder.url,
            fileType: 'image/svg+xml',
            fileSize: 0,
            entityType: 'PRODUCT',
            entityId: product.id,
          },
        });
        
        return {
          success: true,
          source: 'TEXT_PLACEHOLDER',
          url: savedPlaceholder.url,
          creditsDeducted: 0,
          creditsRemaining: check.creditsRemaining,
        };
      }
      
      return {
        success: false,
        error: 'Failed to generate image',
        blocked: false,
      };
    } catch (error) {
      console.error('Auto-generate error:', error);
      return {
        success: false,
        error: error.message,
        blocked: false,
      };
    }
  }

  /**
   * Bulk auto-generate images for multiple products
   */
  static async bulkAutoGenerate(products, supplierName = '') {
    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      blocked: 0,
      creditsDeducted: 0,
      products: [],
    };
    
    for (const product of products) {
      const result = await this.autoGenerateForProduct(product, supplierName);
      
      if (result.success) {
        results.success++;
        results.creditsDeducted += (result.creditsDeducted || 0);
        results.products.push({
          productId: product.id,
          productName: product.name,
          imageUrl: result.url,
          source: result.source,
          prompt: result.prompt || '',
          creditsDeducted: result.creditsDeducted || 0,
        });
      } else if (result.blocked) {
        results.blocked++;
        results.products.push({
          productId: product.id,
          productName: product.name,
          error: result.error,
          blocked: true,
        });
      } else {
        results.failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }
}