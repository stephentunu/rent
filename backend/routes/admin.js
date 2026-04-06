const router = require("express").Router();
const db = require("../db/init");
const { requireAdmin } = require("../middleware/auth");

function parseProperty(p) {
  if (!p) return null;
  return {
    ...p,
    images: JSON.parse(p.images || "[]"),
    features: JSON.parse(p.features || "[]"),
    is_featured: !!p.is_featured,
    is_new_project: !!p.is_new_project,
    category: p.category_id ? db.prepare("SELECT * FROM property_categories WHERE id = ?").get(p.category_id) : null,
    location: p.location_id ? db.prepare("SELECT * FROM locations WHERE id = ?").get(p.location_id) : null,
  };
}

// GET /api/admin/check
router.get("/check", requireAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

// GET /api/admin/profiles
router.get("/profiles", requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, email, full_name, phone, avatar_url, company, is_agent, is_verified, created_at FROM users ORDER BY created_at DESC").all();
  res.json(users.map((u) => ({ ...u, user_id: u.id, is_agent: !!u.is_agent, is_verified: !!u.is_verified })));
});

// GET /api/admin/agents — all users who are agents (for admin management)
router.get("/agents", requireAdmin, (req, res) => {
  const agents = db.prepare(`
    SELECT
      u.id, u.full_name as name, u.email, u.phone, u.company,
      u.avatar_url as logo, u.bio as description,
      u.is_verified, u.website, u.created_at,
      COUNT(p.id) as listing_count
    FROM users u
    LEFT JOIN properties p ON p.user_id = u.id AND p.status = 'active'
    WHERE u.is_agent = 1
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(agents.map(a => ({ ...a, is_verified: !!a.is_verified })));
});

// PUT /api/admin/agents/:id/verify — verify or unverify an agent
router.put("/agents/:id/verify", requireAdmin, (req, res) => {
  const { is_verified } = req.body;
  db.prepare("UPDATE users SET is_verified = ?, updated_at = ? WHERE id = ? AND is_agent = 1")
    .run(is_verified ? 1 : 0, new Date().toISOString(), req.params.id);
  res.json({ message: is_verified ? "Agent verified successfully" : "Agent verification removed" });
});

// GET /api/admin/properties
router.get("/properties", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM properties ORDER BY created_at DESC").all();
  res.json(rows.map(parseProperty));
});

// GET /api/admin/payments
router.get("/payments", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM payments ORDER BY created_at DESC").all());
});

// GET /api/admin/inquiries
router.get("/inquiries", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all());
});

// GET /api/admin/user-roles
router.get("/user-roles", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM user_roles ORDER BY created_at DESC").all());
});

// GET /api/admin/wallets
router.get("/wallets", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM wallets ORDER BY created_at DESC").all());
});

// GET /api/admin/wallet-transactions
router.get("/wallet-transactions", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 100").all());
});

// GET /api/admin/commission-config
router.get("/commission-config", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM commission_config ORDER BY created_at DESC").all());
});

module.exports = router;
