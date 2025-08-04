<div id="chatbox">
  <div id="messages"></div>
  <button id="to-bottom-btn" onclick="scrollToBottom()">ꜜ &#42780;</button>
  <div class="input-container">
    <select id="model-select">
		<option value="gemini-2.0-pro" selected>gemini-2.0-pro</option>
      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
		<option value="gemini-2.5-flash-lite" selected>Gemini 2.5 Flash-Lite</option>
      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
		<option value="gemini-2.0-flash-lite" selected>Gemini 2.0 Flash Lite</option>
      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
      </select>
    <label class="file-upload">
      Upload
      <input type="file" id="imageInput" accept="image/png, image/jpeg, image/webp">
    </label>
    <span id="file-name" class="file-name"></span>
    <textarea id="prompt" placeholder="Ask anything (Enter to send, Shift+Enter to go to new line)"></textarea>
    <div id="controls">
      <button class="submitbtn" onclick="sendMessage()">Send</button>
      <button onclick="newChat()">New Chat</button>
      <button onclick="showHistory()">History</button>
      <button onclick="resetChat()">Clear</button>
    </div>
  </div>
  <div id="history-modal">
    <div>
      <div class="modal-header">
        <h2 style="margin-bottom: 16px;">Chat History</h2>
        <button onclick="closeHistory()" class="modal-close-btn">Close</button>
      </div>
      <div id="history-content"></div>
    </div>
  </div>
</div>
