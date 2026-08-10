import prisma from '@/lib/prisma';

export class ReferralService {
  /**
   * Auto-reward referrer when referred user's purchases cross threshold
   * Called after order is delivered or payment verified
   */
  static async processReferralReward(buyerId) {
    try {
      // Find referral where this user was referred
      const referral = await prisma.referral.findFirst({
        where: {
          referredId: buyerId,
          status: { in: ['REGISTERED', 'PURCHASED', 'PENDING'] }, // Not already PAID
        },
        include: {
          referrer: { select: { id: true, name: true } },
          referred: {
            select: {
              id: true,
              orders: {
                where: { status: 'DELIVERED' },
                select: { totalAmount: true },
              },
            },
          },
        },
      });

      // No referral found for this user
      if (!referral) return null;

      // Get threshold from settings
      const thresholdSetting = await prisma.systemSetting.findFirst({
        where: { category: 'REFERRAL', key: 'purchase_threshold' },
      });
      const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 5000;

      // Calculate total delivered purchases
      const totalPurchases = referral.referred.orders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Check if threshold met
      if (totalPurchases < threshold) {
        // Update status to PURCHASED if not already
        if (referral.status === 'REGISTERED') {
          await prisma.referral.update({
            where: { id: referral.id },
            data: { status: 'PURCHASED' },
          });
        }
        return { rewarded: false, reason: `Total purchases ₹${totalPurchases} below threshold ₹${threshold}` };
      }

      // Get reward amount from settings
      const rewardSetting = await prisma.systemSetting.findFirst({
        where: { category: 'REFERRAL', key: 'reward_amount' },
      });
      const rewardAmount = rewardSetting ? parseFloat(rewardSetting.value) : 100;

      // Credit reward to referrer's wallet
      let wallet = await prisma.buyerWallet.findUnique({
        where: { userId: referral.referrerId },
      });
      if (!wallet) {
        wallet = await prisma.buyerWallet.create({
          data: { userId: referral.referrerId },
        });
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + rewardAmount;

      await prisma.$transaction([
        // Create wallet transaction
        prisma.buyerWalletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: rewardAmount,
            referenceType: 'REFERRAL_BONUS',
            referenceId: referral.id,
            description: `Referral reward for inviting ${referral.referredId}`,
            balanceBefore,
            balanceAfter,
          },
        }),
        // Update wallet balance
        prisma.buyerWallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        }),
        // Mark referral as PAID
        prisma.referral.update({
          where: { id: referral.id },
          data: {
            status: 'PAID',
            rewardAmount,
            processedAt: new Date(),
          },
        }),
      ]);

      // Notify referrer
      try {
        const { NotificationService } = await import('@/services/notification.service');
        NotificationService.send({
          userId: referral.referrerId,
          type: 'IN_APP',
          title: '🎉 Referral Reward!',
          message: `You earned ₹${rewardAmount} for referring ${referral.referred?.name || 'a friend'}! Added to your wallet.`,
        }).catch(() => {});
      } catch {}

      console.log(`Referral reward: ₹${rewardAmount} paid to ${referral.referrer?.name} for referring ${referral.referred?.name}. Total purchases: ₹${totalPurchases}`);

      return {
        rewarded: true,
        referralId: referral.id,
        referrerId: referral.referrerId,
        amount: rewardAmount,
        totalPurchases,
        threshold,
      };
    } catch (error) {
      console.error('Referral reward processing error:', error.message);
      return null;
    }
  }
}