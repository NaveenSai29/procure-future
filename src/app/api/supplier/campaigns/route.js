import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MarketingService } from '@/services/marketing.service';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');

    const result = await MarketingService.getCampaigns(supplierStaff.supplierId, { page, limit, type });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    const campaign = await MarketingService.createCampaign(supplierStaff.supplierId, body);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update campaign
export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    // Verify ownership
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing || existing.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = await MarketingService.updateCampaign(id, data);
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete campaign
export async function DELETE(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing || existing.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}