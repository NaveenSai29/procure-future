import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const rfqs = await prisma.rFQ.findMany({
      where: role === "supplier" ? { status: "PUBLISHED", isPublic: true } : { buyerId: session.userId },
      include: {
        buyer: { select: { name: true } },
        responses: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(rfqs);
  } catch (error) {
    return errorResponse("Failed to fetch RFQs", 500);
  }
}