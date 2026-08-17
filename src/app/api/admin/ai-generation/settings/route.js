import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ImageGeneratorService } from '@/services/image-generator.service';

// GET - Get AI generation settings
export async function GET(request) {
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

    const settings = await ImageGeneratorService.getSettings();

    // Get usage stats
    const [totalGenerations, totalSuppliersUsing, totalCreditsPurchased] = await Promise.all([
      prisma.aIGenerationLog.count(),
      prisma.aIGenerationLog.groupBy({
        by: ['supplierId'],
        _count: { supplierId: true },
      }),
      prisma.aICreditPurchase.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { creditsPurchased: true, amount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        settings,
        stats: {
          totalGenerations,
          suppliersUsingAI: totalSuppliersUsing.length,
          creditsPurchased: totalCreditsPurchased._sum.creditsPurchased || 0,
          revenueFromCredits: totalCreditsPurchased._sum.amount || 0,
        },
      },
    });

  } catch (error) {
    console.error('Get AI settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// PATCH - Update AI generation settings
export async function PATCH(request) {
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
    const {
      freeCredits,
      maxGenerationsPerProduct,
      creditCostPerGeneration,
      creditPricePerUnit,
      isEnabled,
    } = body;

    // Get existing settings or create
    let settings = await prisma.aIGenerationSetting.findFirst();

    if (!settings) {
      settings = await prisma.aIGenerationSetting.create({
        data: {
          freeCredits: freeCredits !== undefined ? freeCredits : 100,
          maxGenerationsPerProduct: maxGenerationsPerProduct !== undefined ? maxGenerationsPerProduct : 3,
          creditCostPerGeneration: creditCostPerGeneration !== undefined ? creditCostPerGeneration : 1,
          creditPricePerUnit: creditPricePerUnit !== undefined ? creditPricePerUnit : 1.0,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
        },
      });
    } else {
      settings = await prisma.aIGenerationSetting.update({
        where: { id: settings.id },
        data: {
          ...(freeCredits !== undefined && { freeCredits }),
          ...(maxGenerationsPerProduct !== undefined && { maxGenerationsPerProduct }),
          ...(creditCostPerGeneration !== undefined && { creditCostPerGeneration }),
          ...(creditPricePerUnit !== undefined && { creditPricePerUnit }),
          ...(isEnabled !== undefined && { isEnabled }),
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_AI_GENERATION_SETTINGS',
        entity: 'AIGenerationSetting',
        entityId: settings.id,
        newValue: body,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      data: { settings },
      message: 'AI generation settings updated',
    });

  } catch (error) {
    console.error('Update AI settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}