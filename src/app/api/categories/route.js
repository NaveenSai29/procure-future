import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return successResponse(categories);
  } catch (error) {
    console.error("Categories error:", error);
    return errorResponse("Failed to fetch categories", 500);
  }
}