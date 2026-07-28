import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function getSupplierId(userId) {
  const staff = await prisma.supplierStaff.findFirst({ where: { userId } });
  if (staff) return staff.supplierId;
  
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  
  if (userWithRoles) {
    const hasSupplierRole = userWithRoles.roles.some(r => r.role.name === 'SUPPLIER');
    if (hasSupplierRole) {
      const supplier = await prisma.supplier.findFirst({
        where: { email: userWithRoles.email },
      });
      if (supplier) return supplier.id;
    }
  }
  
  return null;
}

async function geocodeAddress(address, city, state, pincode) {
  try {
    const queries = [
      `${pincode}, India`,
      `${city}, ${pincode}, India`,
      `${city}, ${state}, India`,
      `${address}, ${city}, ${state}, ${pincode}, India`,
      `${city}, India`,
    ];

    for (const query of queries) {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'PROCURE/1.0' },
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (data && data.features && data.features.length > 0) {
          const feature = data.features[0];
          const coords = feature.geometry.coordinates;
          const props = feature.properties;
          return {
            latitude: coords[1],
            longitude: coords[0],
            displayName: props.name || props.street || props.city,
            city: props.city,
            state: props.state,
            country: props.country,
            type: props.type,
          };
        }
      } catch {
        continue;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', ' + state + ', India')}&limit=1`;
      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'PROCURE-Enterprise/1.0' },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
    } catch {
      // final fallback
    }
    
    console.log(`Geocoding failed for: ${city}, ${state}, ${pincode}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      const warehouses = await prisma.warehouse.findMany({
        where: { supplierId },
        select: { id: true, name: true, city: true, state: true, addressLine1: true, pincode: true, isActive: true },
        orderBy: { createdAt: "asc" },
      });
      return successResponse(warehouses);
    }

    const sid = await getSupplierId(session.userId);
    if (!sid) return successResponse([]);

    const warehouses = await prisma.warehouse.findMany({
      where: { supplierId: sid },
      include: { 
        _count: { select: { inventory: true } },
        inventory: { select: { availableQty: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(warehouses);
  } catch (error) {
    console.error("Warehouses error:", error);
    return errorResponse("Failed to fetch warehouses", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { name, addressLine1, addressLine2, city, state, pincode } = body;
    if (!name || !addressLine1 || !city || !state || !pincode) {
      return errorResponse("Name, address, city, state, and pincode are required", 422);
    }

    const sid = await getSupplierId(session.userId);
    if (!sid) return errorResponse("Supplier account required", 403);

    const coords = await geocodeAddress(addressLine1, city, state, pincode);

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        pincode,
        supplierId: sid,
        ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
      },
    });

    return successResponse({
      warehouse,
      geocoded: !!coords,
      message: coords ? 'Warehouse created with location' : 'Warehouse created (location not found for map)',
    }, 201);
  } catch (error) {
    console.error("Create warehouse error:", error);
    return errorResponse("Failed to create warehouse", 500);
  }
}