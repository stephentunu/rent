require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

// Init DB first
require("./db/init");

const app = express();
const PORT = process.env.PORT || 3001;
// Railway requires binding to 0.0.0.0 — not localhost
const HOST = "0.0.0.0";

// ─── Security ─────────────────────────────────────────────────────────────────
const { helmet, apiLimiter } = require("./middleware/security");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(apiLimiter);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const cors = require("cors");
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(o => o.trim())
  : ["http://localhost:5173"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("CORS: origin not allowed — " + origin));
  },
  credentials: true,
}));

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Static files ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(path.resolve(UPLOADS_DIR)));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"));
app.use("/api/properties",    require("./routes/properties"));
app.use("/api/conversations", require("./routes/conversations"));
app.use("/api/payments",      require("./routes/payments"));
app.use("/api/wallet",        require("./routes/wallet"));
app.use("/api/admin",         require("./routes/admin"));
app.use("/api/upload",        require("./routes/upload"));
app.use("/api",               require("./routes/misc"));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" }));

// ─── One-time Admin Promote ───────────────────────────────────────────────────
// POST /api/setup/promote-admin  { secret, email }
// Protected by ADMIN_SETUP_SECRET env var (set to any strong random string on Railway)
app.post("/api/setup/promote-admin", async (req, res) => {
  const db = require("./db/init");
  const { v4: uuidv4 } = require("uuid");
  const secret = process.env.ADMIN_SETUP_SECRET || "renthub-setup-2024";
  const { secret: provided, email } = req.body;
  if (provided !== secret) return res.status(403).json({ message: "Invalid secret" });
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const userRow = await db.prepare("SELECT id FROM users WHERE email = $1").get(email.toLowerCase());
    if (!userRow) return res.status(404).json({ message: "User not found" });

    const roleRow = await db.prepare("SELECT id, role FROM user_roles WHERE user_id = $1").get(userRow.id);
    if (roleRow) {
      await db.prepare("UPDATE user_roles SET role = 'admin' WHERE user_id = $1").run(userRow.id);
    } else {
      await db.prepare(
        "INSERT INTO user_roles (id, user_id, role, created_at) VALUES ($1,$2,'admin',NOW())"
      ).run(uuidv4(), userRow.id);
    }
    res.json({ message: `User ${email} promoted to admin successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to promote user" });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `${req.method} ${req.path} not found` }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`\n🏠 Rent Hub API v2.0 running at http://${HOST}:${PORT}`);
  console.log(`   Health: http://${HOST}:${PORT}/api/health\n`);
});
