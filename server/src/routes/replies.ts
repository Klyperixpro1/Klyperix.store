import { Router, Request, Response } from 'express';
import { run, all, get } from '../db/database';
import { sendDirectWhatsApp } from '../services/whatsappService';
import { sendDirectEmail } from '../services/emailService';
import { generateSmartReply, analyzeMessageSentiment, enhanceReplyDraft } from '../services/aiService';

const router = Router();

// 1. Get all inbound replies with joined lead details
router.get('/', async (_req: Request, res: Response) => {
  try {
    const replies = await all(`
      SELECT 
        r.id,
        r.lead_id,
        r.channel,
        r.sender_id,
        r.sender_name,
        r.message_text,
        r.received_at,
        r.is_read,
        l.name as lead_name,
        l.category as lead_category,
        l.status as lead_status,
        l.pitch as original_pitch,
        l.phone as lead_phone,
        l.contact_email as lead_email,
        l.source as lead_source
      FROM inbound_replies r
      LEFT JOIN leads l ON r.lead_id = l.id
      ORDER BY r.id DESC
    `);

    const unreadCountRow = await get<{ count: number }>(
      'SELECT COUNT(*) as count FROM inbound_replies WHERE is_read = 0'
    );

    // Attach sentiment analysis to each reply
    const repliesWithSentiment = replies.map((r) => ({
      ...r,
      sentiment: analyzeMessageSentiment(r.message_text),
    }));

    return res.json({
      replies: repliesWithSentiment,
      unreadCount: unreadCountRow?.count || 0,
    });
  } catch (error: any) {
    console.error('Get replies error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Mark replies as read
router.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const { replyIds } = req.body;
    if (Array.isArray(replyIds) && replyIds.length > 0) {
      const placeholders = replyIds.map(() => '?').join(',');
      await run(`UPDATE inbound_replies SET is_read = 1 WHERE id IN (${placeholders})`, replyIds);
    } else {
      // Mark all as read
      await run('UPDATE inbound_replies SET is_read = 1');
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. AI Sentiment-Matched Smart Reply Generator
router.post('/generate-ai-response', async (req: Request, res: Response) => {
  try {
    const { incomingMessage, originalPitch, leadName } = req.body;
    if (!incomingMessage) {
      return res.status(400).json({ error: 'incomingMessage is required.' });
    }

    const result = await generateSmartReply(incomingMessage, originalPitch, leadName);
    return res.json(result);
  } catch (error: any) {
    console.error('Generate smart reply error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3b. Custom reply, AI-enhance mode — takes a rough human draft and polishes it
router.post('/enhance-reply', async (req: Request, res: Response) => {
  try {
    const { rawDraft, incomingMessage, leadName, brandMode } = req.body;
    if (!rawDraft || !incomingMessage) {
      return res.status(400).json({ error: 'rawDraft and incomingMessage are required.' });
    }

    const result = await enhanceReplyDraft(rawDraft, incomingMessage, leadName, brandMode || 'production');
    return res.json(result);
  } catch (error: any) {
    console.error('Enhance reply error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Quick Reply back to WhatsApp or Email from Inbox
router.post('/send-response', async (req: Request, res: Response) => {
  try {
    const { leadId, phone, email, channel, message, subject } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    let result: { success: boolean; message: string };

    if (channel === 'email' || (!phone && email)) {
      if (!email) {
        return res.status(400).json({ error: 'Recipient email is required for email replies.' });
      }
      result = await sendDirectEmail(
        email,
        subject || 'Re: Regarding our conversation',
        message,
        leadId
      );
    } else {
      if (!phone) {
        return res.status(400).json({ error: 'Recipient phone number is required for WhatsApp replies.' });
      }
      result = await sendDirectWhatsApp(phone, message);
    }

    if (result.success && leadId) {
      await run(
        "UPDATE leads SET status = 'contacted', last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [leadId]
      );
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Send response error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
