import prisma from '@/lib/prisma';

export class CommissionService {
  /**
   * Calculate and deduct platform commission on order
   */
  static async processOrderCommission(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: { include: { supplier: true } } }
    });

    if (!order) return null;

    // Get commission settings
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: 'COMMISSION' }
    });
    const settings = {};
    dbSettings.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); }
      catch { settings[s.key] = s.value; }
    });

    const commissionRate = settings.defaultRate || 5; // Default 5%
    const minCommission = settings.minCommission || 0;
    const maxCommission = settings.maxCommission || 0;

    // Calculate commission
    let commissionAmount = (order.totalAmount * commissionRate) / 100;
    
    if (minCommission > 0 && commissionAmount < minCommission) {
      commissionAmount = minCommission;
    }
    if (maxCommission > 0 && commissionAmount > maxCommission) {
      commissionAmount = maxCommission;
    }

    // Deduct from supplier wallet
    const supplierId = order.product.supplierId;
    let wallet = await prisma.supplierWallet.findUnique({ where: { supplierId } });
    
    if (!wallet) {
      wallet = await prisma.supplierWallet.create({
        data: { supplierId, balance: 0 }
      });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - commissionAmount;

    await prisma.$transaction([
      prisma.supplierWallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter }
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: commissionAmount,
          referenceType: 'COMMISSION',
          referenceId: orderId,
          description: `Platform commission (${commissionRate}%) on order #${orderId.slice(0,8)}`,
          balanceBefore,
          balanceAfter
        }
      })
    ]);

    return {
      orderAmount: order.totalAmount,
      commissionRate,
      commissionAmount,
      supplierId,
      walletBalance: balanceAfter
    };
  }

  /**
   * Get commission report
   */
  static async getCommissionReport({ startDate, endDate, supplierId } = {}) {
    const where = {
      type: 'DEBIT',
      referenceType: 'COMMISSION',
      ...(startDate && endDate && {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      }),
      ...(supplierId && {
        wallet: { supplierId }
      })
    };

    const commissions = await prisma.walletTransaction.findMany({
      where,
      include: {
        wallet: {
          include: { supplier: { select: { businessName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);

    return {
      commissions,
      totalCommission,
      count: commissions.length,
      period: { startDate, endDate }
    };
  }
}