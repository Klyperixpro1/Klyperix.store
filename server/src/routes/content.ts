import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { generateSocialMediaCopies } from '../services/aiService';
import {
  createSocialPost,
  getAllSocialPosts,
  updateSocialPostStatus,
  deleteSocialPost,
  publishSocialPost,
} from '../services/socialPublishService';

const router = Router();

// Generate platform-specific AI copies for media
router.post('/generate-copies', async (req: Request, res: Response) => {
  try {
    const { topic, baseText, mediaType = 'reel', brandMode = 'production' } = req.body;
    const resolvedTopic = topic || baseText;
    if (!resolvedTopic || !resolvedTopic.trim()) {
      return res.status(400).json({ error: 'Topic or hook is required.' });
    }

    const copies = await generateSocialMediaCopies(resolvedTopic, mediaType, brandMode);
    return res.json({ success: true, copies });
  } catch (error: any) {
    console.error('Generate social copies error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate copies.' });
  }
});

// Get all social posts
router.get('/posts', async (_req: Request, res: Response) => {
  try {
    const dbPosts = await getAllSocialPosts();
    const posts = dbPosts.map(p => ({
      id: p.id,
      media_type: p.media_type,
      media_url: p.media_url,
      title: p.title,
      target_platforms: p.target_platforms ? p.target_platforms.split(',') : [],
      platform_copies: p.captions_json ? JSON.parse(p.captions_json) : undefined,
      status: p.status,
      scheduled_at: p.scheduled_at,
      created_at: p.created_at,
      base_text: p.title
    }));
    return res.json({ posts });
  } catch (error: any) {
    console.error('Get social posts error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create social post
router.post('/posts', async (req: Request, res: Response) => {
  try {
    const { title, mediaType, media_type, mediaUrl, media_url, captions, platform_copies, targetPlatforms, target_platforms, status, scheduledAt } = req.body;
    
    const finalMediaType = mediaType || media_type || 'reel';
    const finalMediaUrl = mediaUrl || media_url;
    const finalCaptions = captions || platform_copies;
    const finalTargetPlatforms = targetPlatforms || target_platforms;

    if (!title || !finalCaptions || !finalTargetPlatforms) {
      return res.status(400).json({ error: 'title, captions, and targetPlatforms are required.' });
    }

    const post = await createSocialPost({
      title,
      mediaType: finalMediaType,
      mediaUrl: finalMediaUrl,
      captions: finalCaptions,
      targetPlatforms: Array.isArray(finalTargetPlatforms) ? finalTargetPlatforms : [finalTargetPlatforms],
      status: status || 'draft',
      scheduledAt,
    });

    return res.json({ success: true, post });
  } catch (error: any) {
    console.error('Create social post error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update post status (e.g. mark published or scheduled)
router.put('/posts/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await updateSocialPostStatus(parseInt(id, 10), status);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Update post status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete('/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteSocialPost(parseInt(id, 10));
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Publish social post to channels
router.post('/posts/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await publishSocialPost(parseInt(id, 10));
    return res.json(result);
  } catch (error: any) {
    console.error('Publish social post error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Upload media file (image/video clip)
router.post('/upload-media', async (req: Request, res: Response) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required.' });
    }
    const uploadsDir = path.resolve(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const ext = fileName ? path.extname(fileName) : '.png';
    const safeName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const targetPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(targetPath, Buffer.from(cleanBase64, 'base64'));
    return res.json({ success: true, url: `/uploads/${safeName}` });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
