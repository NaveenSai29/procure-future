import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { verifyGstinFromPortal, validateGstinFormat } from "@/services/gst.service";
import { getSupplierWelcomeEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";
import { NotificationService } from "@/services/notification.service";

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { 
      businessName, businessType, description, gstin, pan, mobile, email,
      storageType, storageName, storageAddress, storageCity, storageState, storagePincode 
    } = body;

    if (!businessName || !businessType || !gstin || !mobile) {
      return errorResponse("businessName, businessType, gstin, and mobile are required", 422);
    }

    const formatCheck = validateGstinFormat(gstin);
    if (!formatCheck.valid) {
      return errorResponse(`Invalid GSTIN: ${formatCheck.error}`, 422);
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: { OR: [{ gstin }, { mobile }] },
    });
    if (existingSupplier) {
      return errorResponse("A supplier with this GSTIN or mobile already exists", 409);
    }

    // Get user info for email
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    });

    // Get AI generation settings for free credits (admin controlled)
    let aiSettings = await prisma.aIGenerationSetting.findFirst();
    
    // Create default settings if not exist (will be updated by admin later)
    if (!aiSettings) {
      aiSettings = await prisma.aIGenerationSetting.create({
        data: {
          freeCredits: 100,
          maxGenerationsPerProduct: 3,
          creditCostPerGeneration: 1,
          creditPricePerUnit: 1.0,
          isEnabled: true,
        },
      });
    }
    
    const freeCredits = aiSettings.freeCredits;

    const supplier = await prisma.supplier.create({
      data: {
        businessName,
        businessType,
        description,
        gstin,
        pan: pan || null,
        mobile,
        email: email || user?.email || null,
        aiCredits: freeCredits,
        staff: {
          create: {
            userId: session.userId,
            role: "MANAGER",
          },
        },
      },
    });

    // Auto-verify GSTIN in background
    verifyGstinFromPortal(gstin).then(result => {
      if (result.verified && result.status === 'ACTIVE') {
        console.log(`GST auto-verified for supplier ${supplier.id}: ${result.businessName}`);
      }
    }).catch(err => {
      console.error(`GST auto-verification error for ${supplier.id}:`, err.message);
    });

    // Auto-create first warehouse
    if (storageType) {
      const warehouseName = storageName || getDefaultWarehouseName(storageType, businessName);
      const warehouseAddress = storageAddress || "Same as business address";
      
      await prisma.warehouse.create({
        data: {
          supplierId: supplier.id,
          name: warehouseName,
          addressLine1: warehouseAddress,
          city: storageCity || "Not specified",
          state: storageState || "Not specified",
          pincode: storagePincode || "000000",
        },
      });
    }

    // Add SUPPLIER role to user
    const supplierRole = await prisma.role.upsert({
      where: { name: "SUPPLIER" },
      update: {},
      create: { name: "SUPPLIER", description: "Supplier role", isSystem: true },
    });

    await prisma.userRole.create({
      data: { userId: session.userId, roleId: supplierRole.id },
    });

    // Create notification preferences for supplier
    await NotificationService.createPreferences(session.userId).catch(() => {});

    // Send supplier welcome email (non-blocking)
    if (user?.email || email) {
      const recipientEmail = email || user?.email;
      const recipientName = user?.name || businessName;
      const welcomeEmail = getSupplierWelcomeEmail({ 
        businessName, 
        name: recipientName 
      });
      
      EmailService.sendEmail({
        to: recipientEmail,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
      }).catch(err => console.error('Supplier welcome email failed:', err.message));
    }

    // Send in-app notification
    await NotificationService.send({
      userId: session.userId,
      type: 'IN_APP',
      title: 'Supplier Account Created! 🎉',
      message: `Your supplier account "${businessName}" has been created. Upload KYC documents to get verified and go LIVE.`,
    }).catch(() => {});

    return successResponse({ supplier }, 201);
  } catch (error) {
    console.error("Supplier register error:", error);
    return errorResponse(error.message || "Failed to register supplier", 500);
  }
}

function getDefaultWarehouseName(type, businessName) {
  const names = {
    RETAIL: `${businessName} - Shop`,
    WHOLESALE: `${businessName} - Godown`,
    DISTRIBUTOR: `${businessName} - Distribution Center`,
    MANUFACTURER: `${businessName} - Factory Warehouse`,
    IMPORTER: `${businessName} - Import Warehouse`,
  };
  return names[type] || `${businessName} - Main Storage`;
}