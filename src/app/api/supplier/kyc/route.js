import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const DOCUMENT_TYPES = [
  "PAN", "GST", "BANK_PROOF", "BUSINESS_REGISTRATION", "IDENTITY_PROOF", "ADDRESS_PROOF",
];

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// GET - Fetch supplier's KYC documents
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      select: { supplierId: true, supplier: { select: { businessName: true, isVerified: true } } },
    });

    if (!staff) return errorResponse("No supplier account found", 404);

    const documents = await prisma.kYCDocument.findMany({
      where: { supplierId: staff.supplierId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const uploadedCount = documents.length;
    const approvedCount = documents.filter((d) => d.status === "APPROVED").length;
    const completionPercentage = Math.round((uploadedCount / DOCUMENT_TYPES.length) * 100);

    return successResponse({
      supplier: {
        id: staff.supplierId,
        businessName: staff.supplier.businessName,
        isVerified: staff.supplier.isVerified,
      },
      documents,
      progress: {
        uploaded: uploadedCount,
        approved: approvedCount,
        total: DOCUMENT_TYPES.length,
        completionPercentage,
        isComplete: uploadedCount === DOCUMENT_TYPES.length && approvedCount === DOCUMENT_TYPES.length,
      },
    });
  } catch (error) {
    console.error("KYC GET Error:", error);
    return errorResponse(error.message || "Failed to fetch KYC documents", 500);
  }
}

// POST - Upload KYC document
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      select: { supplierId: true, supplier: { select: { isVerified: true } } },
    });

    if (!staff) return errorResponse("No supplier account found", 404);

    const formData = await req.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");
    const documentNumber = formData.get("documentNumber") || null;
    const notes = formData.get("notes") || null;

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return errorResponse(`Invalid document type. Must be: ${DOCUMENT_TYPES.join(", ")}`, 400);
    }

    if (!file) return errorResponse("File is required", 400);
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return errorResponse("Only PDF, JPG, PNG allowed", 400);
    if (file.size > MAX_FILE_SIZE) return errorResponse("File size exceeds 5MB limit", 400);

    const existing = await prisma.kYCDocument.findUnique({
      where: { supplierId_documentType: { supplierId: staff.supplierId, documentType } },
    });

    if (existing && existing.status !== "REJECTED") {
      return errorResponse(`A ${documentType} document already exists. Delete it first to re-upload.`, 409);
    }

    if (existing) {
      await prisma.kYCDocument.delete({ where: { id: existing.id } });
    }

    // Save file
    const uploadDir = path.join(process.cwd(), "public", "uploads", "kyc", staff.supplierId);
    await mkdir(uploadDir, { recursive: true });

    const fileExtension = file.name.split(".").pop();
    const fileName = `${documentType.toLowerCase()}_${crypto.randomUUID()}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/kyc/${staff.supplierId}/${fileName}`;

    const document = await prisma.kYCDocument.create({
      data: {
        supplierId: staff.supplierId,
        documentType,
        documentNumber,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        status: "PENDING",
        notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "KYC_DOCUMENT_UPLOADED",
        entity: "KYCDocument",
        entityId: document.id,
        newValue: { documentType, documentNumber },
      },
    });

    return successResponse({ message: "Document uploaded. Pending verification.", document }, 201);
  } catch (error) {
    console.error("KYC Upload Error:", error);
    return errorResponse(error.message || "Failed to upload document", 500);
  }
}

// DELETE - Remove a KYC document
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      select: { supplierId: true },
    });

    if (!staff) return errorResponse("No supplier account found", 404);

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");
    if (!documentId) return errorResponse("Document ID is required", 400);

    const document = await prisma.kYCDocument.findFirst({
      where: { id: documentId, supplierId: staff.supplierId },
    });

    if (!document) return errorResponse("Document not found", 404);

    await prisma.kYCDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    return successResponse({ message: "Document deleted" });
  } catch (error) {
    console.error("KYC Delete Error:", error);
    return errorResponse(error.message || "Failed to delete document", 500);
  }
}