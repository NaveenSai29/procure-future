import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const [supplierAccounts, partnerAccounts] = await Promise.all([
      prisma.supplierBankAccount.findMany({
        include: {
          supplier: { select: { id: true, businessName: true, email: true, isVerified: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.partnerBankAccount.findMany({
        include: {
          partner: {
            select: {
              id: true,
              user: { select: { id: true, name: true, mobile: true } },
              activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
              isVerified: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formattedSuppliers = supplierAccounts.map(acc => ({
      id: acc.id,
      type: 'SUPPLIER',
      accountHolder: acc.accountHolder,
      accountNumber: acc.accountNumber,
      ifscCode: acc.ifscCode,
      bankName: acc.bankName,
      branchName: acc.branchName,
      isDefault: acc.isDefault,
      pennyDropVerified: acc.pennyDropVerified || false,
      verificationStatus: acc.verificationStatus || 'PENDING',
      upiId: null,
      createdAt: acc.createdAt,
      owner: {
        id: acc.supplier?.id,
        name: acc.supplier?.businessName,
        email: acc.supplier?.email,
        isVerified: acc.supplier?.isVerified,
        vehicle: null,
        vehicleNumber: null,
        mobile: null,
      }
    }));

    const formattedPartners = partnerAccounts.map(acc => ({
      id: acc.id,
      type: 'DELIVERY_PARTNER',
      accountHolder: acc.accountHolder,
      accountNumber: acc.accountNumber,
      ifscCode: acc.ifscCode,
      bankName: acc.bankName,
      branchName: acc.branchName,
      isDefault: acc.isDefault,
      pennyDropVerified: acc.pennyDropVerified || false,
      verificationStatus: acc.pennyDropVerified ? 'VERIFIED' : 'PENDING',
      upiId: acc.upiId || null,
      createdAt: acc.createdAt,
      owner: {
        id: acc.partner?.id,
        name: acc.partner?.user?.name || 'Delivery Partner',
        email: null,
        isVerified: acc.partner?.isVerified,
        vehicle: acc.partner?.activeVehicle?.vehicleType,
        vehicleNumber: acc.partner?.activeVehicle?.vehicleNumber,
        mobile: acc.partner?.user?.mobile,
      }
    }));

    const allAccounts = [...formattedSuppliers, ...formattedPartners]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const verified = allAccounts.filter(a => a.pennyDropVerified || a.verificationStatus === 'VERIFIED').length;
    const pending = allAccounts.filter(a => !a.pennyDropVerified && a.verificationStatus !== 'VERIFIED').length;

    return NextResponse.json({ 
      accounts: allAccounts,
      stats: {
        total: allAccounts.length,
        verified,
        pending,
        suppliers: formattedSuppliers.length,
        partners: formattedPartners.length,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Verify or reject bank account
export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { accountId, type, action, reason } = body;

    if (!accountId || !type || !action) {
      return NextResponse.json({ error: 'accountId, type, and action required' }, { status: 400 });
    }

    if (type === 'SUPPLIER') {
      if (action === 'VERIFY') {
        await prisma.supplierBankAccount.update({
          where: { id: accountId },
          data: { pennyDropVerified: true, verificationStatus: 'VERIFIED' }
        });
      } else if (action === 'REJECT') {
        await prisma.supplierBankAccount.update({
          where: { id: accountId },
          data: { pennyDropVerified: false, verificationStatus: 'REJECTED' }
        });
      }
    } else if (type === 'DELIVERY_PARTNER') {
      if (action === 'VERIFY') {
        await prisma.partnerBankAccount.update({
          where: { id: accountId },
          data: { pennyDropVerified: true }
        });
      } else if (action === 'REJECT') {
        await prisma.partnerBankAccount.update({
          where: { id: accountId },
          data: { pennyDropVerified: false }
        });
      }
    }

    // Notify the owner
    try {
      const { NotificationService } = await import('@/services/notification.service');
      let ownerUserId = null;
      
      if (type === 'SUPPLIER') {
        const acc = await prisma.supplierBankAccount.findUnique({
          where: { id: accountId },
          include: { supplier: { include: { staff: { take: 1, select: { userId: true } } } } }
        });
        ownerUserId = acc?.supplier?.staff?.[0]?.userId;
      } else {
        const acc = await prisma.partnerBankAccount.findUnique({
          where: { id: accountId },
          include: { partner: { select: { userId: true } } }
        });
        ownerUserId = acc?.partner?.userId;
      }

      if (ownerUserId) {
        NotificationService.send({
          userId: ownerUserId,
          type: 'IN_APP',
          title: action === 'VERIFY' ? '✅ Bank Account Verified' : '❌ Bank Account Rejected',
          message: action === 'VERIFY' 
            ? 'Your bank account has been verified. You can now receive settlements.' 
            : `Your bank account was rejected. ${reason ? 'Reason: ' + reason : 'Please update your details.'}`,
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true, message: `Account ${action === 'VERIFY' ? 'verified' : 'rejected'}` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}