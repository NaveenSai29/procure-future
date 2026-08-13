const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.deliveryPartner.findMany({
  include: {
    user: { select: { name: true, email: true, mobile: true } },
    activeVehicle: true
  }
}).then(d => {
  d.forEach(p => {
    console.log(JSON.stringify({
      name: p.user.name,
      email: p.user.email,
      mobile: p.user.mobile,
      isVerified: p.isVerified,
      status: p.verificationStatus,
      deliveries: p.totalDeliveries,
      rating: p.rating,
      online: p.isOnline,
      vehicle: p.activeVehicle?.vehicleType
    }, null, 2));
  });
}).finally(() => p.());
