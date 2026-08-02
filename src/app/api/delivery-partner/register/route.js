import prisma from '@/lib/prisma';
import { 
  getSessionUser, 
  successResponse, 
  errorResponse, 
  hashPassword 
} from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Validation failed', 400, validation.error.flatten().fieldErrors);
    }

    const { name, email, mobile, password, vehicleType, vehicleNumber, licenseNumber } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { mobile },
        ],
      },
    });

    if (existingUser) {
      return errorResponse(
        existingUser.email === email 
          ? 'Email already registered' 
          : 'Mobile number already registered',
        409
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with DELIVERY_PARTNER role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
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
            vehicleType,
            vehicleNumber: vehicleNumber || null,
            licenseNumber: licenseNumber || null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        deliveryPartner: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            licenseNumber: true,
            isVerified: true,
            isOnline: true,
          },
        },
      },
    });

    return successResponse({
      message: 'Delivery partner registered successfully',
      user,
    }, 201);
  } catch (error) {
    console.error('Delivery partner registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}