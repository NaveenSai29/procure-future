import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { FinanceService } from '@/services/finance.service';

// GET - Admin finance overview
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const overview = await FinanceService.getAdminFinanceOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Admin finance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch finance overview' },
      { status: 500 }
    );
  }
}

// POST - Process settlement (admin)
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

    const { action, settlementId, supplierId, amount } = await request.json();

    if (action === 'processSettlement') {
      // If settlementId provided, process existing settlement
      if (settlementId) {
        const result = await FinanceService.processSettlement(settlementId);
        return NextResponse.json({ success: true, result });
      }
      
      // If supplierId and amount provided, create + process new settlement
      if (supplierId && amount) {
        const settlement = await FinanceService.createSettlement(supplierId, { 
          amount: parseFloat(amount), 
          settlementType: 'MANUAL',
          notes: 'Manual settlement by admin'
        });
        const result = await FinanceService.processSettlement(settlement.id);
        return NextResponse.json({ success: true, result });
      }
      
      return NextResponse.json({ error: 'Required: settlementId or supplierId+amount' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin finance action error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process finance action' },
      { status: 500 }
    );
  }
}