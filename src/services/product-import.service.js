import prisma from '@/lib/prisma';
import { productImportRowSchema, ImportRowStatus, COLUMN_MAPPING } from '@/validators/product-import.validator';

export class ProductImportService {
  /**
   * Parse CSV/Excel file and return structured data
   */
  static async parseFile(buffer, fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    let rows = [];
    if (extension === 'csv') {
      rows = await this.parseCSV(buffer);
    } else if (['xlsx', 'xls'].includes(extension)) {
      rows = await this.parseExcel(buffer);
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }
    
    // Map columns to standardized field names
    const mappedRows = this.mapColumns(rows);
    
    return mappedRows;
  }

  /**
   * Parse CSV buffer
   */
  static async parseCSV(buffer) {
    const csvString = buffer.toString('utf-8');
    const lines = csvString.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse CSV line handling quoted values
   */
  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  }

  /**
   * Map CSV column names to standard field names
   */
  static mapColumns(rows) {
    const headers = Object.keys(rows[0] || {});
    const mapping = {};
    
    // Build reverse mapping
    for (const [fieldName, aliases] of Object.entries(COLUMN_MAPPING)) {
      for (const alias of aliases) {
        const headerMatch = headers.find(h => h.toLowerCase() === alias.toLowerCase());
        if (headerMatch) {
          mapping[headerMatch] = fieldName;
          break;
        }
      }
    }

    // Apply mapping
    return rows.map(row => {
      const mappedRow = {};
      for (const [key, value] of Object.entries(row)) {
        const mappedKey = mapping[key] || key.toLowerCase().replace(/\s+/g, '_');
        mappedRow[mappedKey] = value;
      }
      return mappedRow;
    });
  }

  /**
   * Validate imported products
   */
  static async validateImport(products, supplierId, importMode = 'CREATE') {
    const results = [];
    const errors = [];
    const warnings = [];
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    // Get existing categories, brands for validation
    const [existingCategories, existingBrands, existingProducts] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.product.findMany({
        where: { supplierId },
        select: { id: true, sku: true, name: true, slug: true }
      })
    ]);

    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      const rowNumber = i + 2; // +2 for header row and 0-based index
      const rowResult = {
        rowNumber,
        status: ImportRowStatus.VALID,
        data: null,
        errors: [],
        warnings: [],
      };

      try {
        // Validate with Zod
        const validated = productImportRowSchema.parse(row);
        
        // Check category exists
        const category = existingCategories.find(c => 
          c.name.toLowerCase() === validated.categoryName?.toLowerCase()
        );
        if (!category) {
          rowResult.status = ImportRowStatus.WARNING;
          rowResult.warnings.push(`Category "${validated.categoryName}" not found. Will be created.`);
          warningCount++;
        }

        // Check brand exists (if provided)
        if (validated.brandName) {
          const brand = existingBrands.find(b => 
            b.name.toLowerCase() === validated.brandName.toLowerCase()
          );
          if (!brand) {
            rowResult.status = ImportRowStatus.WARNING;
            rowResult.warnings.push(`Brand "${validated.brandName}" not found. Will be created.`);
            warningCount++;
          }
        }

        // Check for duplicate SKU
        if (validated.sku && importMode === 'CREATE') {
          const existingSKU = existingProducts.find(p => p.sku === validated.sku);
          if (existingSKU) {
            rowResult.status = ImportRowStatus.DUPLICATE;
            rowResult.errors.push(`SKU "${validated.sku}" already exists`);
            errorCount++;
          }
        }

        // Validate pricing
        if (validated.sellingPrice > validated.mrp) {
          rowResult.warnings.push('Selling price is higher than MRP');
          warningCount++;
        }

        if (validated.status === ImportRowStatus.VALID || validated.status === ImportRowStatus.WARNING) {
          rowResult.data = validated;
          validCount++;
        }

        if (validated.status === ImportRowStatus.WARNING) {
          warningCount++;
        }

      } catch (error) {
        rowResult.status = ImportRowStatus.ERROR;
        if (error.errors) {
          error.errors.forEach(err => {
            rowResult.errors.push(`${err.path.join('.')}: ${err.message}`);
          });
        } else {
          rowResult.errors.push(error.message);
        }
        errorCount++;
      }

      results.push(rowResult);
      if (rowResult.errors.length > 0) errors.push(rowResult);
      if (rowResult.warnings.length > 0) warnings.push(rowResult);
    }

    return {
      results,
      summary: {
        total: products.length,
        valid: validCount,
        errors: errorCount,
        warnings: warningCount,
      },
      errors,
      warnings,
    };
  }

  /**
   * Import validated products into database
   */
  static async importProducts(validatedRows, supplierId, userId, importMode = 'CREATE') {
    const importResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      products: [],
    };

    // Process in batches of 50
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < validatedRows.length; i += batchSize) {
      batches.push(validatedRows.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          try {
            const data = row.data;
            if (!data) {
              importResults.skipped++;
              continue;
            }

            // Find or create category
            let category = await tx.category.findFirst({
              where: { name: { equals: data.categoryName } }
            });
            if (!category) {
              const slug = data.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              category = await tx.category.create({
                data: {
                  name: data.categoryName,
                  slug,
                }
              });
            }

            // Find or create brand
            let brandId = null;
            if (data.brandName) {
              let brand = await tx.brand.findFirst({
                where: { name: { equals: data.brandName } }
              });
              if (!brand) {
                brand = await tx.brand.create({
                  data: { name: data.brandName }
                });
              }
              brandId = brand.id;
            }

            // Generate slug
            const slug = data.name.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '') + '-' + Date.now();

            // Prepare product data
            const productData = {
              supplierId,
              categoryId: category.id,
              brandId,
              name: data.name,
              slug,
              description: data.description || null,
              longDescription: data.longDescription || null,
              highlights: data.highlights || null,
              specifications: data.specificationsJson ? JSON.parse(data.specificationsJson) : null,
              sku: data.sku || null,
              barcode: data.barcode || null,
              hsnCode: data.hsnCode || null,
              unit: data.unit || 'PCS',
              weight: data.weight ? parseFloat(data.weight) : null,
              warranty: data.warranty || null,
              countryOfOrigin: data.countryOfOrigin || null,
              isActive: data.isActive !== false,
              isApproved: false,
              isFeatured: data.isFeatured === true,
              metaTitle: data.metaTitle || null,
              metaDescription: data.metaDescription || null,
            };

            let product;
            if (importMode === 'UPDATE' && data.sku) {
              // Update existing product
              const existing = await tx.product.findFirst({
                where: { supplierId, sku: data.sku }
              });
              if (existing) {
                product = await tx.product.update({
                  where: { id: existing.id },
                  data: productData,
                });
                importResults.updated++;
              } else {
                product = await tx.product.create({ data: productData });
                importResults.created++;
              }
            } else {
              product = await tx.product.create({ data: productData });
              importResults.created++;
            }

            // Create pricing
            const pricingEntries = [];
            
            // Retail price
            pricingEntries.push({
              productId: product.id,
              priceType: 'RETAIL',
              mrp: parseFloat(data.mrp),
              sellingPrice: parseFloat(data.sellingPrice),
              minQty: parseInt(data.minQty) || 1,
              maxQty: data.maxQty ? parseInt(data.maxQty) : null,
            });

            // Wholesale price
            if (data.wholesalePrice) {
              pricingEntries.push({
                productId: product.id,
                priceType: 'WHOLESALE',
                mrp: parseFloat(data.mrp),
                sellingPrice: parseFloat(data.wholesalePrice),
                minQty: parseInt(data.moq) || 10,
                maxQty: null,
              });
            }

            // Distributor price
            if (data.distributorPrice) {
              pricingEntries.push({
                productId: product.id,
                priceType: 'DISTRIBUTOR',
                mrp: parseFloat(data.mrp),
                sellingPrice: parseFloat(data.distributorPrice),
                minQty: parseInt(data.moq) || 50,
                maxQty: null,
              });
            }

            // Bulk price
            if (data.bulkPrice) {
              pricingEntries.push({
                productId: product.id,
                priceType: 'BULK',
                mrp: parseFloat(data.mrp),
                sellingPrice: parseFloat(data.bulkPrice),
                minQty: parseInt(data.moq) || 100,
                maxQty: null,
              });
            }

            await tx.productPricing.createMany({ data: pricingEntries });

            // Create initial inventory if stock specified
            if (data.initialStock > 0) {
              // Find or create warehouse inventory
              let warehouseId = null;
              if (data.warehouseName) {
                const warehouse = await tx.warehouse.findFirst({
                  where: { supplierId, name: { contains: data.warehouseName } }
                });
                warehouseId = warehouse?.id;
              }

              if (!warehouseId) {
                // Use first/default warehouse
                const defaultWarehouse = await tx.warehouse.findFirst({
                  where: { supplierId }
                });
                warehouseId = defaultWarehouse?.id;
              }

              if (warehouseId) {
                await tx.warehouseInventory.create({
                  data: {
                    warehouseId,
                    productId: product.id,
                    availableQty: parseInt(data.initialStock),
                    minStockLevel: parseInt(data.lowStockAlert) || 10,
                    maxStockLevel: parseInt(data.initialStock) * 2 || 1000,
                  }
                });
              }
            }

            importResults.products.push({
              id: product.id,
              name: product.name,
              sku: product.sku,
              status: 'created',
            });

          } catch (error) {
            console.error(`Error importing row ${row.rowNumber}:`, error);
            importResults.errors.push({
              rowNumber: row.rowNumber,
              message: error.message,
            });
          }
        }
      });
    }

    return importResults;
  }

  /**
   * Generate import template (CSV)
   */
  static generateTemplate() {
    const headers = [
      'name', 'categoryName', 'description', 'brandName', 'sku', 'barcode',
      'hsnCode', 'unit', 'weight', 'warranty', 'countryOfOrigin',
      'mrp', 'sellingPrice', 'wholesalePrice', 'distributorPrice', 'bulkPrice',
      'minQty', 'moq', 'gstRate', 'taxInclusive',
      'initialStock', 'lowStockAlert', 'warehouseName',
      'variantsJson', 'attributesJson', 'specificationsJson',
      'metaTitle', 'metaDescription', 'tags'
    ];

    const sampleRow = [
      'Sample Product', 'Electronics', 'Product description here', 'Sample Brand',
      'SKU-001', '8901234567890', '8471', 'PCS', '1.5', '1 Year', 'India',
      '1000', '899', '750', '700', '650',
      '1', '10', '18', 'false',
      '100', '10', 'Main Warehouse',
      '', '', '',
      'Sample Product - Buy Online', 'Buy Sample Product at best price', 'electronics,sample'
    ];

    const csvContent = [
      headers.join(','),
      sampleRow.map(v => v.includes(',') ? `"${v}"` : v).join(',')
    ].join('\n');

    return csvContent;
  }

  /**
   * Export supplier products to CSV
   */
  static async exportProducts(supplierId) {
    const products = await prisma.product.findMany({
      where: { supplierId },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        pricing: {
          where: { priceType: 'RETAIL' },
          take: 1,
        },
        inventory: {
          include: { warehouse: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'name', 'categoryName', 'description', 'brandName', 'sku', 'barcode',
      'hsnCode', 'unit', 'weight', 'warranty', 'countryOfOrigin',
      'mrp', 'sellingPrice', 'isActive', 'isFeatured'
    ];

    const rows = products.map(p => [
      p.name,
      p.category?.name || '',
      p.description || '',
      p.brand?.name || '',
      p.sku || '',
      p.barcode || '',
      p.hsnCode || '',
      p.unit || 'PCS',
      p.weight?.toString() || '',
      p.warranty || '',
      p.countryOfOrigin || '',
      p.pricing[0]?.mrp?.toString() || '',
      p.pricing[0]?.sellingPrice?.toString() || '',
      p.isActive ? 'true' : 'false',
      p.isFeatured ? 'true' : 'false',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => v?.includes(',') ? `"${v}"` : v).join(','))
    ].join('\n');

    return { csvContent, count: products.length };
  }
}