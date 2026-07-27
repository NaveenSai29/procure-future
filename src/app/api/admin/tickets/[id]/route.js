import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - Single ticket detail
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
        supplier: { select: { id: true, businessName: true, logo: true, email: true, mobile: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) return errorResponse("Ticket not found", 404);
    return successResponse({ ticket });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

// PUT - Admin reply or internal note
export async function PUT(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await req.json();
    const { message, isInternal } = body;

    if (!message) return errorResponse("Message is required", 400);

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return errorResponse("Ticket not found", 404);

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: session.userId,
        senderType: "ADMIN",
        message,
        isInternal: isInternal || false,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, profileImage: true } },
      },
    });

    // If not internal note, update status to WAITING if currently IN_PROGRESS
    if (!isInternal && ticket.status === "IN_PROGRESS") {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "WAITING" },
      });
    }

    // If internal note, keep status
    return successResponse({ message: ticketMessage });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

// PATCH - Update ticket (status, priority, assignment)
export async function PATCH(req, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await req.json();
    const { status, priority, assignedTo, action } = body;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return errorResponse("Ticket not found", 404);

    const updateData = {};

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    if (status === "RESOLVED") updateData.resolvedAt = new Date();
    if (status === "CLOSED") updateData.closedAt = new Date();

    if (Object.keys(updateData).length > 0) {
      await prisma.supportTicket.update({
        where: { id },
        data: updateData,
      });

      // Add system message for status changes
      if (status) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: id,
            senderId: session.userId,
            senderType: "SYSTEM",
            message: `Ticket status changed to ${status}${priority ? `, priority set to ${priority}` : ""}`,
            isInternal: true,
          },
        });
      }
    }

    // Handle resolve action
    if (action === "RESOLVE") {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });

      await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: session.userId,
          senderType: "SYSTEM",
          message: "Ticket resolved by admin",
        },
      });

      // Notify supplier
      if (ticket.supplierId) {
        const staff = await prisma.supplierStaff.findFirst({
          where: { supplierId: ticket.supplierId },
          select: { userId: true },
        });
        if (staff) {
          await prisma.notification.create({
            data: {
              userId: staff.userId,
              type: "TICKET_RESOLVED",
              title: `Ticket ${ticket.ticketNumber} Resolved`,
              message: `Your support ticket "${ticket.subject}" has been resolved.`,
            },
          });
        }
      }
    }

    const updated = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          include: { sender: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return successResponse({ ticket: updated });
  } catch (error) {
    console.error("Update ticket error:", error);
    return errorResponse(error.message, 500);
  }
}