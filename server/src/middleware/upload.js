const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = 'general';
    
    if (req.baseUrl.includes('bills')) {
      folderName = 'payments';
    } else if (req.baseUrl.includes('maintenance')) {
      folderName = 'maintenance';
    } else if (req.baseUrl.includes('contracts')) {
      folderName = 'contracts';
    }

    const ext = path.extname(file.originalname).substring(1).toLowerCase();
    const format = (ext === 'heic' || ext === 'heif') ? 'jpg' : ext;

    return {
      folder: `Project/${folderName}`,
      format: format,
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// File filter - explicit MIME type allow-list (prevents extension spoofing)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf'
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.originalname.toLowerCase().endsWith('.heic') || file.originalname.toLowerCase().endsWith('.heif')) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpeg, jpg, png, gif, webp, heic) and PDF files are allowed!'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

module.exports = upload;
