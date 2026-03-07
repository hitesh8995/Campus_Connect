const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const getRazorpayInstance = () => {
  const keyId = process.env.RZP_KEY_ID;
  const keySecret = process.env.RZP_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    console.warn('Razorpay keys not configured. Payment features will not work.');
    return null;
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

// Create order
const createOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const razorpay = getRazorpayInstance();
    
    if (!razorpay) {
      throw new Error('Razorpay not configured');
    }
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      notes,
      payment_capture: 1 // Auto capture
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay create order error:', error);
    throw error;
  }
};

// Verify payment signature
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const keySecret = process.env.RZP_KEY_SECRET;
  
  if (!keySecret) {
    console.warn('Razorpay key secret not configured');
    return false;
  }
  
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
};

// Verify webhook signature
const verifyWebhookSignature = (body, signature) => {
  const keySecret = process.env.RZP_KEY_SECRET;
  
  if (!keySecret) {
    console.warn('Razorpay key secret not configured');
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
};

// Fetch payment details
const fetchPayment = async (paymentId) => {
  try {
    const razorpay = getRazorpayInstance();
    
    if (!razorpay) {
      throw new Error('Razorpay not configured');
    }
    
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay fetch payment error:', error);
    throw error;
  }
};

// Process refund
const processRefund = async (paymentId, amount = null) => {
  try {
    const razorpay = getRazorpayInstance();
    
    if (!razorpay) {
      throw new Error('Razorpay not configured');
    }
    
    const options = {};
    if (amount) {
      options.amount = amount * 100; // Convert to paise
    }
    
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error);
    throw error;
  }
};

// Generate QR code data for ticket
const generateTicketQRData = (ticketId, registrationId, eventId) => {
  const data = JSON.stringify({
    ticketId,
    registrationId,
    eventId,
    timestamp: Date.now()
  });
  
  // Sign the data with a secret
  const signature = crypto
    .createHmac('sha256', process.env.TICKET_SECRET || 'ticket-secret-key')
    .update(data)
    .digest('hex');
  
  return {
    data,
    signature
  };
};

// Verify QR code data
const verifyTicketQRData = (data, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.TICKET_SECRET || 'ticket-secret-key')
    .update(data)
    .digest('hex');
  
  return expectedSignature === signature;
};

module.exports = {
  getRazorpayInstance,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  processRefund,
  generateTicketQRData,
  verifyTicketQRData
};
