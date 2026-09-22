import { Router, Request, Response } from 'express';
import { searchPlaces } from '../services/placesService';

const router = Router();

router.post('/search', async (req: Request, res: Response) => {
  try {
    const {
      category,
      location,
      radius,
      websiteFilter = 'all',
      brandTrack = 'production',
      countryCode,
      latitude,
      longitude,
    } = req.body;

    if (!category || !location) {
      return res.status(400).json({ error: 'Category and location are required.' });
    }

    // Support both meters (e.g. 10000) and km (e.g. 10) cleanly without double-multiplying
    let radiusMeters = 10000;
    if (radius) {
      const parsed = parseInt(String(radius), 10);
      radiusMeters = parsed > 200 ? parsed : parsed * 1000;
    }

    const coords =
      latitude !== undefined && longitude !== undefined
        ? { latitude: parseFloat(String(latitude)), longitude: parseFloat(String(longitude)) }
        : undefined;

    const result = await searchPlaces(
      category,
      location,
      radiusMeters,
      websiteFilter,
      brandTrack,
      countryCode,
      coords
    );

    return res.json(result);
  } catch (error: any) {
    console.error('Places search route error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
