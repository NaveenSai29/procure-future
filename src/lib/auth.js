import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

// Generate Access Token
export async function generateAccessToken(userId, roles = []) {
  return await new SignJWT({ userId, roles, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

// Generate Refresh Token
export async function generateRefreshToken(userId) {
  return await new SignJWT({ userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
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

// Get current user from cookie
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
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

// API Response helpers
export function successResponse(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(message, status = 400, errors = null) {
  return Response.json(
    { success: false, message, errors },
    { status }
  );
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ success: false, message }, { status: 401 });
}
