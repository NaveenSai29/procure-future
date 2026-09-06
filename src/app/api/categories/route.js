import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";
import { CacheService } from "@/services/cache.service";

export async function GET() {
  try {
    // Check cache first
    const cached = await CacheService.get('categories_list');
    if (cached) {
      return successResponse(cached);
    }

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Cache for 5 minutes (300 seconds)
    await CacheService.set('categories_list', categories, 300);

    return successResponse(categories);
  } catch (error) {
    console.error("Categories error:", error);
    return errorResponse("Failed to fetch categories", 500);
  }
}