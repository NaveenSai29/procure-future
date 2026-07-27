import prisma from '@/lib/prisma';

export class FinanceService {
  /**
   * Get supplier finance overview
   */
  static async getSupplierFinanceOverview(supplierId) {
    const [orders, invoices, wallet, settlements, returns] = await Promise.all([
      // Revenue from orders
      prisma.order.aggregate({
        where: {
          product: { supplierId },
          status: { in: ['DELIVERED', 'COMPLETED'] }
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      // Invoice summary
      prisma.invoice.aggregate({
        where: { supplierId },
        _sum: { totalAmount: true, taxAmount: true },
        _count: true
      }),
      // Wallet balance
      prisma.supplierWallet.findUnique({
        where: { supplierId }
      }),
      // Pending settlements
      prisma.settlement.aggregate({
        where: { supplierId, status: 'PENDING' },
        _sum: { amount: true }
      }),
      // Return/Refund summary
      prisma.returnRequest.aggregate({
        where: {
          supplierId,
          status: { in: ['APPROVED', 'COMPLETED'] }
        },
        _sum: { refundAmount: true },
        _count: true
      })
    ]);

    // Recent transactions
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: {
        wallet: { supplierId }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return {
      revenue: {
        total: orders._sum.totalAmount || 0,
        orderCount: orders._count
      },
      invoices: {
        total: invoices._sum.totalAmount || 0,
        tax: invoices._sum.taxAmount || 0,
        count: invoices._count
      },
      wallet: {
        balance: wallet?.balance || 0,
        totalEarned: wallet?.totalEarned || 0,
        totalWithdrawn: wallet?.totalWithdrawn || 0
      },
      settlements: {
        pending: settlements._sum.amount || 0
      },
      returns: {
        totalRefunded: returns._sum.refundAmount || 0,
        count: returns._count
      },
      recentTransactions
    };
  }

  /**
   * Get supplier invoices
   */
  static async getSupplierInvoices(supplierId, { page = 1, limit = 10, status = null } = {}) {
    const where = { supplierId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invoice.count({ where })
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create invoice
   */
  static async createInvoice(supplierId, data) {
    const { orderId, items, invoiceType = 'TAX_INVOICE', dueDate } = data;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate totals
    let amount = 0;
    let taxAmount = 0;

    const invoiceItems = items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemTax = itemTotal * (item.taxRate / 100);
      amount += itemTotal;
      taxAmount += itemTax;

      return {
        description: item.description,
        productId: item.productId,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        taxAmount: itemTax,
        totalAmount: itemTotal + itemTax
      };
    });

    const invoice = await prisma.invoice.create({
      data: {
        supplierId,
        orderId,
        invoiceNumber,
        invoiceType,
        amount,
        taxAmount,
        totalAmount: amount + taxAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: {
          create: invoiceItems
        }
      },
      include: {
        items: true
      }
    });

    return invoice;
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId, status, paidAt = null) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        ...(paidAt && { paidAt: new Date(paidAt) })
      }
    });
  }

  /**
   * Get settlements
   */
  static async getSettlements(supplierId, { page = 1, limit = 10, status = null } = {}) {
    const where = { supplierId };
    if (status) where.status = status;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.settlement.count({ where })
    ]);

    return {
      settlements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Create settlement
   */
  static async createSettlement(supplierId, { amount, settlementType = 'AUTO', referenceId = null, notes = null }) {
    return prisma.settlement.create({
      data: {
        supplierId,
        amount,
        settlementType,
        referenceId,
        notes
      }
    });
  }

  /**
   * Process settlement
   */
  static async processSettlement(settlementId) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { supplier: { include: { wallet: true } } }
    });

    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status !== 'PENDING') throw new Error('Settlement already processed');

    // Update wallet
    const wallet = settlement.supplier.wallet;
    if (!wallet) throw new Error('Supplier wallet not found');

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + settlement.amount;

    // Update settlement and wallet in transaction
    const result = await prisma.$transaction([
      prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date()
        }
      }),
      prisma.supplierWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalEarned: wallet.totalEarned + settlement.amount
        }
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: settlement.amount,
          referenceType: 'SETTLEMENT',
          referenceId: settlementId,
          description: `Settlement processed - ${settlement.settlementType}`,
          balanceBefore,
          balanceAfter
        }
      })
    ]);

    return result;
  }

  /**
   * Get wallet details
   */
  static async getWallet(supplierId) {
    let wallet = await prisma.supplierWallet.findUnique({
      where: { supplierId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await prisma.supplierWallet.create({
        data: { supplierId },
        include: {
          transactions: true
        }
      });
    }

    return wallet;
  }

  /**
   * Get wallet transactions
   */
  static async getWalletTransactions(supplierId, { page = 1, limit = 20 } = {}) {
    const wallet = await prisma.supplierWallet.findUnique({
      where: { supplierId }
    });

    if (!wallet) return { transactions: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.walletTransaction.count({ where: { walletId: wallet.id } })
    ]);

    return {
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get admin finance overview
   */
  static async getAdminFinanceOverview() {
    const [
      totalRevenue,
      pendingSettlements,
      totalRefunds,
      invoiceStats,
      monthlyRevenue
    ] = await Promise.all([
      // Total platform revenue
      prisma.order.aggregate({
        where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
        _sum: { totalAmount: true }
      }),
      // Pending settlements
      prisma.settlement.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      }),
      // Total refunds
      prisma.refundTransaction.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      // Invoice stats
      prisma.invoice.groupBy({
        by: ['status'],
        _count: true,
        _sum: { totalAmount: true }
      }),
      // Monthly revenue (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          SUM(totalAmount) as revenue,
          COUNT(*) as orders
        FROM \`Order\`
        WHERE status IN ('DELIVERED', 'COMPLETED')
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `
    ]);

    return {
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingSettlements: {
        amount: pendingSettlements._sum.amount || 0,
        count: pendingSettlements._count
      },
      totalRefunds: totalRefunds._sum.amount || 0,
      invoiceStats,
      monthlyRevenue
    };
  }

  /**
   * Generate financial report
   */
  static async generateFinancialReport(supplierId, { startDate, endDate, type = 'SUMMARY' } = {}) {
    const where = {
      supplierId,
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [orders, invoices, settlements, walletTransactions, returns] = await Promise.all([
      prisma.order.findMany({
        where: {
          product: { supplierId },
          ...(startDate && endDate && {
            createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
          })
        },
        include: {
          product: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.settlement.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.walletTransaction.findMany({
        where: {
          wallet: { supplierId },
          ...(startDate && endDate && {
            createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
          })
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.returnRequest.findMany({
        where: {
          supplierId,
          ...(startDate && endDate && {
            createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
          })
        }
      })
    ]);

    return {
      period: { startDate, endDate },
      type,
      orders: {
        data: orders,
        total: orders.reduce((sum, o) => sum + o.totalAmount, 0),
        count: orders.length
      },
      invoices: {
        data: invoices,
        total: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
        count: invoices.length
      },
      settlements: {
        data: settlements,
        total: settlements.reduce((sum, s) => sum + s.amount, 0),
        count: settlements.length
      },
      walletTransactions: {
        data: walletTransactions,
        credits: walletTransactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
        debits: walletTransactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0)
      },
      returns: {
        data: returns,
        totalRefund: returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0),
        count: returns.length
      }
    };
  }
}