import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

let cloudinaryConfigured = false;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  cloudinaryConfigured = true;
  console.log("Cloudinary configured successfully.");
} else {
  console.warn("Cloudinary credentials not fully configured in environment variables. Falling back to local disk storage for attachments.");
}

/**
 * Uploads a file buffer or local file to Cloudinary, or saves it locally as a fallback.
 * @param {Object} file - The file object from multer
 * @returns {Promise<Object>} - An object containing { url, fileName, fileType }
 */
export async function uploadFile(file) {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const { originalname, buffer, mimetype } = file;
  const extension = path.extname(originalname);
  const baseName = path.basename(originalname, extension).replace(/[^a-zA-Z0-9]/g, "_");
  const uniqueName = `${baseName}_${Date.now()}${extension}`;

  // If Cloudinary is configured, upload using its SDK
  if (cloudinaryConfigured) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            public_id: path.basename(uniqueName, extension),
            folder: "smart_support_system",
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload failed, falling back to local:", error);
              // Fallback directly to local storage inside catch
              resolve(saveLocalFile(buffer, uniqueName, originalname, mimetype));
            } else {
              resolve({
                url: result.secure_url,
                fileName: originalname,
                fileType: mimetype,
              });
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      console.error("Cloudinary upload catch error, saving locally:", err);
      return saveLocalFile(buffer, uniqueName, originalname, mimetype);
    }
  }

  // Fallback to local storage
  return saveLocalFile(buffer, uniqueName, originalname, mimetype);
}

function saveLocalFile(buffer, uniqueName, originalname, mimetype) {
  // Ensure public/uploads folder exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, uniqueName);
  fs.writeFileSync(filePath, buffer);

  // Return local public asset URL
  const relativeUrl = `/uploads/${uniqueName}`;
  return {
    url: relativeUrl,
    fileName: originalname,
    fileType: mimetype,
  };
}
