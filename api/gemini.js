const DEFAULT_MODEL = "gemini-2.0-flash";
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];
import supabase from "../lib/supabase";

function setCorsHeaders(req, res) {
  const allowedOrigins = ['https://iseoai.com', 'https://www.webtietkiem.com'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, history, image, model } = req.body;

  if (!prompt?.trim() && !image) {
    return res.status(400).json({ error: "Prompt or image is required" });
  }

  // Kiểm tra định dạng history
  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item.role || !Array.isArray(item.parts)) {
        return res.status(400).json({ error: "Invalid history format" });
      }
      for (const part of item.parts) {
        if (!part.text && !part.image) {
          return res.status(400).json({ error: "Invalid part in history: must contain text or image" });
        }
      }
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing Gemini API key" });
  }

  // Xử lý history
  const contents = Array.isArray(history) 
    ? history.map(item => ({
        role: item.role,
        parts: item.parts
          .filter(part => part.text || part.image)
          .map(part => {
            if (part.image) {
              const [_, mimeType, data] = part.image.match(/^data:(.+);base64,(.+)$/) || [];
              if (mimeType && data) {
                return { inlineData: { mimeType, data } };
              } else {
                console.warn(`Skipping invalid image in history: ${part.image}`);
                return { text: "[Invalid image format]" };
              }
            }
            return { text: part.text };
          })
      }))
    : [];

  const parts = [];

  if (image?.data && image?.mimeType) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }

  if (prompt?.trim()) {
    parts.push({ text: prompt.trim() });
  }

  if (parts.length === 0) {
    return res.status(400).json({ error: "No valid parts provided" });
  }

  contents.push({ role: "user", parts });

  // Ghi log payload để debug
  console.log("Payload being sent to Gemini API:", JSON.stringify(contents, null, 2));

  const modelsToTry = [model || DEFAULT_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying model: ${modelName}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await response.json();

      if (response.status === 429) {
        console.warn(`Quota exceeded for model ${modelName}. Trying next model.`);
        lastError = `Quota exceeded for ${modelName}`;
        continue;
      }

      if (!response.ok || !data?.candidates?.length) {
        const errorMsg = data?.error?.message || `No candidate response from ${modelName}`;
        console.error(`Gemini API error for model ${modelName}:`, errorMsg);
        lastError = errorMsg;
        throw new Error(errorMsg);
      }

      const reply = data.candidates[0]?.content?.parts?.[0]?.text ?? "[Gemini không có phản hồi]";
      console.log(`Successfully received reply from model: ${modelName}`);

      await supabase.from("chats").insert([
        {
          session_id: req.headers["x-session-id"] || "anonymous",
          history: [...contents, { role: "model", parts: [{ text: reply }] }],
        },
      ]);

      return res.status(200).json({ reply });

    } catch (err) {
      console.error(`Error with model ${modelName}:`, err.message);
      lastError = err.message;
    }
  }

  return res.status(500).json({ error: `All available models failed to generate a response. Last error: ${lastError}` });
}
