import path from "path";
import multer from "multer";
import fs from "fs";

// Build absolute path from project root to public/temp
const tempDir = path.resolve("public", "temp");
// /your/full/project/path/public/temp

// Ensure the folder exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });
export default upload;
