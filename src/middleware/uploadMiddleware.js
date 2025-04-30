const multer = require("multer");
const path = require("path");

// ✅ Storage strategy
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/avatars"); // local folder
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${req.user.userId}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

// ✅ File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const isValid = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (isValid) cb(null, true);
  else cb(new Error("Only images are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB
});

module.exports = upload;
