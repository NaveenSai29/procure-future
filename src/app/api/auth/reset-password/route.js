import prisma from "@/lib/prisma";
import { hashPassword, successResponse, errorResponse } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return errorResponse("Token and new password are required", 400);
    }

    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters", 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return errorResponse("Invalid or expired reset link. Please request a new one.", 400);
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    return successResponse({ message: "Password reset successfully! You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse("Password reset failed", 500);
  }
}