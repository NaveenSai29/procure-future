// Simple in-memory rate limiter
// For production, replace with Redis-based limiter
const requestCounts = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entries] of requestCounts) {
    const filtered = entries.filter(e => e.timestamp > now);
    if (filtered.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, filtered);
    }
  }
}, 10 * 60 * 1000);

/**
 * Rate limit middleware for API routes
 * @param {string} identifier - IP address or user ID
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds (default 60s)
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60 * 1000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!requestCounts.has(identifier)) {
    requestCounts.set(identifier, []);
  }

  const entries = requestCounts.get(identifier);
  // Remove expired entries
  const recentEntries = entries.filter(e => e.timestamp > windowStart);
  
  if (recentEntries.length >= maxRequests) {
    const oldestInWindow = recentEntries[0];
    const resetTime = oldestInWindow.timestamp + windowMs;
    return { allowed: false, remaining: 0, resetTime };
  }

  recentEntries.push({ timestamp: now });
  requestCounts.set(identifier, recentEntries);

  return { allowed: true, remaining: maxRequests - recentEntries.length, resetTime: now + windowMs };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Apply rate limiting to an API route
 * Usage: const rateLimitResult = await applyRateLimit(request, 'login', 5, 300);
 */
export async function applyRateLimit(request, key, maxRequests, windowSeconds = 60) {
  const ip = getClientIP(request);
  const identifier = `${key}:${ip}`;
  return checkRateLimit(identifier, maxRequests, windowSeconds * 1000);
}