// assets/js/chatbot.js
console.log('Chatbot script loaded');
const messagesDiv = document.getElementById("messages");
const promptInput = document.getElementById("prompt");
const imageInput = document.getElementById("imageInput");
const fileNameSpan = document.getElementById("file-name");
const toBottomBtn = document.getElementById("to-bottom-btn");
const localKeyPrefix = "chat_history_";
let history = [];

// window.onload sẽ đảm bảo rằng DOM đã tải đầy đủ trước khi thực thi
window.onload = () => {
  console.log('Window onload triggered');
  const saved = localStorage.getItem(`${localKeyPrefix}current`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(msg => {
          if (msg.sender && typeof msg.text === "string") {
            console.log(`Rendering message: ${msg.sender}`);
            addMessage(msg.sender, formatMarkdown(msg.text), true, msg.image);
          }
        });
        history = parsed
          .filter(m => m.sender === "You" || m.sender === "Bot")
          .map(m => ({
            role: m.sender === "You" ? "user" : "model",
            parts: [{ text: m.text }],
          }));
      } else {
        console.warn("Invalid chat history format");
      }
    } catch (e) {
      console.error("Error parsing localStorage:", e);
      localStorage.removeItem(`${localKeyPrefix}current`);
    }
  }
  // Loại bỏ dòng liên quan đến DarkMode khi tải trang
  // if (localStorage.getItem("darkMode") === "true") {
  //   document.body.classList.add("dark");
  // }
  updateToBottomButton();
};

async function sendMessage() {
  console.log('sendMessage called');
  const prompt = promptInput.value.trim();
  const imageFile = imageInput.files[0];

  if (!prompt && !imageFile) {
    console.warn("No prompt or image provided");
    return;
  }

  let imageData = null;
  let thinking = null;

  const vercelApiUrl = "https://chatbot-wp-one.vercel.app/api/gemini"; // Đảm bảo URL này chính xác

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = async () => {
      console.log('FileReader onload triggered');
      imageData = reader.result;
      const base64 = imageData.split(",")[1];
      if (!base64) {
        console.error("Invalid image data");
        updateMessage(thinking, "❌ Error: Invalid image data.");
        return;
      }
      const mimeType = imageFile.type;
      addMessage("You", prompt || "", false, imageData);
      thinking = addMessage("Bot", "<em>Thinking...</em>", true);

      const body = {
        prompt: prompt || "",
        history,
        image: { data: base64, mimeType }
      };

      try {
        console.log('Sending request to Vercel API');
        const res = await fetch(vercelApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "API error");
        const reply = data.reply || "No response.";
        console.log('Received reply:', reply);
        updateMessage(thinking, formatMarkdown(reply));
        history.push({ role: "user", parts: [{ text: prompt || "[Image]" }] });
        history.push({ role: "model", parts: [{ text: reply }] });
        saveToLocal(prompt || "[Image]", imageData);
        promptInput.value = "";
        imageInput.value = "";
        fileNameSpan.textContent = "";
      } catch (err) {
        console.error("API error:", err);
        updateMessage(thinking, `❌ Error: ${err.message || "Unable to call API."}`);
      }
    };
    reader.onerror = () => {
      console.error("FileReader error");
      updateMessage(thinking, "❌ Error: Unable to read image file.");
    };
    reader.readAsDataURL(imageFile);
  } else {
    addMessage("You", prompt, false);
    thinking = addMessage("Bot", "<em>Thinking...</em>", true);

    const body = {
      prompt,
      history,
    };

    try {
      console.log('Sending request to Vercel API (no image)');
      const res = await fetch(vercelApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API error");
      const reply = data.reply || "No response.";
      console.log('Received reply:', reply);
      updateMessage(thinking, formatMarkdown(reply));
      history.push({ role: "user", parts: [{ text: prompt }] });
      history.push({ role: "model", parts: [{ text: reply }] });
      saveToLocal(prompt);
      promptInput.value = "";
    } catch (err) {
      console.error("API error:", err);
      updateMessage(thinking, `❌ Error: ${err.message || "Unable to call API."}`);
    }
  }
}

function addMessage(sender, text, isHTML = false, imageData = null) {
  console.log(`addMessage: sender=${sender}, text=${text}, hasImage=${!!imageData}`);
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender.toLowerCase()}`;
  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = isHTML ? text : escapeHTML(text || "");

  if (sender === "You" && imageData && imageData.startsWith("data:image/")) {
    const img = document.createElement("img");
    img.src = imageData;
    img.alt = "Uploaded image";
    contentDiv.appendChild(img);
  }

  msgDiv.appendChild(contentDiv);

  if (sender === "Bot") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(contentDiv.textContent);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    };
    msgDiv.appendChild(copyBtn);
  }

  messagesDiv.appendChild(msgDiv);
  setTimeout(() => {
    messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" });
  }, 0);
  updateToBottomButton();
  return contentDiv;
}

function updateMessage(node, newText) {
  console.log('updateMessage called');
  node.innerHTML = newText;
  setTimeout(() => {
    messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" });
  }, 0);
  updateToBottomButton();
}

function scrollToBottom() {
  console.log('scrollToBottom called');
  messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" });
}

function updateToBottomButton() {
  const isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 10;
  if (toBottomBtn) { // Thêm kiểm tra này để đảm bảo nút tồn tại
    toBottomBtn.style.display = isAtBottom ? "none" : "block";
  }
}

function newChat() {
  console.log('newChat called');
  const sessionId = `${localKeyPrefix}${Date.now()}`;
  const saved = history.map(h => ({
    sender: h.role === "user" ? "You" : "Bot",
    text: h.parts[0]?.text || "",
  }));
  try {
    localStorage.setItem(sessionId, JSON.stringify(saved));
  } catch (e) {
    console.error("Error saving session:", e);
  }
  messagesDiv.innerHTML = "";
  history = [];
  localStorage.removeItem(`${localKeyPrefix}current`);
  promptInput.value = "";
  imageInput.value = "";
  fileNameSpan.textContent = "";
  updateToBottomButton();
}

function showHistory() {
  console.log('showHistory called');
  const modal = document.getElementById("history-modal");
  const historyContent = document.getElementById("history-content");
  historyContent.innerHTML = "";

  const sessions = Object.keys(localStorage)
    .filter(key => key.startsWith(localKeyPrefix))
    .sort((a, b) => b.localeCompare(a));

  if (sessions.length === 0) {
    historyContent.innerHTML = "<p>There is no history.</p>";
  } else {
    sessions.forEach(sessionId => {
      try {
        const parsed = JSON.parse(localStorage.getItem(sessionId));
        if (Array.isArray(parsed)) {
          const sessionDiv = document.createElement("div");
          sessionDiv.style.marginBottom = "24px";
          sessionDiv.innerHTML = `<h3>Session ${new Date(parseInt(sessionId.replace(localKeyPrefix, ""))).toLocaleString()}</h3>`;
          parsed.forEach(msg => {
            if (msg.sender && typeof msg.text === "string") {
              const msgDiv = document.createElement("div");
              msgDiv.className = `msg ${msg.sender.toLowerCase()}`;
              const contentDiv = document.createElement("div");
              contentDiv.innerHTML = formatMarkdown(msg.text);
              if (msg.image && msg.sender === "You") {
                const img = document.createElement("img");
                img.src = msg.image;
                img.alt = "Uploaded image";
                img.style.maxWidth = "100%";
                contentDiv.appendChild(img);
              }
              msgDiv.appendChild(contentDiv);
              sessionDiv.appendChild(msgDiv);
            }
          });
          historyContent.appendChild(sessionDiv);
        }
      } catch (e) {
        console.error("Error parsing session:", e);
      }
    });
  }
  if (modal) { // Kiểm tra modal tồn tại
    modal.style.display = "block";
  }
}

function closeHistory() {
  console.log('closeHistory called');
  const modal = document.getElementById("history-modal");
  if (modal) { // Kiểm tra modal tồn tại
    modal.style.display = "none";
  }
}

function resetChat() {
  console.log('resetChat called');
  messagesDiv.innerHTML = "";
  history = [];
  localStorage.removeItem(`${localKeyPrefix}current`);
  promptInput.value = "";
  imageInput.value = "";
  fileNameSpan.textContent = "";
  updateToBottomButton();
}

// Hàm toggleDarkMode đã bị loại bỏ hoàn toàn
// function toggleDarkMode() {
//   console.log('toggleDarkMode called');
//   if (document.body) {
//     document.body.classList.toggle("dark");
//     try {
//       localStorage.setItem("darkMode", document.body.classList.contains("dark"));
//     } catch (e) {
//       console.error("Error saving darkMode to localStorage:", e);
//     }
//   } else {
//     console.warn("document.body not available for toggling dark mode.");
//   }
// }

function formatMarkdown(text) {
  console.log('formatMarkdown called');
  if (!text || typeof text !== "string") return "";
  try {
    return text
    // Headers: # H1, ## H2, ### H3...
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")

    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")

    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")

    // Blockquote
    .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")

    // Unordered lists
    .replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>") // wrap list items in <ul>

    // Line breaks
    .replace(/\n{2,}/g, "</p><p>")   // đoạn văn mới
    .replace(/\n/g, "<br>")          // xuống dòng trong đoạn

    // Wrap entire text in <p>
    .replace(/^/, "<p>").concat("</p>");
  } catch (e) {
    console.error("Error in formatMarkdown:", e);
    return escapeHTML(text);
  }
}

function escapeHTML(str) {
  console.log('escapeHTML called');
  if (!str || typeof str !== "string") return "";
  return str.replace(/[&<>\"'`]/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "`": "&#96;"
  }[tag]));
}

function saveToLocal(text, imageData = null) {
  console.log('saveToLocal called');
  const saved = history.map(h => ({
    sender: h.role === "user" ? "You" : "Bot",
    text: h.parts[0]?.text || "",
    image: h.role === "user" ? imageData : null
  }));
  try {
    localStorage.setItem(`${localKeyPrefix}current`, JSON.stringify(saved));
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    console.log('Enter key pressed, calling sendMessage');
    sendMessage();
  }
});

imageInput.addEventListener("change", () => {
  console.log('imageInput changed');
  fileNameSpan.textContent = imageInput.files.length > 0 ? imageInput.files[0].name : "";
});

messagesDiv.addEventListener("scroll", updateToBottomButton);

// Cập nhật các hàm được gắn vào window để loại bỏ toggleDarkMode
window.sendMessage = sendMessage;
window.resetChat = resetChat;
// window.toggleDarkMode = toggleDarkMode; // Bỏ dòng này
window.newChat = newChat;
window.showHistory = showHistory;
window.closeHistory = closeHistory;
window.scrollToBottom = scrollToBottom;
