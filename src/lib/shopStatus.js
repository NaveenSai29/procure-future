/**
 * Unified Shop Status Utility
 * Handles overnight hours, day off, not open yet, closed, and open states
 * Used across all APIs to ensure consistent behavior
 */

export function getShopStatus(settings, isActive) {
  if (!isActive) return { isOpen: false, reason: 'offline', nextOpenTime: null, nextOpenDay: null, closesIn: null };
  if (!settings?.shopOpenTime || !settings?.shopCloseTime) return { isOpen: false, reason: 'not_set', nextOpenTime: null, nextOpenDay: null, closesIn: null };

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = days[now.getDay()];

  let openDays = [];
  try {
    openDays = settings.shopOpenDays ? JSON.parse(settings.shopOpenDays) : days;
  } catch { openDays = days; }

  const [openH, openM] = settings.shopOpenTime.split(':').map(Number);
  const [closeH, closeM] = settings.shopCloseTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Handle overnight (close time before or equal to open time = closes next day)
  const isOvernight = closeMinutes <= openMinutes;
  const effectiveCloseMinutes = isOvernight ? closeMinutes + 24 * 60 : closeMinutes;
  const effectiveCurrentMinutes = isOvernight && currentMinutes < openMinutes ? currentMinutes + 24 * 60 : currentMinutes;

  // Helper to format time
  const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const openTimeStr = formatTime(openH, openM);

  // If today is not an open day
  if (!openDays.includes(today)) {
    // Find next open day
    let nextOpenDay = 'Tomorrow';
    for (let i = 1; i <= 7; i++) {
      const checkIndex = (now.getDay() + i) % 7;
      const checkDay = days[checkIndex];
      if (openDays.includes(checkDay)) {
        if (i === 1) nextOpenDay = 'Tomorrow';
        else if (i === 2) nextOpenDay = `In ${i} days (${checkDay})`;
        else nextOpenDay = checkDay;
        break;
      }
    }
    return { isOpen: false, reason: 'day_off', nextOpenTime: openTimeStr, nextOpenDay, closesIn: null };
  }

  // Before opening time
  if (effectiveCurrentMinutes < openMinutes) {
    return { isOpen: false, reason: 'not_open_yet', nextOpenTime: openTimeStr, nextOpenDay: 'Today', closesIn: null };
  }

  // After closing time
  if (effectiveCurrentMinutes >= effectiveCloseMinutes) {
    return { isOpen: false, reason: 'closed', nextOpenTime: openTimeStr, nextOpenDay: 'Tomorrow', closesIn: null };
  }

  // Shop is open - calculate minutes until close
  const closesIn = effectiveCloseMinutes - effectiveCurrentMinutes;
  return { isOpen: true, reason: null, nextOpenTime: null, nextOpenDay: null, closesIn };
}