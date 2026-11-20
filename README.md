# Connectly

A complete, production-style **real-time messaging platform** — one-to-one chat, group chats, file sharing, read receipts, reactions, notifications, an admin dashboard and a polished italic-typography UI.

**Stack:** React 19 + Vite + Tailwind CSS v4 · Node.js + Express · MongoDB (Mongoose) · Socket.IO · JWT (HTTP-only cookies) · bcrypt · Nodemailer · Cloudinary · Google sign-in.

---

## 1. Quick start (about 5 minutes)

**You need:** Node.js 18+ and a MongoDB (local install **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. install everything (root + server + client)
npm run install:all

# 2. create your server env file and fill it in
cp server/.env.example server/.env        # Windows: copy server\.env.example server\.env
#    → at minimum set MONGO_URI and JWT_SECRET (see section 3)

# 3. (optional) load demo users + example chats
npm run seed

# 4. start API (port 5000) and web app (port 5173) together
npm run dev
```

Open **http://localhost:5173**.

### Demo accounts (after `npm run seed`)

| Account | Email | Password | Role |
|---|---|---|---|
| Demo user (lots of chats) | `demo@connectly.app` | `Demo@12345` | user |
| Admin | `admin@connectly.app` | `Admin@12345` | admin |
| Other people | `aisha@`, `hamza@`, `sara@`, `bilal@`, `maryam@`, `zain@`, `fatima@` + `connectly.app` | `Demo@12345` | user |

The login page also has a **“Try the demo account”** button in development.
Open two browsers (or one normal + one private window), log in as two different users and chat to see everything in real time.

`npm run seed:reset` wipes users, conversations and messages and re-creates the demo data.

---

## 2. What's included

**Authentication & security**
- Register / login with email **or** username, bcrypt (cost 12) password hashing
- JWT stored in an **HTTP-only cookie** (not readable by JavaScript), sessions can be revoked
- **Email OTP verification** (6 digits, 10 min expiry, 5 attempts, resend cooldown)
- **Forgot password** with a single-use, hashed, 30-minute reset link (signs out all devices)
- **Continue with Google** (OAuth access token verified server-side)
- Logout (this device) and **sign out everywhere**
- Role-based access control: `user`, `moderator`, `admin`
- Helmet security headers + CSP, rate limiting (auth + global), input validation (express-validator), NoSQL-injection sanitising, upload type/size restrictions, no account enumeration on reset/resend

**Messaging**
- One-to-one chats, instant delivery over Socket.IO, online/offline presence, last seen
- Typing indicators, **sent → delivered → read** receipts (can be disabled in privacy settings)
- Reply, edit, delete (for me / for everyone), forward (up to 5 chats), emoji reactions
- Images, video, audio and documents (drag & drop, paste, up to 6 files × 15 MB), inline previews + lightbox
- Message search (inside a chat or across all chats) with jump-to-message
- Infinite scroll history, optimistic sending with retry on failure, drafts per chat

**Dashboard**
- Conversation list with unread counters, pinned chats (max 5), archive, mute, filters
- Contact / group info panel with shared media
- Profile: picture, name, username, bio, custom status, location, website
- Settings: appearance (light/dark/system + 6 accent colours), notifications (sound, browser, previews, groups), privacy, security, delete account
- Fully responsive: desktop 3-pane layout, mobile bottom navigation

**Groups**
- Create groups with picture, name and description
- Add / remove members, promote or demote admins, creator protection, leave group, delete group
- System messages (“Ali added Sara”), group notifications

**Admin dashboard** (`/app/admin`, admins and moderators)
- Platform statistics and 7-day charts
- Search, filter and manage users: suspend / reactivate (with reason), change role, force sign-out, delete
- Monitor conversations (read-only) and remove abusive messages
- Moderators can only manage regular users; only admins change roles or delete accounts

**Design**
- Italic editorial typography (Instrument Serif + Plus Jakarta Sans), light/dark themes
- Scroll-reveal animations (7 effects), word-by-word headlines, 3D tilt cards, magnetic buttons, marquee, scroll progress bar
- Custom animated cursor (trailing ring, sparkles, context-aware labels) — only on mouse devices, toggleable in Settings
- Respects “reduce motion”

---

## 3. Environment variables

Everything lives in **`server/.env`** (template: `server/.env.example`). The client needs nothing in development.

| Variable | Required | What it does |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret that signs login cookies — use 32+ random characters |
| `CLIENT_URL` | ✅ | Where the React app runs (`http://localhost:5173`). Comma-separate several |
| `PORT` | | API port (default 5000) |
| `JWT_EXPIRES_DAYS` | | Session length (default 7) |
| `COOKIE_SAMESITE` | | `lax` (default) or `none` when client and API are on different domains |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | | Real emails. **Empty = codes/links printed in the server console and shown on screen** |
| `CLOUDINARY_*` | | Cloud file storage. **Empty = files saved in `server/uploads`** |
| `GOOGLE_CLIENT_ID` | | Enables “Continue with Google” |
| `ALLOW_DEMO_LOGIN` | | Demo-account button (default: on in development, off in production) |
| `SERVE_CLIENT` | | `true` = the API also serves the built React app |
| `SEED_ADMIN_PASSWORD` | | Password for the seeded admin (default `Admin@12345`) |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### MongoDB Atlas (free)
1. Create a free cluster → **Database Access** → add a user/password.
2. **Network Access** → allow your IP (or `0.0.0.0/0` while testing).
3. **Connect → Drivers** → copy the `mongodb+srv://…` string into `MONGO_URI` (add `/connectly` before the `?`).

### Gmail SMTP (OTP + reset emails)
Turn on 2-Step Verification, create an **App password**, then set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`.

### Cloudinary
Create a free account → Dashboard → copy **Cloud name**, **API key**, **API secret** into the three `CLOUDINARY_*` variables.

### Google login
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → *Create credentials → OAuth client ID* → type **Web application**.
2. **Authorized JavaScript origins:** `http://localhost:5173` (and your production URL).
3. Copy the **Client ID** into `GOOGLE_CLIENT_ID` and restart the server. The button works immediately — the client reads the ID from the server, no client env needed.

---

## 4. Project structure

```
connectly/
├── client/                      React + Vite + Tailwind
│   └── src/
│       ├── pages/               Landing, Login, Register, VerifyOtp, Forgot/Reset, AppShell, Settings, Admin
│       ├── components/
│       │   ├── chat/            ConversationList, ChatWindow, MessageList, MessageBubble, Composer, InfoPanel …
│       │   ├── fx/              CursorFX, Reveal, Tilt, Magnetic, ScrollProgress
│       │   └── ui/              Button, Input, Modal, Avatar, FloatingMenu …
│       ├── context/             Auth, Theme, Toast, Chat (socket + all chat state)
│       ├── hooks/ · lib/        useReveal, useGoogleSignIn · api (axios), utils, emoji, sound
│       └── index.css            Design tokens, themes, animations
└── server/
    ├── config/                  env, db, mailer, cloudinary
    ├── models/                  User, Conversation, Message
    ├── controllers/             auth, user, conversation, message, admin
    ├── routes/                  one file per area + index
    ├── middleware/              auth (protect/restrictTo), validate, sanitize, error
    ├── services/                conversationService, messageService
    ├── socket/                  Socket.IO auth + presence, typing, delivery
    ├── utils/                   tokens, crypto, uploads, serializers, email templates
    ├── scripts/                 seed.js, smoke-test.js
    ├── app.js                   Express + Socket.IO setup
    └── server.js                entry point
```

---

## 5. How the pieces fit (so you can rebuild it yourself)

**Why two apps?** The *client* (React) only draws screens; the *server* holds secrets, the database and the real-time logic. Splitting them lets you deploy and scale each independently. In development Vite **proxies** `/api`, `/uploads` and `/socket.io` to the server, so the browser sees one origin and cookies “just work”.

**Routes → controllers → models.** A *route* says *where* (`POST /api/auth/login`) and validates input; a *controller* says *what happens*; a *model* says *what the data looks like*. Shared logic that several controllers need (sending a message, loading a conversation) lives in `services/`.

**Login.** The server hashes passwords with bcrypt, then puts a signed **JWT in an HTTP-only cookie**. JavaScript can't read it, so an XSS bug can't steal your session. The JWT carries a `tokenVersion`; bumping it on the user (password reset, “sign out everywhere”, suspension) instantly invalidates every old token.

**Real time.** After login the client opens a Socket.IO connection. The browser sends the same cookie; the server verifies it with the same function the HTTP routes use. Each user joins a private room `user:<id>`, so the server can push events to a person on any device. Presence is a map `userId → set of socket ids` (a user is “online” while the set is non-empty).

**Sending a message.** `POST /conversations/:id/messages` → saved in MongoDB → server emits `message:new` to every member's room. The sender's UI adds a temporary bubble first (*optimistic UI*) and swaps it for the real one when the response arrives, with a retry button if it fails.

**Receipts.** Each message stores `deliveredTo` (set when a recipient is online, or when they reconnect) and `seenBy` (set when they open the chat). The tick icon is computed from those two arrays. Unread counters use a separate `readBy`, so turning off read receipts hides blue ticks without breaking counters.

**Unread counts & pagination.** Counts come from one aggregation query over `(conversation, readBy)`. History loads 30 messages at a time using the message `_id` as a cursor (`?before=<id>`), which is faster and more stable than page numbers.

---

## 6. Deployment

### Option A — single server (simplest: Render, Railway, a VPS)
```bash
npm run install:all
npm run build                      # builds client/dist
```
Set these environment variables on the host:
`NODE_ENV=production`, `SERVE_CLIENT=true`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL=https://your-domain`, plus SMTP / Cloudinary / Google as needed.
Start command: `npm start` (runs `server/server.js`). One URL serves both the app and the API, so cookies are first-party.

> Use **Cloudinary** in production — hosts like Render/Heroku have ephemeral disks, so locally stored uploads disappear on redeploy.
> Run `npm run seed` once only if you want demo data; to create your own admin, register normally and then change that user's `role` to `admin` in the database (MongoDB Atlas → Browse collections → `users`).

### Option B — separate hosts (e.g. Vercel for the client, Render for the API)
- **Client:** build with `VITE_API_URL=https://api.your-domain.com` and add a rewrite of all routes to `index.html` (SPA fallback).
- **Server:** `CLIENT_URL=https://your-client-domain`, `COOKIE_SAMESITE=none`, `NODE_ENV=production` (HTTPS is required for `SameSite=None; Secure` cookies).

### Pre-launch checklist
- [ ] Strong, unique `JWT_SECRET`; `.env` is **not** committed
- [ ] `ALLOW_DEMO_LOGIN` off and demo users removed (or changed passwords)
- [ ] Real SMTP configured so OTP / reset emails are delivered
- [ ] Cloudinary configured (persistent uploads)
- [ ] HTTPS enabled; MongoDB network access restricted

---

## 7. Testing

```bash
npm test          # starts the API against a throw-away database and runs ~105 checks
```
Covers registration, OTP, login/logout, password reset, protected routes and permissions, profile, uploads, real-time messaging over Socket.IO (typing, receipts, reactions, edits, deletes, offline delivery), groups and the admin API. It needs a running MongoDB (set `TEST_MONGO_URI` to override the default `mongodb://127.0.0.1:27017/connectly_smoketest`). The test database is deleted when it finishes — your real data is never touched.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `Missing required environment variables` | You haven't created `server/.env` yet (step 2 in Quick start) |
| `Could not connect to MongoDB` | Start MongoDB, or check `MONGO_URI` / Atlas IP allow-list |
| No OTP email arrives | SMTP isn't set — the code is printed in the server console and shown on the verify page in development |
| “Cannot reach the server” in the browser | The API isn't running on port 5000 (`npm run dev` starts both) |
| Logged out immediately after login in production | Client and API are on different domains: set `COOKIE_SAMESITE=none` and use HTTPS |
| Google button says “not set up yet” | Set `GOOGLE_CLIENT_ID` and restart the server |
| Port already in use | Change `PORT` in `server/.env` (and `VITE_PROXY_TARGET` for the client dev server) |

---

Made with care. Enjoy Connectly 💬
