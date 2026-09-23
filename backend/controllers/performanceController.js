const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Performance = require("../models/Performance");
const Employee = require("../models/Employee");
const { requireOwnProfile } = require("../utils/ownProfile");

const populate = (q) =>
  q.populate("employee", "firstName lastName jobTitle department employeeId").populate("reviewer", "name role");

// @route GET /api/performance  (admin, hr, manager)
exports.getAllPerformanceReviews = asyncHandler(async (req, res) => {
  const reviews = await populate(Performance.find({}).sort({ reviewDate: -1 }));
  res.json(reviews.filter((r) => r.employee));
});

// @route POST /api/performance  (admin, hr, manager)
exports.createPerformanceReview = asyncHandler(async (req, res) => {
  const { employee, comments, reviewDate } = req.body;
  const rating = Number(req.body.rating);

  if (!employee || !rating || !comments?.trim()) {
    res.status(400);
    throw new Error("Employee, rating and comments are required");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be a whole number from 1 to 5");
  }
  const target = mongoose.isValidObjectId(employee) && (await Employee.findById(employee));
  if (!target) {
    res.status(400);
    throw new Error("Employee not found");
  }
  if (String(target.user) === String(req.user._id)) {
    res.status(400);
    throw new Error("You can't review yourself");
  }

  const review = await Performance.create({
    employee,
    rating,
    comments: comments.trim(),
    reviewDate: reviewDate || new Date(),
    reviewer: req.user._id,
  });
  res.status(201).json(await populate(Performance.findById(review._id)));
});

// @route GET /api/performance/my-reviews  (any signed-in user with a profile)
exports.getMyPerformanceReviews = asyncHandler(async (req, res) => {
  const me = await requireOwnProfile(req, res);
  res.json(await Performance.find({ employee: me._id }).sort({ reviewDate: -1 }).populate("reviewer", "name role"));
});
