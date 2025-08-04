// gemini.js (trên Vercel của bạn)

const DEFAULT_MODEL = "gemini-2.0-flash"; // Đặt mô hình mặc định mới
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite", // Mô hình dự phòng 1
  "gemini-2.5-flash", // Mô hình dự phòng 2
  "gemini-2.0-flash-lite", // Mô hình dự phòng 3
  "gemini-2.0-pro", // Mô hình dự phòng 4
];
import supabase from "../lib/supabase";

// Hàm để thiết lập các tiêu đề CORS
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

  const contents = Array.isArray(history) ? [...history] : [];
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

  contents.push({ role: "user", parts });

  const modelsToTry = [model || DEFAULT_MODEL, ...FALLBACK_MODELS];

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await response.json();

      if (response.status === 429) { // 429: Too Many Requests (lỗi rate limit)
        console.warn(`Quota exceeded for model ${modelName}. Trying next model.`);
        continue; // Bỏ qua mô hình này và thử mô hình tiếp theo
      }

      if (!response.ok || !data?.candidates?.length) {
        console.error(`Gemini API error for model ${modelName}:`, data?.error?.message || "No candidate response");
        throw new Error(data?.error?.message || `No candidate response from ${modelName}`);
      }

      const reply = data.candidates[0]?.content?.parts?.[0]?.text ?? "[Gemini không có phản hồi]";
      console.log(`Successfully received reply from model: ${modelName}`);

      // Xử lý Supabase
      await supabase.from("chats").insert([
        {
          session_id: req.headers["x-session-id"] || "anonymous",
          history: [...contents, { role: "model", parts: [{ text: reply }] }],
        },
      ]);

      return res.status(200).json({ reply });

    } catch (err) {
      console.error(`Error with model ${modelName}:`, err.message);
      // Nếu có lỗi khác ngoài 429, chúng ta vẫn có thể thử mô hình tiếp theo
      // hoặc trả về lỗi nếu không có mô hình nào hoạt động
    }
  }

  // Nếu vòng lặp kết thúc mà không có mô hình nào thành công
  return res.status(500).json({ error: "All available models failed to generate a response." });
}
