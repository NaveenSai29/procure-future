import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import os from "os";
import { execSync } from "child_process";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });

    const userRoles = user.roles.map((r) => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    // Server metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const nodeVersion = process.version;
    const platform = os.platform();
    const hostname = os.hostname();

    // Database health
    let dbStatus = "healthy";
    let dbResponseTime = 0;
    let dbVersion = "";
    let dbSize = "";
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - start;
      
      const versionResult = await prisma.$queryRaw`SELECT VERSION() as version`;
      dbVersion = versionResult[0]?.version || "Unknown";
      
      const sizeResult = await prisma.$queryRaw`
        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb 
        FROM information_schema.tables 
        WHERE table_schema = 'procure_db'
      `;
      dbSize = sizeResult[0]?.size_mb || "0";
    } catch {
      dbStatus = "unhealthy";
    }

    // Application metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      totalUsers, activeUsers, totalSuppliers, totalProducts, totalOrders,
      todayOrders, todayRevenue, failedLogins,
      pendingKyc, openTickets, pendingReturns, pendingSettlements,
      dbConnections, slowQueries, auditLogSize, mediaCount,
      lastHourOrders, lastHourUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today } }, _sum: { totalAmount: true } }),
      prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: yesterday } } }),
      prisma.kYCDocument.count({ where: { status: 'PENDING' } }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      prisma.settlement.count({ where: { status: 'PENDING' } }),
      prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.processlist WHERE db = 'procure_db'`,
      prisma.auditLog.count(),
      prisma.media.count(),
      prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 3600000) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 3600000) } } }),
    ]);

    // Error rates (last 24 hours)
    const last24h = new Date(Date.now() - 86400000);
    const errorLogs = await prisma.auditLog.count({
      where: {
        createdAt: { gte: last24h },
        action: { contains: 'ERROR' },
      },
    });
    const totalRequests24h = await prisma.auditLog.count({
      where: { createdAt: { gte: last24h } },
    });

    // Queue health
    const emailQueue = await prisma.emailQueue.count({ where: { status: 'QUEUED' } });
    const emailFailed = await prisma.emailQueue.count({ where: { status: 'FAILED' } });
    const smsQueue = await prisma.sMSQueue.count({ where: { status: 'QUEUED' } });

    // Disk space (uploads)
    let uploadSize = "0 MB";
    try {
      const result = execSync('du -sh src/uploads 2>/dev/null || echo "0"').toString().trim();
      uploadSize = result || "0 MB";
    } catch {
      uploadSize = "N/A";
    }

    return successResponse({
      server: {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        nodeVersion,
        platform,
        hostname,
        memory: {
          total: formatBytes(totalMem),
          free: formatBytes(freeMem),
          used: formatBytes(totalMem - freeMem),
          usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          rss: formatBytes(memoryUsage.rss),
        },
        cpu: {
          load1: Math.round(cpuLoad[0] * 100) / 100,
          load5: Math.round(cpuLoad[1] * 100) / 100,
          load15: Math.round(cpuLoad[2] * 100) / 100,
          cores: os.cpus().length,
        },
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        version: dbVersion,
        size: dbSize + " MB",
        connections: Number(dbConnections[0]?.count || 0),
      },
      application: {
        totalUsers,
        activeUsers,
        totalSuppliers,
        totalProducts,
        totalOrders,
        todayOrders,
        todayRevenue: todayRevenue._sum?.totalAmount || 0,
      },
      security: {
        failedLogins24h: failedLogins,
        errorRate24h: totalRequests24h > 0 ? ((errorLogs / totalRequests24h) * 100).toFixed(2) : 0,
        pendingKyc,
        openTickets,
        pendingReturns,
        pendingSettlements,
      },
      queues: {
        email: { queued: emailQueue, failed: emailFailed },
        sms: { queued: smsQueue },
      },
      storage: {
        auditLogEntries: auditLogSize,
        mediaFiles: mediaCount,
        uploadSize,
      },
      activity: {
        ordersLastHour: lastHourOrders,
        usersLastHour: lastHourUsers,
        totalRequests24h,
        errors24h: errorLogs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return errorResponse("Failed to get system health", 500);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}