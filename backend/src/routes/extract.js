const express = require("express");
const { upload } = require("../middleware/upload");
const { parseCsv } = require("../services/csvParser");
const { extractLeads } = require("../services/aiExtractor");

const router = express.Router();

// POST /api/extract
// multipart/form-data, field name: "file"
router.post("/extract", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error("No file uploaded. Attach a CSV under field name 'file'.");
      err.status = 400;
      throw err;
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCsv(fileContent);
if (!process.env.GROQ_API_KEY)  {
  const err = new Error(
    "Server is missing GEMINI_API_KEY. Set it in backend/.env before running extraction."
  );
      err.status = 500;
      throw err;
    }

    const result = await extractLeads(rows, headers);

    res.json({
      sourceFile: req.file.originalname,
      sourceHeaders: headers,
      totalRows: result.totalRows,
      totalImported: result.imported.length,
      totalSkipped: result.skipped.length,
      failedBatches: result.failedBatches,
      imported: result.imported,
      skipped: result.skipped,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
