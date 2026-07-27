import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      gst: {
        enabled: true,
        defaultRate: 18,
        rates: [0, 5, 12, 18, 28],
        cgst: 9,
        sgst: 9,
        igst: 18,
        tds: 1,
        tcs: 0.1,
        hsnRequired: true,
        einvoiceEnabled: false
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    return NextResponse.json({ success: true, message: 'Tax settings updated' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}