const mongoose = require("mongoose");
const logger = require("../utils/logger");

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGO_URI || "mongodb+srv://ishaaq:l6IzSIbs4JUUMcMI@intern.ygeo7tz.mongodb.net/?appName=Intern";
  const isAtlas = uri.includes("mongodb+srv");
  const maxRetries = Number(process.env.DB_MAX_RETRIES || 3);

  connectionPromise = (async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: isAtlas ? 30000 : 5000,
          socketTimeoutMS: isAtlas ? 60000 : 45000,
          maxPoolSize: isAtlas ? 20 : 10,
          minPoolSize: isAtlas ? 4 : 2,
          retryWrites: true,
          w: "majority",
          bufferCommands: false,
          connectTimeoutMS: isAtlas ? 30000 : 10000,
        });

        logger.info("MongoDB connected successfully");
        return mongoose.connection;
      } catch (err) {
        logger.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, err.message);

        if (attempt === maxRetries) {
          logger.error(
            "MongoDB connection failed after all retries. Check MONGO_URI and network access."
          );
          throw err;
        }

        const delay = 2 ** attempt * 1000;
        logger.warn(`Retrying MongoDB connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return mongoose.connection;
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = undefined;
  }
};

module.exports = connectDB;
