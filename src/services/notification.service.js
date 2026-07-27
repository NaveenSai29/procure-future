import prisma from '@/lib/prisma';

export class NotificationService {
  /**
   * Create and send a notification to a user
   */
  static async send({ userId, type, title, message, templateId = null, data = null }) {
    try {
      // Check user preferences
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      // Create in-app notification always
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          templateId,
          data,
          isSent: type !== 'IN_APP'
        }
      });

      // Handle different notification types
      switch (type) {
        case 'EMAIL':
          if (prefs?.emailEnabled !== false) {
            await this.queueEmail(userId, title, message, templateId);
          }
          break;
        case 'SMS':
          if (prefs?.smsEnabled === true) {
            await this.queueSMS(userId, message, templateId);
          }
          break;
        case 'PUSH':
          if (prefs?.pushEnabled !== false) {
            await this.sendPush(userId, title, message, data);
          }
          break;
      }

      return notification;
    } catch (error) {
      console.error('Notification send error:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBulk({ userIds, type, title, message, templateId = null, data = null }) {
    const notifications = [];
    for (const userId of userIds) {
      try {
        const notification = await this.send({ userId, type, title, message, templateId, data });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
      }
    }
    return notifications;
  }

  /**
   * Queue email for sending
   */
  static async queueEmail(userId, subject, body, templateId = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user?.email) return null;

    return prisma.emailQueue.create({
      data: {
        toEmail: user.email,
        subject,
        body,
        templateId
      }
    });
  }

  /**
   * Queue SMS for sending
   */
  static async queueSMS(userId, message, templateId = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mobile: true }
    });

    if (!user?.mobile) return null;

    return prisma.smsQueue.create({
      data: {
        toMobile: user.mobile,
        message,
        templateId
      }
    });
  }

  /**
   * Send push notification (placeholder - integrate with Firebase/OneSignal)
   */
  static async sendPush(userId, title, message, data = null) {
    // Placeholder for push notification integration
    console.log(`Push notification to user ${userId}: ${title} - ${message}`);
    return true;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const where = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: {
            select: { name: true, type: true }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount
      }
    };
  }

  /**
   * Process email queue
   */
  static async processEmailQueue(batchSize = 10) {
    const emails = await prisma.emailQueue.findMany({
      where: {
        status: 'QUEUED',
        attempts: { lt: prisma.emailQueue.fields.maxAttempts }
      },
      take: batchSize,
      orderBy: { createdAt: 'asc' }
    });

    // Import email service dynamically to avoid circular dependency
    const { EmailService } = await import('./email.service');
    
    for (const email of emails) {
      try {
        await EmailService.sendEmail({
          to: email.toEmail,
          subject: email.subject,
          html: email.body
        });

        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            attempts: email.attempts + 1
          }
        });
      } catch (error) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            attempts: email.attempts + 1,
            lastError: error.message,
            status: email.attempts + 1 >= email.maxAttempts ? 'FAILED' : 'QUEUED'
          }
        });
      }
    }

    return emails.length;
  }

  /**
   * Create notification preferences for user
   */
  static async createPreferences(userId) {
    return prisma.notificationPreference.create({
      data: { userId }
    });
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(userId, preferences) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...preferences },
      update: preferences
    });
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(userId) {
    return prisma.notificationPreference.findUnique({
      where: { userId }
    });
  }

  /**
   * Get notification templates
   */
  static async getTemplates(type = null) {
    const where = {};
    if (type) where.type = type;
    
    return prisma.notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Create notification template
   */
  static async createTemplate({ name, subject, body, type, variables = null }) {
    return prisma.notificationTemplate.create({
      data: { name, subject, body, type, variables }
    });
  }
}
