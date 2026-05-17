import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";

// --- Backend Setup ---
const JWT_SECRET = process.env.JWT_SECRET || 'chat-analyzer-secret-key';
const dbPath = path.join(__dirname, 'server', 'chat_app.db');

let db: any;
try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_name TEXT NOT NULL,
      original_filename TEXT,
      chat_platform TEXT CHECK(chat_platform IN ('whatsapp', 'telegram', 'manual')),
      total_messages INTEGER DEFAULT 0,
      personality_traits JSON,
      conversation_insights JSON,
      analysis_complete BOOLEAN DEFAULT 0,
      is_archived BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS parsed_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message_text TEXT NOT NULL,
      timestamp DATETIME,
      message_order INTEGER NOT NULL,
      sentiment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_parsed_messages_session_id ON parsed_messages(session_id);
  `);
  console.log('Database initialized');
} catch (e) {
  console.error('Database init error:', e);
}

// --- Chat Parsers ---
function parseWhatsAppChat(content: string) {
  const messages: { timestamp: string | null; sender: string; text: string }[] = [];
  const bracketSplit = /(?=\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2})/;
  const dashSplit = /(?=\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s+-)/;
  const hasBrackets = /\[\d{1,2}\/\d{1,2}\/\d{2,4},/.test(content);
  const parts = content.split(hasBrackets ? bracketSplit : dashSplit).filter(p => p.trim());

  for (const part of parts) {
    let date = '', time = '', sender = '', text = '';
    if (hasBrackets) {
      const m = part.match(/^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s*([^:]+?):\s*([\s\S]*)/i);
      if (!m) continue;
      [, date, time, sender, text] = m;
    } else {
      const m = part.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\s+-\s*([^:]+?):\s*([\s\S]*)/i);
      if (!m) continue;
      [, date, time, sender, text] = m;
    }
    const cleanText = text.trim();
    const cleanSender = sender.trim();
    if (!cleanText || cleanSender === 'Messages and calls are end-to-end encrypted') continue;
    if (cleanText === '<Media omitted>' || cleanText === 'image omitted' || cleanText === 'video omitted') continue;
    messages.push({ timestamp: parseWhatsAppDate(date, time), sender: cleanSender, text: cleanText });
  }
  return messages;
}

function parseTelegramChat(content: string) {
  const messages: { timestamp: string | null; sender: string; text: string }[] = [];
  const lines = content.split('\n');
  const headerRegex = /^\[(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})\]\s*([^:]+?):\s*(.*)/;
  let currentMsg: { timestamp: string | null; sender: string; text: string } | null = null;
  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      currentMsg = { timestamp: parseTelegramDate(match[1]), sender: match[2].trim(), text: match[3].trim() };
    } else if (currentMsg && line.trim()) {
      currentMsg.text += '\n' + line.trim();
    }
  }
  if (currentMsg) messages.push(currentMsg);
  return messages;
}

function parseManualChat(content: string) {
  const messages: { timestamp: string | null; sender: string; text: string }[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  const nameColonRegex = /^([A-Za-z][A-Za-z0-9 _-]{0,30}):\s+(.+)/;
  const hasNamePattern = lines.filter(l => nameColonRegex.test(l)).length >= Math.min(3, lines.length * 0.3);
  if (hasNamePattern) {
    let currentSender = '';
    let currentParts: string[] = [];
    for (const line of lines) {
      const match = line.match(nameColonRegex);
      if (match) {
        if (currentSender && currentParts.length) messages.push({ timestamp: null, sender: currentSender, text: currentParts.join(' ').trim() });
        currentSender = match[1].trim();
        currentParts = [match[2]];
      } else if (currentSender) {
        currentParts.push(line);
      }
    }
    if (currentSender && currentParts.length) messages.push({ timestamp: null, sender: currentSender, text: currentParts.join(' ').trim() });
  } else {
    let sender = 'You';
    for (const line of lines) {
      messages.push({ timestamp: null, sender, text: line.trim() });
      sender = sender === 'You' ? 'Them' : 'You';
    }
  }
  return messages;
}

function parseWhatsAppDate(date: string, time: string): string | null {
  try {
    const [day, month, year] = date.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AP]M))?/i;
    const timeMatch = time.match(timeRegex);
    if (!timeMatch) return null;
    const [, hours, minutes, seconds = '0', period] = timeMatch;
    let hour = parseInt(hours);
    if (period) {
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }
    return new Date(fullYear, month - 1, day, hour, parseInt(minutes), parseInt(seconds)).toISOString();
  } catch { return null; }
}

function parseTelegramDate(datetime: string): string | null {
  try {
    const [date, time] = datetime.split(' ');
    const [day, month, year] = date.split('.').map(Number);
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
  } catch { return null; }
}

// --- Auth helpers ---
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// --- Express App ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth routes
app.post('/api/auth/signup', (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const userId = uuid();
    const passwordHash = bcryptjs.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(userId, email, passwordHash);
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, userId });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user: any = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
  if (!user || !bcryptjs.compareSync(password, user.password_hash)) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, userId: user.id });
});

// Chat routes
app.post('/api/chat/upload', authMiddleware, (req: any, res: any) => {
  try {
    const { chatText, platform, filename } = req.body;
    const userId = req.userId;
    if (!chatText || !platform) return res.status(400).json({ error: 'Missing chatText or platform' });

    let messages: { timestamp: string | null; sender: string; text: string }[];
    if (platform === 'whatsapp') messages = parseWhatsAppChat(chatText);
    else if (platform === 'telegram') messages = parseTelegramChat(chatText);
    else messages = parseManualChat(chatText);

    if (messages.length === 0) return res.status(400).json({ error: 'No messages found in chat' });

    const sessionId = uuid();
    const senders = [...new Set(messages.map(m => m.sender))];
    const sessionName = filename
      ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      : senders.slice(0, 2).join(' & ') || `${platform} Chat`;

    db.prepare(
      'INSERT INTO chat_sessions (id, user_id, session_name, original_filename, chat_platform, total_messages, analysis_complete) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(sessionId, userId, sessionName, filename, platform, messages.length, 0);

    const insertMsg = db.prepare(
      'INSERT INTO parsed_messages (id, session_id, user_id, sender_name, message_text, timestamp, message_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction((msgs: any[]) => {
      for (let i = 0; i < msgs.length; i++) {
        insertMsg.run(uuid(), sessionId, userId, msgs[i].sender, msgs[i].text, msgs[i].timestamp, i);
      }
    });
    insertMany(messages);

    res.json({ success: true, sessionId, messageCount: messages.length });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/sessions', authMiddleware, (req: any, res: any) => {
  try {
    const sessions = db.prepare('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(sessions);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chat/sessions/:sessionId/messages', authMiddleware, (req: any, res: any) => {
  try {
    const session: any = db.prepare('SELECT user_id FROM chat_sessions WHERE id = ?').get(req.params.sessionId);
    if (!session || session.user_id !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
    const messages = db.prepare('SELECT * FROM parsed_messages WHERE session_id = ? ORDER BY message_order ASC').all(req.params.sessionId);
    res.json(messages);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/health', (_req: any, res: any) => { res.json({ status: 'ok' }); });

// --- Vite Config ---
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use(app as any);
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
