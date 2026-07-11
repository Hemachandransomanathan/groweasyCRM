const multer = require("multer");

// 404 handler
function notFound(req, res, next) {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
}

// Central error handler — every route/middleware error lands here.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File too large. Max size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`
        : err.message;
    return res.status(400).json({ error: message });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error("[errorHandler]", err);
  }

  res.status(status).json({
    error: err.message || "Internal server error",
  });
}

module.exports = { notFound, errorHandler };
