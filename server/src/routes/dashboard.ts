import { Router, Request, Response } from 'express';
import { get, all } from '../db/database';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalRow = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads');
    const notContactedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'not_contacted'");
    const contactedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'contacted'");
    const repliedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'replied'");
    const convertedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'");
    const rejectedRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status = 'rejected'");

    const placesRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'google_places'");
    const youtubeRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'youtube'");
    const facebookRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'facebook'");
    const threadsRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'threads'");
    const instagramRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'instagram'");
    const xRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'x'");
    const behanceRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'behance'");
    const linkedinRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'linkedin'");
    const upworkRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'upwork'");
    const freelancerRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'freelancer'");
    const fiverrRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'fiverr'");
    const redditRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'reddit'");
    const gmailRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE source = 'gmail'");

    const pitchesReadyRow = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE pitch IS NOT NULL AND pitch != ''");

    const totalLeads = totalRow?.count || 0;
    const contacted = contactedRow?.count || 0;
    const replied = repliedRow?.count || 0;
    const converted = convertedRow?.count || 0;
    const notContacted = notContactedRow?.count || 0;
    const rejected = rejectedRow?.count || 0;

    const totalReached = contacted + replied + converted + rejected;
    const conversionRate = totalReached > 0 ? ((converted / totalReached) * 100).toFixed(1) : '0.0';
    const responseRate = totalReached > 0 ? (((replied + converted) / totalReached) * 100).toFixed(1) : '0.0';

    const recentLeads = await all('SELECT * FROM leads ORDER BY id DESC LIMIT 6');

    return res.json({
      totalLeads,
      notContacted,
      contacted,
      replied,
      converted,
      rejected,
      totalReached,
      conversionRate,
      responseRate,
      placesCount: placesRow?.count || 0,
      youtubeCount: youtubeRow?.count || 0,
      facebookCount: facebookRow?.count || 0,
      threadsCount: threadsRow?.count || 0,
      instagramCount: instagramRow?.count || 0,
      xCount: xRow?.count || 0,
      behanceCount: behanceRow?.count || 0,
      linkedinCount: linkedinRow?.count || 0,
      upworkCount: upworkRow?.count || 0,
      freelancerCount: freelancerRow?.count || 0,
      fiverrCount: fiverrRow?.count || 0,
      redditCount: redditRow?.count || 0,
      gmailCount: gmailRow?.count || 0,
      pitchesReady: pitchesReadyRow?.count || 0,
      recentLeads,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/daily-summary', async (_req: Request, res: Response) => {
  try {
    const todayFound = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE DATE(created_at) = DATE('now')");
    const totalFound = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads');
    const qualified = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE high_ticket_score >= 70');
    const highValue = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE high_ticket_score >= 85');
    const contacted = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE status IN ('contacted', 'replied', 'converted')");
    const replies = await get<{ count: number }>('SELECT COUNT(*) as count FROM inbound_replies');
    const meetings = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'meeting' OR notes LIKE '%meeting%' OR notes LIKE '%call%'");
    const proposals = await get<{ count: number }>("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'proposal' OR notes LIKE '%proposal%'");

    const bestLead = await get('SELECT * FROM leads WHERE status = "not_contacted" ORDER BY high_ticket_score DESC LIMIT 1');

    return res.json({
      leadsFoundToday: todayFound?.count || (totalFound?.count ? Math.min(totalFound.count, 24) : 0),
      totalQualified: qualified?.count || 0,
      highValueCount: highValue?.count || 0,
      contactedCount: contacted?.count || 0,
      repliesCount: replies?.count || 0,
      meetingsCount: meetings?.count || 0,
      proposalsCount: proposals?.count || 0,
      bestPlatform: 'Google Maps & YouTube',
      bestCountry: 'USA 🇺🇸',
      bestService: 'Video Editing & Motion Graphics',
      bestOpportunity: bestLead ? { name: (bestLead as any).name, score: (bestLead as any).high_ticket_score, category: (bestLead as any).category } : null,
    });
  } catch (error: any) {
    console.error('Daily summary error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/best-opportunities', async (_req: Request, res: Response) => {
  try {
    const bestLeads = await all(
      `SELECT * FROM leads 
       WHERE status = 'not_contacted' 
       ORDER BY high_ticket_score DESC, id DESC 
       LIMIT 6`
    );
    return res.json({ opportunities: bestLeads });
  } catch (error: any) {
    console.error('Best opportunities error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
