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
          referralType: 'BUYER',
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

  /**
   * Process delivery partner referral reward
   * Called after delivery partner completes a delivery
   * Supports ONE_TIME and RECURRING modes:
   * - ONE_TIME: Reward once when threshold reached
   * - RECURRING: Reward every time threshold is reached (50, 100, 150, 200...)
   */
  static async processDeliveryReferralReward(partnerId) {
    try {
      // Find referral where this partner was referred (DELIVERY type)
      // For RECURRING mode, also include referrals where status is PAID but more cycles available
      const referral = await prisma.referral.findFirst({
        where: {
          referredId: partnerId,
          referralType: 'DELIVERY',
          OR: [
            { status: { in: ['REGISTERED', 'PURCHASED', 'PENDING'] } },
            { status: 'PAID' }, // For RECURRING mode - check if more cycles available
          ],
        },
        include: {
          referrer: { select: { id: true, name: true, deliveryPartner: { select: { id: true } } } },
        },
      });

      // No DELIVERY referral found for this user
      if (!referral) return null;

      // Count completed deliveries by the referred partner
      const deliveryCount = await prisma.delivery.count({
        where: {
          partnerId: referral.referredId,
          status: 'DELIVERED',
        },
      });

      // Update the referral delivery order count
      await prisma.referral.update({
        where: { id: referral.id },
        data: { deliveryOrderCount: deliveryCount },
      });

      // Get delivery referral settings
      const [thresholdSetting, rewardSetting, enabledSetting, rewardTypeSetting] = await Promise.all([
        prisma.systemSetting.findFirst({
          where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_orders_threshold' },
        }),
        prisma.systemSetting.findFirst({
          where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_reward_amount' },
        }),
        prisma.systemSetting.findFirst({
          where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_enabled' },
        }),
        prisma.systemSetting.findFirst({
          where: { category: 'DELIVERY_REFERRAL', key: 'delivery_referral_reward_type' },
        }),
      ]);

      const isEnabled = enabledSetting ? enabledSetting.value === 'true' : true;
      if (!isEnabled) return { rewarded: false, reason: 'Delivery referral program is disabled' };

      const threshold = thresholdSetting ? parseInt(thresholdSetting.value) : 50;
      const rewardAmount = rewardSetting ? parseFloat(rewardSetting.value) : 500;
      const rewardType = rewardTypeSetting ? rewardTypeSetting.value : 'ONE_TIME'; // ONE_TIME or RECURRING

      // Calculate how many cycles should have been rewarded
      const expectedCycles = Math.floor(deliveryCount / threshold);
      
      // For ONE_TIME mode: only reward once
      if (rewardType === 'ONE_TIME') {
        // If already PAID, no more rewards
        if (referral.status === 'PAID') {
          return { rewarded: false, reason: 'Already rewarded (one-time mode)', currentCount: deliveryCount, threshold };
        }
        
        // Check if threshold met
        if (deliveryCount < threshold) {
          // Update status to PURCHASED if they've started delivering
          if (deliveryCount > 0 && referral.status === 'REGISTERED') {
            await prisma.referral.update({
              where: { id: referral.id },
              data: { status: 'PURCHASED' },
            });
          }
          return {
            rewarded: false,
            reason: `${deliveryCount}/${threshold} deliveries completed. Need ${threshold - deliveryCount} more.`,
            currentCount: deliveryCount,
            threshold,
          };
        }
        
        // ONE_TIME: Only reward if current cycle > rewardCycles (should be 0)
        if (referral.rewardCycles >= 1) {
          return { rewarded: false, reason: 'Already rewarded', currentCount: deliveryCount, threshold };
        }
        
        // Credit reward
        return await this._creditDeliveryReferralReward(referral, rewardAmount, deliveryCount, threshold, 1);
      }
      
      // RECURRING mode: reward every threshold milestone
      else {
        // Check if new cycle reached
        if (expectedCycles <= referral.rewardCycles) {
          // No new reward cycle reached
          if (deliveryCount > 0 && referral.status === 'REGISTERED') {
            await prisma.referral.update({
              where: { id: referral.id },
              data: { status: 'PURCHASED' },
            });
          }
          return {
            rewarded: false,
            reason: `${deliveryCount} deliveries. Next reward at ${(referral.rewardCycles + 1) * threshold} deliveries.`,
            currentCount: deliveryCount,
            threshold,
            nextRewardAt: (referral.rewardCycles + 1) * threshold,
          };
        }
        
        // Credit reward for the new cycle
        return await this._creditDeliveryReferralReward(referral, rewardAmount, deliveryCount, threshold, expectedCycles);
      }
    } catch (error) {
      console.error('Delivery referral reward processing error:', error.message);
      return null;
    }
  }

  /**
   * Credit delivery referral reward to referrer's wallet
   * @param {Object} referral - Referral record
   * @param {number} rewardAmount - Amount to credit
   * @param {number} deliveryCount - Total deliveries completed
   * @param {number} threshold - Deliveries required per cycle
   * @param {number} newCycle - The cycle number being rewarded (1 for first, 2 for second, etc.)
   */
  static async _creditDeliveryReferralReward(referral, rewardAmount, deliveryCount, threshold, newCycle) {
    const referrerPartner = referral.referrer?.deliveryPartner;
    
    if (referrerPartner) {
      // Credit to PartnerWallet (withdrawable via settlement)
      await prisma.partnerWallet.upsert({
        where: { partnerId: referrerPartner.id },
        create: {
          partnerId: referrerPartner.id,
          totalEarned: rewardAmount,
        },
        update: {
          totalEarned: { increment: rewardAmount },
        },
      });

      // Update referral: mark PAID, accumulate rewards, update cycle count
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'PAID',
          rewardAmount: { increment: rewardAmount }, // Accumulate total rewards
          rewardCycles: newCycle,
          processedAt: new Date(),
        },
      });

      // Notify referrer
      try {
        const { NotificationService } = await import('@/services/notification.service');
        NotificationService.send({
          userId: referral.referrerId,
          type: 'IN_APP',
          title: '🎉 Delivery Referral Reward!',
          message: `You earned ₹${rewardAmount} for referring a delivery partner who completed ${deliveryCount} deliveries! (Cycle ${newCycle}) Added to your earnings wallet.`,
        }).catch(() => {});
      } catch {}

      console.log(`Delivery referral reward: ₹${rewardAmount} paid to ${referral.referrer?.name} (PartnerWallet). Cycle ${newCycle}. Referred partner completed ${deliveryCount} deliveries.`);

      return {
        rewarded: true,
        referralId: referral.id,
        referrerId: referral.referrerId,
        amount: rewardAmount,
        deliveryCount,
        threshold,
        cycle: newCycle,
      };
    } else {
      // Referrer is not a delivery partner — credit to BuyerWallet instead
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
        prisma.buyerWalletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: rewardAmount,
            referenceType: 'REFERRAL_BONUS',
            referenceId: referral.id,
            description: `Delivery referral reward — referred partner completed ${deliveryCount} deliveries (Cycle ${newCycle})`,
            balanceBefore,
            balanceAfter,
          },
        }),
        prisma.buyerWallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        }),
        prisma.referral.update({
          where: { id: referral.id },
          data: {
            status: 'PAID',
            rewardAmount: { increment: rewardAmount }, // Accumulate total rewards
            rewardCycles: newCycle,
            processedAt: new Date(),
          },
        }),
      ]);

      try {
        const { NotificationService } = await import('@/services/notification.service');
        NotificationService.send({
          userId: referral.referrerId,
          type: 'IN_APP',
          title: '🎉 Delivery Referral Reward!',
          message: `You earned ₹${rewardAmount} for referring a delivery partner! (Cycle ${newCycle}) Added to your wallet.`,
        }).catch(() => {});
      } catch {}

      return {
        rewarded: true,
        referralId: referral.id,
        referrerId: referral.referrerId,
        amount: rewardAmount,
        deliveryCount,
        threshold,
        cycle: newCycle,
      };
    }
  }
}