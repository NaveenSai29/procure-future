import { z } from 'zod';

// Validation schema for a single product row in import
export const productImportRowSchema = z.object({
  // Required fields
  name: z.string().min(3, 'Product name must be at least 3 characters').max(200, 'Product name too long'),
  categoryName: z.string().min(1, 'Category is required'),
  
  // Optional fields with validation
  description: z.string().max(2000).optional().nullable(),
  longDescription: z.string().max(10000).optional().nullable(),
  highlights: z.string().max(1000).optional().nullable(),
  
  brandName: z.string().max(100).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  hsnCode: z.string().max(20).optional().nullable(),
  unit: z.string().max(20).default('PCS').optional().nullable(),
  
  // Numeric fields
  weight: z.number().positive().optional().nullable(),
  warranty: z.string().max(100).optional().nullable(),
  countryOfOrigin: z.string().max(50).optional().nullable(),
  
  // Pricing
  mrp: z.number().positive('MRP must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  wholesalePrice: z.number().positive().optional().nullable(),
  distributorPrice: z.number().positive().optional().nullable(),
  bulkPrice: z.number().positive().optional().nullable(),
  minQty: z.number().int().positive().default(1).optional().nullable(),
  maxQty: z.number().int().positive().optional().nullable(),
  moq: z.number().int().positive().default(1).optional().nullable(),
  
  // Tax
  gstRate: z.number().min(0).max(28).default(18).optional().nullable(),
  taxInclusive: z.boolean().default(false).optional().nullable(),
  
  // Stock
  initialStock: z.number().int().min(0).default(0).optional().nullable(),
  lowStockAlert: z.number().int().min(0).default(10).optional().nullable(),
  
  // Warehouse
  warehouseName: z.string().max(100).optional().nullable(),
  zoneName: z.string().max(100).optional().nullable(),
  
  // Variants (JSON string in CSV)
  variantsJson: z.string().optional().nullable(),
  
  // Attributes (JSON string in CSV)
  attributesJson: z.string().optional().nullable(),
  
  // Specifications (JSON string in CSV)
  specificationsJson: z.string().optional().nullable(),
  
  // Meta
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
  
  // Status
  isActive: z.boolean().default(true).optional().nullable(),
  isFeatured: z.boolean().default(false).optional().nullable(),
});

// Schema for the entire import file
export const bulkImportSchema = z.object({
  products: z.array(productImportRowSchema).min(1, 'At least one product required').max(10000, 'Maximum 10,000 products per import'),
  importMode: z.enum(['CREATE', 'UPDATE', 'UPSERT']).default('CREATE'),
  validateOnly: z.boolean().default(false),
});

// Validation result types
export const ImportRowStatus = {
  VALID: 'valid',
  WARNING: 'warning',
  ERROR: 'error',
  DUPLICATE: 'duplicate',
};

// Maximum file size (20MB - increased for Tally XML files)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Allowed MIME types (added XML for Tally imports)
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/xml',
  'application/xml',
];

// CSV column mapping (supports multiple header names)
export const COLUMN_MAPPING = {
  name: ['name', 'product name', 'product_name', 'title', 'item name'],
  categoryName: ['category', 'category_name', 'category name', 'categoryname'],
  description: ['description', 'desc', 'short description', 'short_description'],
  longDescription: ['long description', 'long_description', 'longDescription', 'details', 'full description'],
  highlights: ['highlights', 'key features', 'features', 'key_highlights'],
  brandName: ['brand', 'brand name', 'brand_name', 'brandname', 'manufacturer'],
  sku: ['sku', 'stock keeping unit', 'product code', 'product_code', 'item code'],
  barcode: ['barcode', 'bar code', 'bar_code', 'ean', 'upc', 'gtin'],
  hsnCode: ['hsn', 'hsn code', 'hsn_code', 'hsncode', 'sac'],
  unit: ['unit', 'uom', 'unit of measure', 'unit_of_measure', 'measure'],
  weight: ['weight', 'weight (kg)', 'weight_kg', 'net weight'],
  warranty: ['warranty', 'warranty period', 'warranty_period'],
  countryOfOrigin: ['country of origin', 'country_of_origin', 'origin', 'made in', 'country'],
  mrp: ['mrp', 'max retail price', 'maximum retail price', 'list price', 'list_price'],
  sellingPrice: ['selling price', 'selling_price', 'price', 'sale price', 'sale_price', 'our price'],
  wholesalePrice: ['wholesale price', 'wholesale_price', 'trade price', 'trade_price'],
  distributorPrice: ['distributor price', 'distributor_price', 'dealer price'],
  bulkPrice: ['bulk price', 'bulk_price', 'volume price', 'volume_price'],
  minQty: ['min qty', 'min_quantity', 'minimum quantity', 'minimum_order_quantity', 'min order'],
  maxQty: ['max qty', 'max_quantity', 'maximum quantity', 'max order'],
  moq: ['moq', 'minimum order quantity', 'min_order_qty'],
  gstRate: ['gst rate', 'gst_rate', 'gst', 'tax rate', 'tax_rate', 'vat'],
  taxInclusive: ['tax inclusive', 'tax_inclusive', 'inclusive of tax', 'price includes tax'],
  initialStock: ['stock', 'initial stock', 'initial_stock', 'quantity', 'qty', 'available'],
  lowStockAlert: ['low stock alert', 'low_stock_alert', 'reorder point', 'reorder_point', 'min stock'],
  warehouseName: ['warehouse', 'warehouse name', 'warehouse_name', 'location'],
  zoneName: ['zone', 'zone name', 'zone_name', 'area', 'section'],
  variantsJson: ['variants', 'variants_json', 'product variants'],
  attributesJson: ['attributes', 'attributes_json', 'product attributes', 'specs'],
  specificationsJson: ['specifications', 'specifications_json', 'technical specs', 'tech specs'],
  metaTitle: ['meta title', 'meta_title', 'seo title', 'seo_title', 'page title'],
  metaDescription: ['meta description', 'meta_description', 'seo description', 'seo_description'],
  tags: ['tags', 'keywords', 'labels', 'product tags'],
  isActive: ['active', 'is active', 'is_active', 'status', 'enabled', 'publish'],
  isFeatured: ['featured', 'is featured', 'is_featured', 'highlight'],
};