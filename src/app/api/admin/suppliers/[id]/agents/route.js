import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - List all dedicated agents for a supplier
export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const agents = await prisma.supplierAgent.findMany({
      where: { supplierId: id },
      select: {
        id: true,
        createdAt: true,
        partner: {
          select: {
            id: true,
            rating: true,
            totalDeliveries: true,
            isOnline: true,
            isVerified: true,
            activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
            user: { select: { name: true, mobile: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(agents);
  } catch (error) {
    return errorResponse("Failed to fetch agents", 500);
  }
}

// POST - Add a dedicated agent
export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const { partnerId } = await request.json();

    if (!partnerId) return errorResponse("partnerId is required", 400);

    // Check if already exists
    const existing = await prisma.supplierAgent.findUnique({
      where: { supplierId_partnerId: { supplierId: id, partnerId } },
    });

    if (existing) return errorResponse("Agent already assigned to this supplier", 409);

    const agent = await prisma.supplierAgent.create({
      data: { supplierId: id, partnerId },
      select: {
        id: true,
        partner: {
          select: {
            id: true,
            user: { select: { name: true, mobile: true } },
          },
        },
      },
    });

    return successResponse({ message: "Agent added successfully", agent }, 201);
  } catch (error) {
    return errorResponse("Failed to add agent", 500);
  }
}

// DELETE - Remove a dedicated agent
export async function DELETE(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) return errorResponse("agentId is required", 400);

    await prisma.supplierAgent.delete({
      where: { id: agentId },
    });

    return successResponse({ message: "Agent removed successfully" });
  } catch (error) {
    return errorResponse("Failed to remove agent", 500);
  }
}