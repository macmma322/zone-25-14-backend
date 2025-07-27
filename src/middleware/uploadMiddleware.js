const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🧠 Create storage dynamically by folder type and user ID
const createStorage = (folderName) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const userId = req.user ? req.user.user_id : "guest"; // Default to 'guest' if user is undefined
      const dest = `uploads/${folderName}/${userId}`;
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest); // Set destination to user-specific folder
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}${ext}`; // Create a unique filename based on timestamp
      cb(null, uniqueName);
    },
  });
};

// File filters
const avatarFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only image files are allowed."));
};

// ✔️ Allow images and videos for chat messages (media)
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
    : cb(new Error("Only images and videos are allowed for media."));
};

// Create the upload middleware
const uploadAvatar = multer({
  storage: createStorage("avatars"),
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
});

// 🧳 Media (chat uploads) middleware for images and videos
const uploadMedia = multer({
  storage: createStorage("message_media"), // Directly pass the storage object
  fileFilter: mediaFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for media
});

module.exports = {
  uploadAvatar,
  uploadMedia,
};

// 🧳 Banner upload middleware (future use)
const uploadBanner = multer({
  storage: createStorage("banners"), // Use custom storage for banners
  fileFilter: avatarFilter, // Apply filter for banners (can be adjusted)
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for banners
});

module.exports = {
  uploadAvatar,
  uploadMedia,
  uploadBanner,
};
