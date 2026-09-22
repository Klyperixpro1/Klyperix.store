import { Router, Request, Response } from 'express';
import {
  getWhatsAppStatus,
  getAllWhatsAppAccounts,
  initializeWhatsAppSession,
  disconnectWhatsAppSession,
  sendDirectWhatsApp,
  startAntiBanBatchWhatsApp,
  getBatchWhatsAppStatus,
  stopBatchWhatsApp,
  getConnectedSessions,
} from '../services/whatsappService';
import { get, run } from '../db/database';

const router = Router();

// 1. Get all WhatsApp accounts and statuses
router.get('/accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await getAllWhatsAppAccounts();
    return res.json(accounts);
  } catch (error: any) {
    console.error('WhatsApp accounts error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Legacy/Default WhatsApp status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.sessionId as string) || 'account_1';
    const status = await getWhatsAppStatus(sessionId);
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Connect / Initialize a specific session or default
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { sessionId = 'account_1', accountName } = req.body || {};
    const forceRestart = req.body?.forceRestart !== undefined ? req.body.forceRestart : true;
    const status = await initializeWhatsAppSession(sessionId, accountName, forceRestart);
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Disconnect a specific session or default
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { sessionId = 'account_1' } = req.body;
    const status = await disconnectWhatsAppSession(sessionId);
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp disconnect error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 5. Send Single Direct Message (Supports Round-Robin or Specific Session)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { phone, message, leadId, sessionId, countryCode } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone number and message are required.' });
    }

    // Strict Double-Send Protection
    if (leadId) {
      const existing = await get(
        "SELECT id, name, status, last_contacted_at FROM leads WHERE id = ? AND (status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL)",
        [leadId]
      );
      if (existing) {
        await run("UPDATE leads SET in_campaign_queue = 0 WHERE id = ?", [leadId]);
        return res.status(400).json({
          success: false,
          alreadyContacted: true,
          message: `🚫 Duplicate blocked: "${existing.name}" was already contacted (${existing.status}) on ${existing.last_contacted_at || 'earlier campaign'}.`,
        });
      }
    }

    const result = await sendDirectWhatsApp(phone, message, sessionId, leadId, countryCode);

    if (result.success && leadId) {
      await run(
        "UPDATE leads SET status = 'contacted', in_campaign_queue = 0, last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [leadId]
      );
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Start Multi-WhatsApp Anti-Ban Batch Campaign
router.post('/batch-start', async (req: Request, res: Response) => {
  try {
    const { leads, minDelaySeconds = 30, maxDelaySeconds = 45, allowedSessionIds } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads provided.' });
    }

    const result = await startAntiBanBatchWhatsApp(leads, minDelaySeconds, maxDelaySeconds, allowedSessionIds);
    return res.json(result);
  } catch (error: any) {
    console.error('WhatsApp batch start error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Get Anti-Ban Batch Campaign Live Status / Countdown
router.get('/batch-status', async (_req: Request, res: Response) => {
  try {
    const status = getBatchWhatsAppStatus();
    return res.json(status);
  } catch (error: any) {
    console.error('WhatsApp batch status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 8. Stop / Cancel Anti-Ban Batch Campaign
router.post('/batch-stop', async (_req: Request, res: Response) => {
  try {
    const result = stopBatchWhatsApp();
    return res.json(result);
  } catch (error: any) {
    console.error('WhatsApp batch stop error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
