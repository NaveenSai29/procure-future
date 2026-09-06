import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MarketingService } from '@/services/marketing.service';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { offerId } = await params;
    const body = await request.json();

    // Get supplier staff
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Check if offer belongs to this supplier
    const existingOffer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!existingOffer || existingOffer.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const offer = await MarketingService.updateOffer(offerId, body);
    return NextResponse.json(offer);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { offerId } = await params;

    // Get supplier staff
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Check if offer belongs to this supplier
    const existingOffer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!existingOffer || existingOffer.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    await MarketingService.deleteOffer(offerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}