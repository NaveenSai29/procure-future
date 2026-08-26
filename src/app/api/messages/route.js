import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

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
      
      // If SUPPORT, find or create PROCURE Support supplier from admin settings
      if (supplierId === 'SUPPORT') {
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
        
        effectiveSupplierId = supportSupplier.id;
      }

      const messages = await prisma.customerMessage.findMany({
        where: { supplierId: effectiveSupplierId, buyerId },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      // Mark supplier messages as read
      await prisma.customerMessage.updateMany({
        where: { supplierId: effectiveSupplierId, buyerId, senderType: "SUPPLIER", isRead: false },
        data: { isRead: true },
      });

      return successResponse(messages);
    }

    // Get all conversations
    const conversations = await prisma.customerMessage.groupBy({
      by: ["supplierId"],
      where: { buyerId },
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

// POST - Buyer sends message to supplier
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
      let supportSupplier = await prisma.supplier.findFirst({
        where: { businessName: 'PROCURE Support' },
      });
      
      if (!supportSupplier) {
        supportSupplier = await prisma.supplier.create({
          data: {
            businessName: 'PROCURE Support',
            email: 'support@vantagemarketspvt.com',
            mobile: '1800123456',
            isVerified: true,
            isActive: true,
          },
        });
      }
      
      effectiveSupplierId = supportSupplier.id;
    }

    const msg = await prisma.customerMessage.create({
      data: { supplierId: effectiveSupplierId, buyerId, senderType: "BUYER", message },
    });

    // ─── SEND NOTIFICATION TO SUPPLIER ───
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

    return successResponse(msg, 201);
  } catch (error) {
    console.error("Send message error:", error);
    return errorResponse("Failed to send message", 500);
  }
}