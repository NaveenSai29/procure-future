import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

// Helper: Get or create PROCURE Support supplier
async function getOrCreateSupportSupplier() {
  let supportSupplier = await prisma.supplier.findFirst({
    where: { businessName: 'PROCURE Support' },
  });
  
  if (!supportSupplier) {
    // Get support details from admin settings
    const settings = await prisma.systemSetting.findMany({
      where: { category: 'GENERAL' },
    });
    
    const settingsMap = {};
    settings.forEach(s => {
      try { settingsMap[s.key] = JSON.parse(s.value); } 
      catch { settingsMap[s.key] = s.value; }
    });
    
    supportSupplier = await prisma.supplier.create({
      data: {
        businessName: 'PROCURE Support',
        businessType: 'SERVICE',
        email: settingsMap.supportEmail,
        mobile: settingsMap.supportPhone,
        gstin: 'SUPPORT00000',
        isVerified: true,
        isActive: true,
        codEnabled: false,
      },
    });
  }
  
  return supportSupplier;
}

// GET - Get buyer's conversations with suppliers
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const buyerId = session.userId;
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    // Get messages with a specific supplier (or SUPPORT)
    if (supplierId) {
      let effectiveSupplierId = supplierId;
      
      // If SUPPORT, find or create PROCURE Support supplier
      if (supplierId === 'SUPPORT') {
        const supportSupplier = await getOrCreateSupportSupplier();
        effectiveSupplierId = supportSupplier.id;
      }

      const messages = await prisma.customerMessage.findMany({
        where: { supplierId: effectiveSupplierId, buyerId, isArchived: false },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      // Mark supplier messages as read
      await prisma.customerMessage.updateMany({
        where: { supplierId: effectiveSupplierId, buyerId, senderType: { in: ["SUPPLIER", "ADMIN"] }, isRead: false },
        data: { isRead: true },
      });

      return successResponse(messages);
    }

    // Get all conversations (excluding PROCURE Support from this list)
    const supportSupplier = await prisma.supplier.findFirst({
      where: { businessName: 'PROCURE Support' },
    });

    const conversations = await prisma.customerMessage.groupBy({
      by: ["supplierId"],
      where: { 
        buyerId,
        ...(supportSupplier && { supplierId: { not: supportSupplier.id } }),
      },
      _count: { id: true },
      _max: { createdAt: true },
    });

    const supplierIds = conversations.map(c => c.supplierId);
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, businessName: true, logo: true },
    });

    const unreadCounts = await prisma.customerMessage.groupBy({
      by: ["supplierId"],
      where: { buyerId, senderType: "SUPPLIER", isRead: false },
      _count: { id: true },
    });

    const supplierMap = {};
    suppliers.forEach(s => { supplierMap[s.id] = s; });

    const result = conversations.map(c => ({
      supplierId: c.supplierId,
      supplier: supplierMap[c.supplierId] || null,
      totalMessages: c._count.id,
      lastMessageAt: c._max.createdAt,
      unreadCount: unreadCounts.find(u => u.supplierId === c.supplierId)?._count.id || 0,
    }));

    result.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    return successResponse(result);
  } catch (error) {
    console.error("Messages error:", error);
    return errorResponse("Failed to fetch messages", 500);
  }
}

// POST - Buyer sends message to supplier or support
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const buyerId = session.userId;
    const { supplierId, message } = await req.json();
    
    if (!supplierId || !message) return errorResponse("supplierId and message required", 422);

    let effectiveSupplierId = supplierId;
    
    // If SUPPORT, find or create PROCURE Support supplier
    if (supplierId === 'SUPPORT') {
      const supportSupplier = await getOrCreateSupportSupplier();
      effectiveSupplierId = supportSupplier.id;
    }

    const msg = await prisma.customerMessage.create({
      data: { supplierId: effectiveSupplierId, buyerId, senderType: "BUYER", message },
    });

    // Send notification - only for regular suppliers (not SUPPORT)
    if (supplierId !== 'SUPPORT') {
      try {
        const staff = await prisma.supplierStaff.findFirst({
          where: { supplierId: effectiveSupplierId },
          select: { userId: true },
        });

        if (staff) {
          const buyer = await prisma.user.findUnique({
            where: { id: buyerId },
            select: { name: true },
          });

          NotificationService.send({
            userId: staff.userId,
            type: 'IN_APP',
            title: '💬 New Message',
            message: `${buyer?.name || 'A buyer'} sent you a message: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`,
          }).catch(() => {});
        }
      } catch (notifErr) {
        console.error('Message notification error:', notifErr.message);
      }
    }

    return successResponse(msg, 201);
  } catch (error) {
    console.error("Send message error:", error);
    return errorResponse("Failed to send message", 500);
  }
}

// DELETE - Clear all messages with a supplier (when conversation ends)
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    
    if (!supplierId) return errorResponse("supplierId required", 422);

    let effectiveSupplierId = supplierId;
    
    // If SUPPORT, find the actual supplier ID
    if (supplierId === 'SUPPORT') {
      const supportSupplier = await prisma.supplier.findFirst({
        where: { businessName: 'PROCURE Support' },
      });
      if (supportSupplier) {
        effectiveSupplierId = supportSupplier.id;
      }
    }

    // Archive all messages for this buyer+supplier (don't delete)
    await prisma.customerMessage.updateMany({
      where: { 
        supplierId: effectiveSupplierId, 
        buyerId: session.userId,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return successResponse({ message: "Conversation archived" });
  } catch (error) {
    console.error("Delete messages error:", error);
    return errorResponse("Failed to delete messages", 500);
  }
}