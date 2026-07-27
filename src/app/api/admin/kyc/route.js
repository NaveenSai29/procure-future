import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    // Check admin role
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true },
    });
    const roleNames = userRoles.map((ur) => ur.role.name);
    const isAdmin = roleNames.includes("ADMIN") || roleNames.includes("SUPER_ADMIN");
    if (!isAdmin) return errorResponse("Forbidden - Admin access required", 403);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";
    const supplierId = searchParams.get("supplierId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = { deletedAt: null };
    if (status && status !== "ALL") where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [documents, total] = await Promise.all([
      prisma.kYCDocument.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true, businessName: true, email: true, mobile: true,
              isVerified: true, logo: true, gstin: true, businessType: true, createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.kYCDocument.count({ where }),
    ]);

    const grouped = {};
    documents.forEach((doc) => {
      if (!grouped[doc.supplierId]) {
        grouped[doc.supplierId] = {
          supplier: doc.supplier,
          documents: [],
          pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalCount: 0,
        };
      }
      grouped[doc.supplierId].documents.push(doc);
      grouped[doc.supplierId].totalCount++;
      if (doc.status === "PENDING") grouped[doc.supplierId].pendingCount++;
      if (doc.status === "APPROVED") grouped[doc.supplierId].approvedCount++;
      if (doc.status === "REJECTED") grouped[doc.supplierId].rejectedCount++;
    });

    const [pendingCount, approvedCount, rejectedCount, suppliersPending] = await Promise.all([
      prisma.kYCDocument.count({ where: { status: "PENDING", deletedAt: null } }),
      prisma.kYCDocument.count({ where: { status: "APPROVED", deletedAt: null } }),
      prisma.kYCDocument.count({ where: { status: "REJECTED", deletedAt: null } }),
      prisma.kYCDocument.findMany({
        where: { status: "PENDING", deletedAt: null },
        select: { supplierId: true },
        distinct: ["supplierId"],
      }).then((r) => r.length),
    ]);

    return successResponse({
      documents,
      grouped: Object.values(grouped),
      stats: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount, suppliersPending },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin KYC List Error:", error);
    return errorResponse(error.message || "Failed to fetch KYC documents", 500);
  }
}