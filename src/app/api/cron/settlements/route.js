import { NextResponse } from 'next/server';
import { FinanceService } from '@/services/finance.service';

export async function GET() {
  try {
    const result = await FinanceService.processAutoSettlements();
    
    return NextResponse.json({
      success: true,
      message: `Suppliers: ${result.results.supplier.processed} processed, ${result.results.supplier.skipped} skipped. Partners: ${result.results.partner.processed} processed, ${result.results.partner.skipped} skipped.`,
      result,
    });
  } catch (error) {
    console.error('Auto-settlement error:', error);
    return NextResponse.json({ success: false, message: 'Auto-settlement failed' }, { status: 500 });
  }
}