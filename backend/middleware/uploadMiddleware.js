const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter for allowed file types (Images, PDFs, docs, videos)
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|pdf|docx|txt|mp4|webm/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.test(ext)) {
        cb(null, true);
    } else {
        cb(new Error('File format not supported. Allowed formats: images, pdf, docx, txt, mp4'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024 }, // 50MB
    fileFilter: fileFilter
});

module.exports = upload;
