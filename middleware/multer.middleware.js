import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const filePath = path.resolve(_dirname, "../../public/temp");
        cb(null, filePath)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

export const upload = multer({ storage: storage })

