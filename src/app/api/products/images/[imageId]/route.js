import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { imageId } = await params;
    const body = await request.json();

    if (body.isPrimary) {
      // Reset all to non-primary
      const image = await prisma.productImage.findUnique({ where: { id: imageId } });
      await prisma.productImage.updateMany({
        where: { productId: image.productId },
        data: { isPrimary: false },
      });
      await prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });
    }

    if (body.sortOrder !== undefined) {
      const image = await prisma.productImage.findUnique({ where: { id: imageId } });
      await prisma.productImage.update({
        where: { id: imageId },
        data: { sortOrder: image.sortOrder + body.sortOrder },
      });
    }

    return successResponse({ message: "Updated" });
  } catch (error) {
    return errorResponse("Failed to update", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { imageId } = await params;
    await prisma.productImage.delete({ where: { id: imageId } });
    return successResponse({ message: "Deleted" });
  } catch (error) {
    return errorResponse("Failed to delete", 500);
  }
}