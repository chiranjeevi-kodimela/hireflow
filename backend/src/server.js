const requisitionRoutes = require("./routes/requisitionRoutes");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const prisma = require("./config/database");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "HireFlow API is running",
      database: "connected",
    });
  } catch (error) {
    next(error);
  }
});

// Handle unknown routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);
app.use("/api/requisitions", requisitionRoutes);
// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HireFlow API running on port ${PORT}`);
});
