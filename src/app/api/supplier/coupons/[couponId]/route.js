import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MarketingService } from '@/services/marketing.service';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { couponId } = await params;
    const body = await request.json();

    // Get supplier staff
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Check if coupon belongs to this supplier
    const existingCoupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existingCoupon || existingCoupon.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const coupon = await MarketingService.updateCoupon(couponId, body);
    return NextResponse.json(coupon);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { couponId } = await params;

    // Get supplier staff
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Check if coupon belongs to this supplier
    const existingCoupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existingCoupon || existingCoupon.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await MarketingService.deleteCoupon(couponId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}