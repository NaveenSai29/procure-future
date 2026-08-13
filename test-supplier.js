const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  try {
    const s = await p.supplier.findFirst({ select: { id: true, codEnabled: true, codThreshold: true, dedicatedAgents: true } });
    console.log("OK:", JSON.stringify(s));
  } catch(e) {
    console.log("ERROR:", e.message);
  }
  await p.$disconnect();
})();
