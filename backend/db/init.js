const { Client, Pool } = require("pg");
const pg = require("pg");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

// Configure type parsers to keep SQLite compatibility
// 20 is BIGINT (returned by COUNT) -> parse as int
pg.types.setTypeParser(20, (val) => (val !== null ? parseInt(val, 10) : null));
// 1700 is NUMERIC -> parse as float
pg.types.setTypeParser(1700, (val) => (val !== null ? parseFloat(val) : null));
// 1114 is TIMESTAMP without timezone -> parse as ISO string
pg.types.setTypeParser(1114, (str) => (str ? new Date(str + "Z").toISOString() : null));
// 1184 is TIMESTAMPTZ -> parse as ISO string
pg.types.setTypeParser(1184, (str) => (str ? new Date(str).toISOString() : null));

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/renthub";

// Parse DB name
let dbName = "renthub";
try {
  const url = new URL(connectionString);
  dbName = url.pathname.substring(1) || "renthub";
} catch (e) {
  const match = connectionString.match(/\/([^/?#]+)(?:\?.*)?$/);
  if (match) dbName = match[1];
}

const pool = new Pool({ connectionString });

async function ensureDatabaseExists() {
  const tempPool = new Pool({ connectionString });
  try {
    const client = await tempPool.connect();
    client.release();
    await tempPool.end();
  } catch (err) {
    await tempPool.end();
    if (err.code === "3D000" || err.message.includes("does not exist")) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      let defaultConnectionString = connectionString;
      try {
        const url = new URL(connectionString);
        url.pathname = "/postgres";
        defaultConnectionString = url.toString();
      } catch (e) {
        defaultConnectionString = connectionString.replace(new RegExp(`/${dbName}(\\?|$)`), "/postgres$1");
      }

      const adminClient = new Client({ connectionString: defaultConnectionString });
      await adminClient.connect();
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      await adminClient.end();
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      throw err;
    }
  }
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          VARCHAR(255) PRIMARY KEY,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      full_name   VARCHAR(255),
      phone       VARCHAR(50),
      avatar_url  TEXT,
      company     VARCHAR(255),
      bio         TEXT,
      website     VARCHAR(255),
      is_agent    INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id         VARCHAR(255) PRIMARY KEY,
      user_id    VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id         VARCHAR(255) PRIMARY KEY,
      user_id    VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      VARCHAR(255) UNIQUE NOT NULL,
      expires_at VARCHAR(255) NOT NULL,
      used       INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS property_categories (
      id         VARCHAR(255) PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      slug       VARCHAR(255) UNIQUE NOT NULL,
      icon       VARCHAR(255),
      parent_id  VARCHAR(255) REFERENCES property_categories(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
      id         VARCHAR(255) PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      slug       VARCHAR(255) UNIQUE NOT NULL,
      parent_id  VARCHAR(255) REFERENCES locations(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS properties (
      id              VARCHAR(255) PRIMARY KEY,
      user_id         VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      title           VARCHAR(255) NOT NULL,
      description     TEXT,
      price           DOUBLE PRECISION NOT NULL,
      currency        VARCHAR(10) DEFAULT 'KES',
      listing_type    VARCHAR(20) NOT NULL CHECK(listing_type IN ('sale','rent')),
      category_id     VARCHAR(255) REFERENCES property_categories(id),
      location_id     VARCHAR(255) REFERENCES locations(id),
      address         TEXT,
      bedrooms        INTEGER,
      bathrooms       INTEGER,
      area_sqft       DOUBLE PRECISION,
      images          TEXT DEFAULT '[]',
      features        TEXT DEFAULT '[]',
      is_featured     INTEGER DEFAULT 0,
      is_new_project  INTEGER DEFAULT 0,
      status          VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('active','pending','sold','rented')),
      latitude        DOUBLE PRECISION,
      longitude       DOUBLE PRECISION,
      view_count      INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS property_views (
      id          VARCHAR(255) PRIMARY KEY,
      property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      user_id     VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      ip_address  VARCHAR(100),
      viewed_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id          VARCHAR(255) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      company     VARCHAR(255),
      email       VARCHAR(255),
      phone       VARCHAR(50),
      logo        TEXT,
      description TEXT,
      is_verified INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id          VARCHAR(255) PRIMARY KEY,
      property_id VARCHAR(255) REFERENCES properties(id) ON DELETE CASCADE,
      agent_id    VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
      reviewer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment     TEXT,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id          VARCHAR(255) PRIMARY KEY,
      user_id     VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, property_id)
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id          VARCHAR(255) PRIMARY KEY,
      property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) NOT NULL,
      phone       VARCHAR(50),
      message     TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id          VARCHAR(255) PRIMARY KEY,
      property_id VARCHAR(255) REFERENCES properties(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id              VARCHAR(255) PRIMARY KEY,
      conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id         VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              VARCHAR(255) PRIMARY KEY,
      conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      content         TEXT NOT NULL,
      is_read         INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id                    VARCHAR(255) PRIMARY KEY,
      user_id               VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      property_id           VARCHAR(255) REFERENCES properties(id) ON DELETE SET NULL,
      phone_number          VARCHAR(50) NOT NULL,
      amount                DOUBLE PRECISION NOT NULL,
      merchant_request_id   VARCHAR(255),
      checkout_request_id   VARCHAR(255),
      mpesa_receipt_number  VARCHAR(100),
      transaction_date      VARCHAR(100),
      status                VARCHAR(50) DEFAULT 'pending',
      result_code           INTEGER,
      result_desc           TEXT,
      created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id          VARCHAR(255) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      price       DOUBLE PRECISION NOT NULL,
      duration_days INTEGER NOT NULL,
      max_listings INTEGER DEFAULT 1,
      features    TEXT DEFAULT '[]',
      is_active   INTEGER DEFAULT 1,
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id          VARCHAR(255) PRIMARY KEY,
      user_id     VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id     VARCHAR(255) NOT NULL REFERENCES subscription_plans(id),
      status      VARCHAR(50) DEFAULT 'active' CHECK(status IN ('active','expired','cancelled')),
      starts_at   VARCHAR(100) NOT NULL,
      expires_at  VARCHAR(100) NOT NULL,
      payment_id  VARCHAR(255) REFERENCES payments(id),
      created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id              VARCHAR(255) PRIMARY KEY,
      user_id         VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance         DOUBLE PRECISION DEFAULT 0,
      locked_balance  DOUBLE PRECISION DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id               VARCHAR(255) PRIMARY KEY,
      wallet_id        VARCHAR(255) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      transaction_type VARCHAR(50) NOT NULL CHECK(transaction_type IN ('credit','debit','escrow_hold','escrow_release')),
      amount           DOUBLE PRECISION NOT NULL,
      description      TEXT,
      reference_id     VARCHAR(255),
      created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS commission_config (
      id                    VARCHAR(255) PRIMARY KEY,
      payment_type          VARCHAR(100) NOT NULL,
      commission_percentage DOUBLE PRECISION DEFAULT 5,
      fixed_fee             DOUBLE PRECISION DEFAULT 0,
      is_active             INTEGER DEFAULT 1,
      created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id         VARCHAR(255) PRIMARY KEY,
      user_id    VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       VARCHAR(255) NOT NULL,
      filters    TEXT NOT NULL,
      notify     INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         VARCHAR(255) PRIMARY KEY,
      user_id    VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       VARCHAR(100) NOT NULL,
      title      VARCHAR(255) NOT NULL,
      message    TEXT NOT NULL,
      link       VARCHAR(255),
      is_read    INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function seedIfEmpty(table, rows) {
  const countRes = await pool.query(`SELECT COUNT(*) as c FROM "${table}"`);
  const count = parseInt(countRes.rows[0].c, 10);
  if (count === 0) {
    const keys = Object.keys(rows[0]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
    const queryStr = `INSERT INTO "${table}" (${keys.join(",")}) VALUES (${placeholders})`;
    for (const r of rows) {
      await pool.query(queryStr, Object.values(r));
    }
    console.log(`  ✓ Seeded ${rows.length} ${table}`);
  }
}

async function seedAdmin() {
  const bcrypt = require("bcryptjs");
  const adminEmail = (process.env.ADMIN_EMAIL || "stephentunu09@gmail.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "nashandsteve77";

  const existingRes = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
  const existing = existingRes.rows[0];
  const ts = new Date().toISOString();

  if (!existing) {
    const adminId = uuidv4();
    const hash = bcrypt.hashSync(adminPassword, 10);
    
    await pool.query("INSERT INTO users (id, email, password, full_name, is_verified, created_at, updated_at) VALUES ($1,$2,$3,$4,1,$5,$6)", 
      [adminId, adminEmail, hash, "Admin", ts, ts]);
    await pool.query("INSERT INTO user_roles (id, user_id, role, created_at) VALUES ($1,$2,'admin',$3)", 
      [uuidv4(), adminId, ts]);
    await pool.query("INSERT INTO wallets (id, user_id, balance, locked_balance, created_at, updated_at) VALUES ($1,$2,0,0,$3,$4)", 
      [uuidv4(), adminId, ts, ts]);
    console.log("  ✓ Admin user seeded:", adminEmail);
  } else {
    const roleRes = await pool.query("SELECT role FROM user_roles WHERE user_id = $1", [existing.id]);
    const roleRow = roleRes.rows[0];
    if (!roleRow) {
      await pool.query("INSERT INTO user_roles (id, user_id, role, created_at) VALUES ($1,$2,'admin',$3)", 
        [uuidv4(), existing.id, ts]);
      console.log("  ✓ Admin role assigned to:", adminEmail);
    } else if (roleRow.role !== "admin") {
      await pool.query("UPDATE user_roles SET role = 'admin' WHERE user_id = $1", [existing.id]);
      console.log("  ✓ Admin role updated for:", adminEmail);
    }
  }
}

const now = new Date().toISOString();

const initPromise = (async () => {
  try {
    await ensureDatabaseExists();
    await createTables();
    
    await seedIfEmpty("property_categories", [
      { id: uuidv4(), name: "Houses",     slug: "houses",     icon: "home",     parent_id: null, created_at: now },
      { id: uuidv4(), name: "Apartments", slug: "apartments", icon: "building", parent_id: null, created_at: now },
      { id: uuidv4(), name: "Land",       slug: "land",       icon: "map",      parent_id: null, created_at: now },
      { id: uuidv4(), name: "Commercial", slug: "commercial", icon: "store",    parent_id: null, created_at: now },
    ]);

    await seedIfEmpty("locations", [
      { id: uuidv4(), name: "Nairobi",   slug: "nairobi",   parent_id: null, created_at: now },
      { id: uuidv4(), name: "Mombasa",   slug: "mombasa",   parent_id: null, created_at: now },
      { id: uuidv4(), name: "Kisumu",    slug: "kisumu",    parent_id: null, created_at: now },
      { id: uuidv4(), name: "Nakuru",    slug: "nakuru",    parent_id: null, created_at: now },
      { id: uuidv4(), name: "Kilimani",  slug: "kilimani",  parent_id: null, created_at: now },
      { id: uuidv4(), name: "Westlands", slug: "westlands", parent_id: null, created_at: now },
      { id: uuidv4(), name: "Karen",     slug: "karen",     parent_id: null, created_at: now },
      { id: uuidv4(), name: "Lavington", slug: "lavington", parent_id: null, created_at: now },
    ]);

    await seedIfEmpty("commission_config", [
      { id: uuidv4(), payment_type: "rental_payment", commission_percentage: 5, fixed_fee: 0, is_active: 1, created_at: now },
      { id: uuidv4(), payment_type: "sale_payment",   commission_percentage: 3, fixed_fee: 0, is_active: 1, created_at: now },
    ]);

    await seedIfEmpty("subscription_plans", [
      { id: uuidv4(), name: "Free",        price: 0,     duration_days: 36500, max_listings: 1,   features: JSON.stringify(["1 listing", "Basic visibility"]),                                         is_active: 1, created_at: now },
      { id: uuidv4(), name: "Agent Basic", price: 2500,  duration_days: 30,    max_listings: 10,  features: JSON.stringify(["10 listings", "Featured badge", "Priority support"]),                     is_active: 1, created_at: now },
      { id: uuidv4(), name: "Agent Pro",   price: 5000,  duration_days: 30,    max_listings: 50,  features: JSON.stringify(["50 listings", "Featured badge", "Analytics", "Priority support"]),       is_active: 1, created_at: now },
      { id: uuidv4(), name: "Agency",      price: 15000, duration_days: 30,    max_listings: 999, features: JSON.stringify(["Unlimited listings", "Top placement", "Analytics", "Dedicated support"]), is_active: 1, created_at: now },
    ]);

    await seedAdmin();
    console.log("Database initialized ✓");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  }
})();

const db = {
  pool,
  prepare(sql) {
    let paramCount = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramCount++}`);

    return {
      async get(...params) {
        await initPromise;
        const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = await pool.query(pgSql, args);
        return res.rows[0] || null;
      },
      async all(...params) {
        await initPromise;
        const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = await pool.query(pgSql, args);
        return res.rows;
      },
      async run(...params) {
        await initPromise;
        const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = await pool.query(pgSql, args);
        return {
          changes: res.rowCount,
          lastInsertRowid: null,
        };
      },
    };
  },
  async exec(sql) {
    await initPromise;
    return pool.query(sql);
  },
};

module.exports = db;
