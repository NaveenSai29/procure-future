import prisma from '@/lib/prisma';

// Helper to convert BigInt to Number for JSON serialization
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'bigint') return Number(val);
  return val;
};

export class AnalyticsService {
  /**
   * Get supplier analytics overview
   */
  static async getSupplierAnalytics(supplierId, { period = 'MONTHLY', startDate, endDate } = {}) {
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      // Auto-calculate date range based on period
      const now = new Date();
      let rangeStart;
      
      switch (period) {
        case 'DAILY':
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'WEEKLY':
          rangeStart = new Date(now);
          rangeStart.setDate(now.getDate() - 7);
          break;
        case 'MONTHLY':
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'YEARLY':
          rangeStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      dateFilter.createdAt = { gte: rangeStart };
    }

    // For raw SQL, use the date filter or default to 30 days
    const sqlStartDate = dateFilter.createdAt?.gte 
      ? dateFilter.createdAt.gte.toISOString().split('T')[0]
      : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    const [
      orderStats,
      productStats,
      revenueByDay,
      topProducts,
      inventoryStatus,
      customerStats,
      rfqStats
    ] = await Promise.all([
      // Order statistics
      prisma.order.groupBy({
        by: ['status'],
        where: {
          product: { supplierId },
          ...dateFilter
        },
        _count: true,
        _sum: { totalAmount: true }
      }),
      // Product statistics
      prisma.product.aggregate({
        where: { supplierId },
        _count: true
      }),
      // Revenue by day (respects period)
      prisma.$queryRawUnsafe(`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as orders,
          SUM(totalAmount) as revenue
        FROM \`Order\`
        WHERE productId IN (SELECT id FROM Product WHERE supplierId = ?)
          AND createdAt >= ?
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `, supplierId, sqlStartDate),
      // Top 10 products by orders
      prisma.product.findMany({
        where: { supplierId },
        select: {
          id: true,
          name: true,
          _count: { select: { orders: true } },
          pricing: {
            where: { priceType: 'RETAIL' },
            select: { sellingPrice: true },
            take: 1
          }
        },
        orderBy: { orders: { _count: 'desc' } },
        take: 10
      }),
      // Inventory status
      prisma.warehouseInventory.findMany({
        where: {
          product: { supplierId }
        },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } }
        },
        orderBy: { availableQty: 'asc' },
        take: 20
      }),
      // Customer stats
      prisma.order.groupBy({
        by: ['buyerId'],
        where: {
          product: { supplierId },
          ...dateFilter
        },
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10
      }),
      // RFQ stats
      prisma.rFQResponse.count({
        where: {
          supplierId,
          ...dateFilter
        }
      })
    ]);

    // Convert raw query results
    const revenueData = (revenueByDay || []).map(d => ({
      date: d.date,
      orders: toNumber(d.orders),
      revenue: toNumber(d.revenue),
    }));

    // Calculate KPIs
    const totalOrders = orderStats.reduce((sum, s) => sum + toNumber(s._count), 0);
    const totalRevenue = orderStats.reduce((sum, s) => sum + toNumber(s._sum?.totalAmount), 0);
    const completedOrders = toNumber(orderStats.find(s => s.status === 'DELIVERED')?._count);
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Convert orderStats for JSON
    const safeOrderStats = orderStats.map(s => ({
      status: s.status,
      _count: toNumber(s._count),
      _sum: { totalAmount: toNumber(s._sum?.totalAmount) }
    }));

    // Convert topProducts
    const safeTopProducts = topProducts.map(p => ({
      id: p.id,
      name: p.name,
      _count: { orders: toNumber(p._count?.orders) },
      pricing: p.pricing
    }));

    // Convert customerStats
    const safeCustomerStats = customerStats.map(c => ({
      buyerId: c.buyerId,
      _count: toNumber(c._count),
      _sum: { totalAmount: toNumber(c._sum?.totalAmount) }
    }));

    return {
      kpis: {
        totalOrders,
        totalRevenue,
        completedOrders,
        completionRate: `${completionRate}%`,
        avgOrderValue,
        totalProducts: toNumber(productStats._count),
        rfqResponses: toNumber(rfqStats)
      },
      orderStats: safeOrderStats,
      revenueByDay: revenueData,
      topProducts: safeTopProducts,
      inventoryStatus: {
        lowStock: inventoryStatus.filter(i => i.availableQty <= i.minStockLevel),
        outOfStock: inventoryStatus.filter(i => i.availableQty === 0),
        all: inventoryStatus
      },
      customerStats: safeCustomerStats
    };
  }

  /**
   * Get admin analytics overview
   */
  static async getAdminAnalytics() {
    const [
      userStats,
      userGrowth,
      supplierStats,
      supplierVerification,
      orderStats,
      revenueByDay,
      productStats,
      productApprovals,
      deliveryStats,
      returnStats,
      commissionStats,
      pendingSettlements,
      codOrders,
      activePartners,
      slaBreaches,
      expiredOrders
    ] = await Promise.all([
      prisma.user.aggregate({ where: { isActive: true }, _count: true }),
      prisma.user.groupBy({ by: ['createdAt'], _count: true, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.supplier.aggregate({ where: { isActive: true }, _count: true }),
      prisma.supplier.groupBy({ by: ['isVerified'], _count: true }),
      prisma.order.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
      prisma.$queryRaw`SELECT DATE(createdAt) as date, COUNT(*) as orders, SUM(totalAmount) as revenue FROM \`Order\` WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(createdAt) ORDER BY date ASC`,
      prisma.product.aggregate({ _count: true }),
      prisma.product.groupBy({ by: ['isApproved'], _count: true }),
      prisma.delivery.groupBy({ by: ['status'], _count: true }),
      prisma.returnRequest.groupBy({ by: ['status'], _count: true }),
      prisma.walletTransaction.aggregate({ where: { referenceType: 'COMMISSION', type: 'DEBIT' }, _sum: { amount: true } }),
      prisma.settlement.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      prisma.order.aggregate({ where: { paymentMethod: 'COD' }, _sum: { totalAmount: true }, _count: true }),
      prisma.deliveryPartner.count({ where: { isVerified: true } }),
      prisma.orderSLA.count({ where: { status: 'BREACHED' } }),
      prisma.order.count({ where: { status: 'EXPIRED' } }),
    ]);

    // Convert raw query results
    const revenueData = (revenueByDay || []).map(d => ({
      date: d.date,
      orders: toNumber(d.orders),
      revenue: toNumber(d.revenue),
    }));

    const totalRevenue = (orderStats || []).reduce((sum, s) => sum + toNumber(s._sum?.totalAmount), 0);
    const totalOrders = (orderStats || []).reduce((sum, s) => sum + toNumber(s._count), 0);
    const totalDeliveries = (deliveryStats || []).reduce((sum, s) => sum + toNumber(s._count), 0);
    const totalReturns = (returnStats || []).reduce((sum, s) => sum + toNumber(s._count), 0);

    // Convert for JSON
    const safeOrderStats = orderStats.map(s => ({
      status: s.status,
      _count: toNumber(s._count),
      _sum: { totalAmount: toNumber(s._sum?.totalAmount) }
    }));

    const safeSupplierVerification = supplierVerification.map(s => ({
      isVerified: s.isVerified,
      _count: toNumber(s._count)
    }));

    const safeProductApprovals = productApprovals.map(p => ({
      isApproved: p.isApproved,
      _count: toNumber(p._count)
    }));

    const safeDeliveryStats = deliveryStats.map(d => ({
      status: d.status,
      _count: toNumber(d._count)
    }));

    const safeReturnStats = returnStats.map(r => ({
      status: r.status,
      _count: toNumber(r._count)
    }));

    const safeUserGrowth = userGrowth.map(u => ({
      createdAt: u.createdAt,
      _count: toNumber(u._count)
    }));

    const totalCommission = toNumber(commissionStats._sum?.amount || 0);
    const pendingSettlementAmount = toNumber(pendingSettlements._sum?.amount || 0);

    return {
      kpis: {
        totalUsers: toNumber(userStats._count),
        totalSuppliers: toNumber(supplierStats._count),
        totalProducts: toNumber(productStats._count),
        totalOrders,
        totalRevenue,
        totalDeliveries,
        totalReturns,
        totalCommission,
        pendingSettlements: pendingSettlementAmount,
        pendingSettlementCount: toNumber(pendingSettlements._count || 0),
        codOrders: toNumber(codOrders._count || 0),
        codAmount: toNumber(codOrders._sum?.totalAmount || 0),
        activePartners: activePartners,
        slaBreaches,
        expiredOrders,
      },
      supplierVerification: safeSupplierVerification,
      orderStats: safeOrderStats,
      revenueByDay: revenueData,
      productApprovals: safeProductApprovals,
      deliveryStats: safeDeliveryStats,
      returnStats: safeReturnStats,
      userGrowth: safeUserGrowth
    };
  }

  /**
   * Track analytics event
   */
  static async trackEvent({ eventName, eventCategory, userId, supplierId, productId, orderId, data }) {
    return prisma.analyticsEvent.create({
      data: {
        eventName,
        eventCategory,
        userId,
        supplierId,
        productId,
        orderId,
        data
      }
    });
  }

  /**
   * Get events by category
   */
  static async getEvents({ eventCategory, startDate, endDate, limit = 100 } = {}) {
    const where = {};
    if (eventCategory) where.eventCategory = eventCategory;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    return prisma.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get event summary
   */
  static async getEventSummary(eventCategory, startDate, endDate) {
    const where = { eventCategory };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const summary = await prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      where,
      _count: true
    });

    return summary.map(s => ({
      eventName: s.eventName,
      _count: toNumber(s._count)
    }));
  }

  /**
   * Update dashboard metrics
   */
  static async updateDashboardMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyRevenue, monthlyRevenue, dailyOrders, monthlyOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: thisMonth } },
        _sum: { totalAmount: true }
      }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { createdAt: { gte: thisMonth } } })
    ]);

    // Upsert metrics
    const metrics = [
      {
        metricName: 'DAILY_REVENUE',
        metricValue: toNumber(dailyRevenue._sum.totalAmount),
        metricType: 'REVENUE',
        period: 'DAILY',
        periodStart: today,
        periodEnd: now
      },
      {
        metricName: 'MONTHLY_REVENUE',
        metricValue: toNumber(monthlyRevenue._sum.totalAmount),
        metricType: 'REVENUE',
        period: 'MONTHLY',
        periodStart: thisMonth,
        periodEnd: now
      },
      {
        metricName: 'DAILY_ORDERS',
        metricValue: dailyOrders,
        metricType: 'ORDER_COUNT',
        period: 'DAILY',
        periodStart: today,
        periodEnd: now
      },
      {
        metricName: 'MONTHLY_ORDERS',
        metricValue: monthlyOrders,
        metricType: 'ORDER_COUNT',
        period: 'MONTHLY',
        periodStart: thisMonth,
        periodEnd: now
      }
    ];

    for (const metric of metrics) {
      await prisma.dashboardMetric.upsert({
        where: { metricName: metric.metricName },
        create: metric,
        update: { metricValue: metric.metricValue, periodEnd: now }
      });
    }

    return metrics;
  }

  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics(period = 'DAILY') {
    return prisma.dashboardMetric.findMany({
      where: { period },
      orderBy: { metricName: 'asc' }
    });
  }
}