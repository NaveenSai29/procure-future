import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

async function handleAutoRefund(order) {
  try {
    if (order.paymentMethod === 'ONLINE' && order.razorpayPaymentId) {
      try {
        const { RazorpayService } = await import('@/services/razorpay.service');
        await RazorpayService.createRefund({ paymentId: order.razorpayPaymentId });
        await prisma.refundTransaction.create({
          data: {
            orderId: order.id,
            userId: order.buyerId,
            amount: order.totalAmount,
            paymentMethod: 'RAZORPAY',
            transactionId: order.razorpayPaymentId,
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });
      } catch (err) { console.error('Refund error:', err.message); }
    }
    if (order.walletDeduction > 0) {
      let wallet = await prisma.buyerWallet.findUnique({ where: { userId: order.buyerId } });
      if (wallet) {
        const newBalance = wallet.balance + order.walletDeduction;
        await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
        await prisma.buyerWalletTransaction.create({
          data: {
            walletId: wallet.id, type: 'CREDIT', amount: order.walletDeduction,
            referenceType: 'REFUND', referenceId: order.id,
            description: `Refund for SLA-breached order #${order.id.slice(0, 8)}`,
            balanceBefore: wallet.balance, balanceAfter: newBalance,
          },
        });
      }
    }
  } catch (err) { console.error('Auto-refund error:', err.message); }
}

export async function GET() {
  try {
    const now = new Date();
    const results = { processed: 0, cancelled: 0, errors: 0 };

    // Find all active SLAs past deadline
    const breachedSLAs = await prisma.orderSLA.findMany({
      where: {
        status: 'ACTIVE',
        deadline: { lt: now },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            buyerId: true,
            totalAmount: true,
            paymentMethod: true,
            razorpayPaymentId: true,
            walletDeduction: true,
            productId: true,
            quantity: true,
          },
        },
        supplier: {
          select: { id: true, businessName: true },
        },
      },
    });

    for (const sla of breachedSLAs) {
      try {
        // Only cancel if order is still in the relevant state
        const shouldCancel = 
          (sla.slaType === 'RESPONSE' && sla.order.status === 'PENDING') ||
          (sla.slaType === 'PROCESSING' && ['ACCEPTED', 'PROCESSING'].includes(sla.order.status)) ||
          (sla.slaType === 'PICKUP' && sla.order.status === 'READY_FOR_PICKUP');

        if (shouldCancel) {
          // Cancel the order
          await prisma.order.update({
            where: { id: sla.orderId },
            data: { status: 'CANCELLED' },
          });

          // Record status history
          await prisma.orderStatusHistory.create({
            data: {
              orderId: sla.orderId,
              fromStatus: sla.order.status,
              toStatus: 'CANCELLED',
              changedBy: 'SYSTEM',
              notes: `Auto-cancelled: ${sla.slaType} SLA breached. Deadline was ${sla.deadline.toISOString()}`,
            },
          });

          // Process refund
          await handleAutoRefund(sla.order);

          // Restore stock
          const inventory = await prisma.warehouseInventory.findFirst({
            where: { productId: sla.order.productId },
          });
          if (inventory && inventory.reservedQty >= sla.order.quantity) {
            await prisma.warehouseInventory.update({
              where: { id: inventory.id },
              data: {
                availableQty: inventory.availableQty + sla.order.quantity,
                reservedQty: Math.max(0, inventory.reservedQty - sla.order.quantity),
              },
            });
            console.log(`📦 Stock restored: ${sla.order.quantity} units for order ${sla.orderId.slice(0, 8)}`);
          }

          // Update supplier rating penalty
          if (sla.slaType === 'PROCESSING') {
            // Penalty on supplier
            const supplier = await prisma.supplier.findUnique({ where: { id: sla.supplierId } });
            if (supplier) {
              await prisma.auditLog.create({
                data: {
                  userId: 'SYSTEM',
                  action: 'SLA_BREACH',
                  entity: 'Supplier',
                  entityId: sla.supplierId,
                  newValue: { slaType: sla.slaType, orderId: sla.orderId, reason: 'Processing SLA breached' },
                },
              });
            }
          }

          results.cancelled++;
        }

        // Mark SLA as breached
        await prisma.orderSLA.update({
          where: { id: sla.id },
          data: { status: 'BREACHED', breachedAt: now },
        });

        results.processed++;
      } catch (err) {
        console.error(`SLA processing error for ${sla.id}:`, err.message);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} SLAs, cancelled ${results.cancelled} orders, ${results.errors} errors`,
      results,
    });
  } catch (error) {
    console.error('SLA check error:', error);
    return NextResponse.json({ success: false, message: 'SLA check failed' }, { status: 500 });
  }
}