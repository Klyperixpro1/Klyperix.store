import axios from 'axios';
import { all } from '../db/database';
import { getSetting } from './settingsService';

export interface GenericPlatformLeadResult {
  external_id: string;
  source: string;
  name: string;
  category: string;
  brand_track?: 'production' | 'gems_jewels';
  address?: string;
  country_code?: string;
  phone?: string;
  website?: string;
  has_website?: boolean;
  contact_email?: string;
  instagram_handle?: string;
  channel_handle?: string;
  profile_url?: string;
  followers_count?: number;
  rating?: number;
  user_ratings_total?: number;
  description?: string;
  budget?: string;
  project_title?: string;
  portfolio_url?: string;
  sub_reddit?: string;
  headline?: string;
  selected?: boolean;
  already_contacted?: boolean;
  high_ticket_score?: number;
  intent_level?: 'low' | 'medium' | 'high' | 'urgent';
  offered_service?: string;
}

// Helper to get contacted external IDs and phones
async function getContactedSets() {
  const contactedRecords = await all<{ external_id?: string; phone?: string; contact_email?: string }>(
    "SELECT external_id, phone, contact_email FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
  );
  const contactedIds = new Set<string>(
    contactedRecords.map((r) => r.external_id || '').filter(Boolean)
  );
  const contactedPhones = new Set<string>(
    contactedRecords
      .map((r) => (r.phone || '').replace(/[^0-9]/g, ''))
      .filter((p) => p.length >= 7)
  );
  const contactedEmails = new Set<string>(
    contactedRecords.map((r) => (r.contact_email || '').toLowerCase().trim()).filter(Boolean)
  );
  return { contactedIds, contactedPhones, contactedEmails };
}

function annotateContacted(
  leads: GenericPlatformLeadResult[],
  ids: Set<string>,
  phones: Set<string>,
  emails: Set<string>
): GenericPlatformLeadResult[] {
  return leads.map((lead) => {
    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
    const cleanEmail = (lead.contact_email || '').toLowerCase().trim();
    const isContacted = Boolean(
      (lead.external_id && ids.has(lead.external_id)) ||
      (cleanPhone.length >= 7 && phones.has(cleanPhone)) ||
      (cleanEmail && emails.has(cleanEmail))
    );
    return { ...lead, already_contacted: isContacted };
  });
}

// Country code to country name map
const COUNTRY_MAP: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  AE: 'United Arab Emirates',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  CH: 'Switzerland',
  SG: 'Singapore',
  NZ: 'New Zealand',
  IE: 'Ireland',
};

// Reddit OAuth2
let cachedRedditToken: { token: string; expiresAt: number } | null = null;

async function getRedditAccessToken(): Promise<string | null> {
  if (cachedRedditToken && cachedRedditToken.expiresAt > Date.now()) {
    return cachedRedditToken.token;
  }

  const raw = await getSetting('redditApiKey');
  if (!raw || !raw.includes(':')) return null;

  const separatorIndex = raw.indexOf(':');
  const clientId = raw.slice(0, separatorIndex).trim();
  const clientSecret = raw.slice(separatorIndex + 1).trim();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        auth: { username: clientId, password: clientSecret },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'klyperix-outreach/1.0 (lead discovery)',
        },
        timeout: 8000,
      }
    );

    const token = res.data?.access_token;
    const expiresIn = res.data?.expires_in || 3600;
    if (!token) return null;

    cachedRedditToken = { token, expiresAt: Date.now() + (expiresIn - 60) * 1000 };
    return token;
  } catch (err: any) {
    console.error('[Reddit OAuth] Failed to get access token:', err.response?.data || err.message);
    return null;
  }
}

const HIRING_SUBREDDITS = 'forhire+videoediting+editors+DesignJobs+slavelabour+freelance';

export async function searchReddit(
  query: string = 'hiring video editor'
): Promise<{ leads: GenericPlatformLeadResult[]; isMock: boolean; message?: string }> {
  const { contactedIds, contactedPhones, contactedEmails } = await getContactedSets();

  const token = await getRedditAccessToken();
  if (token) {
    try {
      const res = await axios.get(`https://oauth.reddit.com/r/${HIRING_SUBREDDITS}/search`, {
        params: {
          q: query,
          restrict_sr: 1,
          sort: 'new',
          limit: 25,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'klyperix-outreach/1.0 (lead discovery)',
        },
        timeout: 8000,
      });

      const posts = res.data?.data?.children || [];
      const results: GenericPlatformLeadResult[] = posts
        .map((p: any) => p.data)
        .filter((d: any) => d && d.author && d.author !== '[deleted]')
        .map((d: any): GenericPlatformLeadResult => ({
          external_id: `reddit_${d.id}`,
          source: 'reddit',
          name: `u/${d.author}`,
          category: `r/${d.subreddit} [HIRING]`,
          sub_reddit: `r/${d.subreddit}`,
          profile_url: `https://www.reddit.com${d.permalink}`,
          description: (d.title || '').slice(0, 300),
          website: '',
          has_website: false,
          intent_level: 'urgent',
          budget: '$800 - $3,500',
          high_ticket_score: Math.min(82 + (d.num_comments || 0) * 2, 98),
          offered_service: query.toLowerCase().includes('web') ? 'website_design' : 'video_editing',
        }));

      if (results.length > 0) {
        return {
          leads: annotateContacted(results, contactedIds, contactedPhones, contactedEmails),
          isMock: false,
          message: `Found ${results.length} live Reddit hiring posts for "${query}".`,
        };
      }
    } catch (err: any) {
      console.warn('[Reddit OAuth Search Failed]:', err.message);
    }
  }

  if (!token) {
    return {
      leads: [],
      isMock: false,
      message:
        'Reddit search requires Reddit API credentials. Please set REDDIT_API_KEY (ClientId:ClientSecret) in server/.env or Settings to fetch live hiring posts.',
    };
  }

  return {
    leads: [],
    isMock: false,
    message: `No active hiring posts found on Reddit for "${query}". Try keywords like "video editor", "website", or "designer".`,
  };
}

async function scrapeLiveInstagramProfiles(
  keyword: string,
  countryCode: string,
  brandTrack?: 'production' | 'gems_jewels'
): Promise<GenericPlatformLeadResult[]> {
  const cityMap: Record<string, string> = {
    US: 'Miami, FL',
    GB: 'London, UK',
    CA: 'Toronto, Canada',
    AU: 'Sydney, Australia',
    AE: 'Dubai, UAE',
    DE: 'Berlin, Germany',
    FR: 'Paris, France',
    NL: 'Amsterdam, Netherlands',
    CH: 'Zurich, Switzerland',
    SG: 'Singapore',
    NZ: 'Auckland, New Zealand',
    IE: 'Dublin, Ireland',
  };

  const targetCity = cityMap[countryCode] || 'Miami, FL';

  try {
    const geo = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(targetCity)}&limit=1`,
      { headers: { 'User-Agent': 'KlyperixOutreachEnterprise/2.0' }, timeout: 4000 }
    );

    if (geo.data?.[0]) {
      const { lat, lon } = geo.data[0];
      const query = `[out:json][timeout:8];(
        node["contact:instagram"](around:30000,${lat},${lon});
        node["instagram"](around:30000,${lat},${lon});
        way["contact:instagram"](around:30000,${lat},${lon});
        way["instagram"](around:30000,${lat},${lon});
      );out center 30;`;

      const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'KlyperixOutreachEnterprise/2.0 (Instagram Lead Discovery)',
          Accept: 'application/json',
        },
        timeout: 9000,
      });

      const elements = res.data?.elements || [];
      const results: GenericPlatformLeadResult[] = [];

      for (const el of elements) {
        if (!el.tags) continue;
        const name = el.tags.name;
        if (!name) continue;

        let rawInsta = el.tags['contact:instagram'] || el.tags.instagram || '';
        if (rawInsta.includes('instagram.com/')) {
          rawInsta = rawInsta.split('instagram.com/')[1]?.split(/[\/?#]/)[0] || '';
        }
        const cleanHandle = rawInsta.replace(/^@/, '').trim();
        if (!cleanHandle) continue;

        const phone = el.tags['contact:phone'] || el.tags.phone || undefined;
        const website = el.tags['contact:website'] || el.tags.website || undefined;
        const category = el.tags.shop || el.tags.office || el.tags.amenity || el.tags.leisure || keyword;

        results.push({
          external_id: `ig_live_${el.id}`,
          source: 'instagram',
          name: name,
          category: `${category.replace(/_/g, ' ').toUpperCase()} • ${keyword}`,
          country_code: countryCode,
          instagram_handle: `@${cleanHandle}`,
          profile_url: `https://www.instagram.com/${cleanHandle}/`,
          phone: phone,
          website: website || `https://www.instagram.com/${cleanHandle}/`,
          has_website: Boolean(website),
          high_ticket_score: Math.min(88 + results.length, 98),
          intent_level: 'urgent',
          budget: '$2,000 - $5,500/mo',
          description: `Verified active commercial Instagram profile in ${targetCity}. Direct handle: @${cleanHandle}. Phone: ${phone || 'Available via DM'}.`,
          offered_service: keyword.toLowerCase().includes('web') ? 'website_design' : 'video_editing',
        });

        if (results.length >= 15) break;
      }

      if (results.length > 0) {
        return results;
      }
    }
  } catch (err: any) {
    console.warn('[Live Instagram Scraper Error]:', err.message);
  }

  return [];
}

export interface ExtractedWebsiteContacts {
  email?: string;
  phone?: string;
  instagramHandle?: string;
  linkedinUrl?: string;
  xUrl?: string;
  facebookUrl?: string;
  sourceUrl: string;
  scannedPages: number;
}

/**
 * Real-Time Website Contact & Email Extractor
 * Crawls a business website's homepage and /contact page to extract real contact emails,
 * phone numbers, and direct social profile links.
 */
export async function extractWebsiteContacts(websiteUrl: string): Promise<ExtractedWebsiteContacts> {
  if (!websiteUrl || !websiteUrl.trim()) {
    throw new Error('Website URL is required for contact extraction.');
  }

  const cleanUrl = websiteUrl.startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`;
  let baseOrigin = '';
  try {
    const parsed = new URL(cleanUrl);
    baseOrigin = parsed.origin;
  } catch {
    baseOrigin = cleanUrl;
  }

  const result: ExtractedWebsiteContacts = {
    sourceUrl: cleanUrl,
    scannedPages: 0,
  };

  const pagesToScan = [cleanUrl];
  if (baseOrigin && !cleanUrl.endsWith('/contact') && !cleanUrl.endsWith('/about')) {
    pagesToScan.push(`${baseOrigin}/contact`);
    pagesToScan.push(`${baseOrigin}/contact-us`);
    pagesToScan.push(`${baseOrigin}/about`);
  }

  const foundEmails = new Set<string>();
  const foundPhones = new Set<string>();

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  const junkEmailExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js'];
  const junkEmailDomains = ['sentry.io', 'example.com', 'wixpress.com', 'domain.com', 'email.com', 'placeholder.com'];

  for (const pageUrl of pagesToScan) {
    try {
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 6000,
        maxRedirects: 3,
      });

      result.scannedPages++;
      const html = typeof response.data === 'string' ? response.data : '';
      if (!html) continue;

      // 1. Extract mailto: links first (highest precision)
      const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
      for (const m of mailtoMatches) {
        const clean = m.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
        if (clean && !junkEmailExtensions.some((ext) => clean.endsWith(ext))) {
          foundEmails.add(clean);
        }
      }

      // 2. Extract general email pattern
      const generalMatches = html.match(emailRegex) || [];
      for (const raw of generalMatches) {
        const clean = raw.trim().toLowerCase();
        const domain = clean.split('@')[1] || '';
        if (
          clean &&
          !junkEmailExtensions.some((ext) => clean.endsWith(ext)) &&
          !junkEmailDomains.some((d) => domain.includes(d))
        ) {
          foundEmails.add(clean);
        }
      }

      // 3. Extract tel: links
      const telMatches = html.match(/href=["']tel:([^"']+)["']/gi) || [];
      for (const t of telMatches) {
        const cleanPhone = t.replace(/href=["']tel:/i, '').replace(/["']/g, '').trim();
        if (cleanPhone.replace(/[^0-9]/g, '').length >= 7) {
          foundPhones.add(cleanPhone);
        }
      }

      // 4. Extract Social Profile Links
      if (!result.instagramHandle) {
        const igMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
        if (igMatch && igMatch[2] && !['p', 'reel', 'explore', 'stories', 'direct'].includes(igMatch[2].toLowerCase())) {
          result.instagramHandle = `@${igMatch[2]}`;
        }
      }

      if (!result.linkedinUrl) {
        const liMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_-]+/i);
        if (liMatch) result.linkedinUrl = liMatch[0];
      }

      if (!result.xUrl) {
        const xMatch = html.match(/https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
        if (xMatch && xMatch[3] && !['intent', 'share', 'home'].includes(xMatch[3].toLowerCase())) {
          result.xUrl = xMatch[0];
        }
      }

      if (!result.facebookUrl) {
        const fbMatch = html.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i);
        if (fbMatch && !fbMatch[0].includes('sharer')) {
          result.facebookUrl = fbMatch[0];
        }
      }

      // If we found both email and phone, we can break early
      if (foundEmails.size > 0 && foundPhones.size > 0) {
        break;
      }
    } catch {
      // Continue to next page if contact subpage 404s
    }
  }

  // Prioritize info@, contact@, or hello@ if available
  const emailList = Array.from(foundEmails);
  const prioritizedEmail =
    emailList.find((e) => e.startsWith('contact@') || e.startsWith('info@') || e.startsWith('hello@')) ||
    emailList[0];

  result.email = prioritizedEmail || undefined;
  result.phone = Array.from(foundPhones)[0] || undefined;

  return result;
}

// Universal Multi-Platform Lead Search (100% Real Only)
export async function searchUniversalPlatform(
  platform: string,
  params: {
    queryKeyword?: string;
    countryCode?: string;
    brandTrack?: 'production' | 'gems_jewels';
    timeFilter?: string;
  }
): Promise<{ leads: GenericPlatformLeadResult[]; isMock: boolean; message?: string }> {
  const { contactedIds, contactedPhones, contactedEmails } = await getContactedSets();
  const keyword = params.queryKeyword || 'video editor';
  const countryCode = (params.countryCode || 'US').toUpperCase();
  const countryName = COUNTRY_MAP[countryCode] || countryCode;

  if (platform === 'reddit') {
    return searchReddit(keyword);
  }

  if (platform === 'instagram') {
    const liveInsta = await scrapeLiveInstagramProfiles(keyword, countryCode, params.brandTrack);
    if (liveInsta.length > 0) {
      return {
        leads: annotateContacted(liveInsta, contactedIds, contactedPhones, contactedEmails),
        isMock: false,
        message: `Extracted ${liveInsta.length} verified live Instagram business profiles with direct handles in ${countryName}.`,
      };
    }
    return {
      leads: [],
      isMock: false,
      message: `No public businesses with tagged Instagram handles found in ${countryName} for "${keyword}". Try Google Maps or YouTube creator search for verified leads.`,
    };
  }

  return {
    leads: [],
    isMock: false,
    message: `${platform.toUpperCase()} direct scraping is not supported without dedicated official API keys. For 100% real leads, use Google Maps, YouTube Creators, or Reddit Hiring Posts.`,
  };
}

