import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { run, get, all } from '../db/database';
import { validateAndSanitizePitch } from './guardrailService';

export type WhatsAppStatus = 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'error';

export interface WhatsAppAccountState {
  id: string; // e.g. 'account_1', 'account_2'
  name: string; // User defined name or phone
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  errorMessage: string | null;
  lastActive: string | null;
  killSwitchActive?: boolean;
  sentToday?: number;
  dailyLimit?: number;
  limitReached?: boolean;
}

export interface BatchWhatsAppProgress {
  isRunning: boolean;
  currentIndex: number;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  currentLeadName: string | null;
  currentPhone: string | null;
  secondsRemaining: number;
  statusMessage: string | null;
  activeAccountsCount?: number;
  logs: Array<{ time: string; leadName: string; phone: string; success: boolean; message: string; accountName?: string }>;
}

interface SessionRecord {
  id: string;
  name: string;
  sock: WASocket | null;
  state: WhatsAppAccountState;
  isInitializing: boolean;
}

let isEmergencyKillSwitchActive = false;
let cancelBatchRequested = false;
let roundRobinIndex = 0;

const sessions = new Map<string, SessionRecord>();

let batchProgress: BatchWhatsAppProgress = {
  isRunning: false,
  currentIndex: 0,
  totalCount: 0,
  sentCount: 0,
  failedCount: 0,
  currentLeadName: null,
  currentPhone: null,
  secondsRemaining: 0,
  statusMessage: null,
  activeAccountsCount: 0,
  logs: [],
};

function getAuthDirectory(): string {
  const base = process.env.BAILEYS_AUTH_PATH
    ? path.resolve(process.env.BAILEYS_AUTH_PATH)
    : path.resolve(__dirname, '../../.baileys_auth');
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

function getOrCreateSessionRecord(sessionId: string, accountName?: string): SessionRecord {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const newRecord: SessionRecord = {
    id: sessionId,
    name: accountName || `WhatsApp Account ${sessions.size + 1}`,
    sock: null,
    isInitializing: false,
    state: {
      id: sessionId,
      name: accountName || `WhatsApp Account ${sessions.size + 1}`,
      status: 'disconnected',
      qrCodeDataUrl: null,
      userPhone: null,
      userName: null,
      errorMessage: null,
      lastActive: null,
      killSwitchActive: isEmergencyKillSwitchActive,
    },
  };

  sessions.set(sessionId, newRecord);
  return newRecord;
}

// Daily safety limit per WhatsApp number to prevent ban/restriction
export const DAILY_SAFETY_LIMIT = 40;

export async function getDailyWhatsAppSentCount(): Promise<number> {
  try {
    const row = await get<{ count: number }>(
      "SELECT COUNT(*) as count FROM activity_logs WHERE action = 'whatsapp_sent' AND DATE(created_at) = DATE('now')"
    );
    return row?.count || 0;
  } catch (e) {
    return 0;
  }
}

export async function getAllWhatsAppAccounts(): Promise<WhatsAppAccountState[]> {
  const sentToday = await getDailyWhatsAppSentCount();
  return Array.from(sessions.values()).map((s) => ({
    ...s.state,
    killSwitchActive: isEmergencyKillSwitchActive,
    sentToday,
    dailyLimit: DAILY_SAFETY_LIMIT,
    limitReached: sentToday >= DAILY_SAFETY_LIMIT,
  }));
}

export async function getWhatsAppStatus(sessionId: string = 'account_1'): Promise<WhatsAppAccountState> {
  const record = getOrCreateSessionRecord(sessionId);
  const sentToday = await getDailyWhatsAppSentCount();
  return {
    ...record.state,
    killSwitchActive: isEmergencyKillSwitchActive,
    sentToday,
    dailyLimit: DAILY_SAFETY_LIMIT,
    limitReached: sentToday >= DAILY_SAFETY_LIMIT,
  };
}

export function getBatchWhatsAppStatus(): BatchWhatsAppProgress {
  return { ...batchProgress };
}

export function setEmergencyKillSwitch(active: boolean): { success: boolean; killSwitchActive: boolean; message: string } {
  isEmergencyKillSwitchActive = active;
  for (const session of sessions.values()) {
    session.state.killSwitchActive = active;
  }

  if (active) {
    console.log('[EMERGENCY KILL SWITCH] ACTIVATED! Halting all WhatsApp queues.');
    stopBatchWhatsApp();
    return {
      success: true,
      killSwitchActive: true,
      message: '🚨 EMERGENCY KILL SWITCH ACTIVATED! All auto-sending queues halted.',
    };
  } else {
    console.log('[EMERGENCY KILL SWITCH] DEACTIVATED.');
    return {
      success: true,
      killSwitchActive: false,
      message: '✅ Emergency Kill Switch deactivated. Operations resumed.',
    };
  }
}

export function isKillSwitchEngaged(): boolean {
  return isEmergencyKillSwitchActive;
}

export function stopBatchWhatsApp(): { success: boolean; message: string } {
  if (!batchProgress.isRunning) {
    return { success: true, message: 'No batch campaign currently running.' };
  }
  cancelBatchRequested = true;
  batchProgress.statusMessage = 'Stopping batch campaign...';
  return { success: true, message: 'Batch campaign cancellation requested.' };
}

export async function initializeWhatsAppSession(
  sessionId: string = 'account_1',
  accountName?: string,
  forceRestart: boolean = false
): Promise<WhatsAppAccountState> {
  const session = getOrCreateSessionRecord(sessionId, accountName);

  if (session.sock && !forceRestart && (session.state.status === 'connected' || session.state.status === 'qr_ready')) {
    return session.state;
  }

  if (session.isInitializing && !forceRestart) {
    return session.state;
  }

  session.isInitializing = true;
  session.state.status = 'connecting';
  session.state.errorMessage = null;

  (async () => {
    try {
      if (session.sock) {
        try {
          session.sock.end(undefined);
        } catch (e) {}
        session.sock = null;
      }

      const authBase = getAuthDirectory();
      const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const sessionAuthDir = path.join(authBase, `session_${cleanSessionId}`);

      if (forceRestart && fs.existsSync(sessionAuthDir)) {
        try {
          fs.rmSync(sessionAuthDir, { recursive: true, force: true });
        } catch (e) {}
      }

      console.log(`[Baileys ${sessionId}] Initializing WebSocket session at ${sessionAuthDir}...`);

      const { state, saveCreds } = await useMultiFileAuthState(sessionAuthDir);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as any }));

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Outreach Leads Hub', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
      });

      session.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log(`[Baileys ${sessionId}] ⚡ QR Received! Rendering image...`);
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: { dark: '#0f172a', light: '#ffffff' },
            });
            session.state.status = 'qr_ready';
            session.state.qrCodeDataUrl = qrDataUrl;
            session.state.errorMessage = null;
            session.isInitializing = false;
            console.log(`[Baileys ${sessionId}] ✅ QR Code ready for mobile scan!`);
          } catch (err: any) {
            session.state.errorMessage = 'Failed to generate QR code';
            session.isInitializing = false;
          }
        }

        if (connection === 'open') {
          console.log(`[Baileys ${sessionId}] 🎉 Connection OPEN and READY!`);
          const rawId = sock.user?.id || '';
          const phone = rawId.split(':')[0].replace(/[^0-9]/g, '') || rawId.replace(/[^0-9]/g, '') || 'Linked User';
          const name = sock.user?.name || session.name || 'WhatsApp Account';

          session.state.status = 'connected';
          session.state.qrCodeDataUrl = null;
          session.state.userPhone = phone;
          session.state.userName = name;
          session.state.lastActive = new Date().toISOString();
          session.state.errorMessage = null;
          session.isInitializing = false;

          // Save in SQLite DB
          run(
            `INSERT INTO whatsapp_accounts (session_id, account_name, phone_number, status, last_active)
             VALUES (?, ?, ?, 'connected', CURRENT_TIMESTAMP)
             ON CONFLICT(session_id) DO UPDATE SET
               account_name = excluded.account_name,
               phone_number = excluded.phone_number,
               status = 'connected',
               last_active = CURRENT_TIMESTAMP`,
            [sessionId, session.name, phone]
          ).catch(() => {});
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[Baileys ${sessionId}] Connection closed (statusCode: ${statusCode}, shouldReconnect: ${shouldReconnect})`);

          if (!shouldReconnect) {
            session.state.status = 'disconnected';
            session.state.qrCodeDataUrl = null;
            session.state.userPhone = null;
            session.state.userName = null;
            session.state.errorMessage = 'Logged out from device. Click connect to scan QR.';
            session.isInitializing = false;
            session.sock = null;
            if (fs.existsSync(sessionAuthDir)) {
              try {
                fs.rmSync(sessionAuthDir, { recursive: true, force: true });
              } catch (e) {}
            }
            run("UPDATE whatsapp_accounts SET status = 'disconnected' WHERE session_id = ?", [sessionId]).catch(() => {});
          } else {
            session.state.status = 'connecting';
            // Auto reconnect
            setTimeout(() => {
              initializeWhatsAppSession(sessionId, accountName, false).catch(() => {});
            }, 3000);
          }
        }
      });

      // Inbound Messages Listener
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
          if (type !== 'notify') return;
          for (const msg of messages) {
            if (msg.key.fromMe || !msg.message) continue;

            const remoteJid = msg.key.remoteJid || '';
            if (remoteJid.includes('@g.us') || remoteJid.includes('broadcast')) continue;

            const fromPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
            const body =
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              msg.message.imageMessage?.caption ||
              '';

            if (!body.trim()) continue;

            console.log(`[Baileys Inbound ${sessionId}] Message from ${fromPhone}: "${body.slice(0, 50)}"`);

            const phoneTail = fromPhone.slice(-8);
            const matchingLead = await get(
              'SELECT * FROM leads WHERE phone LIKE ? OR phone LIKE ? OR phone LIKE ?',
              [`%${fromPhone}%`, `%${phoneTail}%`, `%${fromPhone.slice(-10)}%`]
            );

            const leadId = (matchingLead as any)?.id || null;
            const leadName = (matchingLead as any)?.name || 'Prospect';
            const originalPitch = (matchingLead as any)?.pitch || null;

            await run(
              `INSERT INTO inbound_replies (lead_id, channel, sender_id, sender_name, message_text, original_pitch)
               VALUES (?, 'whatsapp', ?, ?, ?, ?)`,
              [leadId, fromPhone, leadName, body, originalPitch]
            );

            if (leadId) {
              await run("UPDATE leads SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [leadId]);
            }
          }
        } catch (err) {
          console.error(`[Baileys Inbound ${sessionId}] Error processing message:`, err);
        }
      });
    } catch (err: any) {
      console.error(`[Baileys ${sessionId}] Initialization error:`, err);
      session.state.status = 'error';
      session.state.errorMessage = err.message || 'Failed to initialize WhatsApp connection';
      session.isInitializing = false;
    }
  })();

  // Wait up to 5 seconds for QR code or connection ready so client gets the QR immediately!
  let waited = 0;
  while (waited < 5000) {
    const currentStatus = session.state.status as string;
    if (currentStatus === 'qr_ready' && session.state.qrCodeDataUrl) {
      break;
    }
    if (currentStatus === 'connected' || currentStatus === 'error') {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
    waited += 200;
  }

  return session.state;
}

// Backward compatibility alias
export async function initializeWhatsApp(forceRestart: boolean = false): Promise<WhatsAppAccountState> {
  return initializeWhatsAppSession('account_1', 'Primary WhatsApp', forceRestart);
}

export async function disconnectWhatsAppSession(sessionId: string): Promise<WhatsAppAccountState> {
  const session = sessions.get(sessionId);
  if (session && session.sock) {
    try {
      session.sock.end(undefined);
    } catch (e) {}
    session.sock = null;
  }

  const authBase = getAuthDirectory();
  const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sessionAuthDir = path.join(authBase, `session_${cleanSessionId}`);
  if (fs.existsSync(sessionAuthDir)) {
    try {
      fs.rmSync(sessionAuthDir, { recursive: true, force: true });
    } catch (e) {}
  }

  if (session) {
    session.state.status = 'disconnected';
    session.state.qrCodeDataUrl = null;
    session.state.userPhone = null;
    session.state.userName = null;
    session.state.errorMessage = null;
    session.isInitializing = false;
  }

  await run("UPDATE whatsapp_accounts SET status = 'disconnected' WHERE session_id = ?", [sessionId]).catch(() => {});
  return getWhatsAppStatus(sessionId);
}

// Backward compatibility alias
export async function disconnectWhatsApp(): Promise<WhatsAppAccountState> {
  return disconnectWhatsAppSession('account_1');
}

export function getConnectedSessions(): SessionRecord[] {
  return Array.from(sessions.values()).filter((s) => s.sock && s.state.status === 'connected');
}

export function formatPhoneNumberForWhatsApp(phone: string, countryCode?: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (!clean || clean.length < 7) return clean;

  if (phone.trim().startsWith('+') || clean.length >= 11) {
    if (clean.length === 11 && clean.startsWith('0')) {
      if (countryCode === 'GB' || countryCode === 'UK') return `44${clean.slice(1)}`;
      return `91${clean.slice(1)}`;
    }
    return clean;
  }

  if (clean.length === 10) {
    if (countryCode) {
      const codeUpper = countryCode.toUpperCase();
      if (codeUpper === 'US' || codeUpper === 'CA') return `1${clean}`;
      if (codeUpper === 'GB' || codeUpper === 'UK') return `44${clean}`;
      if (codeUpper === 'AU') return `61${clean}`;
      if (codeUpper === 'AE') return `971${clean}`;
      if (codeUpper === 'DE') return `49${clean}`;
      if (codeUpper === 'IN') return `91${clean}`;
    }
    if (['6', '7', '8', '9'].includes(clean[0])) {
      return `91${clean}`;
    }
    return `1${clean}`;
  }

  return clean;
}

export async function sendDirectWhatsApp(
  phone: string,
  message: string,
  preferredSessionId?: string,
  leadId?: number,
  countryCode?: string
): Promise<{ success: boolean; message: string; usedAccountName?: string }> {
  if (isEmergencyKillSwitchActive) {
    return {
      success: false,
      message: '🚨 Operation blocked by Emergency Kill Switch.',
    };
  }

  const sentToday = await getDailyWhatsAppSentCount();
  if (sentToday >= DAILY_SAFETY_LIMIT) {
    return {
      success: false,
      message: `🛡️ Anti-Ban Safety Limit Reached (${sentToday}/${DAILY_SAFETY_LIMIT} messages sent today)! To protect your number from WhatsApp bans, please link a new WhatsApp account in Settings or use 1-Click WhatsApp ↗.`,
    };
  }

  const connected = getConnectedSessions();
  if (connected.length === 0) {
    return {
      success: false,
      message: 'No WhatsApp accounts are currently connected. Please pair your account in Settings.',
    };
  }

  let targetSession: SessionRecord = connected[0];
  if (preferredSessionId) {
    const found = connected.find((s) => s.id === preferredSessionId);
    if (found) targetSession = found;
  } else if (connected.length > 1) {
    targetSession = connected[roundRobinIndex % connected.length];
    roundRobinIndex = (roundRobinIndex + 1) % connected.length;
  }

  try {
    const cleanPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, message: `Invalid phone number: ${phone}` };
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const safeMessage = validateAndSanitizePitch(message).sanitizedText;
    console.log(`[Baileys Multi-Pool] Dispatching message to ${jid} via [${targetSession.name}]...`);

    await targetSession.sock!.sendMessage(jid, { text: safeMessage });

    await run("INSERT INTO activity_logs (lead_id, action, details) VALUES (?, 'whatsapp_sent', ?)", [
      leadId || null,
      `WhatsApp -> ${phone} via ${targetSession.name}`,
    ]).catch(() => {});

    await run(
      "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, message_text, status) VALUES (?, 'whatsapp', ?, ?, 'sent')",
      [leadId || null, phone, safeMessage]
    ).catch(() => {});

    return {
      success: true,
      message: `Message sent automatically to ${phone} via ${targetSession.name}!`,
      usedAccountName: targetSession.name,
    };
  } catch (error: any) {
    console.error(`[Baileys] Failed to send via ${targetSession.name}:`, error);
    await run(
      "INSERT INTO outreach_audit_logs (lead_id, channel, recipient, message_text, status, error_message) VALUES (?, 'whatsapp', ?, ?, 'failed', ?)",
      [leadId || null, phone, message, error.message || 'Failed to send']
    ).catch(() => {});
    return {
      success: false,
      message: error.message || 'Failed to send WhatsApp message.',
    };
  }
}

export async function startAntiBanBatchWhatsApp(
  leads: Array<{ id: number; name: string; phone: string; message: string }>,
  minDelaySeconds: number = 30,
  maxDelaySeconds: number = 45,
  allowedSessionIds?: string[]
): Promise<{ success: boolean; message: string; connectedAccountsCount?: number }> {
  if (isEmergencyKillSwitchActive) {
    return {
      success: false,
      message: '🚨 Operation blocked: Emergency Kill Switch is currently active.',
    };
  }

  const currentSentToday = await getDailyWhatsAppSentCount();
  if (currentSentToday >= DAILY_SAFETY_LIMIT) {
    return {
      success: false,
      message: `🛡️ Anti-Ban Safety Limit Reached (${currentSentToday}/${DAILY_SAFETY_LIMIT} messages sent today on this WhatsApp)! To keep your number safe, please link a new WhatsApp account in Settings or use 1-Click WhatsApp ↗.`,
    };
  }

  let connected = getConnectedSessions();
  if (allowedSessionIds && allowedSessionIds.length > 0) {
    connected = connected.filter((s) => allowedSessionIds.includes(s.id));
  }

  if (connected.length === 0) {
    return {
      success: false,
      message: 'No active connected WhatsApp accounts available for this batch. Pair your account in Settings.',
    };
  }

  if (batchProgress.isRunning) {
    return {
      success: false,
      message: 'A batch campaign is already running.',
    };
  }

  // Strict Duplicate Exclusion Check
  const contactedCheck = await all<{ id: number; phone?: string }>(
    "SELECT id, phone FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
  );
  const contactedIdSet = new Set(contactedCheck.map((c) => c.id));
  const contactedPhoneSet = new Set(
    contactedCheck
      .filter((c) => c.phone)
      .map((c) => c.phone!.replace(/[^0-9]/g, ''))
      .filter((p) => p.length >= 7)
  );

  const eligibleLeads = leads.filter((l) => {
    const clean = (l.phone || '').replace(/[^0-9]/g, '');
    return !contactedIdSet.has(l.id) && !contactedPhoneSet.has(clean);
  });

  if (eligibleLeads.length === 0) {
    return {
      success: false,
      message: 'All selected leads have already been contacted in past campaigns. Duplicate messaging blocked.',
    };
  }

  cancelBatchRequested = false;
  const accountsCount = connected.length;

  batchProgress = {
    isRunning: true,
    currentIndex: 0,
    totalCount: eligibleLeads.length,
    sentCount: 0,
    failedCount: 0,
    currentLeadName: null,
    currentPhone: null,
    secondsRemaining: 0,
    activeAccountsCount: accountsCount,
    statusMessage: `Starting WhatsApp Campaign for ${eligibleLeads.length} leads (Anti-Ban 40/Day Cap Active) 🚀`,
    logs: [],
  };

  (async () => {
    console.log(`[Baileys Batch] Starting campaign for ${eligibleLeads.length} leads...`);

    for (let i = 0; i < eligibleLeads.length; i++) {
      if (cancelBatchRequested || isEmergencyKillSwitchActive) {
        batchProgress.statusMessage = isEmergencyKillSwitchActive
          ? '🚨 Campaign halted by Emergency Kill Switch.'
          : 'Campaign stopped by user.';
        break;
      }

      const loopSentToday = await getDailyWhatsAppSentCount();
      if (loopSentToday >= DAILY_SAFETY_LIMIT) {
        batchProgress.statusMessage = `🛡️ Anti-Ban Safety Limit Reached (${DAILY_SAFETY_LIMIT}/${DAILY_SAFETY_LIMIT})! Campaign stopped to keep this WhatsApp number safe. Link a new account in Settings to continue.`;
        break;
      }

      const lead = eligibleLeads[i];
      const activeSession = connected[i % accountsCount];
      const activeAccountName = activeSession.name;

      batchProgress.currentIndex = i + 1;
      batchProgress.currentLeadName = lead.name;
      batchProgress.currentPhone = lead.phone;
      batchProgress.statusMessage = `[${activeAccountName}] Sending pitch to "${lead.name}" (${lead.phone})...`;

      let sendSuccess = false;
      let logMsg = '';

      try {
        let cleanPhone = lead.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
          if (['6', '7', '8', '9'].includes(cleanPhone[0])) {
            cleanPhone = `91${cleanPhone}`;
          } else {
            cleanPhone = `1${cleanPhone}`;
          }
        } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
          cleanPhone = `91${cleanPhone.slice(1)}`;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;
        const safeMessage = validateAndSanitizePitch(lead.message).sanitizedText;
        await activeSession.sock!.sendMessage(jid, { text: safeMessage });

        sendSuccess = true;
        batchProgress.sentCount += 1;
        logMsg = `Dispatched via ${activeAccountName} (+${activeSession.state.userPhone || 'OK'})`;

        await run(
          "UPDATE leads SET status = 'contacted', in_campaign_queue = 0, last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [lead.id]
        );
        await run(
          "INSERT INTO activity_logs (lead_id, action, details) VALUES (?, 'whatsapp_sent', ?)",
          [lead.id, `Multi-Pool Batch sent via ${activeAccountName}`]
        );
      } catch (err: any) {
        batchProgress.failedCount += 1;
        logMsg = `Error via ${activeAccountName}: ${err.message || 'Send failed'}`;
        console.error(`[Baileys Multi-Batch] Error sending to ${lead.name}:`, err);
      }

      batchProgress.logs.unshift({
        time: new Date().toLocaleTimeString(),
        leadName: lead.name,
        phone: lead.phone,
        success: sendSuccess,
        message: logMsg,
        accountName: activeAccountName,
      });

      if (i < eligibleLeads.length - 1 && !cancelBatchRequested && !isEmergencyKillSwitchActive) {
        const rawDelay = Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1)) + minDelaySeconds;
        const adjustedDelay = Math.max(8, Math.round(rawDelay / Math.max(1, accountsCount)));

        for (let s = adjustedDelay; s > 0; s--) {
          if (cancelBatchRequested || isEmergencyKillSwitchActive) break;
          batchProgress.secondsRemaining = s;
          batchProgress.statusMessage = `[Next: ${connected[(i + 1) % accountsCount].name}] Safe delay: ${s}s before lead #${i + 2}...`;
          await new Promise((r) => setTimeout(r, 1000));
        }
        batchProgress.secondsRemaining = 0;
      }
    }

    batchProgress.isRunning = false;
    if (!cancelBatchRequested && !isEmergencyKillSwitchActive) {
      batchProgress.statusMessage = `🎉 Batch Completed! Sent: ${batchProgress.sentCount}, Failed: ${batchProgress.failedCount} across ${accountsCount} accounts.`;
    }
  })();

  return {
    success: true,
    connectedAccountsCount: accountsCount,
    message: `Multi-WhatsApp Campaign launched across ${accountsCount} active WhatsApp accounts! 🚀`,
  };
}
