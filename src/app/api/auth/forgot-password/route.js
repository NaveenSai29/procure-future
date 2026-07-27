import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";
import crypto from "crypto";
import { getPasswordResetEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return errorResponse("Email is required", 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success even if email not found (security best practice)
    if (!user) {
      return successResponse({ message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationExpires: expires,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const emailTemplate = getPasswordResetEmail({ name: user.name, resetUrl });

    EmailService.sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    }).catch(err => console.error('Password reset email failed:', err.message));

    return successResponse({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse("Failed to send reset email", 500);
  }
}