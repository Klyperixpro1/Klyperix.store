import { run, all } from '../db/database';
import { getSetting } from './settingsService';
import { getStoredGmailRefreshToken, isGoogleOAuthConfigured } from './googleOAuthService';

export interface PlatformConnection {
  id: string;
  platform: string;
  name: string;
  status: 'connected' | 'disconnected' | 'expired' | 'action_required';
  account_identifier?: string;
  last_synced_at?: string;
  compliance_mode: 'human_in_the_loop' | 'authorized_oauth' | 'unofficial_risk_controlled';
  description: string;
  setup_help_url?: string;
  login_action: 'oauth' | 'qr' | 'automatic' | 'env_required';
  details?: Record<string, any>;
}

export async function getAllConnections(): Promise<PlatformConnection[]> {
  const dbConnections = await all<any>('SELECT * FROM connections');
  const dbMap = new Map<string, any>(dbConnections.map((c) => [c.id, c]));

  const placesKey = await getSetting('googlePlacesApiKey');
  const ytKey = await getSetting('youtubeApiKey');
  const groqKey = await getSetting('groqApiKey');
  const resendKey = await getSetting('resendApiKey');
  const smtpUser = await getSetting('smtpUser');
  const redditKey = await getSetting('redditApiKey');
  const liClientId = await getSetting('linkedinClientId');
  const xApiKey = await getSetting('xApiKey');
  const metaAppId = await getSetting('metaAppId');
  const gmailOAuth = await getStoredGmailRefreshToken();
  const oauthConfigured = await isGoogleOAuthConfigured();

  const gmailConnected = Boolean(gmailOAuth) || Boolean(smtpUser) || Boolean(resendKey);
  const gmailIdentifier = gmailOAuth?.email || smtpUser || (resendKey ? 'Resend API Key Configured' : undefined);

  const defaultList: PlatformConnection[] = [
    {
      id: 'gmail',
      platform: 'gmail',
      name: 'Gmail',
      status: gmailConnected ? 'connected' : 'disconnected',
      account_identifier: gmailIdentifier,
      last_synced_at: gmailConnected ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description: gmailOAuth
        ? 'Signed in with Google — sending real email via the Gmail API under your account.'
        : smtpUser || resendKey
        ? `Connected via ${smtpUser ? 'Gmail app password' : 'Resend'} (Settings -> Advanced). Sign in with Google for the full OAuth flow instead.`
        : oauthConfigured
        ? 'Sign in with Google to send real email under your own Gmail account.'
        : 'Google Sign-In needs a one-time setup (see SETUP.md). Meanwhile you can connect via SMTP/Resend in Settings -> Advanced.',
      setup_help_url: '/SETUP.md',
      login_action: 'oauth',
    },
    {
      id: 'whatsapp',
      platform: 'whatsapp',
      name: 'WhatsApp',
      status: dbMap.get('whatsapp')?.status === 'connected' ? 'connected' : 'disconnected',
      account_identifier: dbMap.get('whatsapp')?.account_identifier || undefined,
      last_synced_at: dbMap.get('whatsapp')?.last_synced_at || undefined,
      compliance_mode: 'unofficial_risk_controlled',
      description: 'Scan a QR code with your phone to connect — messages send automatically once linked, with a daily anti-ban cap.',
      setup_help_url: 'https://faq.whatsapp.com',
      login_action: 'qr',
    },
    {
      id: 'google_places',
      platform: 'google_places',
      name: 'Google Maps',
      status: 'connected',
      account_identifier: placesKey ? 'Google Places API (upgraded)' : 'Free OpenStreetMap data',
      last_synced_at: new Date().toISOString(),
      compliance_mode: 'authorized_oauth',
      description: placesKey
        ? 'Using the official Google Places API for business search.'
        : 'Works automatically with free, real OpenStreetMap data. Add a Google Places API key in server/.env for higher-quality results.',
      login_action: 'automatic',
    },
    {
      id: 'youtube',
      platform: 'youtube',
      name: 'YouTube',
      status: ytKey ? 'connected' : 'disconnected',
      account_identifier: ytKey ? 'YouTube Data API Connected' : undefined,
      last_synced_at: ytKey ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description: ytKey
        ? 'Discovers real creators and channels via the official YouTube Data API.'
        : 'Add a YouTube Data API key in server/.env to enable creator search.',
      setup_help_url: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
      login_action: 'env_required',
    },
    {
      id: 'reddit',
      platform: 'reddit',
      name: 'Reddit',
      status: redditKey && redditKey.includes(':') ? 'connected' : 'disconnected',
      account_identifier: redditKey && redditKey.includes(':') ? 'Reddit App Connected' : undefined,
      last_synced_at: redditKey && redditKey.includes(':') ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description:
        redditKey && redditKey.includes(':')
          ? 'Real, official Reddit search across hiring subreddits.'
          : 'Add a Reddit app (Client_ID:Client_Secret) in server/.env to enable Reddit search.',
      setup_help_url: 'https://www.reddit.com/prefs/apps',
      login_action: 'env_required',
    },
    {
      id: 'website_extractor',
      platform: 'website_extractor',
      name: 'Live Website Contact & Email Extractor',
      status: 'connected',
      account_identifier: 'Native Real-Time Web Crawler',
      last_synced_at: new Date().toISOString(),
      compliance_mode: 'authorized_oauth',
      description: 'Crawls lead websites and /contact pages to extract verified email addresses, phone numbers, and direct Instagram/LinkedIn handles.',
      login_action: 'automatic',
    },
    {
      id: 'groq',
      platform: 'groq',
      name: 'Groq AI (Llama 3.3 Pitch & Audit Engine)',
      status: groqKey ? 'connected' : 'disconnected',
      account_identifier: groqKey ? 'Groq Llama 3.3 70B Active' : undefined,
      last_synced_at: groqKey ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description: groqKey
        ? 'Powering human-like pitch drafting, real website audits, and reply sentiment classification.'
        : 'Add a Groq API key in server/.env to enable AI message writing.',
      setup_help_url: 'https://console.groq.com/keys',
      login_action: 'env_required',
    },
    {
      id: 'linkedin',
      platform: 'linkedin',
      name: 'LinkedIn Publishing',
      status: liClientId ? 'connected' : 'disconnected',
      account_identifier: liClientId ? `Client ID: ${liClientId.slice(0, 8)}...` : undefined,
      last_synced_at: liClientId ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description: liClientId
        ? 'LinkedIn Developer App configured for automated feed & thought-leadership publishing.'
        : 'Configure LinkedIn Client ID & Secret in Settings -> Social Credentials for direct auto-posting.',
      setup_help_url: 'https://www.linkedin.com/developers/',
      login_action: 'env_required',
    },
    {
      id: 'x_twitter',
      platform: 'x',
      name: 'X (Twitter) Publishing',
      status: xApiKey ? 'connected' : 'disconnected',
      account_identifier: xApiKey ? `API Key Configured` : undefined,
      last_synced_at: xApiKey ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description: xApiKey
        ? 'X Developer API credentials active for direct post publishing.'
        : 'Configure X API Key & Secret in Settings -> Social Credentials for direct auto-posting.',
      setup_help_url: 'https://developer.x.com/',
      login_action: 'env_required',
    },
    {
      id: 'meta_instagram',
      platform: 'instagram',
      name: 'Meta (Instagram & Facebook) Publishing',
      status: metaAppId ? 'connected' : 'disconnected',
      account_identifier: metaAppId ? `App ID: ${metaAppId.slice(0, 8)}...` : undefined,
      last_synced_at: metaAppId ? new Date().toISOString() : undefined,
      compliance_mode: 'authorized_oauth',
      description: metaAppId
        ? 'Meta Graph API App ID configured for Instagram Creator Studio & Facebook feed posting.'
        : 'Configure Meta App ID & Token in Settings -> Social Credentials.',
      setup_help_url: 'https://developers.facebook.com/',
      login_action: 'env_required',
    },
  ];

  return defaultList;
}

export async function updateConnectionStatus(
  id: string,
  status: 'connected' | 'disconnected' | 'expired' | 'action_required',
  accountIdentifier?: string
): Promise<void> {
  await run(
    `INSERT INTO connections (id, platform, name, status, account_identifier, last_synced_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       account_identifier = excluded.account_identifier,
       last_synced_at = datetime('now'),
       updated_at = datetime('now')`,
    [id, id, id.toUpperCase(), status, accountIdentifier || '']
  );
}
