// src/services/mediaProcessor.js

const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises"); // ✅ NOT require("fs")
const { exec } = require("child_process");

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
};

async function compressImage(filePath) {
  const ext = path.extname(filePath);
  const newPath = filePath.replace(ext, `.webp`);

  try {
    await sharp(filePath).webp({ quality: 70 }).toFile(newPath);

    // Delay deletion slightly to avoid EBUSY
    setTimeout(async () => {
      try {
        await fs.unlink(filePath); // Non-blocking and safer
      } catch (unlinkErr) {
        console.warn("⚠️ Failed to delete original file:", unlinkErr.message);
      }
    }, 500); // delay to let Sharp finish

    return newPath;
  } catch (err) {
    console.error("Image compression failed:", err);
    return filePath; // fallback to original if compression fails
  }
}

const transcodeVideo = async (filePath) => {
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ext);
  const outputPath = path.join(dir, `${base}-converted.mp4`);

  const generateVideoThumbnail = (videoPath) => {
    const thumbPath = videoPath.replace(/\.\w+$/, ".jpg");

    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -ss 00:00:01 -i "${videoPath}" -frames:v 1 -q:v 2 "${thumbPath}" -y`;
      exec(cmd, (error) => {
        if (error) return reject(error);
        resolve(thumbPath);
      });
    });
  };

  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i "${filePath}" -vcodec libx264 -crf 28 "${outputPath}" -y`,
      async (error) => {
        if (error) return reject(error);

        try {
          await fs.unlink(filePath); // Delete original video
        } catch (unlinkErr) {
          console.warn("⚠️ Failed to delete original file:", unlinkErr.message);
        }

        try {
          const thumbPath = await generateVideoThumbnail(outputPath);
          resolve({ video: outputPath, thumbnail: thumbPath });
        } catch (thumbErr) {
          console.warn("⚠️ Failed to generate thumbnail:", thumbErr.message);
          resolve({ video: outputPath, thumbnail: null });
        }
      }
    );
  });
};

// Placeholder for future AV scanning
const scanWithClamAV = async (filePath) => {
  // TODO: hook into ClamAV for virus scanning
  return true;
};

module.exports = {
  sanitizeFilename,
  compressImage,
  transcodeVideo,
  scanWithClamAV,
};
