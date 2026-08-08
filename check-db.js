const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  // Check if Supplier has codEnabled
  try {
    const s = await p.supplier.findFirst({ select: { codEnabled: true } });
    console.log("Supplier.codEnabled: EXISTS");
  } catch(e) {
    console.log("Supplier.codEnabled: MISSING");
  }
  // Check SupplierAgent
  try {
    const a = await p.supplierAgent.findFirst();
    console.log("SupplierAgent: EXISTS");
  } catch(e) {
    console.log("SupplierAgent: MISSING");
  }
  // Check OrderSLA
  try {
    const sla = await p.orderSLA.findFirst();
    console.log("OrderSLA: EXISTS");
  } catch(e) {
    console.log("OrderSLA: MISSING");
  }
  await p.$disconnect();
})();
