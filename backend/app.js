const express = require("express");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// CORS_ORIGIN may hold several comma-separated origins. The deployed frontend
// is always allowed so a missing env var can't lock users out.
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://hr-management-system-eta-ten.vercel.app",
  ...(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
]);

app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => res.send("AI-HRMS API is running"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/performance", require("./routes/performanceRoutes"));
app.use("/api/payroll", require("./routes/payrollRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
