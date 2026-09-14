import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = "gemini-3.6-flash";

app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const { history, systemPrompt } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in .env"
      });
    }

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        error: "Chat history is empty."
      });
    }

    const contents = history.map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt || "You are a helpful student companion." }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 400
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        error: data?.error?.message || `Gemini API request failed (${response.status})`
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: error?.message || "Server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Stay a While running at http://localhost:${PORT}`);
  console.log(`Gemini model: ${MODEL}`);
});
