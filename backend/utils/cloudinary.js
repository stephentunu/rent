const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(filePath, folder = "renthub/properties") {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    transformation: [
      { width: 1200, height: 900, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
  // Clean up local temp file
  try { fs.unlinkSync(filePath); } catch {}
  return result.secure_url;
}

async function deleteFromCloudinary(url) {
  try {
    const publicId = url.split("/").slice(-2).join("/").replace(/\.[^.]+$/, "");
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
