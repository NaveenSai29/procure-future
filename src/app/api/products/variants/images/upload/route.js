import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const formData = await request.formData();
    const file = formData.get("file");
    const variantId = formData.get("variantId");

    if (!file || !variantId) return errorResponse("File and variantId required", 422);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const dir = join(process.cwd(), "public", "uploads", "variants");

    // Ensure directory exists
    const { mkdir } = await import("fs/promises");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buffer);

    const url = `/uploads/variants/${filename}`;
    const image = await prisma.variantImage.create({
      data: { variantId, url, alt: file.name },
    });

    return successResponse({ image }, 201);
  } catch (error) {
    console.error("Variant image error:", error);
    return errorResponse("Upload failed", 500);
  }
}