import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MarketingService } from '@/services/marketing.service';
import { NotificationService } from '@/services/notification.service';
import { EmailService } from '@/services/email.service';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { campaignId } = await params;
    const body = await request.json();
    const { action } = body;

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'send') {
      // Get target customers
      let targetUsers = [];
      
      // For now, get all users who have ordered from this supplier
      const orders = await prisma.order.findMany({
        where: { product: { supplierId: supplierStaff.supplierId } },
        select: { buyerId: true },
        distinct: ['buyerId'],
      });
      const buyerIds = orders.map(o => o.buyerId);

      if (buyerIds.length > 0) {
        targetUsers = await prisma.user.findMany({
          where: { id: { in: buyerIds }, isActive: true },
          select: { id: true, name: true, email: true, mobile: true },
        });
      }

      const sentCount = targetUsers.length;

      // Send based on campaign type
      if (campaign.type === 'EMAIL') {
        for (const target of targetUsers) {
          if (target.email && !target.email.includes('@procure.')) {
            try {
              await EmailService.sendEmail({
                to: target.email,
                subject: campaign.subject || campaign.name,
                html: `<div style="font-family:Arial;padding:20px;max-width:600px;margin:auto">
                  <h2 style="color:#FC8019">${campaign.subject || campaign.name}</h2>
                  <p style="color:#333;line-height:1.6">${campaign.content || ''}</p>
                  <hr style="border:1px solid #eee;margin:20px 0"/>
                  <p style="color:#999;font-size:12px">Sent by ${supplierStaff.supplier?.businessName || 'Supplier'} via PROCURE</p>
                </div>`,
              });
            } catch (e) {
              console.log('Email send error:', e.message);
            }
          }
        }
      } else if (campaign.type === 'PUSH') {
        for (const target of targetUsers) {
          try {
            await NotificationService.send({
              userId: target.id,
              type: 'IN_APP',
              title: campaign.subject || campaign.name,
              message: campaign.content || '',
            });
          } catch (e) {
            console.log('Push send error:', e.message);
          }
        }
      }

      // Update campaign stats
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          recipientCount: sentCount,
        },
      });

      return NextResponse.json({ success: true, sentCount, message: `Campaign sent to ${sentCount} customers` });
    }

    if (action === 'schedule') {
      const { scheduledAt } = body;
      await MarketingService.updateCampaign(campaignId, {
        status: 'SCHEDULED',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      });
      return NextResponse.json({ success: true, message: 'Campaign scheduled' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Campaign action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { campaignId } = await params;
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await prisma.campaign.delete({ where: { id: campaignId } });
    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}