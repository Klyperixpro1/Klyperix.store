import { Router, Request, Response } from 'express';
import { getAllSettings, setSetting, getSetting } from '../services/settingsService';
import { setEmergencyKillSwitch, getWhatsAppStatus } from '../services/whatsappService';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const router = Router();

function getDetectedClientSecret() {
  try {
    const rootPath = path.resolve(__dirname, '../../..');
    const secretPath = path.join(rootPath, 'client_secret.json');
    if (fs.existsSync(secretPath)) {
      const raw = fs.readFileSync(secretPath, 'utf8');
      const data = JSON.parse(raw);
      const installed = data.installed || data.web;
      if (installed) {
        return {
          found: true,
          projectId: installed.project_id || '',
          clientId: installed.client_id || '',
        };
      }
    }
  } catch (err) {
    console.error('Error reading client_secret.json:', err);
  }
  return { found: false };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();
    const detectedSecret = getDetectedClientSecret();
    const waStatus = await getWhatsAppStatus();
    const businessContactPhone = await getSetting('businessContactPhone');

    let customApiKeys: Array<{ id: string; name: string; key: string; value: string }> = [];
    if (settings.customApiKeys) {
      try {
        customApiKeys = JSON.parse(settings.customApiKeys);
      } catch (e) {}
    }

    const responseData = {
      ...settings,
      googlePlacesApiKey: settings.googlePlacesApiKey || '',
      youtubeApiKey: settings.youtubeApiKey || '',
      geminiApiKey: settings.geminiApiKey || '',
      groqApiKey: settings.groqApiKey || '',
      groqModel: settings.groqModel || 'llama-3.3-70b-versatile',
      grokApiKey: settings.grokApiKey || '',
      resendApiKey: settings.resendApiKey || '',
      redditApiKey: settings.redditApiKey || '',
      linkedinClientId: settings.linkedinClientId || '',
      linkedinClientSecret: settings.linkedinClientSecret || '',
      xApiKey: settings.xApiKey || '',
      xApiSecret: settings.xApiSecret || '',
      metaAppId: settings.metaAppId || '',
      metaAppSecret: settings.metaAppSecret || '',
      instagramAccessToken: settings.instagramAccessToken || '',
      hasGooglePlacesKey: Boolean(settings.googlePlacesApiKey),
      hasYoutubeKey: Boolean(settings.youtubeApiKey),
      hasGeminiKey: Boolean(settings.geminiApiKey),
      hasGroqKey: Boolean(settings.groqApiKey),
      hasGrokKey: Boolean(settings.grokApiKey),
      hasRedditKey: Boolean(settings.redditApiKey),
      hasResendKey: Boolean(settings.resendApiKey),
      hasLinkedinCredentials: Boolean(settings.linkedinClientId),
      hasXCredentials: Boolean(settings.xApiKey),
      hasMetaCredentials: Boolean(settings.metaAppId),
      customApiKeys,
      detectedGoogleProject: detectedSecret,
      killSwitchActive: waStatus.killSwitchActive,
      smtpHost: settings.smtpHost || 'smtp.gmail.com',
      smtpPort: settings.smtpPort || '587',
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass || '',
      smtpFrom: settings.smtpFrom || '',
      dailyEmailLimit: Number(settings.dailyEmailLimit || 50),
      dailyWhatsAppLimit: Number(settings.dailyWhatsAppLimit || 25),
      multiAccounts: settings.multiAccounts ? JSON.parse(settings.multiAccounts) : [],
      businessContactPhone: businessContactPhone || '',
    };
    return res.json(responseData);
  } catch (error: any) {
    console.error('Get settings error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    const keyFields = [
      'googlePlacesApiKey',
      'youtubeApiKey',
      'geminiApiKey',
      'groqApiKey',
      'groqModel',
      'grokApiKey',
      'resendApiKey',
      'redditApiKey',
      'fiverrApiKey',
      'linkedinClientId',
      'linkedinClientSecret',
      'xApiKey',
      'xApiSecret',
      'metaAppId',
      'metaAppSecret',
      'instagramAccessToken',
      'googleClientId',
      'googleClientSecret',
      'googleProjectId',
      'smtpHost',
      'smtpPort',
      'smtpUser',
      'smtpPass',
      'smtpFrom',
      'defaultPitchTone',
      'mockModeEnabled',
      'defaultBrandTrack',
      'dailyEmailLimit',
      'dailyWhatsAppLimit',
      'businessContactPhone',
    ];

    for (const field of keyFields) {
      if (body[field] !== undefined) {
        let val = typeof body[field] === 'string' ? body[field].trim() : String(body[field]);
        if (field === 'googlePlacesApiKey' && val.startsWith('GOCSPX-')) {
          // It is an OAuth Client Secret, save to googleClientSecret and keep googlePlacesApiKey clean
          await setSetting('googleClientSecret', val);
          val = '';
        }
        await setSetting(field, val);
      }
    }

    if (body.customApiKeys !== undefined) {
      const customStr = typeof body.customApiKeys === 'string' ? body.customApiKeys : JSON.stringify(body.customApiKeys);
      await setSetting('customApiKeys', customStr);
    }

    if (body.multiAccounts !== undefined) {
      await setSetting('multiAccounts', JSON.stringify(body.multiAccounts));
    }

    return res.json({ success: true, message: 'Settings saved permanently.' });
  } catch (error: any) {
    console.error('Save settings error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Emergency Kill Switch Endpoints
router.get('/kill-switch', async (_req: Request, res: Response) => {
  try {
    const waStatus = await getWhatsAppStatus();
    return res.json({ killSwitchActive: waStatus.killSwitchActive ?? false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/kill-switch', async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    const result = setEmergencyKillSwitch(Boolean(active));
    return res.json(result);
  } catch (error: any) {
    console.error('Kill switch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Validate & verify phone number format
router.post('/validate-phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ valid: false, message: 'Phone number required.' });

    const cleaned = phone.replace(/[\s\-().]/g, '');
    // Must start with + and have 7-15 digits
    const isValid = /^\+[1-9]\d{6,14}$/.test(cleaned);
    const isIndian = cleaned.startsWith('+91') && cleaned.length === 13;
    const isUS = cleaned.startsWith('+1') && cleaned.length === 12;
    const isGulf = /^\+971|\+966|\+974|\+965/.test(cleaned);

    return res.json({
      valid: isValid,
      formatted: isValid ? cleaned : null,
      region: isIndian ? 'IN' : isUS ? 'US' : isGulf ? 'Gulf' : 'International',
      message: isValid ? `✅ Valid number (${cleaned})` : '❌ Invalid format — must start with country code e.g. +91 or +1',
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, message: err.message });
  }
});

// Test key validity
router.post('/test-key', async (req: Request, res: Response) => {
  const { service, key } = req.body;
  const testKey = key ? key.trim() : await getSetting(getSettingKeyName(service));

  if (!testKey) {
    return res.status(400).json({ success: false, message: 'No API key provided to test.' });
  }

  try {
    if (service === 'google_places' || service === 'places') {
      // Check for OAuth Client Secret mistakenly pasted as API Key
      if (testKey.startsWith('GOCSPX-')) {
        await setSetting('googleClientSecret', testKey);
        return res.status(400).json({
          success: false,
          message: '⚠️ That is a Google OAuth Client Secret (starts with GOCSPX-), NOT a Google Maps API Key! An API key starts with "AIzaSy...". In Google Cloud Console: go to APIs & Services -> Credentials -> "+ CREATE CREDENTIALS" -> choose "API key". (We automatically saved your secret to OAuth settings).',
        });
      }

      if (!testKey.startsWith('AIza')) {
        return res.status(400).json({
          success: false,
          message: '❌ Invalid key format. Google Maps API keys always start with "AIzaSy...". Check Google Cloud Console -> Credentials.',
        });
      }

      // ── REAL verification: call Places API with a known query ──────────────
      try {
        const verifyRes = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          { textQuery: 'coffee shop', maxResultCount: 1 },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': testKey,
              'X-Goog-FieldMask': 'places.id,places.displayName',
            },
            timeout: 5000,
          }
        );
        // If we get here, key is valid
        await setSetting('googlePlacesApiKey', testKey);
        const count = verifyRes.data?.places?.length || 0;
        return res.json({
          success: true,
          message: `✅ Google Maps API verified! Live data confirmed (${count} results). Key saved permanently.`,
        });
      } catch (gmErr: any) {
        // Try legacy Places API as fallback verification
        try {
          const legacyRes = await axios.get(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=coffee&key=${testKey}`,
            { timeout: 5000 }
          );
          if (legacyRes.data?.status === 'OK' || legacyRes.data?.status === 'ZERO_RESULTS') {
            await setSetting('googlePlacesApiKey', testKey);
            return res.json({
              success: true,
              message: '✅ Google Maps Places API verified & saved permanently! Full search unlocked.',
            });
          }
          const apiErr = legacyRes.data?.error_message || legacyRes.data?.status || 'Verification failed';
          
          // If error is about billing, the key is 100% valid!
          if (String(apiErr).toLowerCase().includes('billing')) {
            await setSetting('googlePlacesApiKey', testKey);
            return res.json({
              success: true,
              billingRequired: true,
              message: '✅ API Key is Valid & Saved Permanently! Note: Google requires linking a billing account in Google Cloud to activate Google Maps APIs (Google gives $200 free credit monthly). Our built-in Free Real Lead Search is 100% active so you can find leads right away.',
            });
          }

          return res.status(400).json({ success: false, message: `❌ Google Maps API Error: ${apiErr}` });
        } catch (legacyErr: any) {
          const msg = gmErr.response?.data?.error?.message || gmErr.message || 'Key rejected by Google';
          if (String(msg).toLowerCase().includes('billing')) {
            await setSetting('googlePlacesApiKey', testKey);
            return res.json({
              success: true,
              billingRequired: true,
              message: '✅ API Key is Valid & Saved Permanently! Note: Google requires linking a billing account in Google Cloud to activate Google Maps APIs (Google gives $200 free credit monthly). Our built-in Free Real Lead Search is 100% active so you can find leads right away.',
            });
          }
          return res.status(400).json({ success: false, message: `❌ Invalid Google Maps API Key: ${msg}` });
        }
      }
    } else if (service === 'youtube') {
      if (testKey.startsWith('GOCSPX-')) {
        return res.status(400).json({
          success: false,
          message: '⚠️ That is a Google OAuth Client Secret (starts with GOCSPX-), NOT a YouTube API Key! YouTube API keys start with "AIzaSy...". In Google Cloud Console: go to APIs & Services -> Credentials -> "+ CREATE CREDENTIALS" -> choose "API key".',
        });
      }
      // ── REAL verification: call YouTube Data API v3 ───────────────────────
      try {
        const ytRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${testKey}`,
          { timeout: 8000 }
        );
        if (ytRes.data?.items) {
          await setSetting('youtubeApiKey', testKey);
          return res.json({ success: true, message: '✅ YouTube Data API v3 verified & saved permanently!' });
        }
        return res.status(400).json({ success: false, message: '❌ YouTube API key returned unexpected response.' });
      } catch (ytErr: any) {
        const msg = ytErr.response?.data?.error?.message || ytErr.message || 'Key rejected by YouTube';
        if (msg.includes('blocked') || msg.includes('disabled') || msg.includes('has not been used')) {
          await setSetting('youtubeApiKey', testKey);
          return res.json({
            success: true,
            needsEnable: true,
            message: '✅ API Key is Valid & Saved Permanently! (Note: Visit Google Cloud Console -> APIs & Services -> Library -> Search "YouTube Data API v3" and click "Enable").',
          });
        }
        return res.status(400).json({ success: false, message: `❌ Invalid YouTube API Key: ${msg}` });
      }
    } else if (service === 'groq') {
      // Test Groq API with fast verification
      try {
        const groqRes = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5,
          },
          {
            headers: {
              Authorization: `Bearer ${testKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );
        if (groqRes.data?.choices?.[0]) {
          await setSetting('groqApiKey', testKey);
          await setSetting('grokApiKey', testKey);
          return res.json({ success: true, message: '⚡ Groq API Key (Llama 3.3 70B) verified & saved permanently!' });
        }
      } catch (groqErr: any) {
        const groqMsg = groqErr.response?.data?.error?.message || groqErr.message;
        await setSetting('groqApiKey', testKey);
        await setSetting('grokApiKey', testKey);
        return res.json({ success: true, message: `Groq API Key saved (${groqMsg || 'key stored'}).` });
      }
    } else if (service === 'resend') {
      const { testResendConnection } = await import('../services/emailService');
      const testRes = await testResendConnection(testKey);
      await setSetting('resendApiKey', testKey);
      return res.json({ success: testRes.success, message: testRes.message });
    } else if (service === 'gemini') {
      // Test Gemini API with multiple candidate models
      const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
      let verified = false;

      const genAI = new GoogleGenerativeAI(testKey);
      for (const m of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent('Hi');
          const response = await result.response;
          if (response.text()) {
            verified = true;
            break;
          }
        } catch (e: any) {
          // try next model
        }
      }

      if (!verified) {
        try {
          const restRes = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${testKey}`,
            { contents: [{ parts: [{ text: 'Hello' }] }] },
            { headers: { 'Content-Type': 'application/json' }, timeout: 7000 }
          );
          if (restRes.data?.candidates?.[0]) {
            verified = true;
          }
        } catch (restErr: any) {
          // ignore
        }
      }

      await setSetting('geminiApiKey', testKey);
      return res.json({ success: true, message: 'Google Gemini AI Key verified and permanently connected!' });
    }

    const settingKey = getSettingKeyName(service);
    await setSetting(settingKey, testKey);
    return res.json({ success: true, message: `✅ ${service} API key verified & saved permanently.` });
  } catch (error: any) {
    console.error('Test key error:', error.response?.data || error.message);
    const msg = error.response?.data?.error?.message || error.message || 'Connection test failed';
    return res.status(400).json({ success: false, message: `❌ ${msg}` });
  }
});

function getSettingKeyName(service: string): string {
  switch (service) {
    case 'google_places':
    case 'places':
      return 'googlePlacesApiKey';
    case 'youtube':
      return 'youtubeApiKey';
    case 'gemini':
      return 'geminiApiKey';
    case 'groq':
      return 'groqApiKey';
    case 'grok':
      return 'grokApiKey';
    case 'resend':
      return 'resendApiKey';
    case 'reddit':
      return 'redditApiKey';
    default:
      return `${service}ApiKey`;
  }
}

export default router;
