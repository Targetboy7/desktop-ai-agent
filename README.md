# Desktop AI Agent

A lightweight desktop AI assistant built with Electron and Claude API. It gives you a floating "Ask & Share" panel for daily work tasks such as summarizing, rewriting, extracting action items, and drafting replies.

## Features

- Floating desktop window
- Global hotkey: `Ctrl+Shift+A` / `Cmd+Shift+A`
- Claude API integration
- Copy result to clipboard
- Share result via email or Slack
- Optional text context before asking a question

## Quick start

1. Install Node.js 18+.
2. Install project dependencies:

```bash
npm install
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Add your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_actual_key_here
```

5. Start the app:

```bash
npm start
```

## Usage

- Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on macOS) to open/close the floating window.
- Paste or type context in the first box.
- Type your prompt in the second box.
- Click "Ask AI".
- Copy, email, or share the answer.

## Prompt ideas

- Summarize this email.
- Rewrite this in a professional tone.
- Extract action items and deadlines.
- Tell me the main decision in this note.
- Explain this code in plain English.

## Important security note

Do not commit real API keys. Keep them in `.env` or your shell environment, and never check them into Git.

## Repository status

This project is a starter desktop agent for daily work. You can extend it with:

- a tray icon
- voice input
- system-level text selection capture
- local history
- custom prompts
- Windows/macOS packaging

## License

MIT
