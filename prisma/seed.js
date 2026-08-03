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
  const deliveryPartnerRole = await prisma.role.findUnique({ where: { name: 'DELIVERY_PARTNER' } });
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

    // Demo Delivery Partner
  const demoDeliveryPartner = await prisma.user.upsert({
    where: { mobile: '9876543210' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: '9876543210@procure.delivery',
      password: hashedPassword,
      mobile: '9876543210',
      mobileVerified: true,
      roles: { create: { roleId: deliveryPartnerRole.id } },
      deliveryPartner: {
        create: {
          vehicleType: 'Bike',
          vehicleNumber: 'KA 01 AB 1234',
          licenseNumber: 'DL-KA-20240001',
          isVerified: true,
        },
      },
      notificationPrefs: { create: { pushEnabled: true } },
    },
  });
  console.log('  🛵 Demo Delivery Partner: 9876543210 / Admin@123');

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
  // 4. BUYER PROFILE, ADDRESS & WALLET
  // ============================================
  const buyerProfile = await prisma.buyerProfile.upsert({
    where: { userId: demoBuyer.id },
    update: {},
    create: {
      userId: demoBuyer.id,
      buyerType: 'BUSINESS',
      companyName: 'Demo Enterprises',
      addresses: {
        create: {
          label: 'Office',
          fullName: 'Demo Buyer',
          mobile: '9876543212',
          addressLine1: '123, Business Park',
          addressLine2: 'MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          latitude: 19.0176,
          longitude: 72.8562,
          isDefault: true,
        },
      },
    },
  });

  await prisma.buyerWallet.upsert({
    where: { userId: demoBuyer.id },
    update: {},
    create: {
      userId: demoBuyer.id,
      balance: 5000,
      transactions: {
        create: [
          { type: 'CREDIT', amount: 5000, referenceType: 'BONUS', description: 'Welcome bonus', balanceBefore: 0, balanceAfter: 5000 },
        ],
      },
    },
  });
  console.log('✅ Buyer profile, address & wallet created');

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
      gstVerified: true,
      gstBusinessName: 'Demo Supplies Ltd.',
      branches: {
        create: {
          branchName: 'Main Branch',
          addressLine1: '456, Industrial Area',
          addressLine2: 'Sector 5',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          mobile: '9876543211',
          isHeadOffice: true,
        },
      },
      warehouses: {
        create: {
          name: 'Main Warehouse',
          addressLine1: '789, Warehouse Zone',
          addressLine2: 'Bhiwandi',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          latitude: 19.0760,
          longitude: 72.8777,
          isPickupLocation: true,
        },
      },
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

    // Supplier Settings
  await prisma.supplierSettings.upsert({
    where: { supplierId: supplier.id },
    update: {},
    create: {
      supplierId: supplier.id,
      autoAccept: false,
      lowStockAlert: true,
      lowStockQty: 10,
    },
  });

  console.log('✅ Demo supplier with branch, warehouse, staff & wallet created');

  // ============================================
  // 6. SUBSCRIPTION PLANS
  // ============================================
  const plans = [
    {
      name: 'Starter',
      code: 'STARTER',
      description: 'Perfect for small businesses getting started',
      price: 999,
      billingCycle: 'MONTHLY',
      maxProducts: 50,
      maxStaff: 2,
      maxWarehouses: 1,
      maxBranches: 1,
      features: ['50 Products', '2 Staff', '1 Warehouse', 'Basic Analytics', 'Email Support'],
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Growth',
      code: 'GROWTH',
      description: 'For growing businesses with more needs',
      price: 2499,
      billingCycle: 'MONTHLY',
      maxProducts: 500,
      maxStaff: 10,
      maxWarehouses: 3,
      maxBranches: 5,
      features: ['500 Products', '10 Staff', '3 Warehouses', 'Advanced Analytics', 'Priority Support', 'API Access'],
      isActive: true,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: 'Enterprise',
      code: 'ENTERPRISE',
      description: 'For large enterprises with unlimited needs',
      price: 9999,
      billingCycle: 'MONTHLY',
      maxProducts: 10000,
      maxStaff: 50,
      maxWarehouses: 10,
      maxBranches: 20,
      features: ['Unlimited Products', '50 Staff', '10 Warehouses', 'Custom Analytics', 'Dedicated Support', 'API Access', 'White Label'],
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }
  console.log('✅ Subscription plans created');

  // ============================================
  // 7. CATEGORIES
  // ============================================
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic components and devices', sortOrder: 1 },
    { name: 'Hardware', slug: 'hardware', description: 'Hardware tools and equipment', sortOrder: 2 },
    { name: 'Industrial Tools', slug: 'industrial-tools', description: 'Industrial machinery and tools', sortOrder: 3 },
    { name: 'Electrical', slug: 'electrical', description: 'Electrical supplies and equipment', sortOrder: 4 },
    { name: 'Safety Equipment', slug: 'safety-equipment', description: 'Safety gear and PPE', sortOrder: 5 },
    { name: 'Construction Materials', slug: 'construction-materials', description: 'Building and construction materials', sortOrder: 6 },
    { name: 'Agriculture', slug: 'agriculture', description: 'Agricultural supplies and equipment', sortOrder: 7 },
    { name: 'Auto Parts', slug: 'auto-parts', description: 'Automotive parts and accessories', sortOrder: 8 },
    { name: 'Office Supplies', slug: 'office-supplies', description: 'Office stationery and equipment', sortOrder: 9 },
    { name: 'Packaging', slug: 'packaging', description: 'Packaging materials and supplies', sortOrder: 10 },
    { name: 'Chemicals', slug: 'chemicals', description: 'Industrial chemicals and compounds', sortOrder: 11 },
    { name: 'Plumbing', slug: 'plumbing', description: 'Plumbing supplies and fittings', sortOrder: 12 },
  ];

  const createdCategories = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories[cat.slug] = created;
  }
  console.log('✅ Categories created');

  // ============================================
  // 8. BRAND
  // ============================================
  await prisma.brand.upsert({
    where: { id: 'demo-brand-1' },
    update: {},
    create: {
      id: 'demo-brand-1',
      name: 'ProSupply',
      description: 'Professional grade supplies',
      isActive: true,
    },
  });
  console.log('✅ Brand created');

  // ============================================
  // 9. DEMO PRODUCTS
  // ============================================
  const productsData = [
    {
      name: 'Industrial Steel Pipe 2"',
      slug: 'industrial-steel-pipe-2',
      description: 'High-quality industrial grade steel pipe, 2 inch diameter. Suitable for construction and industrial applications.',
      hsnCode: '7304',
      unit: 'MTR',
      weight: 5.5,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: true,
      categoryId: createdCategories['hardware']?.id,
      pricing: { minQty: 1, sellingPrice: 850, mrp: 999 },
    },
    {
      name: 'Cement Bag 50kg',
      slug: 'cement-bag-50kg',
      description: 'Portland cement, 50kg bag. Grade 43, suitable for all construction purposes.',
      hsnCode: '2523',
      unit: 'BAG',
      weight: 50,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: true,
      categoryId: createdCategories['construction-materials']?.id,
      pricing: { minQty: 1, sellingPrice: 380, mrp: 420 },
    },
    {
      name: 'Safety Helmet - Industrial Grade',
      slug: 'safety-helmet-industrial',
      description: 'High-impact resistant safety helmet with adjustable strap. ISI marked.',
      hsnCode: '6506',
      unit: 'PCS',
      weight: 0.4,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: true,
      categoryId: createdCategories['safety-equipment']?.id,
      pricing: { minQty: 1, sellingPrice: 250, mrp: 350 },
    },
    {
      name: 'LED Bulb 20W - Pack of 10',
      slug: 'led-bulb-20w-pack-10',
      description: 'Energy-efficient LED bulbs, 20W, cool daylight. Pack of 10 pieces.',
      hsnCode: '8539',
      unit: 'BOX',
      weight: 0.8,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: false,
      categoryId: createdCategories['electrical']?.id,
      pricing: { minQty: 1, sellingPrice: 899, mrp: 1200 },
    },
    {
      name: 'Copper Wire 2.5mm - 90m Roll',
      slug: 'copper-wire-2-5mm-90m',
      description: 'Pure copper electrical wire, 2.5mm thickness, 90 meters roll. ISI certified.',
      hsnCode: '8544',
      unit: 'ROLL',
      weight: 2.1,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: false,
      categoryId: createdCategories['electrical']?.id,
      pricing: { minQty: 1, sellingPrice: 1650, mrp: 1999 },
    },
    {
      name: 'Heavy Duty Work Gloves',
      slug: 'heavy-duty-work-gloves',
      description: 'Cut-resistant work gloves with reinforced palm. Suitable for industrial work.',
      hsnCode: '6116',
      unit: 'PAIR',
      weight: 0.15,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: false,
      categoryId: createdCategories['safety-equipment']?.id,
      pricing: { minQty: 1, sellingPrice: 180, mrp: 250 },
    },
    {
      name: 'PVC Pipe 4" - 3m Length',
      slug: 'pvc-pipe-4-inch-3m',
      description: 'Heavy-duty PVC pipe for plumbing and drainage. UV resistant.',
      hsnCode: '3917',
      unit: 'PCS',
      weight: 3.2,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: false,
      categoryId: createdCategories['plumbing']?.id,
      pricing: { minQty: 1, sellingPrice: 450, mrp: 550 },
    },
    {
      name: 'Industrial Grade Hand Sanitizer 5L',
      slug: 'hand-sanitizer-5l',
      description: 'Alcohol-based hand sanitizer for industrial use. 5 liter container.',
      hsnCode: '3808',
      unit: 'CAN',
      weight: 5.5,
      countryOfOrigin: 'India',
      isActive: true,
      isApproved: true,
      isFeatured: false,
      categoryId: createdCategories['chemicals']?.id,
      pricing: { minQty: 1, sellingPrice: 599, mrp: 750 },
    },
  ];

    for (const prod of productsData) {
    const { pricing, ...productData } = prod;
    if (!productData.categoryId) continue;
    
    // Delete existing pricing first (clean slate)
    const existingProduct = await prisma.product.findUnique({
      where: { supplierId_slug: { supplierId: supplier.id, slug: productData.slug } },
      select: { id: true },
    });
    
    if (existingProduct) {
      await prisma.productPricing.deleteMany({ where: { productId: existingProduct.id } });
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          ...productData,
          categoryId: productData.categoryId,
          brandId: 'demo-brand-1',
          pricing: {
            create: {
              priceType: 'RETAIL',
              sellingPrice: pricing.sellingPrice,
              mrp: pricing.mrp,
              minQty: pricing.minQty,
            },
          },
        },
      });
    } else {
      await prisma.product.create({
        data: {
          ...productData,
          supplierId: supplier.id,
          brandId: 'demo-brand-1',
          pricing: {
            create: {
              priceType: 'RETAIL',
              sellingPrice: pricing.sellingPrice,
              mrp: pricing.mrp,
              minQty: pricing.minQty,
            },
          },
        },
      });
    }
  }
  console.log('✅ Demo products created');

    // ============================================
  // 10. BANNERS
  // ============================================
  await prisma.banner.createMany({
    data: [
      {
        title: 'Industrial Supplies Sale',
        imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
        linkUrl: '/products',
        isActive: true,
        sortOrder: 1,
      },
      {
        title: 'New Safety Equipment',
        imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
        linkUrl: '/categories/safety-equipment',
        isActive: true,
        sortOrder: 2,
      },
      {
        title: 'Free Delivery Above ₹999',
        imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
        linkUrl: '/products',
        isActive: true,
        sortOrder: 3,
      },
    ],
  });
  console.log('✅ Banners created');

  // ============================================
  // 11. SYSTEM SETTINGS
  // ============================================
  const settings = [
    // GENERAL
    { category: 'GENERAL', key: 'platformName', value: 'PROCURE', description: 'Platform name' },
    { category: 'GENERAL', key: 'platformDescription', value: 'Enterprise procurement platform for modern businesses.', description: 'Platform description' },
    { category: 'GENERAL', key: 'supportEmail', value: 'support@procure.com', description: 'Support email' },
    { category: 'GENERAL', key: 'supportPhone', value: '1800-PROCURE', description: 'Support phone' },
    { category: 'GENERAL', key: 'language', value: 'English', description: 'Default language' },
    { category: 'GENERAL', key: 'currency', value: 'INR', description: 'Default currency' },
    { category: 'GENERAL', key: 'timezone', value: 'Asia/Kolkata', description: 'Default timezone' },
    // DELIVERY
    { category: 'DELIVERY', key: 'freeDeliveryAbove', value: '999', description: 'Free delivery above this amount' },
    { category: 'DELIVERY', key: 'freeWeightUpTo', value: '5', description: 'Free weight in kg' },
    { category: 'DELIVERY', key: 'weightChargePerKg', value: '3', description: 'Charge per extra kg' },
    { category: 'DELIVERY', key: 'maxWeight', value: '40000', description: 'Maximum order weight in kg' },
    { category: 'DELIVERY', key: 'maxDistance', value: '200', description: 'Maximum delivery distance in km' },
    { category: 'DELIVERY', key: 'platformFee', value: '5', description: 'Platform fee per order' },
    { category: 'DELIVERY', key: 'gstPercent', value: '5', description: 'GST on delivery percentage' },
    { category: 'DELIVERY', key: 'codCharge', value: '30', description: 'COD charge' },
    { category: 'DELIVERY', key: 'expressMultiplier', value: '1.8', description: 'Express delivery multiplier' },
    { category: 'DELIVERY', key: 'sameDayMultiplier', value: '2.0', description: 'Same day delivery multiplier' },
    { category: 'DELIVERY', key: 'minDeliveryFee', value: '20', description: 'Minimum delivery fee' },
    { category: 'DELIVERY', key: 'surgeEnabled', value: 'false', description: 'Surge pricing enabled' },
    { category: 'DELIVERY', key: 'rainSurgeMultiplier', value: '1.5', description: 'Rain surge multiplier' },
    { category: 'DELIVERY', key: 'autoWeatherEnabled', value: 'true', description: 'Auto weather detection' },
    {
      category: 'DELIVERY', key: 'vehicles',
      value: JSON.stringify([
        { type: 'Bike', maxWeight: 30, distanceSlabs: [{ upToKm: 5, perKmRate: 15 }, { upToKm: 10, perKmRate: 20 }, { upToKm: 999, perKmRate: 30 }] },
        { type: 'Auto', maxWeight: 100, distanceSlabs: [{ upToKm: 5, perKmRate: 25 }, { upToKm: 10, perKmRate: 35 }, { upToKm: 20, perKmRate: 50 }, { upToKm: 999, perKmRate: 70 }] },
        { type: 'Tempo', maxWeight: 500, distanceSlabs: [{ upToKm: 5, perKmRate: 50 }, { upToKm: 10, perKmRate: 70 }, { upToKm: 20, perKmRate: 100 }, { upToKm: 999, perKmRate: 150 }] },
        { type: 'Truck', maxWeight: 3000, distanceSlabs: [{ upToKm: 10, perKmRate: 100 }, { upToKm: 30, perKmRate: 150 }, { upToKm: 50, perKmRate: 200 }, { upToKm: 999, perKmRate: 300 }] },
        { type: 'Trailer', maxWeight: 40000, distanceSlabs: [{ upToKm: 50, perKmRate: 200 }, { upToKm: 100, perKmRate: 350 }, { upToKm: 200, perKmRate: 500 }, { upToKm: 999, perKmRate: 800 }] },
      ]),
      description: 'Vehicle types with distance slabs'
    },
    // COMMISSION
    { category: 'COMMISSION', key: 'defaultRate', value: '5', description: 'Default commission rate percentage' },
    { category: 'COMMISSION', key: 'commissionOnDelivery', value: 'false', description: 'Charge commission on delivery' },
    // PAYMENT
    { category: 'PAYMENT', key: 'razorpayEnabled', value: 'true', description: 'Razorpay enabled' },
    { category: 'PAYMENT', key: 'codEnabled', value: 'true', description: 'COD enabled' },
    { category: 'PAYMENT', key: 'codMaxAmount', value: '50000', description: 'Maximum COD amount' },
    { category: 'PAYMENT', key: 'walletEnabled', value: 'true', description: 'Wallet enabled' },
    { category: 'PAYMENT', key: 'walletMinBalance', value: '0', description: 'Wallet minimum balance' },
    { category: 'PAYMENT', key: 'upiEnabled', value: 'true', description: 'UPI enabled' },
    { category: 'PAYMENT', key: 'bankTransferEnabled', value: 'true', description: 'Bank transfer enabled' },
    // SETTLEMENT
    { category: 'SETTLEMENT', key: 'settlementCycle', value: 'WEEKLY', description: 'Settlement cycle' },
    { category: 'SETTLEMENT', key: 'minSettlement', value: '1000', description: 'Minimum settlement amount' },
    { category: 'SETTLEMENT', key: 'holdPeriod', value: '7', description: 'Hold period in days' },
    // REFUND
    { category: 'REFUND', key: 'refundApprovalRequired', value: 'true', description: 'Refund requires approval' },
    { category: 'REFUND', key: 'maxRefundDays', value: '30', description: 'Maximum refund days' },
    { category: 'REFUND', key: 'partialRefundEnabled', value: 'true', description: 'Partial refunds enabled' },
    { category: 'REFUND', key: 'autoRefundBelow', value: '0', description: 'Auto refund below amount' },
    { category: 'REFUND', key: 'refundToWallet', value: 'true', description: 'Refund to wallet' },
    { category: 'REFUND', key: 'refundToBank', value: 'true', description: 'Refund to bank' },
    { category: 'REFUND', key: 'refundToOriginal', value: 'true', description: 'Refund to original payment method' },
    { category: 'REFUND', key: 'platformCommissionOnRefund', value: 'false', description: 'Charge commission on refund' },
    { category: 'REFUND', key: 'platformCommissionRate', value: '0', description: 'Commission rate on refund' },
    // NOTIFICATION
    { category: 'NOTIFICATION', key: 'emailEnabled', value: 'true', description: 'Email notifications enabled' },
    { category: 'NOTIFICATION', key: 'smsEnabled', value: 'false', description: 'SMS notifications enabled' },
    { category: 'NOTIFICATION', key: 'pushEnabled', value: 'true', description: 'Push notifications enabled' },
    { category: 'NOTIFICATION', key: 'whatsappEnabled', value: 'false', description: 'WhatsApp notifications enabled' },
    { category: 'NOTIFICATION', key: 'orderConfirmation', value: 'true', description: 'Order confirmation notification' },
    { category: 'NOTIFICATION', key: 'shippingUpdate', value: 'true', description: 'Shipping update notification' },
    { category: 'NOTIFICATION', key: 'deliveryOTP', value: 'true', description: 'Delivery OTP notification' },
    { category: 'NOTIFICATION', key: 'rfqAlert', value: 'true', description: 'RFQ alert notification' },
    { category: 'NOTIFICATION', key: 'paymentReceipt', value: 'true', description: 'Payment receipt notification' },
    { category: 'NOTIFICATION', key: 'promotionalEmail', value: 'false', description: 'Promotional email notification' },
    // FEATURES
    { category: 'FEATURES', key: 'marketplace', value: 'true', description: 'Marketplace feature' },
    { category: 'FEATURES', key: 'rfq', value: 'true', description: 'RFQ feature' },
    { category: 'FEATURES', key: 'wallet', value: 'true', description: 'Wallet feature' },
    { category: 'FEATURES', key: 'delivery', value: 'true', description: 'Delivery feature' },
    { category: 'FEATURES', key: 'payments', value: 'true', description: 'Payments feature' },
    { category: 'FEATURES', key: 'referrals', value: 'false', description: 'Referrals feature' },
    { category: 'FEATURES', key: 'loyalty', value: 'false', description: 'Loyalty feature' },
    { category: 'FEATURES', key: 'ai', value: 'false', description: 'AI features' },
    { category: 'FEATURES', key: 'bulkImport', value: 'true', description: 'Bulk import feature' },
    { category: 'FEATURES', key: 'sponsoredProducts', value: 'false', description: 'Sponsored products feature' },
    { category: 'FEATURES', key: 'sms', value: 'false', description: 'SMS feature' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { category_key: { category: setting.category, key: setting.key } },
      update: { value: setting.value },
      create: { ...setting, value: setting.value },
    });
  }
  console.log('✅ System settings created (GENERAL, DELIVERY, COMMISSION, PAYMENT, SETTLEMENT, REFUND, NOTIFICATION, FEATURES)');

  // ============================================
  // 12. NOTIFICATION TEMPLATES
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
  // 13. INVOICES
  // ============================================
    await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-001' },
    update: {},
    create: {
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

    await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-002' },
    update: {},
    create: {
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
  console.log('✅ Invoices created');

  // ============================================
  // 14. SETTLEMENTS
  // ============================================
  await prisma.settlement.createMany({
    data: [
      { supplierId: supplier.id, amount: 25000, status: 'PROCESSED', settlementType: 'AUTO', processedAt: new Date('2024-12-01') },
      { supplierId: supplier.id, amount: 15000, status: 'PROCESSED', settlementType: 'MANUAL', processedAt: new Date('2024-11-15') },
      { supplierId: supplier.id, amount: 20000, status: 'PENDING', settlementType: 'AUTO' },
    ],
  });
  console.log('✅ Settlements created');

  // ============================================
  // 15. WELCOME NOTIFICATIONS
  // ============================================
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
        userId: demoBuyer.id,
        type: 'IN_APP',
        title: 'Welcome to PROCURE!',
        message: 'Start exploring products and placing orders. Free delivery on orders above ₹999!',
        isRead: false,
      },
    ],
  });
  console.log('✅ Welcome notifications created');

  // ============================================
  // 16. ANALYTICS EVENTS
  // ============================================
  const events = [
    { eventName: 'user_registered', eventCategory: 'AUTH', userId: demoSupplier.id },
    { eventName: 'supplier_verified', eventCategory: 'SUPPLIER', supplierId: supplier.id },
    { eventName: 'page_view', eventCategory: 'ENGAGEMENT', data: { page: '/dashboard' } },
    { eventName: 'search_performed', eventCategory: 'ENGAGEMENT', data: { query: 'steel pipes' } },
  ];

  for (const event of events) {
    await prisma.analyticsEvent.create({ data: event });
  }
  console.log('✅ Analytics events seeded');

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Super Admin: admin@procure.com / Admin@123');
  console.log('🏭 Supplier: supplier@demo.com / Admin@123');
  console.log('🛒 Buyer: buyer@demo.com / Admin@123');
  console.log('🛵 Delivery Partner: 9876543210 / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });