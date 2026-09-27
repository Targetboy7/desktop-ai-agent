const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'conversations.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        mode TEXT DEFAULT 'chat',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        starred INTEGER DEFAULT 0
      )`, (err) => {
        if (err) return reject(err);

        db.run(`CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversationId TEXT,
          role TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(conversationId) REFERENCES conversations(id)
        )`, (err2) => {
          if (err2) return reject(err2);

          db.run(`CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            name TEXT,
            template TEXT,
            category TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err3) => {
            if (err3) return reject(err3);

            db.run(`CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT
            )`, (err4) => {
              if (err4) return reject(err4);
              resolve();
            });
          });
        });
      });
    });
  });
}

function seedDefaults() {
  const defaults = [
    {
      id: 'summarize',
      name: 'Summarize',
      category: 'work',
      template: 'Summarize this clearly and concisely. Highlight the main action, key points, and next steps.'
    },
    {
      id: 'rewrite',
      name: 'Rewrite',
      category: 'work',
      template: 'Rewrite this in a professional, clear, and natural tone without changing the meaning.'
    },
    {
      id: 'tasks',
      name: 'Extract Tasks',
      category: 'work',
      template: 'Extract all tasks, action items, and deadlines from this text. Return a clean checklist.'
    },
    {
      id: 'explain',
      name: 'Explain',
      category: 'work',
      template: 'Explain this in plain language with a short example and the key takeaway.'
    },
    {
      id: 'draft',
      name: 'Draft Reply',
      category: 'work',
      template: 'Draft a concise, professional reply based on the context. Keep it suitable for email or chat.'
    }
  ];

  return Promise.all(
    defaults.map((prompt) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT id FROM prompts WHERE id = ?', [prompt.id], (err, row) => {
          if (err) return reject(err);
          if (row) return resolve();

          db.run(
            'INSERT INTO prompts (id, name, template, category) VALUES (?, ?, ?, ?)',
            [prompt.id, prompt.name, prompt.template, prompt.category],
            (insertErr) => {
              if (insertErr) reject(insertErr);
              else resolve();
            }
          );
        });
      });
    })
  );
}

const dbPromise = {
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  }),

  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),

  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  })
};

module.exports = {
  db,
  dbPromise,
  initDatabase,
  seedDefaults,
};
