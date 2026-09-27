const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, shell } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk');
const { initDatabase, seedDefaults, dbPromise } = require('./database');
const crypto = require('crypto');

dotenv.config();

let mainWindow;

function createId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    frame: false,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
}

function toggleWindow() {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide();
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('ANTHROPIC_API_KEY is missing. Add it to your .env file or shell environment.');
  }
  return new Anthropic({ apiKey });
}

function buildSystemPrompt() {
  return `You are a practical daily-work AI assistant.

Your responsibilities:
- Summarize text clearly and quickly
- Rewrite emails or notes into a better tone
- Extract tasks, deadlines, and action items
- Explain concepts in plain language
- Draft replies and messages
- Help with decision-making and prioritization

Rules:
- Be concise and useful.
- Prefer direct answers.
- Ask before taking a risky action.
- Never claim an action was completed unless it really happened.
- Keep outputs professional but approachable.
- When content is unclear, ask one short clarifying question.`;
}

async function ensureConversation(id, title = 'New chat') {
  const existing = await dbPromise.get('SELECT id FROM conversations WHERE id = ?', [id]);
  if (!existing) {
    await dbPromise.run(
      'INSERT INTO conversations (id, title, mode, createdAt, updatedAt) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [id, title, 'chat']
    );
  }
}

async function createConversation(title = 'New chat') {
  const id = createId('conv');
  await ensureConversation(id, title);
  return id;
}

async function getConversationList() {
  return dbPromise.all('SELECT * FROM conversations ORDER BY updatedAt DESC');
}

async function getConversationMessages(conversationId) {
  return dbPromise.all(
    'SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC',
    [conversationId]
  );
}

async function saveMessage(conversationId, role, content) {
  const id = createId(role === 'user' ? 'msg' : 'bot');
  await dbPromise.run(
    'INSERT INTO messages (id, conversationId, role, content, timestamp) VALUES (?, ?, ?, ?, datetime("now"))',
    [id, conversationId, role, content]
  );

  await dbPromise.run(
    'UPDATE conversations SET updatedAt = datetime("now") WHERE id = ?',
    [conversationId]
  );

  return { id, conversationId, role, content };
}

async function saveSetting(key, value) {
  await dbPromise.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
  return { key, value };
}

async function getSetting(key, fallback = '') {
  const row = await dbPromise.get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

async function listPromptTemplates() {
  return dbPromise.all('SELECT * FROM prompts ORDER BY category, name ASC');
}

async function ensureDefaultSettings() {
  await saveSetting('activeModel', 'claude-3-5-haiku-20241022');
  await saveSetting('systemPrompt', buildSystemPrompt());
}

ipcMain.handle('init-database', async () => {
  await initDatabase();
  await seedDefaults();
  await ensureDefaultSettings();
  return true;
});

ipcMain.handle('list-conversations', async () => {
  return getConversationList();
});

ipcMain.handle('new-conversation', async () => {
  return createConversation('New chat');
});

ipcMain.handle('load-conversation', async (_, conversationId) => {
  const messages = await getConversationMessages(conversationId);
  return { conversationId, messages };
});

ipcMain.handle('ask-agent', async (_, { conversationId, prompt, context, mode = 'chat' }) => {
  const validId = conversationId || (await createConversation('New chat'));

  const input = context ? `Context:\n${context}\n\nUser request:\n${prompt}` : prompt;

  const historyRows = await getConversationMessages(validId);
  const messages = historyRows.map((row) => ({
    role: row.role,
    content: row.content,
  }));

  messages.push({ role: 'user', content: input });

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: await getSetting('activeModel', 'claude-3-5-haiku-20241022'),
    max_tokens: 1400,
    system: await getSetting('systemPrompt', buildSystemPrompt()),
    messages,
  });

  const text = (response.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n');

  if (!text) {
    throw new Error('No response text was received from Claude.');
  }

  await saveMessage(validId, 'user', input);
  await saveMessage(validId, 'assistant', text);

  const conversation = await dbPromise.get('SELECT title FROM conversations WHERE id = ?', [validId]);
  if (!conversation || !conversation.title || conversation.title === 'New chat') {
    const titleText = prompt.length > 32 ? `${prompt.slice(0, 32)}...` : prompt;
    await dbPromise.run('UPDATE conversations SET title = ? WHERE id = ?', [titleText, validId]);
  }

  return { conversationId: validId, response: text };
});

ipcMain.handle('list-prompts', async () => {
  return listPromptTemplates();
});

ipcMain.handle('save-setting', async (_, { key, value }) => {
  return saveSetting(key, value);
});

ipcMain.handle('get-setting', async (_, key, fallback = '') => {
  return getSetting(key, fallback);
});

ipcMain.handle('copy-text', (_, text) => {
  clipboard.writeText(text || '');
  return true;
});

ipcMain.handle('share-email', (_, text) => {
  const subject = encodeURIComponent('AI assistant result');
  const body = encodeURIComponent(text || '');
  shell.openExternal(`mailto:?subject=${subject}&body=${body}`);
  return true;
});

ipcMain.handle('share-slack', (_, text) => {
  shell.openExternal('https://slack.com/intl/en-gb/');
  return text || '';
});

ipcMain.handle('toggle-window', () => {
  toggleWindow();
  return true;
});

app.whenReady().then(async () => {
  await initDatabase();
  await seedDefaults();
  await ensureDefaultSettings();

  createWindow();

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    toggleWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
