// src/services/gst.service.js
// GST Auto-Verification Service
// Supports: Format validation + GST Portal API integration (mock for dev)

import prisma from '@/lib/prisma';

/**
 * Validate GSTIN format
 * GSTIN Format: 22 AAAAA0000A 1 Z 5
 * - 2 digits: State code (01-37)
 * - 10 chars: PAN of taxpayer
 * - 1 digit: Entity number
 * - 1 char: Check digit (alphanumeric)
 * - Total: 15 characters
 */
export function validateGstinFormat(gstin) {
  if (!gstin) return { valid: false, error: 'GSTIN is required' };
  
  const cleaned = gstin.toUpperCase().trim();
  
  // Length check
  if (cleaned.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters' };
  }
  
  // Pattern: 2 digits + 10 alphanumeric (PAN) + 1 digit + 1 alphanumeric
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid GSTIN format. Expected: XX AAAAA0000A X Z X' };
  }
  
  // State code validation
  const stateCode = parseInt(cleaned.substring(0, 2));
  if (stateCode < 1 || stateCode > 37) {
    return { valid: false, error: 'Invalid state code in GSTIN (must be 01-37)' };
  }
  
  return { valid: true, gstin: cleaned, stateCode };
}

/**
 * Verify GSTIN against GST Portal API
 * In development: Uses mock verification with realistic responses
 * In production: Connects to actual GST verification API
 * NOTE: This function ONLY verifies and returns results.
 * DB updates are handled by the calling API route.
 */
export async function verifyGstinFromPortal(gstin) {
  const formatCheck = validateGstinFormat(gstin);
  if (!formatCheck.valid) {
    return { verified: false, ...formatCheck };
  }
  
  const cleaned = formatCheck.gstin;
  
  // --- Mock/Sandbox GST API Call ---
  // In production, replace with actual GST portal API:
  // POST https://api.gst.gov.in/v2/taxpayers/{gstin}/verify
  // Headers: Authorization, x-api-key, etc.
  
  const mockResult = await mockGstVerification(cleaned);
  
  return mockResult;
}

/**
 * Mock GST verification for development
 * Simulates realistic GST portal responses
 */
async function mockGstVerification(gstin) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const stateCode = parseInt(gstin.substring(0, 2));
  const pan = gstin.substring(2, 12);
  
  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    return {
      verified: false,
      gstin,
      error: 'GST Portal is temporarily unavailable. Please try again.',
      status: 'SERVICE_UNAVAILABLE',
    };
  }
  
  // Simulate invalid GSTIN (3% chance for non-existent)
  if (Math.random() < 0.03) {
    return {
      verified: false,
      gstin,
      error: 'GSTIN not found in GST database. Please check the number.',
      status: 'NOT_FOUND',
    };
  }
  
  // Simulate cancelled/suspended GST (2% chance)
  if (Math.random() < 0.02) {
    return {
      verified: true,
      gstin,
      stateCode,
      pan,
      businessName: generateMockBusinessName(gstin),
      registrationDate: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'CANCELLED',
      cancellationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      taxpayerType: 'Regular',
      constitutionOfBusiness: 'Private Limited Company',
    };
  }
  
  // Successful verification
  return {
    verified: true,
    gstin,
    stateCode,
    pan,
    businessName: generateMockBusinessName(gstin),
    registrationDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    taxpayerType: ['Regular', 'Composition', 'SEZ Developer', 'Input Service Distributor'][Math.floor(Math.random() * 4)],
    constitutionOfBusiness: [
      'Private Limited Company', 'Public Limited Company', 'Partnership Firm',
      'Proprietorship', 'LLP', 'HUF', 'Society/Trust'
    ][Math.floor(Math.random() * 7)],
    natureOfBusinessActivity: ['Manufacturer', 'Trader', 'Service Provider', 'Works Contractor'][Math.floor(Math.random() * 4)],
    registrationType: 'Regular',
    filingStatus: {
      lastFiled: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      pendingReturns: Math.floor(Math.random() * 3),
      complianceRating: Math.floor(Math.random() * 5) + 5, // 5-10
    },
  };
}

function generateMockBusinessName(gstin) {
  const prefixes = ['Tech', 'Global', 'Indian', 'National', 'Prime', 'Elite', 'Smart', 'Agile', 'Dynamic', 'Universal'];
  const suffixes = ['Enterprises', 'Industries', 'Trading Co.', 'Solutions Pvt Ltd', 'Manufacturing Ltd', 'Exports', 'Impex', 'Corporation', 'Ventures', 'Associates'];
  const hash = gstin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${prefixes[hash % prefixes.length]} ${suffixes[(hash * 7) % suffixes.length]}`;
}

/**
 * Bulk verify multiple GSTINs
 */
export async function bulkVerifyGstins(gstinList) {
  const results = [];
  for (const gstin of gstinList) {
    try {
      const result = await verifyGstinFromPortal(gstin.trim());
      results.push(result);
    } catch (error) {
      results.push({ verified: false, gstin: gstin.trim(), error: error.message });
    }
  }
  return results;
}

/**
 * Check if GST verification is needed for a supplier
 */
export async function getGstVerificationStatus(supplierId) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      gstin: true,
      gstVerified: true,
      gstVerificationDate: true,
      gstBusinessName: true,
      gstVerificationResponse: true,
      businessName: true,
      isVerified: true,
    },
  });
  
  if (!supplier) return null;
  
  let parsedResponse = null;
  try {
    if (supplier.gstVerificationResponse) {
      parsedResponse = JSON.parse(supplier.gstVerificationResponse);
    }
  } catch {}
  
  return {
    ...supplier,
    parsedResponse,
    needsVerification: !supplier.gstVerified,
    businessNameMatch: supplier.gstVerified
      ? supplier.gstBusinessName?.toLowerCase() === supplier.businessName?.toLowerCase()
      : null,
  };
}