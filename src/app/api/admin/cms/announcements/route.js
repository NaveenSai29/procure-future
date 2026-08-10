import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const announcement = await prisma.announcement.create({ data: body });

    // Send notifications to targeted users
    if (announcement.isActive !== false) {
      try {
        const targetUsers = announcement.targetUsers || 'ALL';
        
        let userWhere = { isActive: true };
        if (targetUsers === 'BUYERS') {
          userWhere.roles = { some: { role: { name: 'BUYER' } } };
        } else if (targetUsers === 'SUPPLIERS') {
          userWhere.roles = { some: { role: { name: { in: ['SUPPLIER', 'SUPPLIER_ADMIN'] } } } };
        } else if (targetUsers === 'DELIVERY') {
          userWhere.deliveryPartner = { isNot: null };
        }

        const users = await prisma.user.findMany({
          where: userWhere,
          select: { id: true },
          take: 500,
        });

        for (const u of users) {
          NotificationService.send({
            userId: u.id,
            type: 'IN_APP',
            title: `📢 ${announcement.title}`,
            message: announcement.content?.substring(0, 200),
          }).catch(() => {});
        }

        console.log(`Announcement "${announcement.title}" sent to ${users.length} users (${targetUsers})`);
      } catch (notifErr) {
        console.error('Announcement notification error:', notifErr.message);
      }
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}