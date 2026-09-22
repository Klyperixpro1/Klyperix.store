import { Router, Request, Response } from 'express';
import { sendDirectEmail, testSmtpConnection, getEmailSendStatus, DAILY_EMAIL_SAFETY_LIMIT } from '../services/emailService';
import { run, get, all } from '../db/database';

const router = Router();

// 1. Send single email in background (Zero tabs)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, message, leadId } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, message: 'Recipient email and message body are required.' });
    }

    // Strict Duplicate Exclusion Check: Never email contacted leads again
    if (leadId) {
      const existing = await get<{ status: string; last_contacted_at: string }>(
        "SELECT status, last_contacted_at FROM leads WHERE id = ? AND (status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL)",
        [leadId]
      );
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '🚫 This lead was already contacted in the past. Duplicate messaging is strictly blocked.',
        });
      }
    }

    const emailSubject = subject || 'Quick question regarding your business';
    const result = await sendDirectEmail(to, emailSubject, message, leadId);

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
    console.error('Email send route error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// 2. Batch send emails in background
router.post('/batch-send', async (req: Request, res: Response) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads provided for batch email.' });
    }

    // Strict Duplicate Exclusion Check for Batch
    const contactedRecords = await all<{ id: number; contact_email?: string }>(
      "SELECT id, contact_email FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
    );
    const contactedIdSet = new Set(contactedRecords.map((c) => c.id));
    const contactedEmailSet = new Set(
      contactedRecords
        .filter((c) => c.contact_email)
        .map((c) => c.contact_email!.toLowerCase().trim())
    );

    const eligibleLeads = leads.filter((l) => {
      const email = (l.email || l.contact_email || '').toLowerCase().trim();
      return !contactedIdSet.has(l.id) && (!email || !contactedEmailSet.has(email));
    });

    if (eligibleLeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected leads have already been contacted in past campaigns. Duplicate messaging blocked.',
      });
    }

    // Run batch sending asynchronously in background
    (async () => {
      console.log(`[EmailBatch] Starting background batch email for ${eligibleLeads.length} leads...`);
      for (let i = 0; i < eligibleLeads.length; i++) {
        const status = await getEmailSendStatus();
        if (status.limitReached) {
          console.log(`[EmailBatch] Anti-ban safety limit reached (${status.sentToday}/${DAILY_EMAIL_SAFETY_LIMIT}), stopping batch.`);
          break;
        }

        const lead = eligibleLeads[i];
        if (!lead.email || !lead.message) continue;

        const subject = lead.subject || `Quick question regarding ${lead.name}`;
        const sendResult = await sendDirectEmail(lead.email, subject, lead.message, lead.id);

        if (sendResult.success && lead.id) {
          await run(
            "UPDATE leads SET status = 'contacted', in_campaign_queue = 0, last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [lead.id]
          );
        }

        // 3 second human delay between emails to avoid spam filters
        if (i < eligibleLeads.length - 1) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      console.log(`[EmailBatch] Finished batch email for ${eligibleLeads.length} leads.`);
    })();

    return res.json({
      success: true,
      message: `Dispatched batch email for ${eligibleLeads.length} leads in the background!`,
    });
  } catch (error: any) {
    console.error('Batch email error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Batch email failed' });
  }
});

// 3. Anti-ban daily send status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getEmailSendStatus();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Test SMTP settings
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body || {};
    const result = await testSmtpConnection(
      smtpUser && smtpPass
        ? {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Test Resend API Key
router.post('/test-resend', async (req: Request, res: Response) => {
  try {
    const { resendApiKey } = req.body || {};
    const { testResendConnection } = await import('../services/emailService');
    const result = await testResendConnection(resendApiKey);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
