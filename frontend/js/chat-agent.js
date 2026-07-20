// ═══════════════════════════════════════════════════════
// VibeNORMA AI Chat Agent — Integrates with 28 law PDFs
// ═══════════════════════════════════════════════════════

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://vibenos-api-production.up.railway.app';

let chatHistory = [];

async function chatSend() {
  const inp = document.getElementById('chat-input');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  appendChat('user', msg);
  appendChat('assistant', 'Analyzing normativa chilena...');

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: chatHistory })
    });
    const data = await res.json();

    // Remove typing indicator
    const msgs = document.getElementById('chat-messages');
    msgs.removeChild(msgs.lastChild);

    appendChat('assistant', data.reply, data.sources);
    chatHistory.push({ role: 'user', content: msg });
    chatHistory.push({ role: 'assistant', content: data.reply });
  } catch (err) {
    const msgs = document.getElementById('chat-messages');
    msgs.removeChild(msgs.lastChild);
    appendChat('assistant', 'Error connecting to AI agent. Make sure the backend is running.');
  }
}

function appendChat(role, text, sources) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg chat-${role}`;

  const avatar = role === 'user' ? '👤' : '🤖';
  const name = role === 'user' ? 'Tú' : 'VibeNORMA Agent';

  let sourcesHtml = '';
  if (sources && sources.length) {
    sourcesHtml = `<div class="chat-sources">Fuentes: ${sources.join(', ')}</div>`;
  }

  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-avatar">${avatar}</span>
      <span class="chat-name">${name}</span>
    </div>
    <div class="chat-msg-body">${text.replace(/\n/g, '<br>')}</div>
    ${sourcesHtml}
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatSend();
  }
}
