import nodemailer from 'nodemailer';

export class EmailService {
  static transporter = null;

  /**
   * Get or create email transporter
   */
  static getTransporter() {
    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    return this.transporter;
  }

  /**
   * Send a single email
   */
  static async sendEmail({ to, subject, html, text = null, attachments = [] }) {
    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: `"PROCURE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        ...(text && { text }),
        ...(attachments.length > 0 && { attachments })
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  static async sendBulkEmails(recipients) {
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient);
        results.push({ ...result, email: recipient.to, status: 'SENT' });
      } catch (error) {
        results.push({ email: recipient.to, status: 'FAILED', error: error.message });
      }
    }
    return results;
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation({ to, orderId, orderDetails, buyerName }) {
    const subject = `Order Confirmed - #${orderId}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .details { margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your order</p>
          </div>
          <div class="content">
            <p>Hi ${buyerName},</p>
            <p>Your order has been confirmed and is being processed.</p>
            
            <div class="details">
              <h3>Order Details</h3>
              <div class="detail-row">
                <span>Order ID:</span>
                <strong>#${orderId}</strong>
              </div>
              <div class="detail-row">
                <span>Order Date:</span>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span>Total Amount:</span>
                <strong>₹${orderDetails.totalAmount?.toLocaleString()}</strong>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}" class="button">Track Your Order</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PROCURE. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send RFQ alert email
   */
  static async sendRFQAlert({ to, rfqTitle, rfqId, supplierName }) {
    const subject = `New RFQ Received: ${rfqTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New RFQ Alert!</h1>
            <p>You have a new Request for Quotation</p>
          </div>
          <div class="content">
            <p>Hi ${supplierName},</p>
            <p>A new RFQ has been published that matches your business category.</p>
            <h3>${rfqTitle}</h3>
            <p>Don't miss this opportunity! Submit your quotation now.</p>
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/supplier/rfq/${rfqId}" class="button">View RFQ Details</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Verify email connection
   */
  static async verifyConnection() {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}