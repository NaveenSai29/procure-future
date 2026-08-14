// Data transfer script: LOCAL → REMOTE (Hostinger)
// Run: node scripts/transfer-data.js

const { PrismaClient } = require('@prisma/client');

const localPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.LOCAL_DATABASE_URL || "mysql://root:Dhiyaa2026@localhost:3306/procure_db" },
  },
});

const remotePrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.REMOTE_DATABASE_URL },
  },
});

async function transferTable(tableName, localModel, remoteModel) {
  try {
    const records = await localModel.findMany();
    console.log(`📦 ${tableName}: ${records.length} records`);
    
    let transferred = 0;
    let skipped = 0;
    
    for (const record of records) {
      try {
        await remoteModel.create({ data: record });
        transferred++;
      } catch (e) {
        skipped++;
      }
    }
    
    console.log(`  ✅ ${transferred} transferred, ${skipped} skipped`);
  } catch (e) {
    console.error(`  ❌ ${tableName}: ${e.message.substring(0, 100)}`);
  }
}

async function transferAll() {
  if (!process.env.REMOTE_DATABASE_URL) {
    console.error('❌ REMOTE_DATABASE_URL not set!');
    console.error('Add to .env: REMOTE_DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"');
    process.exit(1);
  }

  console.log('🚀 Data transfer started\n');

  // 1. Core Auth
  await transferTable('Role', localPrisma.role, remotePrisma.role);
  await transferTable('Permission', localPrisma.permission, remotePrisma.permission);
  await transferTable('RolePermission', localPrisma.rolePermission, remotePrisma.rolePermission);
  await transferTable('User', localPrisma.user, remotePrisma.user);
  await transferTable('UserRole', localPrisma.userRole, remotePrisma.userRole);
  await transferTable('Session', localPrisma.session, remotePrisma.session);
  await transferTable('RefreshToken', localPrisma.refreshToken, remotePrisma.refreshToken);
  await transferTable('Otp', localPrisma.otp, remotePrisma.otp);
  await transferTable('LoginHistory', localPrisma.loginHistory, remotePrisma.loginHistory);

  // 2. Buyer
  await transferTable('BuyerProfile', localPrisma.buyerProfile, remotePrisma.buyerProfile);
  await transferTable('Address', localPrisma.address, remotePrisma.address);
  await transferTable('Wishlist', localPrisma.wishlist, remotePrisma.wishlist);
  await transferTable('WishlistItem', localPrisma.wishlistItem, remotePrisma.wishlistItem);
  await transferTable('Cart', localPrisma.cart, remotePrisma.cart);
  await transferTable('CartItem', localPrisma.cartItem, remotePrisma.cartItem);
  await transferTable('BuyerWallet', localPrisma.buyerWallet, remotePrisma.buyerWallet);
  await transferTable('BuyerWalletTransaction', localPrisma.buyerWalletTransaction, remotePrisma.buyerWalletTransaction);

  // 3. Supplier
  await transferTable('Supplier', localPrisma.supplier, remotePrisma.supplier);
  await transferTable('SupplierBranch', localPrisma.supplierBranch, remotePrisma.supplierBranch);
  await transferTable('BusinessHours', localPrisma.businessHours, remotePrisma.businessHours);
  await transferTable('Holiday', localPrisma.holiday, remotePrisma.holiday);
  await transferTable('SupplierStaff', localPrisma.supplierStaff, remotePrisma.supplierStaff);
  await transferTable('SupplierBankAccount', localPrisma.supplierBankAccount, remotePrisma.supplierBankAccount);
  await transferTable('SupplierSettings', localPrisma.supplierSettings, remotePrisma.supplierSettings);
  await transferTable('SupplierRole', localPrisma.supplierRole, remotePrisma.supplierRole);
  await transferTable('SupplierStaffRole', localPrisma.supplierStaffRole, remotePrisma.supplierStaffRole);
  await transferTable('SupplierAgent', localPrisma.supplierAgent, remotePrisma.supplierAgent);
  await transferTable('SupplierWallet', localPrisma.supplierWallet, remotePrisma.supplierWallet);
  await transferTable('WalletTransaction', localPrisma.walletTransaction, remotePrisma.walletTransaction);

  // 4. Delivery Partner
  await transferTable('DeliveryPartner', localPrisma.deliveryPartner, remotePrisma.deliveryPartner);
  await transferTable('PartnerVehicle', localPrisma.partnerVehicle, remotePrisma.partnerVehicle);
  await transferTable('DocumentVerification', localPrisma.documentVerification, remotePrisma.documentVerification);
  await transferTable('PartnerWallet', localPrisma.partnerWallet, remotePrisma.partnerWallet);
  await transferTable('PartnerBankAccount', localPrisma.partnerBankAccount, remotePrisma.partnerBankAccount);
  await transferTable('CODDeposit', localPrisma.cODDeposit, remotePrisma.cODDeposit);

  // 5. Products
  await transferTable('Category', localPrisma.category, remotePrisma.category);
  await transferTable('Brand', localPrisma.brand, remotePrisma.brand);
  await transferTable('ProductAttribute', localPrisma.productAttribute, remotePrisma.productAttribute);
  await transferTable('Product', localPrisma.product, remotePrisma.product);
  await transferTable('ProductVariant', localPrisma.productVariant, remotePrisma.productVariant);
  await transferTable('ProductImage', localPrisma.productImage, remotePrisma.productImage);
  await transferTable('VariantImage', localPrisma.variantImage, remotePrisma.variantImage);
  await transferTable('ProductPricing', localPrisma.productPricing, remotePrisma.productPricing);

  // 6. Warehouse
  await transferTable('Warehouse', localPrisma.warehouse, remotePrisma.warehouse);
  await transferTable('WarehouseZone', localPrisma.warehouseZone, remotePrisma.warehouseZone);
  await transferTable('WarehouseShelf', localPrisma.warehouseShelf, remotePrisma.warehouseShelf);
  await transferTable('WarehouseBin', localPrisma.warehouseBin, remotePrisma.warehouseBin);
  await transferTable('WarehouseInventory', localPrisma.warehouseInventory, remotePrisma.warehouseInventory);
  await transferTable('InventoryMovement', localPrisma.inventoryMovement, remotePrisma.inventoryMovement);

  // 7. Orders
  await transferTable('Order', localPrisma.order, remotePrisma.order);
  await transferTable('OrderStatusHistory', localPrisma.orderStatusHistory, remotePrisma.orderStatusHistory);
  await transferTable('OrderSLA', localPrisma.orderSLA, remotePrisma.orderSLA);

  // 8. Delivery
  await transferTable('Delivery', localPrisma.delivery, remotePrisma.delivery);
  await transferTable('DeliveryChat', localPrisma.deliveryChat, remotePrisma.deliveryChat);
  await transferTable('DeliveryChatMessage', localPrisma.deliveryChatMessage, remotePrisma.deliveryChatMessage);

  // 9. Payments + Finance
  await transferTable('Invoice', localPrisma.invoice, remotePrisma.invoice);
  await transferTable('InvoiceItem', localPrisma.invoiceItem, remotePrisma.invoiceItem);
  await transferTable('Settlement', localPrisma.settlement, remotePrisma.settlement);

  // 10. Returns + Refunds
  await transferTable('ReturnRequest', localPrisma.returnRequest, remotePrisma.returnRequest);
  await transferTable('RefundTransaction', localPrisma.refundTransaction, remotePrisma.refundTransaction);

  // 11. RFQ + Quotes
  await transferTable('RFQ', localPrisma.rFQ, remotePrisma.rFQ);
  await transferTable('RFQItem', localPrisma.rFQItem, remotePrisma.rFQItem);
  await transferTable('RFQAttachment', localPrisma.rFQAttachment, remotePrisma.rFQAttachment);
  await transferTable('RFQResponse', localPrisma.rFQResponse, remotePrisma.rFQResponse);
  await transferTable('Quotation', localPrisma.quotation, remotePrisma.quotation);
  await transferTable('QuotationItem', localPrisma.quotationItem, remotePrisma.quotationItem);

  // 12. Notifications
  await transferTable('NotificationTemplate', localPrisma.notificationTemplate, remotePrisma.notificationTemplate);
  await transferTable('Notification', localPrisma.notification, remotePrisma.notification);
  await transferTable('EmailQueue', localPrisma.emailQueue, remotePrisma.emailQueue);
  await transferTable('SMSQueue', localPrisma.sMSQueue, remotePrisma.sMSQueue);
  await transferTable('NotificationPreference', localPrisma.notificationPreference, remotePrisma.notificationPreference);

  // 13. Marketing
  await transferTable('Coupon', localPrisma.coupon, remotePrisma.coupon);
  await transferTable('Offer', localPrisma.offer, remotePrisma.offer);
  await transferTable('OfferProduct', localPrisma.offerProduct, remotePrisma.offerProduct);
  await transferTable('Campaign', localPrisma.campaign, remotePrisma.campaign);
  await transferTable('Referral', localPrisma.referral, remotePrisma.referral);
  await transferTable('LoyaltyPoint', localPrisma.loyaltyPoint, remotePrisma.loyaltyPoint);
  await transferTable('SponsoredProduct', localPrisma.sponsoredProduct, remotePrisma.sponsoredProduct);
  await transferTable('Banner', localPrisma.banner, remotePrisma.banner);
  await transferTable('Page', localPrisma.page, remotePrisma.page);
  await transferTable('FAQ', localPrisma.fAQ, remotePrisma.fAQ);
  await transferTable('Announcement', localPrisma.announcement, remotePrisma.announcement);

  // 14. System
  await transferTable('SystemSetting', localPrisma.systemSetting, remotePrisma.systemSetting);
  await transferTable('SubscriptionPlan', localPrisma.subscriptionPlan, remotePrisma.subscriptionPlan);
  await transferTable('Subscription', localPrisma.subscription, remotePrisma.subscription);
  await transferTable('KYCDocument', localPrisma.kYCDocument, remotePrisma.kYCDocument);
  await transferTable('SupportTicket', localPrisma.supportTicket, remotePrisma.supportTicket);
  await transferTable('TicketMessage', localPrisma.ticketMessage, remotePrisma.ticketMessage);
  await transferTable('TicketAttachment', localPrisma.ticketAttachment, remotePrisma.ticketAttachment);
  await transferTable('Media', localPrisma.media, remotePrisma.media);
  await transferTable('HsnCode', localPrisma.hsnCode, remotePrisma.hsnCode);
  await transferTable('CustomerMessage', localPrisma.customerMessage, remotePrisma.customerMessage);
  await transferTable('FraudAlert', localPrisma.fraudAlert, remotePrisma.fraudAlert);
  await transferTable('ApiKey', localPrisma.apiKey, remotePrisma.apiKey);
  await transferTable('Webhook', localPrisma.webhook, remotePrisma.webhook);
  await transferTable('WebhookDelivery', localPrisma.webhookDelivery, remotePrisma.webhookDelivery);
  await transferTable('ApiRequestLog', localPrisma.apiRequestLog, remotePrisma.apiRequestLog);

  // 15. Admin + Audit
  await transferTable('AdminProfile', localPrisma.adminProfile, remotePrisma.adminProfile);
  await transferTable('AuditLog', localPrisma.auditLog, remotePrisma.auditLog);
  await transferTable('AnalyticsEvent', localPrisma.analyticsEvent, remotePrisma.analyticsEvent);
  await transferTable('DashboardMetric', localPrisma.dashboardMetric, remotePrisma.dashboardMetric);

  console.log('\n🎉 Data transfer complete!');
}

transferAll()
  .catch((e) => console.error('❌ Transfer failed:', e.message))
  .finally(async () => {
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
    process.exit(0);
  });