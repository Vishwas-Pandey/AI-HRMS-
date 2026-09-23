const express = require("express");
const c = require("../controllers/attendanceController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/my", c.getMyAttendance);
router.post("/check-in", c.checkIn);
router.post("/check-out", c.checkOut);

router
  .route("/")
  .get(restrictTo("admin", "hr", "manager"), c.getAllAttendance)
  .post(restrictTo("admin", "hr"), c.markAttendance);

module.exports = router;
