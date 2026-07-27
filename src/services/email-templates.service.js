// src/services/email-templates.service.js
// Professional email templates for all system emails
// Brand: Orange/Rose gradient theme matching landing page

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'PROCURE';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const APP_COLOR = '#f97316'; // Orange-500
const APP_COLOR_DARK = '#ea580c'; // Orange-600
const CURRENT_YEAR = new Date().getFullYear();

function baseTemplate({ title, subtitle, content, headerColor = `linear-gradient(135deg, ${APP_COLOR}, #ef4444)` }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      background: #f8f9fa; 
      -webkit-font-smoothing: antialiased;
    }
    .wrapper { 
      max-width: 560px; 
      margin: 40px auto; 
      background: #ffffff; 
      border-radius: 20px; 
      overflow: hidden; 
      box-shadow: 0 8px 40px rgba(0,0,0,0.08); 
    }
    .header { 
      background: ${headerColor}; 
      padding: 44px 32px; 
      text-align: center; 
    }
    .header .logo { 
      font-size: 28px; 
      font-weight: 800; 
      color: #fff; 
      letter-spacing: -0.5px;
    }
    .header .tagline { 
      font-size: 14px; 
      color: rgba(255,255,255,0.85); 
      margin-top: 6px; 
      font-weight: 500;
    }
    .body { 
      padding: 40px 32px; 
    }
    .body h1 { 
      font-size: 22px; 
      font-weight: 700; 
      color: #111827; 
      margin: 0 0 8px; 
    }
    .body .subtitle { 
      font-size: 15px; 
      color: #6b7280; 
      margin-bottom: 28px; 
      line-height: 1.5; 
    }
    .body p { 
      font-size: 15px; 
      color: #374151; 
      line-height: 1.7; 
      margin: 0 0 18px; 
    }
    .card { 
      background: #fef2f2; 
      border: 1px solid #fecaca; 
      border-radius: 14px; 
      padding: 24px; 
      margin: 24px 0; 
    }
    .card.green { background: #ecfdf5; border-color: #a7f3d0; }
    .card.blue { background: #eff6ff; border-color: #bfdbfe; }
    .card.purple { background: #faf5ff; border-color: #ddd6fe; }
    .card h3 { 
      font-size: 15px; 
      font-weight: 700; 
      margin: 0 0 14px; 
    }
    .card.red h3, .card.red h3 { color: #dc2626; }
    .card.green h3 { color: #059669; }
    .card.blue h3 { color: #2563eb; }
    .card.purple h3 { color: #7c3aed; }
    .step { 
      display: flex; 
      align-items: flex-start; 
      gap: 12px; 
      margin-bottom: 14px; 
      font-size: 14px; 
      color: #374151; 
      line-height: 1.5; 
    }
    .step-num { 
      width: 26px; 
      height: 26px; 
      background: #dc2626; 
      color: #fff; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 13px; 
      font-weight: 700; 
      flex-shrink: 0; 
    }
    .step-num.green { background: #059669; }
    .step-num.blue { background: #2563eb; }
    .step-num.purple { background: #7c3aed; }
    .button { 
      display: inline-block; 
      background: ${headerColor}; 
      color: #fff !important; 
      text-decoration: none; 
      padding: 15px 36px; 
      border-radius: 12px; 
      font-weight: 600; 
      font-size: 15px; 
      text-align: center; 
      box-shadow: 0 4px 16px rgba(249,115,22,0.3);
    }
    .button:hover { box-shadow: 0 6px 20px rgba(249,115,22,0.4); }
    .link-text { 
      color: #9ca3af; 
      font-size: 12px; 
      margin-top: 16px; 
      word-break: break-all; 
      line-height: 1.5;
    }
    .footer { 
      background: #fafafa; 
      padding: 24px 32px; 
      text-align: center; 
      border-top: 1px solid #f3f4f6; 
    }
    .footer p { 
      font-size: 12px; 
      color: #9ca3af; 
      margin: 0; 
      line-height: 1.8; 
    }
    .footer a { color: #9ca3af; text-decoration: underline; }
    .highlight { color: ${APP_COLOR}; font-weight: 600; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">${APP_NAME}</div>
      <div class="tagline">India's Smartest B2B Procurement Platform</div>
    </div>
    <div class="body">
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
      ${content}
    </div>
    <div class="footer">
      <p>© ${CURRENT_YEAR} ${APP_NAME}. All rights reserved.</p>
      <p>This is an automated message from ${APP_NAME}.<br>If you have questions, contact us at <a href="mailto:support@procure.com">support@procure.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Welcome email sent when a new user registers
 */
export function getWelcomeEmail({ name }) {
  return {
    subject: `Welcome to ${APP_NAME}, ${name}! 🎉`,
    html: baseTemplate({
      title: `Hi ${name}, welcome aboard!`,
      subtitle: 'Your account has been created successfully. Get ready to explore the future of B2B procurement.',
      content: `
        <div class="card red">
          <h3>🚀 Getting Started in 3 Steps</h3>
          <div class="step">
            <div class="step-num">1</div>
            <div><strong>Complete your profile</strong> — Add your details and preferences</div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div><strong>Verify your email</strong> — Click the verification link in your inbox to activate your account</div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div><strong>Start exploring</strong> — Browse products, connect with suppliers, or register as a supplier</div>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${APP_URL}/login" class="button">Sign In to Your Account →</a>
        </div>

        <p>If you have any questions, simply reply to this email — our support team is always happy to help.</p>
        <p>Welcome to the <span class="highlight">${APP_NAME}</span> community! 🧡</p>
      `
    })
  };
}

/**
 * Welcome email sent when a supplier registers
 */
export function getSupplierWelcomeEmail({ businessName, name }) {
  return {
    subject: `Your supplier account is ready, ${businessName}! 🏪`,
    html: baseTemplate({
      title: `Welcome, ${businessName}!`,
      subtitle: `Hi ${name}, your supplier account has been created. Follow these steps to go LIVE and start selling.`,
      headerColor: 'linear-gradient(135deg, #059669, #10b981)',
      content: `
        <div class="card green">
          <h3>✅ Roadmap to Go LIVE</h3>
          <div class="step">
            <div class="step-num green">1</div>
            <div><strong>Upload KYC Documents</strong> — PAN, GST Certificate, Bank Proof, Business Registration, Identity & Address Proof</div>
          </div>
          <div class="step">
            <div class="step-num green">2</div>
            <div><strong>Set Up Warehouse</strong> — Configure your storage locations with zones, shelves & bins</div>
          </div>
          <div class="step">
            <div class="step-num green">3</div>
            <div><strong>Add Products</strong> — List your products with images, pricing tiers, variants, and HSN codes</div>
          </div>
          <div class="step">
            <div class="step-num green">4</div>
            <div><strong>Get Verified</strong> — Our team reviews your documents within 24-48 hours</div>
          </div>
          <div class="step">
            <div class="step-num green">5</div>
            <div><strong>Go ONLINE!</strong> — Toggle your store online and start receiving orders from thousands of buyers</div>
          </div>
        </div>

        <p>📌 <strong>Important:</strong> Your GSTIN will be auto-verified. Keep your documents ready for faster KYC approval.</p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${APP_URL}/dashboard" class="button" style="background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 4px 16px rgba(5,150,105,0.3);">Go to Supplier Dashboard →</a>
        </div>
      `
    })
  };
}

/**
 * Email verification email
 */
export function getVerificationEmail({ name, verificationUrl }) {
  return {
    subject: `Verify your email — ${APP_NAME}`,
    html: baseTemplate({
      title: 'Verify Your Email Address',
      subtitle: `Hi ${name}, please verify your email to activate your ${APP_NAME} account.`,
      headerColor: 'linear-gradient(135deg, #2563eb, #3b82f6)',
      content: `
        <p>Click the button below to verify your email address. This helps us keep your account secure.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}" class="button" style="background: linear-gradient(135deg, #2563eb, #3b82f6); box-shadow: 0 4px 16px rgba(37,99,235,0.3);">Verify Email Address →</a>
        </div>

        <p class="link-text">If the button doesn't work, copy and paste this link into your browser:<br>${verificationUrl}</p>

        <div class="card blue" style="margin-top: 20px;">
          <p style="font-size: 13px; color: #6b7280; margin: 0; text-align: center;">
            ⏰ This link expires in <strong>24 hours</strong>.<br>
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      `
    })
  };
}

/**
 * Password reset email
 */
export function getPasswordResetEmail({ name, resetUrl }) {
  return {
    subject: `Reset your password — ${APP_NAME}`,
    html: baseTemplate({
      title: 'Reset Your Password',
      subtitle: `Hi ${name}, we received a request to reset your password.`,
      headerColor: 'linear-gradient(135deg, #dc2626, #ef4444)',
      content: `
        <p>Click the button below to create a new password for your account.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" class="button">Reset Password →</a>
        </div>

        <p class="link-text">Or copy this link:<br>${resetUrl}</p>

        <div class="card" style="background: #fef2f2; border-color: #fecaca;">
          <p style="font-size: 13px; color: #dc2626; margin: 0; text-align: center;">
            ⚠️ <strong>Security Notice:</strong><br>
            This link expires in <strong>1 hour</strong>.<br>
            If you didn't request this, please ignore this email — your password won't change.
          </p>
        </div>
      `
    })
  };
}

/**
 * Order confirmation email for buyers
 */
export function getOrderConfirmationEmail({ buyerName, orderId, totalAmount, items = [] }) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px;">
        <strong>${item.name}</strong>
        ${item.variant ? `<br><span style="color: #9ca3af; font-size: 12px;">${item.variant}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 14px;">×${item.quantity}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px; font-weight: 600;">₹${item.price?.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return {
    subject: `Order Confirmed #${orderId} — ${APP_NAME}`,
    html: baseTemplate({
      title: `Order Confirmed! 🎉`,
      subtitle: `Hi ${buyerName}, your order has been placed successfully.`,
      headerColor: 'linear-gradient(135deg, #059669, #10b981)',
      content: `
        <div class="card green">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span style="color: #6b7280;">Order ID</span>
            <strong>#${orderId}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span style="color: #6b7280;">Date</span>
            <span>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span style="color: #6b7280;">Total</span>
            <strong style="font-size: 18px;">₹${totalAmount?.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        ${items.length > 0 ? `
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="text-align: left; padding: 10px; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Item</th>
                <th style="text-align: center; padding: 10px; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Qty</th>
                <th style="text-align: right; padding: 10px; font-size: 12px; color: #9ca3af; text-transform: uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        ` : ''}

        <div style="text-align: center; margin: 28px 0;">
          <a href="${APP_URL}/orders/${orderId}" class="button" style="background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 4px 16px rgba(5,150,105,0.3);">Track Your Order →</a>
        </div>

        <p style="font-size: 13px; color: #6b7280; text-align: center;">You'll receive updates as your order progresses.</p>
      `
    })
  };
}

/**
 * KYC Status notification email
 */
export function getKycStatusEmail({ supplierName, status, businessName }) {
  const statusConfig = {
    APPROVED: { emoji: '✅', title: 'KYC Approved!', color: '#059669', message: 'Your documents have been verified. You can now go ONLINE and start selling.' },
    REJECTED: { emoji: '❌', title: 'KYC Update Required', color: '#dc2626', message: 'Some documents need attention. Please check the reason and re-upload.' },
    PENDING: { emoji: '⏳', title: 'KYC Under Review', color: '#f59e0b', message: 'Your documents are being reviewed by our team. This usually takes 24-48 hours.' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return {
    subject: `${config.emoji} ${config.title} — ${businessName}`,
    html: baseTemplate({
      title: `${config.title}`,
      subtitle: `Hi ${supplierName}, here's an update on your KYC verification for ${businessName}.`,
      headerColor: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
      content: `
        <p>${config.message}</p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${APP_URL}/dashboard/supplier/settings?tab=kyc" class="button" style="background: linear-gradient(135deg, ${config.color}, ${config.color}dd); box-shadow: 0 4px 16px rgba(0,0,0,0.15);">View KYC Status →</a>
        </div>

        ${status === 'REJECTED' ? `
          <div class="card" style="background: #fef2f2; border-color: #fecaca;">
            <p style="font-size: 13px; color: #dc2626; margin: 0;">⚠️ Please re-upload the rejected documents to continue with verification.</p>
          </div>
        ` : ''}
      `
    })
  };
}

/**
 * Broadcast / Announcement email to all users
 */
export function getBroadcastEmail({ name, title, message }) {
  return {
    subject: title,
    html: baseTemplate({
      title: title,
      subtitle: `Hi ${name}, here's an important update from the ${APP_NAME} team.`,
      headerColor: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      content: `
        <div class="card purple">
          <p style="font-size: 15px; color: #374151; line-height: 1.8; margin: 0;">
            ${message.replace(/\n/g, '<br>')}
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${APP_URL}" class="button" style="background: linear-gradient(135deg, #7c3aed, #a855f7); box-shadow: 0 4px 16px rgba(124,58,237,0.3);">Visit ${APP_NAME} →</a>
        </div>

        <p style="font-size: 13px; color: #9ca3af; text-align: center;">
          You received this email because you're a registered user of ${APP_NAME}.<br>
          To manage your notification preferences, visit your account settings.
        </p>
      `
    })
  };
}