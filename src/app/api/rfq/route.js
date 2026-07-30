import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    let where = {};
    
    if (role === "supplier") {
      const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });
      if (!staff) return errorResponse("Not a supplier", 403);
      
      // Show: PUBLISHED RFQs + RFQs where this supplier has responded or been awarded
      where = {
        OR: [
          { status: "PUBLISHED", isPublic: true },
          { responses: { some: { supplierId: staff.supplierId } } },
          { quotations: { some: { supplierId: staff.supplierId } } },
        ],
      };
    } else {
      where = { buyerId: session.userId };
    }

    const rfqs = await prisma.rFQ.findMany({
      where,
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

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { title, quantity, unit, description, deadline } = body;

    if (!title || !quantity) {
      return errorResponse("Title and quantity are required", 422);
    }

    // Always try to parse as JSON first
    let finalDescription = description || '';
    let deadlineDate = deadline || null;
    let parsedData = {};

    try {
      if (typeof description === 'string' && description.startsWith('{')) {
        parsedData = JSON.parse(description);
        if (parsedData.neededBy && !deadline) {
          deadlineDate = new Date(parsedData.neededBy);
        }
      }
    } catch (e) {
      // Not JSON, keep as-is
    }

    // ALWAYS save as JSON string (clean format)
    const cleanDescription = JSON.stringify({
      productName: parsedData.productName || title.replace('RFQ: ', ''),
      productId: parsedData.productId || '',
      marketPrice: parsedData.marketPrice || null,
      expectedPrice: parsedData.expectedPrice || null,
      neededBy: parsedData.neededBy || null,
      notes: parsedData.notes || '',
    });

    const rfq = await prisma.rFQ.create({
      data: {
        buyerId: session.userId,
        title,
        description: cleanDescription,
        quantity: parseInt(quantity),
        unit: unit || 'PCS',
        deadline: deadlineDate,
        status: "PUBLISHED",
        isPublic: true,
      },
    });

    return successResponse(rfq, 201);
  } catch (error) {
    console.error("RFQ create error:", error);
    return errorResponse("Failed to create RFQ", 500);
  }
}