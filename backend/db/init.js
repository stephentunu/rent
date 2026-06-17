const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// On Railway: set DB_PATH=/data/renthub.db and attach a Volume at /data
const DB_PATH = process.env.DB_PATH || "./data/renthub.db";
const DB_PATH_RESOLVED = path.resolve(DB_PATH);
const dir = path.dirname(DB_PATH_RESOLVED);

// ─── sql.js compatibility shim ────────────────────────────────────────────────
// Wraps a sql.js Database to expose the same synchronous API as better-sqlite3:
//   db.prepare(sql).get(...params)   → first row as plain object, or undefined
//   db.prepare(sql).all(...params)   → array of plain objects
//   db.prepare(sql).run(...params)   → void
//   db.exec(sql)                     → void
//   db.pragma(...)                   → no-op (sql.js handles pragmas via exec)
//
// sql.js stores column names separately from row values, so we zip them here.

function rowToObject(columns, values) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = values[i]; });
  return obj;
}

function makeShim(sqlJsDb) {
  return {
    prepare(sql) {
      return {
        get(...params) {
          const stmt = sqlJsDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = rowToObject(stmt.getColumnNames(), stmt.get());
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = sqlJsDb.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            rows.push(rowToObject(stmt.getColumnNames(), stmt.get()));
          }
          stmt.free();
          return rows;
        },
        run(...params) {
          const stmt = sqlJsDb.prepare(sql);
          stmt.run(params);
          stmt.free();
        },
      };
    },
    exec(sql) {
      sqlJsDb.run(sql);
    },
    // Pragmas are executed as SQL; WAL mode is not supported by sql.js (in-memory),
    // but foreign_keys can be enabled. We silently ignore unsupported pragmas.
    pragma(str) {
      try { sqlJsDb.run(`PRAGMA ${str}`); } catch { /* ignore */ }
    },
    // Persist the in-memory database to disk
    _persist() {
      const data = sqlJsDb.export();
      fs.writeFileSync(DB_PATH_RESOLVED, Buffer.from(data));
    },
    _sqlJsDb: sqlJsDb,
  };
}

// ─── Singleton db proxy (populated by initDb) ─────────────────────────────────
// All route files do `const db = require("../db/init")` and call db.prepare()
// synchronously. We expose a proxy object whose methods delegate to the real
// shim once it has been initialised. The server must call initDb() and await it
// before handling any requests.

let _shim = null;

const db = new Proxy({}, {
  get(_, prop) {
    if (!_shim) throw new Error("Database not initialised — await initDb() before using db");
    return _shim[prop];
  },
});

// ─── Initialisation ───────────────────────────────────────────────────────────

async function initDb() {
  if (_shim) return db; // already initialised

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();

  let sqlJsDb;
  if (fs.existsSync(DB_PATH_RESOLVED)) {
    const fileBuffer = fs.readFileSync(DB_PATH_RESOLVED);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  _shim = makeShim(sqlJsDb);

  // Enable foreign keys
  _shim.pragma("foreign_keys = ON");

  _shim.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    full_name   TEXT,
    phone       TEXT,
    avatar_url  TEXT,
    company     TEXT,
    bio         TEXT,
    website     TEXT,
    is_agent    INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS property_categories (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE NOT NULL,
    icon       TEXT,
    parent_id  TEXT REFERENCES property_categories(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS locations (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE NOT NULL,
    parent_id  TEXT REFERENCES locations(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS properties (
    id              TEXT PRIMARY KEY,
    user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    price           REAL NOT NULL,
    currency        TEXT DEFAULT 'KES',
    listing_type    TEXT NOT NULL CHECK(listing_type IN ('sale','rent')),
    category_id     TEXT REFERENCES property_categories(id),
    location_id     TEXT REFERENCES locations(id),
    address         TEXT,
    bedrooms        INTEGER,
    bathrooms       INTEGER,
    area_sqft       REAL,
    images          TEXT DEFAULT '[]',
    features        TEXT DEFAULT '[]',
    is_featured     INTEGER DEFAULT 0,
    is_new_project  INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending' CHECK(status IN ('active','pending','sold','rented')),
    latitude        REAL,
    longitude       REAL,
    view_count      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS property_views (
    id          TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    ip_address  TEXT,
    viewed_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    company     TEXT,
    email       TEXT,
    phone       TEXT,
    logo        TEXT,
    description TEXT,
    is_verified INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    agent_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, property_id)
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id          TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    message     TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversation_participants (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    is_read         INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT REFERENCES users(id) ON DELETE SET NULL,
    property_id           TEXT REFERENCES properties(id) ON DELETE SET NULL,
    phone_number          TEXT NOT NULL,
    amount                REAL NOT NULL,
    merchant_request_id   TEXT,
    checkout_request_id   TEXT,
    mpesa_receipt_number  TEXT,
    transaction_date      TEXT,
    status                TEXT DEFAULT 'pending',
    result_code           INTEGER,
    result_desc           TEXT,
    created_at            TEXT DEFAULT (datetime('now')),
    updated_at            TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscription_plans (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    duration_days INTEGER NOT NULL,
    max_listings INTEGER DEFAULT 1,
    features    TEXT DEFAULT '[]',
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id     TEXT NOT NULL REFERENCES subscription_plans(id),
    status      TEXT DEFAULT 'active' CHECK(status IN ('active','expired','cancelled')),
    starts_at   TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    payment_id  TEXT REFERENCES payments(id),
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id              TEXT PRIMARY KEY,
    user_id         TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance         REAL DEFAULT 0,
    locked_balance  REAL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id               TEXT PRIMARY KEY,
    wallet_id        TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('credit','debit','escrow_hold','escrow_release')),
    amount           REAL NOT NULL,
    description      TEXT,
    reference_id     TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS commission_config (
    id                    TEXT PRIMARY KEY,
    payment_type          TEXT NOT NULL,
    commission_percentage REAL DEFAULT 5,
    fixed_fee             REAL DEFAULT 0,
    is_active             INTEGER DEFAULT 1,
    created_at            TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS saved_searches (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    filters    TEXT NOT NULL,
    notify     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    link       TEXT,
    is_read    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

  // Add view_count column to existing databases that predate it
  try { _shim.exec("ALTER TABLE properties ADD COLUMN view_count INTEGER DEFAULT 0"); } catch { /* already exists */ }

  const { v4: uuidv4 } = require("uuid");

  function seedIfEmpty(table, rows) {
    const count = _shim.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
    if (count.c === 0) {
      const keys = Object.keys(rows[0]);
      rows.forEach((r) => {
        _shim.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).run(...Object.values(r));
      });
      console.log(`  ✓ Seeded ${rows.length} ${table}`);
    }
  }

  const now = new Date().toISOString();

  seedIfEmpty("property_categories", [
    { id: uuidv4(), name: "Houses",     slug: "houses",     icon: "home",     parent_id: null, created_at: now },
    { id: uuidv4(), name: "Apartments", slug: "apartments", icon: "building", parent_id: null, created_at: now },
    { id: uuidv4(), name: "Land",       slug: "land",       icon: "map",      parent_id: null, created_at: now },
    { id: uuidv4(), name: "Commercial", slug: "commercial", icon: "store",    parent_id: null, created_at: now },
  ]);

  seedIfEmpty("locations", [
    { id: uuidv4(), name: "Nairobi",   slug: "nairobi",   parent_id: null, created_at: now },
    { id: uuidv4(), name: "Mombasa",   slug: "mombasa",   parent_id: null, created_at: now },
    { id: uuidv4(), name: "Kisumu",    slug: "kisumu",    parent_id: null, created_at: now },
    { id: uuidv4(), name: "Nakuru",    slug: "nakuru",    parent_id: null, created_at: now },
    { id: uuidv4(), name: "Kilimani",  slug: "kilimani",  parent_id: null, created_at: now },
    { id: uuidv4(), name: "Westlands", slug: "westlands", parent_id: null, created_at: now },
    { id: uuidv4(), name: "Karen",     slug: "karen",     parent_id: null, created_at: now },
    { id: uuidv4(), name: "Lavington", slug: "lavington", parent_id: null, created_at: now },
  ]);

  seedIfEmpty("commission_config", [
    { id: uuidv4(), payment_type: "rental_payment", commission_percentage: 5, fixed_fee: 0, is_active: 1, created_at: now },
    { id: uuidv4(), payment_type: "sale_payment",   commission_percentage: 3, fixed_fee: 0, is_active: 1, created_at: now },
  ]);

  seedIfEmpty("subscription_plans", [
    { id: uuidv4(), name: "Free",        price: 0,     duration_days: 36500, max_listings: 1,   features: JSON.stringify(["1 listing", "Basic visibility"]),                                         is_active: 1, created_at: now },
    { id: uuidv4(), name: "Agent Basic", price: 2500,  duration_days: 30,    max_listings: 10,  features: JSON.stringify(["10 listings", "Featured badge", "Priority support"]),                     is_active: 1, created_at: now },
    { id: uuidv4(), name: "Agent Pro",   price: 5000,  duration_days: 30,    max_listings: 50,  features: JSON.stringify(["50 listings", "Featured badge", "Analytics", "Priority support"]),       is_active: 1, created_at: now },
    { id: uuidv4(), name: "Agency",      price: 15000, duration_days: 30,    max_listings: 999, features: JSON.stringify(["Unlimited listings", "Top placement", "Analytics", "Dedicated support"]), is_active: 1, created_at: now },
  ]);

  // Persist initial state to disk
  _shim._persist();

  console.log("Database initialized ✓");
  return db;
}

// ─── Periodic persistence ─────────────────────────────────────────────────────
// sql.js is an in-memory database. We flush to disk every 30 seconds so that
// data survives restarts. The Railway volume at /data provides durable storage.
const PERSIST_INTERVAL_MS = 30_000;
setInterval(() => {
  if (_shim) {
    try { _shim._persist(); } catch (err) { console.error("DB persist error:", err.message); }
  }
}, PERSIST_INTERVAL_MS);

// Also flush on clean shutdown
function flushAndExit(signal) {
  if (_shim) {
    try { _shim._persist(); console.log("DB flushed to disk."); } catch { /* ignore */ }
  }
  process.exit(0);
}
process.on("SIGTERM", flushAndExit);
process.on("SIGINT",  flushAndExit);

module.exports = db;
module.exports.initDb = initDb;
