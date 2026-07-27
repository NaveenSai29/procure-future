import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import crypto from "crypto";
import { getVerificationEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) return errorResponse("User not found", 404);

    if (user.emailVerified) {
      return errorResponse("Email is already verified", 400);
    }

    // Generate new token
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
    }).catch(err => console.error('Resend verification email failed:', err.message));

    return successResponse({ message: "Verification email sent! Check your inbox." });
  } catch (error) {
    console.error("Resend verification error:", error);
    return errorResponse("Failed to send verification email", 500);
  }
}