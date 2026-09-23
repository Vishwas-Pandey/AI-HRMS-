const express = require("express");
const c = require("../controllers/payrollController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/my-payslips", c.getMyPayrollRecords);

router
  .route("/")
  .get(restrictTo("admin", "hr"), c.getAllPayrolls)
  .post(restrictTo("admin"), c.createPayroll);

router.patch("/:id/pay", restrictTo("admin"), c.markPaid);

module.exports = router;
