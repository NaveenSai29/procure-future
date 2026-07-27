import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - List all tickets for admin
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true },
    });
    const roleNames = userRoles.map((ur) => ur.role.name);
    if (!roleNames.includes("ADMIN") && !roleNames.includes("SUPER_ADMIN")) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "OPEN";
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const assignedTo = searchParams.get("assignedTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = {};
    if (status !== "ALL") where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { ticketNumber: { contains: search } },
        { supplier: { businessName: { contains: search } } },
      ];
    }

    const [tickets, total, stats] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          supplier: { select: { id: true, businessName: true, logo: true } },
          user: { select: { id: true, name: true, email: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
      prisma.$transaction([
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
        prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
        prisma.supportTicket.count({ where: { status: "CLOSED" } }),
        prisma.supportTicket.count({ where: { priority: "CRITICAL", status: { not: "CLOSED" } } }),
      ]),
    ]);

    return successResponse({
      tickets,
      stats: {
        open: stats[0],
        inProgress: stats[1],
        resolved: stats[2],
        closed: stats[3],
        critical: stats[4],
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin tickets error:", error);
    return errorResponse(error.message, 500);
  }
}