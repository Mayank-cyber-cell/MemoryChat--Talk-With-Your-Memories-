# Chat Analyzer Setup

This project uses a Node.js/Express backend with SQLite database.

## Installation & Running

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Install Backend Dependencies
```bash
npm run server:install
```

### 3. Run Backend Server (in a new terminal)
```bash
npm run server:dev
```

The server will start on `http://localhost:5000`

### 4. Run Frontend (in another terminal)
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Backend Setup

The backend creates a SQLite database automatically in `server/chat_app.db` on first run.

### Database Schema

**Users Table**
- id (UUID)
- email (unique)
- password_hash
- created_at

**Chat Sessions Table**
- id (UUID)
- user_id (foreign key)
- session_name
- chat_platform (whatsapp, telegram, manual)
- total_messages
- personality_traits (JSON)
- conversation_insights (JSON)
- analysis_complete
- created_at

**Parsed Messages Table**
- id (UUID)
- session_id (foreign key)
- user_id (foreign key)
- sender_name
- message_text
- timestamp
- message_order

### API Endpoints

**Authentication**
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

**Chat Operations**
- `POST /api/chat/upload` - Upload and parse chat
- `GET /api/chat/sessions` - Get all user's chat sessions
- `GET /api/chat/sessions/:sessionId/messages` - Get messages from session

All endpoints except signup/login require Bearer token in Authorization header.

## Environment Variables

Frontend: Uses `.env` file (already configured)
Backend: Create `server/.env` from `server/.env.example`

```
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

Change `JWT_SECRET` in production!

## Troubleshooting

**Port already in use**: Change PORT in `server/.env`
**Database locked**: Delete `server/chat_app.db` and restart
**CORS errors**: Backend is configured to accept requests from localhost:5173

All set! The app is now using SQLite instead of Supabase.
