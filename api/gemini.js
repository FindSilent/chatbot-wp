// gemini.js (trên Vercel của bạn)

const DEFAULT_MODEL = "gemini-2.0-flash"; // Đặt mô hình mặc định mới
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite", // Mô hình dự phòng 1
  "gemini-2.5-flash", // Mô hình dự phòng 2
  "gemini-2.0-flash-lite", // Mô hình dự phòng 3
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing Gemini API key" });
  }

  // Xử lý history để chuyển đổi trường image thành inlineData
  const contents = Array.isArray(history) 
    ? history.map(item => ({
        role: item.role,
        parts: item.parts.map(part => {
          if (part.image) {
            // Chuyển đổi trường image thành inlineData
            const [_, mimeType, data] = part.image.match(/^data:(.+);base64,(.+)$/) || [];
            return mimeType && data 
              ? { inlineData: { mimeType, data } }
              : { text: part.text || "[Invalid image]" };
          }
          return part;
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
