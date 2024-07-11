const crypto = require("crypto"); // Import the crypto
const multer = require("multer"); // Import the multer
const path = require("path"); // Import the path module for handling file paths
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./src/images/uploads");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    crypto.randomBytes(12, function (err, bytes) {
      const fn = bytes.toString("hex") + path.extname(file.originalname);
      cb(null, fn);
    });
  },
});
const upload = multer({ storage: storage });

module.exports = upload;
