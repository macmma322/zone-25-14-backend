const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = "uploads/avatars";
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${req.user.userId}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|gif|webp/;
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const isExtValid = allowedExt.test(
    path.extname(file.originalname).toLowerCase()
  );
  const isMimeValid = allowedMime.includes(file.mimetype);

  if (isExtValid && isMimeValid) cb(null, true);
  else cb(new Error("Only valid image files are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = upload;
