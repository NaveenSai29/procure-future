import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { expoPushToken } = body;

    if (!expoPushToken) return errorResponse("Push token required", 422);

    await prisma.user.update({
      where: { id: session.userId },
      data: { expoPushToken },
    });

    return successResponse({ message: "Push token saved" });
  } catch (error) {
    console.error("Push token error:", error);
    return errorResponse("Failed to save push token", 500);
  }
}