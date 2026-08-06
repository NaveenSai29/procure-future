import prisma from '@/lib/prisma';

export class NotificationService {
  /**
   * Get notification settings from SystemSetting table
   */
  static async getSystemNotificationSettings() {
    try {
      const dbSettings = await prisma.systemSetting.findMany({
        where: { category: 'NOTIFICATION' }
      });
      const settings = {};
      dbSettings.forEach(s => {
        try { settings[s.key] = JSON.parse(s.value); } 
        catch { settings[s.key] = s.value; }
      });
      return {
        emailEnabled: settings.emailEnabled !== false,
        smsEnabled: settings.smsEnabled === true,
        pushEnabled: settings.pushEnabled !== false,
        whatsappEnabled: settings.whatsappEnabled === true,
        orderConfirmation: settings.orderConfirmation !== false,
        shippingUpdate: settings.shippingUpdate !== false,
        deliveryOTP: settings.deliveryOTP !== false,
        rfqAlert: settings.rfqAlert !== false,
        paymentReceipt: settings.paymentReceipt !== false,
        promotionalEmail: settings.promotionalEmail === true,
      };
    } catch {
      // Default: email + push enabled, everything else off
      return {
        emailEnabled: true, smsEnabled: false, pushEnabled: true, whatsappEnabled: false,
        orderConfirmation: true, shippingUpdate: true, deliveryOTP: true,
        rfqAlert: true, paymentReceipt: true, promotionalEmail: false,
      };
    }
  }

  /**
   * Check if a notification event type is enabled
   */
  static async isEventEnabled(eventType) {
    const settings = await this.getSystemNotificationSettings();
    const eventMap = {
      'ORDER_CONFIRMATION': settings.orderConfirmation,
      'SHIPPING_UPDATE': settings.shippingUpdate,
      'DELIVERY_OTP': settings.deliveryOTP,
      'RFQ_ALERT': settings.rfqAlert,
      'PAYMENT_RECEIPT': settings.paymentReceipt,
      'PROMOTIONAL': settings.promotionalEmail,
    };
    return eventMap[eventType] !== false;
  }

  /**
   * Create and send a notification to a user
   */
  static async send({ userId, type, title, message, eventType = null, templateId = null, data = null }) {
    try {
      // Check system notification settings for this event type
      if (eventType) {
        const eventEnabled = await this.isEventEnabled(eventType);
        if (!eventEnabled) {
          console.log(`Notification event "${eventType}" is disabled in system settings. Skipping.`);
          return null;
        }
      }

      // Get system settings
      const systemSettings = await this.getSystemNotificationSettings();

      // Check user preferences
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      // Create in-app notification always (doesn't depend on channel settings)
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

      // Handle different notification types with system setting checks
      // Get user for email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, mobile: true, name: true }
      });

      switch (type) {
        case 'EMAIL':
          if (systemSettings.emailEnabled && prefs?.emailEnabled !== false) {
            if (user?.email) {
              try {
                const { EmailService } = await import('./email.service');
                await EmailService.sendEmail({
                  to: user.email,
                  subject: title,
                  html: message
                });
              } catch (emailError) {
                console.log('Direct email failed, queuing:', emailError.message);
                await this.queueEmail(userId, title, message, templateId);
              }
            }
          }
          break;
        case 'SMS':
          if (systemSettings.smsEnabled && prefs?.smsEnabled === true) {
            if (user?.mobile) {
              await this.queueSMS(userId, message, templateId);
            }
          }
          break;
        case 'PUSH':
          if (systemSettings.pushEnabled && prefs?.pushEnabled !== false) {
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
  static async sendBulk({ userIds, type, title, message, eventType = null, templateId = null, data = null }) {
    // Check system settings first
    if (eventType) {
      const eventEnabled = await this.isEventEnabled(eventType);
      if (!eventEnabled) {
        console.log(`Bulk notification event "${eventType}" is disabled. Skipping.`);
        return [];
      }
    }

    const notifications = [];
    for (const userId of userIds) {
      try {
        const notification = await this.send({ userId, type, title, message, eventType, templateId, data });
        if (notification) notifications.push(notification);
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
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { expoPushToken: true },
      });

      if (!user?.expoPushToken) {
        console.log(`No push token for user ${userId}`);
        return false;
      }

      const { Expo } = await import('expo-server-sdk');
      const expo = new Expo();

      if (!Expo.isExpoPushToken(user.expoPushToken)) {
        console.log(`Invalid push token for user ${userId}`);
        return false;
      }

      const messages = [{
        to: user.expoPushToken,
        sound: 'default',
        title,
        body: message,
        data: data || {},
      }];

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }

      console.log(`Push sent to user ${userId}: ${title}`);
      return true;
    } catch (error) {
      console.error('Push notification error:', error.message);
      return false;
    }
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
        attempts: { lt: 3 }
      },
      take: batchSize,
      orderBy: { createdAt: 'asc' }
    });

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
            status: email.attempts + 1 >= 3 ? 'FAILED' : 'QUEUED'
          }
        });
      }
    }

    return emails.length;
  }

  /**
   * Process SMS queue
   */
  static async processSMSQueue(batchSize = 10) {
    const messages = await prisma.sMSQueue.findMany({
      where: {
        status: 'QUEUED',
        attempts: { lt: 3 }
      },
      take: batchSize,
      orderBy: { createdAt: 'asc' }
    });

    for (const sms of messages) {
      try {
        // SMS sending logic — integrate with MSG91/Twilio here
        // For now, mark as SENT (placeholder until SMS provider configured)
        await prisma.sMSQueue.update({
          where: { id: sms.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            attempts: sms.attempts + 1
          }
        });
        console.log(`SMS sent to ${sms.toMobile}`);
      } catch (error) {
        await prisma.sMSQueue.update({
          where: { id: sms.id },
          data: {
            attempts: sms.attempts + 1,
            lastError: error.message,
            status: sms.attempts + 1 >= 3 ? 'FAILED' : 'QUEUED'
          }
        });
      }
    }

    return messages.length;
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