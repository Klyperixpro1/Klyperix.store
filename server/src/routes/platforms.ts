import { Router, Request, Response } from 'express';
import { searchReddit, searchUniversalPlatform, extractWebsiteContacts } from '../services/platformDiscoveryService';
import { run } from '../db/database';

const router = Router();

// 1. Live Website Contact & Email Extractor (Extracts real email, phone & social handles from a website)
router.post('/extract-contacts', async (req: Request, res: Response) => {
  try {
    const { websiteUrl, leadId } = req.body;
    if (!websiteUrl) {
      return res.status(400).json({ error: 'websiteUrl is required' });
    }

    const contacts = await extractWebsiteContacts(websiteUrl);

    if (leadId) {
      const updates: string[] = [];
      const params: any[] = [];
      if (contacts.email) {
        updates.push('contact_email = COALESCE(NULLIF(contact_email, ""), ?)');
        params.push(contacts.email);
      }
      if (contacts.phone) {
        updates.push('phone = COALESCE(NULLIF(phone, ""), ?)');
        params.push(contacts.phone);
      }
      if (contacts.instagramHandle) {
        updates.push('instagram_handle = COALESCE(NULLIF(instagram_handle, ""), ?)');
        params.push(contacts.instagramHandle);
      }
      if (updates.length > 0) {
        params.push(leadId);
        await run(`UPDATE leads SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
      }
    }

    return res.json({ success: true, contacts });
  } catch (err: any) {
    console.error('Contact extraction error:', err);
    return res.status(500).json({ error: err.message || 'Contact extraction failed' });
  }
});

// 2. Reddit search (r/forhire, r/videoediting, etc.)
router.get('/reddit/search', async (req: Request, res: Response) => {
  try {
    const { subreddit, keyword, queryKeyword } = req.query;
    const query = String(queryKeyword || keyword || subreddit || 'hiring video editor');
    const result = await searchReddit(query);
    return res.json(result);
  } catch (err: any) {
    console.error('Reddit search error:', err);
    return res.status(500).json({ error: err.message || 'Reddit search failed' });
  }
});

// 3. Universal Search across platforms
router.get('/:platform/search', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { queryKeyword, countryCode, brandTrack, timeFilter } = req.query;
    const result = await searchUniversalPlatform(platform, {
      queryKeyword: queryKeyword ? String(queryKeyword) : undefined,
      countryCode: countryCode ? String(countryCode) : 'US',
      brandTrack: brandTrack as any,
      timeFilter: timeFilter ? String(timeFilter) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    console.error(`Platform search error for ${req.params.platform}:`, err);
    return res.status(500).json({ error: err.message || 'Platform search failed' });
  }
});

export default router;
