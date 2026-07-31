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
    const { title, quantity, unit, description, deadline, supplierId, productId } = body;

    if (!title || !quantity) {
      return errorResponse("Title and quantity are required", 422);
    }

    let parsedData = {};
    try {
      if (typeof description === 'string' && description.startsWith('{')) {
        parsedData = JSON.parse(description);
      }
    } catch (e) {}

    // ─── DUPLICATE CHECK ───
    if (productId && supplierId) {
      const existingRfq = await prisma.rFQ.findFirst({
        where: {
          buyerId: session.userId,
          status: { in: ['PUBLISHED', 'DRAFT'] },
          items: { some: { productId: productId } },
          responses: { some: { supplierId: supplierId } },
        },
      });

      if (existingRfq) {
        return errorResponse(
          `You already have an active RFQ for this product from this supplier (RFQ #${existingRfq.id.slice(0, 8)}). Please close it before creating a new one.`,
          409
        );
      }
    }

    // ─── AUTO DEADLINE: 7 days from now, or use provided deadline ───
    let deadlineDate = deadline ? new Date(deadline) : null;
    if (!deadlineDate) {
      if (parsedData.neededBy) {
        deadlineDate = new Date(parsedData.neededBy);
      } else {
        // Default: 7 days from now
        deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    // RFQ price expires 7 days after approval
    const rfqExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const cleanDescription = JSON.stringify({
      productName: parsedData.productName || title.replace('RFQ: ', ''),
      productId: parsedData.productId || productId || '',
      supplierId: supplierId || parsedData.supplierId || '',
      marketPrice: parsedData.marketPrice || null,
      expectedPrice: parsedData.expectedPrice || null,
      neededBy: parsedData.neededBy || null,
      notes: parsedData.notes || '',
      rfqExpiry: rfqExpiryDate.toISOString(),
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
        items: productId ? {
          create: [{
            productId: productId,
            quantity: parseInt(quantity),
            unit: unit || 'PCS',
          }]
        } : undefined,
      },
    });

    return successResponse(rfq, 201);
  } catch (error) {
    console.error("RFQ create error:", error);
    return errorResponse("Failed to create RFQ", 500);
  }
}