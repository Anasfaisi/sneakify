// // config/multer.js
// const multer = require('multer');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('./cloudinary');

// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: 'ecommerce/products',
//     allowed_formats: ['jpg', 'png', 'jpeg'], 
//   },
// });

// const upload = multer({ storage });

// module.exports = upload;

const multer = require('multer');
const path = require('path');

// Define storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Set the destination folder for uploaded files
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    // Set the filename to include a timestamp for uniqueness
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Set up the upload middleware
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: function (req, file, cb) {
    // Validate file type
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    console.log("orginal file",file.originalname);
    console.log('this is extName',extName);
    const mimeType = fileTypes.test(file.mimetype);
    console.log("this is mimetype",mimeType);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png) are allowed!'));
    }
  },
});

module.exports = upload;
