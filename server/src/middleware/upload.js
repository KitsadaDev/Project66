const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDir = (dir) => {
  const fullPath = path.join(__dirname, '../../uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = 'general';
    
    if (req.baseUrl.includes('bills')) {
      uploadDir = 'payments';
    } else if (req.baseUrl.includes('maintenance')) {
      uploadDir = 'maintenance';
    } else if (req.baseUrl.includes('contracts')) {
      uploadDir = 'contracts';
    }
    
    const fullPath = createUploadDir(uploadDir);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpeg, jpg, png, gif) and PDF files are allowed!'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

module.exports = upload;
