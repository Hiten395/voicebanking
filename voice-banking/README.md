# 🏦 VoiceBank

**Banking that listens to you** — Accessibility-first voice banking app built for Hackathon 2026.

## Quick Start

```bash
git clone <repo-url>
cd voice-banking
npm run install:all
cp server/.env.example server/.env   # fill in your keys
npm run seed                         # loads demo data
npm run dev                          # starts both client + server
```

Open **http://localhost:5173**

## Demo Credentials

| User | Phone | PIN |
|------|-------|-----|
| Ramesh Kumar | 9876543210 | 1234 |
| Priya Sharma | 9123456780 | 5678 |

## Environment Variables

| Variable | Source |
|----------|--------|
| `MONGODB_URI` | [MongoDB Atlas](https://mongodb.com/atlas) |
| `ACCESS_TOKEN_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `REFRESH_TOKEN_SECRET` | Same command as above (run twice) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com) |
| `FAST2SMS_API_KEY` | [Fast2SMS](https://fast2sms.com) (free) |
| `OTP_MODE` | `console` (dev) or `fast2sms` (prod) |
| `CLIENT_URL` | `http://localhost:5173` (dev) or Vercel URL (prod) |

## Tech Stack

- **Frontend**: React + Vite, React Router, Axios
- **Backend**: Express.js, MongoDB + Mongoose, JWT
- **AI**: Google Gemini (NLP + embeddings)
- **Auth**: OTP (Fast2SMS), PIN, Voice passphrase
- **Deploy**: Vercel (frontend) + Render (backend)
