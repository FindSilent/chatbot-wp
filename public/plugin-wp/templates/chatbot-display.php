<div id="chatbox">
  <div id="messages"></div>
  <button id="to-bottom-btn" onclick="scrollToBottom()">ꜜ &#42780;</button>
  <div class="input-container">
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
