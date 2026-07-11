require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const healthRoute = require("./routes/health");
const extractRoute = require("./routes/extract");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", healthRoute);
app.use("/api", extractRoute);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GrowEasy CSV Importer backend listening on port ${PORT}`);
  console.log(`Allowing requests from: ${FRONTEND_ORIGIN}`);
});
