import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: 'vms_uploads',
    allowed_formats: ['jpeg', 'jpg', 'png', 'pdf'],
    public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed!'));
    }
  },
});

router.post('/', optionalAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.status(200).json({ url: req.file.path });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({
      error: 'Failed to upload file',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
