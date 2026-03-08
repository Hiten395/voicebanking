# 🏦 VoiceBank

**Banking that listens to you** — Accessibility-first voice banking app built for Hackathon 2026.

## Quick Start

```bash
git clone <repo-url>
cd voice-banking
npm run install:all
cp server/.env.example server/.env   # fill in your keys
npm run dev                          # starts both client + server
```

Open **http://localhost:5173**

## How It Works

### 1. Create Account
- Register with your name, age, and phone number
- **Choose your account type**: Savings, Current, or Pension
- Verify via OTP, set a 4-digit PIN, and optionally enroll voice passphrase
- Account starts with **₹0 balance** — deposit money to get started

### 2. Transactions
| Action | Description |
|--------|-------------|
| **Deposit** | Add money to your account |
| **Withdraw** | Take money out (must have sufficient balance) |
| **Transfer** | Move money between accounts (if you have multiple) |

### 3. Transaction History
- View all past transactions grouped by month
- Filter by account type
- Each entry shows merchant, category, description, amount, and date
- Credit (deposits/incoming) shown in green, debit (withdrawals/outgoing) in red

### 4. Voice Banking
- Ask questions in natural language: "What is my balance?", "Show recent transactions"
- Supports English, Hindi, Tamil, and Telugu

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

## Account Types

| Type | Prefix | Description |
|------|--------|-------------|
| Savings | SAV-XXXXXX | Standard savings account |
| Current | CUR-XXXXXX | Current/checking account |
| Pension | PEN-XXXXXX | Pension/retirement account |
