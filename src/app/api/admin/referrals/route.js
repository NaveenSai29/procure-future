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

// Helper to get threshold from settings
async function getPurchaseThreshold() {
  try {
    const setting = await prisma.systemSetting.findFirst({
      where: { category: 'REFERRAL', key: 'purchase_threshold' },
    });
    return setting ? parseFloat(setting.value) : 5000;
  } catch {
    return 5000;
  }
}

// GET - List all referrals with purchase stats
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = {};
    if (status === "REGISTERED") where.status = "REGISTERED";
    if (status === "PURCHASED") where.status = "PURCHASED";
    if (status === "PAID") where.status = "PAID";
    if (status === "PENDING") where.status = "PENDING";

    const [referrals, total, purchaseThreshold] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          referrer: {
            select: {
              id: true, name: true, email: true, mobile: true,
              referralCode: true, createdAt: true,
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
              buyerWallet: {
                select: { balance: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.referral.count({ where }),
      getPurchaseThreshold(),
    ]);

    // Enrich with purchase stats
    const enriched = referrals.map(r => {
      const deliveredOrders = r.referred?.orders?.filter(o => o.status === 'DELIVERED') || [];
      const totalDelivered = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const orderCount = r.referred?.orders?.length || 0;
      const deliveredCount = deliveredOrders.length;

      return {
        id: r.id,
        status: r.status,
        rewardAmount: r.rewardAmount,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
        referrer: r.referrer,
        referred: {
          id: r.referred?.id,
          name: r.referred?.name,
          email: r.referred?.email,
          mobile: r.referred?.mobile,
          joinedAt: r.referred?.createdAt,
          walletBalance: r.referred?.buyerWallet?.balance || 0,
        },
        stats: {
          totalOrders: orderCount,
          deliveredOrders: deliveredCount,
          totalPurchaseValue: totalDelivered,
          meetsCriteria: totalDelivered >= purchaseThreshold,
        },
      };
    });

    // Overall stats
    const [totalReferrals, registeredCount, purchasedCount, paidCount, totalRewards] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { status: "REGISTERED" } }),
      prisma.referral.count({ where: { status: "PURCHASED" } }),
      prisma.referral.count({ where: { status: "PAID" } }),
      prisma.referral.aggregate({ _sum: { rewardAmount: true } }),
    ]);

    return successResponse({
      referrals: enriched,
      stats: {
        totalReferrals,
        registered: registeredCount,
        purchased: purchasedCount,
        paid: paidCount,
        totalRewardsGiven: totalRewards._sum?.rewardAmount || 0,
        pendingPayouts: registeredCount + purchasedCount,
      },
      purchaseThreshold,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin referrals error:", error);
    return errorResponse("Failed to fetch referrals", 500);
  }
}

// PATCH - Update referral status/reward (mark as paid)
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { referralId, status, rewardAmount } = await request.json();

    if (!referralId) return errorResponse("referralId required", 400);

    const data = {};
    if (status) data.status = status;
    if (rewardAmount !== undefined) data.rewardAmount = parseFloat(rewardAmount);
    if (status === 'PAID') data.processedAt = new Date();

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data,
    });

    // If marking as paid with reward, add to referrer's wallet
    if (status === 'PAID' && rewardAmount > 0) {
      let wallet = await prisma.buyerWallet.findUnique({
        where: { userId: referral.referrerId },
      });
      if (!wallet) {
        wallet = await prisma.buyerWallet.create({
          data: { userId: referral.referrerId },
        });
      }

      await prisma.buyerWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CREDIT",
          amount: rewardAmount,
          referenceType: "REFERRAL_BONUS",
          referenceId: referralId,
          description: `Referral reward for inviting ${referral.referredId}`,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance + rewardAmount,
        },
      });

      await prisma.buyerWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: rewardAmount } },
      });

      // Notify referrer
      const { NotificationService } = await import('@/services/notification.service');
      NotificationService.send({
        userId: referral.referrerId,
        type: 'IN_APP',
        title: '🎉 Referral Reward!',
        message: `You earned ₹${rewardAmount.toLocaleString('en-IN')} for your referral! Added to your wallet.`,
      }).catch(() => {});
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

    return successResponse({ referral, message: "Referral updated" });
  } catch (error) {
    console.error("Update referral error:", error);
    return errorResponse("Failed to update referral", 500);
  }
}