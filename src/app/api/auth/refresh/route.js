import { cookies } from "next/headers";
import { verifyToken, generateAccessToken, generateRefreshToken, successResponse, errorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    let oldRefreshToken = null;

    // Try cookie first (web browser)
    const cookieStore = await cookies();
    oldRefreshToken = cookieStore.get("refresh_token")?.value;

    // Try request body (mobile apps send token in body)
    if (!oldRefreshToken) {
      try {
        const body = await request.clone().json();
        oldRefreshToken = body.refresh_token;
      } catch {}
    }

    if (!oldRefreshToken) {
      return errorResponse("No refresh token", 401);
    }

    // Verify refresh token
    const payload = await verifyToken(oldRefreshToken, true);
    if (!payload) {
      return errorResponse("Invalid refresh token", 401);
    }

    // Check if token exists and not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    });

    if (!storedToken || storedToken.isRevoked) {
      cookieStore.delete("refresh_token");
      return errorResponse("Token revoked", 401);
    }

    // Get user roles
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      return errorResponse("User not found", 401);
    }

    const roles = user.roles.map((ur) => ur.role.name);

    // Generate new tokens
    const accessToken = await generateAccessToken(user.id, roles);
    const newRefreshToken = await generateRefreshToken(user.id);

    // Rotate refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true, replacedBy: newRefreshToken },
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set new cookies (for web)
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    cookieStore.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Return tokens in body for mobile apps
    return successResponse({ 
      roles,
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return errorResponse("Token refresh failed", 500);
  }
}