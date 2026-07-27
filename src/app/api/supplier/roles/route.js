import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { StaffService } from '@/services/staff.service';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const permissionsOnly = searchParams.get('permissions') === 'true';

    if (permissionsOnly) {
      const permissions = await StaffService.getPermissions();
      return NextResponse.json(permissions);
    }

    const roles = await StaffService.getRoles(supplierStaff.supplierId);
    return NextResponse.json(roles);
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
    const role = await StaffService.createRole(supplierStaff.supplierId, body);

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}