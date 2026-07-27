import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { MarketingService } from '@/services/marketing.service';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaignId } = await params;
    const body = await request.json();
    const campaign = await MarketingService.updateCampaign(campaignId, body);

    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaignId } = await params;
    await MarketingService.updateCampaign(campaignId, { status: 'CANCELLED' });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}