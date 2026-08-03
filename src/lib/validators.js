import { z } from "zod";

// Email
export const emailSchema = z.string().email("Invalid email address").toLowerCase().trim();

// Password
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100)
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number");

// Password (simple - for delivery partners, no uppercase requirement)
export const simplePasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100);

// Mobile (India)
export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Invalid mobile number");

// Registration
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email: emailSchema,
  mobile: mobileSchema.optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Login (supports email OR mobile)
export const loginSchema = z.object({
  email: z.string().min(1, "Email or mobile is required"),
  password: z.string().min(1, "Password is required"),
});

// Mobile Login (for delivery partners)
export const mobileLoginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, "Password is required"),
});

// Delivery Partner Registration (mobile-only, simple password)
export const deliveryPartnerRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  mobile: mobileSchema,
  password: simplePasswordSchema,
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
});

// OTP
export const otpSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// Product
export const productSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, "Only lowercase, numbers, hyphens"),
  description: z.string().optional(),
  categoryId: z.string(),
  brandId: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().default("PCS"),
  hsnCode: z.string().optional(),
});

// Address
export const addressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]),
  fullName: z.string().min(2).max(100),
  mobile: mobileSchema,
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),
  landmark: z.string().max(100).optional(),
});