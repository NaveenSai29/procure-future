import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { comparePassword, generateAccessToken, generateRefreshToken, successResponse, errorResponse } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors);
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || !user.password) {
      return errorResponse("Invalid email or password", 401);
    }

    if (!user.isActive) {
      return errorResponse("Account is deactivated", 403);
    }

    // Verify password
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      await prisma.loginHistory.create({
        data: { userId: user.id, action: "FAILED" },
      });
      return errorResponse("Invalid email or password", 401);
    }

    // Update login info
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, action: "LOGIN" },
    });

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

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return successResponse({
      user: { id: user.id, name: user.name, email: user.email },
      roles,
    });

  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Login failed", 500);
  }
}