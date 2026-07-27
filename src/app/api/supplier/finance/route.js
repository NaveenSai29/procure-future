import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { FinanceService } from '@/services/finance.service';

// GET - Finance overview for supplier
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier profile
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const report = searchParams.get('report');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (report === 'true') {
      const reportData = await FinanceService.generateFinancialReport(
        supplierStaff.supplierId,
        { startDate, endDate }
      );
      return NextResponse.json(reportData);
    }

    const overview = await FinanceService.getSupplierFinanceOverview(supplierStaff.supplierId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Finance overview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch finance data' },
      { status: 500 }
    );
  }
}
