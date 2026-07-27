// src/services/api-management.service.js
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Generate a secure API key
export function generateApiKey() {
  const prefix = 'proc_';
  const random = crypto.randomBytes(24).toString('base64url');
  const fullKey = prefix + random;
  const keyPrefix = fullKey.substring(0, 12);
  return { key: fullKey, prefix: keyPrefix };
}

// Hash API key for storage comparison
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Create a new API key
export async function createApiKey({ name, scopes = [], entityType = 'ADMIN', entityId = null, expiresAt = null, createdBy = null }) {
  const { key, prefix } = generateApiKey();
  
  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key,
      prefix,
      scopes,
      entityType,
      entityId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy,
    },
  });

  return { ...apiKey, rawKey: key };
}

// Validate API key
export async function validateApiKey(rawKey) {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      key: rawKey,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (!apiKey) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}

// List all API keys
export async function listApiKeys({ entityType, entityId, isActive } = {}) {
  const where = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (isActive !== undefined) where.isActive = isActive;

  return prisma.apiKey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      entityType: true,
      entityId: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

// Revoke API key
export async function revokeApiKey(id, revokedBy = null) {
  return prisma.apiKey.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

// Create webhook
export async function createWebhook({ name, url, events = [], secret = null, createdBy = null }) {
  const webhookSecret = secret || crypto.randomBytes(16).toString('hex');
  
  return prisma.webhook.create({
    data: {
      name,
      url,
      secret: webhookSecret,
      events,
      createdBy,
    },
  });
}

// Dispatch webhook
export async function dispatchWebhook(event, payload) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      events: { array_contains: [event] },
    },
  });

  const results = [];
  for (const webhook of webhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Secret': webhook.secret,
          'X-Webhook-Delivery': uuidv4(),
        },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      });

      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          responseCode: response.status,
          responseBody: await response.text().catch(() => ''),
          attempts: 1,
        },
      });

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastSentAt: new Date(), lastStatus: delivery.status },
      });

      results.push({ webhookId: webhook.id, status: delivery.status, code: response.status });
    } catch (error) {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          status: 'FAILED',
          responseCode: 0,
          responseBody: error.message,
          attempts: 1,
          nextRetryAt: new Date(Date.now() + 60000),
        },
      });

      results.push({ webhookId: webhook.id, status: 'FAILED', error: error.message });
    }
  }

  return results;
}

// Get request log stats
export async function getRequestLogStats(period = '24h') {
  const now = new Date();
  let since;
  switch (period) {
    case '1h': since = new Date(now - 3600000); break;
    case '7d': since = new Date(now - 604800000); break;
    default: since = new Date(now - 86400000); break;
  }

  const [total, errors, avgDuration, topPaths, statusBreakdown] = await Promise.all([
    prisma.apiRequestLog.count({ where: { createdAt: { gte: since } } }),
    prisma.apiRequestLog.count({ where: { createdAt: { gte: since }, statusCode: { gte: 400 } } }),
    prisma.apiRequestLog.aggregate({ where: { createdAt: { gte: since } }, _avg: { durationMs: true } }),
    prisma.apiRequestLog.groupBy({
      by: ['path', 'method'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _avg: { durationMs: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.apiRequestLog.groupBy({
      by: ['statusCode'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  return {
    total,
    errors,
    errorRate: total > 0 ? ((errors / total) * 100).toFixed(2) : 0,
    avgDuration: Math.round(avgDuration._avg?.durationMs || 0),
    topPaths: topPaths.map(p => ({
      path: p.path,
      method: p.method,
      count: p._count.id,
      avgMs: Math.round(p._avg.durationMs || 0),
    })),
    statusBreakdown: statusBreakdown.map(s => ({
      code: s.statusCode,
      count: s._count.id,
    })),
  };
}