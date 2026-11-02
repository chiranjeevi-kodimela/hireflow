const requisitionRoutes = require("./routes/requisitionRoutes");
require("dotenv").config();
const candidateRoutes = require("./routes/candidateRoutes");
const express = require("express");
const cors = require("cors");
const prisma = require("./config/database");
const applicationRoutes = require("./routes/applicationRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const interviewRoutes = require("./routes/interviewRoutes");
const scorecardRoutes = require("./routes/scorecardRoutes");
const offerRoutes = require("./routes/offerRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const applicationStageRoutes = require("./routes/applicationStageRoutes");
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

app.use("/api/requisitions", requisitionRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/applications", applicationStageRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/scorecards", scorecardRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/approvals", approvalRoutes);
// Handle unknown routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);
// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HireFlow API running on port ${PORT}`);
});
