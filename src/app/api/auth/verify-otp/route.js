import prisma from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken, successResponse, errorResponse } from '@/lib/auth';
import { z } from 'zod';

const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = verifyOtpSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid input', 400, validation.error.flatten().fieldErrors);
    }

    const { mobile, otp } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { mobile },
      include: {
        roles: { include: { role: true } },
        deliveryPartner: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Find valid OTP
    const validOtp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        code: otp,
        type: 'LOGIN',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return errorResponse('Invalid or expired OTP', 401);
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: validOtp.id },
      data: { isUsed: true },
    });

    // Mark mobile as verified
    if (!user.mobileVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { mobileVerified: true, lastLogin: new Date() },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Auto-create DeliveryPartner profile if doesn't exist (for OTP users)
    if (!user.deliveryPartner) {
      await prisma.deliveryPartner.create({
        data: { userId: user.id },
      });
    }

    const roles = user.roles.map((ur) => ur.role.name);

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, roles);
    const refreshToken = await generateRefreshToken(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const isNewUser = !user.deliveryPartner?.vehicleNumber;

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        deliveryPartner: user.deliveryPartner,
      },
      roles,
      access_token: accessToken,
      refresh_token: refreshToken,
      isNewUser,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return errorResponse('Verification failed', 500);
  }
}