const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// Routes a user may still call while they owe a password change.
const ALLOWED_BEFORE_PASSWORD_CHANGE = ["/api/auth/me", "/api/auth/change-password"];

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Session expired, please log in again");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    // e.g. the account was deleted by an admin after this token was issued
    res.status(401);
    throw new Error("Account no longer exists");
  }

  if (user.mustChangePassword && !ALLOWED_BEFORE_PASSWORD_CHANGE.includes(req.originalUrl.split("?")[0])) {
    res.status(403);
    throw new Error("Please change your temporary password first");
  }

  req.user = user;
  next();
});

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error("You don't have permission to do this");
  }
  next();
};

module.exports = { protect, restrictTo };
