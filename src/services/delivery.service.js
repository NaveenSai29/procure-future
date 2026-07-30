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

  static getDeliveryChargeForVehicle(vehicle, distanceKm) {
    if (vehicle.useSlabPricing && vehicle.distanceSlabs?.length > 0) {
      const sorted = [...vehicle.distanceSlabs].sort((a, b) => a.upToKm - b.upToKm);
      const slab = sorted.find(s => distanceKm <= s.upToKm) || sorted[sorted.length - 1];
      return slab.charge;
    }
    return vehicle.baseCharge + Math.round(distanceKm * (vehicle.perKmRate || 10));
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

    // FREE DELIVERY
    if (orderTotal >= settings.freeDeliveryAbove) {
      return {
        deliveryFee: 0, platformFee: settings.platformFee,
        gst: Math.round(settings.platformFee * settings.gstPercent / 100),
        total: settings.platformFee + Math.round(settings.platformFee * settings.gstPercent / 100),
        breakdown: [
          { label: 'Delivery', amount: 0, sub: 'FREE' },
          { label: 'Platform Fee', amount: settings.platformFee },
        ],
        isFree: true, distanceKm: 0,
        estimatedTime: '3-5 business days',
        surgeReason: null, isDeliverable: true,
      };
    }

    // DISTANCE
    let distanceKm = 0;
    if (buyerLat && buyerLng && warehouseLat && warehouseLng) {
      distanceKm = haversineDistance(buyerLat, buyerLng, warehouseLat, warehouseLng);
    }

    if (distanceKm > settings.maxDistance) {
      return {
        deliveryFee: null, isDeliverable: false,
        distanceKm: Math.round(distanceKm),
        message: `Location is ${Math.round(distanceKm)} km away. Maximum delivery distance is ${settings.maxDistance} km.`,
      };
    }

    // WEIGHT CHECK
    if (totalWeight > settings.maxWeight) {
      return {
        deliveryFee: null, isDeliverable: false,
        message: `Order weight (${totalWeight} kg) exceeds maximum (${settings.maxWeight} kg).`,
      };
    }

    // SELECT CHEAPEST CAPABLE VEHICLE
    const capableVehicles = settings.vehicles.filter(v => v.maxWeight >= totalWeight);
    if (capableVehicles.length === 0) {
      return {
        deliveryFee: null, isDeliverable: false,
        message: `No vehicle available for ${totalWeight} kg.`,
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

    // WEIGHT SURCHARGE
    const extraKg = Math.max(0, totalWeight - settings.freeWeightUpTo);
    const weightSurcharge = Math.round(extraKg * settings.weightChargePerKg);
    deliveryFee += weightSurcharge;

    // EXPRESS
    if (isExpress) {
      deliveryFee = Math.round(deliveryFee * settings.expressMultiplier);
    }

    // AUTO WEATHER SURGE
    let surgeAmount = 0;
    let surgeReason = null;
    if (settings.surgeEnabled && warehouseLat && warehouseLng && settings.autoWeatherEnabled) {
      const weather = await WeatherService.checkRain(warehouseLat, warehouseLng);
      if (weather.isRaining) {
        const multiplier = weather.isSevere ? settings.rainSurgeMultiplier * 1.3 : settings.rainSurgeMultiplier;
        surgeAmount = Math.round(deliveryFee * (multiplier - 1));
        surgeReason = weather.isSevere ? 'Heavy rain in delivery area' : 'Rain in delivery area';
      }
    }

    // PEAK HOUR SURGE
    if (settings.surgeEnabled && surgeAmount === 0) {
      const peak = this.isInPeakTime(settings);
      if (peak.isPeak) {
        surgeAmount = Math.round(deliveryFee * (peak.peak.multiplier - 1));
        surgeReason = peak.peak.label || 'Peak hours';
      }
    }
    deliveryFee += surgeAmount;

    // COD
    const codAmount = paymentMethod === 'COD' ? settings.codCharge : 0;

    // PLATFORM FEE + GST
    const platformFee = settings.platformFee;
    const gst = Math.round((deliveryFee + codAmount) * settings.gstPercent / 100);
    const total = deliveryFee + codAmount + platformFee + gst;

    if (deliveryFee < 20) deliveryFee = 20;

    let estimatedTime;
    if (isExpress) estimatedTime = '1-2 business days';
    else if (distanceKm <= 10) estimatedTime = '2-3 business days';
    else if (distanceKm <= 50) estimatedTime = '4-7 business days';
    else estimatedTime = '7-10 business days';

    const breakdown = [
      { label: 'Delivery', amount: deliveryFee, sub: `${bestVehicle?.type || 'Vehicle'} - ${Math.round(distanceKm)} km${weightSurcharge > 0 ? ` + ${extraKg}kg extra` : ''}` },
      codAmount > 0 && { label: 'COD Charge', amount: codAmount },
      surgeAmount > 0 && { label: surgeReason, amount: surgeAmount, isSurge: true },
      { label: 'Platform Fee', amount: platformFee },
      { label: `GST (${settings.gstPercent}%)`, amount: gst },
    ].filter(Boolean);

    return {
      deliveryFee, platformFee, codFee: codAmount, gst,
      surgeAmount, surgeReason, weightSurcharge, total,
      isFree: false, isDeliverable: true,
      distanceKm: Math.round(distanceKm * 10) / 10,
      selectedVehicle: bestVehicle?.type,
      estimatedTime, breakdown,
    };
  }
}