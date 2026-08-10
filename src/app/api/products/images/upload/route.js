import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const formData = await request.formData();
    const file = formData.get("file");
    const productId = formData.get("productId");

    if (!file || !productId) return errorResponse("File and productId required", 422);

    // Validate file size (5MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return errorResponse(`File too large (${sizeMB}MB). Maximum 5MB allowed.`, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(`Invalid file type. Only JPG, PNG, and WebP are allowed.`, 400);
    }

    // Save file locally
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    
    await mkdir(uploadDir, { recursive: true });
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