import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("addressId");

    if (!addressId) return errorResponse("Address ID required", 422);

    const instructions = await prisma.deliveryInstruction.findFirst({
      where: {
        userId: session.userId,
        addressId,
      },
    });

    return successResponse(instructions || null);
  } catch (error) {
    console.error("Get delivery instructions error:", error);
    return errorResponse("Failed to fetch instructions", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { addressId, instructions, images, audio } = body;

    if (!addressId) return errorResponse("Address ID required", 422);

    const existing = await prisma.deliveryInstruction.findFirst({
      where: {
        userId: session.userId,
        addressId,
      },
    });

    if (existing) {
      const updated = await prisma.deliveryInstruction.update({
        where: { id: existing.id },
        data: {
          instructions: JSON.stringify(instructions || []),
          images: JSON.stringify(images || []),
          audio: audio || null,
        },
      });
      return successResponse(updated);
    }

    const created = await prisma.deliveryInstruction.create({
      data: {
        userId: session.userId,
        addressId,
        instructions: JSON.stringify(instructions || []),
        images: JSON.stringify(images || []),
        audio: audio || null,
      },
    });

    return successResponse(created);
  } catch (error) {
    console.error("Save delivery instructions error:", error);
    return errorResponse("Failed to save instructions", 500);
  }
}