import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// Bot auto-reply logic
function getBotReply(message, flowType) {
  const msg = (message || '').toLowerCase();
  
  // COD related
  if (flowType === 'COD' || msg.includes('cod')) {
    if (msg.includes('deposit') || msg.includes('how to')) {
      return 'To deposit COD cash:\n1. Go to Wallet → COD Deposit\n2. Transfer the collected amount to PROCURE bank account\n3. Upload the proof\n4. Admin will verify within 2-4 hours\n\nNeed anything else?';
    }
    if (msg.includes('limit') || msg.includes('reached')) {
      return 'Your COD limit is reached because pending COD is close to your limit. Please deposit the collected cash to increase your limit.\n\nCheck Wallet → COD for details.';
    }
    if (msg.includes('not approved') || msg.includes('pending')) {
      return 'Deposit approvals take 2-4 hours. If it\'s been longer, please wait a bit more or contact our support team for urgent help.';
    }
    return 'Thank you for your COD query. Our team will review and respond shortly. You can also check Wallet → COD for more details.';
  }
  
  // Delivery related
  if (flowType === 'DELIVERY' || msg.includes('delivery')) {
    if (msg.includes('customer not available') || msg.includes('not available')) {
      return 'For customer not available:\n1. Use the Wait Timer (5 min)\n2. Try calling customer\n3. For online orders: Take photo & leave at door\n4. For COD orders: Return to supplier\n\nThis is handled in the delivery screen.';
    }
    if (msg.includes('wrong address') || msg.includes('address')) {
      return 'If the address is wrong:\n1. Contact customer via chat/call\n2. If unreachable, start return flow\n3. Select "Wrong address" as reason\n\nOur team will assist if needed.';
    }
    return 'For delivery issues, please check the delivery screen options. If you need immediate help, our support team will respond shortly.';
  }
  
  // Earnings related
  if (flowType === 'EARNINGS' || msg.includes('earnings') || msg.includes('payment') || msg.includes('settlement')) {
    if (msg.includes('not received') || msg.includes('pending')) {
      return 'Settlements are processed every Monday. If your settlement is pending:\n1. Check if you have a bank account added\n2. Minimum settlement amount is ₹1000\n3. COD pending must be cleared first\n\nCheck Earnings screen for details.';
    }
    if (msg.includes('wrong amount')) {
      return 'If you think the amount is wrong:\n1. Check delivery history\n2. Verify delivery fee + COD collected\n3. Contact support with order ID for correction';
    }
    return 'Your earnings are updated in real-time. Check Earnings screen for Today/Week/Month breakdown.';
  }
  
  // Verification related
  if (flowType === 'VERIFICATION' || msg.includes('verification') || msg.includes('document')) {
    if (msg.includes('rejected') || msg.includes('re-upload')) {
      return 'If documents are rejected:\n1. Check rejection reason in Verification screen\n2. Re-upload with clear photos\n3. Ensure documents are not expired\n4. Wait 2-4 hours for re-verification';
    }
    if (msg.includes('pending')) {
      return 'Verification takes 2-4 hours. Please wait for admin review. You\'ll get a notification when approved.';
    }
    return 'Upload clear photos of your documents for faster verification. Current wait time is 2-4 hours.';
  }
  
  // Vehicle related
  if (flowType === 'VEHICLE' || msg.includes('vehicle')) {
    return 'For vehicle updates:\n1. Go to Profile → Vehicle\n2. Add or update vehicle details\n3. Upload RC document\n4. Wait for verification\n\nYou can add multiple vehicles.';
  }
  
  // Greetings
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return 'Hello! 👋 I\'m PROCURE Support Bot. How can I help you today?\n\nYou can ask about:\n💰 COD Deposit\n📦 Delivery Issues\n💵 Earnings & Settlement\n🪪 Verification\n🛵 Vehicle Update';
  }
  
  if (msg.includes('thank')) {
    return 'You\'re welcome! 😊 Is there anything else I can help you with?';
  }
  
  // Default
  return 'Thank you for reaching out! Our support team will review your message and respond shortly. For urgent issues, please call support at 1800-123-456.';
}

// GET - Partner gets their chat messages (OPEN + history)
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const { searchParams } = new URL(request.url);
    const historyOnly = searchParams.get('history') === 'true';

    if (historyOnly) {
      const resolvedMessages = await prisma.deliveryChat.findMany({
        where: { partnerId: partner.id, status: 'RESOLVED' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      
      const conversations = {};
      resolvedMessages.forEach(msg => {
        const convId = msg.conversationId || new Date(msg.createdAt).toISOString().slice(0, 10);
        if (!conversations[convId]) {
          conversations[convId] = {
            conversationId: convId,
            status: 'RESOLVED',
            resolvedAt: msg.resolvedAt || msg.createdAt,
            preview: msg.message?.slice(0, 60),
            messages: [],
          };
        }
        conversations[convId].messages.push(msg);
      });
      
      return successResponse(Object.values(conversations));
    }

    const [openMessages, resolvedMessages] = await Promise.all([
      prisma.deliveryChat.findMany({
        where: { partnerId: partner.id, status: 'OPEN' },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
      prisma.deliveryChat.findMany({
        where: { partnerId: partner.id, status: 'RESOLVED' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const conversations = {};
    resolvedMessages.forEach(msg => {
      const convId = msg.conversationId || new Date(msg.createdAt).toISOString().slice(0, 10);
      if (!conversations[convId]) {
        conversations[convId] = {
          conversationId: convId,
          status: 'RESOLVED',
          resolvedAt: msg.resolvedAt || msg.createdAt,
          preview: msg.message?.slice(0, 60),
          messages: [],
        };
      }
      conversations[convId].messages.push(msg);
    });

    return successResponse({
      openMessages,
      history: Object.values(conversations),
    });
  } catch (error) {
    return errorResponse('Failed to fetch messages', 500);
  }
}

// POST - Partner sends message (continues existing conversation)
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const body = await request.json();
    const { message, flowType } = body;

    if (!message) return errorResponse('Message required', 400);

    // Find latest OPEN conversation to continue it
    const latestOpenMsg = await prisma.deliveryChat.findFirst({
      where: { partnerId: partner.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });

    const conversationId = latestOpenMsg?.conversationId || `conv-${Date.now()}-${partner.id.slice(0, 6)}`;

    const chat = await prisma.deliveryChat.create({
      data: {
        partnerId: partner.id,
        senderId: session.userId,
        senderType: 'PARTNER',
        message,
        flowType: flowType || null,
        conversationId,
        status: 'OPEN',
      },
    });

    // Auto-reply bot logic
    const botReply = getBotReply(message, flowType);
    if (botReply) {
      setTimeout(async () => {
        try {
          await prisma.deliveryChat.create({
            data: {
              partnerId: partner.id,
              senderId: 'SYSTEM_BOT',
              senderType: 'ADMIN',
              message: botReply,
              conversationId,
              status: 'OPEN',
            },
          });
        } catch (botErr) {
          console.log('Bot reply error:', botErr.message);
        }
      }, 1500); // 1.5 second delay for natural feel
    }

    try {
      const { NotificationService } = await import('@/services/notification.service');
      const adminUsers = await prisma.userRole.findMany({
        where: { role: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } } },
        select: { userId: true },
      });
      
      for (const admin of adminUsers) {
        NotificationService.send({
          userId: admin.userId,
          type: 'IN_APP',
          title: '💬 New Partner Message',
          message: `${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`,
        }).catch(() => {});
      }
    } catch (notifyErr) {
      console.error('Notify admin error:', notifyErr.message);
    }

    return successResponse({ chat }, 201);
  } catch (error) {
    return errorResponse('Failed to send message', 500);
  }
}

// PATCH - Partner marks conversation as resolved
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const body = await request.json();
    const { action } = body;

    if (action === 'RESOLVE') {
      await prisma.deliveryChat.updateMany({
        where: { partnerId: partner.id, status: 'OPEN' },
        data: { 
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      return successResponse({ message: 'Conversation resolved' });
    }

    if (action === 'MARK_READ') {
      await prisma.deliveryChat.updateMany({
        where: { 
          partnerId: partner.id, 
          senderType: 'ADMIN', 
          isRead: false,
          status: 'OPEN',
        },
        data: { isRead: true },
      });
      return successResponse({ message: 'Marked as read' });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    return errorResponse('Failed to resolve conversation', 500);
  }
}