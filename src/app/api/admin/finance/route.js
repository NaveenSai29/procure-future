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

    const { action, settlementId, supplierId, amount, force } = await request.json();

    if (action === 'processSettlement') {
      // If settlementId provided, process existing settlement
      if (settlementId) {
        const existing = await prisma.settlement.findUnique({ where: { id: settlementId } });
        if (!existing) return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
        if (existing.status !== 'PENDING' && !force) return NextResponse.json({ error: 'Settlement already processed. Use force to override.', alreadyProcessed: true }, { status: 409 });

        const result = await FinanceService.processSettlement(settlementId);
        await prisma.settlement.update({
          where: { id: settlementId },
          data: { processedBy: user.id },
        });
        return NextResponse.json({ success: true, result });
      }
      
      // If supplierId and amount provided, create + process new settlement
      if (supplierId && amount) {
        // Check for duplicate settlement this period
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const existing = await prisma.settlement.findFirst({
          where: {
            supplierId,
            settlementFor: 'SUPPLIER',
            periodStart: { gte: periodStart },
            periodEnd: { lte: periodEnd },
            status: { in: ['PENDING', 'PROCESSED'] },
          },
        });
        
        if (existing && !force) {
          return NextResponse.json({ error: 'Supplier already has a settlement for this period. Use force to override.', existingSettlementId: existing.id }, { status: 409 });
        }
        
        const settlement = await FinanceService.createSettlement(supplierId, { 
          amount: parseFloat(amount), 
          settlementType: force ? 'MANUAL_OVERRIDE' : 'MANUAL',
          settlementFor: 'SUPPLIER',
          notes: force ? 'Manual override settlement by admin' : 'Manual settlement by admin',
          periodStart,
          periodEnd,
        });
        const result = await FinanceService.processSettlement(settlement.id);
        await prisma.settlement.update({
          where: { id: settlement.id },
          data: { processedBy: user.id },
        });
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