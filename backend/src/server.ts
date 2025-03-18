import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import snowflake from "snowflake-sdk";
import aws from "aws-sdk";
import multer from "multer";
import fs from "fs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Snowflake Connection
const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  database: process.env.SNOWFLAKE_DATABASE!,
  schema: process.env.SNOWFLAKE_SCHEMA!,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
  role: process.env.SNOWFLAKE_ROLE!
});

connection.connect((err) => {
  if (err) {
    console.error("Failed to connect to Snowflake:", err);
  } else {
    console.log("Connected to Snowflake!");
  }
});

// Fetch Data from Snowflake
app.get("/data", (req: Request, res: Response) => {
    const querySubclause = req.query.filter ? `WHERE ${req.query.filter}` : "";
    const query = `SELECT first_name,last_name,BUSINESS_EMAIL,COMPANY_COUNTRY,COMPANY_NAME FROM five_by_five_temp_company_contacts ${querySubclause} LIMIT 100`;
  console.log("Querying using filter "+query)
  connection.execute({
    sqlText: query,
    complete: (err, stmt, rows) => {
    console.log("querying completed")
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    },
  });
});

// AWS S3 Setup
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

// Upload File to S3
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), async (req: Request, res: Response) : Promise<any> => {
  if (!req.file) return res.status(400).send({ error: "No file uploaded" });

  const fileContent = fs.readFileSync(req.file.path);
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: req.file.originalname,
    Body: fileContent,
  };

  s3.upload(params, (err: { message: any; }, data: { Location: any; }) => {
    fs.unlinkSync(req.file!.path); // Remove temp file
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ url: data.Location });
    }
  });

});

// Download File from S3
app.get("/download/:filename", async (req: Request, res: Response) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: req.params.filename,
  };

  s3.getObject(params, (err, data) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${req.params.filename}`
      );
      res.send(data.Body);
    }
  });
});

app.listen(5000, () => console.log("Server running on port 5000"));
