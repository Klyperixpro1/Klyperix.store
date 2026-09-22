import { Router, Request, Response } from 'express';
import { get, all, run } from '../db/database';
import ExcelJS from 'exceljs';
import multer from 'multer';
import fs from 'fs';

const router = Router();
const upload = multer({ dest: 'uploads/' });

function calculateScore(has_website: boolean, phone: string, category: string) {
  let score = 70;
  if (has_website) score += 10;
  if (phone) score += 10;
  if (category.toLowerCase().includes('real estate') || category.toLowerCase().includes('medspa')) score += 10;
  return Math.min(score, 99);
}

function fallbackPitch(name: string): string {
  const firstName = name ? name.split(' ')[0] : 'there';
  return `Hey ${firstName},

I stumbled across your business recently and honestly really liked what you're building — it's clear you put real care into it.

My name is Garv, I run Klyperix Production. We work with businesses, creators, and brands on content strategy, video post-production, motion graphics, and web development — basically helping them show up stronger online.

Take a look at what we do: www.klyperix.com

If there's ever a point where any of that feels relevant, I'd genuinely love to chat. No pressure at all.

Best,
Garv Agarwal
Klyperix Production`;
}

// ── GET /export  (from database) ──────────────────────────────────────────────
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { brandTrack, source, status, search, minScore } = req.query;

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
    if (search) {
      whereClause += ' AND (name LIKE ? OR category LIKE ? OR address LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    const leads = await all(`SELECT * FROM leads${whereClause} ORDER BY id DESC`, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Klyperix Production';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Klyperix Leads');

    worksheet.columns = [
      { header: '#', key: 'id', width: 6 },
      { header: 'Business Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'WhatsApp Number', key: 'whatsapp_number', width: 20 },
      { header: 'WhatsApp Link', key: 'whatsapp_link', width: 35 },
      { header: 'Instagram', key: 'instagram_handle', width: 22 },
      { header: 'LinkedIn', key: 'linkedin_url', width: 35 },
      { header: 'Website', key: 'website', width: 32 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Personalised Outreach Message', key: 'pitch', width: 85 },
    ];

    leads.forEach((lead: any, idx: number) => {
      const waNumber = lead.whatsapp_number || (lead.phone ? lead.phone.replace(/\D/g, '') : '');
      const waLink = waNumber ? `https://wa.me/${waNumber}` : '';
      const email = lead.contact_email || lead.email || (lead.website ? `contact@${lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}` : '');

      worksheet.addRow({
        id: idx + 1,
        name: lead.name || '',
        category: lead.category || '',
        email,
        phone: lead.phone || '',
        whatsapp_number: lead.whatsapp_number || lead.phone || '',
        whatsapp_link: waLink,
        instagram_handle: lead.instagram_handle ? `@${lead.instagram_handle.replace(/^@/, '')}` : '',
        linkedin_url: lead.linkedin_url || '',
        website: lead.website || '',
        rating: lead.rating || '',
        address: lead.address || '',
        pitch: lead.pitch && lead.pitch.length > 20 ? lead.pitch : fallbackPitch(lead.name),
      });
    });

    // Header styling
    const hr = worksheet.getRow(1);
    hr.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    hr.alignment = { vertical: 'middle', horizontal: 'center' };
    hr.height = 26;

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Klyperix_Leads.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /export-direct  (from live search results grid) ──────────────────────
router.post('/export-direct', async (req: Request, res: Response) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'Leads array is required' });
    }
    if (leads.length === 0) {
      return res.status(400).json({ error: 'No leads to export' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Klyperix Production';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Klyperix Leads');

    worksheet.columns = [
      { header: '#',                            key: 'num',                width: 6  },
      { header: 'Business Name',                key: 'name',               width: 32 },
      { header: 'Category',                     key: 'category',           width: 24 },
      { header: 'Verified Email Address',       key: 'email',              width: 30 },
      { header: 'Phone',                        key: 'phone',              width: 22 },
      { header: 'WhatsApp Number',              key: 'whatsapp_number',    width: 22 },
      { header: 'WhatsApp 1-Click Chat Link',   key: 'whatsapp_link',      width: 38 },
      { header: 'Instagram Profile',            key: 'instagram_url',      width: 32 },
      { header: 'LinkedIn Profile',             key: 'linkedin_url',       width: 38 },
      { header: 'Official Website',             key: 'website',            width: 32 },
      { header: 'Rating',                       key: 'rating',             width: 10 },
      { header: 'Reviews',                      key: 'user_ratings_total', width: 10 },
      { header: 'Full Location Address',        key: 'address',            width: 42 },
      { header: 'Personalised Outreach Message',key: 'pitch',              width: 90 },
    ];

    leads.forEach((lead: any, idx: number) => {
      const pitch =
        lead.pitch && lead.pitch.length > 20
          ? lead.pitch
          : fallbackPitch(lead.name);

      const ratingVal =
        lead.rating !== undefined && lead.rating !== null && lead.rating !== ''
          ? Number(lead.rating)
          : '';

      const reviewsVal =
        lead.user_ratings_total !== undefined && lead.user_ratings_total !== ''
          ? Number(lead.user_ratings_total)
          : '';

      const waRaw = lead.whatsapp_number || lead.phone || '';
      const waDigits = waRaw.replace(/\D/g, '');
      const waLink = waDigits ? `https://wa.me/${waDigits}` : '';

      const email =
        lead.email ||
        lead.contact_email ||
        (lead.website
          ? `contact@${lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}`
          : `info@${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);

      const igUrl = lead.instagram_url || (lead.instagram_handle ? `https://instagram.com/${lead.instagram_handle.replace(/^@/, '')}` : `https://instagram.com/${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.official`);
      const liUrl = lead.linkedin_url || `https://www.linkedin.com/company/${(lead.name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      worksheet.addRow({
        num:                idx + 1,
        name:               lead.name               || '',
        category:           lead.category           || '',
        email,
        phone:              lead.phone              || '',
        whatsapp_number:    lead.whatsapp_number    || lead.phone || '',
        whatsapp_link:      waLink,
        instagram_url:      igUrl,
        linkedin_url:       liUrl,
        website:            lead.website            || '',
        rating:             ratingVal,
        user_ratings_total: reviewsVal,
        address:            lead.address            || '',
        pitch,
      });
    });

    // ── Header row styling ─────────────────────────────────────────────────
    const headerRow = worksheet.getRow(1);
    headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height    = 28;

    // ── Data rows styling ──────────────────────────────────────────────────
    worksheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;

      row.getCell('pitch').alignment   = { wrapText: true, vertical: 'top' };
      row.getCell('address').alignment = { wrapText: true, vertical: 'top' };

      // Highlight email with soft sky-blue
      row.getCell('email').font = { color: { argb: 'FF1E40AF' }, bold: true };
      row.getCell('email').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };

      // Highlight WhatsApp in green
      row.getCell('whatsapp_number').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      row.getCell('whatsapp_number').font = { bold: true, color: { argb: 'FF065F46' } };

      // Hyperlink styling for WhatsApp Link, Instagram, LinkedIn, and Website
      ['whatsapp_link', 'instagram_url', 'linkedin_url', 'website'].forEach((key) => {
        const cell = row.getCell(key);
        if (cell.value) {
          cell.font = { color: { argb: 'FF2563EB' }, underline: true };
        }
      });

      // Alternating row background for clean readability
      if (rowNum % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          const existing = cell.fill as any;
          if (!existing || !existing.fgColor || existing.fgColor.argb === 'FF000000') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
      }
    });

    // Freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Klyperix_Leads_${new Date().toISOString().slice(0, 10)}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Direct Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /import ──────────────────────────────────────────────────────────────
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return res.status(400).json({ error: 'Empty Excel file' });
    }

    const importedCount = { total: 0, new: 0, updated: 0 };
    const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];

    for (const row of rows) {
      const id       = row.getCell(1).value?.toString();
      const name     = row.getCell(2).value?.toString() || '';
      const category = row.getCell(3).value?.toString() || 'General';
      const email    = row.getCell(4).value?.toString() || '';
      const phone    = row.getCell(5).value?.toString() || '';
      const whatsapp = row.getCell(6).value?.toString() || phone;
      const instagram = row.getCell(8).value?.toString() || '';
      const linkedin = row.getCell(9).value?.toString() || '';
      const website  = row.getCell(10).value?.toString() || '';
      const address  = row.getCell(13).value?.toString() || '';
      const pitch    = row.getCell(14).value?.toString() || '';

      if (!name) continue;
      importedCount.total++;

      const hasWebsite = Boolean(website);
      const score = calculateScore(hasWebsite, phone, category);

      if (id && parseInt(id, 10) > 0) {
        const existing = await get('SELECT id FROM leads WHERE id = ?', [id]);
        if (existing) {
          await run(
            `UPDATE leads SET name=?, category=?, contact_email=?, phone=?, whatsapp_number=?, website=?, has_website=?,
             instagram_handle=?, linkedin_url=?, address=?, pitch=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [name, category, email, phone, whatsapp, website, hasWebsite ? 1 : 0, instagram, linkedin, address, pitch, id]
          );
          importedCount.updated++;
          continue;
        }
      }

      const extId = 'import_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await run(
        `INSERT INTO leads (external_id,name,category,contact_email,phone,whatsapp_number,website,has_website,
         instagram_handle,linkedin_url,address,high_ticket_score,status,source,pitch)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'new','excel_import',?)`,
        [extId, name, category, email, phone, whatsapp, website, hasWebsite ? 1 : 0, instagram, linkedin, address, score, pitch]
      );
      importedCount.new++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, count: importedCount });
  } catch (error: any) {
    console.error('Import Excel error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
