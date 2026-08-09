// src/app/api/admin/monitoring/route.js

import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import os from "os";

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';
    const section = searchParams.get('section') || 'all';

    const now = new Date();
    let since;
    switch (period) {
      case '1h': since = new Date(now - 3600000); break;
      case '6h': since = new Date(now - 21600000); break;
      case '7d': since = new Date(now - 604800000); break;
      case '30d': since = new Date(now - 2592000000); break;
      default: since = new Date(now - 86400000); break;
    }

    const result = {};

    // Performance Metrics
    if (section === 'all' || section === 'performance') {
      const memoryUsage = process.memoryUsage();
      const cpuLoad = os.loadavg();
      const uptime = process.uptime();

      const [totalRequests, errorRequests] = await Promise.all([
        prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: since }, action: { contains: 'ERROR' } } }),
      ]);

      result.performance = {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        cpu: {
          load1: Math.round(cpuLoad[0] * 100) / 100,
          load5: Math.round(cpuLoad[1] * 100) / 100,
          load15: Math.round(cpuLoad[2] * 100) / 100,
          cores: os.cpus().length,
          usagePercent: Math.round((cpuLoad[0] / os.cpus().length) * 100),
        },
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          usagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
        requests: {
          total: totalRequests,
          errors: errorRequests,
          errorRate: totalRequests > 0 ? ((errorRequests / totalRequests) * 100).toFixed(2) : 0,
        },
      };
    }

    // Database Metrics
    if (section === 'all' || section === 'database') {
      let dbSize = 0;
      let dbConnections = 0;
      let slowQueries = 0;
      let tableStats = [];

      try {
        const sizeResult = await prisma.$queryRawUnsafe(
          `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb FROM information_schema.tables WHERE table_schema = 'procure_db'`
        );
        dbSize = sizeResult[0]?.size_mb || 0;

        const connResult = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM information_schema.processlist WHERE db = 'procure_db'`
        );
        dbConnections = Number(connResult[0]?.count || 0);

        try {
          const slowResult = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count FROM information_schema.processlist WHERE db = 'procure_db' AND time > 10 AND info NOT LIKE '%information_schema%'`
          );
          slowQueries = Number(slowResult[0]?.count || 0);
        } catch {
          slowQueries = 0;
        }

        const tableResult = await prisma.$queryRawUnsafe(
          `SELECT TABLE_NAME as tableName, IFNULL(TABLE_ROWS, 0) as rowCount, ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as sizeMb FROM information_schema.tables WHERE table_schema = 'procure_db' ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC LIMIT 10`
        );
        tableStats = tableResult.map(t => ({
          name: t.tableName,
          rows: Number(t.rowCount || 0),
          size: t.sizeMb,
        }));
      } catch (e) {
        console.error('DB metrics error:', e.message);
      }

      result.database = {
        size: dbSize,
        connections: dbConnections,
        slowQueries,
        tables: tableStats,
        status: dbConnections > 50 ? 'warning' : 'healthy',
      };
    }

    // Queue Health
    if (section === 'all' || section === 'queues') {
      try {
        const [emailQueued, emailFailed, emailSent24h] = await Promise.all([
          prisma.emailQueue.count({ where: { status: 'QUEUED' } }),
          prisma.emailQueue.count({ where: { status: 'FAILED' } }),
          prisma.emailQueue.count({ where: { status: 'SENT', sentAt: { gte: since } } }),
        ]);
        result.queues = {
          email: { queued: emailQueued, failed: emailFailed, sent24h: emailSent24h },
          sms: { queued: 0, failed: 0, sent24h: 0 },
        };
        // Try SMS queue if it exists
        try {
          const [smsQueued, smsFailed, smsSent24h] = await Promise.all([
            prisma.sMSQueue.count({ where: { status: 'QUEUED' } }),
            prisma.sMSQueue.count({ where: { status: 'FAILED' } }),
            prisma.sMSQueue.count({ where: { status: 'SENT', sentAt: { gte: since } } }),
          ]);
          result.queues.sms = { queued: smsQueued, failed: smsFailed, sent24h: smsSent24h };
        } catch {}
      } catch (e) {
        result.queues = {
          email: { queued: 0, failed: 0, sent24h: 0 },
          sms: { queued: 0, failed: 0, sent24h: 0 },
        };
      }
    }

    // Error Logs
    if (section === 'all' || section === 'errors') {
      const errors = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { action: { contains: 'ERROR' } },
            { action: { contains: 'FAILED' } },
            { action: { contains: 'FAIL' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          newValue: true,
          ipAddress: true,
          createdAt: true,
        },
      });

      const errorByType = {};
      const errorByHour = {};
      for (const err of errors) {
        const type = err.action || 'UNKNOWN';
        errorByType[type] = (errorByType[type] || 0) + 1;
        const hour = new Date(err.createdAt).getHours();
        errorByHour[hour] = (errorByHour[hour] || 0) + 1;
      }

      result.errors = {
        total: errors.length,
        recent: errors.slice(0, 20).map(e => ({
          id: e.id,
          type: e.action,
          entity: e.entity,
          entityId: e.entityId,
          detail: e.newValue,
          ip: e.ipAddress,
          time: e.createdAt,
        })),
        byType: Object.entries(errorByType).map(([name, count]) => ({ name, count })),
        byHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: errorByHour[i] || 0 })),
      };
    }

    // Security Events
    if (section === 'all' || section === 'security') {
      const [failedLogins, fraudAlerts] = await Promise.all([
        prisma.loginHistory.count({ where: { action: 'FAILED', createdAt: { gte: since } } }),
        prisma.fraudAlert.count({ where: { createdAt: { gte: since } } }),
      ]);

      let bruteForceCount = 0;
      try {
        const bruteForceUsers = await prisma.loginHistory.groupBy({
          by: ['userId'],
          where: { action: 'FAILED', createdAt: { gte: since } },
          _count: { id: true },
          having: { id: { _count: { gt: 5 } } },
        });
        bruteForceCount = bruteForceUsers.length;
      } catch {}

      result.security = {
        failedLogins,
        bruteForceAttempts: bruteForceCount,
        suspiciousActivities: 0,
        fraudAlerts,
        threatLevel: fraudAlerts > 5 || bruteForceCount > 10 ? 'HIGH' : fraudAlerts > 2 || bruteForceCount > 3 ? 'MEDIUM' : 'LOW',
      };
    }

    // System Alerts
    const alerts = [];
    if (result.performance?.cpu?.usagePercent > 80) alerts.push({ type: 'CPU', severity: 'HIGH', message: `CPU usage at ${result.performance.cpu.usagePercent}%` });
    if (result.performance?.memory?.usagePercent > 85) alerts.push({ type: 'MEMORY', severity: 'HIGH', message: `Memory usage at ${result.performance.memory.usagePercent}%` });
    if (result.database?.connections > 40) alerts.push({ type: 'DATABASE', severity: 'MEDIUM', message: `${result.database.connections} active DB connections` });
    if (result.database?.slowQueries > 10) alerts.push({ type: 'DATABASE', severity: 'WARNING', message: `${result.database.slowQueries} slow queries detected` });
    if (result.queues?.email?.failed > 10) alerts.push({ type: 'EMAIL', severity: 'WARNING', message: `${result.queues.email.failed} failed emails` });
    if (result.security?.fraudAlerts > 3) alerts.push({ type: 'SECURITY', severity: 'HIGH', message: `${result.security.fraudAlerts} fraud alerts` });
    result.alerts = alerts;

    result.timestamp = new Date().toISOString();
    result.period = period;

    return successResponse(result);
  } catch (error) {
    console.error("Monitoring error:", error);
    return errorResponse("Failed to fetch monitoring data", 500);
  }
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