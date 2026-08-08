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

    const commissionRate = settings.defaultRate || 5;
    const minCommission = settings.minCommission || 0;
    const maxCommission = settings.maxCommission || 0;

    let commissionAmount = (order.totalAmount * commissionRate) / 100;
    
    if (minCommission > 0 && commissionAmount < minCommission) {
      commissionAmount = minCommission;
    }
    if (maxCommission > 0 && commissionAmount > maxCommission) {
      commissionAmount = maxCommission;
    }

    const supplierId = order.product.supplierId;
    let wallet = await prisma.supplierWallet.findUnique({ where: { supplierId } });
    
    if (!wallet) {
      wallet = await prisma.supplierWallet.create({
        data: { supplierId, balance: 0, totalEarned: 0 }
      });
    }

    const balanceAfterOrder = wallet.balance + order.totalAmount;
    const totalEarnedAfter = (wallet.totalEarned || 0) + order.totalAmount;
    const balanceAfterCommission = balanceAfterOrder - commissionAmount;

    await prisma.$transaction([
      prisma.supplierWallet.update({
        where: { id: wallet.id },
        data: { 
          balance: balanceAfterCommission,
          totalEarned: totalEarnedAfter
        }
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: order.totalAmount,
          referenceType: 'ORDER',
          referenceId: orderId,
          description: `Order #${orderId.slice(0, 8)} revenue`,
          balanceBefore: wallet.balance,
          balanceAfter: balanceAfterOrder
        }
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: commissionAmount,
          referenceType: 'COMMISSION',
          referenceId: orderId,
          description: `Platform commission (${commissionRate}%) on order #${orderId.slice(0, 8)}`,
          balanceBefore: balanceAfterOrder,
          balanceAfter: balanceAfterCommission
        }
      })
    ]);

    return {
      orderAmount: order.totalAmount,
      commissionRate,
      commissionAmount,
      supplierId,
      walletBalance: balanceAfterCommission
    };
  }

  /**
   * Get supplier commission rate
   */
  static async getSupplierCommissionRate() {
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: 'COMMISSION' }
    });
    const settings = {};
    dbSettings.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); }
      catch { settings[s.key] = s.value; }
    });
    return settings.defaultRate || 5;
  }

  /**
   * Get delivery partner commission rate
   */
  static async getDeliveryCommissionRate() {
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: 'DELIVERY_COMMISSION' }
    });
    const settings = {};
    dbSettings.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); }
      catch { settings[s.key] = s.value; }
    });
    return settings.defaultRate || 0;
  }

  /**
   * Calculate net delivery earning after commission
   */
  static async calculateDeliveryNetEarning(deliveryFee) {
    const commissionRate = await this.getDeliveryCommissionRate();
    const commissionAmount = (deliveryFee * commissionRate) / 100;
    const netEarning = deliveryFee - commissionAmount;
    return {
      grossFee: deliveryFee,
      commissionRate,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      netEarning: Math.round(netEarning * 100) / 100,
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