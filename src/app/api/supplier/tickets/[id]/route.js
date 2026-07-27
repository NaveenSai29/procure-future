import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - Single ticket with messages
export async function GET(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          include: { sender: { select: { id: true, name: true, email: true, profileImage: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
        supplier: { select: { businessName: true } },
      },
    });

    if (!ticket) return errorResponse("Ticket not found", 404);

    // Verify ownership
    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId, supplierId: ticket.supplierId },
    });
    if (!staff) return errorResponse("Access denied", 403);

    return successResponse({ ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    return errorResponse(error.message, 500);
  }
}

// PUT - Reply to ticket
export async function PUT(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message) return errorResponse("Message is required", 400);

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return errorResponse("Ticket not found", 404);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId, supplierId: ticket.supplierId },
    });
    if (!staff) return errorResponse("Access denied", 403);

    if (ticket.status === "CLOSED") {
      return errorResponse("Cannot reply to a closed ticket", 400);
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: session.userId,
        senderType: "SUPPLIER",
        message,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, profileImage: true } },
      },
    });

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return successResponse({ message: ticketMessage });
  } catch (error) {
    console.error("Reply error:", error);
    return errorResponse(error.message, 500);
  }
}

// PATCH - Close ticket (supplier can only close)
export async function PATCH(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return errorResponse("Ticket not found", 404);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId, supplierId: ticket.supplierId },
    });
    if (!staff) return errorResponse("Access denied", 403);

    if (action === "CLOSE") {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date() },
      });

      // Add system message
      await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: session.userId,
          senderType: "SYSTEM",
          message: "Ticket closed by supplier",
          isInternal: false,
        },
      });

      return successResponse({ message: "Ticket closed" });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Update ticket error:", error);
    return errorResponse(error.message, 500);
  }
}