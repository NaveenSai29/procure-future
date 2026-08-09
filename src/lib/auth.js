import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

// Get JWT expiry from system settings or use defaults
async function getJwtConfig() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        category: { in: ['SECURITY_API', 'SECURITY_BRUTE'] }
      }
    });
    
    const config = {
      accessTokenExpiry: '30d',
      refreshTokenExpiry: '7d',
      maxLoginAttempts: 5,
      lockoutDuration: 30, // minutes
    };

    for (const s of settings) {
      try {
        const value = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        if (s.key === 'SECURITY_API') {
          if (value.jwtExpiry) config.accessTokenExpiry = `${value.jwtExpiry}m`;
          if (value.refreshTokenExpiry) config.refreshTokenExpiry = `${value.refreshTokenExpiry}d`;
        }
        if (s.key === 'SECURITY_BRUTE') {
          if (value.maxLoginAttempts) config.maxLoginAttempts = value.maxLoginAttempts;
          if (value.lockoutDuration) config.lockoutDuration = value.lockoutDuration;
        }
      } catch {}
    }

    return config;
  } catch {
    return {
      accessTokenExpiry: '30d',
      refreshTokenExpiry: '7d',
      maxLoginAttempts: 5,
      lockoutDuration: 30,
    };
  }
}

// Generate Access Token
export async function generateAccessToken(userId, roles = []) {
  const config = await getJwtConfig();
  return await new SignJWT({ userId, roles, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.accessTokenExpiry)
    .sign(JWT_SECRET);
}

// Generate Refresh Token
export async function generateRefreshToken(userId) {
  const config = await getJwtConfig();
  return await new SignJWT({ userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.refreshTokenExpiry)
    .sign(JWT_REFRESH_SECRET);
}

// Verify Token
export async function verifyToken(token, isRefresh = false) {
  try {
    const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// Get current user from cookie OR Authorization header (for mobile)
export async function getSessionUser() {
  let token = null;

  // 1. Try reading from httpOnly cookie (web browser)
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("access_token")?.value;
  } catch {}

  // 2. Try reading from Authorization header (mobile app)
  if (!token) {
    try {
      const headersList = await headers();
      const authHeader = headersList.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    } catch {}
  }

  if (!token) return null;
  return await verifyToken(token);
}

// Get authenticated user with full DB profile
export async function getAuthUser() {
  const session = await getSessionUser();
  if (!session?.userId) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        mobile: true,
        isActive: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    return user;
  } catch {
    return null;
  }
}

// Brute Force Protection - Check if user is locked out
export async function checkBruteForce(userId) {
  try {
    const config = await getJwtConfig();
    const lockoutWindow = new Date(Date.now() - config.lockoutDuration * 60 * 1000);

    const recentFailures = await prisma.loginHistory.count({
      where: {
        userId,
        action: 'FAILED',
        createdAt: { gte: lockoutWindow },
      },
    });

    if (recentFailures >= config.maxLoginAttempts) {
      return {
        locked: true,
        remainingMinutes: config.lockoutDuration - Math.floor((Date.now() - lockoutWindow.getTime()) / 60000),
        attempts: recentFailures,
        maxAttempts: config.maxLoginAttempts,
      };
    }

    return { locked: false, remainingAttempts: config.maxLoginAttempts - recentFailures };
  } catch {
    return { locked: false };
  }
}

// Record failed login attempt
export async function recordFailedLogin(userId) {
  try {
    await prisma.loginHistory.create({
      data: { userId, action: 'FAILED' },
    });
    return await checkBruteForce(userId);
  } catch {
    return { locked: false };
  }
}

// Hash password
export async function hashPassword(password) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

// Compare password
export async function comparePassword(password, hash) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// Standard success response
export function successResponse(data, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Standard error response
export function errorResponse(message, status = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Validation
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});