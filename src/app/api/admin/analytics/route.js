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

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    let data;
    switch (type) {
      case 'overview':
        data = await AnalyticsService.getAdminAnalytics();
        break;
      case 'metrics':
        const period = searchParams.get('period') || 'DAILY';
        data = await AnalyticsService.getDashboardMetrics(period);
        break;
      case 'events':
        const eventCategory = searchParams.get('eventCategory');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        data = await AnalyticsService.getEvents({ eventCategory, startDate, endDate });
        break;
      default:
        data = await AnalyticsService.getAdminAnalytics();
    }

    // Convert BigInt values to numbers before serialization
    const safeData = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));
    return NextResponse.json(safeData);
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST - Update dashboard metrics
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'updateMetrics') {
      const metrics = await AnalyticsService.updateDashboardMetrics();
      return NextResponse.json({ success: true, metrics });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin analytics action error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process analytics action' },
      { status: 500 }
    );
  }
}
