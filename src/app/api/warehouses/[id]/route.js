import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

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

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventory: { include: { product: { select: { name: true, sku: true } } } },
        zones: true,
      },
    });
    if (!warehouse) return errorResponse("Warehouse not found", 404);
    return successResponse(warehouse);
  } catch (error) {
    console.error("Warehouse detail error:", error);
    return errorResponse("Failed to fetch warehouse", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    const body = await request.json();
    const { name, addressLine1, addressLine2, city, state, pincode, isActive, regenerateLocation } = body;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) return errorResponse("Warehouse not found", 404);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (regenerateLocation || addressLine1 !== undefined || city !== undefined || state !== undefined || pincode !== undefined) {
      const fullAddress = [
        addressLine1 || existing.addressLine1,
        addressLine2 || existing.addressLine2,
      ].filter(Boolean).join(', ');

      const coords = await geocodeAddress(
        fullAddress || (addressLine1 || existing.addressLine1),
        city || existing.city,
        state || existing.state,
        pincode || existing.pincode
      );
      
      if (coords) {
        updateData.latitude = coords.latitude;
        updateData.longitude = coords.longitude;
      } else if (regenerateLocation) {
        const cityCoords = await geocodeAddress(
          city || existing.city,
          city || existing.city,
          state || existing.state,
          pincode || existing.pincode
        );
        if (cityCoords) {
          updateData.latitude = cityCoords.latitude;
          updateData.longitude = cityCoords.longitude;
        }
      }
    }

    if (Object.keys(updateData).length === 0 && !regenerateLocation) {
      return errorResponse("No fields to update", 400);
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
    });

    const wasGeocoded = updateData.latitude !== undefined;

    return successResponse({
      warehouse,
      geocoded: wasGeocoded,
      message: wasGeocoded ? "Location updated and will appear on map" : "Warehouse updated",
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    return errorResponse("Failed to update warehouse", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    await prisma.warehouse.delete({ where: { id } });
    return successResponse({ message: "Warehouse deleted" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return errorResponse("Failed to delete warehouse", 500);
  }
}