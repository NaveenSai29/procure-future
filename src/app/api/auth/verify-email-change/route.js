import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return errorResponse("Verification token is required", 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        emailChangeToken: token,
        emailChangeExpires: { gt: new Date() },
      },
    });

    if (!user || !user.newEmail) {
      return errorResponse("Invalid or expired verification link. Please request a new one.", 400);
    }

    // Move newEmail to email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.newEmail,
        newEmail: null,
        emailChangeToken: null,
        emailChangeExpires: null,
        emailVerified: true, // Mark as verified since they confirmed access
      },
    });

    // Redirect to app with success
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?status=success&type=email-change`;
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("Email change verification error:", error);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?status=error`;
    return Response.redirect(redirectUrl, 302);
  }
}