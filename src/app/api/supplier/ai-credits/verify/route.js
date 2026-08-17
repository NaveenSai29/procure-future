import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ImageGeneratorService } from '@/services/image-generator.service';

// POST - Verify Razorpay payment and add credits
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id },
      include: { supplier: { select: { id: true, businessName: true } } },
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      purchaseId,
    } = body;

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 });
    }

    // Find purchase record
    const purchase = await prisma.aICreditPurchase.findFirst({
      where: {
        id: purchaseId,
        supplierId: supplierStaff.supplierId,
        status: 'PENDING',
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found or already processed' }, { status: 404 });
    }

    // Verify Razorpay signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Mark as failed
      await prisma.aICreditPurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'FAILED',
          razorpayPaymentId: razorpay_payment_id || null,
        },
      });

      return NextResponse.json({ 
        error: 'Payment verification failed' 
      }, { status: 400 });
    }

    // Payment verified - add credits to supplier
    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierStaff.supplierId },
      data: {
        aiCredits: { increment: purchase.creditsPurchased },
      },
      select: {
        id: true,
        businessName: true,
        aiCredits: true,
      },
    });

    // Update purchase record
    await prisma.aICreditPurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'COMPLETED',
        razorpayPaymentId: razorpay_payment_id,
        completedAt: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PURCHASE_AI_CREDITS',
        entity: 'AICreditPurchase',
        entityId: purchaseId,
        newValue: {
          creditsPurchased: purchase.creditsPurchased,
          amount: purchase.amount,
          razorpayPaymentId: razorpay_payment_id,
          newBalance: updatedSupplier.aiCredits,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${purchase.creditsPurchased} credits added successfully!`,
      data: {
        creditsAdded: purchase.creditsPurchased,
        newBalance: updatedSupplier.aiCredits,
        amountPaid: purchase.amount,
      },
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}