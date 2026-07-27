import prisma from '@/lib/prisma';

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
    }

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
      // Revenue by day (last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as orders,
          SUM(totalAmount) as revenue
        FROM \`Order\`
        WHERE productId IN (SELECT id FROM Product WHERE supplierId = ${supplierId})
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,
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

    // Calculate KPIs
    const totalOrders = orderStats.reduce((sum, s) => sum + s._count, 0);
    const totalRevenue = orderStats.reduce((sum, s) => sum + (s._sum.totalAmount || 0), 0);
    const completedOrders = orderStats.find(s => s.status === 'DELIVERED')?._count || 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      kpis: {
        totalOrders,
        totalRevenue,
        completedOrders,
        completionRate: `${completionRate}%`,
        avgOrderValue,
        totalProducts: productStats._count,
        rfqResponses: rfqStats
      },
      orderStats,
      revenueByDay,
      topProducts,
      inventoryStatus: {
        lowStock: inventoryStatus.filter(i => i.availableQty <= i.minStockLevel),
        outOfStock: inventoryStatus.filter(i => i.availableQty === 0),
        all: inventoryStatus
      },
      customerStats
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
      returnStats
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
      prisma.returnRequest.groupBy({ by: ['status'], _count: true })
    ]);

    const totalRevenue = (orderStats || []).reduce((sum, s) => sum + (s._sum?.totalAmount || 0), 0);
    const totalOrders = (orderStats || []).reduce((sum, s) => sum + (s._count || 0), 0);
    const totalDeliveries = (deliveryStats || []).reduce((sum, s) => sum + (s._count || 0), 0);
    const totalReturns = (returnStats || []).reduce((sum, s) => sum + (s._count || 0), 0);

    return {
      kpis: {
        totalUsers: userStats._count,
        totalSuppliers: supplierStats._count,
        totalProducts: productStats._count,
        totalOrders,
        totalRevenue,
        totalDeliveries,
        totalReturns
      },
      supplierVerification,
      orderStats,
      revenueByDay,
      productApprovals,
      deliveryStats,
      returnStats
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

    return summary;
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
        metricValue: dailyRevenue._sum.totalAmount || 0,
        metricType: 'REVENUE',
        period: 'DAILY',
        periodStart: today,
        periodEnd: now
      },
      {
        metricName: 'MONTHLY_REVENUE',
        metricValue: monthlyRevenue._sum.totalAmount || 0,
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