import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function checkAdmin(session) {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  const userRoles = user.roles.map(r => r.role.name);
  return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
}

// GET - List waitlist entries
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const waitlist = await prisma.waitlist.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Stats
    const total = waitlist.length;
    const notified = waitlist.filter(w => w.notifiedAt).length;
    const pending = total - notified;

    // Group by city
    const cityGroups = {};
    waitlist.forEach(w => {
      const city = w.city || 'Unknown';
      if (!cityGroups[city]) cityGroups[city] = [];
      cityGroups[city].push(w);
    });

    const cityStats = Object.entries(cityGroups).map(([city, entries]) => ({
      city,
      count: entries.length,
    })).sort((a, b) => b.count - a.count);

    return successResponse({
      waitlist,
      stats: { total, notified, pending },
      cityStats,
    });
  } catch (error) {
    console.error("Admin waitlist error:", error);
    return errorResponse("Failed to fetch waitlist", 500);
  }
}

// PATCH - Mark as notified
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { id, action } = await request.json();

    if (!id) return errorResponse("ID required", 400);

    if (action === 'markNotified') {
      await prisma.waitlist.update({
        where: { id },
        data: { notifiedAt: new Date() },
      });
      return successResponse({ message: "Marked as notified" });
    }

    if (action === 'delete') {
      await prisma.waitlist.delete({ where: { id } });
      return successResponse({ message: "Entry deleted" });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Waitlist update error:", error);
    return errorResponse("Failed to update waitlist", 500);
  }
}