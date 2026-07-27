import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const accounts = await prisma.supplierBankAccount.findMany({
      include: {
        supplier: { select: { id: true, businessName: true, email: true, isVerified: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}