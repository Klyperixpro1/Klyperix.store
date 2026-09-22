import { get, run, all } from '../db/database';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface ApiSettings {
  googlePlacesApiKey?: string;
  youtubeApiKey?: string;
  geminiApiKey?: string;
  grokApiKey?: string;
  resendApiKey?: string;
  instagramApiKey?: string;
  facebookApiKey?: string;
  threadsApiKey?: string;
  linkedinApiKey?: string;
  behanceApiKey?: string;
  upworkApiKey?: string;
  freelancerApiKey?: string;
  fiverrApiKey?: string;
  redditApiKey?: string;
  groqApiKey?: string;
  groqModel?: string;
  linkedinClientId?: string;
  linkedinClientSecret?: string;
  xApiKey?: string;
  xApiSecret?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  instagramAccessToken?: string;
  defaultPitchTone?: string;
  mockModeEnabled?: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  googleProjectId?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  dailyEmailLimit?: number | string;
  dailyWhatsAppLimit?: number | string;
  multiAccounts?: string;
  businessContactPhone?: string;
  [key: string]: any;
}

// Function to auto-read client_secret.json from project root
function getClientSecretData(): { clientId?: string; clientSecret?: string; projectId?: string } {
  try {
    const possiblePaths = [
      path.resolve(__dirname, '../../../client_secret.json'),
      path.resolve(__dirname, '../../client_secret.json'),
      path.resolve(__dirname, '../client_secret.json'),
      path.resolve(process.cwd(), 'client_secret.json'),
      path.resolve(process.cwd(), '../client_secret.json'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        const creds = json.installed || json.web || json;
        if (creds.client_id) {
          return {
            clientId: creds.client_id,
            clientSecret: creds.client_secret,
            projectId: creds.project_id,
          };
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return {};
}

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (row?.value) {
    return row.value;
  }

  const clientCreds = getClientSecretData();

  // Fallback to client_secret.json or process.env
  const envMap: Record<string, string | undefined> = {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY,
    youtubeApiKey: process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    redditApiKey: process.env.REDDIT_API_KEY,
    defaultPitchTone: process.env.DEFAULT_PITCH_TONE || 'friendly',
    mockModeEnabled: process.env.MOCK_MODE_ENABLED || 'false',
    googleClientId: clientCreds.clientId || process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: clientCreds.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
    googleProjectId: clientCreds.projectId || process.env.GOOGLE_PROJECT_ID,
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: process.env.SMTP_PORT || '465',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  };
  return envMap[key];
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export async function getAllSettings(): Promise<ApiSettings> {
  const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settingsObj: Record<string, any> = {};
  for (const r of rows) {
    settingsObj[r.key] = r.value;
  }

  const clientCreds = getClientSecretData();

  return {
    ...settingsObj,
    googlePlacesApiKey: settingsObj.googlePlacesApiKey || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || '',
    youtubeApiKey: settingsObj.youtubeApiKey || process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || '',
    geminiApiKey: settingsObj.geminiApiKey || process.env.GEMINI_API_KEY || '',
    claudeApiKey: settingsObj.claudeApiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    groqApiKey: settingsObj.groqApiKey || process.env.GROQ_API_KEY || '',
    groqModel: settingsObj.groqModel || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    linkedinClientId: settingsObj.linkedinClientId || process.env.LINKEDIN_CLIENT_ID || '',
    linkedinClientSecret: settingsObj.linkedinClientSecret || process.env.LINKEDIN_CLIENT_SECRET || '',
    xApiKey: settingsObj.xApiKey || process.env.X_API_KEY || process.env.TWITTER_API_KEY || '',
    xApiSecret: settingsObj.xApiSecret || process.env.X_API_SECRET || process.env.TWITTER_API_SECRET || '',
    metaAppId: settingsObj.metaAppId || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '',
    metaAppSecret: settingsObj.metaAppSecret || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '',
    instagramAccessToken: settingsObj.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '',
    redditApiKey: settingsObj.redditApiKey || process.env.REDDIT_API_KEY || '',
    defaultPitchTone: settingsObj.defaultPitchTone || 'friendly',
    mockModeEnabled: settingsObj.mockModeEnabled === 'true' || settingsObj.mockModeEnabled === true,
    googleClientId: settingsObj.googleClientId || clientCreds.clientId || process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: settingsObj.googleClientSecret || clientCreds.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
    googleProjectId: settingsObj.googleProjectId || clientCreds.projectId || process.env.GOOGLE_PROJECT_ID || '',
    smtpHost: settingsObj.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: settingsObj.smtpPort || process.env.SMTP_PORT || '465',
    smtpUser: settingsObj.smtpUser || process.env.SMTP_USER || '',
    smtpPass: settingsObj.smtpPass || process.env.SMTP_PASS || '',
    smtpFrom: settingsObj.smtpFrom || settingsObj.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER || '',
  };
}
