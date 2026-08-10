import prisma from '@/lib/prisma';

export class FinanceService {
  /**
   * Get supplier finance overview
   */
  static async getSupplierFinanceOverview(supplierId) {
    const [orders, invoices, wallet, settlements, returns] = await Promise.all([
      prisma.order.aggregate({
        where: {
          product: { supplierId },
          status: { in: ['DELIVERED', 'COMPLETED'] }
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.invoice.aggregate({
        where: { supplierId },
        _sum: { totalAmount: true, taxAmount: true },
        _count: true
      }),
      prisma.supplierWallet.findUnique({
        where: { supplierId }
      }),
      prisma.settlement.aggregate({
        where: { supplierId, status: 'PENDING' },
        _sum: { amount: true }
      }),
      prisma.returnRequest.aggregate({
        where: {
          supplierId,
          status: { in: ['APPROVED', 'COMPLETED'] }
        },
        _sum: { refundAmount: true },
        _count: true
      })
    ]);

    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { wallet: { supplierId } },
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
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invoice.count({ where })
    ]);

    return {
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Create invoice
   */
  static async createInvoice(supplierId, data) {
    const { orderId, items, invoiceType = 'TAX_INVOICE', dueDate } = data;
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
        items: { create: invoiceItems }
      },
      include: { items: true }
    });

    return invoice;
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId, status, paidAt = null) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status, ...(paidAt && { paidAt: new Date(paidAt) }) }
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
  static async createSettlement(supplierId, { amount, settlementType = 'AUTO', settlementFor = 'SUPPLIER', referenceId = null, notes = null, partnerId = null, periodStart = null, periodEnd = null }) {
    return prisma.settlement.create({
      data: { supplierId, amount, settlementType, settlementFor, referenceId, notes, partnerId, periodStart, periodEnd }
    });
  }

  static async hasExistingSettlement(supplierId, periodStart, periodEnd, settlementFor = 'SUPPLIER') {
    const existing = await prisma.settlement.findFirst({
      where: {
        supplierId,
        settlementFor,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        status: { in: ['PENDING', 'PROCESSED'] },
      },
    });
    return !!existing;
  }

  static async hasExistingPartnerSettlement(partnerId, periodStart, periodEnd) {
    const existing = await prisma.settlement.findFirst({
      where: {
        partnerId,
        settlementFor: 'DELIVERY_PARTNER',
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        status: { in: ['PENDING', 'PROCESSED'] },
      },
    });
    return !!existing;
  }

  /**
   * Process SUPPLIER settlement - DEDUCT from wallet and send via Razorpay Payout
   * BLOCKS if supplier has no bank account
   */
  static async processSettlement(settlementId) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { 
        supplier: { 
          include: { 
            wallet: true,
            bankAccounts: { where: { isDefault: true }, take: 1 }
          } 
        } 
      }
    });

    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status !== 'PENDING') throw new Error('Settlement already processed');

    // BLOCK: Supplier must have a bank account
    const bankAccount = settlement.supplier.bankAccounts[0];
    if (!bankAccount) {
      throw new Error('Supplier has no bank account. Please add a bank account before processing settlement.');
    }

    const wallet = settlement.supplier.wallet;
    if (!wallet) throw new Error('Supplier wallet not found');

    // Validate wallet has enough balance
    if (wallet.balance < settlement.amount) {
      throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balance}, Requested: ₹${settlement.amount}`);
    }

    // Try actual Razorpay payout (works in production with real keys)
    let payoutResult = null;
    try {
      const { RazorpayService } = await import('@/services/razorpay.service');
      
      let fundAccountId = bankAccount?.razorpayFundAccountId;
      
      if (!fundAccountId && bankAccount) {
        const fundAccount = await RazorpayService.createFundAccount({
          accountHolder: bankAccount.accountHolder,
          accountNumber: bankAccount.accountNumber,
          ifsc: bankAccount.ifscCode,
          bankName: bankAccount.bankName,
        });
        fundAccountId = fundAccount.id;
        
        await prisma.supplierBankAccount.update({
          where: { id: bankAccount.id },
          data: { razorpayFundAccountId: fundAccountId }
        }).catch(() => {});
      }

      if (fundAccountId) {
        payoutResult = await RazorpayService.createPayout({
          fundAccountId,
          amount: settlement.amount,
          reference: `settlement_${settlementId}`,
          narration: `PROCURE Settlement #${settlementId.slice(0, 8)}`,
        });
      }
    } catch (payoutError) {
      console.log('Razorpay payout not available (test mode or missing bank):', payoutError.message);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - settlement.amount;

    const result = await prisma.$transaction([
      prisma.settlement.update({
        where: { id: settlementId },
        data: { 
          status: 'PROCESSED', 
          processedAt: new Date(),
          notes: payoutResult 
            ? `Razorpay Payout ID: ${payoutResult.id} | Mode: NEFT` 
            : settlement.notes || 'Settlement processed'
        }
      }),
      prisma.supplierWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalWithdrawn: (wallet.totalWithdrawn || 0) + settlement.amount
        }
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: settlement.amount,
          referenceType: 'SETTLEMENT',
          referenceId: settlementId,
          description: payoutResult 
            ? `Settlement via Razorpay Payout (NEFT)` 
            : `Settlement payout`,
          balanceBefore,
          balanceAfter
        }
      })
    ]);

    return {
      settlementId,
      amount: settlement.amount,
      walletBalanceBefore: balanceBefore,
      walletBalanceAfter: balanceAfter,
      status: 'PROCESSED',
      payoutId: payoutResult?.id || null,
      isRealPayout: !!payoutResult
    };
  }

  /**
   * Process DELIVERY PARTNER settlement
   * Priority: Verified Bank > UPI > Unverified Bank
   * SAFE: Only deducts wallet after successful payout
   */
  static async processPartnerSettlement(settlementId) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        partner: {
          include: {
            bankAccounts: { where: { isDefault: true }, take: 1 },
            wallet: true,
          }
        }
      }
    });

    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status !== 'PENDING') throw new Error('Settlement already processed');
    if (settlement.settlementFor !== 'DELIVERY_PARTNER') throw new Error('Not a delivery partner settlement');

    // BLOCK: Partner must have a bank account or UPI
    const bankAccount = settlement.partner?.bankAccounts?.[0];
    if (!bankAccount) {
      throw new Error('Delivery partner has no bank account or UPI. Please add payment details before processing settlement.');
    }

    // Must have either bank details or UPI
    const hasBank = bankAccount.accountNumber && bankAccount.ifscCode;
    const hasUpi = !!bankAccount.upiId;
    
    if (!hasBank && !hasUpi) {
      throw new Error('Delivery partner has no bank account or UPI. Please add payment details before processing settlement.');
    }

    const wallet = settlement.partner?.wallet;
    if (!wallet) throw new Error('Partner wallet not found');

    // TRY PAYOUT FIRST (before deducting wallet)
    let payoutResult = null;
    let payoutMode = 'NEFT';
    let payoutError = null;
    
    try {
      const { RazorpayService } = await import('@/services/razorpay.service');
      
      // Priority 1: Verified bank account
      if (hasBank && bankAccount.pennyDropVerified) {
        let fundAccountId = bankAccount.razorpayFundAccountId;
        
        if (!fundAccountId) {
          const fundAccount = await RazorpayService.createFundAccount({
            accountHolder: bankAccount.accountHolder,
            accountNumber: bankAccount.accountNumber,
            ifsc: bankAccount.ifscCode,
            bankName: bankAccount.bankName,
          });
          fundAccountId = fundAccount.id;
          
          await prisma.partnerBankAccount.update({
            where: { id: bankAccount.id },
            data: { razorpayFundAccountId: fundAccountId }
          }).catch(() => {});
        }

        if (fundAccountId) {
          payoutResult = await RazorpayService.createPayout({
            fundAccountId,
            amount: settlement.amount,
            reference: `partner_settlement_${settlementId}`,
            narration: `PROCURE Partner Settlement #${settlementId.slice(0, 8)}`,
          });
          payoutMode = 'NEFT (Verified)';
        }
      }
      // Priority 2: UPI ID
      else if (hasUpi) {
        try {
          payoutResult = await RazorpayService.createPayout({
            upiId: bankAccount.upiId,
            amount: settlement.amount,
            reference: `partner_settlement_${settlementId}`,
            narration: `PROCURE Partner Settlement #${settlementId.slice(0, 8)}`,
          });
          payoutMode = 'UPI';
        } catch (upiError) {
          payoutError = `UPI payout failed: ${upiError.message}. UPI ID may be invalid.`;
        }
      }
      
      // Priority 3: Unverified bank account (fallback)
      if (!payoutResult && !payoutError && hasBank) {
        let fundAccountId = bankAccount.razorpayFundAccountId;
        
        if (!fundAccountId) {
          const fundAccount = await RazorpayService.createFundAccount({
            accountHolder: bankAccount.accountHolder,
            accountNumber: bankAccount.accountNumber,
            ifsc: bankAccount.ifscCode,
            bankName: bankAccount.bankName,
          });
          fundAccountId = fundAccount.id;
          
          await prisma.partnerBankAccount.update({
            where: { id: bankAccount.id },
            data: { razorpayFundAccountId: fundAccountId }
          }).catch(() => {});
        }

        if (fundAccountId) {
          payoutResult = await RazorpayService.createPayout({
            fundAccountId,
            amount: settlement.amount,
            reference: `partner_settlement_${settlementId}`,
            narration: `PROCURE Partner Settlement #${settlementId.slice(0, 8)}`,
          });
          payoutMode = 'NEFT (Unverified)';
        }
      }
    } catch (payoutErrorCatch) {
      payoutError = payoutErrorCatch.message;
      console.log('Partner payout error:', payoutErrorCatch.message);
    }

    // IF PAYOUT FAILED → Mark settlement as FAILED, keep wallet unchanged
    if (!payoutResult) {
      await prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          notes: payoutError || 'Payout failed. Please verify payment details and retry.',
        },
      });

      // Notify admin about the failure
      try {
        const { NotificationService } = await import('@/services/notification.service');
        const admins = await prisma.user.findMany({
          where: { roles: { some: { role: { name: 'ADMIN' } } } },
          select: { id: true },
          take: 5,
        });
        for (const admin of admins) {
          NotificationService.send({
            userId: admin.id,
            type: 'IN_APP',
            title: '⚠️ Settlement Failed',
            message: `Partner settlement #${settlementId.slice(0, 8)} failed: ${payoutError || 'Unknown error'}. Partner: ${settlement.partner?.user?.name || 'Unknown'}`,
          }).catch(() => {});
        }
      } catch {}

      throw new Error(payoutError || 'Payout failed. Wallet not deducted. Please verify payment details and retry.');
    }

    // PAYOUT SUCCESS → Now deduct wallet
    const result = await prisma.$transaction([
      prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          notes: `Razorpay Payout ID: ${payoutResult.id} | Mode: ${payoutMode}`,
        }
      }),
      // If COD settlement, reduce codPending
      ...(settlement.settlementType === 'COD_COLLECTION' ? [
        prisma.partnerWallet.update({
          where: { id: wallet.id },
          data: {
            codPending: { decrement: settlement.amount },
            codCollected: { decrement: settlement.amount },
          }
        })
      ] : []),
      // If delivery fee settlement, reduce totalEarned
      ...(settlement.settlementType === 'DELIVERY_FEE' || settlement.settlementType === 'AUTO' ? [
        prisma.partnerWallet.update({
          where: { id: wallet.id },
          data: {
            totalEarned: { decrement: settlement.amount },
          }
        })
      ] : []),
    ]);

    return {
      settlementId,
      amount: settlement.amount,
      status: 'PROCESSED',
      payoutId: payoutResult?.id || null,
      payoutMode,
      isRealPayout: true,
    };
  }

  /**
   * Get wallet details
   */
  static async getWallet(supplierId) {
    let wallet = await prisma.supplierWallet.findUnique({
      where: { supplierId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });

    if (!wallet) {
      wallet = await prisma.supplierWallet.create({
        data: { supplierId },
        include: { transactions: true }
      });
    }

    return wallet;
  }

  /**
   * Get wallet transactions
   */
  static async getWalletTransactions(supplierId, { page = 1, limit = 20 } = {}) {
    const wallet = await prisma.supplierWallet.findUnique({ where: { supplierId } });
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

    return { transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Get admin finance overview
   */
    static async getAdminFinanceOverview() {
    const [totalRevenue, pendingSettlements, totalRefunds, invoiceStats, monthlyRevenueRaw, totalOrders, avgOrderValue] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
        _sum: { totalAmount: true }
      }),
      prisma.settlement.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.refundTransaction.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        _count: true,
        _sum: { totalAmount: true }
      }),
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          CAST(SUM(totalAmount) AS DECIMAL(15,2)) as revenue,
          CAST(COUNT(*) AS UNSIGNED) as orders
        FROM \`Order\`
        WHERE status IN ('DELIVERED', 'COMPLETED')
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `,
      prisma.order.count({
        where: { status: { in: ['DELIVERED', 'COMPLETED'] } }
      }),
      prisma.order.aggregate({
        where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
        _avg: { totalAmount: true }
      })
    ]);

    // Convert BigInt/Decimal to plain numbers for JSON serialization
    const monthlyRevenue = (monthlyRevenueRaw || []).map(row => ({
      month: String(row.month),
      revenue: Number(row.revenue || 0),
      orders: Number(row.orders || 0)
    }));

    // Calculate trend
    const last6Months = monthlyRevenue.slice(-6);
    const trend = last6Months.length >= 2 
      ? ((last6Months[last6Months.length - 1].revenue - last6Months[0].revenue) / Math.max(last6Months[0].revenue, 1) * 100).toFixed(1)
      : 0;

    return {
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalOrders: totalOrders,
      averageOrderValue: Number(avgOrderValue._avg.totalAmount || 0),
      pendingSettlements: {
        amount: Number(pendingSettlements._sum.amount || 0),
        count: pendingSettlements._count
      },
      totalRefunds: Number(totalRefunds._sum.amount || 0),
      invoiceStats: (invoiceStats || []).map(stat => ({
        status: stat.status,
        count: stat._count,
        totalAmount: Number(stat._sum.totalAmount || 0)
      })),
      monthlyRevenue,
      trend: Number(trend),
      bestMonth: monthlyRevenue.length > 0 
        ? monthlyRevenue.reduce((best, m) => m.revenue > best.revenue ? m : best, monthlyRevenue[0])
        : null
    };
  }

  /**
   * Get admin settlement history - all settlements with full details
   */
  static async getAdminSettlementHistory({ page = 1, limit = 50, status = null, settlementFor = null, supplierId = null } = {}) {
    const where = {};
    if (status) where.status = status;
    if (settlementFor) where.settlementFor = settlementFor;
    if (supplierId) where.supplierId = supplierId;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          supplier: { select: { id: true, businessName: true, email: true, mobile: true } },
          partner: {
            select: {
              id: true,
              activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
              user: { select: { id: true, name: true, mobile: true } },
            },
          },
          processedByUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.settlement.count({ where }),
    ]);

    // Convert BigInt amounts to Number
    const serializedSettlements = settlements.map(s => ({
      ...s,
      amount: Number(s.amount),
    }));

    return {
      settlements: serializedSettlements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async processAutoSettlements() {
    const results = { supplier: { processed: 0, skipped: 0, errors: 0 }, partner: { processed: 0, skipped: 0, errors: 0 } };

    const dbSettings = await prisma.systemSetting.findMany({ where: { category: 'PAYMENT' } });
    const settings = {};
    dbSettings.forEach(s => { try { settings[s.key] = JSON.parse(s.value); } catch { settings[s.key] = s.value; } });

    const settlementCycle = settings.settlementCycle || 'WEEKLY';
    const minSettlement = settings.minSettlement || 1000;
    const holdPeriod = settings.holdPeriod || 7;

    const now = new Date();
    let periodStart, periodEnd;
    if (settlementCycle === 'WEEKLY') { periodStart = new Date(now); periodStart.setDate(periodStart.getDate() - 7); periodEnd = now; }
    else if (settlementCycle === 'MONTHLY') { periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); }
    else { periodStart = new Date(now); periodStart.setDate(periodStart.getDate() - 1); periodEnd = now; }

    // Supplier settlements — only process if they have bank account
    try {
      const wallets = await prisma.supplierWallet.findMany({ 
        where: { balance: { gte: minSettlement } }, 
        include: { 
          supplier: { 
            select: { 
              id: true,
              bankAccounts: { where: { isDefault: true }, take: 1 }
            } 
          } 
        } 
      });
      for (const w of wallets) {
        try {
          // Skip if no bank account
          if (!w.supplier.bankAccounts || w.supplier.bankAccounts.length === 0) {
            results.supplier.skipped++;
            continue;
          }
          const already = await FinanceService.hasExistingSettlement(w.supplierId, periodStart, periodEnd, 'SUPPLIER');
          if (already) { results.supplier.skipped++; continue; }
          const settlement = await FinanceService.createSettlement(w.supplierId, { amount: w.balance, settlementType: 'AUTO', settlementFor: 'SUPPLIER', notes: `Auto ${settlementCycle.toLowerCase()} settlement`, periodStart, periodEnd });
          await FinanceService.processSettlement(settlement.id);
          results.supplier.processed++;
        } catch (e) { 
          console.error('Supplier auto-settlement error:', e.message);
          results.supplier.errors++; 
        }
      }
    } catch { }

    // Partner settlements — only process if they have bank account
    try {
      const pwallets = await prisma.partnerWallet.findMany({ 
        where: { 
          OR: [
            { codPending: { gte: minSettlement } },
            { totalEarned: { gte: minSettlement } }
          ]
        }, 
        include: { 
          partner: { 
            select: { 
              id: true,
              bankAccounts: { where: { isDefault: true }, take: 1 }
            } 
          } 
        } 
      });
      const systemSupplier = await prisma.supplier.findFirst({ where: { businessName: 'PROCURE' } });
      for (const w of pwallets) {
        try {
          // Skip if no bank account
          if (!w.partner.bankAccounts || w.partner.bankAccounts.length === 0) {
            results.partner.skipped++;
            continue;
          }
          const already = await FinanceService.hasExistingPartnerSettlement(w.partnerId, periodStart, periodEnd);
          if (already) { results.partner.skipped++; continue; }
          
          // Settle COD pending if any
          if (systemSupplier && w.codPending > 0) {
            const settlement = await FinanceService.createSettlement(systemSupplier.id, { amount: w.codPending, settlementType: 'AUTO', settlementFor: 'DELIVERY_PARTNER', partnerId: w.partnerId, notes: `Auto ${settlementCycle.toLowerCase()} COD settlement`, periodStart, periodEnd });
            await FinanceService.processPartnerSettlement(settlement.id);
            results.partner.processed++;
          }
          
          // Settle delivery earnings if no COD pending but has earnings
          if (systemSupplier && w.codPending === 0 && w.totalEarned > 0) {
            const settlement = await FinanceService.createSettlement(systemSupplier.id, { amount: w.totalEarned, settlementType: 'AUTO', settlementFor: 'DELIVERY_PARTNER', partnerId: w.partnerId, notes: `Auto ${settlementCycle.toLowerCase()} delivery earnings settlement`, periodStart, periodEnd });
            await FinanceService.processPartnerSettlement(settlement.id);
            results.partner.processed++;
          }
        } catch (e) { 
          console.error('Partner auto-settlement error:', e.message);
          results.partner.errors++; 
        }
      }
    } catch (e) {
      console.error('Partner auto-settlement batch error:', e.message);
    }

    return { results, period: { start: periodStart, end: periodEnd }, cycle: settlementCycle };
  }

  /**
   * Generate financial report
   */
  static async generateFinancialReport(supplierId, { startDate, endDate, type = 'SUMMARY' } = {}) {
    const where = {
      supplierId,
      ...(startDate && endDate && { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } })
    };

    const [orders, invoices, settlements, walletTransactions, returns] = await Promise.all([
      prisma.order.findMany({
        where: {
          product: { supplierId },
          ...(startDate && endDate && { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } })
        },
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.settlement.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.walletTransaction.findMany({
        where: {
          wallet: { supplierId },
          ...(startDate && endDate && { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } })
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.returnRequest.findMany({
        where: {
          supplierId,
          ...(startDate && endDate && { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } })
        }
      })
    ]);

    return {
      period: { startDate, endDate },
      type,
      orders: { data: orders, total: orders.reduce((sum, o) => sum + o.totalAmount, 0), count: orders.length },
      invoices: { data: invoices, total: invoices.reduce((sum, i) => sum + i.totalAmount, 0), count: invoices.length },
      settlements: { data: settlements, total: settlements.reduce((sum, s) => sum + s.amount, 0), count: settlements.length },
      walletTransactions: {
        data: walletTransactions,
        credits: walletTransactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0),
        debits: walletTransactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0)
      },
      returns: { data: returns, totalRefund: returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0), count: returns.length }
    };
  }
}