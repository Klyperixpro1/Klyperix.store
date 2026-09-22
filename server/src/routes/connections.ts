import { Router, Request, Response } from 'express';
import { getAllConnections, updateConnectionStatus } from '../services/connectionsService';

const router = Router();

// GET /api/connections
router.get('/', async (req: Request, res: Response) => {
  try {
    const connections = await getAllConnections();
    return res.json({ connections });
  } catch (err: any) {
    console.error('Failed to get connections:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/connections/:id/status
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, accountIdentifier } = req.body;
    await updateConnectionStatus(id, status, accountIdentifier);
    const connections = await getAllConnections();
    return res.json({ success: true, connections });
  } catch (err: any) {
    console.error('Failed to update connection status:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
