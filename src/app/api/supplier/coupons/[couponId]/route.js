import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { MarketingService } from '@/services/marketing.service';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { couponId } = await params;
    const body = await request.json();
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
    await MarketingService.deleteCoupon(couponId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}