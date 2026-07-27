import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    if (body.isDefault) {
      const acc = await prisma.supplierBankAccount.findUnique({ where: { id } });
      await prisma.supplierBankAccount.updateMany({ where: { supplierId: acc.supplierId }, data: { isDefault: false } });
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
    await prisma.supplierBankAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}