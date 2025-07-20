// src/routes/messageUploadRoutes.js
// File: zone-25-14-backend/src/routes/messaging/messageUploadRoutes.js
// This file is part of the Zone 25-14 project.
// Licensed under the GNU General Public License v3.0.
// Description: Handles file uploads for chat messages
// Functions: uploadMedia
// Dependencies: express, multer, fs, path, messageController, uploadController, uploadService,
//              mediaProcessor, authMiddleware

const express = require("express");
const router = express.Router();
const { uploadMedia } = require("../../middleware/uploadMiddleware");
const {
  compressImage,
  transcodeVideo,
  scanWithClamAV,
} = require("../../services/mediaProcessor");
const { protectRoute } = require("../../middleware/authMiddleware");
const path = require("path");
const fs = require("fs");

router.post(
  "/upload",
  protectRoute,
  (req, res, next) => {
    uploadMedia.single("file")(req, res, function (err) {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large. Max 50MB." });
      }
      if (err) return res.status(500).json({ error: "Upload failed." });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    try {
      const mime = req.file.mimetype;
      const filePath = req.file.path;

      await scanWithClamAV(filePath);

      let finalPath = filePath;
      let finalThumbnail = null;
      const mediaType = mime.startsWith("video") ? "video" : "image";

      if (mediaType === "image") {
        // ✅ Skip GIF compression
        if (mime !== "image/gif") {
          finalPath = await compressImage(filePath);
        } else {
          console.log("🟡 Skipping compression for GIF file:", filePath);
        }
      } else {
        const { video, thumbnail } = await transcodeVideo(filePath);
        finalPath = video;
        finalThumbnail = thumbnail;
      }

      const url = `/uploads/message_media/${path.basename(finalPath)}`;
      const thumbUrl = finalThumbnail
        ? `/uploads/message_media/${path.basename(finalThumbnail)}`
        : null;
      res.status(200).json({
        url,
        type: mime === "image/gif" ? "gif" : mediaType,
        thumbnail: thumbUrl,
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ error: "Upload processing failed." });
    }
  }
);

module.exports = router;
