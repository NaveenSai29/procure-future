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
    const productId = formData.get("productId");

    if (!file || !productId) return errorResponse("File and productId required", 422);

    // Save file locally
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/uploads/products/${filename}`;
    const maxOrder = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: "desc" },
    });

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        alt: file.name,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
        isPrimary: false,
      },
    });

    return successResponse({ image }, 201);
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Upload failed", 500);
  }
}