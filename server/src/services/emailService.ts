import nodemailer from 'nodemailer';
import axios from 'axios';
import { getSetting } from './settingsService';
import { validateAndSanitizePitch } from './guardrailService';
import { get, run } from '../db/database';
import { sendGmailApi, getStoredGmailRefreshToken } from './googleOAuthService';

// Daily safety limit per sending identity to prevent Gmail/Resend/SMTP spam flags & suspensions
export const DAILY_EMAIL_SAFETY_LIMIT = 50;

export async function getDailyEmailSentCount(): Promise<number> {
  try {
    const row = await get<{ count: number }>(
      "SELECT COUNT(*) as count FROM activity_logs WHERE action = 'email_sent' AND DATE(created_at) = DATE('now')"
    );
    return row?.count || 0;
  } catch (e) {
    return 0;
  }
}

export async function getEmailSendStatus(): Promise<{ sentToday: number; dailyLimit: number; limitReached: boolean }> {
  const sentToday = await getDailyEmailSentCount();
  return { sentToday, dailyLimit: DAILY_EMAIL_SAFETY_LIMIT, limitReached: sentToday >= DAILY_EMAIL_SAFETY_LIMIT };
}

export interface EmailSendResult {
  success: boolean;
  message: string;
  messageId?: string;
  provider?: 'gmail_oauth' | 'resend' | 'smtp';
  activeKeyPreview?: string;
}

let currentResendKeyIndex = 0;

export async function parseResendKeys(customRaw?: string): Promise<string[]> {
  const raw = customRaw !== undefined ? customRaw : ((await getSetting('resendApiKey')) || process.env.RESEND_API_KEY || '');
  if (!raw) return [];
  return raw
    .split(/[\n,;\s]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

export function getNextResendKey(keys: string[]): { key: string; index: number } {
  if (keys.length === 0) return { key: '', index: 0 };
  const index = currentResendKeyIndex % keys.length;
  currentResendKeyIndex = (currentResendKeyIndex + 1) % keys.length;
  return { key: keys[index], index };
}

export async function getEmailTransporter(customConfig?: {
  host?: string;
  port?: string | number;
  user?: string;
  pass?: string;
}) {
  const host = customConfig?.host || (await getSetting('smtpHost')) || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(String(customConfig?.port || (await getSetting('smtpPort')) || process.env.SMTP_PORT || '465'), 10);
  const user = customConfig?.user || (await getSetting('smtpUser')) || process.env.SMTP_USER || '';
  const pass = customConfig?.pass || (await getSetting('smtpPass')) || process.env.SMTP_PASS || '';
  const secure = port === 465;

  if (!user || !pass) {
    throw new Error('Email credentials are not configured. Please enter Resend API Key(s) or Gmail/SMTP credentials in Settings.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendDirectEmail(
  to: string,
  subject: string,
  rawBody: string,
  leadId?: number
): Promise<EmailSendResult> {
  if (!to || !to.includes('@')) {
    return { success: false, message: `Invalid recipient email address: ${to}` };
  }

  const sentToday = await getDailyEmailSentCount();
  if (sentToday >= DAILY_EMAIL_SAFETY_LIMIT) {
    return {
      success: false,
      message: `🛡️ Anti-Ban Safety Limit Reached (${sentToday}/${DAILY_EMAIL_SAFETY_LIMIT} emails sent today)! To protect this sending identity from spam flags, please connect another Resend key / SMTP account in Settings.`,
    };
  }

  const body = validateAndSanitizePitch(rawBody).sanitizedText;

  // 1. Priority 1: Gmail API via real Google Sign-In (if connected)
  const gmailConnection = await getStoredGmailRefreshToken();
  if (gmailConnection) {
    const gmailResult = await sendGmailApi(to, subject, body);
    if (gmailResult.success) {
      await run("INSERT INTO activity_logs (action, details) VALUES ('email_sent', ?)", [`Gmail OAuth -> ${to}`]).catch(() => {});
      await run(
        "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, subject, message_text, status) VALUES (?, 'email', ?, ?, ?, 'sent')",
        [leadId || null, to, subject, body]
      ).catch(() => {});
      return { ...gmailResult, provider: 'gmail_oauth' };
    }
    console.warn('[EmailService] Gmail API send failed, falling back:', gmailResult.message);
  }

  const resendKeys = await parseResendKeys();
  const resendFrom = (await getSetting('resendFromEmail')) || 'onboarding@resend.dev';

  // 2. Priority 2: Multi-Key Round-Robin Resend Pool
  if (resendKeys.length > 0) {
    const fromAddress = resendFrom.includes('<') ? resendFrom : `Outreach Engine <${resendFrom}>`;
    let lastErrorMsg = '';

    // Attempt through available keys in pool
    for (let attempt = 0; attempt < resendKeys.length; attempt++) {
      const { key: activeKey, index: keyIdx } = getNextResendKey(resendKeys);
      const keyPreview = `${activeKey.slice(0, 7)}...${activeKey.slice(-4)}`;

      try {
        console.log(`[EmailService] 🚀 Dispatching email to ${to} via Resend Key #${keyIdx + 1} (${keyPreview})...`);

        const response = await axios.post(
          'https://api.resend.com/emails',
          {
            from: fromAddress,
            to: [to.trim()],
            subject,
            text: body,
            html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${body}</div>`,
          },
          {
            headers: {
              Authorization: `Bearer ${activeKey.trim()}`,
              'Content-Type': 'application/json',
            },
            timeout: 12000,
          }
        );

        const msgId = response.data?.id;
        console.log(`[EmailService] ✅ Email sent to ${to} via Resend Key #${keyIdx + 1}! ID: ${msgId}`);
        await run("INSERT INTO activity_logs (action, details) VALUES ('email_sent', ?)", [`Resend Key #${keyIdx + 1} -> ${to}`]).catch(() => {});
        await run(
          "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, subject, message_text, status) VALUES (?, 'email', ?, ?, ?, 'sent')",
          [leadId || null, to, subject, body]
        ).catch(() => {});

        return {
          success: true,
          message: `Email dispatched successfully to ${to} via Resend Key #${keyIdx + 1}!`,
          messageId: msgId,
          provider: 'resend',
          activeKeyPreview: keyPreview,
        };
      } catch (err: any) {
        lastErrorMsg = err.response?.data?.message || err.message || 'Resend dispatch failed';
        console.warn(`[EmailService] ⚠️ Resend Key #${keyIdx + 1} (${keyPreview}) failed:`, lastErrorMsg);
        // Continue to next key in pool
      }
    }

    // If all Resend keys in pool failed, check if SMTP is available
    const smtpUser = await getSetting('smtpUser');
    if (!smtpUser) {
      await run(
        "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, subject, message_text, status, error_message) VALUES (?, 'email', ?, ?, ?, 'failed', ?)",
        [leadId || null, to, subject, body, lastErrorMsg]
      ).catch(() => {});

      if (lastErrorMsg.toLowerCase().includes('own email address') || lastErrorMsg.toLowerCase().includes('verify a domain')) {
        return {
          success: false,
          message: `Resend Sandbox Restriction: 'onboarding@resend.dev' can only send emails to your registered account email. To send cold emails to prospects: Verify a domain at resend.com/domains OR use 1-Click 'Gmail Web ↗' / SMTP.`,
        };
      }
      return { success: false, message: `Resend API Error: ${lastErrorMsg}` };
    }
  }

  // 3. Priority 3: Nodemailer SMTP
  const fromEmail = (await getSetting('smtpFrom')) || (await getSetting('smtpUser')) || process.env.SMTP_USER;
  try {
    const transporter = await getEmailTransporter();

    const info = await transporter.sendMail({
      from: fromEmail ? `"Outreach Engine" <${fromEmail}>` : undefined,
      to: to.trim(),
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${body}</div>`,
    });

    console.log(`[EmailService] Email sent successfully to ${to} via SMTP. MessageId: ${info.messageId}`);
    await run("INSERT INTO activity_logs (action, details) VALUES ('email_sent', ?)", [`SMTP -> ${to}`]).catch(() => {});
    await run(
      "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, subject, message_text, status) VALUES (?, 'email', ?, ?, ?, 'sent')",
      [leadId || null, to, subject, body]
    ).catch(() => {});

    return {
      success: true,
      message: `Email dispatched successfully to ${to} via SMTP!`,
      messageId: info.messageId,
      provider: 'smtp',
    };
  } catch (err: any) {
    console.error(`[EmailService] SMTP error sending email to ${to}:`, err.message || err);
    await run(
      "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, subject, message_text, status, error_message) VALUES (?, 'email', ?, ?, ?, 'failed', ?)",
      [leadId || null, to, subject, body, err.message || 'SMTP failed']
    ).catch(() => {});

    return {
      success: false,
      message: err.message || 'Failed to send email via Resend pool or SMTP.',
    };
  }
}

export async function testResendConnection(apiKeyInput?: string): Promise<{
  success: boolean;
  message: string;
  totalKeys?: number;
  validKeys?: number;
}> {
  const keys = await parseResendKeys(apiKeyInput);
  if (keys.length === 0) {
    return { success: false, message: 'No Resend API keys provided.' };
  }

  let validCount = 0;
  const verifiedPreviews: string[] = [];

  for (const k of keys) {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: 'Outreach Engine <onboarding@resend.dev>',
          to: ['delivered@resend.dev'],
          subject: 'Resend Multi-Key Verification Ping',
          text: 'Key verified for multi-account cold outreach.',
        },
        {
          headers: {
            Authorization: `Bearer ${k.trim()}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data?.id) {
        validCount++;
        verifiedPreviews.push(`${k.slice(0, 7)}...`);
      }
    } catch (err: any) {
      console.warn(`[Resend Test] Key ${k.slice(0, 7)}... failed:`, err.response?.data?.message || err.message);
    }
  }

  if (validCount > 0) {
    const totalCapacity = validCount * 3000;
    return {
      success: true,
      totalKeys: keys.length,
      validKeys: validCount,
      message: `✅ Multi-API Pool Active! ${validCount} of ${keys.length} Resend Keys Verified (~${totalCapacity.toLocaleString()} Free Emails/Month Capacity) 🚀`,
    };
  }

  return {
    success: false,
    message: `❌ None of the ${keys.length} Resend API keys could be verified. Check your key strings.`,
  };
}

export async function testSmtpConnection(customConfig?: {
  host?: string;
  port?: string | number;
  user?: string;
  pass?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await getEmailTransporter(customConfig);
    await transporter.verify();
    return { success: true, message: 'SMTP credentials verified! Email sending is 100% active.' };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP verification failed: ${err.message || 'Check host, port and password'}`,
    };
  }
}
