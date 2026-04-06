const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { requireAuth } = require("../middleware/auth");
const { authLimiter, resetLimiter } = require("../middleware/security");
const { sendWelcome, sendPasswordReset } = require("../utils/email");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function makeToken(id) { return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" }); }

function publicUser(user) {
  const roleRow = db.prepare("SELECT role FROM user_roles WHERE user_id = ?").get(user.id);
  return {
    id: user.id, email: user.email, full_name: user.full_name, phone: user.phone,
    avatar_url: user.avatar_url, company: user.company, bio: user.bio, website: user.website,
    is_agent: !!user.is_agent, is_verified: !!user.is_verified, role: roleRow?.role || "user",
  };
}

// POST /api/auth/register
router.post("/register", authLimiter, (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(400).json({ message: "An account with this email already exists" });

  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO users (id, email, password, full_name, created_at, updated_at) VALUES (?,?,?,?,?,?)")
    .run(id, email.toLowerCase(), hash, full_name || null, now, now);
  db.prepare("INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?,?,'user',?)").run(uuidv4(), id, now);
  db.prepare("INSERT INTO wallets (id, user_id, balance, locked_balance, created_at, updated_at) VALUES (?,?,0,0,?,?)").run(uuidv4(), id, now, now);

  // Send welcome email (non-blocking)
  sendWelcome(email, full_name).catch(() => {});

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.status(201).json({ token: makeToken(id), user: publicUser(user) });
});

// POST /api/auth/login
router.post("/login", authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ message: "Invalid login credentials" });

  res.json({ token: makeToken(user.id), user: publicUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(publicUser(user));
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, (req, res) => {
  const { full_name, phone, avatar_url, company, bio, website, is_agent } = req.body;
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET full_name=?,phone=?,avatar_url=?,company=?,bio=?,website=?,is_agent=?,updated_at=? WHERE id=?")
    .run(full_name ?? null, phone ?? null, avatar_url ?? null, company ?? null, bio ?? null, website ?? null, is_agent ? 1 : 0, now, req.user.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json(publicUser(user));
});

// PUT /api/auth/change-password
router.put("/change-password", requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ message: "Both passwords are required" });
  if (new_password.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password))
    return res.status(401).json({ message: "Current password is incorrect" });

  db.prepare("UPDATE users SET password=?, updated_at=? WHERE id=?")
    .run(bcrypt.hashSync(new_password, 10), new Date().toISOString(), req.user.id);
  res.json({ message: "Password updated successfully" });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", resetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  // Always return 200 to prevent email enumeration
  if (!user) return res.json({ message: "If an account exists, a reset link has been sent." });

  const token = uuidv4() + uuidv4(); // long random token
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const now = new Date().toISOString();

  // Invalidate old tokens
  db.prepare("UPDATE password_resets SET used=1 WHERE user_id=?").run(user.id);
  db.prepare("INSERT INTO password_resets (id, user_id, token, expires_at, created_at) VALUES (?,?,?,?,?)")
    .run(uuidv4(), user.id, token, expiresAt, now);

  await sendPasswordReset(user.email, user.full_name, token).catch(() => {});
  res.json({ message: "If an account exists, a reset link has been sent." });
});

// POST /api/auth/reset-password
router.post("/reset-password", resetLimiter, (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ message: "Token and new password are required" });
  if (new_password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

  const reset = db.prepare("SELECT * FROM password_resets WHERE token=? AND used=0").get(token);
  if (!reset) return res.status(400).json({ message: "Invalid or expired reset link" });
  if (new Date(reset.expires_at) < new Date()) return res.status(400).json({ message: "Reset link has expired" });

  const hash = bcrypt.hashSync(new_password, 10);
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET password=?, updated_at=? WHERE id=?").run(hash, now, reset.user_id);
  db.prepare("UPDATE password_resets SET used=1 WHERE id=?").run(reset.id);

  res.json({ message: "Password reset successfully. You can now log in." });
});

module.exports = router;
