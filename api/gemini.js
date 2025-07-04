// gemini.js (trên Vercel của bạn)

const DEFAULT_MODEL = "gemini-2.0-flash"; // Fixed to gemini-2.0-flash
import supabase from "../lib/supabase";

// Hàm để thiết lập các tiêu đề CORS
function setCorsHeaders(res) {
  // Thay thế 'https://iseoai.com' bằng domain WordPress chính xác của bạn
  res.setHeader('Access-Control-Allow-Origin', 'https://iseoai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Cho phép POST và OPTIONS
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id'); // Cho phép các header này
}

export default async function handler(req, res) {
  // LUÔN LUÔN thiết lập header CORS, kể cả cho lỗi
  setCorsHeaders(res);

  // Xử lý yêu cầu preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Trả về 200 OK cho preflight request
  }

  // Đảm bảo chỉ cho phép phương thức POST cho các yêu cầu thực sự
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, history, image } = req.body;

  if (!prompt?.trim() && !image) {
    return res.status(400).json({ error: "Prompt or image is required" });
  }

  const modelName = DEFAULT_MODEL;
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

    if (!response.ok || !data?.candidates?.length) {
      // Nếu có lỗi từ Gemini, ghi lại vào log Vercel
      console.error("Gemini API error response:", data?.error?.message || "No candidate response");
      throw new Error(data?.error?.message || "No candidate response");
    }

    const reply = data.candidates[0]?.content?.parts?.[0]?.text ?? "[Gemini không có phản hồi]";

    // Log thành công nếu muốn
    console.log("Gemini API successful reply.");

    // Xử lý Supabase
    await supabase.from("chats").insert([
      {
        session_id: req.headers["x-session-id"] || "anonymous",
        history: [...contents, { role: "model", parts: [{ text: reply }] }],
      },
    ]);

    // Trả về phản hồi thành công
    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Error in Gemini API handler:", err.message); // Ghi lại lỗi vào log Vercel
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
