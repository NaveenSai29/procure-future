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

    const stats = {
      total: await prisma.fraudAlert.count(),
      open: await prisma.fraudAlert.count({ where: { status: "OPEN" } }),
      highRisk: await prisma.fraudAlert.count({ where: { severity: "HIGH" } }),
      resolved: await prisma.fraudAlert.count({ where: { status: "RESOLVED" } }),
    };

    return successResponse({ alerts, stats });
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
        title: `Rapid order creation by ${buyer?.name || u.buyerId}`,
        description: `${u._count.id} orders placed in 24 hours by ${buyer?.email || "unknown"}`,
        evidence: { orderCount: u._count.id, period: "24h", buyerEmail: buyer?.email },
      });
    }

    // 2. Excessive returns by buyer
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
        title: `Excessive returns by ${buyer?.name || r.buyerId}`,
        description: `${r._count.id} return requests in 7 days by ${buyer?.email || "unknown"}`,
        evidence: { returnCount: r._count.id, period: "7d", buyerEmail: buyer?.email },
      });
    }

    // 3. High-value refund requests
    const highRefunds = await prisma.refundTransaction.findMany({
      where: { amount: { gt: 50000 }, status: "PENDING", createdAt: { gte: weekAgo } },
      include: { returnRequest: { include: { buyer: { select: { name: true, email: true } } } } },
      take: 20,
    });
    for (const rf of highRefunds) {
      alerts.push({
        entityType: "REFUND", entityId: rf.id, alertType: "HIGH_VALUE_REFUND", severity: "MEDIUM",
        title: `High-value refund pending: ₹${rf.amount}`,
        description: `Refund of ₹${rf.amount} for order by ${rf.returnRequest?.buyer?.name || "unknown"}`,
        evidence: { amount: rf.amount, buyerEmail: rf.returnRequest?.buyer?.email },
      });
    }

    // 4. Suspicious wallet activity
    const walletSpikes = await prisma.walletTransaction.groupBy({
      by: ["walletId"],
      where: { createdAt: { gte: dayAgo }, type: "CREDIT", amount: { gt: 100000 } },
      _sum: { amount: true },
      _count: { id: true },
    });
    for (const w of walletSpikes) {
      const wallet = await prisma.wallet.findUnique({ where: { id: w.walletId }, include: { supplier: { select: { businessName: true } } } });
      alerts.push({
        entityType: "WALLET", entityId: w.walletId, alertType: "WALLET_SPIKE", severity: "MEDIUM",
        title: `Unusual wallet credit: ₹${w._sum.amount}`,
        description: `${wallet?.supplier?.businessName || "Unknown"} received ₹${w._sum.amount} in ${w._count.id} transactions in 24h`,
        evidence: { totalAmount: w._sum.amount, transactionCount: w._count.id },
      });
    }

    // 5. Failed login attempts
    const failedLogins = await prisma.auditLog.groupBy({
      by: ["userId"],
      where: { action: "LOGIN_FAILED", createdAt: { gte: dayAgo } },
      _count: { id: true },
      having: { id: { _count: { gt: 5 } } },
    });
    for (const fl of failedLogins) {
      const user = await prisma.user.findUnique({ where: { id: fl.userId }, select: { name: true, email: true } });
      alerts.push({
        entityType: "USER", entityId: fl.userId, alertType: "BRUTE_FORCE", severity: "HIGH",
        title: `Brute force attempt on ${user?.email || fl.userId}`,
        description: `${fl._count.id} failed login attempts in 24 hours`,
        evidence: { failedAttempts: fl._count.id, userEmail: user?.email },
      });
    }

    // 6. Duplicate products (potential listing abuse)
    const duplicateProducts = await prisma.product.groupBy({
    by: ["supplierId", "name"],
    _count: { id: true },
    having: { id: { _count: { gt: 2 } } },
    orderBy: { _count: { id: "desc" } },
    take: 20,
    });
    for (const dp of duplicateProducts) {
      alerts.push({
        entityType: "PRODUCT", alertType: "DUPLICATE_LISTINGS", severity: "LOW",
        title: `Duplicate product listings detected`,
        description: `"${dp.name}" listed ${dp._count.id} times by same supplier`,
        evidence: { productName: dp.name, count: dp._count.id, supplierId: dp.supplierId },
      });
    }

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