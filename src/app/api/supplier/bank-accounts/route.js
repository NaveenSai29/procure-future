import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const staff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    if (!staff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const accounts = await prisma.supplierBankAccount.findMany({
      where: { supplierId: staff.supplierId },
      orderBy: { isDefault: 'desc' }
    });
    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const staff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    if (!staff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    if (body.isDefault) {
      await prisma.supplierBankAccount.updateMany({ where: { supplierId: staff.supplierId }, data: { isDefault: false } });
    }
    const account = await prisma.supplierBankAccount.create({ data: { ...body, supplierId: staff.supplierId } });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}