// backend/src/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const securityHeaders = require("./middleware/securityHeaders");

console.log("Loading questions route...");

// Load env variables
dotenv.config();

// Initialize Firebase Admin (centralized)
const admin = require("./firebaseAdmin");

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(securityHeaders);

// Routes
const authRoutes = require("./routes/auth");
const questionRoutes = require("./routes/questions");
const examRoutes = require("./routes/exams");

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/exams", examRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Proctoring backend running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
