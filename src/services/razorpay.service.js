import Razorpay from 'razorpay';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export class RazorpayService {
  /**
   * Create an order for buyer payment
   */
  static async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes,
      });
      return order;
    } catch (error) {
      console.error('Razorpay create order error:', error);
      throw new Error(error.error?.description || 'Failed to create payment order');
    }
  }

  /**
   * Verify payment signature
   */
  static verifyPaymentSignature({ orderId, paymentId, signature }) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    
    return expectedSignature === signature;
  }

  /**
   * Fetch payment details
   */
  static async getPayment(paymentId) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Razorpay fetch payment error:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  /**
   * Fetch all payments (for admin)
   */
  static async getPayments({ from, to, count = 50, skip = 0 } = {}) {
    try {
      const payments = await razorpay.payments.all({
        from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to || new Date(),
        count,
        skip,
      });
      return payments;
    } catch (error) {
      console.error('Razorpay fetch payments error:', error);
      return { items: [], count: 0 };
    }
  }

  /**
   * Refund a payment
   */
  static async createRefund({ paymentId, amount }) {
    try {
      const refund = await razorpay.payments.refund(paymentId, {
        amount: amount ? Math.round(amount * 100) : undefined, // Full refund if no amount
      });
      return refund;
    } catch (error) {
      console.error('Razorpay refund error:', error);
      throw new Error(error.error?.description || 'Failed to process refund');
    }
  }

  /**
   * Get refund details
   */
  static async getRefund(refundId) {
    try {
      return await razorpay.refunds.fetch(refundId);
    } catch (error) {
      throw new Error('Failed to fetch refund details');
    }
  }

  // ============================================
  // PAYOUTS / SETTLEMENTS
  // ============================================

  /**
   * Create a fund account for supplier
   */
  static async createFundAccount({ accountHolder, accountNumber, ifsc, bankName }) {
    try {
      const fundAccount = await razorpay.fundAccounts.create({
        customer_id: null,
        account_type: 'bank_account',
        bank_account: {
          name: accountHolder,
          account_number: accountNumber,
          ifsc: ifsc,
        },
      });
      return fundAccount;
    } catch (error) {
      console.error('Razorpay fund account error:', error);
      throw new Error(error.error?.description || 'Failed to create fund account');
    }
  }

  /**
   * Validate bank account (Penny Drop)
   */
  static async validateBankAccount({ accountNumber, ifsc, accountHolder }) {
    try {
      const validation = await razorpay.fundAccounts.validate({
        account_number: accountNumber,
        ifsc: ifsc,
        account_holder: accountHolder,
      });
      return {
        valid: true,
        nameAtBank: validation.name_at_bank,
        nameMatch: validation.name_match,
        accountExists: validation.account_exists,
      };
    } catch (error) {
      console.error('Bank validation error:', error);
      return {
        valid: false,
        error: error.error?.description || 'Bank validation failed',
      };
    }
  }

  /**
   * Create a payout to supplier bank account
   */
  static async createPayout({ fundAccountId, amount, reference, narration }) {
    try {
      const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        mode: 'NEFT',
        purpose: 'refund',
        reference_id: reference || `payout_${Date.now()}`,
        narration: narration || 'PROCURE Settlement',
        queue_if_low_balance: true,
      });
      return payout;
    } catch (error) {
      console.error('Razorpay payout error:', error);
      throw new Error(error.error?.description || 'Failed to create payout');
    }
  }

  /**
   * Get payout status
   */
  static async getPayout(payoutId) {
    try {
      return await razorpay.payouts.fetch(payoutId);
    } catch (error) {
      throw new Error('Failed to fetch payout details');
    }
  }

  // ============================================
  // IFSC VERIFICATION
  // ============================================

  /**
   * Validate IFSC and get bank details
   */
  static async validateIFSC(ifsc) {
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        return {
          valid: true,
          bank: data.BANK,
          branch: data.BRANCH,
          address: data.ADDRESS,
          city: data.CITY,
          district: data.DISTRICT,
          state: data.STATE,
          ifsc: data.IFSC,
          micr: data.MICR,
          contact: data.CONTACT,
          rtgs: data.RTGS,
          neft: data.NEFT,
          imps: data.IMPS,
        };
      }
      return { valid: false, error: 'IFSC not found' };
    } catch (error) {
      return { valid: false, error: 'Failed to validate IFSC' };
    }
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================

  /**
   * Get payment stats for admin dashboard
   */
  static async getPaymentStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [allPayments, todayPayments] = await Promise.all([
        razorpay.payments.all({ from: thisMonth, to: new Date(), count: 100 }),
        razorpay.payments.all({ from: today, to: new Date(), count: 100 }),
      ]);

      const calculateTotal = (items) => items.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

      return {
        totalPayments: allPayments.count,
        monthlyAmount: calculateTotal(allPayments.items),
        todayPayments: todayPayments.count,
        todayAmount: calculateTotal(todayPayments.items),
        recentPayments: allPayments.items.slice(0, 10).map(p => ({
          id: p.id,
          amount: p.amount / 100,
          status: p.status,
          method: p.method,
          email: p.email,
          contact: p.contact,
          createdAt: p.created_at,
        })),
      };
    } catch (error) {
      console.error('Payment stats error:', error);
      return { totalPayments: 0, monthlyAmount: 0, todayPayments: 0, todayAmount: 0, recentPayments: [] };
    }
  }
}