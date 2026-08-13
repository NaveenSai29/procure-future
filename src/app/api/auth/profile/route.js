import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { EmailService } from "@/services/email.service";

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return errorResponse("Not authenticated", 401);
    }

    const { name, email } = await request.json();

    if (!name || !name.trim()) {
      return errorResponse("Name is required", 400);
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return errorResponse("User not found", 404);
    }

    const updateData = { name: name.trim() };
    let emailChangePending = false;

    // Check if email is being changed
    if (email && email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      // Check if new email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existingUser && existingUser.id !== session.userId) {
        return errorResponse("Email is already in use by another account", 409);
      }

      // Generate verification token for email change
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      updateData.newEmail = email.trim().toLowerCase();
      updateData.emailChangeToken = token;
      updateData.emailChangeExpires = expires;
      emailChangePending = true;

      // Send verification email to new email address
      try {
        const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email-change?token=${token}`;
        await EmailService.sendEmail({
          to: email.trim().toLowerCase(),
          subject: "Verify your new email address - PROCURE",
          html: `
            <h2>Confirm Your New Email Address</h2>
            <p>You requested to change your email address to this one.</p>
            <p>Click the link below to verify:</p>
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#F97316;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">Verify Email</a>
            <p>This link expires in 24 hours.</p>
            <p>If you didn't request this change, please ignore this email.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send email change verification:", emailError);
        // Still update the record even if email fails
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        newEmail: true,
        emailVerified: true,
        mobile: true,
        mobileVerified: true,
        profileImage: true,
      },
    });

    return successResponse({
      ...updatedUser,
      emailChangePending,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return errorResponse("Failed to update profile", 500);
  }
}