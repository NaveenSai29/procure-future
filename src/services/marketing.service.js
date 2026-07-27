import prisma from '@/lib/prisma';

export class MarketingService {
  // ============================================
  // COUPONS
  // ============================================
  
  static async getCoupons(supplierId, { page = 1, limit = 20, status = null } = {}) {
    const where = { supplierId };
    if (status) where.status = status;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          _count: { select: { orders: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.coupon.count({ where })
    ]);

    return { coupons, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async createCoupon(supplierId, data) {
    const code = data.code?.toUpperCase() || 'CPN' + Date.now().toString(36).toUpperCase();
    const existing = await prisma.coupon.findFirst({ where: { code, supplierId } });
    if (existing) throw new Error('Coupon code already exists');

    return prisma.coupon.create({
      data: {
        ...data,
        code,
        supplierId,
        status: 'ACTIVE'
      }
    });
  }

  static async updateCoupon(couponId, data) {
    return prisma.coupon.update({ where: { id: couponId }, data });
  }

  static async deleteCoupon(couponId) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { status: 'DELETED', deletedAt: new Date() }
    });
  }

  // ============================================
  // OFFERS / DISCOUNTS
  // ============================================
  
  static async getOffers(supplierId, { page = 1, limit = 20, type = null } = {}) {
    const where = { supplierId };
    if (type) where.type = type;

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: {
          products: { include: { product: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.offer.count({ where })
    ]);

    return { offers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async createOffer(supplierId, data) {
    return prisma.offer.create({
      data: {
        ...data,
        supplierId,
        status: data.status || 'ACTIVE'
      }
    });
  }

  static async updateOffer(offerId, data) {
    return prisma.offer.update({ where: { id: offerId }, data });
  }

  static async deleteOffer(offerId) {
    return prisma.offer.update({
      where: { id: offerId },
      data: { status: 'EXPIRED', deletedAt: new Date() }
    });
  }

  // ============================================
  // CAMPAIGNS
  // ============================================
  
  static async getCampaigns(supplierId, { page = 1, limit = 20, type = null } = {}) {
    const where = { supplierId };
    if (type) where.type = type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.campaign.count({ where })
    ]);

    return { campaigns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async createCampaign(supplierId, data) {
    return prisma.campaign.create({
      data: { ...data, supplierId }
    });
  }

  static async updateCampaign(campaignId, data) {
    return prisma.campaign.update({ where: { id: campaignId }, data });
  }

  // ============================================
  // REFERRALS
  // ============================================
  
  static async getReferrals(supplierId, { page = 1, limit = 20 } = {}) {
    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where: { supplierId },
        include: {
          referrer: { select: { name: true, email: true } },
          referred: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.referral.count({ where: { supplierId } })
    ]);

    return { referrals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async createReferral(supplierId, { referrerId, referredId, rewardAmount }) {
    return prisma.referral.create({
      data: {
        supplierId,
        referrerId,
        referredId,
        rewardAmount: rewardAmount || 0,
        status: 'PENDING'
      }
    });
  }

  static async processReferral(referralId, status) {
    return prisma.referral.update({
      where: { id: referralId },
      data: { status, processedAt: status === 'PAID' ? new Date() : null }
    });
  }

  // ============================================
  // LOYALTY POINTS
  // ============================================
  
  static async getLoyaltyPoints(supplierId, { page = 1, limit = 50 } = {}) {
    const [points, total] = await Promise.all([
      prisma.loyaltyPoint.findMany({
        where: { supplierId },
        include: {
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.loyaltyPoint.count({ where: { supplierId } })
    ]);

    return { points, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async addLoyaltyPoints(supplierId, userId, points, reason) {
    return prisma.loyaltyPoint.create({
      data: { supplierId, userId, points, reason }
    });
  }

  // ============================================
  // CAMPAIGN ANALYTICS
  // ============================================
  
  static async getMarketingAnalytics(supplierId) {
    const [coupons, offers, campaigns, referrals] = await Promise.all([
      prisma.coupon.aggregate({
        where: { supplierId },
        _count: true
      }),
      prisma.coupon.count({ where: { supplierId, status: 'ACTIVE' } }),
      prisma.offer.count({ where: { supplierId } }),
      prisma.offer.count({ where: { supplierId, status: 'ACTIVE' } }),
      prisma.campaign.count({ where: { supplierId } }),
      prisma.campaign.count({ where: { supplierId, status: 'ACTIVE' } }),
      prisma.referral.count({ where: { supplierId } })
    ]);

    return {
      totalCoupons: coupons._count,
      activeCoupons: coupons.activeCount || 0,
      totalOffers: offers.totalCount || 0,
      activeOffers: offers.activeCount || 0,
      totalCampaigns: campaigns.totalCount || 0,
      activeCampaigns: campaigns.activeCount || 0,
      totalReferrals: referrals.totalCount || 0
    };
  }
}