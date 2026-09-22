import { Router, Request, Response } from 'express';
import { searchYouTubeChannels } from '../services/youtubeService';

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  try {
    const {
      keyword,
      minSubs,
      maxSubs,
      qualityFilter = 'all',
      brandTrack = 'production',
      regionCode = 'US',
    } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    const min = minSubs !== undefined && minSubs !== '' ? parseInt(minSubs, 10) : 0;
    const max = maxSubs !== undefined && maxSubs !== '' ? parseInt(maxSubs, 10) : 10000000;

    const result = await searchYouTubeChannels(
      keyword,
      min,
      max,
      qualityFilter,
      brandTrack,
      regionCode
    );

    return res.json(result);
  } catch (error: any) {
    console.error('YouTube search route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
