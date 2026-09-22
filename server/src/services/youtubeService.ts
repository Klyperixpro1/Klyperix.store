import axios from 'axios';
import { youtubeRateLimiter } from '../utils/rateLimiter';
import { getSetting } from './settingsService';
import { all } from '../db/database';
import { getCachedData, setCachedData } from './cacheService';

export type ThumbnailQualityStatus =
  | 'needs_thumbnail_redesign'
  | 'needs_video_editing'
  | 'optimized_visuals';

export interface YouTubeLeadResult {
  external_id: string;
  name: string;
  category: string;
  brand_track?: 'production' | 'gems_jewels';
  channel_handle?: string;
  region_code?: string;
  high_ticket_score?: number;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  avg_views_per_video: number;
  view_to_sub_ratio: number;
  thumbnail_quality_status: ThumbnailQualityStatus;
  opportunity_reason: string;
  description: string;
  website: string;
  contact_email?: string;
  phone?: string;
  thumbnail_url?: string;
  recent_video_title?: string;
  recent_video_thumbnail?: string;
  selected?: boolean;
  already_contacted?: boolean;
}

export function calculateYouTubeHighTicketScore(
  channel: Partial<YouTubeLeadResult>,
  brandTrack: 'production' | 'gems_jewels' = 'production'
): number {
  let score = 50;
  const subs = channel.subscriber_count || 0;
  const views = channel.avg_views_per_video || 0;

  if (subs >= 100000) score += 20;
  else if (subs >= 20000) score += 14;
  else if (subs >= 5000) score += 8;

  if (views >= 10000) score += 15;
  else if (views >= 2000) score += 8;

  if (channel.contact_email) score += 10;
  if (channel.thumbnail_quality_status === 'needs_thumbnail_redesign' || channel.thumbnail_quality_status === 'needs_video_editing') {
    score += 10;
  }

  return Math.min(Math.max(score, 25), 98);
}

export async function searchYouTubeChannels(
  keyword: string,
  minSubs: number = 0,
  maxSubs: number = 10000000,
  qualityFilter: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing' = 'all',
  brandTrack: 'production' | 'gems_jewels' = 'production',
  regionCode: string = 'US'
): Promise<{ leads: YouTubeLeadResult[]; isMock: boolean; message?: string }> {
  const apiKey = await getSetting('youtubeApiKey');

  const contactedRecords = await all<{ external_id?: string; channel_handle?: string; contact_email?: string }>(
    "SELECT external_id, channel_handle, contact_email FROM leads WHERE status IN ('contacted', 'replied', 'converted') OR last_contacted_at IS NOT NULL"
  );
  const contactedExtIds = new Set(contactedRecords.filter((r) => r.external_id).map((r) => r.external_id));
  const contactedHandles = new Set(
    contactedRecords.filter((r) => r.channel_handle).map((r) => r.channel_handle?.toLowerCase())
  );
  const contactedEmails = new Set(
    contactedRecords.filter((r) => r.contact_email).map((r) => r.contact_email?.toLowerCase())
  );

  const effectiveKeyword = keyword.trim() || (brandTrack === 'gems_jewels' ? 'Luxury Jewelry Reviews' : 'Real Estate Podcasts');

  const cacheKey = `yt:${brandTrack}:${effectiveKeyword.toLowerCase().trim()}:${minSubs}:${maxSubs}:${qualityFilter}:${regionCode}`;
  const cachedData = await getCachedData<YouTubeLeadResult[]>(cacheKey);

  if (cachedData && cachedData.length > 0) {
    const freshAnnotated = cachedData.map((lead) => {
      const handle = (lead.channel_handle || '').toLowerCase();
      const isContacted = Boolean(
        (lead.external_id && contactedExtIds.has(lead.external_id)) ||
        (handle && contactedHandles.has(handle)) ||
        (lead.contact_email && contactedEmails.has(lead.contact_email.toLowerCase()))
      );
      return {
        ...lead,
        already_contacted: isContacted,
        high_ticket_score: lead.high_ticket_score || calculateYouTubeHighTicketScore(lead, brandTrack),
      };
    });

    return {
      leads: freshAnnotated,
      isMock: false,
      message: `⚡ Instant Cache: Loaded ${freshAnnotated.length} channels with 0 YouTube quota consumption.`,
    };
  }

  if (!apiKey) {
    return {
      leads: [],
      isMock: false,
      message: 'YouTube search is not connected. Add a YouTube Data API key in server/.env to enable it.',
    };
  }

  await youtubeRateLimiter.acquire();

  try {
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        type: 'channel',
        q: effectiveKeyword,
        maxResults: 25,
        regionCode: regionCode || 'US',
        key: apiKey,
      },
      timeout: 12000,
    });

    const items = searchRes.data.items || [];
    const channelIds = items.map((item: any) => item.snippet?.channelId).filter(Boolean);

    if (channelIds.length === 0) {
      return { leads: [], isMock: false, message: `No channels found for "${effectiveKeyword}".` };
    }

    const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        id: channelIds.join(','),
        key: apiKey,
      },
      timeout: 12000,
    });

    const channelDetails = channelRes.data.items || [];
    const leads: YouTubeLeadResult[] = channelDetails.map((item: any) => {
      const stats = item.statistics || {};
      const snippet = item.snippet || {};
      const subs = parseInt(stats.subscriberCount || '0', 10);
      const vids = parseInt(stats.videoCount || '0', 10);
      const views = parseInt(stats.viewCount || '0', 10);
      const avgViews = vids > 0 ? Math.round(views / vids) : 0;
      const ratio = subs > 0 ? +(views / subs).toFixed(2) : 0;
      const customUrl = snippet.customUrl || `@${snippet.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const leadItem: YouTubeLeadResult = {
        external_id: item.id,
        name: snippet.title,
        category: effectiveKeyword,
        brand_track: brandTrack,
        channel_handle: customUrl,
        region_code: regionCode,
        subscriber_count: subs,
        video_count: vids,
        view_count: views,
        avg_views_per_video: avgViews,
        view_to_sub_ratio: ratio,
        thumbnail_quality_status: ratio < 5 ? 'needs_thumbnail_redesign' : 'needs_video_editing',
        opportunity_reason: `Channel has ${subs.toLocaleString()} subscribers and average ${avgViews.toLocaleString()} views per upload.`,
        description: snippet.description || 'Active YouTube channel in target creator niche.',
        website: `https://www.youtube.com/${customUrl}`,
        contact_email: '',
        thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        already_contacted: contactedExtIds.has(item.id) || contactedHandles.has(customUrl.toLowerCase()),
      };

      leadItem.high_ticket_score = calculateYouTubeHighTicketScore(leadItem, brandTrack);
      return leadItem;
    });

    const filtered = filterYouTubeLeads(leads, minSubs, maxSubs, qualityFilter);
    await setCachedData(cacheKey, filtered, 48);

    return {
      leads: filtered,
      isMock: false,
      message: `Found ${filtered.length} verified creators for "${effectiveKeyword}".`,
    };
  } catch (error: any) {
    console.error('YouTube search error:', error.message);
    return {
      leads: [],
      isMock: false,
      message: `YouTube API error: ${error.message || 'unknown error'}.`,
    };
  }
}

function filterYouTubeLeads(
  leads: YouTubeLeadResult[],
  minSubs: number,
  maxSubs: number,
  qualityFilter: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing'
): YouTubeLeadResult[] {
  return leads.filter((lead) => {
    if (lead.subscriber_count < minSubs || lead.subscriber_count > maxSubs) return false;
    if (qualityFilter !== 'all' && lead.thumbnail_quality_status !== qualityFilter) return false;
    return true;
  });
}

