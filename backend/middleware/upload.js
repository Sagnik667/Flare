import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a secure, randomized filename
    const randomHex = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomHex}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Validate file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Only .jpg, .jpeg, .png and .pdf files are allowed'), false);
  }

  // Validate MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Allowed: JPEG, PNG, PDF'), false);
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
  },
});

export default upload;
