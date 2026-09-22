import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { getSetting } from './settingsService';
import { aiRateLimiter } from '../utils/rateLimiter';
import { validateAndSanitizePitch, getGuardrailRulesDescription } from './guardrailService';
import { getCachedData, setCachedData } from './cacheService';

export type BrandMode = 'production' | 'gems_jewels';

export type OfferedService =
  | 'video_editing'
  | 'content_creation_reels'
  | 'graphic_design'
  | 'branding_logo'
  | 'website_design'
  | 'jewelry_wholesale_supply'
  | 'custom_diamond_manufacturing'
  | 'luxury_retail_collection'
  | 'general';

export interface LeadForPitch {
  name: string;
  category?: string;
  brand_track?: BrandMode;
  source?: string;
  address?: string;
  website?: string;
  has_website?: boolean;
  instagram_handle?: string;
  rating?: number;
  user_ratings_total?: number;
  subscriber_count?: number;
  video_count?: number;
  description?: string;
  offered_service?: OfferedService;
  custom_instructions?: string;
  sender_name?: string;
  format?: 'whatsapp' | 'email';
}

export type PitchTone = 'friendly' | 'professional' | 'creative' | 'direct' | 'bold';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];

let lastGeminiFailTime = 0;

function safeReplaceAll(source: string, target: string, replacement: string): string {
  if (!source || !target) return source || '';
  return source.split(target).join(replacement);
}

const PRODUCTION_APPROVED_SERVICES = 'business growth consulting, video editing, graphic design, motion graphics, and website design & development';
const KLYPERIX_WEBSITE = 'www.klyperix.com';
const KLYPERIX_INSTAGRAM = 'www.instagram.com/klyperix';
const KLYPERIX_LINKEDIN = 'www.linkedin.com/in/klyperix';

async function buildContactSignature(brandMode: BrandMode): Promise<string> {
  if (brandMode === 'gems_jewels') return '';
  return `Take a look at our work:
Website: ${KLYPERIX_WEBSITE}
Instagram: ${KLYPERIX_INSTAGRAM}
LinkedIn: ${KLYPERIX_LINKEDIN}

If you think we could be a good fit, I’d be happy to connect.

Regards,
Garv Agarwal
Klyperix Production`;
}

async function appendSignatureIfMissing(pitch: string, brandMode: BrandMode): Promise<string> {
  if (brandMode === 'gems_jewels') return pitch;
  if (pitch.includes(KLYPERIX_WEBSITE) && pitch.includes('Garv Agarwal')) return pitch;
  if (pitch.includes(KLYPERIX_WEBSITE)) return pitch;
  const signature = await buildContactSignature(brandMode);
  if (!signature) return pitch;
  return `${pitch}\n\n${signature}`;
}

export function isInternationalLead(lead: LeadForPitch): boolean {
  const addr = (lead.address || '').toLowerCase();
  if (
    /\b(india|mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata|pune|ahmedabad|jaipur|surat|lucknow|kanpur|nagpur|indore|bhopal|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|varanasi|srinagar|aurangabad|dhanbad|amritsar|navi mumbai|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|chandigarh|guwahati|solapur|hubli|dharwad|bareilly|moradabad|mysore|gurgaon|gurugram|noida)\b/i.test(
      addr
    )
  ) {
    return false;
  }
  return true;
}

export function performGapAnalysis(lead: LeadForPitch, brandMode: BrandMode = 'production'): {
  primaryGap: string;
  recommendedService: OfferedService;
  gentleObservation: string;
} {
  if (brandMode === 'gems_jewels') {
    return {
      primaryGap: 'High-end custom diamond jewelry manufacturing & certified gemstone supply',
      recommendedService: 'jewelry_wholesale_supply',
      gentleObservation: 'Direct manufacturer pricing for bespoke bridal and fine jewelry collections.',
    };
  }

  if (lead.source === 'youtube') {
    return {
      primaryGap: 'Short-form video repurposing and high-retention editing',
      recommendedService: 'content_creation_reels',
      gentleObservation: 'Repurposing long-form uploads into viral Reels and TikTok clips.',
    };
  }

  if (lead.has_website === false || !lead.website) {
    return {
      primaryGap: 'Modern high-converting studio website and online booking presence',
      recommendedService: 'website_design',
      gentleObservation: 'Online booking and portfolio presence for prospective clients.',
    };
  }

  return {
    primaryGap: 'High-retention video editing and motion graphics post-production',
    recommendedService: 'video_editing',
    gentleObservation: 'Elevating visual content quality to increase engagement and conversions.',
  };
}

export async function generatePitch(
  lead: LeadForPitch,
  tone: PitchTone = 'friendly',
  offeredService: OfferedService = 'general',
  customInstructions?: string,
  brandMode: BrandMode = 'production',
  senderName: string = 'Klyperix Team'
): Promise<{ pitch: string; provider: string; isMock: boolean; warnings?: string[] }> {
  const groqKey = await getSetting('groqApiKey');
  const groqModel = (await getSetting('groqModel')) || 'llama-3.3-70b-versatile';
  const geminiKey = await getSetting('geminiApiKey');

  const gapResult = performGapAnalysis(lead, brandMode);
  const targetService = offeredService !== 'general' ? offeredService : gapResult.recommendedService;

  const rawTemplate = generateHumanPitchTemplate(lead, tone, targetService, brandMode, senderName, gapResult.gentleObservation);
  const templatePitch = await appendSignatureIfMissing(validateAndSanitizePitch(rawTemplate).sanitizedText, brandMode);

  const systemPrompt = buildSystemPrompt(brandMode, senderName);
  const userPrompt = buildUserPrompt(lead, tone, targetService, brandMode, customInstructions);

  // 1. Groq (fast, free-tier, preferred when configured)
  if (groqKey) {
    const groqText = await generateWithGroq(systemPrompt, userPrompt, groqKey, groqModel);
    if (groqText) {
      const sanitized = await appendSignatureIfMissing(validateAndSanitizePitch(groqText).sanitizedText, brandMode);
      return {
        pitch: sanitized,
        provider: `Groq (${groqModel})`,
        isMock: false,
      };
    }
  }

  // 2. Gemini
  if (geminiKey && Date.now() - lastGeminiFailTime > 2 * 60 * 1000) {
    for (const modelName of GEMINI_MODELS) {
      try {
        await aiRateLimiter.acquire();
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: {
            maxOutputTokens: 180,
            temperature: 0.7,
          },
        });

        const result = await model.generateContent(userPrompt);
        const text = result.response.text().trim();

        if (text && text.length > 20) {
          const sanitized = await appendSignatureIfMissing(validateAndSanitizePitch(text).sanitizedText, brandMode);
          return {
            pitch: sanitized,
            provider: `Google Gemini (${modelName})`,
            isMock: false,
          };
        }
      } catch (err: any) {
        lastGeminiFailTime = Date.now();
      }
    }
  }

  // 3. Deterministic template — always available, zero-cost final fallback
  return {
    pitch: templatePitch,
    provider: 'klyperix-copy-engine',
    isMock: !groqKey && !geminiKey,
  };
}

export function generateDeepCustomizedPitch(
  lead: Partial<LeadForPitch>,
  brandMode: BrandMode = 'production',
  tone: PitchTone = 'friendly'
): string {
  const rawName = (lead.name || '').trim();
  const category = (lead.category || '').toLowerCase();
  const address = lead.address || '';
  const website = lead.website || '';
  const hasWebsite = lead.has_website !== false && Boolean(website);
  const rating = lead.rating;
  const reviews = lead.user_ratings_total || 0;

  // Extract location city cleanly
  let city = '';
  if (address) {
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      city = parts[parts.length - 2];
    } else if (parts.length === 1) {
      city = parts[0];
    }
  }

  // Greeting
  const cleanName = rawName.replace(/^(the|a)\s+/i, '');
  const firstWord = cleanName.split(' ')[0] || '';
  const isPersonalFirst =
    firstWord.length >= 2 &&
    firstWord.length <= 14 &&
    !/clinic|agency|salon|boutique|studio|realtor|group|inc|llc|co|hospital|dental|law|cafe|spa|estate|centre|center|services|enterprises|solutions|properties|realty\b/i.test(firstWord);

  const greeting = isPersonalFirst ? `Hey ${firstWord},` : `Hey team at ${rawName || 'there'},`;

  if (brandMode === 'gems_jewels') {
    let gapText = '';
    if (category.includes('bridal') || category.includes('custom')) {
      gapText = `I was admiring your bridal curations at ${rawName}. Direct sourcing for certified lab & natural diamonds allows luxury ateliers like yours to cut middleman margins and deliver bespoke pieces significantly faster.`;
    } else if (category.includes('watch') || category.includes('luxury')) {
      gapText = `Saw your luxury collection at ${rawName}. We partner with high-end retailers supplying GIA certified solitaire diamonds and bespoke high-jewelry settings at direct B2B manufacturer rates.`;
    } else {
      gapText = `Came across ${rawName}${city ? ` in ${city}` : ''} — your jewelry showcase looks great. We provide certified diamonds and custom casting directly to luxury boutiques worldwide.`;
    }
    return `${greeting}

${gapText}

Would you be open to taking a quick look at our wholesale catalog and latest sample lookbook?

Regards,
Garv Agarwal
Klyperix Gems & Jewels`;
  }

  // Production Track: High-End Video Editing, Motion Graphics, Branding, Web Design
  let nicheObservation = '';
  let nicheOpportunity = '';

  if (category.includes('real estate') || category.includes('estate') || category.includes('realtor') || category.includes('property')) {
    if (!hasWebsite) {
      nicheObservation = `I came across ${rawName}${city ? ` in ${city}` : ''} while researching top real estate businesses in the area. I noticed your agency doesn't currently have a modern property showcase website or direct listing portal linked.`;
      nicheOpportunity = `In real estate, high-net-worth buyers and property sellers evaluate your web presence in seconds before trusting you with multi-million dollar listings. Having a sleek, fast property website builds instant authority and captures qualified buyer leads directly without relying solely on portals.`;
    } else {
      nicheObservation = `I was looking at ${rawName}'s presence${city ? ` in ${city}` : ''}. In today's market, traditional photo listings simply get scrolled past, whereas high-production architectural video tours and cinematic property reels generate 4x more qualified inquiries.`;
      nicheOpportunity = `We help real estate leaders elevate their listings with crisp drone post-production, high-retention social walkthroughs, and modern brand design that attracts serious property investors and sellers.`;
    }
  } else if (category.includes('medspa') || category.includes('aesthetic') || category.includes('clinic') || category.includes('doctor') || category.includes('dental') || category.includes('surgery')) {
    if (!hasWebsite) {
      nicheObservation = `I noticed ${rawName}${city ? ` in ${city}` : ''} doesn't have an official online patient booking site or treatment portfolio linked on your listing.`;
      nicheOpportunity = `For medical & aesthetic practices, prospective patients look for a clean, comforting website to explore procedures before booking. A polished site establishes trust immediately and streamlines consultations.`;
    } else {
      nicheObservation = `I came across ${rawName}${city ? ` in ${city}` : ''} — loved the practice you're running. Many clinics struggle with explaining complex treatments or building patient trust through static social posts.`;
      nicheOpportunity = `We produce engaging, compliant patient explainer videos, high-end before/after motion graphics, and clean visual branding that demystifies treatments and turns casual viewers into confirmed appointments.`;
    }
  } else if (category.includes('architect') || category.includes('interior') || category.includes('design')) {
    nicheObservation = `I came across ${rawName}${city ? ` in ${city}` : ''} and was really impressed by your design portfolio. High-end clients want to feel the space and vision dynamically before hiring a studio.`;
    nicheOpportunity = `We craft cinematic project case-study videos, motion graphics walkthroughs, and bespoke web presentations that showcase your design mastery to luxury homeowners and commercial developers.`;
  } else if (category.includes('youtube') || category.includes('creator') || category.includes('podcast') || category.includes('video')) {
    nicheObservation = `Came across your channel / media presence at ${rawName}. The storytelling foundation is solid, but repurposing into high-retention Shorts, Reels, and engaging motion overlays is where massive organic growth happens right now.`;
    nicheOpportunity = `We specialize in retention-driven YouTube editing, viral short-form cutdowns, and click-worthy thumbnail designs so you can focus 100% on recording while we handle the entire post-production engine.`;
  } else if (category.includes('fitness') || category.includes('gym') || category.includes('coach')) {
    nicheObservation = `Came across ${rawName}${city ? ` in ${city}` : ''}. In fitness & coaching, social proof and client transformations need high-energy, scroll-stopping video edits to convert scrollers into high-ticket coaching clients.`;
    nicheOpportunity = `We produce dynamic transformation reels, membership video funnels, and clean brand graphics that make your training program stand out in a crowded market.`;
  } else {
    if (!hasWebsite) {
      nicheObservation = `I came across ${rawName}${city ? ` in ${city}` : ''} and noticed you don't currently have a dedicated modern website linked. In competitive markets, prospective high-ticket clients almost always research an official site before booking or reaching out.`;
      nicheOpportunity = `We build modern, fast, high-converting websites and brand visuals that give businesses an immediate edge over local competitors.`;
    } else {
      nicheObservation = `I came across ${rawName}${city ? ` in ${city}` : ''} and took a look at what you've built. The foundation is great, but static graphics often get lost in today's video-first attention economy.`;
      nicheOpportunity = `We help growing brands produce scroll-stopping video content, motion graphics, and website upgrades that clearly communicate your value and drive client conversions.`;
    }
  }

  let reputationNote = '';
  if (rating && rating >= 4.5 && reviews >= 15) {
    reputationNote = `Also, big respect on your ${rating}★ rating across ${reviews}+ client reviews — that level of client satisfaction is genuinely hard to build.`;
  }

  return `${greeting}

I’m Garv from Klyperix Production.

${nicheObservation}
${reputationNote ? `\n${reputationNote}\n` : ''}
${nicheOpportunity}

Our services include business growth consulting, video editing, graphic design, motion graphics, and website design & development.

Take a look at our work:
Website: www.klyperix.com
Instagram: www.instagram.com/klyperix
LinkedIn: www.linkedin.com/in/klyperix

Not here to push a hard sale — if you think we could be a good fit, I’d be happy to put together a quick sample concept or connect for a brief chat.

Regards,
Garv Agarwal
Klyperix Production`;
}

function generateHumanPitchTemplate(
  lead: LeadForPitch,
  tone: PitchTone,
  service: OfferedService,
  brandMode: BrandMode,
  senderName: string,
  gentleObservation?: string
): string {
  return generateDeepCustomizedPitch(lead, brandMode, tone);
}

function buildSystemPrompt(brandMode: BrandMode, senderName: string): string {
  if (brandMode === 'gems_jewels') {
    return `You represent Klyperix Gems & Jewels (fine luxury diamond wholesale & bespoke supply). Write a short, warm, personalized B2B outreach message.`;
  }

  return `You are Garv from Klyperix Production (Website: www.klyperix.com | Instagram: www.instagram.com/klyperix | LinkedIn: www.linkedin.com/in/klyperix).
Your goal is to write a warm, genuine, human cold outreach message that feels completely authentic and NOT like an automated robot or AI bot.

You must follow this core message structure:
Hey [FirstName or simple Hey],

I’m Garv from Klyperix Production.

We work with businesses, creators, YouTubers & influencers on their content, branding, websites, and online growth.

Our services include business growth consulting, video editing, graphic design, motion graphics, and website design & development.

Take a look at our work:
Website: www.klyperix.com
Instagram: www.instagram.com/klyperix
LinkedIn: www.linkedin.com/in/klyperix

If you think we could be a good fit, I’d be happy to connect.

Regards,
Garv Agarwal
Klyperix Production

Rules:
1. Tone must be natural, respectful, and human.
2. Adapt greeting naturally (e.g. "Hey Sarah," or "Hey,"). If appropriate, reference their business nicely in one natural sentence, while keeping the core services, links, and signature intact.
3. Output ONLY the message text without quotes or explanation.`;
}

function buildUserPrompt(
  lead: LeadForPitch,
  tone: PitchTone,
  service: OfferedService,
  brandMode: BrandMode,
  customInstructions?: string
): string {
  return `Prospect Details:
- Name: ${lead.name}
- Category: ${lead.category || 'Business'}
- Location: ${lead.address || 'International'}
- Website/Channel: ${lead.website || lead.instagram_handle || 'Listed'}
- Has a website: ${lead.has_website === false ? 'No' : 'Yes'}
- Target Offering: ${service}
- Tone: ${tone}
- Brand Track: ${brandMode === 'gems_jewels' ? 'Fine Luxury Jewelry Wholesale & Bespoke Diamond Supply' : 'High-End Video Editing, Motion Graphics, Graphic Design & Web Development'}
${customInstructions ? `Special guidance: ${customInstructions}` : ''}

Write the outreach message now.`;
}

async function generateWithGroq(
  systemPrompt: string,
  userPrompt: string,
  groqKey: string,
  model: string
): Promise<string | null> {
  const candidateModels = [
    model,
    'openai/gpt-oss-20b',
    'groq/compound-mini',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  for (const candidate of candidateModels) {
    try {
      await aiRateLimiter.acquire();
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: candidate,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 600,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const text = res.data?.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 20) {
        return text;
      }
    } catch (err: any) {
      console.warn(`[Groq] Model ${candidate} attempt failed:`, err.response?.data?.error?.message || err.message);
    }
  }
  return null;
}

export function analyzeMessageSentiment(text: string): {
  sentiment: 'interested' | 'questioning' | 'price_inquiry' | 'not_interested' | 'neutral';
  toneLabel: string;
  recommendedStyle: string;
} {
  const lower = (text || '').toLowerCase();

  if (
    lower.includes('price') ||
    lower.includes('cost') ||
    lower.includes('rate') ||
    lower.includes('charges') ||
    lower.includes('kitna') ||
    lower.includes('budget')
  ) {
    return {
      sentiment: 'price_inquiry',
      toneLabel: 'Pricing & Budget Inquiry',
      recommendedStyle: 'Provide tiered pricing ranges and propose a quick discovery call or portfolio review.',
    };
  }

  if (
    lower.includes('yes') ||
    lower.includes('sure') ||
    lower.includes('interested') ||
    lower.includes('send') ||
    lower.includes('share') ||
    lower.includes('lookbook') ||
    lower.includes('sample') ||
    lower.includes('portfolio') ||
    lower.includes('call') ||
    lower.includes('meet')
  ) {
    return {
      sentiment: 'interested',
      toneLabel: 'High-Intent Interest',
      recommendedStyle: 'Send lookbook/portfolio immediately with a direct calendar link.',
    };
  }

  if (lower.includes('?') || lower.includes('how') || lower.includes('what') || lower.includes('where') || lower.includes('who')) {
    return {
      sentiment: 'questioning',
      toneLabel: 'Qualifying Question',
      recommendedStyle: 'Directly answer their question in 1-2 clear sentences and suggest a sample.',
    };
  }

  if (lower.includes('no') || lower.includes('not interested') || lower.includes('stop') || lower.includes('unsubscribe') || lower.includes('nahi')) {
    return {
      sentiment: 'not_interested',
      toneLabel: 'Polite Decline',
      recommendedStyle: 'Politely thank them for their time and leave the door open for future needs.',
    };
  }

  return {
    sentiment: 'neutral',
    toneLabel: 'General Inbound',
    recommendedStyle: 'Friendly acknowledgment and concise value restatement.',
  };
}

export async function generateSmartReply(
  incomingMessage: string,
  originalPitch?: string,
  leadName?: string
): Promise<{
  reply: string;
  sentiment: { sentiment: string; toneLabel: string; recommendedStyle: string };
  warnings?: string[];
}> {
  const sentiment = analyzeMessageSentiment(incomingMessage);
  const name = (leadName || '').split(' ')[0] || 'there';

  let reply = '';
  switch (sentiment.sentiment) {
    case 'price_inquiry':
      reply = `Hi ${name}, thanks for asking! Our packages are flexible based on scope and volume. For video editing retainers or bespoke jewelry supply, we typically customize a package to maximize your ROI. Would you be open to a quick 5-minute chat or should I send over our rate card?`;
      break;
    case 'interested':
      reply = `Awesome ${name}! Here is a quick link to our work and portfolio samples: https://klyperix.com. Let me know which style resonates most with your brand!`;
      break;
    case 'questioning':
      reply = `Hi ${name}, great question. We manage everything end-to-end with a rapid 24-48h turnaround time. Happy to share a live sample tailored to your exact workflow if that helps!`;
      break;
    case 'not_interested':
      reply = `Understood ${name}, thanks so much for letting me know! Feel free to reach back out whenever your team is looking to scale. Wishing you continued success!`;
      break;
    default:
      reply = `Hi ${name}, thanks for getting back to me! Would love to share a few relevant samples or answer any questions you might have. Let me know what works best for you!`;
      break;
  }

  return {
    reply,
    sentiment,
  };
}

export async function enhanceReplyDraft(
  rawDraft: string,
  incomingMessage: string,
  leadName?: string,
  brandMode: BrandMode = 'production'
): Promise<{ reply: string; provider: string }> {
  const groqKey = await getSetting('groqApiKey');
  const groqModel = (await getSetting('groqModel')) || 'llama-3.3-70b-versatile';
  const geminiKey = await getSetting('geminiApiKey');

  const systemPrompt = buildSystemPrompt(brandMode, 'Klyperix Team');
  const userPrompt = `The prospect (${leadName || 'the lead'}) replied: "${incomingMessage}"

Here is a rough draft reply written by a human team member:
"${rawDraft}"

Rewrite this draft into a short, polished, professional reply that keeps the human's intent and key points, fixes grammar/tone, and follows the writing rules above. Output ONLY the rewritten reply text.`;

  if (groqKey) {
    const text = await generateWithGroq(systemPrompt, userPrompt, groqKey, groqModel);
    if (text) {
      return { reply: validateAndSanitizePitch(text).sanitizedText, provider: `Groq (${groqModel})` };
    }
  }

  if (geminiKey) {
    try {
      await aiRateLimiter.acquire();
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: 180, temperature: 0.6 },
      });
      const result = await model.generateContent(userPrompt);
      const text = result.response.text().trim();
      if (text && text.length > 10) {
        return { reply: validateAndSanitizePitch(text).sanitizedText, provider: 'Google Gemini' };
      }
    } catch (err) {
      // fall through
    }
  }

  return { reply: validateAndSanitizePitch(rawDraft).sanitizedText, provider: 'unchanged' };
}

export interface WebsiteAuditResult {
  hasWebsite: boolean;
  websiteUrl?: string;
  designScore: number;
  brandImpression: string;
  identifiedIssues: string[];
  recommendedSolutions: string[];
  opportunityHeadline: string;
}

export async function auditWebsite(
  websiteUrl?: string,
  leadName?: string,
  category?: string
): Promise<WebsiteAuditResult> {
  const name = leadName || 'Target Business';
  const niche = category || 'Commercial Business';

  if (!websiteUrl || !websiteUrl.trim() || websiteUrl.toLowerCase() === 'no website') {
    return {
      hasWebsite: false,
      designScore: 30,
      brandImpression: `Missing digital storefront for ${name}`,
      identifiedIssues: [
        'No official website domain found or linked on Google Maps / Social listings',
        'Losing direct client bookings and organic Google search conversions to competitors',
        'Missing modern mobile portfolio and 1-click booking flow',
      ],
      recommendedSolutions: [
        'Launch modern, high-converting Framer/Webflow website with 1-click booking integration',
        'Deploy mobile-responsive portfolio gallery and customer trust badges',
      ],
      opportunityHeadline: `High-Ticket Web Design Opportunity: Launching a Modern Digital Presence for ${name}`,
    };
  }

  const cleanUrl = websiteUrl.startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`;

  try {
    const startTime = Date.now();
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 7000,
      maxRedirects: 4,
    });
    const loadTimeMs = Date.now() - startTime;
    const html = typeof response.data === 'string' ? response.data : '';

    // Real HTML Inspections
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const siteTitle = titleMatch ? titleMatch[1].trim() : name;
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const hasVideo = /<video|<iframe[^>]+(youtube|vimeo|wistia|player)/i.test(html);
    const hasCta = /book|schedule|consultation|contact|quote|get started|call now/i.test(html);
    const hasSocialLinks = /instagram\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com/i.test(html);
    const hasAnalytics = /google-analytics|gtag|fbq|hotjar|clarity/i.test(html);

    // Calculate real score based on live signals
    let score = 55;
    if (cleanUrl.startsWith('https')) score += 10;
    if (hasViewport) score += 10;
    if (hasVideo) score += 12;
    if (hasCta) score += 8;
    if (hasSocialLinks) score += 5;
    if (loadTimeMs < 1800) score += 5;
    else if (loadTimeMs > 4000) score -= 8;
    score = Math.min(Math.max(score, 40), 96);

    // Dynamic Real Issues
    const realIssues: string[] = [];
    const realSolutions: string[] = [];

    if (!hasVideo) {
      realIssues.push('Hero section lacks high-retention video showreel or dynamic motion branding');
      realSolutions.push('Produce a tailored 30-45s hero video showcasing key services to double dwell time');
    } else {
      realIssues.push('Video assets could benefit from modern motion graphics hooks and faster mobile playback');
    }

    if (!hasCta) {
      realIssues.push('Call-to-action is buried or missing above the fold, hurting conversion rate');
      realSolutions.push('Implement a high-contrast booking / consultation CTA in the header navigation');
    } else {
      realSolutions.push('A/B test dynamic booking incentives and interactive testimonials');
    }

    if (!hasViewport) {
      realIssues.push('Missing explicit mobile viewport configuration, which degrades smartphone user experience');
      realSolutions.push('Refactor layout for responsive smartphone and tablet viewport standards');
    }

    if (loadTimeMs > 2500) {
      realIssues.push(`Page response time is relatively slow (~${(loadTimeMs / 1000).toFixed(1)}s), risking visitor bounce`);
      realSolutions.push('Compress media assets, deploy webp images, and optimize delivery speed');
    }

    if (!hasAnalytics) {
      realIssues.push('No standard retargeting or visitor analytics tags detected on homepage');
      realSolutions.push('Set up conversion tracking to capture visitor intent and retarget warm prospects');
    }

    // Ensure at least 3 distinct issues
    if (realIssues.length < 3) {
      realIssues.push('Typography and spacing hierarchy can be polished for a sleeker high-ticket aesthetic');
    }
    if (realSolutions.length < 2) {
      realSolutions.push('Deploy modern Framer-style micro-interactions to elevate brand perception');
    }

    return {
      hasWebsite: true,
      websiteUrl: cleanUrl,
      designScore: score,
      brandImpression: `Live website active (${siteTitle}). ${hasVideo ? 'Has video elements.' : 'Missing video branding.'} Response: ${(loadTimeMs / 1000).toFixed(2)}s.`,
      identifiedIssues: realIssues.slice(0, 4),
      recommendedSolutions: realSolutions.slice(0, 3),
      opportunityHeadline: !hasVideo
        ? `Video Branding Opportunity: High-Retention Visual Upgrade for ${name}`
        : `Conversion Rate Optimization & Creative Upgrade for ${name}`,
    };
  } catch (err: any) {
    return {
      hasWebsite: true,
      websiteUrl: cleanUrl,
      designScore: 48,
      brandImpression: `Website listed (${cleanUrl}) but server responded with error or timeout`,
      identifiedIssues: [
        `Unable to establish fast connection: ${err.message || 'Connection timeout'}`,
        'Potential downtime or SSL/DNS misconfiguration impacting prospect trust',
        'Website speed or server hosting needs optimization for international traffic',
      ],
      recommendedSolutions: [
        'Audit domain DNS and migration to modern CDN hosting (e.g. Cloudflare / Vercel)',
        'Deploy fast-loading responsive landing page with verified SSL certificate',
      ],
      opportunityHeadline: `Technical Optimization & Modern Re-platforming Opportunity for ${name}`,
    };
  }
}

export interface MessageQualityScore {
  score: number; // 0 - 100
  humanToneScore: number; // 0 - 100
  personalizationScore: number; // 0 - 100
  spamRisk: 'low' | 'medium' | 'high';
  strengths: string[];
  suggestions: string[];
}

export function evaluateMessageQuality(
  pitch: string,
  lead?: Partial<LeadForPitch>
): MessageQualityScore {
  const text = (pitch || '').trim();
  if (!text) {
    return {
      score: 0,
      humanToneScore: 0,
      personalizationScore: 0,
      spamRisk: 'high',
      strengths: [],
      suggestions: ['Draft a message to evaluate quality.'],
    };
  }

  let score = 88;
  let humanScore = 90;
  let persScore = 85;
  const strengths: string[] = [];
  const suggestions: string[] = [];

  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 30 && wordCount <= 75) {
    score += 5;
    strengths.push('Concise and respectful (optimal 40-70 word sweet spot)');
  } else if (wordCount > 100) {
    score -= 10;
    humanScore -= 8;
    suggestions.push('Slightly long — consider trimming to under 75 words to boost response rate');
  }

  if (lead?.name && text.toLowerCase().includes(lead.name.split(' ')[0].toLowerCase())) {
    persScore += 5;
    strengths.push('Directly personalized with recipient’s name');
  }

  const aiCliches = [
    'i hope this finds you well',
    'game-changer',
    'supercharge',
    'synergy',
    'cutting-edge',
    'revolutionize',
    'delve',
    'seamlessly',
  ];
  const foundCliches = aiCliches.filter((c) => text.toLowerCase().includes(c));
  if (foundCliches.length > 0) {
    score -= 15;
    humanScore -= 20;
    suggestions.push(`Contains generic phrases (${foundCliches.join(', ')}) — make it sound more conversational`);
  } else {
    strengths.push('Zero generic AI cliches detected');
  }

  const hasFrictionlessCTA =
    text.toLowerCase().includes('open to') ||
    text.toLowerCase().includes('mind if') ||
    text.toLowerCase().includes('sample') ||
    text.toLowerCase().includes('lookbook') ||
    text.toLowerCase().includes('quick concept');
  if (hasFrictionlessCTA) {
    score += 4;
    strengths.push('Low-friction, conversational call-to-action');
  }

  const finalScore = Math.min(Math.max(score, 60), 98);
  const spamRisk = finalScore >= 85 ? 'low' : finalScore >= 75 ? 'medium' : 'high';

  return {
    score: finalScore,
    humanToneScore: Math.min(Math.max(humanScore, 65), 99),
    personalizationScore: Math.min(Math.max(persScore, 65), 98),
    spamRisk,
    strengths,
    suggestions,
  };
}

export async function generateFollowupMessage(
  lead: LeadForPitch,
  step: number = 1,
  previousPitch?: string,
  brandMode: BrandMode = 'production'
): Promise<{ followupText: string; step: number; recommendedChannel: string }> {
  const firstName = lead.name.split(' ')[0] || lead.name;
  const isGems = brandMode === 'gems_jewels';

  let followupText = '';

  if (isGems) {
    if (step === 1) {
      followupText = `Hi ${firstName}, following up quickly on my note regarding our luxury fine jewelry collections and certified diamonds. Did you get a chance to review our wholesale catalog?`;
    } else if (step === 2) {
      followupText = `Hey ${firstName}, wanted to share that we just released our latest bespoke diamond lookbook for fine jewelry retailers. Happy to send over a 2-page summary if you have a moment this week!`;
    } else {
      followupText = `Hi ${firstName}, no worries at all if timing isn't right for ${lead.name} right now. I'll leave things here for now — feel free to reach back out whenever you're expanding your fine jewelry inventory!`;
    }
  } else {
    if (step === 1) {
      followupText = `Hi ${firstName}, following up briefly on my earlier note! Put together a quick visual concept tailored for ${lead.name}. Mind if I send over the 30-second preview link?`;
    } else if (step === 2) {
      followupText = `Hey ${firstName}, quick question — are you currently looking to upgrade your video post-production or visual branding for upcoming campaigns? Happy to share our latest showreel whenever convenient!`;
    } else {
      followupText = `Hi ${firstName}, don't want to crowd your inbox. If you ever need high-retention video editing or motion design for ${lead.name}, our team at Klyperix is here to help. Wishing you great success!`;
    }
  }

  const withSignature = await appendSignatureIfMissing(followupText, brandMode);
  return {
    followupText: withSignature,
    step,
    recommendedChannel: lead.format === 'email' ? 'email' : 'whatsapp',
  };
}

export interface MultiPlatformSocialCopies {
  instagram: { hook: string; caption: string; hashtags: string[]; cta: string };
  facebook: { title: string; narrative: string; cta: string; text?: string };
  linkedin: { headline: string; professionalPost: string; takeaways: string[]; text?: string; hashtags?: string[] };
  youtubeShorts: { videoTitle: string; description: string; tags: string[]; title?: string };
  youtube_shorts?: { videoTitle: string; description: string; tags: string[]; title?: string };
  xTwitter: { tweetHook: string; threadContent: string; tweet?: string };
  x?: { tweetHook: string; threadContent: string; tweet?: string };
}

export function normalizeSocialCopies(raw: any, fallbackTopic: string): MultiPlatformSocialCopies {
  const ig = raw?.instagram || {};
  const fb = raw?.facebook || {};
  const li = raw?.linkedin || {};
  const yt = raw?.youtubeShorts || raw?.youtube_shorts || {};
  const x = raw?.xTwitter || raw?.x || {};

  const cleanTopic = fallbackTopic.trim() || 'Transforming raw footage into high-retention client-converting content';

  const instagram = {
    hook: ig.hook || 'Stop scrolling if you want 3x higher retention on your videos 🔥',
    caption: ig.caption || cleanTopic,
    hashtags: Array.isArray(ig.hashtags) && ig.hashtags.length ? ig.hashtags : ['#ContentCreation', '#VideoProduction', '#Marketing', '#CreatorEconomy'],
    cta: ig.cta || 'DM us for more details!',
  };

  const facebookNarrative = fb.narrative || fb.text || cleanTopic;
  const facebook = {
    title: fb.title || cleanTopic,
    narrative: facebookNarrative,
    cta: fb.cta || 'Visit our website to learn more.',
    text: `${fb.title ? fb.title + '\n\n' : ''}${facebookNarrative}${fb.cta ? '\n\n' + fb.cta : ''}`,
  };

  const liPost = li.professionalPost || li.text || cleanTopic;
  const liTakeaways = Array.isArray(li.takeaways) ? li.takeaways : [];
  const linkedin = {
    headline: li.headline || cleanTopic,
    professionalPost: liPost,
    takeaways: liTakeaways,
    text: `${li.headline ? li.headline + '\n\n' : ''}${liPost}${liTakeaways.length ? '\n\nKey Takeaways:\n' + liTakeaways.map((t: string) => '• ' + t).join('\n') : ''}`,
    hashtags: Array.isArray(li.hashtags) && li.hashtags.length ? li.hashtags : ['#BusinessGrowth', '#B2B', '#ContentStrategy'],
  };

  const ytTitle = yt.videoTitle || yt.title || `${cleanTopic} #Shorts`;
  const youtubeShorts = {
    videoTitle: ytTitle,
    title: ytTitle,
    description: yt.description || cleanTopic,
    tags: Array.isArray(yt.tags) && yt.tags.length ? yt.tags : ['#Shorts', '#Trending', '#Content', '#VideoProduction'],
  };

  const xTweet = x.tweet || (x.tweetHook && x.threadContent ? `${x.tweetHook}\n\n${x.threadContent}` : x.tweetHook || cleanTopic);
  const xTwitter = {
    tweetHook: x.tweetHook || xTweet,
    threadContent: x.threadContent || '',
    tweet: xTweet,
  };

  return {
    instagram,
    facebook,
    linkedin,
    youtubeShorts,
    youtube_shorts: youtubeShorts,
    xTwitter,
    x: xTwitter,
  };
}

export async function generateSocialMediaCopies(
  topicOrIdea: string,
  mediaType: string = 'reel',
  brandMode: BrandMode = 'production'
): Promise<MultiPlatformSocialCopies> {
  const groqKey = await getSetting('groqApiKey');
  const groqModel = (await getSetting('groqModel')) || 'llama-3.3-70b-versatile';
  const geminiKey = await getSetting('geminiApiKey');

  const brandName = brandMode === 'gems_jewels' ? 'Klyperix Gems & Jewels' : 'Klyperix Production';
  const niche = brandMode === 'gems_jewels' ? 'Luxury Diamond & Bespoke Fine Jewelry Manufacturing' : 'High-Retention Video Editing, Motion Graphics, and Web Development';

  const systemPrompt = `You are a social media copywriter for "${brandName}" (${niche}).
Create high-converting, platform-native content copies for a single ${mediaType}.
Format output as strict JSON with keys:
{
  "instagram": { "hook": "...", "caption": "...", "hashtags": ["#tag1", "#tag2"], "cta": "..." },
  "facebook": { "title": "...", "narrative": "...", "cta": "..." },
  "linkedin": { "headline": "...", "professionalPost": "...", "takeaways": ["point 1", "point 2"] },
  "youtubeShorts": { "videoTitle": "...", "description": "...", "tags": ["#tag1", "#tag2"] },
  "xTwitter": { "tweetHook": "...", "threadContent": "..." }
}`;

  const userPrompt = `Media Topic / Hook: "${topicOrIdea}"
Media Type: ${mediaType}

Write native platform variations now. Output JSON only.`;

  if (groqKey) {
    try {
      const text = await generateWithGroq(systemPrompt, userPrompt, groqKey, groqModel);
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return normalizeSocialCopies(parsed, topicOrIdea);
        }
      }
    } catch (e) {}
  }

  if (geminiKey) {
    try {
      await aiRateLimiter.acquire();
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return normalizeSocialCopies(parsed, topicOrIdea);
      }
    } catch (e) {}
  }

  // High quality deterministic fallback
  return normalizeSocialCopies({}, topicOrIdea);
}

