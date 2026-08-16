import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rateLimiter';
import { z } from 'zod';

const sendOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  referralCode: z.string().optional(),
  userType: z.enum(['BUYER', 'DELIVERY_PARTNER']).optional().default('BUYER'),
});

// Send SMS via Fast2SMS
async function sendSMS(mobile, otp) {
  const smsEnabled = process.env.SMS_ENABLED === 'true';
  
  // When SMS disabled, just log to console
  if (!smsEnabled) {
    console.log(`📱 OTP for ${mobile}: ${otp}`);
    return true;
  }

  // SMS enabled: Send via Fast2SMS
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: mobile,
      }),
    });
    
    const data = await res.json();
    
    if (data.return === true) {
      console.log(`✅ SMS sent to ${mobile}`);
      return true;
    } else {
      console.error('Fast2SMS error:', data.message || 'Unknown error');
      return false;
    }
  } catch (e) {
    console.error('SMS send error:', e.message);
    return false;
  }
}

export async function POST(request) {
  try {
    // Rate limiting: 3 OTP requests per 10 minutes per IP
    const rateLimitResult = await applyRateLimit(request, 'send-otp', 3, 600);
    if (!rateLimitResult.allowed) {
      return errorResponse('Too many OTP requests. Please try again later.', 429);
    }

    const body = await request.json();
    const validation = sendOtpSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse('Invalid mobile number', 400);
    }

    const { mobile, referralCode, userType } = validation.data;
    const isDelivery = userType === 'DELIVERY_PARTNER';
    const roleName = isDelivery ? 'DELIVERY_PARTNER' : 'BUYER';

    // Find user by mobile AND role (not just mobile)
    let user = await prisma.user.findFirst({
      where: {
        mobile,
        roles: {
          some: {
            role: {
              name: roleName,
            },
          },
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    // Check referral code if provided
    let referrerUser = null;
    if (referralCode) {
      referrerUser = await prisma.user.findFirst({
        where: { referralCode: referralCode },
        select: { id: true, name: true },
      });
    }

    if (!user) {
      // Auto-register with appropriate role based on userType
      const createData = {
        name: isDelivery ? 'Delivery Partner' : 'Buyer',
        email: null, // No fake email - mobile is the primary identifier
        mobile,
        mobileVerified: false,
        referredBy: referrerUser?.id || null,
        roles: {
          create: {
            role: { connect: { name: roleName } },
          },
        },
      };

      // Only create DeliveryPartner profile for delivery users
      if (isDelivery) {
        createData.deliveryPartner = { create: {} };
      }

      user = await prisma.user.create({ 
        data: createData,
        include: {
          roles: { include: { role: true } },
        },
      });

      // Create referral record if referred by someone
      if (referrerUser) {
        const referralType = isDelivery ? 'DELIVERY' : 'BUYER';
        await prisma.referral.create({
          data: {
            referrerId: referrerUser.id,
            referredId: user.id,
            referralType,
            status: 'REGISTERED',
          },
        }).catch(err => console.error('Referral creation failed:', err.message));

        // Notify referrer
        try {
          const { NotificationService } = await import('@/services/notification.service');
          const title = isDelivery ? '🎉 New Delivery Referral!' : '🎉 New Referral!';
          const message = isDelivery 
            ? `A new delivery partner joined using your referral code!`
            : `Someone just joined using your referral code!`;
          NotificationService.send({
            userId: referrerUser.id,
            type: 'IN_APP',
            title,
            message,
          }).catch(() => {});
        } catch {}
      }
    } else if (referralCode && !user.referredBy) {
      // User exists but wasn't referred — update if referral code provided
      const existingReferral = await prisma.referral.findFirst({
        where: { referredId: user.id },
      });
      
      if (!existingReferral && referrerUser && referrerUser.id !== user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { referredBy: referrerUser.id },
        });
        
        // Determine referral type based on user's existing role
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        });
        const isExistingDelivery = userRoles.some(r => r.role.name === 'DELIVERY_PARTNER');
        const referralType = isExistingDelivery ? 'DELIVERY' : 'BUYER';

        await prisma.referral.create({
          data: {
            referrerId: referrerUser.id,
            referredId: user.id,
            referralType,
            status: 'REGISTERED',
          },
        }).catch(err => console.error('Referral creation failed:', err.message));

        // Notify referrer
        try {
          const { NotificationService } = await import('@/services/notification.service');
          const title = isExistingDelivery ? '🎉 New Delivery Referral!' : '🎉 New Referral!';
          const message = isExistingDelivery
            ? `A delivery partner joined using your referral code!`
            : `Someone just joined using your referral code!`;
          NotificationService.send({
            userId: referrerUser.id,
            type: 'IN_APP',
            title,
            message,
          }).catch(() => {});
        } catch {}
      }
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

    // Send SMS via Fast2SMS (SMS_ENABLED=true means real SMS, false means console log)
    const smsSent = await sendSMS(mobile, otp);

    if (!smsSent && process.env.SMS_ENABLED === 'true') {
      return errorResponse('Failed to send OTP. Please try again later.', 500);
    }

    return successResponse({
      message: smsSent ? 'OTP sent successfully' : 'OTP logged (dev mode)',
      // Return OTP in response only when SMS is disabled
      ...(process.env.SMS_ENABLED !== 'true' && { otp }),
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return errorResponse('Failed to send OTP', 500);
  }
}