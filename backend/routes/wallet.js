const router = require("express").Router();
const db = require("../db/init");
const { requireAuth } = require("../middleware/auth");

// GET /api/wallet
router.get("/", requireAuth, (req, res) => {
  const wallet = db.prepare("SELECT * FROM wallets WHERE user_id = ?").get(req.user.id);
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
});

// GET /api/wallet/transactions
router.get("/transactions", requireAuth, (req, res) => {
  const wallet = db.prepare("SELECT id FROM wallets WHERE user_id = ?").get(req.user.id);
  if (!wallet) return res.json([]);

  const txs = db.prepare(`
    SELECT * FROM wallet_transactions WHERE wallet_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(wallet.id);

  res.json(txs);
});

module.exports = router;
