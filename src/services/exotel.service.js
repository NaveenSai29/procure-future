// Exotel Number Masking Service
// Documentation: https://developer.exotel.com/api/

const EXOTEL_BASE = 'https://api.exotel.com/v1';
const ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID;
const API_KEY = process.env.EXOTEL_API_KEY;
const API_TOKEN = process.env.EXOTEL_API_TOKEN;
const PROXY_NUMBER = process.env.EXOTEL_PROXY_NUMBER;

class ExotelService {
  /**
   * Create a masked call between two parties
   * @param {string} toNumber - The REAL number to connect (buyer or partner)
   * @param {string} fromNumber - The REAL number of the caller
   * @param {string} referenceId - Order ID or session ID for tracking
   * @returns {object} Call session details
   */
  static async connectCall(toNumber, fromNumber, referenceId) {
    try {
      const auth = Buffer.from(`${API_KEY}:${API_TOKEN}`).toString('base64');

      const res = await fetch(`${EXOTEL_BASE}/Accounts/${ACCOUNT_SID}/Calls/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          From: PROXY_NUMBER,
          To: toNumber,
          CallerId: PROXY_NUMBER,
          Record: true,
          StatusCallback: `${process.env.EXOTEL_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL + '/api/calls/webhook'}`,
          StatusCallbackMethod: 'POST',
          CustomField: referenceId,
        }),
      });

      const data = await res.json();

      if (data.RestException) {
        console.error('Exotel error:', data.RestException);
        return { success: false, error: data.RestException.Message };
      }

      return {
        success: true,
        callSid: data.Call?.Sid,
        proxyNumber: PROXY_NUMBER,
        status: data.Call?.Status,
      };
    } catch (error) {
      console.error('Exotel connect error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get call details for recording/status
   * @param {string} callSid - Exotel Call SID
   */
  static async getCallDetails(callSid) {
    try {
      const auth = Buffer.from(`${API_KEY}:${API_TOKEN}`).toString('base64');

      const res = await fetch(`${EXOTEL_BASE}/Accounts/${ACCOUNT_SID}/Calls/${callSid}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await res.json();
      return data.Call || null;
    } catch (error) {
      console.error('Exotel get call error:', error.message);
      return null;
    }
  }

  /**
   * Get recording URL for a call
   * @param {string} callSid - Exotel Call SID
   */
  static async getRecording(callSid) {
    try {
      const auth = Buffer.from(`${API_KEY}:${API_TOKEN}`).toString('base64');

      const res = await fetch(`${EXOTEL_BASE}/Accounts/${ACCOUNT_SID}/Calls/${callSid}/Recordings`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await res.json();
      return data.Recordings?.[0]?.Url || null;
    } catch (error) {
      console.error('Exotel recording error:', error.message);
      return null;
    }
  }
}

export default ExotelService;