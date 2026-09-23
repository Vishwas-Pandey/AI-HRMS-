const express = require("express");
const c = require("../controllers/performanceController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/my-reviews", c.getMyPerformanceReviews);

router
  .route("/")
  .get(restrictTo("admin", "hr", "manager"), c.getAllPerformanceReviews)
  .post(restrictTo("admin", "hr", "manager"), c.createPerformanceReview);

module.exports = router;
