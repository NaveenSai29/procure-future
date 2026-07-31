import prisma from '@/lib/prisma';
import { WeatherService } from './weather.service';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class DeliveryService {

  static async getSettings() {
    const db = await prisma.systemSetting.findMany({ where: { category: 'DELIVERY' } });
    const s = {};
    db.forEach(x => { try { s[x.key] = JSON.parse(x.value); } catch { s[x.key] = x.value; } });

    return {
      vehicles: s.vehicles || [],
      freeWeightUpTo: parseFloat(s.freeWeightUpTo) || 5,
      weightChargePerKg: parseFloat(s.weightChargePerKg) || 3,
      maxWeight: parseFloat(s.maxWeight) || 40000,
      freeDeliveryAbove: parseFloat(s.freeDeliveryAbove) || 4999,
      maxDistance: parseFloat(s.maxDistance) || 200,
      platformFee: parseFloat(s.platformFee) || 5,
      gstPercent: parseFloat(s.gstPercent) || 5,
      codCharge: parseFloat(s.codCharge) || 30,
      expressMultiplier: parseFloat(s.expressMultiplier) || 1.8,
      sameDayMultiplier: parseFloat(s.sameDayMultiplier) || 2.0,
      minDeliveryFee: parseFloat(s.minDeliveryFee) || 20,
      surgeEnabled: s.surgeEnabled === true,
      rainSurgeMultiplier: parseFloat(s.rainSurgeMultiplier) || 1.5,
      autoWeatherEnabled: s.autoWeatherEnabled !== false,
      peakHours: s.peakHours || [],
    };
  }

  static isInPeakTime(settings) {
    if (!settings.surgeEnabled) return { isPeak: false, peak: null };
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const peak = settings.peakHours?.find(p => time >= p.start && time <= p.end);
    return peak ? { isPeak: true, peak } : { isPeak: false, peak: null };
  }

  /**
   * Calculate delivery charge using per-km rate slabs from admin settings.
   * No base charge. Only per-km rates in distance slabs.
   * Minimum 1km charged even for very short distances.
   * Example: Bike 0-5km Rs 30/km → 0km order = Rs 30, 3km = Rs 90, 7km = 5×30 + 2×35 = Rs 220
   */
  static getDeliveryChargeForVehicle(vehicle, distanceKm) {
    const slabs = vehicle.distanceSlabs;
    if (!slabs || slabs.length === 0) {
      // No slabs configured → use minDeliveryFee as fallback
      return Math.round(Math.max(1, distanceKm) * 25);
    }

    // Minimum 1km charge applies
    const effectiveDistance = Math.max(1, distanceKm);

    let totalCharge = 0;
    let remainingKm = effectiveDistance;
    let previousUpTo = 0;
    const sortedSlabs = [...slabs].sort((a, b) => a.upToKm - b.upToKm);

    for (const slab of sortedSlabs) {
      if (remainingKm <= 0) break;
      const slabRange = slab.upToKm - previousUpTo;
      const kmInThisSlab = Math.min(remainingKm, slabRange);
      totalCharge += kmInThisSlab * (slab.perKmRate || slab.charge || 25);
      remainingKm -= kmInThisSlab;
      previousUpTo = slab.upToKm;
    }

    // If distance exceeds all slabs, use last slab's rate for remaining
    if (remainingKm > 0 && sortedSlabs.length > 0) {
      const lastSlab = sortedSlabs[sortedSlabs.length - 1];
      totalCharge += remainingKm * (lastSlab.perKmRate || lastSlab.charge || 25);
    }

    return Math.round(totalCharge);
  }

  static async calculateCharge({
    orderTotal = 0,
    totalWeight = 0,
    buyerLat, buyerLng,
    warehouseLat, warehouseLng,
    paymentMethod = 'ONLINE',
    isExpress = false,
  }) {
    const settings = await this.getSettings();

    // ─── FREE DELIVERY ───
    if (orderTotal >= settings.freeDeliveryAbove) {
      return {
        deliveryFee: 0,
        platformFee: settings.platformFee,
        gst: Math.round(settings.platformFee * settings.gstPercent / 100),
        total: settings.platformFee + Math.round(settings.platformFee * settings.gstPercent / 100),
        breakdown: [
          { label: 'Delivery', amount: 0, sub: 'FREE' },
          { label: 'Platform Fee', amount: settings.platformFee },
          { label: `GST (${settings.gstPercent}%)`, amount: Math.round(settings.platformFee * settings.gstPercent / 100) },
        ],
        isFree: true,
        distanceKm: 0,
        estimatedTime: '3-5 business days',
        surgeReason: null,
        isDeliverable: true,
        isRaining: false,
        selectedVehicle: null,
      };
    }

    // ─── DISTANCE ───
    let distanceKm = 0;
    if (buyerLat && buyerLng && warehouseLat && warehouseLng) {
      distanceKm = haversineDistance(buyerLat, buyerLng, warehouseLat, warehouseLng);
    }

    if (distanceKm > settings.maxDistance) {
      return {
        deliveryFee: null,
        isDeliverable: false,
        distanceKm: Math.round(distanceKm),
        message: `Delivery not available. Distance ${Math.round(distanceKm)} km exceeds maximum ${settings.maxDistance} km.`,
      };
    }

    // ─── WEIGHT CHECK ───
    if (totalWeight > settings.maxWeight) {
      return {
        deliveryFee: null,
        isDeliverable: false,
        message: `Order weight ${totalWeight} kg exceeds maximum ${settings.maxWeight} kg. Please split into multiple orders.`,
      };
    }

    // ─── SELECT CHEAPEST CAPABLE VEHICLE ───
    const capableVehicles = settings.vehicles.filter(v => v.maxWeight >= totalWeight);
    if (capableVehicles.length === 0) {
      return {
        deliveryFee: null,
        isDeliverable: false,
        message: `No vehicle available for ${totalWeight} kg order weight.`,
      };
    }

    let bestVehicle = null;
    let bestCharge = Infinity;
    for (const v of capableVehicles) {
      const charge = this.getDeliveryChargeForVehicle(v, distanceKm);
      if (charge < bestCharge) {
        bestCharge = charge;
        bestVehicle = v;
      }
    }

    let deliveryFee = bestCharge;

    // ─── WEIGHT SURCHARGE ───
    const extraKg = Math.max(0, totalWeight - settings.freeWeightUpTo);
    const weightSurcharge = Math.round(extraKg * settings.weightChargePerKg);
    deliveryFee += weightSurcharge;

    // ─── EXPRESS DELIVERY ───
    if (isExpress) {
      deliveryFee = Math.round(deliveryFee * settings.expressMultiplier);
    }

    // ─── WEATHER SURGE ───
    let surgeAmount = 0;
    let surgeReason = null;
    let isRaining = false;

    if (settings.surgeEnabled && warehouseLat && warehouseLng && settings.autoWeatherEnabled) {
      const weather = await WeatherService.checkRain(warehouseLat, warehouseLng);
      if (weather.isRaining) {
        isRaining = true;
        const multiplier = weather.isSevere ? settings.rainSurgeMultiplier * 1.3 : settings.rainSurgeMultiplier;
        surgeAmount = Math.round(deliveryFee * (multiplier - 1));
        surgeReason = weather.isSevere ? 'Heavy rain in your area' : 'Rain in your area';
      }
    }

    // ─── PEAK HOUR SURGE ───
    if (settings.surgeEnabled && surgeAmount === 0) {
      const peak = this.isInPeakTime(settings);
      if (peak.isPeak) {
        surgeAmount = Math.round(deliveryFee * (peak.peak.multiplier - 1));
        surgeReason = peak.peak.label || 'Peak hours';
      }
    }
    deliveryFee += surgeAmount;

    // ─── COD CHARGE ───
    const codAmount = paymentMethod === 'COD' ? settings.codCharge : 0;

    // ─── PLATFORM FEE + GST ───
    const platformFee = settings.platformFee;
    const gst = Math.round((deliveryFee + codAmount) * settings.gstPercent / 100);
    const total = deliveryFee + codAmount + platformFee + gst;

    // ─── MINIMUM DELIVERY FEE ───
    // Use the first slab's perKmRate as minimum, or admin's minDeliveryFee
    const minFromVehicle = bestVehicle?.distanceSlabs?.[0]?.perKmRate || bestVehicle?.distanceSlabs?.[0]?.charge;
    const absoluteMin = minFromVehicle || settings.minDeliveryFee || 25;
    if (deliveryFee < absoluteMin) {
      deliveryFee = absoluteMin;
    }

    // ─── ESTIMATED TIME ───
    let estimatedTime;
    if (isExpress) {
      estimatedTime = '1-2 business days';
    } else if (distanceKm <= 5) {
      estimatedTime = '1-2 business days';
    } else if (distanceKm <= 20) {
      estimatedTime = '2-4 business days';
    } else if (distanceKm <= 50) {
      estimatedTime = '4-7 business days';
    } else {
      estimatedTime = '7-10 business days';
    }

    // ─── BREAKDOWN ───
    const breakdown = [
      { label: 'Delivery', amount: deliveryFee, sub: `${bestVehicle?.type || 'Delivery'} - ${Math.round(distanceKm)} km` },
      codAmount > 0 && { label: 'COD Charge', amount: codAmount },
      surgeAmount > 0 && { label: surgeReason, amount: surgeAmount, isSurge: true },
      { label: 'Platform Fee', amount: platformFee },
      { label: `GST (${settings.gstPercent}%)`, amount: gst },
    ].filter(Boolean);

    return {
      deliveryFee,
      platformFee,
      codFee: codAmount,
      gst,
      surgeAmount,
      surgeReason,
      weightSurcharge,
      total,
      isFree: false,
      isDeliverable: true,
      distanceKm: Math.round(distanceKm * 10) / 10,
      selectedVehicle: bestVehicle?.type,
      estimatedTime,
      breakdown,
      isRaining,
    };
  }
}