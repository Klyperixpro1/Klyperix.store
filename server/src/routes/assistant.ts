import { Router, Request, Response } from 'express';
import { getSetting } from '../services/settingsService';
import { aiRateLimiter } from '../utils/rateLimiter';
import axios from 'axios';
import { searchPlaces } from '../services/placesService';

const router = Router();

async function parseIntentWithGroq(
  message: string,
  locationContext: string,
  groqKey: string
): Promise<{ intent: string; category: string; location: string; replyMessage: string } | null> {
  const candidateModels = ['llama3-8b-8192', 'mixtral-8x7b-32768', 'llama3-70b-8192'];

  const systemPrompt = `You are an AI assistant for a Lead Generation tool. 
Determine if the user wants to search for business leads.
Respond ONLY in strict JSON format (no markdown, no code blocks):
{"intent":"search"|"chat","category":"extracted category or empty","location":"extracted location or empty","replyMessage":"A short friendly confirmation, e.g. 'Searching for real estate leads in Kuwait...'"}`;

  const userPrompt = `The user says: "${message}"\nTheir current country context (if any): "${locationContext || 'Unknown'}"\n\nRespond in the JSON format.`;

  for (const model of candidateModels) {
    try {
      await aiRateLimiter.acquire();
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      );
      const raw = res.data?.choices?.[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.intent === 'string') return parsed;
    } catch (err: any) {
      console.warn(`[Assistant] Model ${model} failed:`, err.message);
    }
  }
  return null;
}

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, locationContext } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const groqKey = await getSetting('groqApiKey');

    if (!groqKey) {
      // Simple keyword-based fallback if no AI key
      const msg = (message || '').toLowerCase();
      const searchKeywords = ['find', 'search', 'get', 'show', 'look for', 'locate', 'give me'];
      const isSearch = searchKeywords.some(kw => msg.includes(kw));

      if (isSearch) {
        const locationGuess = locationContext || 'United States';
        const categoryGuess = msg.includes('real estate') ? 'Real Estate'
          : msg.includes('medspa') || msg.includes('clinic') ? 'MedSpa Clinic'
          : msg.includes('dental') ? 'Dental Clinic'
          : msg.includes('law') || msg.includes('attorney') ? 'Law Firm'
          : msg.includes('restaurant') ? 'Restaurant'
          : 'Business';

        const searchRes = await searchPlaces(categoryGuess, locationGuess, 15000, 'all', 'production');
        return res.json({
          reply: `Searching for ${categoryGuess} leads in ${locationGuess}...`,
          action: 'POPULATE_LEADS',
          leads: searchRes.leads,
        });
      }

      return res.json({ reply: "I can help you find leads! Try: \"Find real estate agents in Kuwait\" or \"Show me MedSpas in Dubai\"." });
    }

    const analysis = await parseIntentWithGroq(message, locationContext, groqKey);

    if (!analysis) {
      return res.json({ reply: "I can help you find leads! Try: \"Find real estate agents in Kuwait\" or \"Show me clinics in Dubai\"." });
    }

    if (analysis.intent === 'search' && (analysis.category || analysis.location)) {
      const category = analysis.category || 'Business';
      const location = analysis.location || locationContext || 'United States';

      const searchRes = await searchPlaces(
        category,
        location,
        15000,
        'all',
        'production',
        undefined
      );

      return res.json({
        reply: analysis.replyMessage || `Found ${searchRes.leads.length} leads for "${category}" in ${location}.`,
        action: 'POPULATE_LEADS',
        leads: searchRes.leads,
      });
    }

    // General chat — use Groq to respond
    try {
      await aiRateLimiter.acquire();
      const chatRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI Lead Generation assistant for Klyperix Production. Help the user find business leads. Keep responses short and practical. If they ask to find leads, tell them to type something like "Find real estate in Kuwait".',
            },
            { role: 'user', content: message },
          ],
          max_tokens: 200,
          temperature: 0.5,
        },
        {
          headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          timeout: 12000,
        }
      );
      const reply = chatRes.data?.choices?.[0]?.message?.content?.trim() || analysis.replyMessage || "I'm ready to find leads for you!";
      return res.json({ reply });
    } catch {
      return res.json({ reply: analysis.replyMessage || "I'm ready to help! Try: \"Find real estate agents in Kuwait\"." });
    }

  } catch (err: any) {
    console.error('Assistant Chat Error:', err.message);
    res.status(500).json({ error: 'Assistant failed. Please try again.' });
  }
});

export default router;
