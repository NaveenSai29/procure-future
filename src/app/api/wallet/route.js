import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/features";

// GET - Get buyer wallet with transactions
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    // Check if wallet feature is enabled
    const walletEnabled = await isFeatureEnabled('wallet');
    if (!walletEnabled) {
      return errorResponse("Wallet feature is currently disabled", 403);
    }

    let wallet = await prisma.buyerWallet.findUnique({
      where: { userId: session.userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.buyerWallet.create({
        data: { userId: session.userId },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
    }

    // Process expired transactions
    const now = new Date();
    const expiredTransactions = wallet.transactions.filter(
      t => t.type === "CREDIT" && t.expiresAt && new Date(t.expiresAt) < now
    );

    for (const t of expiredTransactions) {
      const alreadyExpired = await prisma.buyerWalletTransaction.findFirst({
        where: { referenceId: t.id, type: "EXPIRED" },
      });
      
      if (!alreadyExpired) {
        const expiredAmount = t.amount;
        await prisma.buyerWalletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "EXPIRED",
            amount: expiredAmount,
            referenceType: "EXPIRED",
            referenceId: t.id,
            description: `Expired credit from ${new Date(t.createdAt).toLocaleDateString('en-IN')}`,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance - expiredAmount,
          },
        });

        await prisma.buyerWallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: expiredAmount } },
        });

        wallet.balance -= expiredAmount;
      }
    }

    wallet = await prisma.buyerWallet.findUnique({
      where: { userId: session.userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    return successResponse({
      balance: wallet.balance,
      transactions: wallet.transactions,
      createdAt: wallet.createdAt,
    });
  } catch (error) {
    console.error("Wallet error:", error);
    return errorResponse("Failed to fetch wallet", 500);
  }
}

// POST - Use wallet for payment
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    // Check if wallet feature is enabled
    const walletEnabled = await isFeatureEnabled('wallet');
    if (!walletEnabled) {
      return errorResponse("Wallet feature is currently disabled", 403);
    }

    const { amount, referenceType, referenceId, description } = await request.json();

    if (!amount || amount <= 0) {
      return errorResponse("Valid amount required", 400);
    }

    let wallet = await prisma.buyerWallet.findUnique({
      where: { userId: session.userId },
    });

    if (!wallet) {
      wallet = await prisma.buyerWallet.create({
        data: { userId: session.userId },
      });
    }

    if (wallet.balance < amount) {
      return errorResponse(`Insufficient balance. Available: ₹${wallet.balance.toLocaleString('en-IN')}`, 400);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    const transaction = await prisma.buyerWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount,
        referenceType: referenceType || "ORDER_PAYMENT",
        referenceId: referenceId || null,
        description: description || "Wallet payment",
        balanceBefore,
        balanceAfter,
      },
    });

    await prisma.buyerWallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    return successResponse({
      balance: balanceAfter,
      transaction,
      message: `₹${amount.toLocaleString('en-IN')} debited from wallet`,
    });
  } catch (error) {
    console.error("Wallet payment error:", error);
    return errorResponse("Payment failed", 500);
  }
}