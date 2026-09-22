import { google } from 'googleapis';
import { getSetting } from './settingsService';
import { get, run, all } from '../db/database';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function getRedirectUri(): string {
  const port = process.env.PORT || '3001';
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `http://localhost:${port}/api/auth/google/callback`;
}

export async function isGoogleOAuthConfigured(): Promise<boolean> {
  const clientId = await getSetting('googleClientId');
  const clientSecret = await getSetting('googleClientSecret');
  return Boolean(clientId && clientSecret);
}

async function buildOAuthClient() {
  const clientId = await getSetting('googleClientId');
  const clientSecret = await getSetting('googleClientSecret');
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.');
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export async function getGoogleAuthUrl(): Promise<string> {
  const oauth2Client = await buildOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_SEND_SCOPE, GMAIL_READ_SCOPE, 'https://www.googleapis.com/auth/userinfo.email'],
  });
}

export async function handleGoogleOAuthCallback(code: string): Promise<{ email: string }> {
  const oauth2Client = await buildOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Revoke access at myaccount.google.com/permissions and try again.');
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email || 'Connected Google Account';

  await run(
    `INSERT INTO connections (id, platform, name, status, account_identifier, credential_value, last_synced_at, compliance_mode, updated_at)
     VALUES ('gmail', 'gmail', 'Gmail', 'connected', ?, ?, datetime('now'), 'authorized_oauth', datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       status = 'connected',
       account_identifier = excluded.account_identifier,
       credential_value = excluded.credential_value,
       last_synced_at = datetime('now'),
       updated_at = datetime('now')`,
    [email, tokens.refresh_token]
  );

  return { email };
}

export async function getStoredGmailRefreshToken(): Promise<{ refreshToken: string; email?: string } | null> {
  const row = await get<{ credential_value?: string; account_identifier?: string; status?: string }>(
    "SELECT credential_value, account_identifier, status FROM connections WHERE id = 'gmail'"
  );
  if (!row || row.status !== 'connected' || !row.credential_value) return null;
  return { refreshToken: row.credential_value, email: row.account_identifier };
}

export async function disconnectGmailOAuth(): Promise<void> {
  await run("UPDATE connections SET status = 'disconnected', credential_value = NULL WHERE id = 'gmail'");
}

async function getAuthedOAuthClient() {
  const stored = await getStoredGmailRefreshToken();
  if (!stored) return null;
  const oauth2Client = await buildOAuthClient();
  oauth2Client.setCredentials({ refresh_token: stored.refreshToken });
  return oauth2Client;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractPlainTextBody(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) return text;
    }
  }
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  return '';
}

function extractSenderEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase();
}

// Polls the connected Gmail inbox for new replies from known leads and records them
// in inbound_replies, the same way real-time WhatsApp messages are recorded.
export async function pollGmailInboxForReplies(): Promise<{ found: number }> {
  const oauth2Client = await getAuthedOAuthClient();
  if (!oauth2Client) return { found: 0 };

  const leads = await all<{ id: number; contact_email?: string; name?: string; pitch?: string }>(
    "SELECT id, contact_email, name, pitch FROM leads WHERE contact_email IS NOT NULL AND contact_email != ''"
  );
  if (leads.length === 0) return { found: 0 };

  const leadsByEmail = new Map(leads.map((l) => [l.contact_email!.toLowerCase(), l]));

  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox newer_than:2d',
      maxResults: 25,
    });

    const messages = listRes.data.messages || [];
    let found = 0;

    for (const msgRef of messages) {
      if (!msgRef.id) continue;

      const exists = await get<{ id: number }>(
        "SELECT id FROM inbound_replies WHERE channel = 'email' AND sender_id = ?",
        [`gmail_${msgRef.id}`]
      );
      if (exists) continue;

      const msgRes = await gmail.users.messages.get({ userId: 'me', id: msgRef.id, format: 'full' });
      const headers = msgRes.data.payload?.headers || [];
      const fromHeader = headers.find((h) => h.name === 'From')?.value || '';
      const senderEmail = extractSenderEmail(fromHeader);

      const lead = leadsByEmail.get(senderEmail);
      if (!lead) continue;

      const body = extractPlainTextBody(msgRes.data.payload).trim() || msgRes.data.snippet || '';
      if (!body) continue;

      await run(
        `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, is_read)
         VALUES (?, 'email', ?, ?, ?, 0)`,
        [lead.id, `gmail_${msgRef.id}`, lead.name || senderEmail, body.slice(0, 2000)]
      );
      await run("UPDATE leads SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [lead.id]);
      found++;
    }

    return { found };
  } catch (err: any) {
    console.error('[Gmail Inbox Poll] Failed:', err.response?.data || err.message);
    return { found: 0 };
  }
}

let gmailPollInterval: ReturnType<typeof setInterval> | null = null;

export function startGmailInboxPolling(intervalMs: number = 60000): void {
  if (gmailPollInterval) return;
  gmailPollInterval = setInterval(() => {
    pollGmailInboxForReplies().catch(() => {});
  }, intervalMs);
  pollGmailInboxForReplies().catch(() => {});
}

function encodeMimeMessage(to: string, from: string, subject: string, body: string): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmailApi(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const stored = await getStoredGmailRefreshToken();
  if (!stored) {
    return { success: false, message: 'Gmail is not connected. Sign in with Google in Connections.' };
  }

  try {
    const oauth2Client = await buildOAuthClient();
    oauth2Client.setCredentials({ refresh_token: stored.refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const raw = encodeMimeMessage(to, stored.email || 'me', subject, body);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return {
      success: true,
      message: `Email dispatched successfully to ${to} via your Gmail account!`,
      messageId: res.data.id || undefined,
    };
  } catch (err: any) {
    console.error('[Gmail API] Send failed:', err.response?.data || err.message);
    return {
      success: false,
      message: err.response?.data?.error?.message || err.message || 'Failed to send via Gmail API.',
    };
  }
}
