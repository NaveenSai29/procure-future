import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return errorResponse("Verification token is required", 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return errorResponse("Invalid or expired verification link. Please request a new one.", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    return successResponse({ message: "Email verified successfully! 🎉" });
  } catch (error) {
    console.error("Email verification error:", error);
    return errorResponse("Verification failed", 500);
  }
}