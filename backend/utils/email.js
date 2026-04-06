const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const FROM = process.env.EMAIL_FROM || "Rent Hub <no-reply@renthub.co.ke>";
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL SKIPPED - no credentials] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[EMAIL SENT] To: ${to} | ${subject}`);
  } catch (err) {
    console.error(`[EMAIL FAILED] ${err.message}`);
  }
}

function base(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px}
    .c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .h{background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center}
    .h h1{color:#fff;margin:0;font-size:24px;font-weight:700}.h p{color:rgba(255,255,255,.85);margin:4px 0 0;font-size:14px}
    .b{padding:40px}.b h2{color:#111827;font-size:20px;margin:0 0 16px}.b p{color:#6b7280;line-height:1.6;margin:0 0 16px}
    .btn{display:inline-block;background:#16a34a;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0}
    .box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:20px 0}
    .box p{color:#166534;margin:4px 0;font-size:14px}
    .f{background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb}
    .f p{color:#9ca3af;font-size:12px;margin:0}
  </style></head><body><div class="c">
    <div class="h"><h1>🏠 Rent In</h1><p>Kenya's Property Marketplace</p></div>
    <div class="b">${content}</div>
    <div class="f"><p>© ${new Date().getFullYear()} Rent Hub. All rights reserved.</p></div>
  </div></body></html>`;
}

const sendWelcome = (to, name) => sendEmail({ to, subject: "Welcome to Rent In! 🏠", html: base(`
  <h2>Welcome, ${name || "there"}! 👋</h2>
  <p>You're now part of <strong>Rent In</strong> — Kenya's fastest-growing property marketplace.</p>
  <div class="box"><p>🔍 Browse thousands of properties</p><p>❤️ Save your favorites</p><p>🏠 List your property</p><p>💬 Message owners directly</p></div>
  <a href="${FRONTEND}/properties" class="btn">Browse Properties</a>`) });

const sendPasswordReset = (to, name, token) => sendEmail({ to, subject: "Reset Your Rent In Password", html: base(`
  <h2>Password Reset</h2><p>Hi ${name || "there"},</p>
  <p>Click below to reset your password. This link expires in <strong>1 hour</strong>.</p>
  <a href="${FRONTEND}/reset-password?token=${token}" class="btn">Reset Password</a>
  <div class="box"><p>⚠️ If you didn't request this, ignore this email.</p></div>`) });

const sendPropertyApproved = (to, name, title, id) => sendEmail({ to, subject: `✅ Your listing is now live — ${title}`, html: base(`
  <h2>Your listing is live! 🎉</h2><p>Hi ${name || "there"},</p>
  <p>Your property <strong>"${title}"</strong> has been approved and is now visible to buyers and renters.</p>
  <a href="${FRONTEND}/property/${id}" class="btn">View Listing</a>
  <div class="box"><p>💡 Properties with more photos get 3x more inquiries!</p></div>`) });

const sendNewInquiry = (to, ownerName, title, fromName, fromEmail, fromPhone, msg) => sendEmail({ to, subject: `New inquiry for "${title}"`, html: base(`
  <h2>New inquiry received 📩</h2><p>Hi ${ownerName || "there"},</p>
  <p>Someone is interested in <strong>"${title}"</strong>:</p>
  <div class="box"><p><strong>Name:</strong> ${fromName}</p><p><strong>Email:</strong> ${fromEmail}</p>${fromPhone ? `<p><strong>Phone:</strong> ${fromPhone}</p>` : ""}<p><strong>Message:</strong> ${msg}</p></div>
  <a href="${FRONTEND}/messages" class="btn">Reply via Messages</a>`) });

const sendNewMessage = (to, toName, fromName, propertyTitle) => sendEmail({ to, subject: `New message from ${fromName}`, html: base(`
  <h2>New message 💬</h2><p>Hi ${toName || "there"},</p>
  <p><strong>${fromName}</strong> sent you a message${propertyTitle ? ` about <strong>"${propertyTitle}"</strong>` : ""}.</p>
  <a href="${FRONTEND}/messages" class="btn">View Message</a>`) });

const sendPaymentConfirmed = (to, name, title, amount, receipt) => sendEmail({ to, subject: `Payment confirmed — KES ${Number(amount).toLocaleString()}`, html: base(`
  <h2>Payment Confirmed ✅</h2><p>Hi ${name || "there"},</p>
  <div class="box"><p><strong>Property:</strong> ${title}</p><p><strong>Amount:</strong> KES ${Number(amount).toLocaleString()}</p><p><strong>M-Pesa Receipt:</strong> ${receipt}</p></div>
  <a href="${FRONTEND}/dashboard" class="btn">View Dashboard</a>`) });

module.exports = { sendWelcome, sendPasswordReset, sendPropertyApproved, sendNewInquiry, sendNewMessage, sendPaymentConfirmed };
