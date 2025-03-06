//for parsing the images of the form data(where node js cannot handle)

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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: function (req, file, cb) {
    // Validate file type
    const fileTypes = /jpeg|jpg|png/;
    
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png) are allowed!'));
    }
  },
});

module.exports = upload;
