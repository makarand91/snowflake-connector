"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const snowflake_sdk_1 = __importDefault(require("snowflake-sdk"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Snowflake Connection
const connection = snowflake_sdk_1.default.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
});
connection.connect((err) => {
    if (err) {
        console.error("Failed to connect to Snowflake:", err);
    }
    else {
        console.log("Connected to Snowflake!");
    }
});
// Fetch Data from Snowflake
app.get("/data", (req, res) => {
    const query = "SELECT * FROM my_table LIMIT 100"; // Modify as needed
    connection.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            }
            else {
                res.json(rows);
            }
        },
    });
});
// AWS S3 Setup
const s3 = new aws_sdk_1.default.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});
// Upload File to S3
const upload = (0, multer_1.default)({ dest: "uploads/" });
app.post("/upload", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file)
        return res.status(400).send({ error: "No file uploaded" });
    const fileContent = fs_1.default.readFileSync(req.file.path);
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: req.file.originalname,
        Body: fileContent,
    };
    s3.upload(params, (err, data) => {
        fs_1.default.unlinkSync(req.file.path); // Remove temp file
        if (err) {
            res.status(500).json({ error: err.message });
        }
        else {
            res.json({ url: data.Location });
        }
    });
}));
// Download File from S3
app.get("/download/:filename", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: req.params.filename,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            res.status(500).json({ error: err.message });
        }
        else {
            res.setHeader("Content-Disposition", `attachment; filename=${req.params.filename}`);
            res.send(data.Body);
        }
    });
}));
app.listen(5000, () => console.log("Server running on port 5000"));
