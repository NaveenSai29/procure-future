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

    const { type } = await request.json();

    if (type === 'EMAIL') {
      const processed = await NotificationService.processEmailQueue(20);
      return NextResponse.json({ success: true, processed });
    }

    if (type === 'SMS') {
      const processed = await NotificationService.processSMSQueue(20);
      return NextResponse.json({ success: true, processed });
    }

    return NextResponse.json({ error: 'Invalid queue type' }, { status: 400 });
  } catch (error) {
    console.error('Process queue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process queue' },
      { status: 500 }
    );
  }
}