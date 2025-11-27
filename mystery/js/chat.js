const chatLog = document.getElementById('chat-log');
const userColors = {
    'LogicMaster': '#569cd6', 'OccultGirl': '#ce9178',
    'NetStalker': '#4ec9b0', 'System': '#ff3333'
};

function addChatMessage(name, message, type = 'normal') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${type}`;
    const initial = name.substring(0, 1).toUpperCase();
    const color = userColors[name] || '#888';
    
    msgDiv.innerHTML = `
        <div class="user-icon" style="background-color: ${color}">${initial}</div>
        <div class="msg-content">
            <span class="user-name" style="color: ${color}">${name}</span>
            <span class="message-text">${message}</span>
        </div>
    `;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}