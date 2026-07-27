import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

async function getSupplierId(userId) {
  const staff = await prisma.supplierStaff.findFirst({ where: { userId } });
  if (staff) return staff.supplierId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    const supplier = await prisma.supplier.findFirst({ where: { email: user.email } });
    if (supplier) return supplier.id;
  }
  return null;
}

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const supplierId = await getSupplierId(session.userId);
    if (!supplierId) return errorResponse("Supplier not found", 403);

    const { searchParams } = new URL(req.url);
    const buyerId = searchParams.get("buyerId");

    if (buyerId) {
      const messages = await prisma.customerMessage.findMany({
        where: { supplierId, buyerId },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      await prisma.customerMessage.updateMany({
        where: { supplierId, buyerId, senderType: "BUYER", isRead: false },
        data: { isRead: true },
      });

      return successResponse(messages);
    }

    const conversations = await prisma.customerMessage.groupBy({
      by: ["buyerId"],
      where: { supplierId },
      _count: { id: true },
      _max: { createdAt: true },
    });

    const buyerIds = conversations.map(c => c.buyerId);
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, name: true, email: true, profileImage: true },
    });

    const unreadCounts = await prisma.customerMessage.groupBy({
      by: ["buyerId"],
      where: { supplierId, senderType: "BUYER", isRead: false },
      _count: { id: true },
    });

    const buyerMap = {};
    buyers.forEach(b => { buyerMap[b.id] = b; });

    const result = conversations.map(c => ({
      buyerId: c.buyerId,
      buyer: buyerMap[c.buyerId] || null,
      totalMessages: c._count.id,
      lastMessageAt: c._max.createdAt,
      unreadCount: unreadCounts.find(u => u.buyerId === c.buyerId)?._count.id || 0,
    }));

    result.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    return successResponse(result);
  } catch (error) {
    console.error("Messages error:", error);
    return errorResponse("Failed to fetch messages", 500);
  }
}

export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const supplierId = await getSupplierId(session.userId);
    if (!supplierId) return errorResponse("Supplier not found", 403);

    const { buyerId, message } = await req.json();
    if (!buyerId || !message) return errorResponse("buyerId and message required", 422);

    const msg = await prisma.customerMessage.create({
      data: { supplierId, buyerId, senderType: "SUPPLIER", message },
    });

    // ─── SEND NOTIFICATION TO BUYER ───
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { businessName: true },
      });

      NotificationService.send({
        userId: buyerId,
        type: 'IN_APP',
        title: '💬 New Reply',
        message: `${supplier?.businessName || 'A supplier'} replied: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`,
      }).catch(() => {});
    } catch (notifErr) {
      console.error('Message notification error:', notifErr.message);
    }

    return successResponse(msg, 201);
  } catch (error) {
    console.error("Send message error:", error);
    return errorResponse("Failed to send message", 500);
  }
}