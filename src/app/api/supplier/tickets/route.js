import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import crypto from "crypto";

// GET - List supplier's tickets
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      select: { supplierId: true },
    });
    if (!staff) return errorResponse("No supplier account found", 404);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const priority = searchParams.get("priority");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = { supplierId: staff.supplierId };
    if (status !== "ALL") where.status = status;
    if (priority) where.priority = priority;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          messages: { take: 1, orderBy: { createdAt: "desc" } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return successResponse({
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    return errorResponse(error.message || "Failed to fetch tickets", 500);
  }
}

// POST - Create new ticket
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      select: { supplierId: true },
    });
    if (!staff) return errorResponse("No supplier account found", 404);

    const body = await req.json();
    const { subject, description, category, priority } = body;

    if (!subject || !description) {
      return errorResponse("Subject and description are required", 400);
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        supplierId: staff.supplierId,
        userId: session.userId,
        subject,
        description,
        category: category || "GENERAL",
        priority: priority || "MEDIUM",
        messages: {
          create: {
            senderId: session.userId,
            senderType: "SUPPLIER",
            message: description,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    // Notify admins (optional - create notification for admin users)
    const admins = await prisma.userRole.findMany({
      where: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } },
      select: { userId: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          type: "NEW_TICKET",
          title: `New Support Ticket: ${ticketNumber}`,
          message: `${subject}\nPriority: ${priority}\nCategory: ${category}`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "TICKET_CREATED",
        entity: "SupportTicket",
        entityId: ticket.id,
        newValue: { ticketNumber, subject, category, priority },
      },
    });

    return successResponse({ ticket }, 201);
  } catch (error) {
    console.error("Create ticket error:", error);
    return errorResponse(error.message || "Failed to create ticket", 500);
  }
}