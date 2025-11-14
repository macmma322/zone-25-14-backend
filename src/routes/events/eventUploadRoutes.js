// src/routes/events/eventUploadRoutes.js
const express = require("express");
const router = express.Router();
const { uploadMedia } = require("../../middleware/uploadMiddleware");
const {
  compressImage,
  scanWithClamAV,
} = require("../../services/mediaProcessor");
const { protectRoute } = require("../../middleware/authMiddleware");
const { requireAnyRole } = require("../../middleware/adminMiddleware");
const path = require("path");
const fsPromises = require("fs/promises");
const sharp = require("sharp");

// src/routes/events/eventUploadRoutes.js
router.post(
  "/upload-banner",
  protectRoute,
  requireAnyRole(["Hype Lead", "Founder"]),
  (req, res, next) => {
    uploadMedia.single("file")(req, res, function (err) {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large. Max 50MB." });
      }
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(500).json({ error: "Upload failed." });
      }
      next();
    });
  },
  async (req, res) => {
    console.log("📁 Event banner upload request received");

    if (!req.file) {
      console.error("❌ No file in request");
      return res.status(400).json({ error: "No file uploaded." });
    }

    const originalMulterTempPath = req.file.path;
    const mime = req.file.mimetype;

    console.log("📎 File received:", {
      path: originalMulterTempPath,
      mime,
      size: req.file.size,
    });

    if (!mime.startsWith("image/")) {
      try {
        await fsPromises.unlink(originalMulterTempPath);
      } catch {}
      return res
        .status(400)
        .json({ error: "Only images are allowed for event banners." });
    }

    const eventBannerTargetDir = path.join("uploads", "event_banners");
    const eventThumbnailTargetDir = path.join("uploads", "event_thumbnails");

    try {
      await fsPromises.mkdir(eventBannerTargetDir, { recursive: true });
      await fsPromises.mkdir(eventThumbnailTargetDir, { recursive: true });

      console.log("🔍 Scanning file with ClamAV...");
      await scanWithClamAV(originalMulterTempPath);

      let finalBannerPath;
      let finalThumbnailPath;
      const timestamp = Date.now();

      if (mime === "image/gif") {
        // For GIF, keep as-is
        const originalExt = path.extname(originalMulterTempPath);
        const newFileName = `banner-${timestamp}${originalExt}`;
        finalBannerPath = path.join(eventBannerTargetDir, newFileName);

        await fsPromises.copyFile(originalMulterTempPath, finalBannerPath);
        console.log("🟡 GIF banner saved:", finalBannerPath);

        // ✅ Generate thumbnail from the GIF banner
        const thumbnailFileName = `thumb-${timestamp}.webp`;
        finalThumbnailPath = path.join(
          eventThumbnailTargetDir,
          thumbnailFileName
        );

        await sharp(finalBannerPath)
          .resize(400, 225, { fit: "cover", position: "center" })
          .webp({ quality: 70 })
          .toFile(finalThumbnailPath);

        console.log("🖼️ Thumbnail generated from GIF:", finalThumbnailPath);

        await fsPromises.unlink(originalMulterTempPath);
      } else {
        // ✅ Compress to WebP for banner (this is the cropped image)
        console.log("🔄 Compressing banner...");
        finalBannerPath = await compressImage(
          originalMulterTempPath,
          eventBannerTargetDir
        );
        console.log("✅ Banner compressed:", finalBannerPath);

        // ✅ Generate thumbnail from the COMPRESSED BANNER (not original temp file)
        const thumbnailFileName = `thumb-${timestamp}.webp`;
        finalThumbnailPath = path.join(
          eventThumbnailTargetDir,
          thumbnailFileName
        );

        // ✅ KEY CHANGE: Use finalBannerPath (compressed/cropped) instead of originalMulterTempPath
        await sharp(finalBannerPath)
          .resize(400, 225, { fit: "cover", position: "center" })
          .webp({ quality: 60 })
          .toFile(finalThumbnailPath);

        console.log("🖼️ Thumbnail generated from banner:", finalThumbnailPath);
      }

      const bannerUrl = `/${finalBannerPath.replace(/\\/g, "/")}`;
      const thumbnailUrl = `/${finalThumbnailPath.replace(/\\/g, "/")}`;

      console.log("✅ Upload complete:", { bannerUrl, thumbnailUrl });

      res.status(200).json({
        banner_url: bannerUrl,
        thumbnail_url: thumbnailUrl,
        type: mime === "image/gif" ? "gif" : "image",
      });
    } catch (err) {
      console.error("❌ Upload processing failed:", err);

      try {
        await fsPromises.unlink(originalMulterTempPath);
        console.log("🗑️ Cleaned up temporary file.");
      } catch (unlinkErr) {
        if (unlinkErr.code !== "ENOENT") {
          console.warn("⚠️ Failed to clean up temp file:", unlinkErr.message);
        }
      }

      res.status(500).json({
        error: "Upload processing failed.",
        details: err.message,
      });
    }
  }
);

module.exports = router;
