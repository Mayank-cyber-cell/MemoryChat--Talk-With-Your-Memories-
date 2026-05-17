import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuid } from 'uuid';
import db from './db.js';
import { authMiddleware, signup, login } from './auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Parse chat functions
function parseWhatsAppChat(content) {
  const messages = [];
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

    messages.push({
      timestamp: parseWhatsAppDate(date, time),
      sender: cleanSender,
      text: cleanText
    });
  }

  return messages;
}

function parseTelegramChat(content) {
  const messages = [];
  const lines = content.split('\n');
  const headerRegex = /^\[(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})\]\s*([^:]+?):\s*(.*)/;

  let currentMsg = null;

  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      if (currentMsg) messages.push(currentMsg);
      const [, datetime, sender, text] = match;
      currentMsg = {
        timestamp: parseTelegramDate(datetime),
        sender: sender.trim(),
        text: text.trim()
      };
    } else if (currentMsg && line.trim()) {
      currentMsg.text += '\n' + line.trim();
    }
  }

  if (currentMsg) messages.push(currentMsg);
  return messages;
}

function parseManualChat(content) {
  const messages = [];
  const lines = content.split('\n').filter(l => l.trim());
  const nameColonRegex = /^([A-Za-z][A-Za-z0-9 _-]{0,30}):\s+(.+)/;

  const hasNamePattern = lines.filter(l => nameColonRegex.test(l)).length >= Math.min(3, lines.length * 0.3);

  if (hasNamePattern) {
    let currentSender = '';
    let currentParts = [];

    for (const line of lines) {
      const match = line.match(nameColonRegex);
      if (match) {
        if (currentSender && currentParts.length) {
          messages.push({ timestamp: null, sender: currentSender, text: currentParts.join(' ').trim() });
        }
        currentSender = match[1].trim();
        currentParts = [match[2]];
      } else if (currentSender) {
        currentParts.push(line);
      }
    }
    if (currentSender && currentParts.length) {
      messages.push({ timestamp: null, sender: currentSender, text: currentParts.join(' ').trim() });
    }
  } else {
    let sender = 'You';
    for (const line of lines) {
      messages.push({ timestamp: null, sender, text: line.trim() });
      sender = sender === 'You' ? 'Them' : 'You';
    }
  }

  return messages;
}

function parseWhatsAppDate(date, time) {
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
  } catch (_e) {
    return null;
  }
}

function parseTelegramDate(datetime) {
  try {
    const [date, time] = datetime.split(' ');
    const [day, month, year] = date.split('.').map(Number);
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
  } catch (_e) {
    return null;
  }
}

// Auth routes
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = signup(email, password);
  if (result.success) {
    res.json({ success: true, token: result.token, userId: result.userId });
  } else {
    res.status(400).json({ error: result.error });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = login(email, password);
  if (result.success) {
    res.json({ success: true, token: result.token, userId: result.userId });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// Chat upload route
app.post('/api/chat/upload', authMiddleware, (req, res) => {
  try {
    const { chatText, platform, filename } = req.body;
    const userId = req.userId;

    if (!chatText || !platform) {
      return res.status(400).json({ error: 'Missing chatText or platform' });
    }

    let messages;
    if (platform === 'whatsapp') {
      messages = parseWhatsAppChat(chatText);
    } else if (platform === 'telegram') {
      messages = parseTelegramChat(chatText);
    } else {
      messages = parseManualChat(chatText);
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'No messages found in chat' });
    }

    const sessionId = uuid();
    const senders = [...new Set(messages.map(m => m.sender))];
    const sessionName = filename
      ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      : senders.slice(0, 2).join(' & ') || `${platform} Chat`;

    // Insert session
    const insertSessionStmt = db.prepare(`
      INSERT INTO chat_sessions
      (id, user_id, session_name, original_filename, chat_platform, total_messages, analysis_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertSessionStmt.run(sessionId, userId, sessionName, filename, platform, messages.length, 0);

    // Insert messages in batch
    const insertMessageStmt = db.prepare(`
      INSERT INTO parsed_messages
      (id, session_id, user_id, sender_name, message_text, timestamp, message_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((msgs) => {
      for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i];
        insertMessageStmt.run(
          uuid(),
          sessionId,
          userId,
          msg.sender,
          msg.text,
          msg.timestamp,
          i
        );
      }
    });

    insertMany(messages);

    res.json({
      success: true,
      sessionId,
      messageCount: messages.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat sessions
app.get('/api/chat/sessions', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM chat_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const sessions = stmt.all(req.userId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat messages
app.get('/api/chat/sessions/:sessionId/messages', authMiddleware, (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify ownership
    const sessionStmt = db.prepare('SELECT user_id FROM chat_sessions WHERE id = ?');
    const session = sessionStmt.get(sessionId);
    if (!session || session.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const stmt = db.prepare(`
      SELECT * FROM parsed_messages
      WHERE session_id = ?
      ORDER BY message_order ASC
    `);
    const messages = stmt.all(sessionId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
