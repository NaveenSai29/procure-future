import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const branches = await prisma.supplierBranch.findMany({
      where: { supplierId: supplierStaff.supplierId },
      include: {
        _count: { select: { staff: true } },
        businessHours: { orderBy: { dayOfWeek: 'asc' } }
      },
      orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }]
    });

    return NextResponse.json({ branches, total: branches.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    const { branchName, addressLine1, addressLine2, city, state, pincode, mobile, email, isHeadOffice, businessHours } = body;

    // If setting as head office, unset any existing head office
    if (isHeadOffice) {
      await prisma.supplierBranch.updateMany({
        where: { supplierId: supplierStaff.supplierId },
        data: { isHeadOffice: false }
      });
    }

    const branch = await prisma.supplierBranch.create({
      data: {
        supplierId: supplierStaff.supplierId,
        branchName,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        pincode,
        mobile,
        email: email || null,
        isHeadOffice: isHeadOffice || false,
        businessHours: businessHours ? {
          create: businessHours.map(bh => ({
            dayOfWeek: bh.dayOfWeek,
            openTime: bh.openTime,
            closeTime: bh.closeTime,
            isOpen: bh.isOpen !== false
          }))
        } : undefined
      },
      include: {
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { staff: true } }
      }
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}