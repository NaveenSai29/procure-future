import prisma from "@/lib/prisma";
import { getSessionUser, errorResponse } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, sku: true } },
        buyer: { select: { name: true, email: true } },
      },
    });

    if (!order) return errorResponse("Order not found", 404);
    if (order.buyerId !== session.userId) return errorResponse("Not your order", 403);
    if (order.status !== 'DELIVERED') return errorResponse("Invoice only available for delivered orders", 400);

    // Get supplier info
    const product = await prisma.product.findUnique({
      where: { id: order.productId },
      include: { supplier: { select: { businessName: true, gstin: true, gstBusinessName: true } } },
    });

    const supplier = product?.supplier;
    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { gstin: true, companyName: true },
    });

    // Generate simple HTML invoice (PDF via html)
    const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const subtotal = order.price * order.quantity;
    const paymentMethod = (order.paymentDetails?.method || order.paymentMethod || 'ONLINE').toUpperCase();
    
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoiceNumber}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #FC8019; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #FC8019; font-size: 24px; margin: 0; }
  .header .invoice-title { text-align: right; }
  .header .invoice-title h2 { margin: 0; font-size: 18px; color: #333; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .row.total { font-weight: bold; font-size: 15px; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
  .row.discount { color: #22C55E; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head><body>
<div class="header">
  <div><h1>PROCURE</h1><p>Enterprise Procurement Platform</p></div>
  <div class="invoice-title"><h2>TAX INVOICE</h2><p>${invoiceNumber}<br>${orderDate}</p></div>
</div>
<div class="section"><h3>Bill To</h3>
  <p><strong>${buyerProfile?.companyName || order.buyer?.name || 'Buyer'}</strong></p>
  ${buyerProfile?.gstin ? `<p>GSTIN: ${buyerProfile.gstin}</p>` : ''}
</div>
<div class="section"><h3>From</h3>
  <p><strong>${supplier?.businessName || 'Supplier'}</strong></p>
  ${supplier?.gstBusinessName ? `<p>${supplier.gstBusinessName}</p>` : ''}
  ${supplier?.gstin ? `<p>GSTIN: ${supplier.gstin}</p>` : ''}
</div>
<div class="section"><h3>Items</h3>
  <table>
    <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
    <tr>
      <td>${order.product?.name || 'Product'}</td>
      <td>${order.product?.sku || '—'}</td>
      <td>${order.quantity}</td>
      <td>₹${order.price.toLocaleString('en-IN')}</td>
      <td>₹${subtotal.toLocaleString('en-IN')}</td>
    </tr>
  </table>
</div>
<div class="section">
  <div class="row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
  ${order.deliveryFee > 0 ? `<div class="row"><span>Delivery Fee</span><span>₹${order.deliveryFee.toLocaleString('en-IN')}</span></div>` : '<div class="row"><span>Delivery Fee</span><span>FREE</span></div>'}
  <div class="row"><span>Platform Fee</span><span>₹${(order.platformFee || 0).toLocaleString('en-IN')}</span></div>
  <div class="row"><span>GST (5% on delivery)</span><span>₹${(order.gstAmount || 0).toLocaleString('en-IN')}</span></div>
  ${order.couponDiscount > 0 ? `<div class="row discount"><span>Coupon Discount</span><span>-₹${order.couponDiscount.toLocaleString('en-IN')}</span></div>` : ''}
  ${order.walletDeduction > 0 ? `<div class="row discount"><span>Wallet Used</span><span>-₹${order.walletDeduction.toLocaleString('en-IN')}</span></div>` : ''}
  <div class="row total"><span>Total</span><span>₹${order.totalAmount.toLocaleString('en-IN')}</span></div>
  <div class="row" style="color:#666;font-size:11px;"><span>Payment Method</span><span>${paymentMethod}</span></div>
</div>
<div class="footer"><p>This is a computer-generated invoice. Thank you for your business!</p><p>PROCURE — Enterprise Procurement Platform</p></div>
</body></html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("Invoice error:", error);
    return errorResponse("Failed to generate invoice", 500);
  }
}