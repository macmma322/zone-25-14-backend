// src/routes/messaging/messageUploadRoutes.js
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
const fsPromises = require("fs/promises"); // Use fs.promises

router.post(
  "/upload",
  protectRoute,
  (req, res, next) => {
    // Multer handles the initial upload to a temp directory (e.g., 'uploads/temp')
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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const originalMulterTempPath = req.file.path; // e.g., 'uploads\\temp\\somehash.jpg'
    const mime = req.file.mimetype;
    const userId = req.user.user_id;

    // Define the target directory for this user's media
    const userMediaTargetDir = path.join("uploads", "message_media", userId);

    try {
      // Ensure the target directory exists
      await fsPromises.mkdir(userMediaTargetDir, { recursive: true });

      await scanWithClamAV(originalMulterTempPath); // Scan the temp file

      let finalStoredPath; // This will be the path to the final stored file (webp, mp4, or moved gif)
      let finalThumbnailPath = null;
      const mediaType = mime.startsWith("video") ? "video" : "image";

      if (mediaType === "image") {
        if (mime !== "image/gif") {
          // compressImage will move and process the file.
          // It should receive the original temp path and the target directory.
          // Modify compressImage to accept targetDir
          finalStoredPath = await compressImage(
            originalMulterTempPath,
            userMediaTargetDir
          );
        } else {
          // For GIF, just move it to the final user directory with a new name
          const originalExt = path.extname(originalMulterTempPath);
          const newFileName = `${path.basename(
            originalMulterTempPath,
            originalExt
          )}-${Date.now()}${originalExt}`;
          finalStoredPath = path.join(userMediaTargetDir, newFileName);
          await fsPromises.rename(originalMulterTempPath, finalStoredPath);
          console.log("🟡 GIF moved to:", finalStoredPath);
        }
      } else {
        // transcodeVideo will move and process the file.
        // It should receive the original temp path and the target directory.
        // Modify transcodeVideo to accept targetDir
        const { video, thumbnail } = await transcodeVideo(
          originalMulterTempPath,
          userMediaTargetDir
        );
        finalStoredPath = video;
        finalThumbnailPath = thumbnail;
      }

      const mediaUrl = `/uploads/${path
        .relative("uploads", finalStoredPath)
        .replace(/\\/g, "/")}`;

      let thumbnailUrl = null;
      if (finalThumbnailPath) {
        thumbnailUrl = `/uploads/${path
          .relative("uploads", finalThumbnailPath)
          .replace(/\\/g, "/")}`;
      }

      res.status(200).json({
        url: mediaUrl,
        type: mime === "image/gif" ? "gif" : mediaType,
        thumbnail: thumbnailUrl,
      });
    } catch (err) {
      console.error("❌ Upload processing failed:", err);
      // Attempt to clean up the original temporary file if it still exists
      try {
        await fsPromises.unlink(originalMulterTempPath);
        console.log("🗑️ Cleaned up original temporary file.");
      } catch (unlinkErr) {
        if (unlinkErr.code !== "ENOENT") {
          console.warn(
            "⚠️ Failed to clean up original temporary file:",
            unlinkErr.message
          );
        }
      }
      res.status(500).json({ error: "Upload processing failed." });
    }
  }
);

module.exports = router;
