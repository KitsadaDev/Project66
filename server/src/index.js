require("dotenv").config(); // Restarting server to apply Prisma client manual patch

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const stallRoutes = require("./routes/stalls");
const billRoutes = require("./routes/bills");
const contractRoutes = require("./routes/contracts");
const maintenanceRoutes = require("./routes/maintenance");
const settingsRoutes = require("./routes/settings");
const dishwareRoutes = require('./routes/dishware');
const dishwareTypeRoutes = require('./routes/dishwareTypes');
const notificationRoutes = require('./routes/notifications'); // Import notification routes

const notificationService = require('./services/notificationService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stalls", stallRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dishware", dishwareRoutes);
app.use("/api/dishware-types", dishwareTypeRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
