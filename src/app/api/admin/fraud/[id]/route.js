import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    const alert = await prisma.fraudAlert.update({
      where: { id },
      data: {
        status: status || "REVIEWED",
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        description: notes ? `${alert.description} | Notes: ${notes}` : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FRAUD_ALERT_UPDATED",
        entity: "FraudAlert",
        entityId: id,
        newValue: { status: alert.status },
      },
    });

    return successResponse(alert);
  } catch (error) {
    console.error("Fraud update error:", error);
    return errorResponse("Failed to update alert", 500);
  }
}