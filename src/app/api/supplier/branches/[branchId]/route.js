import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;
    const branch = await prisma.supplierBranch.findUnique({
      where: { id: branchId },
      include: {
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        holidays: { orderBy: { date: 'asc' }, take: 30 },
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { staff: true } }
      }
    });

    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    return NextResponse.json(branch);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;
    const body = await request.json();

    const branch = await prisma.supplierBranch.findUnique({ where: { id: branchId } });

    // Handle head office change
    if (body.isHeadOffice && !branch.isHeadOffice) {
      await prisma.supplierBranch.updateMany({
        where: { supplierId: branch.supplierId },
        data: { isHeadOffice: false }
      });
    }

    const updated = await prisma.supplierBranch.update({
      where: { id: branchId },
      data: {
        ...body,
        businessHours: undefined, // handled separately
      },
      include: {
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { staff: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;

    // Check for staff
    const staffCount = await prisma.supplierStaff.count({ where: { branchId } });
    if (staffCount > 0) {
      return NextResponse.json({
        error: `Cannot delete branch with ${staffCount} staff members. Reassign them first.`
      }, { status: 400 });
    }

    await prisma.supplierBranch.delete({ where: { id: branchId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}