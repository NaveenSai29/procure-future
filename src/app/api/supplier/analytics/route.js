import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AnalyticsService } from '@/services/analytics.service';

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
    const period = searchParams.get('period') || 'MONTHLY';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const analytics = await AnalyticsService.getSupplierAnalytics(
      supplierStaff.supplierId,
      { period, startDate, endDate }
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Supplier analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
