import multer from "multer";
import { uploadFile } from "../services/cloudinary.js";

// Set up multer in-memory storage
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Supported formats: Images (JPG, PNG), PDF, DOC, DOCX
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Supported: JPEG, PNG, GIF, PDF, DOC, DOCX"));
    }
  },
}).single("file");

export async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const result = await uploadFile(req.file);

    return res.json({
      secure_url: result.url,
      fileName: result.fileName,
      fileType: result.fileType,
    });
  } catch (err) {
    console.error("Upload handler error:", err);
    return res.status(500).json({ error: err.message || "Failed to process file upload." });
  }
}
