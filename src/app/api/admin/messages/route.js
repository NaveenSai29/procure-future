import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { EmailService } from "@/services/email.service";
import { getBroadcastEmail } from "@/services/email-templates.service";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'PROCURE';

// GET - List all conversations (admin view)
export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const userRoles = user.roles.map(r => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const supplierId = searchParams.get("supplierId");
    const showArchived = searchParams.get("showArchived");

    // Get messages with specific user + supplier pair
    if (userId && supplierId) {
      const messages = await prisma.customerMessage.findMany({
        where: { 
          buyerId: userId, 
          supplierId,
          // If showArchived=true, show all; otherwise show only active
          ...(showArchived === 'true' ? {} : { isArchived: false }),
        },
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          supplier: { select: { id: true, businessName: true } },
        },
      });

      return successResponse(messages);
    }

    // Identify PROCURE Support supplier
    const supportSupplier = await prisma.supplier.findFirst({
      where: { businessName: 'PROCURE Support' },
    });

    // Get all unique conversations (including archived)
    const allMessages = await prisma.customerMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, businessName: true } },
      },
    });

    // Group by buyer-supplier pair
    const conversations = {};
    for (const msg of allMessages) {
      const key = `${msg.buyerId}-${msg.supplierId}`;
      if (!conversations[key]) {
        conversations[key] = {
          buyer: msg.buyer,
          supplier: msg.supplier,
          isSupportChat: supportSupplier && msg.supplierId === supportSupplier.id,
          isArchived: msg.isArchived,
          archivedAt: msg.archivedAt,
          lastMessage: msg.message?.substring(0, 100),
          lastMessageAt: msg.createdAt,
          lastSender: msg.senderType,
          messageCount: 0,
        };
      }
      conversations[key].messageCount++;
    }

    return successResponse({
      conversations: Object.values(conversations).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)),
    });
  } catch (error) {
    console.error("Admin messages error:", error);
    return errorResponse("Failed to fetch messages", 500);
  }
}

// POST - Admin sends message/broadcast
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const userRoles = user.roles.map(r => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const body = await req.json();
    const { userId, supplierId, message, broadcastType, title } = body;

    // Direct message to user from admin (as Support Team)
    if (userId && supplierId && message) {
      const msg = await prisma.customerMessage.create({
        data: {
          supplierId,
          buyerId: userId,
          senderType: "ADMIN",
          message: `[Support Team] ${message}`,
        },
      });

      // Notify the buyer
      NotificationService.send({
        userId,
        type: 'IN_APP',
        title: '📢 Message from Support Team',
        message: message.substring(0, 100),
      }).catch(() => {});

      // Notify supplier staff so they see the message
      const staff = await prisma.supplierStaff.findFirst({
        where: { supplierId },
        select: { userId: true },
      });
      if (staff) {
        NotificationService.send({
          userId: staff.userId,
          type: 'IN_APP',
          title: '📢 New message from Support Team',
          message: `Regarding buyer: ${message.substring(0, 80)}`,
        }).catch(() => {});
      }

      return successResponse(msg, 201);
    }

    // Broadcast to users (ALL, BUYERS, SUPPLIERS)
    if ((broadcastType === 'ALL' || broadcastType === 'BUYERS' || broadcastType === 'SUPPLIERS') && message) {
      const where = { isActive: true };

      if (broadcastType === 'BUYERS') {
        where.roles = { some: { role: { name: 'BUYER' } } };
      } else if (broadcastType === 'SUPPLIERS') {
        where.roles = { some: { role: { name: { in: ['SUPPLIER', 'SUPPLIER_ADMIN'] } } } };
      }

      const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true },
      });

      const audienceLabel = broadcastType === 'BUYERS' ? 'buyers' : broadcastType === 'SUPPLIERS' ? 'suppliers' : 'users';

      // Send in-app notifications
      for (const u of users) {
        NotificationService.send({
          userId: u.id,
          type: 'IN_APP',
          title: title || `📢 Announcement from ${APP_NAME}`,
          message,
        }).catch(() => {});
      }

      // Send premium email
      for (const u of users) {
        if (u.email) {
          const emailTemplate = getBroadcastEmail({
            name: u.name,
            title: title || `Important Update from ${APP_NAME}`,
            message,
          });
          EmailService.sendEmail({
            to: u.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          }).catch(() => {});
        }
      }

      return successResponse({
        message: `Broadcast sent to ${users.length} ${audienceLabel}`,
        recipientCount: users.length,
        audience: audienceLabel,
      });
    }

    return errorResponse("userId+supplierId+message or broadcastType+message required", 422);
  } catch (error) {
    console.error("Admin send message error:", error);
    return errorResponse("Failed to send message", 500);
  }
}

// DELETE - Admin ends conversation (clears messages)
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const userRoles = user.roles.map(r => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const supplierId = searchParams.get("supplierId");
    
    if (!userId || !supplierId) return errorResponse("userId and supplierId required", 422);

    // Archive all messages for this buyer+supplier (don't delete)
    await prisma.customerMessage.updateMany({
      where: { 
        supplierId, 
        buyerId: userId,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return successResponse({ message: "Conversation ended by admin" });
  } catch (error) {
    console.error("Admin delete messages error:", error);
    return errorResponse("Failed to end conversation", 500);
  }
}