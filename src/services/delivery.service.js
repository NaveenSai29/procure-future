import prisma from '@/lib/prisma';
import { WeatherService } from './weather.service';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getTrafficMultiplier(lat1, lng1, lat2, lng2) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const actualDuration = data.routes[0].duration;
      const actualDistance = data.routes[0].distance / 1000;
      const freeFlowDuration = (actualDistance / 40) * 3600;
      const multiplier = actualDuration / freeFlowDuration;
      
      return {
        multiplier: Math.max(1.0, Math.min(multiplier, 2.5)),
        actualDurationSeconds: actualDuration,
        actualDistanceKm: actualDistance,
        isHeavyTraffic: multiplier > 1.5,
        isSevereTraffic: multiplier > 2.0,
        source: 'OSRM'
      };
    }
    return null;
  } catch (error) {
    console.log('Traffic API not available:', error.message);
    return null;
  }
}

function getTimeBasedTrafficMultiplier() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  let multiplier = 1.0;
  let trafficLevel = 'Normal';
  
  if (day >= 1 && day <= 5 && hour >= 8 && hour <= 10) {
    multiplier = 1.5;
    trafficLevel = 'Morning rush';
  } else if (day >= 1 && day <= 5 && hour >= 17 && hour <= 20) {
    multiplier = 1.7;
    trafficLevel = 'Evening rush';
  } else if (hour >= 12 && hour <= 14) {
    multiplier = 1.2;
    trafficLevel = 'Lunch traffic';
  } else if (hour >= 23 || hour <= 5) {
    multiplier = 0.7;
    trafficLevel = 'Night';
  } else if ((day === 0 || day === 6) && hour >= 11 && hour <= 18) {
    multiplier = 1.3;
    trafficLevel = 'Weekend';
  }
  
  return { multiplier, trafficLevel };
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

    static getDeliveryChargeForVehicle(vehicle, distanceKm) {
    const slabs = vehicle.distanceSlabs;
    if (!slabs || slabs.length === 0) {
      return Math.round(distanceKm * 25);
    }

    const effectiveDistance = distanceKm;
    let totalCharge = 0;
    let remainingKm = effectiveDistance;
    let previousUpTo = 0;
    const sortedSlabs = [...slabs].sort((a, b) => a.upToKm - b.upToKm);

    for (const slab of sortedSlabs) {
      if (remainingKm <= 0.001) break;
      const slabRange = slab.upToKm - previousUpTo;
      const kmInThisSlab = Math.min(remainingKm, slabRange);
      totalCharge += Math.round(kmInThisSlab * (slab.perKmRate || slab.charge || 25));
      remainingKm = Math.max(0, remainingKm - kmInThisSlab);
      previousUpTo = slab.upToKm;
    }

    return Math.round(totalCharge);
  }

  static async calculateEstimatedTime({
    distanceKm,
    totalWeight,
    itemCount,
    vehicleType,
    isRaining,
    isHeavyRain,
    buyerLat,
    buyerLng,
    warehouseLat,
    warehouseLng,
    isExpress = false,
  }) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    const items = itemCount || Math.max(1, Math.ceil(totalWeight / 5));
    let processingMinutes;
    
    if (items <= 3) {
      processingMinutes = 5 + items * 2;
    } else if (items <= 10) {
      processingMinutes = 10 + items * 1.5;
    } else {
      processingMinutes = 15 + items * 1;
    }
    
    if (hour >= 23 || hour < 6) {
      processingMinutes += 10;
    }

    let travelMinutes;
    let trafficInfo = null;
    let trafficLabel = '';
    
    if (buyerLat && buyerLng && warehouseLat && warehouseLng) {
      trafficInfo = await getTrafficMultiplier(warehouseLat, warehouseLng, buyerLat, buyerLng);
    }
    
    if (trafficInfo) {
      travelMinutes = Math.round(trafficInfo.actualDurationSeconds / 60);
      if (trafficInfo.isSevereTraffic) {
        trafficLabel = 'Severe traffic';
      } else if (trafficInfo.isHeavyTraffic) {
        trafficLabel = 'Heavy traffic';
      }
    } else {
      const { multiplier, trafficLevel } = getTimeBasedTrafficMultiplier();
      const baseSpeed = 30;
      const effectiveSpeed = baseSpeed / multiplier;
      travelMinutes = Math.round((distanceKm / effectiveSpeed) * 60);
      trafficLabel = trafficLevel;
    }
    
    if (isRaining) {
      if (isHeavyRain) {
        travelMinutes = Math.round(travelMinutes * 1.35);
        trafficLabel = trafficLabel ? `${trafficLabel} + Heavy rain` : 'Heavy rain';
      } else {
        travelMinutes = Math.round(travelMinutes * 1.15);
        trafficLabel = trafficLabel ? `${trafficLabel} + Rain` : 'Rain';
      }
    }
    
    if (vehicleType?.includes('truck') || vehicleType?.includes('trailer')) {
      travelMinutes = Math.round(travelMinutes * 1.2);
    } else if (vehicleType?.includes('tempo') || vehicleType?.includes('lcv')) {
      travelMinutes = Math.round(travelMinutes * 1.1);
    }

    const subtotalMinutes = processingMinutes + travelMinutes;
    const buffer = Math.round(subtotalMinutes * 0.1);

    let totalMinutes = subtotalMinutes + buffer;

    if (isExpress) {
      totalMinutes = Math.round(totalMinutes * 0.5);
    }

    totalMinutes = Math.max(8, totalMinutes);

    const contextLabels = [];
    if (trafficLabel && trafficLabel !== 'Normal') contextLabels.push(trafficLabel);
    if (isRaining) contextLabels.push(isHeavyRain ? 'Heavy rain' : 'Rain');
    if (totalWeight > 50) contextLabels.push(`${totalWeight}kg`);
    if (isExpress) contextLabels.push('Express');
    
    const contextStr = contextLabels.length > 0 ? ` · ${contextLabels.join(' · ')}` : '';

    let estimatedTime;
    if (totalMinutes < 60) {
      estimatedTime = `${totalMinutes} mins${contextStr}`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours === 1) {
        estimatedTime = `1 hr ${mins > 0 ? `${mins} mins` : ''}${contextStr}`;
      } else {
        estimatedTime = `${hours} hrs${mins > 0 ? ` ${mins} mins` : ''}${contextStr}`;
      }
    }

    return {
      totalMinutes,
      estimatedTime,
      contextStr,
      breakdown: {
        processingMinutes,
        travelMinutes,
        buffer,
      },
      trafficInfo: trafficLabel && trafficLabel !== 'Normal' ? { label: trafficLabel } : null,
    };
  }

  static async calculateCharge({
    orderTotal = 0,
    totalWeight = 0,
    buyerLat, buyerLng,
    warehouseLat, warehouseLng,
    paymentMethod = 'ONLINE',
    isExpress = false,
    itemCount = 0,
  }) {
    const settings = await this.getSettings();

    // DISTANCE — must calculate before any checks
    let distanceKm = 0;
    if (buyerLat && buyerLng && warehouseLat && warehouseLng) {
      distanceKm = haversineDistance(buyerLat, buyerLng, warehouseLat, warehouseLng);
    }

    // Use effective distance for calculations (minimum 1km)
    const effectiveDistance = Math.round(distanceKm);

    // MAX DISTANCE CHECK — must run BEFORE free delivery check
    if (distanceKm > settings.maxDistance) {
      return {
        deliveryFee: null,
        isDeliverable: false,
        distanceKm: Math.round(distanceKm),
        message: `Delivery not available. Distance ${Math.round(distanceKm)} km exceeds maximum ${settings.maxDistance} km.`,
      };
    }

    // FREE DELIVERY — calculate exact fee for strikethrough, then zero it
    if (orderTotal >= settings.freeDeliveryAbove) {
      let originalFee = 0;
      let bestVehicleType = null;
      const capableVehicles = settings.vehicles?.filter(v => v.maxWeight >= totalWeight) || [];
      
      if (capableVehicles.length > 0) {
        let bestVehicle = null;
        let bestCharge = Infinity;
        for (const v of capableVehicles) {
          const charge = this.getDeliveryChargeForVehicle(v, effectiveDistance);
          if (charge < bestCharge) {
            bestCharge = charge;
            bestVehicle = v;
          }
        }
        
        let calculatedFee = bestCharge;
        
        // Weight surcharge
        const extraKg = Math.max(0, totalWeight - settings.freeWeightUpTo);
        const weightSurcharge = Math.round(extraKg * settings.weightChargePerKg);
        calculatedFee += weightSurcharge;
        
        // Express delivery
        if (isExpress) {
          calculatedFee = Math.round(calculatedFee * settings.expressMultiplier);
        }
        
        // Minimum delivery fee
        const minFromVehicle = bestVehicle?.distanceSlabs?.[0]?.perKmRate || bestVehicle?.distanceSlabs?.[0]?.charge;
        const absoluteMin = minFromVehicle || settings.minDeliveryFee || 25;
        if (calculatedFee < absoluteMin) {
          calculatedFee = absoluteMin;
        }
        
        originalFee = calculatedFee;
        bestVehicleType = bestVehicle?.type || null;
      }
      
      return {
        deliveryFee: 0,
        originalDeliveryFee: originalFee,
        platformFee: settings.platformFee,
        gst: 0,
        total: settings.platformFee,
        breakdown: [
          { label: 'Delivery', amount: 0, originalAmount: originalFee, sub: bestVehicleType ? `${bestVehicleType} - ${Math.round(effectiveDistance)} km` : 'FREE' },
          { label: 'Platform Fee', amount: settings.platformFee },
          { label: `GST (${settings.gstPercent}%)`, amount: 0 },
        ],
        isFree: true,
        distanceKm: Math.round(effectiveDistance * 10) / 10,
        estimatedTime: '25-30 mins',
        surgeReason: null,
        isDeliverable: true,
        isRaining: false,
        selectedVehicle: bestVehicleType,
      };
    }

    // WEIGHT CHECK
    if (totalWeight > settings.maxWeight) {
      return {
        deliveryFee: null,
        isDeliverable: false,
        message: `Order weight ${totalWeight} kg exceeds maximum ${settings.maxWeight} kg. Please split into multiple orders.`,
      };
    }

    // SELECT CHEAPEST CAPABLE VEHICLE
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
      const charge = this.getDeliveryChargeForVehicle(v, effectiveDistance);
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

    // EXPRESS DELIVERY
    if (isExpress) {
      deliveryFee = Math.round(deliveryFee * settings.expressMultiplier);
    }

    // WEATHER SURGE
    let surgeAmount = 0;
    let surgeReason = null;
    let isRaining = false;
    let isHeavyRain = false;

    if (settings.surgeEnabled && warehouseLat && warehouseLng && settings.autoWeatherEnabled) {
      const weather = await WeatherService.checkRain(warehouseLat, warehouseLng);
      if (weather.isRaining) {
        isRaining = true;
        isHeavyRain = weather.isSevere || false;
        const multiplier = isHeavyRain ? settings.rainSurgeMultiplier * 1.3 : settings.rainSurgeMultiplier;
        surgeAmount = Math.round(deliveryFee * (multiplier - 1));
        surgeReason = isHeavyRain ? 'Heavy rain in your area' : 'Rain in your area';
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

    // COD CHARGE
    const codAmount = paymentMethod === 'COD' ? settings.codCharge : 0;

    // PLATFORM FEE + GST
    const platformFee = settings.platformFee;
    const gst = Math.round((deliveryFee + codAmount) * settings.gstPercent / 100);
    const total = deliveryFee + codAmount + platformFee + gst;

    // MINIMUM DELIVERY FEE
    const minFromVehicle = bestVehicle?.distanceSlabs?.[0]?.perKmRate || bestVehicle?.distanceSlabs?.[0]?.charge;
    const absoluteMin = minFromVehicle || settings.minDeliveryFee || 25;
    if (deliveryFee < absoluteMin) {
      deliveryFee = absoluteMin;
    }

    // ESTIMATED TIME
    const timeEstimate = await this.calculateEstimatedTime({
      distanceKm: effectiveDistance,
      totalWeight,
      itemCount,
      vehicleType: bestVehicle?.type,
      isRaining,
      isHeavyRain,
      buyerLat,
      buyerLng,
      warehouseLat,
      warehouseLng,
      isExpress,
    });

    const estimatedTime = timeEstimate.estimatedTime;

    // BREAKDOWN
    const breakdown = [
      { label: 'Delivery', amount: deliveryFee, sub: `${bestVehicle?.type || 'Delivery'} - ${Math.round(effectiveDistance)} km` },
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
      distanceKm: Math.round(effectiveDistance * 10) / 10,
      selectedVehicle: bestVehicle?.type,
      estimatedTime,
      breakdown,
      isRaining,
    };
  }
}