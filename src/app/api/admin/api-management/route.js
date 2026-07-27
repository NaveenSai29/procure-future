// src/app/api/admin/api-management/route.js
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createApiKey, listApiKeys, revokeApiKey, createWebhook, getRequestLogStats } from '@/services/api-management.service';
import prisma from '@/lib/prisma';

async function checkAdminAccess(session) {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  const userRoles = user.roles.map(r => r.role.name);
  return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
}

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (!await checkAdminAccess(session)) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'overview';
    const period = searchParams.get('period') || '24h';

    const result = {};

    if (section === 'overview' || section === 'keys') {
      result.keys = await listApiKeys({ isActive: true });
      result.revokedKeys = await listApiKeys({ isActive: false });
    }

    if (section === 'overview' || section === 'webhooks') {
      result.webhooks = await prisma.webhook.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          deliveries: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      });
    }

    if (section === 'overview' || section === 'logs') {
      result.requestStats = await getRequestLogStats(period);
      result.recentRequests = await prisma.apiRequestLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          method: true,
          path: true,
          statusCode: true,
          durationMs: true,
          ipAddress: true,
          apiKeyId: true,
          createdAt: true,
        },
      });
    }

    result.totalKeys = await prisma.apiKey.count();
    result.activeKeys = await prisma.apiKey.count({ where: { isActive: true } });
    result.totalWebhooks = await prisma.webhook.count();

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('API management GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (!await checkAdminAccess(session)) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

    const body = await request.json();
    const { action, name, scopes, entityType, entityId, expiresAt, url, events, secret, keyId, webhookId } = body;

    switch (action) {
      case 'create-key': {
        if (!name) return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
        const apiKey = await createApiKey({ name, scopes, entityType, entityId, expiresAt, createdBy: session.userId });
        return NextResponse.json({ success: true, data: apiKey });
      }

      case 'revoke-key': {
        if (!keyId) return NextResponse.json({ success: false, error: 'keyId required' }, { status: 400 });
        await revokeApiKey(keyId, session.userId);
        return NextResponse.json({ success: true, message: 'Key revoked' });
      }

      case 'create-webhook': {
        if (!name || !url) return NextResponse.json({ success: false, error: 'Name and URL required' }, { status: 400 });
        const webhook = await createWebhook({ name, url, events, secret, createdBy: session.userId });
        return NextResponse.json({ success: true, data: webhook });
      }

      case 'toggle-webhook': {
        if (!webhookId) return NextResponse.json({ success: false, error: 'webhookId required' }, { status: 400 });
        const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
        await prisma.webhook.update({ where: { id: webhookId }, data: { isActive: !webhook.isActive } });
        return NextResponse.json({ success: true, message: 'Webhook toggled' });
      }

      case 'delete-webhook': {
        if (!webhookId) return NextResponse.json({ success: false, error: 'webhookId required' }, { status: 400 });
        await prisma.webhook.delete({ where: { id: webhookId } });
        return NextResponse.json({ success: true, message: 'Webhook deleted' });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API management POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}