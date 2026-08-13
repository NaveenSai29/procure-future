const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('Cleaning up old test records...');
  
  await prisma.settlement.deleteMany({});
  console.log('✓ Settlements deleted');
  
  await prisma.cODDeposit.deleteMany({});
  console.log('✓ COD Deposits deleted');
  
  await prisma.orderSLA.deleteMany({});
  console.log('✓ Order SLAs deleted');
  
  await prisma.delivery.deleteMany({});
  console.log('✓ Deliveries deleted');
  
  await prisma.orderStatusHistory.deleteMany({});
  console.log('✓ Order Status History deleted');
  
  await prisma.order.deleteMany({});
  console.log('✓ Orders deleted');
  
  await prisma.walletTransaction.deleteMany({});
  console.log('✓ Wallet Transactions deleted');
  
  await prisma.partnerWallet.updateMany({
    data: { codPending: 0, codCollected: 0, totalEarned: 0 }
  });
  console.log('✓ Partner Wallets reset');
  
  await prisma.supplierWallet.updateMany({
    data: { balance: 0, totalEarned: 0, totalWithdrawn: 0 }
  });
  console.log('✓ Supplier Wallets reset');
  
  console.log('\n✅ All clean! Ready for real testing.');
}

cleanup()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());