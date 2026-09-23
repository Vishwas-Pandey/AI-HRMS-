const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @route GET /api/users  (admin)
exports.getUsers = asyncHandler(async (req, res) => {
  res.json(await User.find({}).select("name email role mustChangePassword createdAt").sort({ createdAt: 1 }));
});
