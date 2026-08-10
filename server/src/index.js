require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

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
const { autoTerminateContracts } = require('./services/contractService');
const cron = require('node-cron');

const app = express();

// --- Database Migration on Startup ---
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function runMigrations() {
  console.log('[Database] Checking schema...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "MonthlyExpense" 
      ADD COLUMN IF NOT EXISTS "water_units" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "electricity_units" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "water_rate" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "electricity_rate" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "grease_trap_fee" DOUBLE PRECISION;
    `);
    console.log('[Database] Schema is up to date.');
  } catch (err) {
    console.error('[Database] Migration error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
runMigrations();
// ------------------------------------

// Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Cloudinary images to load
  contentSecurityPolicy: false // Disable CSP for API server (frontend handles it)
}));

// CORS — restrict to known frontend origins only
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, mobile apps) in development
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again after 15 minutes.' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', generalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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
app.use("/api/notifications", notificationRoutes);

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

// Schedule Daily Background Jobs (runs at midnight 00:00 every day)
cron.schedule('0 0 * * *', async () => {
  console.log('[System] Running scheduled daily jobs...');
  try {
    // 1. Check upcoming bills and send notifications
    await notificationService.checkUpcomingBills();
    
    // 2. Auto terminate contracts pending >= 3 months
    await autoTerminateContracts();
  } catch (err) {
    console.error('[System] Error running scheduled jobs:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Trigger restart 2
