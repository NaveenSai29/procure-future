import { cookies } from "next/headers";
import { successResponse, errorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });
    }

    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");

    return successResponse({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("Logout failed", 500);
  }
}