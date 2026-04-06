const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../db/init");
const { requireAuth } = require("../middleware/auth");
const { sendNewMessage } = require("../utils/email");

const MESSAGE_LIMIT = 50; // Auto-clear after this many messages per conversation

// ─── Helper: enrich conversation with participants, last message, unread ──────
function enrichConversation(conv, userId) {
  const participants = db.prepare(`
    SELECT cp.user_id, u.full_name, u.avatar_url
    FROM conversation_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.conversation_id=? AND cp.user_id!=?
  `).all(conv.id, userId).map(p => ({
    user_id: p.user_id,
    profile: { full_name: p.full_name, avatar_url: p.avatar_url },
  }));

  const last_message = db.prepare(
    "SELECT content,created_at,sender_id FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1"
  ).get(conv.id) || null;

  const unread_count = db.prepare(
    "SELECT COUNT(*) as c FROM messages WHERE conversation_id=? AND sender_id!=? AND is_read=0"
  ).get(conv.id, userId).c;

  const total_messages = db.prepare(
    "SELECT COUNT(*) as c FROM messages WHERE conversation_id=?"
  ).get(conv.id).c;

  const property = conv.property_id ? (() => {
    const p = db.prepare("SELECT id,title,images FROM properties WHERE id=?").get(conv.property_id);
    if (p) { try { p.images = JSON.parse(p.images || "[]"); } catch { p.images = []; } }
    return p;
  })() : null;

  return { ...conv, participants, last_message, unread_count, total_messages, property };
}

// ─── Auto-clear: delete oldest messages once conversation exceeds the limit ───
function autoCleanMessages(conversationId) {
  const total = db.prepare(
    "SELECT COUNT(*) as c FROM messages WHERE conversation_id=?"
  ).get(conversationId).c;

  if (total >= MESSAGE_LIMIT) {
    // Delete ALL messages in this conversation — it resets to empty
    db.prepare("DELETE FROM messages WHERE conversation_id=?").run(conversationId);

    // Insert a system notice so users know what happened
    db.prepare(
      "INSERT INTO messages (id,conversation_id,sender_id,content,is_read,created_at) VALUES (?,?,null,?,1,?)"
    ).run(
      uuidv4(),
      conversationId,
      `--- Conversation cleared after ${MESSAGE_LIMIT} messages. Starting fresh. ---`,
      new Date().toISOString()
    );

    return true; // Cleared
  }

  return false; // Not cleared
}

// ─── GET /api/conversations ───────────────────────────────────────────────────
router.get("/", requireAuth, (req, res) => {
  const convIds = db.prepare(
    "SELECT conversation_id FROM conversation_participants WHERE user_id=?"
  ).all(req.user.id).map(r => r.conversation_id);

  if (!convIds.length) return res.json([]);

  const rows = db.prepare(
    `SELECT * FROM conversations WHERE id IN (${convIds.map(() => "?").join(",")}) ORDER BY updated_at DESC`
  ).all(...convIds);

  res.json(rows.map(c => enrichConversation(c, req.user.id)));
});

// ─── GET /api/conversations/unread-count ──────────────────────────────────────
router.get("/unread-count", requireAuth, (req, res) => {
  const convIds = db.prepare(
    "SELECT conversation_id FROM conversation_participants WHERE user_id=?"
  ).all(req.user.id).map(r => r.conversation_id);

  if (!convIds.length) return res.json({ count: 0 });

  const count = db.prepare(
    `SELECT COUNT(*) as c FROM messages
     WHERE conversation_id IN (${convIds.map(() => "?").join(",")})
     AND sender_id!=? AND is_read=0`
  ).get(...convIds, req.user.id).c;

  res.json({ count });
});

// ─── POST /api/conversations ──────────────────────────────────────────────────
router.post("/", requireAuth, (req, res) => {
  const { property_id, owner_id } = req.body;
  if (!owner_id) return res.status(400).json({ message: "owner_id required" });
  if (owner_id === req.user.id) return res.status(400).json({ message: "Cannot message yourself" });

  const realPropertyId = (property_id && property_id !== "general") ? property_id : null;

  // Return existing conversation if one already exists
  if (realPropertyId) {
    const existing = db.prepare(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id=c.id AND cp1.user_id=?
      JOIN conversation_participants cp2 ON cp2.conversation_id=c.id AND cp2.user_id=?
      WHERE c.property_id=? LIMIT 1
    `).get(req.user.id, owner_id, realPropertyId);

    if (existing) {
      return res.json(enrichConversation(
        db.prepare("SELECT * FROM conversations WHERE id=?").get(existing.id),
        req.user.id
      ));
    }
  } else {
    // For general conversations, check if a non-property conversation already exists
    const existing = db.prepare(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id=c.id AND cp1.user_id=?
      JOIN conversation_participants cp2 ON cp2.conversation_id=c.id AND cp2.user_id=?
      WHERE c.property_id IS NULL LIMIT 1
    `).get(req.user.id, owner_id);

    if (existing) {
      return res.json(enrichConversation(
        db.prepare("SELECT * FROM conversations WHERE id=?").get(existing.id),
        req.user.id
      ));
    }
  }

  // Create new conversation
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO conversations (id,property_id,created_at,updated_at) VALUES (?,?,?,?)")
    .run(id, realPropertyId, now, now);
  db.prepare("INSERT INTO conversation_participants (id,conversation_id,user_id) VALUES (?,?,?)")
    .run(uuidv4(), id, req.user.id);
  db.prepare("INSERT INTO conversation_participants (id,conversation_id,user_id) VALUES (?,?,?)")
    .run(uuidv4(), id, owner_id);

  res.status(201).json(enrichConversation(
    db.prepare("SELECT * FROM conversations WHERE id=?").get(id),
    req.user.id
  ));
});

// ─── GET /api/conversations/:id/messages ─────────────────────────────────────
router.get("/:id/messages", requireAuth, (req, res) => {
  const participant = db.prepare(
    "SELECT id FROM conversation_participants WHERE conversation_id=? AND user_id=?"
  ).get(req.params.id, req.user.id);
  if (!participant) return res.status(403).json({ message: "Not a participant" });

  const messages = db.prepare(`
    SELECT m.*, u.full_name, u.avatar_url
    FROM messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id=?
    ORDER BY m.created_at ASC
  `).all(req.params.id);

  // Also return how many messages are in this conversation so the frontend
  // can warn the user how close they are to the 50-message limit
  const total = messages.length;

  res.json({
    messages: messages.map(m => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      content: m.content,
      is_read: !!m.is_read,
      created_at: m.created_at,
      sender: m.sender_id ? { full_name: m.full_name, avatar_url: m.avatar_url } : null,
    })),
    total,
    limit: MESSAGE_LIMIT,
    remaining: Math.max(0, MESSAGE_LIMIT - total),
  });
});

// ─── POST /api/conversations/:id/messages ────────────────────────────────────
router.post("/:id/messages", requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: "content required" });

  const participant = db.prepare(
    "SELECT id FROM conversation_participants WHERE conversation_id=? AND user_id=?"
  ).get(req.params.id, req.user.id);
  if (!participant) return res.status(403).json({ message: "Not a participant" });

  // ── Auto-clean BEFORE inserting the new message ───────────────────────────
  // Check current count. If we're AT the limit, clear first then allow new message.
  autoCleanMessages(req.params.id);

  const msgId = uuidv4();
  const now   = new Date().toISOString();

  db.prepare(
    "INSERT INTO messages (id,conversation_id,sender_id,content,is_read,created_at) VALUES (?,?,?,?,0,?)"
  ).run(msgId, req.params.id, req.user.id, content.trim(), now);

  db.prepare("UPDATE conversations SET updated_at=? WHERE id=?").run(now, req.params.id);

  // ── Notify the other participant ──────────────────────────────────────────
  const other = db.prepare(`
    SELECT cp.user_id, u.email, u.full_name
    FROM conversation_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.conversation_id=? AND cp.user_id!=?
  `).get(req.params.id, req.user.id);

  const sender = db.prepare("SELECT full_name FROM users WHERE id=?").get(req.user.id);
  const conv   = db.prepare("SELECT property_id FROM conversations WHERE id=?").get(req.params.id);
  const prop   = conv?.property_id
    ? db.prepare("SELECT title FROM properties WHERE id=?").get(conv.property_id)
    : null;

  if (other?.user_id) {
    sendNewMessage(
      other.email,
      other.full_name,
      sender?.full_name || "Someone",
      prop?.title || null
    ).catch(() => {});

    try {
      db.prepare(
        "INSERT INTO notifications (id,user_id,type,title,message,link,created_at) VALUES (?,?,?,?,?,?,?)"
      ).run(
        uuidv4(),
        other.user_id,
        "new_message",
        `Message from ${sender?.full_name || "Someone"}`,
        content.trim().slice(0, 80),
        "/messages",
        now
      );
    } catch (err) {
      console.error("Notification insert error:", err.message);
    }
  }

  // Return the new message along with updated counts
  const total = db.prepare(
    "SELECT COUNT(*) as c FROM messages WHERE conversation_id=?"
  ).get(req.params.id).c;

  res.status(201).json({
    message: db.prepare("SELECT * FROM messages WHERE id=?").get(msgId),
    total,
    limit: MESSAGE_LIMIT,
    remaining: Math.max(0, MESSAGE_LIMIT - total),
  });
});

// ─── PUT /api/conversations/:id/read ─────────────────────────────────────────
router.put("/:id/read", requireAuth, (req, res) => {
  db.prepare(
    "UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id!=? AND is_read=0"
  ).run(req.params.id, req.user.id);
  res.status(204).send();
});

module.exports = router;
