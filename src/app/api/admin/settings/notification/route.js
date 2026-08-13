import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      email: {
        provider: 'SMTP',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '587',
        fromEmail: process.env.SMTP_FROM || 'noreply@procure.com',
        configured: !!process.env.SMTP_USER
      },
      sms: {
        enabled: process.env.SMS_ENABLED === 'true',
        provider: 'Custom',
        configured: !!process.env.SMS_API_KEY
      },
      push: {
        enabled: true,
        provider: 'Firebase'
      },
      whatsapp: {
        enabled: false,
        provider: 'WhatsApp Business API'
      },
      templates: {
        orderConfirmation: true,
        shippingUpdate: true,
        deliveryOTP: true,
        rfqAlert: true,
        paymentReceipt: true
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}