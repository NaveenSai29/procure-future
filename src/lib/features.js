import prisma from '@/lib/prisma';

// Cache feature flags for 60 seconds to avoid repeated DB calls
let cachedFeatures = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 60 seconds

/**
 * Get all feature flags from SystemSetting
 * Returns an object with boolean values for each feature
 */
export async function getFeatureFlags() {
  const now = Date.now();
  
  // Return cached if still valid
  if (cachedFeatures && (now - cacheTime) < CACHE_TTL) {
    return cachedFeatures;
  }

  try {
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: 'FEATURES' }
    });

    const settings = {};
    dbSettings.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); } 
      catch { settings[s.key] = s.value; }
    });

    cachedFeatures = {
      // Core features (default ON)
      marketplace: settings.marketplace !== false,
      payments: settings.payments !== false,
      delivery: settings.delivery !== false,
      
      // Optional features (default OFF)
      rfq: settings.rfq === true,
      wallet: settings.wallet === true,
      referrals: settings.referrals === true,
      loyalty: settings.loyalty === true,
      ai: settings.ai === true,
      bulkImport: settings.bulkImport === true,
      sponsoredProducts: settings.sponsoredProducts === true,
      sms: settings.sms === true,
    };

    cacheTime = now;
    return cachedFeatures;
  } catch (error) {
    console.error('Feature flags error:', error);
    // Default: marketplace + payments + delivery ON, rest OFF
    return {
      marketplace: true, payments: true, delivery: true,
      rfq: false, wallet: false, referrals: false, loyalty: false,
      ai: false, bulkImport: false, sponsoredProducts: false, sms: false,
    };
  }
}

/**
 * Check if a specific feature is enabled
 * @param {string} featureName - e.g., 'rfq', 'wallet', 'ai'
 */
export async function isFeatureEnabled(featureName) {
  const features = await getFeatureFlags();
  return features[featureName] === true;
}

/**
 * Middleware helper - checks feature flag and returns 403 if disabled
 * @param {string} featureName 
 */
export async function requireFeature(featureName) {
  const enabled = await isFeatureEnabled(featureName);
  if (!enabled) {
    return { disabled: true, message: `${featureName} feature is currently disabled` };
  }
  return { disabled: false };
}

/**
 * Clear feature cache (call after settings update)
 */
export function clearFeatureCache() {
  cachedFeatures = null;
  cacheTime = 0;
}