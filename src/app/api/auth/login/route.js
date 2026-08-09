import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { comparePassword, generateAccessToken, generateRefreshToken, successResponse, errorResponse, checkBruteForce, recordFailedLogin } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rateLimiter";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    // Rate limiting: 10 login attempts per minute per IP
    const rateLimitResult = await applyRateLimit(request, 'login', 10, 60);
    if (!rateLimitResult.allowed) {
      return errorResponse("Too many login attempts. Please try again later.", 429);
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors);
    }

    const { email, password } = parsed.data;

    // Check if input is email or mobile number
    const isMobile = /^[6-9]\d{9}$/.test(email);

    // Find user by email OR mobile
    const user = await prisma.user.findFirst({
      where: isMobile
        ? { mobile: email }
        : { email: email.toLowerCase() },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || !user.password) {
      return errorResponse("Invalid credentials", 401);
    }

    if (!user.isActive) {
      return errorResponse("Account is deactivated", 403);
    }

    // Brute force check: is user locked out?
    const bruteForceCheck = await checkBruteForce(user.id);
    if (bruteForceCheck.locked) {
      return errorResponse(
        `Account temporarily locked. Please try again in ${bruteForceCheck.remainingMinutes} minutes.`,
        429
      );
    }

    // Verify password
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      const lockoutStatus = await recordFailedLogin(user.id);
      const message = lockoutStatus.locked 
        ? `Account locked. Try again in ${lockoutStatus.remainingMinutes} minutes.`
        : `Invalid credentials. ${lockoutStatus.remainingAttempts} attempts remaining.`;
      return errorResponse(message, 401);
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

    // Set cookies (for web)
    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // ALSO return tokens in response body for mobile apps
    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        referralCode: user.referralCode,
      },
      roles,
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Login failed", 500);
  }
}