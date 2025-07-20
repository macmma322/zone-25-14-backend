// Middleware for handling uploads
// zone-25-14-backend/src/middleware/uploadMiddleware.js
// 🗂️ Handles file uploads for avatars and chat media\
// 📂 Uses multer for file handling and storage
// 📁 Creates directories dynamically based on user uploads
// 📸 Supports image and video uploads with size limits
// 📜 Filters files based on type to ensure only allowed formats are uploaded
// 📦 Exports upload functions for use in routes
// 🚀 Optimized for performance and security
// 🚧 Ensure uploads directory exists before starting the server
// 🚧 Requires multer, path, and fs modules

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🧠 Create storage dynamically by type
const createStorage = (folderName) =>
  multer.diskStorage({
    destination: function (req, file, cb) {
      const dest = `uploads/${folderName}`;
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const uniqueName = `${req.user?.userId || "guest"}-${Date.now()}${ext}`;
      cb(null, uniqueName);
    },
  });

// ✔️ Only allow image mimetypes for avatars
const avatarFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only image files are allowed."));
};

// ✔️ Allow images + videos for chat messages
const mediaFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only images and videos are allowed."));
};

const uploadAvatar = multer({
  storage: createStorage("avatars"),
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const uploadMedia = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/message_media");
    },
    filename: (req, file, cb) => {
      const uniqueName = `${
        req.user?.username || "guest"
      }-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

module.exports = {
  uploadAvatar,
  uploadMedia,
};
