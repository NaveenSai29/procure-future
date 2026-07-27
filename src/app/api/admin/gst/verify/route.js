import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { verifyGstinFromPortal, bulkVerifyGstins, getGstVerificationStatus, validateGstinFormat } from '@/services/gst.service';
import prisma from '@/lib/prisma';

// Helper to check admin access
async function checkAdminAccess(session) {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  const userRoles = user.roles.map(r => r.role.name);
  return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
}

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const isAdmin = await checkAdminAccess(session);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const gstin = searchParams.get('gstin');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const filter = searchParams.get('filter') || 'ALL';

    // Get specific supplier GST status
    if (supplierId) {
      const status = await getGstVerificationStatus(supplierId);
      if (!status) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: status });
    }

    // Validate format only
    if (gstin) {
      const validation = validateGstinFormat(gstin);
      return NextResponse.json({ success: true, data: validation });
    }

    // List all suppliers with GST status (paginated)
    const where = {};
    if (filter === 'VERIFIED') where.gstVerified = true;
    if (filter === 'UNVERIFIED') where.gstVerified = false;

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          gstin: true,
          gstVerified: true,
          gstVerificationDate: true,
          gstBusinessName: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    const [verifiedCount, unverifiedCount] = await Promise.all([
      prisma.supplier.count({ where: { gstVerified: true } }),
      prisma.supplier.count({ where: { gstVerified: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        stats: { verified: verifiedCount, unverified: unverifiedCount, total },
      },
    });
  } catch (error) {
    console.error('GST GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const isAdmin = await checkAdminAccess(session);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { gstin, supplierId, bulk } = body;

    // Bulk verification
    if (bulk && Array.isArray(bulk)) {
      if (bulk.length > 50) {
        return NextResponse.json({ success: false, error: 'Maximum 50 GSTINs per bulk request' }, { status: 400 });
      }
      const results = await bulkVerifyGstins(bulk);
      return NextResponse.json({ success: true, data: results, count: results.length });
    }

    // Verify by GSTIN directly
    if (gstin) {
      const result = await verifyGstinFromPortal(gstin);
      return NextResponse.json({ success: true, data: result });
    }

    // Verify by supplier ID
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
      }
      const result = await verifyGstinFromPortal(supplier.gstin);

      // Always store the verification result
      await prisma.supplier.update({
        where: { id: supplierId },
        data: {
          gstVerified: result.verified && result.status === 'ACTIVE',
          gstVerificationDate: new Date(),
          gstBusinessName: result.businessName || null,
          gstVerificationResponse: JSON.stringify(result),
        },
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'Provide gstin, supplierId, or bulk array' }, { status: 400 });
  } catch (error) {
    console.error('GST POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}