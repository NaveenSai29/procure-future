import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) return errorResponse("No file uploaded", 422);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "instructions");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `instruction-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/instructions/${fileName}`;

    return successResponse({ url: fileUrl });
  } catch (error) {
    console.error("Upload instruction image error:", error);
    return errorResponse("Failed to upload image", 500);
  }
}