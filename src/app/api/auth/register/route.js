import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hashPassword, generateAccessToken, generateRefreshToken, successResponse, errorResponse } from "@/lib/auth";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getWelcomeEmail, getVerificationEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";
import { NotificationService } from "@/services/notification.service";

function generateReferralCode(name) {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${random}`;
}

async function sendVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: token, verificationExpires: expires },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;
  const email = getVerificationEmail({ name: user.name, verificationUrl });

  EmailService.sendEmail({
    to: user.email,
    subject: email.subject,
    html: email.html,
  }).catch(err => console.error('Verification email failed:', err.message));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors);
    }

    const { name, email, mobile, password } = parsed.data;
    const referredBy = body.referredBy || null; // Referral code from URL

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, mobile ? { mobile } : {}] },
    });

    if (existingUser) {
      return errorResponse(
        existingUser.email === email ? "Email already registered" : "Mobile already registered",
        409
      );
    }

    // Find referrer if referral code provided
    let referrerUser = null;
    if (referredBy) {
      referrerUser = await prisma.user.findFirst({
        where: { referralCode: referredBy },
        select: { id: true, name: true },
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
        password: hashedPassword,
        referralCode: generateReferralCode(name),
        referredBy: referrerUser?.id || null,
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "BUYER" },
                create: { name: "BUYER", description: "Default buyer role", isSystem: true },
              },
            },
          },
        },
        buyerProfile: {
          create: {},
        },
      },
    });

    // Create referral record if referred
    if (referrerUser) {
      await prisma.referral.create({
        data: {
          referrerId: referrerUser.id,
          referredId: user.id,
          status: "REGISTERED",
        },
      }).catch(err => console.error('Referral creation failed:', err.message));

      // Notify referrer
      NotificationService.send({
        userId: referrerUser.id,
        type: 'IN_APP',
        title: '🎉 New Referral!',
        message: `${user.name} just joined using your referral code!`,
      }).catch(() => {});
    }

    // Create buyer wallet automatically
    await prisma.buyerWallet.create({
      data: { userId: user.id },
    }).catch(() => {});

    // Create notification preferences
    await NotificationService.createPreferences(user.id).catch(() => {});

    // Send welcome email (non-blocking)
    const welcomeEmail = getWelcomeEmail({ name: user.name });
    EmailService.sendEmail({
      to: user.email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
    }).catch(err => console.error('Welcome email failed:', err.message));

    // Send verification email (non-blocking)
    sendVerificationEmail(user).catch(err => console.error('Verification setup failed:', err.message));

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, ["BUYER"]);
    const refreshToken = await generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 15 * 60, path: "/",
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/",
    });

    return successResponse({
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        referralCode: user.referralCode,
      },
      roles: ["BUYER"],
      message: "Account created! Please check your email to verify your address.",
    }, 201);

  } catch (error) {
    console.error("Register error:", error);
    return errorResponse("Registration failed", 500);
  }
}