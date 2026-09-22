import { Router, Request, Response } from 'express';
import {
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  isGoogleOAuthConfigured,
  disconnectGmailOAuth,
} from '../services/googleOAuthService';

const router = Router();

router.get('/start', async (_req: Request, res: Response) => {
  try {
    if (!(await isGoogleOAuthConfigured())) {
      return res.status(400).send('Google Sign-In is not set up yet. See SETUP.md for the one-time steps.');
    }
    const url = await getGoogleAuthUrl();
    return res.redirect(url);
  } catch (err: any) {
    return res.status(500).send(err.message || 'Failed to start Google Sign-In.');
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect('/?gmail_connected=0');
    }
    await handleGoogleOAuthCallback(code);
    return res.redirect('/?gmail_connected=1');
  } catch (err: any) {
    console.error('Google OAuth callback error:', err.message);
    return res.redirect(`/?gmail_connected=0&error=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
});

router.post('/disconnect', async (_req: Request, res: Response) => {
  try {
    await disconnectGmailOAuth();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
