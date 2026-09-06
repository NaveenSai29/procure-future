import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    // Get supplier staff
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Check if bank account belongs to this supplier
    const existingAccount = await prisma.supplierBankAccount.findUnique({ where: { id } });
    if (!existingAccount || existingAccount.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    if (body.isDefault) {
      await prisma.supplierBankAccount.updateMany({ where: { supplierId: supplierStaff.supplierId }, data: { isDefault: false } });
    }
    const account = await prisma.supplierBankAccount.update({ where: { id }, data: body });
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    // Get supplier staff
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Check if bank account belongs to this supplier
    const existingAccount = await prisma.supplierBankAccount.findUnique({ where: { id } });
    if (!existingAccount || existingAccount.supplierId !== supplierStaff.supplierId) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    await prisma.supplierBankAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}