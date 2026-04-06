const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { requireAuth } = require("../middleware/auth");
const { sendPaymentConfirmed } = require("../utils/email");

async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials not configured");
  const base64 = Buffer.from(`${key}:${secret}`).toString("base64");
  const env = process.env.MPESA_ENV === "production" ? "api" : "sandbox";
  const res = await fetch(`https://${env}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${base64}` }
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get M-Pesa token");
  return data.access_token;
}

function getMpesaPassword() {
  const shortcode = process.env.MPESA_SHORTCODE || "174379";
  const passkey = process.env.MPESA_PASSKEY || "";
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  return { password, timestamp, shortcode };
}

// POST /api/payments/mpesa/stk-push
router.post("/mpesa/stk-push", requireAuth, async (req, res) => {
  const { phone, amount, propertyId, accountReference } = req.body;
  if (!phone || !amount) return res.status(400).json({ message: "phone and amount are required" });

  try {
    const token = await getMpesaToken();
    const { password, timestamp, shortcode } = getMpesaPassword();
    const env = process.env.MPESA_ENV === "production" ? "api" : "sandbox";
    const callbackUrl = process.env.MPESA_CALLBACK_URL || "https://example.com/api/payments/mpesa/callback";

    const stkRes = await fetch(`https://${env}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", Amount: Math.ceil(amount),
        PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
        CallBackURL: callbackUrl, AccountReference: accountReference || "RENTHUB",
        TransactionDesc: "Property Payment",
      }),
    });
    const stkData = await stkRes.json();

    if (stkData.ResponseCode === "0") {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO payments (id,user_id,property_id,phone_number,amount,merchant_request_id,checkout_request_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)")
        .run(uuidv4(), req.user.id, propertyId||null, phone, amount, stkData.MerchantRequestID, stkData.CheckoutRequestID, now, now);
      return res.json({ success: true, checkoutRequestId: stkData.CheckoutRequestID });
    }
    throw new Error(stkData.errorMessage || "STK push failed");
  } catch (err) {
    console.error("M-Pesa STK push error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payments/mpesa/callback
router.post("/mpesa/callback", (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;
    const now = new Date().toISOString();

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const meta = {};
      CallbackMetadata.Item.forEach(item => { meta[item.Name] = item.Value; });
      db.prepare("UPDATE payments SET status='completed',mpesa_receipt_number=?,transaction_date=?,result_code=?,result_desc=?,updated_at=? WHERE checkout_request_id=?")
        .run(meta.MpesaReceiptNumber||null, String(meta.TransactionDate||now), ResultCode, ResultDesc, now, CheckoutRequestID);

      // Email + notification
      const payment = db.prepare("SELECT * FROM payments WHERE checkout_request_id=?").get(CheckoutRequestID);
      if (payment?.user_id) {
        const user = db.prepare("SELECT email, full_name FROM users WHERE id=?").get(payment.user_id);
        const prop = payment.property_id ? db.prepare("SELECT title FROM properties WHERE id=?").get(payment.property_id) : null;
        if (user) sendPaymentConfirmed(user.email, user.full_name, prop?.title || "Property", payment.amount, meta.MpesaReceiptNumber).catch(() => {});
        db.prepare("INSERT INTO notifications (id,user_id,type,title,message,link,created_at) VALUES (?,?,?,?,?,?,?)")
          .run(uuidv4(), payment.user_id, "payment_confirmed", "Payment Confirmed ✅", `KES ${Number(payment.amount).toLocaleString()} payment confirmed. Receipt: ${meta.MpesaReceiptNumber}`, "/dashboard", now);
      }
    } else {
      db.prepare("UPDATE payments SET status='failed',result_code=?,result_desc=?,updated_at=? WHERE checkout_request_id=?")
        .run(ResultCode, ResultDesc, now, CheckoutRequestID);
    }
  } catch (err) { console.error("M-Pesa callback error:", err.message); }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// GET /api/payments
router.get("/", requireAuth, (req, res) => {
  const rows = req.user.role === "admin"
    ? db.prepare("SELECT * FROM payments ORDER BY created_at DESC").all()
    : db.prepare("SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC").all(req.user.id);
  res.json(rows);
});

// GET /api/payments/subscription — subscribe to a plan
router.post("/subscribe", requireAuth, async (req, res) => {
  const { plan_id, phone } = req.body;
  if (!plan_id || !phone) return res.status(400).json({ message: "plan_id and phone required" });

  const plan = db.prepare("SELECT * FROM subscription_plans WHERE id=? AND is_active=1").get(plan_id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  if (plan.price === 0) {
    // Free plan — activate immediately
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
    db.prepare("INSERT INTO subscriptions (id,user_id,plan_id,status,starts_at,expires_at,created_at) VALUES (?,?,?,'active',?,?,?)")
      .run(uuidv4(), req.user.id, plan_id, now, expires, now);
    return res.json({ message: "Free plan activated" });
  }

  // Trigger M-Pesa STK push for paid plans
  try {
    const token = await getMpesaToken();
    const { password, timestamp, shortcode } = getMpesaPassword();
    const env = process.env.MPESA_ENV === "production" ? "api" : "sandbox";
    const stkRes = await fetch(`https://${env}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", Amount: Math.ceil(plan.price),
        PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL || "https://example.com/api/payments/mpesa/callback",
        AccountReference: `SUB-${plan.name.replace(/\s/g,"")}`, TransactionDesc: `${plan.name} Subscription`,
      }),
    });
    const data = await stkRes.json();
    if (data.ResponseCode === "0") {
      const now = new Date().toISOString();
      const paymentId = uuidv4();
      db.prepare("INSERT INTO payments (id,user_id,property_id,phone_number,amount,merchant_request_id,checkout_request_id,status,created_at,updated_at) VALUES (?,?,null,?,?,?,?,'pending',?,?)")
        .run(paymentId, req.user.id, phone, plan.price, data.MerchantRequestID, data.CheckoutRequestID, now, now);
      return res.json({ success: true, message: "Check your phone to complete payment" });
    }
    throw new Error(data.errorMessage || "STK push failed");
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
