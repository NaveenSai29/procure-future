import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { getKycStatusEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";

// PUT - Approve or Reject
export async function PUT(req, { params }) {
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

    const { id } = await params;
    const body = await req.json();
    const { action, rejectionReason, notes } = body;

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return errorResponse("Action must be APPROVE or REJECT", 400);
    }
    if (action === "REJECT" && !rejectionReason) {
      return errorResponse("Rejection reason is required", 400);
    }

    const document = await prisma.kYCDocument.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, businessName: true, email: true, isVerified: true } } },
    });

    if (!document) return errorResponse("Document not found", 404);
    if (document.status !== "PENDING") return errorResponse(`Document is already ${document.status}`, 400);

    const updatedDoc = await prisma.kYCDocument.update({
      where: { id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        verifiedBy: session.userId,
        verifiedAt: new Date(),
        rejectionReason: action === "REJECT" ? rejectionReason : null,
        notes: notes || document.notes,
      },
    });

    // Auto-verify supplier if all 6 approved
    if (action === "APPROVE" && !document.supplier.isVerified) {
      const allDocs = await prisma.kYCDocument.findMany({
        where: { supplierId: document.supplierId, deletedAt: null },
      });

      const requiredTypes = ["PAN", "GST", "BANK_PROOF", "BUSINESS_REGISTRATION", "IDENTITY_PROOF", "ADDRESS_PROOF"];
      const approvedTypes = allDocs.filter((d) => d.status === "APPROVED").map((d) => d.documentType);
      const allApproved = requiredTypes.every((type) => approvedTypes.includes(type));

      if (allApproved) {
        await prisma.supplier.update({
          where: { id: document.supplierId },
          data: { isVerified: true },
        });

        const staffUser = await prisma.supplierStaff.findFirst({
          where: { supplierId: document.supplierId },
          select: { userId: true },
        });

        if (staffUser) {
          await prisma.notification.create({
            data: {
              userId: staffUser.userId,
              type: "KYC_VERIFIED",
              title: "🎉 KYC Verification Complete!",
              message: `All documents verified. Your store "${document.supplier.businessName}" is now LIVE!`,
            },
          });
        }

        // Send KYC approval email
        if (document.supplier.email) {
          const emailTemplate = getKycStatusEmail({
            supplierName: document.supplier.businessName,
            status: 'APPROVED',
            businessName: document.supplier.businessName,
          });
          EmailService.sendEmail({
            to: document.supplier.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          }).catch(err => console.error('KYC approval email failed:', err.message));
        }

        await prisma.auditLog.create({
          data: {
            userId: session.userId,
            action: "SUPPLIER_AUTO_VERIFIED",
            entity: "Supplier",
            entityId: document.supplierId,
            newValue: { isVerified: true },
          },
        });
      }
    }

    // Notify for rejection
    if (action === "REJECT") {
      const staffUser = await prisma.supplierStaff.findFirst({
        where: { supplierId: document.supplierId },
        select: { userId: true },
      });

      if (staffUser) {
        await prisma.notification.create({
          data: {
            userId: staffUser.userId,
            type: "KYC_REJECTED",
            title: `⚠️ Document Rejected: ${document.documentType}`,
            message: `Your ${document.documentType} was rejected. Reason: ${rejectionReason}. Please re-upload.`,
          },
        });
      }

      // Send KYC rejection email
      if (document.supplier.email) {
        const emailTemplate = getKycStatusEmail({
          supplierName: document.supplier.businessName,
          status: 'REJECTED',
          businessName: document.supplier.businessName,
        });
        EmailService.sendEmail({
          to: document.supplier.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        }).catch(err => console.error('KYC rejection email failed:', err.message));
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: `KYC_${action}`,
        entity: "KYCDocument",
        entityId: id,
        oldValue: { status: "PENDING", documentType: document.documentType },
        newValue: { status: action, rejectionReason: action === "REJECT" ? rejectionReason : null },
      },
    });

    return successResponse({
      document: updatedDoc,
      message: action === "APPROVE" ? "Document approved" : "Document rejected",
    });
  } catch (error) {
    console.error("KYC Update Error:", error);
    return errorResponse(error.message || "Failed to update document", 500);
  }
}