import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

const DEFAULT_REFERRAL_REWARD = 100;
const DEFAULT_DELIVERY_REFERRAL_ORDERS = 50;
const DEFAULT_DELIVERY_REFERRAL_REWARD = 500;

async function getReferralReward() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { category_key: { category: 'REFERRAL', key: 'reward_amount' } },
    });
    if (setting) {
      const val = parseInt(setting.value);
      return isNaN(val) ? DEFAULT_REFERRAL_REWARD : val;
    }
    await prisma.systemSetting.create({
      data: {
        category: 'REFERRAL',
        key: 'reward_amount',
        value: String(DEFAULT_REFERRAL_REWARD),
        description: 'Amount rewarded per successful referral (in INR)',
      },
    });
    return DEFAULT_REFERRAL_REWARD;
  } catch {
    return DEFAULT_REFERRAL_REWARD;
  }
}

async function getDeliveryReferralSettings() {
  try {
    const [thresholdSetting, rewardSetting, enabledSetting, rewardTypeSetting] = await Promise.all([
      prisma.systemSetting.findFirst({ where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_orders_threshold' } }),
      prisma.systemSetting.findFirst({ where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_reward_amount' } }),
      prisma.systemSetting.findFirst({ where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_enabled' } }),
      prisma.systemSetting.findFirst({ where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_reward_type' } }),
    ]);
    return {
      enabled: enabledSetting ? enabledSetting.value === 'true' : true,
      ordersThreshold: thresholdSetting ? parseInt(thresholdSetting.value) : DEFAULT_DELIVERY_REFERRAL_ORDERS,
      rewardAmount: rewardSetting ? parseFloat(rewardSetting.value) : DEFAULT_DELIVERY_REFERRAL_REWARD,
      rewardType: rewardTypeSetting ? rewardTypeSetting.value : 'ONE_TIME',
    };
  } catch {
    return {
      enabled: true,
      ordersThreshold: DEFAULT_DELIVERY_REFERRAL_ORDERS,
      rewardAmount: DEFAULT_DELIVERY_REFERRAL_REWARD,
      rewardType: 'ONE_TIME',
    };
  }
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, referralCode: true, name: true, roles: { include: { role: true } } },
    });
    if (!user) return errorResponse("User not found", 404);

    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = `${user.name?.substring(0, 3)?.toUpperCase() || 'USR'}${user.id.substring(0, 6).toUpperCase()}`;
      await prisma.user.update({ where: { id: user.id }, data: { referralCode } });
    }

    const rewardAmount = await getReferralReward();
    const deliverySettings = await getDeliveryReferralSettings();
    const userRoles = user.roles.map(r => r.role.name);
    const isDeliveryPartner = userRoles.includes('DELIVERY_PARTNER');

    // Get buyer referrals
    const buyerReferrals = await prisma.referral.findMany({
      where: { referrerId: user.id, referralType: 'BUYER' },
      include: {
        referred: {
          select: {
            id: true, name: true, createdAt: true,
            orders: {
              where: { status: { in: ["DELIVERED", "CONFIRMED"] } },
              select: { id: true, totalAmount: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get delivery referrals
    const deliveryReferrals = await prisma.referral.findMany({
      where: { referrerId: user.id, referralType: 'DELIVERY' },
      include: {
        referred: {
          select: {
            id: true, name: true, mobile: true, createdAt: true,
            deliveryPartner: {
              select: { totalDeliveries: true, isVerified: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate buyer referral earnings
    const buyerWallet = await prisma.buyerWallet.findUnique({
      where: { userId: user.id },
      include: {
        transactions: {
          where: { referenceType: "REFERRAL_BONUS" },
          select: { amount: true },
        },
      },
    });

    // Calculate delivery referral earnings (from PartnerWallet if they're a partner)
    let partnerReferralEarnings = 0;
    if (isDeliveryPartner) {
      const partner = await prisma.deliveryPartner.findUnique({
        where: { userId: user.id },
        select: {
          wallet: { select: { totalEarned: true } },
        },
      });
      // We track total earned from referrals separately via the referral records
      const deliveryPaidReferrals = deliveryReferrals.filter(r => r.status === 'PAID');
      partnerReferralEarnings = deliveryPaidReferrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
    }

    const totalBuyerEarned = buyerWallet?.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalEarned = totalBuyerEarned + partnerReferralEarnings;

    const formattedBuyerReferrals = buyerReferrals.map(r => ({
      id: r.id,
      type: 'BUYER',
      name: r.referred?.name || 'User',
      joinedAt: r.referred?.createdAt || r.createdAt,
      status: r.status,
      reward: r.rewardAmount || 0,
      purchases: r.referred?.orders?.length || 0,
      totalPurchaseValue: r.referred?.orders?.reduce((sum, o) => sum + o.totalAmount, 0) || 0,
    }));

    const formattedDeliveryReferrals = deliveryReferrals.map(r => ({
      id: r.id,
      type: 'DELIVERY',
      name: r.referred?.name || 'Partner',
      mobile: r.referred?.mobile,
      joinedAt: r.referred?.createdAt || r.createdAt,
      status: r.status,
      reward: r.rewardAmount || 0,
      deliveryCount: r.deliveryOrderCount || 0,
      rewardCycles: r.rewardCycles || 0,
      totalDeliveries: r.referred?.deliveryPartner?.totalDeliveries || 0,
      isVerified: r.referred?.deliveryPartner?.isVerified || false,
      progressPercent: Math.min(100, Math.round(((r.deliveryOrderCount || 0) / deliverySettings.ordersThreshold) * 100)),
      nextRewardAt: ((r.rewardCycles || 0) + 1) * deliverySettings.ordersThreshold,
    }));

    return successResponse({
      referralCode,
      rewardAmount,
      totalEarned,
      totalReferrals: buyerReferrals.length + deliveryReferrals.length,
      buyerReferrals: formattedBuyerReferrals,
      deliveryReferrals: formattedDeliveryReferrals,
      deliverySettings: isDeliveryPartner ? deliverySettings : null,
    });
  } catch (error) {
    console.error("User referrals error:", error);
    return errorResponse("Failed to fetch referrals", 500);
  }
}