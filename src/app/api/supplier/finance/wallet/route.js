import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { FinanceService } from '@/services/finance.service';

// GET - Wallet details and transactions
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
    const limit = parseInt(searchParams.get('limit') || '20');

    const wallet = await FinanceService.getWallet(supplierStaff.supplierId);
    const { transactions, pagination } = await FinanceService.getWalletTransactions(
      supplierStaff.supplierId,
      { page, limit }
    );

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn
      },
      transactions,
      pagination
    });
  } catch (error) {
    console.error('Fetch wallet error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}
