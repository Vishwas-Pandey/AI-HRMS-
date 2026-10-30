const express = require("express");
const router = express.Router();

// 1. IMPORT THE NEW FUNCTION
const {
  getAIInsights,
  screenResume,
  getSentimentAnalysis,
  getDashboardInsights,
  handleChatbot,
  generateTemplate,
  analyzeVoiceInterview, // <-- ADD THIS
} = require("../controllers/aiController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Protect all AI routes
router.use(protect);

// Lets the UI check whether AI is switched on before it calls an AI endpoint,
// instead of firing requests that are certain to fail with a 503.
router.get("/status", (req, res) => {
  res.json({ configured: Boolean(process.env.GOOGLE_AI_API_KEY) });
});

router
  .route("/insights")
  .get(restrictTo("admin", "manager", "hr"), getAIInsights);

router
  .route("/screen-resume")
  .post(restrictTo("admin", "hr"), upload.single("resume"), screenResume);

router
  .route("/sentiment")
  .get(restrictTo("admin", "manager", "hr"), getSentimentAnalysis);

router
  .route("/dashboard-insights")
  .get(restrictTo("admin", "manager", "hr"), getDashboardInsights);

router
  .route("/chatbot")
  .post(restrictTo("admin", "manager", "hr"), handleChatbot);

router
  .route("/generate-template")
  .post(restrictTo("admin", "manager", "hr"), generateTemplate);

// 2. ADD THE NEW VOICE INTERVIEW ROUTE
router
  .route("/voice-interview")
  .post(
    restrictTo("admin", "hr"),
    upload.single("audio"),
    analyzeVoiceInterview
  ); // <-- ADD THIS

module.exports = router;
