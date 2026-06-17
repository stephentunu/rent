require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

const { initDb } = require("./db/init");

const PORT = process.env.PORT || 3001;
// Railway requires binding to 0.0.0.0 — not localhost
const HOST = "0.0.0.0";

async function start() {
  // Initialise the database before registering routes so that the db proxy
  // is ready for any synchronous calls made at require-time in route modules.
  await initDb();

  const app = express();

  // ─── Security ───────────────────────────────────────────────────────────────
  const { helmet, apiLimiter } = require("./middleware/security");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(apiLimiter);

  // ─── CORS ───────────────────────────────────────────────────────────────────
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

  // ─── Body parsers ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // ─── Static files ───────────────────────────────────────────────────────────
  const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  app.use("/uploads", express.static(path.resolve(UPLOADS_DIR)));

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.use("/api/auth",          require("./routes/auth"));
  app.use("/api/properties",    require("./routes/properties"));
  app.use("/api/conversations", require("./routes/conversations"));
  app.use("/api/payments",      require("./routes/payments"));
  app.use("/api/wallet",        require("./routes/wallet"));
  app.use("/api/admin",         require("./routes/admin"));
  app.use("/api/upload",        require("./routes/upload"));
  app.use("/api",               require("./routes/misc"));

  // ─── Health ─────────────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" }));

  // ─── 404 ────────────────────────────────────────────────────────────────────
  app.use((req, res) => res.status(404).json({ message: `${req.method} ${req.path} not found` }));

  // ─── Error handler ──────────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Internal server error" });
  });

  app.listen(PORT, HOST, () => {
    console.log(`\n🏠 Rent Hub API v2.0 running at http://${HOST}:${PORT}`);
    console.log(`   Health: http://${HOST}:${PORT}/api/health\n`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
