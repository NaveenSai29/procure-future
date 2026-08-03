import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';

const sendOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = sendOtpSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse('Invalid mobile number', 400);
    }

    const { mobile } = validation.data;

    // Find or create user by mobile
    let user = await prisma.user.findUnique({ where: { mobile } });

    if (!user) {
      // Auto-register: Create user with DELIVERY_PARTNER role
      user = await prisma.user.create({
        data: {
          name: 'Delivery Partner',
          email: `${mobile}@procure.delivery`,
          mobile,
          mobileVerified: false,
          roles: {
            create: {
              role: { connect: { name: 'DELIVERY_PARTNER' } },
            },
          },
          deliveryPartner: {
            create: {
              vehicleType: 'Bike',
            },
          },
        },
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete old OTPs for this user
    await prisma.otp.deleteMany({
      where: { userId: user.id, type: 'LOGIN' },
    });

    // Create new OTP (valid for 5 minutes)
    await prisma.otp.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'LOGIN',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // In production: Send SMS via Twilio/Fast2SMS
    // For development: Return OTP in response
    console.log(`📱 OTP for ${mobile}: ${otp}`);

    return successResponse({
      message: 'OTP sent successfully',
      // Remove in production
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return errorResponse('Failed to send OTP', 500);
  }
}