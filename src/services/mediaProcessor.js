const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const { exec } = require("child_process");

const sanitizeFilename = (filename) => {
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9.\-]/g, "_");
  return sanitizedBaseName + ext;
};

// Modified to accept a target directory
async function compressImage(originalFilePath, targetDir) {
  const ext = path.extname(originalFilePath);
  const baseNameWithoutExt = path.basename(originalFilePath, ext);

  // Construct the new path within the target directory
  const uniqueNewFileName = `${sanitizeFilename(
    baseNameWithoutExt
  )}-${Date.now()}.webp`;
  const uniqueNewPath = path.join(targetDir, uniqueNewFileName);

  try {
    console.log(
      `[Image Processor] Compressing: ${originalFilePath} -> ${uniqueNewPath}`
    );
    await sharp(originalFilePath).webp({ quality: 70 }).toFile(uniqueNewPath);
    console.log(`[Image Processor] ✅ Compressed to: ${uniqueNewPath}`);

    // Delete the original temporary file immediately after successful processing
    await fs.unlink(originalFilePath);
    console.log(
      `[Image Processor] 🗑️ Original temp file deleted: ${originalFilePath}`
    );

    return uniqueNewPath; // Return the path to the newly created file
  } catch (err) {
    console.error(
      `[Image Processor] ❌ Compression failed for ${originalFilePath}: ${err.message}`
    );
    // If compression fails, try to move the original file to targetDir as a fallback
    try {
      const fallbackFileName = `${sanitizeFilename(
        baseNameWithoutExt
      )}-${Date.now()}${ext}`;
      const fallbackPath = path.join(targetDir, fallbackFileName);
      await fs.rename(originalFilePath, fallbackPath);
      console.log(
        `[Image Processor] ⚠️ Compression failed, moved original file as fallback: ${fallbackPath}`
      );
      return fallbackPath; // Return the path to the moved original file
    } catch (fallbackErr) {
      console.error(
        `[Image Processor] ❌ Also failed to move original as fallback: ${fallbackErr.message}`
      );
      // Re-throw the original error if fallback fails
      throw err;
    }
  }
}

// Modified to accept a target directory
const transcodeVideo = async (originalFilePath, targetDir) => {
  const ext = path.extname(originalFilePath);
  const baseNameWithoutExt = path.basename(originalFilePath, ext);
  const uniqueId = Date.now();

  // Construct output paths within the target directory
  const outputVideoFileName = `${sanitizeFilename(
    baseNameWithoutExt
  )}-converted-${uniqueId}.mp4`;
  const outputPath = path.join(targetDir, outputVideoFileName);

  const outputThumbFileName = `${sanitizeFilename(
    baseNameWithoutExt
  )}-thumbnail-${uniqueId}.jpg`;
  const thumbPath = path.join(targetDir, outputThumbFileName);

  const generateVideoThumbnail = (videoPath, outputThumbPath) => {
    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -ss 00:00:01 -i "${videoPath}" -frames:v 1 -q:v 2 "${outputThumbPath}" -y`;
      console.log(`[Video Processor] 🎥 Generating thumbnail: ${cmd}`);
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `[Video Processor] ❌ FFmpeg thumbnail error for ${videoPath}: ${error.message}`
          );
          console.error(`[Video Processor] FFmpeg stdout: ${stdout}`);
          console.error(`[Video Processor] FFmpeg stderr: ${stderr}`);
          return reject(error);
        }
        console.log(
          `[Video Processor] ✅ Thumbnail generated: ${outputThumbPath}`
        );
        resolve(outputThumbPath);
      });
    });
  };

  return new Promise((resolve) => {
    const cmd = `ffmpeg -i "${originalFilePath}" -vcodec libx264 -crf 28 "${outputPath}" -y`;
    console.log(`[Video Processor] 🎬 Transcoding video: ${cmd}`);
    exec(cmd, async (error, stdout, stderr) => {
      if (error) {
        console.error(
          `[Video Processor] ❌ FFmpeg transcoding error for ${originalFilePath}: ${error.message}`
        );
        console.error(`[Video Processor] FFmpeg stdout: ${stdout}`);
        console.error(`[Video Processor] FFmpeg stderr: ${stderr}`);
        // If transcoding fails, try to move original to targetDir as fallback
        try {
          const fallbackFileName = `${sanitizeFilename(
            baseNameWithoutExt
          )}-${Date.now()}${ext}`;
          const fallbackPath = path.join(targetDir, fallbackFileName);
          await fs.rename(originalFilePath, fallbackPath);
          console.log(
            `[Video Processor] ⚠️ Transcoding failed, moved original file as fallback: ${fallbackPath}`
          );
          return resolve({ video: fallbackPath, thumbnail: null }); // Resolve with fallback path
        } catch (fallbackErr) {
          console.error(
            `[Video Processor] ❌ Also failed to move original as fallback: ${fallbackErr.message}`
          );
          return resolve({ video: originalFilePath, thumbnail: null }); // Last resort: resolve with original temp path (might not be accessible later)
        }
      }

      console.log(`[Video Processor] ✅ Video transcoded: ${outputPath}`);

      try {
        await fs.unlink(originalFilePath); // Delete original temporary video
        console.log(
          `[Video Processor] 🗑️ Original temp video deleted: ${originalFilePath}`
        );
      } catch (unlinkErr) {
        if (unlinkErr.code !== "ENOENT") {
          console.warn(
            `[Video Processor] ⚠️ Failed to delete original temp video file ${originalFilePath}: ${unlinkErr.message}`
          );
        }
      }

      try {
        const generatedThumbPath = await generateVideoThumbnail(
          outputPath,
          thumbPath
        );
        resolve({ video: outputPath, thumbnail: generatedThumbPath });
      } catch (thumbErr) {
        console.warn(
          `[Video Processor] ⚠️ Failed to generate thumbnail for ${outputPath}: ${thumbErr.message}`
        );
        resolve({ video: outputPath, thumbnail: null });
      }
    });
  });
};

const scanWithClamAV = async (filePath) => {
  console.log(`[ClamAV Scanner] 🔍 Scanning file placeholder: ${filePath}`);
  // TODO: hook into ClamAV for virus scanning (e.g., using a library or executing external tool)
  return true;
};

module.exports = {
  sanitizeFilename,
  compressImage,
  transcodeVideo,
  scanWithClamAV,
};
