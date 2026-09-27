const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk');

dotenv.config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    frame: false,
    transparent: false,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.hide();

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app-ready');
  });
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('ANTHROPIC_API_KEY is missing. Add it in your shell or .env file.');
  }

  return new Anthropic({ apiKey });
}

function buildSystemPrompt() {
  return `You are a helpful desktop AI assistant for daily work.

Your job:
- Summarize text clearly and concisely
- Rewrite messages in a professional, friendly, or casual style
- Extract action items, deadlines, and priorities
- Draft simple replies
- Explain code or documents in plain language
- Answer questions based on the provided content

Rules:
- Be practical and direct.
- Keep the answer concise unless the user asks for more detail.
- Ask before sending, deleting, paying, or changing anything important.
- Never claim a real action was completed unless it actually happened.
- If the request is unclear, ask one clarifying question.
- Default to a professional but approachable tone.`;
}

ipcMain.handle('ask-agent', async (_, { prompt, context }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('Missing Anthropic API key. Set ANTHROPIC_API_KEY before running the app.');
  }

  const client = getAnthropicClient();
  const userInput = context ? `Context:\n${context}\n\nUser question:\n${prompt}` : prompt;

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1200,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: userInput }],
  });

  const content = response.content || [];
  const text = content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n');

  if (!text) {
    throw new Error('No response text was received from Claude.');
  }

  return text;
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
  const payload = encodeURIComponent(text || '');
  shell.openExternal(`https://slack.com/intl/en-gb/`);
  return true;
});

ipcMain.handle('toggle-window', () => {
  toggleWindow();
  return true;
});

app.whenReady().then(() => {
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
