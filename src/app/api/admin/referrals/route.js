import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function checkAdmin(session) {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  const userRoles = user.roles.map(r => r.role.name);
  return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
}

async function getPurchaseThreshold() {
  try {
    const setting = await prisma.systemSetting.findFirst({
      where: { category: 'REFERRAL', key: 'purchase_threshold' },
    });
    return setting ? parseFloat(setting.value) : 5000;
  } catch { return 5000; }
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
      ordersThreshold: thresholdSetting ? parseInt(thresholdSetting.value) : 50,
      rewardAmount: rewardSetting ? parseFloat(rewardSetting.value) : 500,
      rewardType: rewardTypeSetting ? rewardTypeSetting.value : 'ONE_TIME',
    };
  } catch {
    return { enabled: true, ordersThreshold: 50, rewardAmount: 500, rewardType: 'ONE_TIME' };
  }
}

// GET - List all referrals with stats
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const type = searchParams.get("type") || "ALL"; // BUYER, DELIVERY, ALL
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = {};
    if (status !== "ALL") where.status = status;
    if (type !== "ALL") where.referralType = type;

    const [referrals, total, purchaseThreshold, deliverySettings] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          referrer: {
            select: {
              id: true, name: true, email: true, mobile: true,
              referralCode: true, createdAt: true,
              deliveryPartner: { select: { id: true, isVerified: true } },
            },
          },
          referred: {
            select: {
              id: true, name: true, email: true, mobile: true,
              createdAt: true,
              orders: {
                where: { status: { in: ["DELIVERED", "CONFIRMED", "SHIPPED"] } },
                select: { id: true, totalAmount: true, status: true, createdAt: true },
              },
              buyerWallet: { select: { balance: true } },
              deliveryPartner: { select: { totalDeliveries: true, isVerified: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.referral.count({ where }),
      getPurchaseThreshold(),
      getDeliveryReferralSettings(),
    ]);

    const enriched = referrals.map(r => {
      const isDelivery = r.referralType === 'DELIVERY';
      const deliveredOrders = r.referred?.orders?.filter(o => o.status === 'DELIVERED') || [];
      const totalDelivered = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      
      return {
        id: r.id,
        type: r.referralType,
        status: r.status,
        rewardAmount: r.rewardAmount,
        deliveryOrderCount: r.deliveryOrderCount,
        rewardCycles: r.rewardCycles,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
        referrer: {
          ...r.referrer,
          isDeliveryPartner: !!r.referrer?.deliveryPartner,
        },
        referred: {
          id: r.referred?.id,
          name: r.referred?.name,
          email: r.referred?.email,
          mobile: r.referred?.mobile,
          joinedAt: r.referred?.createdAt,
          walletBalance: r.referred?.buyerWallet?.balance || 0,
          totalDeliveries: r.referred?.deliveryPartner?.totalDeliveries || 0,
          isVerifiedPartner: r.referred?.deliveryPartner?.isVerified || false,
        },
        stats: isDelivery ? {
          deliveriesCompleted: r.deliveryOrderCount || 0,
          totalDeliveries: r.referred?.deliveryPartner?.totalDeliveries || 0,
          requiredForReward: deliverySettings.ordersThreshold,
          progressPercent: Math.min(100, Math.round(((r.deliveryOrderCount || 0) / deliverySettings.ordersThreshold) * 100)),
        } : {
          totalOrders: r.referred?.orders?.length || 0,
          deliveredOrders: deliveredOrders.length,
          totalPurchaseValue: totalDelivered,
          meetsCriteria: totalDelivered >= purchaseThreshold,
        },
      };
    });

    // Overall stats
    const [totalReferrals, buyerCount, deliveryCount, registeredCount, purchasedCount, paidCount, totalRewards] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { referralType: 'BUYER' } }),
      prisma.referral.count({ where: { referralType: 'DELIVERY' } }),
      prisma.referral.count({ where: { status: "REGISTERED" } }),
      prisma.referral.count({ where: { status: "PURCHASED" } }),
      prisma.referral.count({ where: { status: "PAID" } }),
      prisma.referral.aggregate({ _sum: { rewardAmount: true } }),
    ]);

    return successResponse({
      referrals: enriched,
      stats: {
        totalReferrals,
        buyerReferrals: buyerCount,
        deliveryReferrals: deliveryCount,
        registered: registeredCount,
        purchased: purchasedCount,
        paid: paidCount,
        totalRewardsGiven: totalRewards._sum?.rewardAmount || 0,
        pendingPayouts: registeredCount + purchasedCount,
      },
      settings: {
        buyer: { purchaseThreshold, rewardAmount: 100 },
        delivery: deliverySettings,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin referrals error:", error);
    return errorResponse("Failed to fetch referrals", 500);
  }
}

// PATCH - Update referral status/reward
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { referralId, status, rewardAmount } = await request.json();
    if (!referralId) return errorResponse("referralId required", 400);

    const referral = await prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) return errorResponse("Referral not found", 404);

    const data = {};
    if (status) data.status = status;
    if (rewardAmount !== undefined) data.rewardAmount = parseFloat(rewardAmount);
    if (status === 'PAID') data.processedAt = new Date();

    const updated = await prisma.referral.update({
      where: { id: referralId },
      data,
    });

    // If marking as paid with reward, credit the referrer
    if (status === 'PAID' && rewardAmount > 0) {
      if (referral.referralType === 'DELIVERY') {
        // Credit to PartnerWallet
        const referrerUser = await prisma.user.findUnique({
          where: { id: referral.referrerId },
          select: { deliveryPartner: { select: { id: true } } },
        });
        
        if (referrerUser?.deliveryPartner) {
          await prisma.partnerWallet.upsert({
            where: { partnerId: referrerUser.deliveryPartner.id },
            create: { partnerId: referrerUser.deliveryPartner.id, totalEarned: rewardAmount },
            update: { totalEarned: { increment: rewardAmount } },
          });
        } else {
          // Fallback to buyer wallet
          let wallet = await prisma.buyerWallet.findUnique({ where: { userId: referral.referrerId } });
          if (!wallet) wallet = await prisma.buyerWallet.create({ data: { userId: referral.referrerId } });
          await prisma.buyerWalletTransaction.create({
            data: {
              walletId: wallet.id, type: "CREDIT", amount: rewardAmount,
              referenceType: "REFERRAL_BONUS", referenceId: referralId,
              description: `Delivery referral reward`,
              balanceBefore: wallet.balance, balanceAfter: wallet.balance + rewardAmount,
            },
          });
          await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: { increment: rewardAmount } } });
        }
      } else {
        // Credit to BuyerWallet
        let wallet = await prisma.buyerWallet.findUnique({ where: { userId: referral.referrerId } });
        if (!wallet) wallet = await prisma.buyerWallet.create({ data: { userId: referral.referrerId } });
        await prisma.buyerWalletTransaction.create({
          data: {
            walletId: wallet.id, type: "CREDIT", amount: rewardAmount,
            referenceType: "REFERRAL_BONUS", referenceId: referralId,
            description: `Referral reward for inviting ${referral.referredId}`,
            balanceBefore: wallet.balance, balanceAfter: wallet.balance + rewardAmount,
          },
        });
        await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: { increment: rewardAmount } } });
      }

      // Notify referrer
      try {
        const { NotificationService } = await import('@/services/notification.service');
        NotificationService.send({
          userId: referral.referrerId,
          type: 'IN_APP',
          title: '🎉 Referral Reward!',
          message: `You earned ₹${rewardAmount.toLocaleString('en-IN')} for your referral! Added to your wallet.`,
        }).catch(() => {});
      } catch {}
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'REFERRAL_UPDATED',
        entity: 'Referral',
        entityId: referralId,
        newValue: data,
      },
    });

    return successResponse({ referral: updated, message: "Referral updated" });
  } catch (error) {
    console.error("Update referral error:", error);
    return errorResponse("Failed to update referral", 500);
  }
}