import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { StaffService } from '@/services/staff.service';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { staffId } = await params;
    const staff = await StaffService.getStaffMember(staffId);
    if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    const permissions = await StaffService.getStaffPermissions(staffId);

    return NextResponse.json({ ...staff, permissions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { staffId } = await params;
    const body = await request.json();
    const staff = await StaffService.updateStaffMember(staffId, body);

    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { staffId } = await params;
    await StaffService.removeStaffMember(staffId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}