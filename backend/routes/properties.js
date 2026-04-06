const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { requireAuth, requireAdmin, optionalAuth } = require("../middleware/auth");
const { sendPropertyApproved, sendNewInquiry } = require("../utils/email");

function parseProperty(p) {
  if (!p) return null;
  const category = p.category_id ? db.prepare("SELECT * FROM property_categories WHERE id = ?").get(p.category_id) : null;
  const location = p.location_id ? db.prepare("SELECT * FROM locations WHERE id = ?").get(p.location_id) : null;
  const owner = p.user_id ? db.prepare("SELECT id, full_name, email, phone, avatar_url, company, is_agent, is_verified FROM users WHERE id = ?").get(p.user_id) : null;
  const avgRating = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE property_id = ?").get(p.id);
  return {
    ...p,
    images: JSON.parse(p.images || "[]"),
    features: JSON.parse(p.features || "[]"),
    is_featured: !!p.is_featured,
    is_new_project: !!p.is_new_project,
    category, location,
    owner: owner ? { ...owner, is_agent: !!owner.is_agent, is_verified: !!owner.is_verified } : null,
    avg_rating: avgRating.avg ? Number(avgRating.avg).toFixed(1) : null,
    review_count: avgRating.count,
  };
}

// GET /api/properties
router.get("/", optionalAuth, (req, res) => {
  const { listing_type, category_id, location_id, is_featured, is_new_project, limit, ids } = req.query;

  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    const rows = db.prepare(`SELECT * FROM properties WHERE id IN (${idList.map(() => "?").join(",")})`).all(...idList);
    return res.json(rows.map(parseProperty));
  }

  let query = "SELECT * FROM properties WHERE status = 'active'";
  const params = [];
  if (listing_type) { query += " AND listing_type = ?"; params.push(listing_type); }
  if (category_id)  { query += " AND category_id = ?";  params.push(category_id); }
  if (location_id)  { query += " AND location_id = ?";  params.push(location_id); }
  if (is_featured)  { query += " AND is_featured = 1"; }
  if (is_new_project) { query += " AND is_new_project = 1"; }
  query += " ORDER BY is_featured DESC, created_at DESC";
  if (limit) { query += " LIMIT ?"; params.push(Number(limit)); }

  res.json(db.prepare(query).all(...params).map(parseProperty));
});

// GET /api/properties/mine
router.get("/mine", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id).map(parseProperty));
});

// GET /api/properties/:id
router.get("/:id", optionalAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ message: "Property not found" });

  // Track view
  const now = new Date().toISOString();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userId = req.user?.id || null;

  // Only count unique views per user/ip per 24h
  const recentView = userId
    ? db.prepare("SELECT id FROM property_views WHERE property_id=? AND user_id=? AND viewed_at > datetime('now','-1 day')").get(req.params.id, userId)
    : db.prepare("SELECT id FROM property_views WHERE property_id=? AND ip_address=? AND viewed_at > datetime('now','-1 day')").get(req.params.id, ip);

  if (!recentView) {
    db.prepare("INSERT INTO property_views (id, property_id, user_id, ip_address, viewed_at) VALUES (?,?,?,?,?)").run(uuidv4(), req.params.id, userId, ip, now);
    db.prepare("UPDATE properties SET view_count = view_count + 1 WHERE id = ?").run(req.params.id);
  }

  res.json(parseProperty(db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id)));
});

// POST /api/properties
router.post("/", requireAuth, (req, res) => {
  const { title, description, price, listing_type, category_id, location_id, address, bedrooms, bathrooms, area_sqft, images, features, status, latitude, longitude } = req.body;
  if (!title || !price || !listing_type) return res.status(400).json({ message: "title, price and listing_type are required" });

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO properties (id,user_id,title,description,price,listing_type,category_id,location_id,address,bedrooms,bathrooms,area_sqft,images,features,status,latitude,longitude,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, title, description||null, price, listing_type, category_id||null, location_id||null, address||null, bedrooms||null, bathrooms||null, area_sqft||null, JSON.stringify(images||[]), JSON.stringify(features||[]), status||"pending", latitude||null, longitude||null, now, now);

  res.status(201).json(parseProperty(db.prepare("SELECT * FROM properties WHERE id = ?").get(id)));
});

// PUT /api/properties/:id
router.put("/:id", requireAuth, (req, res) => {
  const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!prop) return res.status(404).json({ message: "Property not found" });
  if (prop.user_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  const fields = ["title","description","price","listing_type","category_id","location_id","address","bedrooms","bathrooms","area_sqft","images","features","status","latitude","longitude"];
  const updates = []; const values = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === "images" || f === "features" ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ message: "No fields to update" });
  updates.push("updated_at = ?"); values.push(new Date().toISOString(), req.params.id);
  db.prepare(`UPDATE properties SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  res.json(parseProperty(db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id)));
});

// DELETE /api/properties/:id
router.delete("/:id", requireAuth, (req, res) => {
  const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!prop) return res.status(404).json({ message: "Property not found" });
  if (prop.user_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  db.prepare("DELETE FROM properties WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// PUT /api/properties/:id/approve
router.put("/:id/approve", requireAdmin, async (req, res) => {
  const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!prop) return res.status(404).json({ message: "Not found" });
  db.prepare("UPDATE properties SET status='active', updated_at=? WHERE id=?").run(new Date().toISOString(), req.params.id);

  // Notify owner
  if (prop.user_id) {
    const owner = db.prepare("SELECT email, full_name FROM users WHERE id = ?").get(prop.user_id);
    if (owner) sendPropertyApproved(owner.email, owner.full_name, prop.title, prop.id).catch(() => {});
  }

  // Create notification
  if (prop.user_id) {
    db.prepare("INSERT INTO notifications (id, user_id, type, title, message, link, created_at) VALUES (?,?,?,?,?,?,?)")
      .run(uuidv4(), prop.user_id, "property_approved", "Listing Approved!", `Your property "${prop.title}" is now live.`, `/property/${prop.id}`, new Date().toISOString());
  }

  res.json(parseProperty(db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id)));
});

// PUT /api/properties/:id/featured
router.put("/:id/featured", requireAdmin, (req, res) => {
  const { is_featured } = req.body;
  db.prepare("UPDATE properties SET is_featured=?, updated_at=? WHERE id=?").run(is_featured ? 1 : 0, new Date().toISOString(), req.params.id);
  res.json(parseProperty(db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id)));
});

// GET /api/properties/:id/analytics (owner only)
router.get("/:id/analytics", requireAuth, (req, res) => {
  const prop = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!prop) return res.status(404).json({ message: "Not found" });
  if (prop.user_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  const viewsToday = db.prepare("SELECT COUNT(*) as c FROM property_views WHERE property_id=? AND viewed_at > datetime('now','-1 day')").get(req.params.id).c;
  const viewsWeek  = db.prepare("SELECT COUNT(*) as c FROM property_views WHERE property_id=? AND viewed_at > datetime('now','-7 days')").get(req.params.id).c;
  const favorites  = db.prepare("SELECT COUNT(*) as c FROM favorites WHERE property_id=?").get(req.params.id).c;
  const inquiries  = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE property_id=?").get(req.params.id).c;

  res.json({ total_views: prop.view_count || 0, views_today: viewsToday, views_week: viewsWeek, favorites, inquiries });
});

// GET /api/properties/:id/reviews
router.get("/:id/reviews", (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.full_name, u.avatar_url FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    WHERE r.property_id = ? ORDER BY r.created_at DESC
  `).all(req.params.id);
  res.json(reviews);
});

// POST /api/properties/:id/reviews
router.post("/:id/reviews", requireAuth, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be between 1 and 5" });

  const existing = db.prepare("SELECT id FROM reviews WHERE property_id=? AND reviewer_id=?").get(req.params.id, req.user.id);
  if (existing) return res.status(409).json({ message: "You have already reviewed this property" });

  db.prepare("INSERT INTO reviews (id, property_id, reviewer_id, rating, comment, created_at) VALUES (?,?,?,?,?,?)")
    .run(uuidv4(), req.params.id, req.user.id, rating, comment || null, new Date().toISOString());

  res.status(201).json({ message: "Review submitted" });
});

module.exports = router;
