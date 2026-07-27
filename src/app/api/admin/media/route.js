import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

// GET - List all media files
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || "ALL";
    const fileType = searchParams.get("fileType") || "ALL";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");

    const where = {};
    if (entityType !== "ALL") where.entityType = entityType;
    if (fileType !== "ALL") {
      where.fileType = fileType === "IMAGE" ? { startsWith: "image/" } : { not: { startsWith: "image/" } };
    }
    if (search) {
      where.OR = [
        { originalName: { contains: search } },
        { fileName: { contains: search } },
        { entityType: { contains: search } },
      ];
    }

    const [media, total, stats, entityTypes] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.media.count({ where }),
      prisma.$transaction([
        prisma.media.count(),
        prisma.media.count({ where: { fileType: { startsWith: "image/" } } }),
        prisma.media.count({ where: { fileType: { not: { startsWith: "image/" } } } }),
        prisma.media.aggregate({ _sum: { fileSize: true } }),
        // Count orphaned (not linked to any entity)
        prisma.media.count({ where: { entityId: null } }),
      ]),
      prisma.media.findMany({
        select: { entityType: true },
        distinct: ["entityType"],
      }),
    ]);

    return successResponse({
      media,
      stats: {
        total: stats[0],
        images: stats[1],
        documents: stats[2],
        totalSize: stats[3]._sum.fileSize || 0,
        orphaned: stats[4],
      },
      entityTypes: entityTypes.map((e) => e.entityType),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Media list error:", error);
    return errorResponse("Failed to fetch media", 500);
  }
}

// DELETE - Delete media files (bulk or single)
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids"); // comma-separated for bulk

    const idsToDelete = id ? [id] : ids ? ids.split(",") : [];

    if (idsToDelete.length === 0) {
      return errorResponse("No media IDs provided", 400);
    }

    const mediaFiles = await prisma.media.findMany({
      where: { id: { in: idsToDelete } },
    });

    // Delete physical files
    for (const file of mediaFiles) {
      try {
        const filePath = path.join(process.cwd(), "public", file.fileUrl);
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Failed to delete file: ${file.fileUrl}`, err.message);
      }
    }

    // Delete database records
    await prisma.media.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "MEDIA_DELETED",
        entity: "Media",
        newValue: { count: idsToDelete.length, fileNames: mediaFiles.map((f) => f.originalName) },
      },
    });

    return successResponse({ message: `${idsToDelete.length} files deleted` });
  } catch (error) {
    console.error("Media delete error:", error);
    return errorResponse("Failed to delete media", 500);
  }
}