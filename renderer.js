const statusEl = document.getElementById('status');
const promptEl = document.getElementById('prompt');
const contextEl = document.getElementById('context');
const answerEl = document.getElementById('answer');
const askBtn = document.getElementById('ask-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');
const emailBtn = document.getElementById('email-btn');
const slackBtn = document.getElementById('slack-btn');
const closeBtn = document.getElementById('close-btn');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ff8c8c' : '#a7f3d0';
}

async function askAgent() {
  const prompt = promptEl.value.trim();
  const context = contextEl.value.trim();

  if (!prompt) {
    setStatus('Please type a prompt first.', true);
    return;
  }

  setStatus('Thinking...');
  answerEl.value = '';

  try {
    const result = await window.desktopAgent.askClaude(prompt, context);
    answerEl.value = result;
    setStatus('Done');
  } catch (error) {
    const msg = error && error.message ? error.message : 'Something went wrong.';
    answerEl.value = `Error:\n${msg}`;
    setStatus('Error', true);
  }
}

async function copyAnswer() {
  if (!answerEl.value.trim()) {
    setStatus('No answer to copy yet.', true);
    return;
  }

  try {
    await window.desktopAgent.copyText(answerEl.value);
    setStatus('Copied to clipboard');
  } catch (error) {
    setStatus('Copy failed', true);
  }
}

async function shareEmail() {
  if (!answerEl.value.trim()) {
    setStatus('No answer to share yet.', true);
    return;
  }

  try {
    await window.desktopAgent.shareEmail(answerEl.value);
    setStatus('Opening email draft');
  } catch (error) {
    setStatus('Email share failed', true);
  }
}

async function shareSlack() {
  if (!answerEl.value.trim()) {
    setStatus('No answer to share yet.', true);
    return;
  }

  try {
    await window.desktopAgent.shareSlack(answerEl.value);
    setStatus('Opening Slack');
  } catch (error) {
    setStatus('Slack share failed', true);
  }
}

function clearFields() {
  promptEl.value = '';
  contextEl.value = '';
  answerEl.value = '';
  setStatus('Ready');
  promptEl.focus();
}

askBtn.addEventListener('click', askAgent);
clearBtn.addEventListener('click', clearFields);
copyBtn.addEventListener('click', copyAnswer);
emailBtn.addEventListener('click', shareEmail);
slackBtn.addEventListener('click', shareSlack);
closeBtn.addEventListener('click', () => window.desktopAgent.toggleWindow());

promptEl.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    askAgent();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  promptEl.focus();
  setStatus('Ready');
});
