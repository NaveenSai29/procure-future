import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const [
      totalRFQs,
      statusBreakdown,
      categoryBreakdown,
      topSuppliers,
      monthlyRFQs,
      avgQuotationsPerRFQ
    ] = await Promise.all([
      prisma.rFQ.count(),
      prisma.rFQ.groupBy({ by: ['status'], _count: true }),
      prisma.rFQ.groupBy({ by: ['categoryId'], _count: true, _sum: { budgetMax: true } }),
      prisma.quotation.groupBy({
        by: ['supplierId'],
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { _count: 'desc' },
        take: 10
      }),
      prisma.$queryRaw`
        SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count, SUM(budgetMax) as totalBudget
        FROM RFQ
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `,
      prisma.$queryRaw`
        SELECT AVG(quote_count) as avgQuotes FROM (
          SELECT COUNT(*) as quote_count FROM Quotation GROUP BY rfqId
        ) as subquery
      `
    ]);

    // Get category names
    const categoryIds = categoryBreakdown.map(c => c.categoryId).filter(Boolean);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    });

    const categoryData = categoryBreakdown.map(c => ({
      category: categories.find(cat => cat.id === c.categoryId)?.name || 'Uncategorized',
      count: c._count,
      totalBudget: c._sum?.budgetMax || 0
    }));

    return NextResponse.json({
      totalRFQs,
      statusBreakdown,
      categoryData,
      topSuppliers,
      monthlyRFQs,
      avgQuotationsPerRFQ: avgQuotationsPerRFQ[0]?.avgQuotes || 0
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}