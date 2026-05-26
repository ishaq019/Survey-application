const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const surveyTemplateRoutes = require("./routes/surveyTemplateRoutes");
const surveyResponseRoutes = require("./routes/surveyResponseRoutes");
const surveyReportRoutes = require("./routes/surveyReportRoutes");
const examRoutes = require("./routes/examRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const logger = require("./utils/logger");

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.QUIZ_CLIENT_URL,
  process.env.SURVEY_CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    service: "survey-application-backend",
    status: "ok",
    authentication: "disabled",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/exams", examRoutes);
app.use("/api/survey-templates", surveyTemplateRoutes);
app.use("/api/surveys", surveyResponseRoutes);
app.use("/api/surveys", surveyReportRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5001;
const dbReady = connectDB();

const startServer = async () => {
  try {
    await dbReady;
    app.listen(PORT, () => {
      logger.info(`Survey server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start survey server:", error.message);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, dbReady };
