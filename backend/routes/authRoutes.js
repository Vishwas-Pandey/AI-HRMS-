const express = require("express");
const { login, me, changePassword, demoAccounts } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// There is no public sign-up: accounts are created by an admin (see employeeRoutes).
router.post("/login", login);
router.get("/demo-accounts", demoAccounts);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);

module.exports = router;
