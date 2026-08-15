import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// POST - Add to waitlist (Notify Me)
export async function POST(request) {
  try {
    const session = await getSessionUser();
    const body = await request.json();
    const { mobile, city, state, pincode } = body;

    if (!mobile || mobile.length < 10) {
      return errorResponse("Valid mobile number required", 400);
    }

    // Check if already in waitlist
    const existing = await prisma.waitlist.findFirst({
      where: { mobile },
    });

    if (existing) {
      return successResponse({
        message: "You're already on the waitlist. We'll notify you when we launch in your area!",
        alreadyExists: true,
      });
    }

    // Add to waitlist
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        userId: session?.userId || null,
        mobile,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
      },
    });

    return successResponse({
      message: "You've been added to the waitlist. We'll notify you when PROCURE launches in your area!",
      waitlistEntry,
    }, 201);
  } catch (error) {
    console.error("Waitlist error:", error);
    return errorResponse("Failed to add to waitlist", 500);
  }
}

// GET - Check waitlist status (for admin or user)
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get("mobile");

    if (!mobile) {
      return errorResponse("Mobile number required", 400);
    }

    const entry = await prisma.waitlist.findFirst({
      where: { mobile },
    });

    return successResponse({
      isOnWaitlist: !!entry,
      entry,
    });
  } catch (error) {
    console.error("Waitlist check error:", error);
    return errorResponse("Failed to check waitlist", 500);
  }
}