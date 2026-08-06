import prisma from '@/lib/prisma';
import { successResponse, errorResponse, hashPassword } from '@/lib/auth';
import { deliveryPartnerRegisterSchema } from '@/lib/validators';

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = deliveryPartnerRegisterSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.flatten().fieldErrors);
    }

    const { name, mobile, password, vehicleType, vehicleNumber, licenseNumber } = validation.data;

    // Check if mobile already exists
    const existingUser = await prisma.user.findUnique({
      where: { mobile },
    });

    if (existingUser) {
      return errorResponse('This mobile number is already registered', 409);
    }

    // Generate a unique email from mobile (for database constraint)
    const email = `${mobile}@procure.delivery`;

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with DELIVERY_PARTNER role + PartnerVehicle
    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
        mobileVerified: false,
        password: hashedPassword,
        roles: {
          create: {
            role: {
              connect: { name: 'DELIVERY_PARTNER' },
            },
          },
        },
        deliveryPartner: {
          create: {
            licenseNumber: licenseNumber || null,
            vehicles: {
              create: {
                vehicleType: vehicleType || 'Bike',
                vehicleNumber: vehicleNumber || null,
              },
            },
          },
        },
      },
      include: {
        deliveryPartner: {
          include: { vehicles: true },
        },
      },
    });

    // Set the newly created vehicle as active
    if (user.deliveryPartner?.vehicles?.[0]) {
      await prisma.deliveryPartner.update({
        where: { id: user.deliveryPartner.id },
        data: { activeVehicleId: user.deliveryPartner.vehicles[0].id },
      });
    }

    // Re-fetch to include activeVehicle
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        mobile: true,
        deliveryPartner: {
          select: {
            id: true,
            licenseNumber: true,
            isVerified: true,
            isOnline: true,
            activeVehicle: {
              select: {
                id: true,
                vehicleType: true,
                vehicleNumber: true,
              },
            },
          },
        },
      },
    });

    return successResponse({
      message: 'Registration successful! Please login to continue.',
      user: fullUser,
    }, 201);
  } catch (error) {
    console.error('Delivery partner registration error:', error);
    return errorResponse('Registration failed. Please try again.', 500);
  }
}