import { run, all, get } from '../db/database';
import { MultiPlatformSocialCopies, normalizeSocialCopies } from './aiService';

export interface SocialPostRecord {
  id: number;
  title: string;
  media_type: 'reel' | 'video' | 'image' | 'carousel' | 'text';
  media_url?: string;
  captions_json: string;
  target_platforms: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
}

export async function createSocialPost(data: {
  title: string;
  mediaType: 'reel' | 'video' | 'image' | 'carousel' | 'text';
  mediaUrl?: string;
  captions: MultiPlatformSocialCopies;
  targetPlatforms: string[];
  status?: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
}): Promise<SocialPostRecord> {
  const captionsJson = JSON.stringify(data.captions);
  const targetPlatformsStr = data.targetPlatforms.join(',');

  const result = await run(
    `INSERT INTO social_posts (title, media_type, media_url, captions_json, target_platforms, status, scheduled_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.mediaType,
      data.mediaUrl || null,
      captionsJson,
      targetPlatformsStr,
      data.status || 'draft',
      data.scheduledAt || null,
      data.status === 'published' ? new Date().toISOString() : null,
    ]
  );

  const created = await get<SocialPostRecord>('SELECT * FROM social_posts WHERE id = ?', [result.id]);
  return created!;
}

export async function getAllSocialPosts(): Promise<SocialPostRecord[]> {
  return all<SocialPostRecord>('SELECT * FROM social_posts ORDER BY id DESC');
}

export async function updateSocialPostStatus(
  id: number,
  status: 'draft' | 'scheduled' | 'published'
): Promise<void> {
  const publishedAt = status === 'published' ? new Date().toISOString() : null;
  await run(
    'UPDATE social_posts SET status = ?, published_at = COALESCE(?, published_at) WHERE id = ?',
    [status, publishedAt, id]
  );
}

export async function getSocialPostById(id: number): Promise<SocialPostRecord | undefined> {
  return get<SocialPostRecord>('SELECT * FROM social_posts WHERE id = ?', [id]);
}

export interface PlatformPublishResult {
  platform: string;
  name: string;
  status: 'published' | 'intent_ready' | 'api_configured';
  message: string;
  intentUrl?: string;
  copyText?: string;
  instructions?: string;
}

export async function publishSocialPost(id: number): Promise<{
  success: boolean;
  post: SocialPostRecord;
  results: Record<string, PlatformPublishResult>;
}> {
  const post = await getSocialPostById(id);
  if (!post) {
    throw new Error(`Social post #${id} not found.`);
  }

  let captions: MultiPlatformSocialCopies;
  try {
    const rawCaptions = JSON.parse(post.captions_json || '{}');
    captions = normalizeSocialCopies(rawCaptions, post.title);
  } catch (err) {
    captions = normalizeSocialCopies({}, post.title);
  }

  const platforms = post.target_platforms
    ? post.target_platforms.split(',').map((p) => p.trim()).filter(Boolean)
    : ['instagram', 'facebook', 'linkedin', 'youtube_shorts', 'x'];

  const results: Record<string, PlatformPublishResult> = {};

  for (const p of platforms) {
    switch (p) {
      case 'x': {
        const tweetText = captions.x?.tweet || captions.xTwitter?.tweet || post.title;
        const fullTweet = post.media_url ? `${tweetText}\n\n${post.media_url}` : tweetText;
        const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(fullTweet)}`;
        results.x = {
          platform: 'x',
          name: 'X (Twitter)',
          status: 'intent_ready',
          message: 'Post prefilled in X composer.',
          intentUrl,
          copyText: fullTweet,
          instructions: 'Text is prefilled in your tweet composer. Click Post to publish!',
        };
        break;
      }
      case 'linkedin': {
        const liText = captions.linkedin?.text || captions.linkedin?.professionalPost || post.title;
        const fullLiText = post.media_url ? `${liText}\n\n${post.media_url}` : liText;
        const intentUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(fullLiText)}`;
        results.linkedin = {
          platform: 'linkedin',
          name: 'LinkedIn',
          status: 'intent_ready',
          message: 'LinkedIn feed modal prefilled.',
          intentUrl,
          copyText: fullLiText,
          instructions: 'Text is prefilled in LinkedIn feed composer. Review and click Post.',
        };
        break;
      }
      case 'facebook': {
        const fbText = captions.facebook?.text || captions.facebook?.narrative || post.title;
        const intentUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(
          fbText
        )}${post.media_url ? '&u=' + encodeURIComponent(post.media_url) : ''}`;
        results.facebook = {
          platform: 'facebook',
          name: 'Facebook',
          status: 'intent_ready',
          message: 'Ready to publish to Facebook feed/group.',
          intentUrl,
          copyText: fbText,
          instructions: 'Facebook share dialog opens with your caption prefilled.',
        };
        break;
      }
      case 'youtube_shorts': {
        const ytTitle = captions.youtubeShorts?.videoTitle || captions.youtube_shorts?.title || post.title;
        const ytDesc = `${captions.youtubeShorts?.description || ''}${
          captions.youtubeShorts?.tags?.length ? '\n\nTags: ' + captions.youtubeShorts.tags.join(', ') : ''
        }${post.media_url ? '\n\nAsset link: ' + post.media_url : ''}`;
        const intentUrl = 'https://studio.youtube.com/channel/upload';
        results.youtube_shorts = {
          platform: 'youtube_shorts',
          name: 'YouTube Shorts',
          status: 'intent_ready',
          message: 'YouTube Studio upload pre-configured.',
          intentUrl,
          copyText: `Title: ${ytTitle}\n\nDescription: ${ytDesc}`,
          instructions: 'Title & description copied to clipboard! Upload your video & paste details.',
        };
        break;
      }
      case 'instagram': {
        const igCaption = `${captions.instagram?.caption || post.title}${
          captions.instagram?.hashtags?.length ? '\n\n' + captions.instagram.hashtags.join(' ') : ''
        }`;
        const intentUrl = 'https://www.instagram.com/';
        results.instagram = {
          platform: 'instagram',
          name: 'Instagram',
          status: 'intent_ready',
          message: 'Instagram creator studio / web upload ready.',
          intentUrl,
          copyText: igCaption,
          instructions: 'Caption & hashtags automatically copied to clipboard! Paste (Ctrl+V) when Instagram opens.',
        };
        break;
      }
      default:
        results[p] = {
          platform: p,
          name: p.toUpperCase(),
          status: 'intent_ready',
          message: `Ready to publish to ${p}.`,
        };
    }
  }

  // Update status in DB
  const now = new Date().toISOString();
  await run(
    'UPDATE social_posts SET status = ?, published_at = ? WHERE id = ?',
    ['published', now, id]
  );

  // Record audit log entry
  try {
    await run(
      'INSERT INTO audit_logs (action, details) VALUES (?, ?)',
      [
        'social_post_published',
        `Dispatched multi-platform social post "${post.title}" to ${platforms.join(', ')}`,
      ]
    );
  } catch (err) {
    // Ignore audit log error if table doesn't match
  }

  const updated = await getSocialPostById(id);
  return {
    success: true,
    post: updated!,
    results,
  };
}

export async function deleteSocialPost(id: number): Promise<void> {
  await run('DELETE FROM social_posts WHERE id = ?', [id]);
}
