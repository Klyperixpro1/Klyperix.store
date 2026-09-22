# One-time setup

The app works with zero setup for WhatsApp (QR login) and Google Maps search (free
OpenStreetMap data). Everything below is optional and only needs to be done once, by
whoever installs the app — the day-to-day user never types an API key in the UI.

All values go in `server/.env`. Restart the server after editing it.

## Gmail (Sign in with Google)

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. APIs & Services -> Library -> enable the **Gmail API**.
3. APIs & Services -> OAuth consent screen -> External -> fill the required fields ->
   Testing mode is fine for personal use -> add your own Google account under Test users.
4. APIs & Services -> Credentials -> Create Credentials -> OAuth client ID ->
   Application type: **Web application** -> Authorized redirect URI:
   `http://localhost:3001/api/auth/google/callback`
5. Copy the Client ID and Client Secret into `server/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
6. Restart the server. In the app, go to Connections and click **Sign in with Google**.

Without this, Gmail sending falls back to the manual SMTP/Resend fields under
Settings -> Advanced: Manual Email Fallback.

## Google Places (optional upgrade for Google Maps search)

Maps search already works for free via OpenStreetMap. To use Google's own business
data instead:

1. In the same Google Cloud project, enable the **Places API**.
2. APIs & Services -> Credentials -> Create Credentials -> API key.
3. Add it to `server/.env`:
   ```
   GOOGLE_PLACES_API_KEY=...
   ```

## YouTube Data API (creator search)

1. Enable the **YouTube Data API v3** in Google Cloud Console.
2. Create an API key (or reuse the Places one — it needs the YouTube API enabled too).
3. Add it to `server/.env`:
   ```
   YOUTUBE_API_KEY=...
   ```

## Reddit (hiring-post search)

1. Go to https://www.reddit.com/prefs/apps -> create app -> type **script**.
2. Add the Client ID and Secret to `server/.env` as one value, colon-separated:
   ```
   REDDIT_API_KEY=client_id:client_secret
   ```

## Groq (AI message writing)

Already configured with the key provided during setup. To use your own:
```
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
```

## What's intentionally not here

Instagram, Facebook, X, LinkedIn, Upwork, Freelancer, and Fiverr are not supported.
None of them offer a way for a third-party app to log in and message other users on
your behalf without violating their terms of service — building that would mean either
fabricating data or risking your accounts getting banned.
