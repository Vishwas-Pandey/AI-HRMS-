const express = require("express");
const router = express.Router();
const {
  getAllPayrolls,
  createPayroll,
  getMyPayrollRecords,
} = require("../controllers/payrollController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Protect all routes
router.use(protect);

// Payslips for the logged-in employee
router.get("/my-payslips", getMyPayrollRecords);

// Get all payrolls (HR, Admin)
// Create payroll (Admin only)
router
  .route("/")
  .get(restrictTo("admin", "hr"), getAllPayrolls)
  .post(restrictTo("admin"), createPayroll);

module.exports = router;
