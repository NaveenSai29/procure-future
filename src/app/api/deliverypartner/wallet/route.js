import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// GET - Get partner wallet balance
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { deliveryPartner: { select: { id: true } } },
    });

    if (!user?.deliveryPartner) return errorResponse('Partner profile not found', 404);

    // Get or create wallet
    let wallet = await prisma.partnerWallet.findUnique({
      where: { partnerId: user.deliveryPartner.id },
    });

    if (!wallet) {
      wallet = await prisma.partnerWallet.create({
        data: { partnerId: user.deliveryPartner.id },
      });
    }

    // Get COD settings from system settings
    const codSettings = await prisma.systemSetting.findMany({
      where: { category: 'DELIVERY', key: { in: ['codMaxPending', 'codSecurityDeposit'] } },
    });

    const codLimit = parseFloat(codSettings.find(s => s.key === 'codMaxPending')?.value || '5000');
    const securityDeposit = parseFloat(codSettings.find(s => s.key === 'codSecurityDeposit')?.value || '1000');

    // Get BANK_DETAILS settings for partner to see where to deposit
    const bankSettings = await prisma.systemSetting.findMany({
      where: { category: 'BANK_DETAILS' },
    });

    const bankDetails = {};
    bankSettings.forEach(s => {
      try { bankDetails[s.key] = JSON.parse(s.value); } 
      catch { bankDetails[s.key] = s.value; }
    });

    return successResponse({
      wallet,
      codLimit,
      securityDeposit,
      canTakeCOD: wallet.codPending < codLimit,
      remainingCOD: Math.max(0, codLimit - wallet.codPending),
      bankDetails: {
        bankName: bankDetails.bankName || '',
        accountHolder: bankDetails.accountHolder || '',
        accountNumber: bankDetails.accountNumber || '',
        ifscCode: bankDetails.ifscCode || '',
        branchName: bankDetails.branchName || '',
        upiId: bankDetails.upiId || '',
        notes: bankDetails.notes || '',
      },
    });
  } catch (error) {
    console.error('Wallet error:', error);
    return errorResponse('Failed to fetch wallet', 500);
  }
}

// POST - Submit COD deposit with proof
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { deliveryPartner: { select: { id: true } } },
    });

    if (!user?.deliveryPartner) return errorResponse('Partner profile not found', 404);

    const body = await request.json();
    const { amount, referenceNumber, proofImage } = body;

    if (!amount || amount <= 0) return errorResponse('Valid amount required', 400);

    const wallet = await prisma.partnerWallet.findUnique({
      where: { partnerId: user.deliveryPartner.id },
    });

    if (!wallet) return errorResponse('Wallet not found', 404);

    // Create COD deposit request
    const deposit = await prisma.cODDeposit.create({
      data: {
        partnerId: user.deliveryPartner.id,
        walletId: wallet.id,
        amount: parseFloat(amount),
        referenceNumber: referenceNumber || null,
        proofImage: proofImage || null,
        status: 'PENDING',
      },
    });

    return successResponse({
      message: 'Deposit submitted for verification',
      deposit,
      pendingAmount: wallet.codPending,
    });
  } catch (error) {
    console.error('COD deposit error:', error);
    return errorResponse('Failed to submit deposit', 500);
  }
}