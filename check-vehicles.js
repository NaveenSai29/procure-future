const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const settings = await p.systemSetting.findMany({
    where: { category: "DELIVERY" }
  });
  settings.forEach(s => {
    console.log(s.key, "=", s.value.substring(0, 200));
  });
  await p.$disconnect();
})();
