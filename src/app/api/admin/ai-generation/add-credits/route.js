import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Manually add AI credits to supplier
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id },
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { supplierId, credits, note } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    if (!credits || parseInt(credits) <= 0) {
      return NextResponse.json({ error: 'Credits must be positive' }, { status: 400 });
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, businessName: true, aiCredits: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Add credits
    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        aiCredits: { increment: parseInt(credits) },
      },
      select: {
        id: true,
        businessName: true,
        aiCredits: true,
        aiGenerationsUsed: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADD_AI_CREDITS',
        entity: 'Supplier',
        entityId: supplierId,
        oldValue: { aiCredits: supplier.aiCredits },
        newValue: { aiCredits: updatedSupplier.aiCredits, added: parseInt(credits), note: note || '' },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${credits} credits added to ${supplier.businessName}`,
      data: {
        supplier: updatedSupplier,
        previousCredits: supplier.aiCredits,
        creditsAdded: parseInt(credits),
        newBalance: updatedSupplier.aiCredits,
      },
    });

  } catch (error) {
    console.error('Add credits error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add credits' },
      { status: 500 }
    );
  }
}