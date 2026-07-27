import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, type, title, message, templateId, data } = body;

    // If no specific users, send to all active users
    let targetUserIds = userIds;
    if (!targetUserIds || targetUserIds.length === 0) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      targetUserIds = users.map(u => u.id);
    }

    const notifications = await NotificationService.sendBulk({
      userIds: targetUserIds,
      type: type || 'IN_APP',
      title,
      message,
      templateId,
      data
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SEND_NOTIFICATION',
        entity: 'Notification',
        newValue: { type, title, recipientCount: targetUserIds.length },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      sentCount: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Admin send notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
