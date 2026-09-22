# ⚡ OutreachAI — Lead Generation & Outreach Assistant Web App

A modern, high-performance web dashboard that helps businesses discover high-intent prospects from **Google Maps** (via official Google Places API) and **YouTube** (via YouTube Data API v3), then uses **AI** (Gemini / Claude) to craft personalized, non-spammy outreach messages for human review before dispatching via **Email (`mailto:`)** or **WhatsApp (`wa.me`)**.

---

## 🌟 Key Features

### 1. 🔍 Google Maps Leads Discovery
- Search by business category/niche (e.g. *Dental Clinics*, *Digital Marketing Agencies*, *Italian Restaurants*), city location, and radius slider (1–50 km).
- Real-time display: Business Name, Star Ratings & Review Counts, Contact Phone numbers, Websites, and Formatted Addresses.
- 1-Click batch selection & instant save to CRM.

### 2. 📺 YouTube Channel Discovery
- Search content creators and influencers by niche keyword.
- Filter by subscriber range (e.g. 5K – 200K micro-influencers).
- Real-time display: Channel avatar, handle, subscriber count, total video count, total view metrics, description snippet, and public contact email.
- 1-Click batch save to CRM.

### 3. 🤖 AI Personalized Pitch Generator
- Powered by **Google Gemini** (`gemini-1.5-flash`) & **Anthropic Claude** (`claude-3-haiku`), plus a smart algorithmic template engine.
- Strict copywriting rules:
  - Under 70–80 words total.
  - No generic clichés (*no "I hope this email finds you well" or "synergy"*).
  - Specific contextual hooks (*references their exact 4.8★ reviews, location, or YouTube video topics*).
  - Selectable personas: *Friendly & Casual*, *Value Offer / Free Audit*, *Collaboration / Sponsorship*, *Direct & Concise*.
  - Inline pitch editor with live word counter.

### 4. 📬 Review & Send Queue (Human-in-the-Loop)
- **Strict Anti-Spam Compliance**: NEVER auto-spams or auto-DMs. Every message requires user review and manual dispatch.
- **1-Click Actions**:
  - 📋 **Copy Message**: Copies customized copy to clipboard with toast confirmation.
  - ✉️ **Open Email (`mailto:`)**: Generates pre-filled `mailto:` draft with subject & body.
  - 💬 **Open WhatsApp (`wa.me`)**: Formats phone number and opens pre-filled WhatsApp chat.
  - 🌐 **Open Website / YouTube Channel**.
  - Auto-marks lead as `Contacted` upon dispatch.

### 5. 📊 CRM Pipeline & Analytics Dashboard
- Lead lifecycle stages: `Not Contacted` ➔ `Contacted` ➔ `Replied` ➔ `Converted` (with celebratory confetti 🎉) ➔ `Not Interested`.
- Conversion Funnel visualization, response rate tracker, and source distribution charts.
- Interaction notes editor per prospect.
- 1-Click CSV Data Export.

### 6. ⚙️ Settings & Key Management
- Visual API key configuration with 1-click **Test Connection** for Google Places, YouTube, Gemini, and Claude.
- Built-in **Demo/Simulation Mode** for instant out-of-the-box testing before adding API keys.

---

## 🚀 Quick Start

### 1. Install Dependencies
In the root directory, install all packages:
```bash
# Root packages (concurrently)
npm install

# Server packages
cd server && npm install && cd ..

# Client packages
cd client && npm install && cd ..
```

### 2. Run Development Server
Run both client and server concurrently with one command:
```bash
npm run dev
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API Server**: `http://localhost:3001`

---

## 🔑 Adding API Keys (Optional for live data)

You can configure API keys via the **Settings tab** in the web app UI or by creating a `.env` file in the `server` directory:

| Key | Description | Where to Get |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places API (New) | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GEMINI_API_KEY` | Google Gemini API (Recommended) | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `CLAUDE_API_KEY` | Anthropic Claude API | [Anthropic Console](https://console.anthropic.com/settings/keys) |

---

## 🛠️ Tech Stack Architecture
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Canvas Confetti, Axios
- **Backend**: Node.js, Express, TypeScript, SQLite (persistent `leads.db`)
- **APIs**: Google Places API (New), YouTube Data API v3, Google Gemini SDK, Anthropic SDK
