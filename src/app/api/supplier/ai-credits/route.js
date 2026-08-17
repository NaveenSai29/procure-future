import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ImageGeneratorService } from '@/services/image-generator.service';

// GET - Get supplier's AI credits info
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id },
    });

    if (!supplierStaff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const creditInfo = await ImageGeneratorService.getSupplierCredits(supplierStaff.supplierId);

    // Get recent generation history
    const recentGenerations = await prisma.aIGenerationLog.findMany({
      where: { supplierId: supplierStaff.supplierId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    // Get generation count per product (for limit tracking)
    const productGenerationCounts = await prisma.aIGenerationLog.groupBy({
      by: ['productId'],
      where: {
        supplierId: supplierStaff.supplierId,
        status: 'SUCCESS',
      },
      _count: { productId: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...creditInfo,
        recentGenerations,
        productGenerationCounts: productGenerationCounts.map(p => ({
          productId: p.productId,
          count: p._count.productId,
        })),
      },
    });

  } catch (error) {
    console.error('Get AI credits error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credits' },
      { status: 500 }
    );
  }
}

// POST - Purchase more credits (creates Razorpay order)
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
    const { credits } = body;

    if (!credits || parseInt(credits) <= 0) {
      return NextResponse.json({ error: 'Credits must be positive' }, { status: 400 });
    }

    const creditsNum = parseInt(credits);
    const settings = await ImageGeneratorService.getSettings();
    const amount = creditsNum * settings.creditPricePerUnit;

    // Create purchase record
    const purchase = await prisma.aICreditPurchase.create({
      data: {
        supplierId: supplierStaff.supplierId,
        creditsPurchased: creditsNum,
        amount,
        status: 'PENDING',
      },
    });

    // Create Razorpay order
    const razorpayService = await import('@/services/razorpay.service');
    const order = await razorpayService.createOrder({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `ai-credits-${purchase.id}`,
      notes: {
        purchaseId: purchase.id,
        supplierId: supplierStaff.supplierId,
        credits: creditsNum,
      },
    });

    // Update purchase with Razorpay order ID
    await prisma.aICreditPurchase.update({
      where: { id: purchase.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        orderId: order.id,
        amount,
        credits: creditsNum,
        pricePerCredit: settings.creditPricePerUnit,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    });

  } catch (error) {
    console.error('Purchase credits error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase' },
      { status: 500 }
    );
  }
}