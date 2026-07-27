import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PROCURE Enterprise database...\n');

  // ============================================
  // 1. ROLES
  // ============================================
  const roles = [
    { name: 'BUYER', description: 'Retail/Business buyer', isSystem: true },
    { name: 'SUPPLIER', description: 'Supplier/Vendor', isSystem: true },
    { name: 'SUPPLIER_ADMIN', description: 'Supplier administrator', isSystem: true },
    { name: 'WAREHOUSE_MANAGER', description: 'Warehouse manager', isSystem: true },
    { name: 'DELIVERY_PARTNER', description: 'Delivery partner', isSystem: true },
    { name: 'FLEET_MANAGER', description: 'Fleet manager', isSystem: true },
    { name: 'ADMIN', description: 'Platform administrator', isSystem: true },
    { name: 'SUPER_ADMIN', description: 'Super administrator', isSystem: true },
    { name: 'SUPPORT', description: 'Customer support', isSystem: true },
    { name: 'FINANCE', description: 'Finance team', isSystem: true },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles created');

  // ============================================
  // 2. PERMISSIONS
  // ============================================
  const permissions = [
    { name: 'product.create', category: 'PRODUCTS', description: 'Create products' },
    { name: 'product.read', category: 'PRODUCTS', description: 'View products' },
    { name: 'product.update', category: 'PRODUCTS', description: 'Update products' },
    { name: 'product.delete', category: 'PRODUCTS', description: 'Delete products' },
    { name: 'product.approve', category: 'PRODUCTS', description: 'Approve products' },
    { name: 'order.create', category: 'ORDERS', description: 'Create orders' },
    { name: 'order.read', category: 'ORDERS', description: 'View orders' },
    { name: 'order.update', category: 'ORDERS', description: 'Update orders' },
    { name: 'order.cancel', category: 'ORDERS', description: 'Cancel orders' },
    { name: 'inventory.read', category: 'INVENTORY', description: 'View inventory' },
    { name: 'inventory.update', category: 'INVENTORY', description: 'Update inventory' },
    { name: 'inventory.transfer', category: 'INVENTORY', description: 'Transfer inventory' },
    { name: 'warehouse.read', category: 'WAREHOUSE', description: 'View warehouse' },
    { name: 'warehouse.manage', category: 'WAREHOUSE', description: 'Manage warehouse' },
    { name: 'delivery.read', category: 'DELIVERY', description: 'View deliveries' },
    { name: 'delivery.manage', category: 'DELIVERY', description: 'Manage deliveries' },
    { name: 'delivery.assign', category: 'DELIVERY', description: 'Assign deliveries' },
    { name: 'user.read', category: 'USERS', description: 'View users' },
    { name: 'user.create', category: 'USERS', description: 'Create users' },
    { name: 'user.update', category: 'USERS', description: 'Update users' },
    { name: 'user.delete', category: 'USERS', description: 'Delete users' },
    { name: 'finance.read', category: 'FINANCE', description: 'View finances' },
    { name: 'finance.manage', category: 'FINANCE', description: 'Manage finances' },
    { name: 'admin.access', category: 'ADMIN', description: 'Access admin panel' },
    { name: 'admin.settings', category: 'ADMIN', description: 'Manage settings' },
    { name: 'admin.roles', category: 'ADMIN', description: 'Manage roles' },
    { name: 'reports.read', category: 'REPORTS', description: 'View reports' },
    { name: 'reports.export', category: 'REPORTS', description: 'Export reports' },
    { name: 'notifications.manage', category: 'NOTIFICATIONS', description: 'Manage notifications' },
    { name: 'analytics.read', category: 'ANALYTICS', description: 'View analytics' },
    { name: 'rfq.create', category: 'RFQ', description: 'Create RFQ' },
    { name: 'rfq.respond', category: 'RFQ', description: 'Respond to RFQ' },
    { name: 'returns.manage', category: 'RETURNS', description: 'Manage returns' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log('✅ Permissions created');

  // ============================================
  // 3. USERS
  // ============================================
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const supplierRole = await prisma.role.findUnique({ where: { name: 'SUPPLIER' } });
  const buyerRole = await prisma.role.findUnique({ where: { name: 'BUYER' } });
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@procure.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@procure.com',
      password: hashedPassword,
      emailVerified: true,
      mobile: '9876543210',
      mobileVerified: true,
      roles: { create: { roleId: superAdminRole.id } },
      adminProfile: { create: { role: 'SUPER_ADMIN' } },
      notificationPrefs: { create: { emailEnabled: true, smsEnabled: true } },
    },
  });

  // Demo Supplier User
  const demoSupplier = await prisma.user.upsert({
    where: { email: 'supplier@demo.com' },
    update: {},
    create: {
      name: 'Demo Supplier',
      email: 'supplier@demo.com',
      password: hashedPassword,
      emailVerified: true,
      mobile: '9876543211',
      mobileVerified: true,
      roles: { create: { roleId: supplierRole.id } },
      notificationPrefs: { create: { emailEnabled: true } },
    },
  });

  // Demo Buyer User
  const demoBuyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.com' },
    update: {},
    create: {
      name: 'Demo Buyer',
      email: 'buyer@demo.com',
      password: hashedPassword,
      emailVerified: true,
      mobile: '9876543212',
      mobileVerified: true,
      roles: { create: { roleId: buyerRole.id } },
    },
  });

  console.log('✅ Users created');

  // Assign all permissions to Super Admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });
  }
  console.log('✅ Super Admin permissions assigned');

  // ============================================
  // 4. NOTIFICATION TEMPLATES
  // ============================================
  const templates = [
    {
      name: 'order-confirmation',
      subject: 'Order Confirmed - #{{orderId}}',
      body: 'Dear {{buyerName}},\n\nYour order #{{orderId}} has been confirmed. Total amount: ₹{{totalAmount}}\n\nThank you for your purchase!\n\nRegards,\nPROCURE Team',
      type: 'EMAIL',
      variables: { orderId: 'string', buyerName: 'string', totalAmount: 'number' }
    },
    {
      name: 'rfq-new-alert',
      subject: 'New RFQ: {{rfqTitle}}',
      body: 'Dear {{supplierName}},\n\nA new RFQ "{{rfqTitle}}" has been published that matches your category.\n\nDeadline: {{deadline}}\n\nView and submit your quotation now!\n\nRegards,\nPROCURE Team',
      type: 'EMAIL',
      variables: { supplierName: 'string', rfqTitle: 'string', deadline: 'date' }
    },
    {
      name: 'order-shipped',
      subject: 'Order Shipped - #{{orderId}}',
      body: 'Your order #{{orderId}} has been shipped and is on its way!\n\nTracking ID: {{trackingId}}\nExpected Delivery: {{eta}}\n\nTrack your order here: {{trackingUrl}}',
      type: 'EMAIL',
      variables: { orderId: 'string', trackingId: 'string', eta: 'date', trackingUrl: 'string' }
    },
    {
      name: 'settlement-processed',
      subject: 'Settlement Processed',
      body: 'Dear {{supplierName}},\n\nYour settlement of ₹{{amount}} has been processed successfully.\n\nCurrent wallet balance: ₹{{balance}}\n\nRegards,\nPROCURE Finance Team',
      type: 'EMAIL',
      variables: { supplierName: 'string', amount: 'number', balance: 'number' }
    },
    {
      name: 'welcome-email',
      subject: 'Welcome to PROCURE!',
      body: 'Dear {{userName}},\n\nWelcome to PROCURE - the complete enterprise procurement platform!\n\nGet started by exploring our marketplace.\n\nRegards,\nPROCURE Team',
      type: 'EMAIL',
      variables: { userName: 'string' }
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: template,
    });
  }
  console.log('✅ Notification templates created');

  // ============================================
  // 5. DEMO SUPPLIER & DATA
  // ============================================
  const supplier = await prisma.supplier.upsert({
    where: { email: 'supplier@demo.com' },
    update: {},
    create: {
      businessName: 'Demo Supplies Ltd.',
      businessType: 'MANUFACTURER',
      description: 'Leading manufacturer of industrial and construction supplies',
      email: 'supplier@demo.com',
      mobile: '9876543211',
      website: 'https://demosupplies.com',
      gstin: '27AABCG1234Q1Z5',
      pan: 'AABCG1234Q',
      isVerified: true,
    },
  });

  // Supplier Staff
  await prisma.supplierStaff.upsert({
    where: { userId: demoSupplier.id },
    update: {},
    create: {
      supplierId: supplier.id,
      userId: demoSupplier.id,
      role: 'ADMIN',
    },
  });

  // Supplier Wallet
  await prisma.supplierWallet.upsert({
    where: { supplierId: supplier.id },
    update: {},
    create: {
      supplierId: supplier.id,
      balance: 25000,
      totalEarned: 150000,
      totalWithdrawn: 125000,
      transactions: {
        create: [
          { type: 'CREDIT', amount: 50000, referenceType: 'ORDER', description: 'Order payment received', balanceBefore: 100000, balanceAfter: 150000 },
          { type: 'DEBIT', amount: 25000, referenceType: 'SETTLEMENT', description: 'Settlement withdrawal', balanceBefore: 150000, balanceAfter: 125000 },
          { type: 'CREDIT', amount: 25000, referenceType: 'ORDER', description: 'Order payment received', balanceBefore: 0, balanceAfter: 25000 },
        ],
      },
    },
  });

  // Sample Invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      supplierId: supplier.id,
      invoiceNumber: 'INV-2024-001',
      invoiceType: 'TAX_INVOICE',
      amount: 45000,
      taxAmount: 8100,
      totalAmount: 53100,
      status: 'PAID',
      dueDate: new Date('2024-12-31'),
      paidAt: new Date('2024-12-15'),
      items: {
        create: [
          { description: 'Steel Pipes 2" - 100 units', hsnCode: '7304', quantity: 100, unitPrice: 300, taxRate: 18, taxAmount: 5400, totalAmount: 35400 },
          { description: 'Steel Pipes 3" - 50 units', hsnCode: '7304', quantity: 50, unitPrice: 300, taxRate: 18, taxAmount: 2700, totalAmount: 17700 },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      supplierId: supplier.id,
      invoiceNumber: 'INV-2024-002',
      invoiceType: 'TAX_INVOICE',
      amount: 28000,
      taxAmount: 5040,
      totalAmount: 33040,
      status: 'SENT',
      dueDate: new Date('2025-01-15'),
      items: {
        create: [
          { description: 'Cement Bags - 200 units', hsnCode: '2523', quantity: 200, unitPrice: 140, taxRate: 18, taxAmount: 5040, totalAmount: 33040 },
        ],
      },
    },
  });

  // Sample Settlements
  await prisma.settlement.createMany({
    data: [
      { supplierId: supplier.id, amount: 25000, status: 'PROCESSED', settlementType: 'AUTO', processedAt: new Date('2024-12-01') },
      { supplierId: supplier.id, amount: 15000, status: 'PROCESSED', settlementType: 'MANUAL', processedAt: new Date('2024-11-15') },
      { supplierId: supplier.id, amount: 20000, status: 'PENDING', settlementType: 'AUTO' },
    ],
  });

  console.log('✅ Demo supplier, wallet, invoices, and settlements created');

  // ============================================
  // 6. WELCOME NOTIFICATIONS
  // ============================================
  const welcomeTemplate = await prisma.notificationTemplate.findUnique({ where: { name: 'welcome-email' } });

  await prisma.notification.createMany({
    data: [
      {
        userId: superAdmin.id,
        type: 'IN_APP',
        title: 'Welcome to PROCURE Admin Panel',
        message: 'You have full access to manage the platform. Start by reviewing suppliers and products.',
        isRead: false,
      },
      {
        userId: demoSupplier.id,
        type: 'IN_APP',
        title: 'Welcome to PROCURE!',
        message: 'Your supplier account is verified. Start adding products and managing your inventory.',
        isRead: false,
      },
      {
        userId: demoSupplier.id,
        type: 'IN_APP',
        title: 'New RFQ Available',
        message: 'A new RFQ for industrial supplies has been published. Check the RFQ marketplace.',
        isRead: true,
      },
    ],
  });

  // Queue welcome emails
  await prisma.emailQueue.createMany({
    data: [
      {
        templateId: welcomeTemplate?.id,
        toEmail: 'admin@procure.com',
        subject: 'Welcome to PROCURE!',
        body: 'Welcome to the PROCURE admin panel.',
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(),
      },
      {
        templateId: welcomeTemplate?.id,
        toEmail: 'supplier@demo.com',
        subject: 'Welcome to PROCURE!',
        body: 'Welcome to PROCURE! Start managing your products.',
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(),
      },
    ],
  });

  console.log('✅ Welcome notifications created');

  // ============================================
  // 7. ANALYTICS EVENTS (Sample Data)
  // ============================================
  const events = [
    { eventName: 'user_registered', eventCategory: 'AUTH', userId: demoSupplier.id },
    { eventName: 'supplier_verified', eventCategory: 'SUPPLIER', supplierId: supplier.id },
    { eventName: 'order_placed', eventCategory: 'ORDER', orderId: 'demo-order-1' },
    { eventName: 'page_view', eventCategory: 'ENGAGEMENT', data: { page: '/dashboard' } },
    { eventName: 'search_performed', eventCategory: 'ENGAGEMENT', data: { query: 'steel pipes' } },
  ];

  for (const event of events) {
    await prisma.analyticsEvent.create({ data: event });
  }
  console.log('✅ Analytics events seeded');

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Admin: admin@procure.com / Admin@123');
  console.log('🏭 Supplier: supplier@demo.com / Admin@123');
  console.log('🛒 Buyer: buyer@demo.com / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });