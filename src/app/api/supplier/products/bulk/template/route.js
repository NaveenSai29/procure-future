import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ProductImportService } from '@/services/product-import.service';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csvContent = ProductImportService.generateTemplate();

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="product-import-template.csv"',
      },
    });

  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download template' },
      { status: 500 }
    );
  }
}