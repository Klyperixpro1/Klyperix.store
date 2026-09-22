import React, { useState, useEffect } from 'react';
import {
  Share2,
  Sparkles,
  Send,
  Calendar,
  Image as ImageIcon,
  Video,
  Film,
  Layers,
  FileText,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  AlertCircle,
  Trash2,
  Rocket,
  X as CloseIcon,
  Check,
} from 'lucide-react';
import {
  generateSocialCopies,
  getSocialPosts,
  createSocialPost,
  publishSocialPost,
  deleteSocialPost,
} from '../../services/api';
import { SocialPost, MultiPlatformSocialCopies, PlatformPublishResult } from '../../types';

export const ContentStudio: React.FC = () => {
  const [mediaType, setMediaType] = useState<'reel' | 'video' | 'image' | 'carousel' | 'text'>('reel');
  const [title, setTitle] = useState('');
  const [baseText, setBaseText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
    'linkedin',
    'youtube_shorts',
    'x',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopies, setGeneratedCopies] = useState<MultiPlatformSocialCopies | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<'instagram' | 'facebook' | 'linkedin' | 'youtube_shorts' | 'x'>('instagram');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Launchpad Modal State
  const [activePublishModal, setActivePublishModal] = useState<{
    post: SocialPost;
    results?: Record<string, PlatformPublishResult>;
  } | null>(null);

  const fetchPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await getSocialPosts();
      setPosts(res.posts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleTogglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleGenerateCopies = async () => {
    if (!baseText.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a description or core idea for your content first.' });
      return;
    }

    setIsGenerating(true);
    setFeedbackMsg(null);
    try {
      const res = await generateSocialCopies({
        baseText,
        mediaType,
        title,
        targetPlatforms: selectedPlatforms,
      });

      if (res.success && res.copies) {
        setGeneratedCopies(res.copies);
        setFeedbackMsg({ type: 'success', text: 'AI generated tailored copy for all selected platforms!' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.error || 'Failed to generate copies.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Extract structured platform details
  const getPlatformDetails = (
    platform: string,
    copies?: MultiPlatformSocialCopies,
    fallbackTitle?: string,
    fallbackMediaUrl?: string
  ) => {
    const pTitle = fallbackTitle || title || 'New Content';
    const mUrl = fallbackMediaUrl || mediaUrl;

    switch (platform) {
      case 'instagram': {
        const ig = copies?.instagram;
        const caption = ig?.caption || baseText || pTitle;
        const hashtags = ig?.hashtags?.length ? ig.hashtags.join(' ') : '#ContentCreation #VideoProduction #Marketing';
        const fullText = `${caption}\n\n${hashtags}${mUrl ? '\n\n' + mUrl : ''}`;
        return {
          platform: 'instagram',
          name: 'Instagram',
          icon: <Instagram className="h-4 w-4 text-pink-600" />,
          title: 'Instagram Reel / Post',
          caption,
          hook: ig?.hook,
          cta: ig?.cta,
          hashtags: ig?.hashtags || ['#ContentCreation', '#VideoProduction'],
          fullText,
          intentUrl: 'https://www.instagram.com/',
          instructions: 'Caption & hashtags automatically copied! Paste (Ctrl+V) when Instagram opens.',
        };
      }
      case 'linkedin': {
        const li = copies?.linkedin;
        const postText = li?.professionalPost || li?.text || baseText || pTitle;
        const takeaways = li?.takeaways?.length
          ? '\n\nKey Takeaways:\n' + li.takeaways.map((t) => '• ' + t).join('\n')
          : '';
        const hashtags = li?.hashtags?.length ? '\n\n' + li.hashtags.join(' ') : '';
        const fullText = `${li?.headline ? li.headline + '\n\n' : ''}${postText}${takeaways}${hashtags}${
          mUrl ? '\n\n' + mUrl : ''
        }`;
        return {
          platform: 'linkedin',
          name: 'LinkedIn',
          icon: <Linkedin className="h-4 w-4 text-blue-700" />,
          title: 'LinkedIn Thought-Leadership Post',
          headline: li?.headline,
          caption: postText,
          takeaways: li?.takeaways,
          hashtags: li?.hashtags || ['#BusinessGrowth', '#B2B'],
          fullText,
          intentUrl: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(fullText)}`,
          instructions: 'Post text is prefilled in LinkedIn feed composer. Review and click Post!',
        };
      }
      case 'youtube_shorts': {
        const yt = copies?.youtubeShorts || copies?.youtube_shorts;
        const vTitle = yt?.videoTitle || yt?.title || `${pTitle} #Shorts`;
        const desc = yt?.description || baseText || pTitle;
        const tags = yt?.tags?.length ? '\n\nTags: ' + yt.tags.join(', ') : '';
        const fullText = `Title:\n${vTitle}\n\nDescription:\n${desc}${tags}${mUrl ? '\n\nAsset: ' + mUrl : ''}`;
        return {
          platform: 'youtube_shorts',
          name: 'YouTube Shorts',
          icon: <Youtube className="h-4 w-4 text-red-600" />,
          title: 'YouTube Shorts Metadata',
          vTitle,
          description: desc,
          tags: yt?.tags || ['#Shorts', '#Trending'],
          fullText,
          intentUrl: 'https://studio.youtube.com/channel/upload',
          instructions: 'Title & description copied to clipboard! Paste into your YouTube Studio upload.',
        };
      }
      case 'x': {
        const xData = copies?.xTwitter || copies?.x;
        const tweetText =
          xData?.tweet ||
          (xData?.tweetHook && xData?.threadContent
            ? `${xData.tweetHook}\n\n${xData.threadContent}`
            : xData?.tweetHook || baseText || pTitle);
        const fullText = mUrl ? `${tweetText}\n\n${mUrl}` : tweetText;
        return {
          platform: 'x',
          name: 'X (Twitter)',
          icon: <Twitter className="h-4 w-4 text-slate-800" />,
          title: 'X (Twitter) Post',
          tweetHook: xData?.tweetHook,
          threadContent: xData?.threadContent,
          fullText,
          intentUrl: `https://x.com/intent/post?text=${encodeURIComponent(fullText)}`,
          instructions: 'Post prefilled in X composer. Review and click Post!',
        };
      }
      case 'facebook': {
        const fb = copies?.facebook;
        const narrative = fb?.narrative || fb?.text || baseText || pTitle;
        const fullText = `${fb?.title ? fb.title + '\n\n' : ''}${narrative}${fb?.cta ? '\n\n' + fb.cta : ''}`;
        return {
          platform: 'facebook',
          name: 'Facebook',
          icon: <Facebook className="h-4 w-4 text-blue-600" />,
          title: 'Facebook Post',
          fbTitle: fb?.title,
          narrative,
          cta: fb?.cta,
          fullText,
          intentUrl: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(fullText)}${
            mUrl ? '&u=' + encodeURIComponent(mUrl) : ''
          }`,
          instructions: 'Facebook share dialog opens with your caption prefilled. Hit Share to Feed!',
        };
      }
      default:
        return {
          platform,
          name: platform.toUpperCase(),
          icon: <Share2 className="h-4 w-4 text-purple-600" />,
          title: `${platform} Post`,
          fullText: baseText || pTitle,
          intentUrl: '#',
          instructions: 'Ready to publish.',
        };
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLaunchSinglePlatform = (
    platform: string,
    copies?: MultiPlatformSocialCopies,
    pTitle?: string,
    pMediaUrl?: string
  ) => {
    const details = getPlatformDetails(platform, copies || generatedCopies || undefined, pTitle, pMediaUrl);
    navigator.clipboard.writeText(details.fullText);
    setCopiedKey(platform);
    setTimeout(() => setCopiedKey(null), 2500);

    if (details.intentUrl && details.intentUrl !== '#') {
      window.open(details.intentUrl, '_blank');
    }
    setFeedbackMsg({
      type: 'success',
      text: `Copied ${details.name} caption to clipboard & opened post window!`,
    });
  };

  const handleLaunchAllPlatforms = (
    platformsList: string[],
    copies?: MultiPlatformSocialCopies,
    pTitle?: string,
    pMediaUrl?: string
  ) => {
    platformsList.forEach((plt, index) => {
      const details = getPlatformDetails(plt, copies, pTitle, pMediaUrl);
      if (details.intentUrl && details.intentUrl !== '#') {
        setTimeout(() => {
          window.open(details.intentUrl, '_blank');
        }, index * 400);
      }
    });

    const primary = platformsList[0] || 'instagram';
    const primaryDetails = getPlatformDetails(primary, copies, pTitle, pMediaUrl);
    navigator.clipboard.writeText(primaryDetails.fullText);

    setFeedbackMsg({
      type: 'success',
      text: `Opening all channels! ${primaryDetails.name} copy saved to clipboard. (If browser blocked extra tabs, click each channel button below).`,
    });
  };

  const handleCreateAndPublish = async (andPublish: boolean = false) => {
    if (!baseText.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Content text cannot be empty.' });
      return;
    }

    setIsPublishing(true);
    setFeedbackMsg(null);
    try {
      const saveRes = await createSocialPost({
        media_type: mediaType,
        media_url: mediaUrl,
        title: title || 'Untitled Post',
        base_text: baseText,
        target_platforms: selectedPlatforms,
        platform_copies: generatedCopies || undefined,
        status: andPublish ? 'published' : 'draft',
      });

      if (saveRes.success && saveRes.post) {
        if (andPublish) {
          const pubRes = await publishSocialPost(saveRes.post.id);
          setFeedbackMsg({
            type: 'success',
            text: 'Post saved! Multi-Platform Launchpad opened.',
          });
          setActivePublishModal({
            post: pubRes.post || saveRes.post,
            results: pubRes.results,
          });
        } else {
          setFeedbackMsg({ type: 'success', text: 'Saved as draft post successfully!' });
        }
        fetchPosts();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save or publish post.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this post from your pipeline?')) return;
    try {
      await deleteSocialPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (activePublishModal?.post.id === id) {
        setActivePublishModal(null);
      }
      setFeedbackMsg({ type: 'success', text: 'Post removed from pipeline.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Failed to delete post.' });
    }
  };

  const platformIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="h-4 w-4 text-pink-600" />,
    facebook: <Facebook className="h-4 w-4 text-blue-600" />,
    linkedin: <Linkedin className="h-4 w-4 text-blue-700" />,
    youtube_shorts: <Youtube className="h-4 w-4 text-red-600" />,
    x: <Twitter className="h-4 w-4 text-slate-800" />,
  };

  const activeDetails = getPlatformDetails(activePlatformTab, generatedCopies || undefined, title, mediaUrl);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#251142] via-[#5c2f8f] to-[#8400ff] rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI Content Studio & 1-Click Multi-Publish</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Create & Publish Social Content</h1>
          <p className="text-sm text-purple-100/80 max-w-2xl">
            Upload your Reel, Video, Carousel, or Post. AI writes platform-native hooks, captions, and hashtags tailored for Instagram, LinkedIn, YouTube Shorts, X, and Facebook — with instant 1-click launch.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <span className="text-sm font-medium">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs opacity-60 hover:opacity-100">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Studio Editor + AI Platform Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Creation Form */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#ecdcff] shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#251142] flex items-center gap-2">
              <Film className="h-4 w-4 text-[#8400ff]" />
              <span>1. Select Content Type</span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
              {[
                { id: 'reel', label: 'Reel', icon: Video },
                { id: 'video', label: 'Video', icon: Film },
                { id: 'image', label: 'Image', icon: ImageIcon },
                { id: 'carousel', label: 'Carousel', icon: Layers },
                { id: 'text', label: 'Post', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = mediaType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMediaType(item.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#faf7ff] border-[#8400ff] text-[#8400ff] shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-[#8400ff]/40 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5c2f8f] mb-1.5 uppercase tracking-wider">
                Title / Project Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., 3 Editing Mistakes High-Ticket Creators Make"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8400ff]/20 focus:border-[#8400ff] text-sm text-[#251142]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c2f8f] mb-1.5 uppercase tracking-wider">
                Core Idea / Transcript / Key Message
              </label>
              <textarea
                rows={4}
                placeholder="Describe what the video or post is about. Example: Showing a breakdown of how we improved a client's retention by 42% by fixing audio pacing and dynamic zooms..."
                value={baseText}
                onChange={(e) => setBaseText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8400ff]/20 focus:border-[#8400ff] text-sm text-[#251142] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c2f8f] mb-1.5 uppercase tracking-wider">
                Media File URL or Cloud Link (Optional)
              </label>
              <input
                type="text"
                placeholder="https://storage.googleapis.com/... or Google Drive link"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8400ff]/20 focus:border-[#8400ff] text-sm text-[#251142]"
              />
            </div>

            {/* Platform Checkboxes */}
            <div>
              <label className="block text-xs font-bold text-[#5c2f8f] mb-2 uppercase tracking-wider">
                Target Publishing Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'facebook', label: 'Facebook' },
                  { id: 'linkedin', label: 'LinkedIn' },
                  { id: 'youtube_shorts', label: 'YouTube Shorts' },
                  { id: 'x', label: 'X (Twitter)' },
                ].map((p) => {
                  const isChecked = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePlatform(p.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-[#8400ff] text-white border-[#8400ff]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {platformIcons[p.id]}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Generate Action */}
            <button
              onClick={handleGenerateCopies}
              disabled={isGenerating || !baseText.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#5c2f8f] to-[#8400ff] text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating Native AI Variations...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Multi-Platform AI Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Col: AI Tailored Copies Preview & 1-Click Publish */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#ecdcff] shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#251142] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8400ff]" />
                <span>2. AI Native Formats</span>
              </h2>
              {generatedCopies && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Tailored Variations Ready
                </span>
              )}
            </div>

            {/* Channel Tabs */}
            <div className="flex gap-2 overflow-x-auto py-3">
              {[
                { id: 'instagram', label: 'Instagram' },
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'youtube_shorts', label: 'YouTube' },
                { id: 'x', label: 'X' },
                { id: 'facebook', label: 'Facebook' },
              ].map((tab) => {
                const isActive = activePlatformTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePlatformTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      isActive ? 'bg-[#8400ff] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {platformIcons[tab.id]}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Preview */}
            <div className="bg-[#faf7ff] rounded-2xl p-4 border border-[#ecdcff] min-h-[260px] flex flex-col justify-between">
              {generatedCopies ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5c2f8f] flex items-center gap-1.5">
                      {activeDetails.icon}
                      <span>{activeDetails.title}</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(activeDetails.fullText, activePlatformTab)}
                      className="text-xs text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedKey === activePlatformTab ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedKey === activePlatformTab ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Body preview depending on active tab */}
                  <div className="bg-white/80 rounded-xl p-3 border border-purple-100 space-y-2 text-xs text-slate-800 leading-relaxed max-h-[220px] overflow-y-auto">
                    {activePlatformTab === 'instagram' && (
                      <>
                        {activeDetails.hook && (
                          <p className="font-bold text-[#251142]">{activeDetails.hook}</p>
                        )}
                        <p className="whitespace-pre-wrap">{activeDetails.caption}</p>
                        {activeDetails.hashtags && (
                          <p className="font-semibold text-[#8400ff] mt-2">{activeDetails.hashtags.join(' ')}</p>
                        )}
                        {activeDetails.cta && (
                          <p className="text-slate-500 font-medium italic mt-1">{activeDetails.cta}</p>
                        )}
                      </>
                    )}

                    {activePlatformTab === 'linkedin' && (
                      <>
                        {activeDetails.headline && (
                          <p className="font-black text-[#251142] text-sm">{activeDetails.headline}</p>
                        )}
                        <p className="whitespace-pre-wrap">{activeDetails.caption}</p>
                        {activeDetails.takeaways && activeDetails.takeaways.length > 0 && (
                          <div className="pt-2 border-t border-purple-50">
                            <span className="font-bold text-slate-700">Key Takeaways:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                              {activeDetails.takeaways.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {activeDetails.hashtags && (
                          <p className="font-semibold text-[#8400ff] mt-2">{activeDetails.hashtags.join(' ')}</p>
                        )}
                      </>
                    )}

                    {activePlatformTab === 'youtube_shorts' && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Title:</span>
                          <p className="font-bold text-[#251142]">{activeDetails.vTitle}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Description:</span>
                          <p className="whitespace-pre-wrap">{activeDetails.description}</p>
                        </div>
                        {activeDetails.tags && (
                          <p className="text-slate-500 font-semibold">{activeDetails.tags.join(' ')}</p>
                        )}
                      </div>
                    )}

                    {activePlatformTab === 'x' && (
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap font-medium">{activeDetails.fullText}</p>
                      </div>
                    )}

                    {activePlatformTab === 'facebook' && (
                      <div className="space-y-1.5">
                        {activeDetails.fbTitle && (
                          <p className="font-bold text-[#251142]">{activeDetails.fbTitle}</p>
                        )}
                        <p className="whitespace-pre-wrap">{activeDetails.narrative}</p>
                        {activeDetails.cta && (
                          <p className="text-slate-500 italic font-medium">{activeDetails.cta}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Direct Launch Button for this specific tab */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchSinglePlatform(activePlatformTab)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#8400ff] hover:bg-[#7200db] text-white font-bold text-xs shadow hover:shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Rocket className="h-4 w-4" />
                      <span>Post on {activeDetails.name} Now</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-1">{activeDetails.instructions}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <Sparkles className="h-8 w-8 text-[#bb7eff]" />
                  <p className="text-xs font-medium">
                    Enter your content idea on the left and click "Generate Multi-Platform AI Copy" to create tailored versions for each platform.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Save Draft vs Publish */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleCreateAndPublish(false)}
              disabled={isPublishing || !baseText.trim()}
              className="flex-1 py-3 px-4 rounded-xl border border-[#ecdcff] bg-white text-[#5c2f8f] font-bold text-xs hover:bg-[#faf7ff] disabled:opacity-50 transition"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleCreateAndPublish(true)}
              disabled={isPublishing || !baseText.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white font-bold text-xs shadow-md hover:shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  <span>1-Click Publish to All</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Published & Scheduled Content History */}
      <div className="bg-white rounded-3xl p-6 border border-[#ecdcff] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#8400ff]" />
            <h3 className="text-base font-bold text-[#251142]">Recent Content Pipeline</h3>
          </div>
          <button
            onClick={fetchPosts}
            className="text-xs text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {isLoadingPosts ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading published content...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No published or drafted social posts yet. Create your first post above!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((p) => {
              const copies = p.platform_copies || undefined;
              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#251142] truncate">{p.title || 'Untitled'}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#ecdcff] text-[#5c2f8f]">
                        {p.media_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate max-w-xl">{p.base_text}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {p.target_platforms &&
                        p.target_platforms.map((plt) => (
                          <span key={plt} title={plt}>
                            {platformIcons[plt]}
                          </span>
                        ))}
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                    </span>

                    {/* Launch / Post Button */}
                    <button
                      onClick={() =>
                        setActivePublishModal({
                          post: p,
                          results: undefined,
                        })
                      }
                      className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#5c2f8f] to-[#8400ff] text-white text-xs font-bold shadow hover:opacity-95 transition flex items-center gap-1.5"
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      <span>Launch</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeletePost(p.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition"
                      title="Delete Post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Platform Launchpad Modal */}
      {activePublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-purple-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#251142] to-[#5c2f8f] text-white flex items-center justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-semibold text-purple-200">
                  <Rocket className="h-3.5 w-3.5 text-amber-300" />
                  <span>1-Click Multi-Publish Launchpad</span>
                </div>
                <h3 className="text-lg font-black">{activePublishModal.post.title || 'Social Post'}</h3>
              </div>
              <button
                onClick={() => setActivePublishModal(null)}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Actions & Guidance */}
            <div className="p-5 border-b border-slate-100 bg-purple-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                <p className="font-semibold text-[#5c2f8f]">Ready to publish across your chosen networks.</p>
                <p className="text-[11px] text-slate-500">
                  Clicking "Open & Post" copies the tailored copy to your clipboard and opens the post composer.
                </p>
              </div>
              <button
                onClick={() =>
                  handleLaunchAllPlatforms(
                    activePublishModal.post.target_platforms || ['instagram', 'x', 'linkedin', 'facebook'],
                    activePublishModal.post.platform_copies,
                    activePublishModal.post.title,
                    activePublishModal.post.media_url
                  )
                }
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white text-xs font-bold shadow hover:shadow-md transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Rocket className="h-4 w-4" />
                <span>Launch All Channels</span>
              </button>
            </div>

            {/* Modal Body: Channel Cards */}
            <div className="p-6 overflow-y-auto space-y-4">
              {(activePublishModal.post.target_platforms || ['instagram', 'x', 'linkedin', 'facebook', 'youtube_shorts']).map(
                (plt) => {
                  const details = getPlatformDetails(
                    plt,
                    activePublishModal.post.platform_copies,
                    activePublishModal.post.title,
                    activePublishModal.post.media_url
                  );
                  const isCopied = copiedKey === plt;

                  return (
                    <div
                      key={plt}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#8400ff]/40 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-slate-100">{details.icon}</div>
                          <div>
                            <h4 className="text-sm font-bold text-[#251142]">{details.name}</h4>
                            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Ready to Post
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyText(details.fullText, plt)}
                            className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() =>
                              handleLaunchSinglePlatform(
                                plt,
                                activePublishModal.post.platform_copies,
                                activePublishModal.post.title,
                                activePublishModal.post.media_url
                              )
                            }
                            className="py-1.5 px-3.5 rounded-xl bg-[#8400ff] hover:bg-[#7200db] text-white text-xs font-bold shadow transition flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open & Post</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3 whitespace-pre-wrap">
                        {details.fullText}
                      </p>

                      <p className="text-[11px] text-slate-400 italic">{details.instructions}</p>
                    </div>
                  );
                }
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActivePublishModal(null)}
                className="py-2 px-5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
