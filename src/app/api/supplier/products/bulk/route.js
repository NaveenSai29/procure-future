import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ProductImportService } from '@/services/product-import.service';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/validators/product-import.validator';

// POST - Import products from file
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const importMode = formData.get('importMode') || 'CREATE';
    const validateOnly = formData.get('validateOnly') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && 
        !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload CSV or Excel file.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse file
    const products = await ProductImportService.parseFile(buffer, file.name);

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products found in file' }, { status: 400 });
    }

    if (products.length > 10000) {
      return NextResponse.json(
        { error: 'Maximum 10,000 products per import' },
        { status: 400 }
      );
    }

    // Validate products
    const validationResult = await ProductImportService.validateImport(
      products,
      supplierStaff.supplierId,
      importMode
    );

    // If validate only, return validation results
    if (validateOnly) {
      return NextResponse.json({
        mode: 'VALIDATE_ONLY',
        ...validationResult,
      });
    }

    // Check if there are critical errors
    if (validationResult.summary.errors > 0 && importMode !== 'UPSERT') {
      return NextResponse.json({
        mode: 'VALIDATION_FAILED',
        message: 'Please fix errors before importing',
        ...validationResult,
      }, { status: 422 });
    }

    // Import valid products
    const validRows = validationResult.results.filter(
      r => r.status === 'valid' || r.status === 'warning'
    );

    const importResult = await ProductImportService.importProducts(
      validRows,
      supplierStaff.supplierId,
      user.id,
      importMode
    );

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'BULK_IMPORT_PRODUCTS',
        entity: 'Product',
        newValue: {
          fileName: file.name,
          importMode,
          totalRows: products.length,
          created: importResult.created,
          updated: importResult.updated,
          skipped: importResult.skipped,
          errors: importResult.errors.length,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      }
    });

    return NextResponse.json({
      success: true,
      mode: 'IMPORTED',
      validation: validationResult.summary,
      import: {
        created: importResult.created,
        updated: importResult.updated,
        skipped: importResult.skipped,
        errors: importResult.errors,
        products: importResult.products.slice(0, 100), // Return first 100
      },
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import products' },
      { status: 500 }
    );
  }
}