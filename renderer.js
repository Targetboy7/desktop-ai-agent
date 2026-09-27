const state = {
  conversations: [],
  currentConversationId: null,
  prompts: [],
};

const promptListEl = document.getElementById('prompt-list');
const conversationListEl = document.getElementById('conversation-list');
const chatWindowEl = document.getElementById('chat-window');
const chatTitleEl = document.getElementById('chat-title');
const contextEl = document.getElementById('context');
const promptEl = document.getElementById('prompt');
const statusEl = document.getElementById('status');
const askBtn = document.getElementById('ask-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const copyBtn = document.getElementById('copy-btn');
const emailBtn = document.getElementById('email-btn');
const shareBtn = document.getElementById('share-btn');
const closeBtn = document.getElementById('close-btn');
const clearBtn = document.getElementById('clear-btn');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#fca5a5' : '#bfdbfe';
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPromptLibrary() {
  promptListEl.innerHTML = '';

  state.prompts.forEach((prompt) => {
    const button = document.createElement('button');
    button.className = 'prompt-chip';
    button.textContent = prompt.name;
    button.addEventListener('click', () => {
      const current = promptEl.value.trim();
      const suffix = current ? `\n\n${current}` : '';
      promptEl.value = `${prompt.template}${suffix}`;
      promptEl.focus();
    });
    promptListEl.appendChild(button);
  });
}

function renderConversations() {
  conversationListEl.innerHTML = '';

  state.conversations.forEach((conversation) => {
    const item = document.createElement('button');
    item.className = `conversation-item ${conversation.id === state.currentConversationId ? 'active' : ''}`;
    item.textContent = conversation.title || 'Untitled chat';
    item.addEventListener('click', async () => {
      await openConversation(conversation.id);
    });
    conversationListEl.appendChild(item);
  });
}

function renderMessages(messages = []) {
  chatWindowEl.innerHTML = '';

  if (!messages.length) {
    chatWindowEl.innerHTML = '<div class="empty-state">Start a new conversation. Try: summarize, rewrite, explain, or extract tasks.</div>';
    return;
  }

  messages.forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = `message ${msg.role}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = msg.role === 'assistant' ? 'Assistant' : 'You';

    const text = document.createElement('div');
    text.className = 'message-text';
    text.innerHTML = escapeHtml(msg.content || '').replace(/\n/g, '<br>');

    bubble.appendChild(label);
    bubble.appendChild(text);
    chatWindowEl.appendChild(bubble);
  });

  chatWindowEl.scrollTop = chatWindowEl.scrollHeight;
}

async function refreshHistory() {
  const conversations = await window.desktopAgent.getHistory();
  state.conversations = conversations;
  renderConversations();

  if (!state.currentConversationId && conversations.length) {
    await openConversation(conversations[0].id);
  }
}

async function loadPrompts() {
  const prompts = await window.desktopAgent.listPrompts();
  state.prompts = prompts;
  renderPromptLibrary();
}

async function openConversation(conversationId) {
  const result = await window.desktopAgent.loadConversation(conversationId);
  state.currentConversationId = conversationId;
  chatTitleEl.textContent = (state.conversations.find((c) => c.id === conversationId)?.title) || 'Chat';
  renderMessages(result.messages || []);
  renderConversations();
}

async function newConversation() {
  const id = await window.desktopAgent.newConversation();
  state.currentConversationId = id;
  chatTitleEl.textContent = 'New chat';
  renderMessages([]);
  await refreshHistory();
}

async function askAgent() {
  const userPrompt = promptEl.value.trim();
  const context = contextEl.value.trim();

  if (!userPrompt) {
    setStatus('Type a message first.', true);
    return;
  }

  const conversationId = state.currentConversationId || await window.desktopAgent.newConversation();
  state.currentConversationId = conversationId;

  setStatus('Thinking...');
  const currentText = promptEl.value;
  promptEl.value = '';

  const result = await window.desktopAgent.askAgent({
    conversationId,
    prompt: currentText,
    context,
    mode: 'chat',
  });

  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (conversation) {
    conversation.title = conversation.title || 'Chat';
  }

  await refreshHistory();
  await openConversation(conversationId);
  contextEl.value = '';
  setStatus('Done');
}

async function copyCurrentAnswer() {
  const lastAssistant = [...document.querySelectorAll('.message.assistant .message-text')].at(-1)?.textContent || '';
  if (!lastAssistant) {
    setStatus('No answer to copy yet.', true);
    return;
  }

  await window.desktopAgent.copyText(lastAssistant);
  setStatus('Copied to clipboard');
}

async function shareEmail() {
  const lastAssistant = [...document.querySelectorAll('.message.assistant .message-text')].at(-1)?.textContent || '';
  if (!lastAssistant) {
    setStatus('No answer to share yet.', true);
    return;
  }

  await window.desktopAgent.shareEmail(lastAssistant);
  setStatus('Opening email draft');
}

async function shareSlack() {
  const lastAssistant = [...document.querySelectorAll('.message.assistant .message-text')].at(-1)?.textContent || '';
  if (!lastAssistant) {
    setStatus('No answer to share yet.', true);
    return;
  }

  await window.desktopAgent.shareSlack(lastAssistant);
  setStatus('Opening Slack');
}

function clearInputs() {
  contextEl.value = '';
  promptEl.value = '';
  setStatus('Ready');
}

newChatBtn.addEventListener('click', newConversation);
askBtn.addEventListener('click', askAgent);
clearBtn.addEventListener('click', clearInputs);
copyBtn.addEventListener('click', copyCurrentAnswer);
emailBtn.addEventListener('click', shareEmail);
shareBtn.addEventListener('click', shareSlack);
closeBtn.addEventListener('click', () => window.desktopAgent.toggleWindow());

promptEl.addEventListener('keydown', async (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    await askAgent();
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  await window.desktopAgent.initDatabase();
  await loadPrompts();
  await refreshHistory();
  promptEl.focus();
  setStatus('Ready');
});
