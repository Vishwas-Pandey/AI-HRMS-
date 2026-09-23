const Performance = require("../models/Performance");
const Employee = require("../models/Employee"); // <-- THE MISSING IMPORT
const asyncHandler = require("express-async-handler");

// @desc    Get all performance reviews
// @route   GET /api/performance
// @access  Private/Admin, Private/HR
exports.getAllPerformanceReviews = asyncHandler(async (req, res) => {
  const reviews = await Performance.find({}).populate(
    "employee",
    "firstName lastName jobTitle"
  );
  res.status(200).json(reviews);
});

// @desc    Create a new performance review
// @route   POST /api/performance
// @access  Private/Admin, Private/HR
exports.createPerformanceReview = asyncHandler(async (req, res) => {
  const { employee, rating, comments, reviewDate } = req.body;

  if (!employee || !rating || !reviewDate) {
    res.status(400);
    throw new Error("Please provide employee, rating, and review date");
  }

  const review = await Performance.create({
    employee,
    rating,
    comments,
    reviewDate,
    reviewer: req.user._id,
  });

  // Populate the new review before sending it back
  const populatedReview = await Performance.findById(review._id).populate(
    "employee",
    "firstName lastName jobTitle"
  );

  res.status(201).json(populatedReview);
});

// --- NEW FUNCTION (FIXED) ---
// @desc    Get all performance reviews for the logged-in user
// @route   GET /api/performance/my-reviews
// @access  Private (any logged-in user)
exports.getMyPerformanceReviews = asyncHandler(async (req, res) => {
  const employeeProfile = await Employee.findOne({ user: req.user._id });
  if (!employeeProfile) {
    res.status(404);
    throw new Error("Employee profile not found");
  }

  const reviews = await Performance.find({ employee: employeeProfile._id });
  res.status(200).json(reviews);
});
