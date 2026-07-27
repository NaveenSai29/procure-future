import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { FinanceService } from '@/services/finance.service';

// GET - List invoices
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const result = await FinanceService.getSupplierInvoices(
      supplierStaff.supplierId,
      { page, limit, status }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST - Create invoice
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

    const body = await request.json();
    const invoice = await FinanceService.createInvoice(supplierStaff.supplierId, body);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
