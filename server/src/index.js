import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";

import connectDB from "./config/db.js";
import Admin from "./models/Admin.js";
import Brand from "./models/Brand.js";
import Transaction from "./models/Transaction.js";

import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();

// --------------------------------------------------
// CORS CONFIGURATION
// --------------------------------------------------

const allowedOrigins = [
  "https://velop-accounts.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
].filter((origin, index, origins) => origins.indexOf(origin) === index);

const corsOptions = {
  origin(origin, callback) {
    // Permit requests without an Origin header, such as
    // server-to-server requests and certain health checks.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error("Origin not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: true,

  optionsSuccessStatus: 204,

  maxAge: 86400,
};

// --------------------------------------------------
// SECURITY & MIDDLEWARE
// --------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Register CORS before rate limits and API routes so
// browser preflight requests receive CORS headers.
app.use(cors(corsOptions));

app.use(express.json({ limit: "1mb" }));

app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "VELoop Money Tracker API",
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/notifications", notificationRoutes);

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);

  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      message: "This origin is not allowed to access the API.",
    });
  }

  res.status(500).json({
    message: "Unexpected server error",
  });
});

// --------------------------------------------------
// INITIAL ADMIN & BRAND SEEDING
// --------------------------------------------------

async function seed() {
  const seeds = [
    {
      name: process.env.ADMIN_ONE_NAME,
      email: process.env.ADMIN_ONE_EMAIL,
      password: process.env.ADMIN_ONE_PASSWORD,
      role: "founder",
    },
    {
      name: process.env.ADMIN_TWO_NAME,
      email: process.env.ADMIN_TWO_EMAIL,
      password: process.env.ADMIN_TWO_PASSWORD,
      role: "admin",
    },
  ];

  for (const admin of seeds) {
    if (!admin.name || !admin.email || !admin.password) {
      throw new Error(
        "Set both admin names, emails, and passwords in the environment variables.",
      );
    }

    const email = admin.email.toLowerCase();
    const existing = await Admin.findOne({ email });

    if (!existing) {
      await Admin.create({
        name: admin.name,
        email,
        passwordHash: await bcrypt.hash(admin.password, 12),
        role: admin.role,
      });
    } else if (admin.role === "founder" && existing.role !== "founder") {
      existing.role = "founder";
      await existing.save();
    }
  }

  const defaults = [
    {
      name: "VELoop Rewards & Engagement",
      slug: "velop-rewards-engagement",
      description: "Rewards platform and engagement operations",
      color: "#059669",
    },
    {
      name: "VELoop Internships",
      slug: "velop-internships",
      description: "Internship programme and administration",
      color: "#2563eb",
    },
    {
      name: "Formia",
      slug: "formia",
      description: "Formia products and operations",
      color: "#7c3aed",
    },
  ];

  const founder = await Admin.findOne({
    email: process.env.ADMIN_ONE_EMAIL.toLowerCase(),
  });

  if (!founder) {
    throw new Error("Founder admin could not be found.");
  }

  for (const brand of defaults) {
    const exists = await Brand.findOne({ slug: brand.slug });

    if (!exists) {
      await Brand.create({
        ...brand,
        createdBy: founder._id,
        createdByName: founder.name,
      });
    }
  }

  // Assign legacy transactions without a brand to the
  // default VELoop Rewards & Engagement brand.
  const unassigned = await Transaction.find({
    $or: [{ brand: { $exists: false } }, { brand: null }],
  });

  if (unassigned.length) {
    const brand = await Brand.findOne({
      slug: "velop-rewards-engagement",
    });

    if (brand) {
      for (const transaction of unassigned) {
        transaction.brand = brand._id;
        transaction.brandName = brand.name;
        await transaction.save();
      }
    }
  }
}

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

const port = process.env.PORT || 5000;

connectDB()
  .then(seed)
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
      console.log("Allowed frontend origins:", allowedOrigins);
    });
  })
  .catch((error) => {
    console.error("Startup failed:", error.message);
    process.exit(1);
  });
