import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("Not a supplier", 403);

    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: { select: { businessName: true, gstin: true, gstBusinessName: true, email: true, mobile: true } },
      },
    });

    if (!invoice || invoice.supplierId !== staff.supplierId) {
      return errorResponse("Invoice not found", 404);
    }

    const order = invoice.orderId ? await prisma.order.findUnique({
      where: { id: invoice.orderId },
      select: {
        id: true,
        createdAt: true,
        quantity: true,
        price: true,
        totalAmount: true,
        product: { select: { name: true, sku: true } },
        buyer: { select: { name: true } },
      },
    }) : null;

    // Build printable HTML invoice for supplier
    const invoiceNumber = invoice.invoiceNumber;
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const orderId = invoice.orderId?.slice(0, 8).toUpperCase() || 'N/A';
    const orderDate = order ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const buyerName = order?.buyer?.name || 'Customer';
    const productName = invoice.items[0]?.description || order?.product?.name || 'Product';
    const quantity = order?.quantity || invoice.items[0]?.quantity || 1;
    const unitPrice = invoice.items[0]?.unitPrice || 0;
    const commissionRate = invoice.items[0]?.taxRate || 0;
    const commissionAmount = invoice.taxAmount || 0;
    const grossAmount = invoice.amount || 0;
    const netAmount = invoice.totalAmount || 0;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoiceNumber}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; max-width: 700px; margin: auto; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #FC8019; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #FC8019; font-size: 22px; margin: 0; }
  .header .inv-title { text-align: right; }
  .header .inv-title h2 { margin: 0; font-size: 16px; color: #333; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .row.total { font-weight: bold; font-size: 15px; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
  .row.deduction { color: #EF4444; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-paid { background: #DCFCE7; color: #166534; }
</style></head><body>
<div class="header">
  <div><h1>PROCURE</h1><p>Supplier Invoice</p></div>
  <div class="inv-title"><h2>INVOICE</h2><p>${invoiceNumber}<br>${invoiceDate}</p></div>
</div>
<div class="section">
  <h3>Order Details</h3>
  <div class="row"><span>Order ID</span><span>#${orderId}</span></div>
  <div class="row"><span>Order Date</span><span>${orderDate || invoiceDate}</span></div>
  <div class="row"><span>Customer</span><span>${buyerName}</span></div>
  <div class="row"><span>Status</span><span class="badge badge-paid">PAID</span></div>
</div>
<div class="section">
  <h3>Items</h3>
  <table>
    <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Gross</th></tr>
    <tr>
      <td>${productName}</td>
      <td>${quantity}</td>
      <td>₹${unitPrice.toLocaleString('en-IN')}</td>
      <td>₹${grossAmount.toLocaleString('en-IN')}</td>
    </tr>
  </table>
</div>
<div class="section">
  <h3>Amount Summary</h3>
  <div class="row"><span>Gross Order Amount</span><span>₹${grossAmount.toLocaleString('en-IN')}</span></div>
  <div class="row deduction"><span>PROCURE Commission (${commissionRate}%)</span><span>-₹${commissionAmount.toLocaleString('en-IN')}</span></div>
  <div class="row total"><span>Net Payable to You</span><span>₹${netAmount.toLocaleString('en-IN')}</span></div>
</div>
<div class="footer">
  <p>This is a computer-generated supplier invoice. For any queries, contact support@procure.com</p>
  <p>${invoice.supplier?.businessName || ''} | GSTIN: ${invoice.supplier?.gstin || 'N/A'}</p>
</div>
</body></html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("Supplier invoice error:", error);
    return errorResponse("Failed to generate invoice", 500);
  }
}