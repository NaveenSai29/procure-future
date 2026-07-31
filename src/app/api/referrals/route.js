import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

const DEFAULT_REFERRAL_REWARD = 100;

async function getReferralReward() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { category_key: { category: 'REFERRAL', key: 'reward_amount' } },
    });
    if (setting) {
      const val = parseInt(setting.value);
      return isNaN(val) ? DEFAULT_REFERRAL_REWARD : val;
    }
    // Auto-create default setting
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

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, referralCode: true, name: true },
    });
    if (!user) return errorResponse("User not found", 404);

    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = `${user.name?.substring(0, 3)?.toUpperCase() || 'USR'}${user.id.substring(0, 6).toUpperCase()}`;
      await prisma.user.update({ where: { id: user.id }, data: { referralCode } });
    }

    const rewardAmount = await getReferralReward();

    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
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

    const wallet = await prisma.buyerWallet.findUnique({
      where: { userId: user.id },
      include: {
        transactions: {
          where: { referenceType: "REFERRAL_BONUS" },
          select: { amount: true },
        },
      },
    });

    const totalEarned = wallet?.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    const formattedReferrals = referrals.map(r => ({
      id: r.id,
      name: r.referred?.name || 'User',
      joinedAt: r.referred?.createdAt || r.createdAt,
      status: r.status,
      reward: r.rewardAmount || 0,
      purchases: r.referred?.orders?.length || 0,
      totalPurchaseValue: r.referred?.orders?.reduce((sum, o) => sum + o.totalAmount, 0) || 0,
    }));

    return successResponse({
      referralCode,
      rewardAmount,
      totalEarned,
      totalReferrals: referrals.length,
      referrals: formattedReferrals,
    });
  } catch (error) {
    console.error("User referrals error:", error);
    return errorResponse("Failed to fetch referrals", 500);
  }
}