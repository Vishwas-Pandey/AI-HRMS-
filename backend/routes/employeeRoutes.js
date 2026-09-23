const express = require("express");
const c = require("../controllers/employeeController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/my-profile", c.getMyEmployeeProfile);

router
  .route("/")
  .get(restrictTo("admin", "hr", "manager"), c.getAllEmployees)
  .post(restrictTo("admin"), c.createEmployee);

router
  .route("/:id")
  .get(restrictTo("admin", "hr", "manager"), c.getEmployeeById)
  .put(restrictTo("admin"), c.updateEmployee)
  .delete(restrictTo("admin"), c.deleteEmployee);

router.post("/:id/reset-password", restrictTo("admin"), c.resetPassword);

module.exports = router;
