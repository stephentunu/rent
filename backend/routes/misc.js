const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { requireAuth, requireAdmin, optionalAuth } = require("../middleware/auth");
const { sendNewInquiry } = require("../utils/email");

// ─── Categories ───────────────────────────────────────────────────────────────
router.get("/categories", (req, res) => res.json(db.prepare("SELECT * FROM property_categories ORDER BY name").all()));

// ─── Locations ────────────────────────────────────────────────────────────────
router.get("/locations", (req, res) => res.json(db.prepare("SELECT * FROM locations ORDER BY name").all()));

// ─── Agents ───────────────────────────────────────────────────────────────────
router.get("/agents", (req, res) => {
  const agents = db.prepare(`
    SELECT u.id, u.full_name as name, u.company, u.email, u.phone, u.avatar_url as logo,
      u.bio as description, u.is_verified, u.website, u.created_at,
      COUNT(p.id) as listing_count,
      ROUND(AVG(r.rating), 1) as avg_rating, COUNT(r.id) as review_count
    FROM users u
    LEFT JOIN properties p ON p.user_id = u.id AND p.status = 'active'
    LEFT JOIN reviews r ON r.agent_id = u.id
    WHERE u.is_agent = 1
    GROUP BY u.id ORDER BY u.is_verified DESC, u.full_name ASC
  `).all();
  res.json(agents.map(a => ({ ...a, is_verified: !!a.is_verified })));
});

router.get("/agents/:id", (req, res) => {
  const agent = db.prepare(`
    SELECT u.id, u.full_name as name, u.company, u.email, u.phone, u.avatar_url as logo,
      u.bio as description, u.is_verified, u.website, u.created_at
    FROM users u WHERE u.id = ? AND u.is_agent = 1
  `).get(req.params.id);
  if (!agent) return res.status(404).json({ message: "Agent not found" });

  const listings = db.prepare(`
    SELECT p.*, c.name as category_name, l.name as location_name
    FROM properties p
    LEFT JOIN property_categories c ON c.id = p.category_id
    LEFT JOIN locations l ON l.id = p.location_id
    WHERE p.user_id = ? AND p.status = 'active' ORDER BY p.created_at DESC
  `).all(req.params.id);

  const reviews = db.prepare(`
    SELECT r.*, u.full_name, u.avatar_url FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    WHERE r.agent_id = ? ORDER BY r.created_at DESC LIMIT 10
  `).all(req.params.id);

  const stats = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE agent_id = ?").get(req.params.id);

  res.json({
    ...agent, is_verified: !!agent.is_verified,
    listings: listings.map(p => ({
      ...p, images: JSON.parse(p.images || "[]"), features: JSON.parse(p.features || "[]"),
      is_featured: !!p.is_featured, is_new_project: !!p.is_new_project,
      category: p.category_id ? { id: p.category_id, name: p.category_name } : null,
      location: p.location_id ? { id: p.location_id, name: p.location_name } : null,
    })),
    reviews, avg_rating: stats.avg ? Number(stats.avg).toFixed(1) : null, review_count: stats.count,
  });
});

router.put("/agents/:id/verify", requireAdmin, (req, res) => {
  const { is_verified } = req.body;
  const user = db.prepare("SELECT id, is_agent FROM users WHERE id = ?").get(req.params.id);
  if (!user || !user.is_agent) return res.status(404).json({ message: "Agent not found" });
  db.prepare("UPDATE users SET is_verified=?, updated_at=? WHERE id=?").run(is_verified ? 1 : 0, new Date().toISOString(), req.params.id);
  res.json({ message: is_verified ? "Agent verified" : "Agent unverified" });
});

// POST /api/agents/:id/reviews
router.post("/agents/:id/reviews", requireAuth, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating 1-5 required" });
  if (req.params.id === req.user.id) return res.status(400).json({ message: "Cannot review yourself" });
  const existing = db.prepare("SELECT id FROM reviews WHERE agent_id=? AND reviewer_id=?").get(req.params.id, req.user.id);
  if (existing) return res.status(409).json({ message: "Already reviewed" });
  db.prepare("INSERT INTO reviews (id, agent_id, reviewer_id, rating, comment, created_at) VALUES (?,?,?,?,?,?)")
    .run(uuidv4(), req.params.id, req.user.id, rating, comment || null, new Date().toISOString());
  res.status(201).json({ message: "Review submitted" });
});

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  const properties = db.prepare("SELECT COUNT(*) as c FROM properties WHERE status='active'").get().c;
  const agents     = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_agent=1").get().c;
  const locations  = db.prepare("SELECT COUNT(*) as c FROM locations").get().c;
  res.json({ properties, agents, locations });
});

// ─── Favorites ────────────────────────────────────────────────────────────────
router.get("/favorites", requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT p.* FROM favorites f JOIN properties p ON p.id=f.property_id WHERE f.user_id=? ORDER BY f.created_at DESC`).all(req.user.id);
  res.json(rows.map(p => ({
    ...p, images: JSON.parse(p.images||"[]"), features: JSON.parse(p.features||"[]"),
    is_featured: !!p.is_featured, is_new_project: !!p.is_new_project,
    category: p.category_id ? db.prepare("SELECT * FROM property_categories WHERE id=?").get(p.category_id) : null,
    location: p.location_id ? db.prepare("SELECT * FROM locations WHERE id=?").get(p.location_id) : null,
  })));
});

router.get("/favorites/:propertyId", requireAuth, (req, res) => {
  const row = db.prepare("SELECT id FROM favorites WHERE user_id=? AND property_id=?").get(req.user.id, req.params.propertyId);
  res.json({ isFavorited: !!row });
});

router.post("/favorites", requireAuth, (req, res) => {
  const { property_id } = req.body;
  if (!property_id) return res.status(400).json({ message: "property_id required" });
  const existing = db.prepare("SELECT id FROM favorites WHERE user_id=? AND property_id=?").get(req.user.id, property_id);
  if (existing) return res.status(409).json({ message: "Already favorited" });
  db.prepare("INSERT INTO favorites (id,user_id,property_id,created_at) VALUES (?,?,?,?)").run(uuidv4(), req.user.id, property_id, new Date().toISOString());
  res.status(201).send();
});

router.delete("/favorites/:propertyId", requireAuth, (req, res) => {
  db.prepare("DELETE FROM favorites WHERE user_id=? AND property_id=?").run(req.user.id, req.params.propertyId);
  res.status(204).send();
});

// ─── Inquiries ────────────────────────────────────────────────────────────────
router.post("/inquiries", async (req, res) => {
  const { property_id, name, email, phone, message } = req.body;
  if (!property_id || !name || !email || !message) return res.status(400).json({ message: "property_id, name, email, message required" });

  db.prepare("INSERT INTO inquiries (id,property_id,name,email,phone,message,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(uuidv4(), property_id, name, email, phone||null, message, new Date().toISOString());

  // Notify property owner
  const prop = db.prepare("SELECT * FROM properties WHERE id=?").get(property_id);
  if (prop?.user_id) {
    const owner = db.prepare("SELECT email, full_name FROM users WHERE id=?").get(prop.user_id);
    if (owner) sendNewInquiry(owner.email, owner.full_name, prop.title, name, email, phone, message).catch(() => {});

    db.prepare("INSERT INTO notifications (id,user_id,type,title,message,link,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(uuidv4(), prop.user_id, "new_inquiry", "New Inquiry!", `${name} is interested in "${prop.title}"`, `/property/${property_id}`, new Date().toISOString());
  }

  res.status(201).send();
});

router.get("/inquiries", requireAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  res.json(db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all());
});

// ─── Notifications ────────────────────────────────────────────────────────────
router.get("/notifications", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20").all(req.user.id));
});

router.put("/notifications/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").run(req.user.id);
  res.json({ message: "All marked as read" });
});

router.put("/notifications/:id/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?").run(req.params.id, req.user.id);
  res.status(204).send();
});

// ─── Subscription plans ───────────────────────────────────────────────────────
router.get("/plans", (req, res) => {
  const plans = db.prepare("SELECT * FROM subscription_plans WHERE is_active=1 ORDER BY price ASC").all();
  res.json(plans.map(p => ({ ...p, features: JSON.parse(p.features || "[]") })));
});

// ─── Saved searches ───────────────────────────────────────────────────────────
router.get("/saved-searches", requireAuth, (req, res) => {
  const searches = db.prepare("SELECT * FROM saved_searches WHERE user_id=? ORDER BY created_at DESC").all(req.user.id);
  res.json(searches.map(s => ({ ...s, filters: JSON.parse(s.filters) })));
});

router.post("/saved-searches", requireAuth, (req, res) => {
  const { name, filters, notify } = req.body;
  if (!name || !filters) return res.status(400).json({ message: "name and filters required" });
  db.prepare("INSERT INTO saved_searches (id,user_id,name,filters,notify,created_at) VALUES (?,?,?,?,?,?)")
    .run(uuidv4(), req.user.id, name, JSON.stringify(filters), notify !== false ? 1 : 0, new Date().toISOString());
  res.status(201).json({ message: "Search saved" });
});

router.delete("/saved-searches/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM saved_searches WHERE id=? AND user_id=?").run(req.params.id, req.user.id);
  res.status(204).send();
});

module.exports = router;
