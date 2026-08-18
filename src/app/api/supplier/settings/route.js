import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierStaff.supplierId },
      select: {
        id: true, businessName: true, businessType: true, isActive: true, isVerified: true,
        email: true, mobile: true, website: true, tags: true, gstin: true, pan: true,
        logo: true, createdAt: true,
        gstVerified: true, gstBusinessName: true, gstVerificationDate: true,
      }
    });

    // Get emailVerified from User table
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });

    const settings = await prisma.supplierSettings.findUnique({
      where: { supplierId: supplierStaff.supplierId }
    });

    return NextResponse.json({
      supplier: {
        ...supplier,
        emailVerified: userRecord?.emailVerified || false,
      },
      settings
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    
    // Toggle store active/inactive
    if (body.isActive !== undefined) {
      await prisma.supplier.update({
        where: { id: supplierStaff.supplierId },
        data: { isActive: body.isActive }
      });

      return NextResponse.json({ success: true, isActive: body.isActive });
    }

    // Update shop hours
    if (body.shopOpenTime !== undefined || body.shopCloseTime !== undefined || body.shopOpenDays !== undefined) {
      const settingsData = {};
      if (body.shopOpenTime !== undefined) settingsData.shopOpenTime = body.shopOpenTime;
      if (body.shopCloseTime !== undefined) settingsData.shopCloseTime = body.shopCloseTime;
      if (body.shopOpenDays !== undefined) settingsData.shopOpenDays = body.shopOpenDays;

      const settings = await prisma.supplierSettings.upsert({
        where: { supplierId: supplierStaff.supplierId },
        create: { supplierId: supplierStaff.supplierId, ...settingsData },
        update: settingsData,
      });

      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update business information
export async function PUT(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    const { businessName, email, mobile, gstin, pan, businessType, tags, website } = body;

    if (!businessName || !mobile || !businessType) {
      return NextResponse.json({ error: 'Business name, mobile, and business type are required' }, { status: 400 });
    }

    if (gstin) {
      const existing = await prisma.supplier.findFirst({
        where: { gstin, id: { not: supplierStaff.supplierId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'GSTIN is already registered by another supplier' }, { status: 409 });
      }
    }

    const updated = await prisma.supplier.update({
      where: { id: supplierStaff.supplierId },
      data: {
        businessName,
        email,
        mobile,
        gstin: gstin || null,
        pan: pan || null,
        businessType,
        tags: tags || null,
        website: website || null,
      },
      select: {
        id: true, businessName: true, businessType: true, isActive: true, isVerified: true,
        email: true, mobile: true, website: true, tags: true, gstin: true, pan: true,
        gstVerified: true, gstBusinessName: true, gstVerificationDate: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SUPPLIER_PROFILE_UPDATED',
        entity: 'Supplier',
        entityId: supplierStaff.supplierId,
        newValue: { businessName, email, mobile, gstin, pan, businessType, tags },
      }
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error) {
    console.error('Supplier update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}