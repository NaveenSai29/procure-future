import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - Single media file details
export async function GET(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const media = await prisma.media.findUnique({ where: { id } });

    if (!media) return errorResponse("Media not found", 404);
    return successResponse({ media });
  } catch (error) {
    return errorResponse("Failed to fetch media", 500);
  }
}