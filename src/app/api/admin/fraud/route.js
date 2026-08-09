import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const userRoles = user.roles.map(r => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const alerts = await prisma.fraudAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Get unique userIds from alerts that reference users
    const userIds = [...new Set(alerts.map(a => a.entityId).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, mobile: true },
    }) : [];
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const alertsWithUser = alerts.map(alert => ({
      ...alert,
      relatedUser: alert.entityType === 'USER' && alert.entityId ? (userMap[alert.entityId] || null) : null,
    }));

    const stats = {
      total: await prisma.fraudAlert.count(),
      open: await prisma.fraudAlert.count({ where: { status: "OPEN" } }),
      highRisk: await prisma.fraudAlert.count({ where: { severity: "HIGH" } }),
      resolved: await prisma.fraudAlert.count({ where: { status: "RESOLVED" } }),
    };

    return successResponse({ alerts: alertsWithUser, stats });
  } catch (error) {
    console.error("Fraud GET error:", error);
    return errorResponse("Failed to fetch fraud alerts", 500);
  }
}

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const alerts = [];
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Rapid order creation (potential bot/fake orders)
    try {
      const rapidOrderUsers = await prisma.order.groupBy({
        by: ["buyerId"],
        where: { createdAt: { gte: dayAgo } },
        _count: { id: true },
        having: { id: { _count: { gt: 10 } } },
      });
      for (const u of rapidOrderUsers) {
        const buyer = await prisma.user.findUnique({ where: { id: u.buyerId }, select: { name: true, email: true } });
        alerts.push({
          entityType: "USER", entityId: u.buyerId, alertType: "RAPID_ORDERS", severity: "HIGH",
          title: `Rapid order creation by ${buyer?.name || 'User'}`,
          description: `${u._count.id} orders placed in 24 hours by ${buyer?.email || u.buyerId}`,
          evidence: { orderCount: u._count.id, period: "24h", buyerEmail: buyer?.email },
        });
      }
    } catch (e) { console.error('Scan 1 error:', e.message); }

    // 2. Excessive returns by buyer
    try {
      const returnAbusers = await prisma.returnRequest.groupBy({
        by: ["buyerId"],
        where: { createdAt: { gte: weekAgo } },
        _count: { id: true },
        having: { id: { _count: { gt: 5 } } },
      });
      for (const r of returnAbusers) {
        const buyer = await prisma.user.findUnique({ where: { id: r.buyerId }, select: { name: true, email: true } });
        alerts.push({
          entityType: "USER", entityId: r.buyerId, alertType: "EXCESSIVE_RETURNS", severity: "HIGH",
          title: `Excessive returns by ${buyer?.name || 'User'}`,
          description: `${r._count.id} return requests in 7 days by ${buyer?.email || r.buyerId}`,
          evidence: { returnCount: r._count.id, period: "7d", buyerEmail: buyer?.email },
        });
      }
    } catch (e) { console.error('Scan 2 error:', e.message); }

    // 3. High-value refund requests
    try {
      const highRefunds = await prisma.refundTransaction.findMany({
        where: { amount: { gt: 50000 }, status: "PENDING", createdAt: { gte: weekAgo } },
        take: 20,
      });
      for (const rf of highRefunds) {
        alerts.push({
          entityType: "REFUND", entityId: rf.id, alertType: "HIGH_VALUE_REFUND", severity: "MEDIUM",
          title: `High-value refund pending: ₹${rf.amount}`,
          description: `Refund of ₹${rf.amount} pending review`,
          evidence: { amount: rf.amount, refundId: rf.id },
        });
      }
    } catch (e) { console.error('Scan 3 error:', e.message); }

    // 4. Suspicious wallet activity (check supplier wallet transactions)
    try {
      const walletSpikes = await prisma.walletTransaction.groupBy({
        by: ["walletId"],
        where: { createdAt: { gte: dayAgo }, type: "CREDIT", amount: { gt: 100000 } },
        _sum: { amount: true },
        _count: { id: true },
      });
      for (const w of walletSpikes) {
        // WalletTransaction can belong to SupplierWallet or BuyerWallet
        const supplierWallet = await prisma.supplierWallet.findUnique({ 
          where: { id: w.walletId }, 
          select: { supplier: { select: { id: true, businessName: true, email: true } } } 
        });
        const buyerWallet = await prisma.buyerWallet.findUnique({ 
          where: { id: w.walletId }, 
          select: { user: { select: { id: true, name: true, email: true } } } 
        });
        
        const name = supplierWallet?.supplier?.businessName || buyerWallet?.user?.name || 'Unknown';
        const email = supplierWallet?.supplier?.email || buyerWallet?.user?.email || '';
        
        alerts.push({
          entityType: "WALLET", entityId: w.walletId, alertType: "WALLET_SPIKE", severity: "MEDIUM",
          title: `Unusual wallet credit: ₹${w._sum.amount}`,
          description: `${name} received ₹${w._sum.amount} in ${w._count.id} transactions in 24h`,
          evidence: { totalAmount: w._sum.amount, transactionCount: w._count.id, walletOwner: name, email },
        });
      }
    } catch (e) { console.error('Scan 4 error:', e.message); }

    // 5. Failed login attempts (matches our actual loginHistory action: "FAILED")
    try {
      const failedLogins = await prisma.loginHistory.groupBy({
        by: ["userId"],
        where: { action: "FAILED", createdAt: { gte: dayAgo } },
        _count: { id: true },
        having: { id: { _count: { gt: 5 } } },
      });
      for (const fl of failedLogins) {
        const usr = await prisma.user.findUnique({ where: { id: fl.userId }, select: { name: true, email: true, mobile: true } });
        alerts.push({
          entityType: "USER", entityId: fl.userId, alertType: "BRUTE_FORCE", severity: "HIGH",
          title: `Brute force attempt on ${usr?.email || usr?.mobile || fl.userId}`,
          description: `${fl._count.id} failed login attempts in 24 hours`,
          evidence: { failedAttempts: fl._count.id, userEmail: usr?.email, userMobile: usr?.mobile },
        });
      }
    } catch (e) { console.error('Scan 5 error:', e.message); }

    // 6. Duplicate products (potential listing abuse)
    try {
      const duplicateProducts = await prisma.product.groupBy({
        by: ["supplierId", "name"],
        _count: { id: true },
        having: { id: { _count: { gt: 2 } } },
        orderBy: { _count: { id: "desc" } },
        take: 20,
      });
      for (const dp of duplicateProducts) {
        const supplier = await prisma.supplier.findUnique({ where: { id: dp.supplierId }, select: { businessName: true } });
        alerts.push({
          entityType: "PRODUCT", entityId: dp.supplierId, alertType: "DUPLICATE_LISTINGS", severity: "LOW",
          title: `Duplicate product listings detected`,
          description: `"${dp.name}" listed ${dp._count.id} times by ${supplier?.businessName || dp.supplierId}`,
          evidence: { productName: dp.name, count: dp._count.id, supplierId: dp.supplierId },
        });
      }
    } catch (e) { console.error('Scan 6 error:', e.message); }

    // Save alerts to DB (skip duplicates)
    let created = 0;
    for (const alert of alerts) {
      const exists = await prisma.fraudAlert.findFirst({
        where: { alertType: alert.alertType, entityId: alert.entityId, createdAt: { gte: dayAgo } },
      });
      if (!exists) {
        await prisma.fraudAlert.create({ data: alert });
        created++;
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FRAUD_SCAN_RUN",
        entity: "FraudAlert",
        newValue: { alertsFound: alerts.length, created },
      },
    });

    return successResponse({ message: `Fraud scan complete. ${created} new alerts found.`, totalScanned: alerts.length, newAlerts: created });
  } catch (error) {
    console.error("Fraud scan error:", error);
    return errorResponse("Fraud scan failed", 500);
  }
}