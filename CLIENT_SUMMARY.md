# Klyperix Outreach & Content Engine — Client Summary

> **Quick Project Handover & Credential Reference**

---

### 1. Project Overview
Klyperix Outreach is an all-in-one Client Acquisition and Content Engine featuring:
- **Real B2B Lead Search**: Google Maps, YouTube Creators, Reddit Hiring Posts, Live Website Email Extractor.
- **Multi-Channel Cold Outreach**: WhatsApp (QR scan) with 40-msg/day anti-ban limit + Gmail (Google OAuth 2.0).
- **AI Content Studio**: Generates 5 native copies (Instagram, LinkedIn, YouTube Shorts, X, Facebook) with 1-click publishing.

---

### 2. What Was Changed & Added
- **Social Media Client ID Inputs Added in Settings**: Added dedicated inputs for **LinkedIn Client ID & Secret**, **X (Twitter) API Key & Secret**, and **Meta (Instagram & Facebook) App ID & Token**.
- **Fixed Social Studio**: Unified AI copy formats so all 5 platforms load hooks, captions, takeaways, and hashtags properly.
- **Added 1-Click Launchpad**: Clicking "Publish" now opens a modal with direct 1-click launch buttons and auto-clipboard copy for each social network.
- **Added Pipeline Controls**: Added **Launch/Re-post** and **Delete** buttons to the content pipeline table.
- **Replaced Mock Data with Real APIs**: Replaced simulated leads with real OpenStreetMap, Google Places, YouTube Data API, and live web scraper.
- **Zero Build Errors**: Cleaned up server and client TypeScript types (`npm run build:server` & `npm run build:client` compile with 0 errors).

---

### 3. What Was Removed (And Why)
- **Removed Gmail App Password (SMTP) Card**: Confusing manual passwords removed in favor of official 1-click Google OAuth 2.0 Sign-In.
- **Removed Outreach Signature & Phone Card**: Unneeded manual phone signature section removed to keep Settings clean and focused.
- **Removed Upwork, Freelancer, Fiverr Scrapers**: These platforms ban IPs and accounts for unauthorized scraping. Replaced with 100% legal Google Maps and Reddit hiring posts.
- **Removed Social DM Bots (Instagram / X / LinkedIn Private DMs)**: Third-party private DM bots cause immediate account bans. Replaced with official Web Intent Launchers and verified contact scrapers.

---

### 4. API Keys & Client IDs Cheat Sheet (Directly Fillable in Settings)

| Service | Credential / Key | Status / Need | Purpose | Where to Get |
| :--- | :--- | :--- | :--- | :--- |
| **Groq AI** | `GROQ_API_KEY` | **Pre-Configured** | Writes AI pitches, audits & social copy | [console.groq.com](https://console.groq.com/keys) |
| **LinkedIn Dev** | `LinkedIn Client ID`<br/>`LinkedIn Client Secret` | **Configurable in Settings** | Direct LinkedIn auto-publishing | [linkedin.com/developers](https://www.linkedin.com/developers/) |
| **X (Twitter) Dev** | `API Key / Client ID`<br/>`API Secret / Client Secret` | **Configurable in Settings** | Direct X (Twitter) auto-posting | [developer.x.com](https://developer.x.com/) |
| **Meta (IG & FB)** | `Meta App ID (Client ID)`<br/>`Meta App Secret / Token` | **Configurable in Settings** | Direct Instagram & Facebook posting | [developers.facebook.com](https://developers.facebook.com/) |
| **Gmail OAuth** | `GOOGLE_CLIENT_ID`<br/>`GOOGLE_CLIENT_SECRET` | **Recommended** | Send real email via Gmail in 1-click | [console.cloud.google.com](https://console.cloud.google.com/) |
| **WhatsApp** | **Zero Keys (QR Scan)** | **Free & Built-in** | Direct phone link with 40-msg/day cap | In-app Connections tab |
| **Social Publishing** | **Zero Keys (Intent Mode)** | **Free & Built-in** | 1-click dispatch to IG, LI, X, FB, YT | 1-Click Launchpad |
| **Google Maps** | `GOOGLE_PLACES_API_KEY` | Optional *(Free OSM active)* | Enhanced Google local business data | [console.cloud.google.com](https://console.cloud.google.com/) |
| **YouTube** | `YOUTUBE_API_KEY` | Optional *(Settings)* | Search YouTube creators & channel stats | [console.cloud.google.com](https://console.cloud.google.com/) |
| **Reddit** | `REDDIT_API_KEY` | Optional | Search Reddit hiring posts | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) |

---

### 5. How to Run (3 Steps)
1. **Start App**: Run `npm run dev` in project root (Frontend: `http://localhost:5173`, Backend: `http://localhost:3001`).
2. **Connect Channels**: Go to **Settings** -> Fill in your Social Client IDs / API Keys and save, or go to **Connections** tab -> Scan WhatsApp QR & Sign in with Google.
3. **Publish & Pitch**: Go to **Content Studio** (Tab 6) to create social posts, or **Places/YouTube** to find leads and launch outreach.
