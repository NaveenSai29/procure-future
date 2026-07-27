import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { StaffService } from '@/services/staff.service';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roleId } = await params;
    const role = await StaffService.getRole(roleId);
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roleId } = await params;
    const body = await request.json();
    const role = await StaffService.updateRole(roleId, body);

    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roleId } = await params;
    await StaffService.deleteRole(roleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}