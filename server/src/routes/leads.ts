import { Router, Request, Response } from 'express';
import { run, get, all } from '../db/database';
import { generatePitch, OfferedService, auditWebsite, evaluateMessageQuality, generateFollowupMessage } from '../services/aiService';

const router = Router();

/** Normalize a raw phone string to E.164 (+XXXXXXXXXXX) best-effort.
 * Returns the cleaned string or the original if it can't be normalized. */
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  // Strip spaces, dashes, parens, dots
  let cleaned = raw.replace(/[\s\-().]/g, '');
  // Already looks like E.164
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned;
  // Strip leading 00 (international prefix without +)
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  // Indian mobile: 10 digits starting with 6-9 → +91
  if (/^[6-9]\d{9}$/.test(cleaned)) return '+91' + cleaned;
  // US/Canada: 10 digit → +1
  if (/^[2-9]\d{9}$/.test(cleaned)) return '+1' + cleaned;
  // If starts with digit (no country code), prepend +
  if (/^[1-9]\d{6,14}$/.test(cleaned)) return '+' + cleaned;
  return cleaned || null;
}

// 1. Get all leads with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      source,
      brandTrack,
      status,
      search,
      hasWebsite,
      inCampaign,
      minScore,
      limit = 100,
      offset = 0,
    } = req.query;

    let whereClause = ' WHERE 1=1';
    const params: any[] = [];

    if (brandTrack && brandTrack !== 'all') {
      whereClause += ' AND (brand_track = ? OR brand_track IS NULL)';
      params.push(brandTrack);
    }

    if (source && source !== 'all') {
      whereClause += ' AND source = ?';
      params.push(source);
    }

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (minScore) {
      whereClause += ' AND high_ticket_score >= ?';
      params.push(parseInt(minScore as string, 10));
    }

    if (hasWebsite === 'no_website') {
      whereClause += ' AND (has_website = 0 OR website IS NULL OR website = "")';
    } else if (hasWebsite === 'has_website') {
      whereClause += ' AND has_website = 1 AND website IS NOT NULL AND website != ""';
    }

    if (inCampaign === 'true' || inCampaign === '1') {
      whereClause += ' AND in_campaign_queue = 1';
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR category LIKE ? OR address LIKE ? OR description LIKE ? OR instagram_handle LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild, searchWild);
    }

    // Exact count query
    const countRes = await get<{ total: number }>(`SELECT COUNT(*) as total FROM leads${whereClause}`, params);

    // List query with pagination
    const query = `SELECT * FROM leads${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, parseInt(limit as string, 10), parseInt(offset as string, 10)];

    const leads = await all(query, queryParams);

    return res.json({
      leads,
      total: countRes?.total || 0,
    });
  } catch (error: any) {
    console.error('Get leads error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 1b. Get single lead by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await get('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    return res.json(lead);
  } catch (error: any) {
    console.error('Get lead error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 1c. Create single lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const lead = req.body;
    if (!lead.name) {
      return res.status(400).json({ error: 'Lead name is required.' });
    }

    const has_website = lead.has_website !== undefined ? (lead.has_website ? 1 : 0) : (lead.website && lead.website.trim() ? 1 : 0);

    const resInsert = await run(
      `INSERT INTO leads (
        source, brand_track, external_id, name, category, contact_email, phone, website,
        has_website, instagram_handle, offered_service, in_campaign_queue,
        address, country_code, high_ticket_score, rating, user_ratings_total, subscriber_count, video_count,
        view_count, channel_handle, description, status, pitch, pitch_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.source || 'manual',
        lead.brand_track || 'production',
        lead.external_id || null,
        lead.name,
        lead.category || null,
        lead.contact_email || null,
        lead.phone || null,
        lead.website || null,
        has_website,
        lead.instagram_handle || null,
        lead.offered_service || 'general',
        lead.in_campaign_queue ? 1 : 0,
        lead.address || null,
        lead.country_code || null,
        lead.high_ticket_score || 0,
        lead.rating || null,
        lead.user_ratings_total || null,
        lead.subscriber_count || null,
        lead.video_count || null,
        lead.view_count || null,
        lead.channel_handle || null,
        lead.description || null,
        lead.status || 'not_contacted',
        lead.pitch || null,
        lead.pitch ? 'ready' : 'draft',
        lead.notes || null,
      ]
    );

    const created = await get('SELECT * FROM leads WHERE id = ?', [resInsert.id]);
    return res.json(created);
  } catch (error: any) {
    console.error('Create lead error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Batch or single save leads (optimized: single pre-flight dedup query)
router.post('/batch-save', async (req: Request, res: Response) => {
  try {
    const { leads, autoGeneratePitch = false, offeredService = 'general' } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required.' });
    }

    // ── Single bulk dedup query instead of N separate queries ─────────────────
    const externalIds = leads.map((l: any) => l.external_id).filter(Boolean);
    let existingExtIds = new Set<string>();
    let existingNameSrcPairs = new Set<string>();

    if (externalIds.length > 0) {
      const placeholders = externalIds.map(() => '?').join(',');
      const existingRows = await all<{ external_id: string }>(
        `SELECT external_id FROM leads WHERE external_id IN (${placeholders})`,
        externalIds
      );
      existingRows.forEach((r) => existingExtIds.add(r.external_id));
    }

    const leadsWithoutExtId = leads.filter((l: any) => !l.external_id && l.name);
    if (leadsWithoutExtId.length > 0) {
      const nameSrcRows = await all<{ name: string; source: string }>(
        'SELECT name, source FROM leads WHERE name IN (' +
          leadsWithoutExtId.map(() => '?').join(',') +
          ')',
        leadsWithoutExtId.map((l: any) => l.name)
      );
      nameSrcRows.forEach((r) => existingNameSrcPairs.add(`${r.name}||${r.source}`));
    }
    // ─────────────────────────────────────────────────────────────────────────

    let savedCount = 0;
    const insertedLeads: { id: number | undefined; name: string }[] = [];

    for (const lead of leads) {
      // Skip if already exists
      if (lead.external_id && existingExtIds.has(lead.external_id)) continue;
      if (!lead.external_id && lead.name && existingNameSrcPairs.has(`${lead.name}||${lead.source || 'google_places'}`)) continue;
      if (!lead.name) continue;

      let pitch = lead.pitch || null;
      let pitch_status = pitch ? 'ready' : 'draft';
      const has_website = lead.has_website !== undefined
        ? (lead.has_website ? 1 : 0)
        : (lead.website && lead.website.trim() ? 1 : 0);

      // Normalize phone to E.164 so WhatsApp works without issues
      const normalizedPhone = normalizePhone(lead.phone);

      if (autoGeneratePitch && !pitch) {
        try {
          const gen = await generatePitch(
            { ...lead, has_website: Boolean(has_website) },
            'friendly',
            offeredService as OfferedService
          );
          pitch = gen.pitch;
          pitch_status = 'ready';
        } catch (_) { /* pitch generation optional — don't block save */ }
      }

      const resInsert = await run(
        `INSERT INTO leads (
          source, brand_track, external_id, name, category, contact_email, phone, website,
          has_website, instagram_handle, offered_service, in_campaign_queue,
          address, country_code, high_ticket_score, rating, user_ratings_total, subscriber_count, video_count,
          view_count, channel_handle, description, status, pitch, pitch_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.source || 'google_places',
          lead.brand_track || 'production',
          lead.external_id || null,
          lead.name,
          lead.category || null,
          lead.contact_email || null,
          normalizedPhone,
          lead.website || null,
          has_website,
          lead.instagram_handle || null,
          offeredService,
          lead.in_campaign_queue ? 1 : 0,
          lead.address || null,
          lead.country_code || null,
          lead.high_ticket_score || 0,
          lead.rating || null,
          lead.user_ratings_total || null,
          lead.subscriber_count || null,
          lead.video_count || null,
          lead.view_count || null,
          lead.channel_handle || null,
          lead.description || null,
          lead.status || 'not_contacted',
          pitch,
          pitch_status,
          lead.notes || null,
        ]
      );

      savedCount++;
      insertedLeads.push({ id: resInsert.id, name: lead.name });
    }

    return res.json({ success: true, savedCount, insertedLeads });
  } catch (error: any) {
    console.error('Save leads error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Campaign Queue Management
router.post('/campaign-queue', async (req: Request, res: Response) => {
  try {
    const rawIds = req.body.leadIds || req.body.ids;
    const inQueue = req.body.inQueue !== undefined ? (req.body.inQueue ? 1 : 0) : 1;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array required.' });
    }

    const placeholders = rawIds.map(() => '?').join(',');
    await run(`UPDATE leads SET in_campaign_queue = ? WHERE id IN (${placeholders})`, [inQueue, ...rawIds]);
    return res.json({ success: true, updatedCount: rawIds.length });
  } catch (error: any) {
    console.error('Campaign queue toggle error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/campaign-queue/add', async (req: Request, res: Response) => {
  try {
    const rawIds = req.body.ids || req.body.leadIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ error: 'ids array required.' });
    }

    const placeholders = rawIds.map(() => '?').join(',');
    await run(`UPDATE leads SET in_campaign_queue = 1 WHERE id IN (${placeholders})`, rawIds);
    return res.json({ success: true, count: rawIds.length });
  } catch (error: any) {
    console.error('Add to campaign error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/campaign-queue/remove', async (req: Request, res: Response) => {
  try {
    const rawIds = req.body.ids || req.body.leadIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ error: 'ids array required.' });
    }

    const placeholders = rawIds.map(() => '?').join(',');
    await run(`UPDATE leads SET in_campaign_queue = 0 WHERE id IN (${placeholders})`, rawIds);
    return res.json({ success: true, count: rawIds.length });
  } catch (error: any) {
    console.error('Remove from campaign error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/campaign-queue/clear', async (_req: Request, res: Response) => {
  try {
    await run('UPDATE leads SET in_campaign_queue = 0');
    return res.json({ success: true, message: 'Campaign queue cleared.' });
  } catch (error: any) {
    console.error('Clear campaign error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Update single lead
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      pitch,
      pitch_status,
      notes,
      contact_email,
      phone,
      instagram_handle,
      offered_service,
      in_campaign_queue,
      markContacted,
    } = req.body;

    const lead = await get('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (pitch !== undefined) {
      updates.push('pitch = ?');
      params.push(pitch);
    }
    if (pitch_status !== undefined) {
      updates.push('pitch_status = ?');
      params.push(pitch_status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (contact_email !== undefined) {
      updates.push('contact_email = ?');
      params.push(contact_email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (instagram_handle !== undefined) {
      updates.push('instagram_handle = ?');
      params.push(instagram_handle);
    }
    if (offered_service !== undefined) {
      updates.push('offered_service = ?');
      params.push(offered_service);
    }
    if (in_campaign_queue !== undefined) {
      updates.push('in_campaign_queue = ?');
      params.push(in_campaign_queue ? 1 : 0);
    }
    if (req.body.pipeline_stage !== undefined) {
      updates.push('pipeline_stage = ?');
      params.push(req.body.pipeline_stage);
    }
    if (req.body.intent_level !== undefined) {
      updates.push('intent_level = ?');
      params.push(req.body.intent_level);
    }
    if (req.body.budget_estimate !== undefined) {
      updates.push('budget_estimate = ?');
      params.push(req.body.budget_estimate);
    }
    if (req.body.lead_quality_score !== undefined) {
      updates.push('lead_quality_score = ?');
      params.push(req.body.lead_quality_score);
    }
    if (markContacted) {
      updates.push('last_contacted_at = CURRENT_TIMESTAMP');
      if (!status || status === 'not_contacted') {
        updates.push("status = 'contacted'");
      }
      if (req.body.pipeline_stage === undefined) {
        updates.push("pipeline_stage = 'contacted'");
      }
      if (in_campaign_queue === undefined) {
        updates.push('in_campaign_queue = 0');
      }
    }

    params.push(id);
    await run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await get('SELECT * FROM leads WHERE id = ?', [id]);
    return res.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error('Update lead error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4b. Update CRM Pipeline Stage
router.put('/:id/stage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    if (!stage) {
      return res.status(400).json({ error: 'stage is required.' });
    }

    let leadStatus = 'not_contacted';
    if (['contacted'].includes(stage)) leadStatus = 'contacted';
    else if (['replied', 'interested', 'meeting', 'proposal'].includes(stage)) leadStatus = 'replied';
    else if (['won'].includes(stage)) leadStatus = 'converted';
    else if (['lost'].includes(stage)) leadStatus = 'rejected';

    await run(
      'UPDATE leads SET pipeline_stage = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [stage, leadStatus, id]
    );

    const updated = await get('SELECT * FROM leads WHERE id = ?', [id]);
    return res.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error('Update stage error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4c. Website & Opportunity Audit
router.post('/:id/audit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await get('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const audit = await auditWebsite(lead.website, lead.name, lead.category);
    await run('UPDATE leads SET website_audit_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      JSON.stringify(audit),
      id,
    ]);

    return res.json({ success: true, audit });
  } catch (error: any) {
    console.error('Lead audit error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4d. AI Message Quality Evaluator (0 - 100)
router.post('/evaluate-message', async (req: Request, res: Response) => {
  try {
    const pitchText = req.body.pitch || req.body.message || '';
    const leadObj = req.body.lead || req.body.leadContext;
    const evaluation = evaluateMessageQuality(pitchText, leadObj);
    return res.json(evaluation);
  } catch (error: any) {
    console.error('Evaluate message error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4e. Generate Follow-Up Sequence Message
router.post('/:id/generate-followup', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { step = 1 } = req.body;
    const lead = await get('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const followup = await generateFollowupMessage(lead, step, lead.pitch, lead.brand_track || 'production');
    return res.json({ success: true, followup });
  } catch (error: any) {
    console.error('Generate followup error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 5. Delete lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await run('DELETE FROM leads WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Lead deleted.' });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 6. Bulk Delete
router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required.' });
    }

    const placeholders = ids.map(() => '?').join(',');
    await run(`DELETE FROM leads WHERE id IN (${placeholders})`, ids);
    return res.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 7. Export leads to CSV
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const leads = await all('SELECT * FROM leads ORDER BY id DESC');

    const headers = [
      'ID',
      'Source',
      'Name',
      'Category',
      'Email',
      'Phone',
      'Website',
      'HasWebsite',
      'Instagram',
      'OfferedService',
      'Address',
      'Rating',
      'Reviews',
      'Subscribers',
      'Status',
      'Pitch',
      'Notes',
      'CreatedAt',
      'LastContactedAt',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l) => [
      l.id,
      l.source,
      escapeCsv(l.name),
      escapeCsv(l.category),
      escapeCsv(l.contact_email),
      escapeCsv(l.phone),
      escapeCsv(l.website),
      l.has_website ? 'Yes' : 'No',
      escapeCsv(l.instagram_handle),
      escapeCsv(l.offered_service),
      escapeCsv(l.address),
      l.rating || '',
      l.user_ratings_total || '',
      l.subscriber_count || '',
      l.status,
      escapeCsv(l.pitch),
      escapeCsv(l.notes),
      l.created_at,
      l.last_contacted_at || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_export_${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
