# Desktop AI Agent

A lightweight desktop AI assistant built with Electron and Claude API, upgraded into a personal work workspace with chat history, prompt presets, and a modern ChatGPT-like layout.

## Features

- Floating desktop workspace
- Personal conversation history stored locally
- Prompt library for daily tasks
- Global hotkey: `Ctrl+Shift+A` / `Cmd+Shift+A`
- Claude API integration
- Copy, email, and share actions
- Local memory and chat flow for daily work

## Quick start

1. Install Node.js 18+.
2. Install dependencies:

```bash
npm install
```

3. Create `.env` from the example:

```bash
cp .env.example .env
```

4. Add your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_actual_key_here
```

5. Run the app:

```bash
npm start
```

## Usage

- Press `Ctrl+Shift+A` to open or hide the app.
- Use the left panel to pick prompt templates.
- Create a new conversation from the top left.
- Paste context or select text, then ask for help.
- Copy, email, or share the generated answer.

## Included work modes

- Summarize
- Rewrite
- Extract tasks
- Explain
- Draft reply

## Notes

This personal AI workspace stores conversations locally in your user data folder and uses your own Claude API key. It is meant as a desktop personal assistant, not a multi-user team app.

## License

MIT
