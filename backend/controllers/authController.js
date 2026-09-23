const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Employee = require("../models/Employee");
const generateToken = require("../utils/generateToken");
const { checkPasswordStrength } = require("../utils/password");
const { DEMO_ACCOUNTS, DEMO_PASSWORD } = require("../utils/demoSeed");

const toSession = async (user) => {
  const employee = await Employee.findOne({ user: user._id }).select("employeeId department jobTitle");
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    isDemo: user.isDemo,
    employeeId: employee?.employeeId || null,
    department: employee?.department || null,
    jobTitle: employee?.jobTitle || null,
  };
};

// @route POST /api/auth/login  (public)
exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const { password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({ ...(await toSession(user)), token: generateToken(user._id) });
});

// @route GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  res.json(await toSession(req.user));
});

// @route POST /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (user.isDemo) {
    res.status(403);
    throw new Error("Demo account passwords can't be changed");
  }
  if (!currentPassword || !(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }
  const weak = checkPasswordStrength(newPassword);
  if (weak) {
    res.status(400);
    throw new Error(weak);
  }
  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error("New password must be different from the current one");
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  res.json({ message: "Password updated", user: await toSession(user) });
});

// @route GET /api/auth/demo-accounts  (public, only when DEMO_MODE=true)
exports.demoAccounts = (req, res) => {
  if (process.env.DEMO_MODE !== "true") return res.json({ enabled: false, accounts: [] });
  res.json({
    enabled: true,
    accounts: DEMO_ACCOUNTS.map(({ role, email, label }) => ({ role, email, label, password: DEMO_PASSWORD })),
  });
};
