const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middleware/auth");
const { uploadToCloudinary } = require("../utils/cloudinary");

// Temp storage for multer before Cloudinary upload
const TEMP_DIR = "./uploads/temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only JPG, PNG, and WebP images are allowed"));
  },
});

// POST /api/upload/image
router.post("/image", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    // Try Cloudinary first
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const url = await uploadToCloudinary(req.file.path);
      return res.json({ url });
    }

    // Fallback: serve from local disk
    const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const dest = path.join(UPLOADS_DIR, req.file.filename);
    fs.renameSync(req.file.path, dest);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    res.json({ url: `${baseUrl}/uploads/${req.file.filename}` });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ message: "Upload failed: " + err.message });
  }
});

// POST /api/upload/images (multiple)
router.post("/images", requireAuth, upload.array("images", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No files uploaded" });
  try {
    const urls = [];
    for (const file of req.files) {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        urls.push(await uploadToCloudinary(file.path));
      } else {
        const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const dest = path.join(UPLOADS_DIR, file.filename);
        fs.renameSync(file.path, dest);
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
        urls.push(`${baseUrl}/uploads/${file.filename}`);
      }
    }
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ message: "Upload failed: " + err.message });
  }
});

module.exports = router;
