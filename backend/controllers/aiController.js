const { geminiUrl, requireGeminiKey } = require("../utils/gemini");
const Performance = require("../models/Performance");
const asyncHandler = require("express-async-handler");

// @desc    Get AI-powered performance insights
// @route   GET /api/ai/insights
// @access  Private/Admin, Private/Manager, Private/HR
exports.getAIInsights = asyncHandler(async (req, res) => {
  const reviews = await Performance.find({}).populate(
    "employee",
    "firstName lastName"
  );

  if (reviews.length === 0) {
    res.status(404);
    throw new Error("No performance reviews found to analyze.");
  }

  const performanceData = reviews
    .map(
      (r) =>
        `Employee: ${r.employee.firstName} ${r.employee.lastName}, Rating: ${r.rating}, Comment: ${r.comments}`
    )
    .join("\n");

  const systemPrompt =
    "Act as an expert HR analyst. Your tone is professional and insightful.";
  const userQuery = `Analyze the following performance data and provide a 2-3 sentence summary of overall team sentiment and performance. Then, identify the single "Top Performer" and the "Employee to Watch" (lowest performer) based on ratings and comments.

  Data:
  ${performanceData}`;

  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("AI API Error Body:", errorBody);
      throw new Error(
        `AI API call failed with status: ${response.status} - ${errorBody.error.message}`
      );
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    res.status(200).json({
      sourceData: reviews,
      aiSummary: aiText,
    });
  } catch (error) {
    console.error("AI call error:", error);
    throw new Error(`Failed to get AI insights: ${error.message}`);
  }
});

// @desc    Analyze (screen) a resume against a job description
// @route   POST /api/ai/screen-resume
// @access  Private/Admin, Private/HR
exports.screenResume = asyncHandler(async (req, res) => {
  const { jobDescription } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error("No resume file uploaded");
  }

  if (!jobDescription) {
    res.status(400);
    throw new Error("No job description provided");
  }

  const base64Resume = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype;

  const systemPrompt =
    "Act as a senior HR recruiter. You are screening a resume against a job description.";
  const userQuery = `Analyze the attached resume (file) against the provided job description (text).
    
    Job Description:
    ${jobDescription}
    
    Provide your analysis with:
    1.  A "Fit Score" from 1 to 100.
    2.  A 2-3 sentence "Summary" of the candidate's qualifications.
    3.  A list of "Missing Key Skills".`;

  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userQuery },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Resume,
                },
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("AI API Error Body:", errorBody);
      throw new Error(`AI API call failed: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    res.status(200).json({
      fileName: req.file.originalname,
      analysis: aiText,
    });
  } catch (error) {
    console.error("AI call error:", error);
    throw new Error(`Failed to get AI insights: ${error.message}`);
  }
});

// @desc    Get AI-powered sentiment analysis
// @route   GET /api/ai/sentiment
// @access  Private/Admin, Private/Manager, Private/HR
exports.getSentimentAnalysis = asyncHandler(async (req, res) => {
  // 1. Fetch all performance reviews (using your "Performance" model)
  const reviews = await Performance.find({}).populate(
    "employee",
    "firstName lastName"
  );

  if (reviews.length === 0) {
    // If no reviews, return default data
    return res.json({ positive: 0, neutral: 100, negative: 0 });
  }

  // 2. Combine all review comments
  const allComments = reviews
    .map(
      (r) =>
        `Feedback for ${r.employee.firstName} ${r.employee.lastName}: ${r.comments}`
    )
    .join("\n\n");

  // 3. Create the prompt for the AI
  const systemPrompt = `
    Act as an HR sentiment analyst. Analyze the provided text and
    return *only* a valid JSON object with three keys: "positive", "neutral", and "negative",
    representing the percentage of each. The sum must be 100.
    Example: {"positive": 75, "neutral": 15, "negative": 10}
  `;
  const userQuery = `
    Analyze the sentiment of the following employee feedback:
    ---
    ${allComments}
    ---
  `;

  // 4. Call the AI API (using your fetch method)
  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userQuery }] }],
        // Adding safetySetting to encourage JSON output,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AI API call failed: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    // 5. Clean and parse the JSON response from the AI
    const jsonStringMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonStringMatch) {
      throw new Error("AI did not return valid JSON.");
    }

    const sentimentData = JSON.parse(jsonStringMatch[0]);
    res.json(sentimentData);
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    throw new Error(`Failed to get sentiment analysis: ${error.message}`);
  }
});

// @desc    Get AI-powered dashboard insights
// @route   GET /api/ai/dashboard-insights
// @access  Private/Admin, Private/Manager, Private/HR
exports.getDashboardInsights = asyncHandler(async (req, res) => {
  // 1. Fetch all performance reviews
  const reviews = await Performance.find({}).populate(
    "employee",
    "firstName lastName"
  );

  if (reviews.length === 0) {
    // If no reviews, return a default insights object
    return res.json({
      insights: [
        "No performance data available.",
        "Awaiting employee reviews.",
        "No trends to report.",
        "Ready to analyze data.",
      ],
    });
  }

  // 2. Format the data for the AI
  const performanceData = reviews
    .map(
      (r) =>
        `Employee: ${r.employee.firstName} ${r.employee.lastName}, Rating: ${r.rating}, Comment: ${r.comments}`
    )
    .join("\n");

  // 3. Create a prompt specifically for the dashboard widget
  const systemPrompt = `
    Act as an expert HR analyst. Analyze the following performance data and
    return *only* a valid JSON object with a single key: "insights".
    This key should hold an array of exactly 4 short, insightful strings.
    
    The insights should include:
    1. The name of the "Top Performer".
    2. The name of the employee with the "Highest Attrition Risk" (lowest rating/negative comments).
    3. A brief "Hiring Trend" or "Performance Trend".
    4. One "Actionable Suggestion" for the HR team.

    Example Response:
    {
      "insights": [
        "Top Performer: Riya Bhatia",
        "Attrition Risk: Vansh Puri (High)",
        "Hiring Trend: Up 15% for Q4",
        "Suggestion: Focus on Node.js training"
      ]
    }
  `;
  const userQuery = `
    Here is the performance data:
    ---
    ${performanceData}
    ---
  `;

  // 4. Call the AI API
  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AI API call failed: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    // 5. Clean and parse the JSON response
    const jsonStringMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonStringMatch) {
      throw new Error("AI did not return valid JSON.");
    }

    const insightsData = JSON.parse(jsonStringMatch[0]);
    res.json(insightsData); // Send the { insights: [...] } object
  } catch (error) {
    console.error("Dashboard insights error:", error);
    throw new Error(`Failed to get dashboard insights: ${error.message}`);
  }
});

// --- NEW CHATBOT FUNCTION ADDED HERE ---

// @desc    Handle chatbot conversation
// @route   POST /api/ai/chatbot
// @access  Private/Admin, Private/Manager, Private/HR
exports.handleChatbot = asyncHandler(async (req, res) => {
  const { history, message } = req.body; // history is an array of past messages

  if (!message) {
    res.status(400);
    throw new Error("No message provided");
  }

  // 1. Create a prompt for the AI, including chat history
  const systemPrompt = `
    Act as "HR-AI-Assistant", a helpful chatbot for an HR manager.
    Your goal is to answer questions about recruitment, best practices, or help draft documents.
    Be concise and professional.
  `;

  // 2. Format the chat history for the AI
  // The Gemini API expects history as: [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
  // Only accept plain user/model text turns, and keep the last 20.
  const aiHistory = (Array.isArray(history) ? history : [])
    .filter((h) => ["user", "model"].includes(h?.role) && typeof h?.parts?.[0]?.text === "string")
    .slice(-20)
    .map((h) => ({ role: h.role, parts: [{ text: h.parts[0].text.slice(0, 4000) }] }));

  // 3. Call the AI API
  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        // Add the new user message to the end of the history
        contents: [...aiHistory, { role: "user", parts: [{ text: message }] }],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AI API call failed: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    // 4. Send back the AI's response
    res.json({ reply: aiText });
  } catch (error) {
    console.error("Chatbot error:", error);
    throw new Error(`Failed to get chatbot reply: ${error.message}`);
  }
});

exports.generateTemplate = asyncHandler(async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400);
    throw new Error("No prompt provided");
  }

  // 1. Create a prompt for the AI
  const systemPrompt = `
    Act as an expert HR copywriter. You are generating a professional HR document.
    The user will provide a prompt for the document they need.
    Respond *only* with the full text of the document requested. Do not add any extra
    commentary before or after the document text.
  `;

  // 2. Call the AI API
  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }], // Just send the user's prompt
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AI API call failed: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    // 4. Send back the AI's response
    res.json({ template: aiText });
  } catch (error) {
    console.error("Template generation error:", error);
    throw new Error(`Failed to generate template: ${error.message}`);
  }
});

exports.analyzeVoiceInterview = asyncHandler(async (req, res) => {
  const { jobDescription } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error("No audio file uploaded");
  }

  if (!jobDescription) {
    res.status(400);
    throw new Error("No job description provided for context");
  }

  // 1. Convert the audio file buffer to base64
  const base64Audio = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype; // e.g., "audio/webm", "audio/mp3"

  // 2. Create the prompt for the AI
  const systemPrompt = `
    Act as a senior HR manager. You are analyzing a candidate's voice recording
    from a pre-screening interview. Transcribe their answers and then evaluate
    them against the provided job description for clarity, relevance, and professionalism.
  `;
  const userQuery = `
    Job Description for context:
    ${jobDescription}
    
    Attached is the candidate's audio response. Please provide:
    1.  A "Full Transcription" of their answers.
    2.  A "Sentiment Analysis" (e.g., Confident, Nervous, Positive).
    3.  A "Key Strengths" list based on their spoken answers.
    4.  A "Potential Red Flags" list.
  `;

  // 3. Call the AI API (using your fetch method)
  const apiKey = requireGeminiKey(res);
  const apiUrl = geminiUrl(); // Gemini 2.5 Flash accepts audio input

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userQuery },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AI API call failed: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("No content returned from AI");
    }

    // 4. Send back the AI's analysis
    res.json({ analysis: aiText });
  } catch (error) {
    console.error("Voice analysis error:", error);
    throw new Error(`Failed to analyze voice interview: ${error.message}`);
  }
});
