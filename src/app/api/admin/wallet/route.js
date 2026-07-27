import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

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

// GET - List all buyer wallets with user info
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Single user wallet detail
    if (userId) {
      let wallet = await prisma.buyerWallet.findUnique({
        where: { userId },
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true, createdAt: true } },
          transactions: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });

      if (!wallet) {
        return successResponse({
          wallet: null,
          message: "No wallet found for this user",
        });
      }

      return successResponse({ wallet });
    }

    // List all wallets
    const [wallets, total] = await Promise.all([
      prisma.buyerWallet.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true } },
          transactions: { orderBy: { createdAt: "desc" }, take: 3 },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.buyerWallet.count(),
    ]);

    // Calculate total balance across all wallets
    const totalBalance = await prisma.buyerWallet.aggregate({
      _sum: { balance: true },
    });

    return successResponse({
      wallets,
      stats: {
        totalWallets: total,
        totalBalance: totalBalance._sum?.balance || 0,
        averageBalance: total > 0 ? Math.round((totalBalance._sum?.balance || 0) / total) : 0,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin wallet error:", error);
    return errorResponse("Failed to fetch wallets", 500);
  }
}

// POST - Add money to buyer wallet with optional expiry
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { userId, amount, description, expiresAt, referenceType } = await request.json();

    if (!userId || !amount || amount <= 0) {
      return errorResponse("userId and positive amount required", 400);
    }

    if (amount > 100000) {
      return errorResponse("Maximum ₹1,00,000 per transaction", 400);
    }

    // Get or create wallet
    let wallet = await prisma.buyerWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.buyerWallet.create({ data: { userId } });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    const transaction = await prisma.buyerWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount,
        referenceType: referenceType || "ADMIN_ADDED",
        description: description || "Added by admin",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        balanceBefore,
        balanceAfter,
      },
    });

    await prisma.buyerWallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    // Notify the buyer
    const expiryText = expiresAt 
      ? ` (Expires: ${new Date(expiresAt).toLocaleDateString('en-IN')})`
      : '';

    NotificationService.send({
      userId,
      type: 'IN_APP',
      title: '💰 Wallet Credited!',
      message: `₹${amount.toLocaleString('en-IN')} added to your wallet by PROCURE team.${expiryText}`,
    }).catch(() => {});

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'WALLET_CREDIT',
        entity: 'BuyerWallet',
        entityId: wallet.id,
        newValue: { userId, amount, description, expiresAt },
      },
    });

    return successResponse({
      wallet: { userId, balance: balanceAfter },
      transaction,
      message: `₹${amount.toLocaleString('en-IN')} added to user's wallet`,
    }, 201);
  } catch (error) {
    console.error("Admin wallet add error:", error);
    return errorResponse("Failed to add money", 500);
  }
}