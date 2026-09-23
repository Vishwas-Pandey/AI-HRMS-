// Small wrapper around the Gemini REST API used by the AI controllers.
const DEFAULT_MODEL = "gemini-2.5-flash";

const geminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || DEFAULT_MODEL}:generateContent`;

// Throws a 503 before any work is done when the key isn't configured.
const requireGeminiKey = (res) => {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    res.status(503);
    throw new Error("AI features are not configured on this server (GOOGLE_AI_API_KEY is missing)");
  }
  return key;
};

module.exports = { geminiUrl, requireGeminiKey };
