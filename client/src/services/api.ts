import axios from 'axios';
import {
  Lead,
  DashboardStats,
  AppSettings,
  PitchTone,
  OfferedService,
  BrandTrack,
  PlaceLeadResult,
  YouTubeSearchResult,
  PlatformSearchResult,
  PlatformConnection,
  WhatsAppStatusState,
  WhatsAppAccountState,
  BatchWhatsAppProgress,
  InboundReply,
  PipelineStage,
  WebsiteAuditResult,
  MessageQualityScore,
  FollowupMessage,
  DailySummary,
  BestOpportunity,
  SocialPost,
  MultiPlatformSocialCopies,
  PlatformPublishResult,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const getDailySummary = async (): Promise<{ summary: DailySummary }> => {
  const res = await api.get('/dashboard/daily-summary');
  return res.data;
};

export const getBestOpportunities = async (): Promise<{ opportunities: BestOpportunity[] }> => {
  const res = await api.get('/dashboard/best-opportunities');
  return res.data;
};

export const getAuditLogs = async (limit: number = 50): Promise<{ logs: any[] }> => {
  const res = await api.get(`/dashboard/audit-logs?limit=${limit}`);
  return res.data;
};

export const updateLeadPipelineStage = async (id: number, stage: PipelineStage): Promise<{ success: boolean; lead: Lead }> => {
  const res = await api.put(`/leads/${id}/stage`, { stage });
  return res.data;
};

export const auditLeadWebsite = async (id: number, websiteUrl?: string): Promise<{ success: boolean; audit: WebsiteAuditResult; lead: Lead }> => {
  const res = await api.post(`/leads/${id}/audit`, { websiteUrl });
  return res.data;
};

export const evaluateMessageQuality = async (
  message: string,
  leadContext?: any
): Promise<{ success: boolean; evaluation: MessageQualityScore }> => {
  const res = await api.post('/leads/evaluate-message', { pitch: message, message, lead: leadContext, leadContext });
  return res.data;
};

// Real-time live website contact & email extractor
export const extractWebsiteContacts = async (
  websiteUrl: string,
  leadId?: number
): Promise<{
  success: boolean;
  contacts: {
    email?: string;
    phone?: string;
    instagramHandle?: string;
    linkedinUrl?: string;
    xUrl?: string;
    facebookUrl?: string;
    sourceUrl: string;
    scannedPages: number;
  };
}> => {
  const res = await api.post('/platforms/extract-contacts', { websiteUrl, leadId });
  return res.data;
};

export const generateLeadFollowup = async (
  id: number,
  step: number = 1
): Promise<{ success: boolean; followup: FollowupMessage }> => {
  const res = await api.post(`/leads/${id}/generate-followup`, { step });
  return res.data;
};

// Social Media Content Studio APIs
export const generateSocialCopies = async (payload: {
  baseText: string;
  mediaType: string;
  title?: string;
  targetPlatforms: string[];
}): Promise<{ success: boolean; copies: MultiPlatformSocialCopies }> => {
  const res = await api.post('/content/generate-copies', payload);
  return res.data;
};

export const getSocialPosts = async (): Promise<{ posts: SocialPost[] }> => {
  const res = await api.get('/content/posts');
  return res.data;
};

export const createSocialPost = async (post: Partial<SocialPost>): Promise<{ success: boolean; post: SocialPost }> => {
  const res = await api.post('/content/posts', post);
  return res.data;
};

export const publishSocialPost = async (
  id: number
): Promise<{ success: boolean; results: Record<string, PlatformPublishResult>; post: SocialPost }> => {
  const res = await api.post(`/content/posts/${id}/publish`);
  return res.data;
};

export const deleteSocialPost = async (id: number): Promise<{ success: boolean }> => {
  const res = await api.delete(`/content/posts/${id}`);
  return res.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<DashboardStats>('/dashboard/stats');
  return res.data;
};

export const searchPlaces = async (params: {
  category: string;
  location: string;
  radius?: number;
  websiteFilter?: 'all' | 'no_website' | 'has_website';
  brandTrack?: BrandTrack;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ leads: PlaceLeadResult[]; isMock: boolean; message?: string }> => {
  const res = await api.post('/places/search', params);
  return res.data;
};

export const searchYouTube = async (params: {
  keyword: string;
  minSubs?: number;
  maxSubs?: number;
  qualityFilter?: 'all' | 'needs_thumbnail_redesign' | 'needs_video_editing';
  brandTrack?: BrandTrack;
  regionCode?: string;
}): Promise<{ leads: YouTubeSearchResult[]; isMock: boolean; message?: string }> => {
  const res = await api.post('/youtube/search', params);
  return res.data;
};

// Multi-Platform Search APIs
export const searchReddit = async (params: {
  subreddit?: string;
  queryKeyword?: string;
}): Promise<{ leads: PlatformSearchResult[]; isMock: boolean; message?: string }> => {
  const res = await api.get('/platforms/reddit/search', { params });
  return res.data;
};

export const searchPlatformLeads = async (
  platform: string,
  params: {
    queryKeyword?: string;
    countryCode?: string;
    brandTrack?: BrandTrack;
    timeFilter?: string;
  }
): Promise<{ leads: PlatformSearchResult[]; isMock: boolean; message?: string }> => {
  const res = await api.get(`/platforms/${platform}/search`, { params });
  return res.data;
};

export const getLeads = async (params?: {
  source?: string;
  brandTrack?: BrandTrack;
  status?: string;
  search?: string;
  hasWebsite?: 'all' | 'no_website' | 'has_website';
  inCampaign?: boolean;
  minScore?: number;
  limit?: number;
  offset?: number;
}): Promise<{ leads: Lead[]; total: number }> => {
  const res = await api.get('/leads', { params });
  return res.data;
};

export const getLead = async (id: number): Promise<Lead> => {
  const res = await api.get(`/leads/${id}`);
  return res.data;
};

export const createLead = async (leadData: Partial<Lead>): Promise<Lead> => {
  const res = await api.post('/leads', leadData);
  return res.data;
};

export const saveLeads = async (
  leads: Partial<Lead>[],
  autoGeneratePitch: boolean = false,
  offeredService: OfferedService = 'general'
): Promise<{ success: boolean; savedCount: number; insertedLeads: any[] }> => {
  const res = await api.post('/leads/batch-save', { leads, autoGeneratePitch, offeredService });
  return res.data;
};

export const updateLead = async (id: number, updates: Partial<Lead>): Promise<Lead> => {
  const res = await api.put(`/leads/${id}`, updates);
  return res.data;
};

export const deleteLead = async (id: number): Promise<void> => {
  await api.delete(`/leads/${id}`);
};

export const bulkDeleteLeads = async (ids: number[]): Promise<{ success: boolean; deletedCount: number }> => {
  const res = await api.post('/leads/bulk-delete', { ids });
  return res.data;
};

export const addToCampaignQueue = async (
  leadIds: number[],
  inQueue: boolean = true
): Promise<{ success: boolean; updatedCount: number }> => {
  const res = await api.post('/leads/campaign-queue', { leadIds, inQueue });
  return res.data;
};

export const removeFromCampaignQueue = async (
  leadIdOrIds: number | number[]
): Promise<{ success: boolean; updatedCount: number }> => {
  const ids = Array.isArray(leadIdOrIds) ? leadIdOrIds : [leadIdOrIds];
  return addToCampaignQueue(ids, false);
};

export const clearCampaignQueue = async (leadIds?: number[]): Promise<{ success: boolean }> => {
  if (leadIds && leadIds.length > 0) {
    await addToCampaignQueue(leadIds, false);
  }
  return { success: true };
};

export const generatePitch = async (payload: {
  leadId?: number;
  lead?: Partial<Lead>;
  tone?: PitchTone;
  offeredService?: OfferedService;
  customInstructions?: string;
  brandMode?: BrandTrack;
}): Promise<{ pitch: string; provider: string; isMock: boolean }> => {
  const res = await api.post('/ai/generate-pitch', payload);
  return res.data;
};

export const batchGeneratePitches = async (
  payloadOrIds:
    | {
        leadIds: number[];
        tone?: PitchTone;
        offeredService?: OfferedService;
        customInstructions?: string;
        brandMode?: BrandTrack;
      }
    | number[],
  tone?: PitchTone,
  offeredService?: OfferedService,
  customInstructions?: string
): Promise<{ success: boolean; count: number; results: any[] }> => {
  const payload = Array.isArray(payloadOrIds)
    ? { leadIds: payloadOrIds, tone, offeredService, customInstructions }
    : payloadOrIds;
  const res = await api.post('/ai/batch-generate', payload);
  return res.data;
};

export const getSettings = async (): Promise<AppSettings> => {
  const res = await api.get('/settings');
  return res.data;
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<{ success: boolean; message?: string }> => {
  const res = await api.post('/settings', settings);
  return res.data;
};

export const testApiKey = async (
  service: 'google_places' | 'places' | 'youtube' | 'gemini' | 'claude' | 'groq' | 'resend' | string,
  key?: string
): Promise<{ valid: boolean; success: boolean; message: string }> => {
  const normalizedService = service === 'google_places' ? 'places' : service;
  const res = await api.post('/settings/test-key', { service: normalizedService, key });
  return {
    valid: res.data.valid ?? res.data.success ?? false,
    success: res.data.success ?? res.data.valid ?? false,
    message: res.data.message || 'Key verified successfully.',
  };
};

// Platform Connections API
export const getConnections = async (): Promise<{ connections: PlatformConnection[] }> => {
  const res = await api.get('/connections');
  return res.data;
};

export const disconnectGmail = async (): Promise<{ success: boolean }> => {
  const res = await api.post('/auth/google/disconnect');
  return res.data;
};

export const updateConnectionStatus = async (
  id: string,
  status: 'connected' | 'disconnected' | 'expired' | 'action_required',
  accountIdentifier?: string
): Promise<{ success: boolean; connections: PlatformConnection[] }> => {
  const res = await api.post(`/connections/${id}/status`, { status, accountIdentifier });
  return res.data;
};

// Emergency Kill Switch API
export const getEmergencyKillSwitchStatus = async (): Promise<{ killSwitchActive: boolean }> => {
  const res = await api.get('/settings/kill-switch');
  return res.data;
};

export const toggleEmergencyKillSwitch = async (active: boolean): Promise<{ success: boolean; killSwitchActive: boolean }> => {
  const res = await api.post('/settings/kill-switch', { active });
  return res.data;
};

// WhatsApp API Methods
export const getWhatsAppAccounts = async (): Promise<WhatsAppAccountState[]> => {
  const res = await api.get<WhatsAppAccountState[]>('/whatsapp/accounts');
  return res.data;
};

export const getWhatsAppStatus = async (sessionId: string = 'account_1'): Promise<WhatsAppStatusState> => {
  const res = await api.get<WhatsAppStatusState>(`/whatsapp/status?sessionId=${sessionId}`);
  return res.data;
};

export const connectWhatsAppAccount = async (
  sessionId: string,
  accountName?: string,
  forceRestart: boolean = false
): Promise<WhatsAppAccountState> => {
  const res = await api.post<WhatsAppAccountState>('/whatsapp/connect', { sessionId, accountName, forceRestart });
  return res.data;
};

export const disconnectWhatsAppAccount = async (sessionId: string): Promise<WhatsAppAccountState> => {
  const res = await api.post<WhatsAppAccountState>('/whatsapp/disconnect', { sessionId });
  return res.data;
};

export const connectWhatsApp = async (forceRestart: boolean = false): Promise<WhatsAppStatusState> => {
  return connectWhatsAppAccount('account_1', 'Primary WhatsApp', forceRestart);
};

export const disconnectWhatsApp = async (): Promise<WhatsAppStatusState> => {
  return disconnectWhatsAppAccount('account_1');
};

export const sendDirectWhatsAppMessage = async (payload: {
  phone: string;
  message: string;
  leadId?: number;
}): Promise<{ success: boolean; message: string; messageId?: string }> => {
  const res = await api.post('/whatsapp/send', payload);
  return res.data;
};

export const startWhatsAppBatchCampaign = async (
  leads: Array<{ id: number; name: string; phone: string; message: string }>,
  minDelaySeconds: number = 45,
  maxDelaySeconds: number = 90
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/whatsapp/batch-start', {
    leads,
    minDelaySeconds: Math.max(minDelaySeconds, 45),
    maxDelaySeconds: Math.max(maxDelaySeconds, 60),
  });
  return res.data;
};

export const getWhatsAppBatchStatus = async (): Promise<BatchWhatsAppProgress> => {
  const res = await api.get<BatchWhatsAppProgress>('/whatsapp/batch-status');
  return res.data;
};

export const stopWhatsAppBatchCampaign = async (): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/whatsapp/batch-stop');
  return res.data;
};

// Inbound Replies API Methods
export const getInboundReplies = async (): Promise<{ replies: InboundReply[]; unreadCount: number }> => {
  const res = await api.get<{ replies: InboundReply[]; unreadCount: number }>('/replies');
  return res.data;
};

export const markRepliesAsRead = async (replyIds?: number[]): Promise<{ success: boolean }> => {
  const res = await api.post('/replies/mark-read', { replyIds });
  return res.data;
};

export const generateAISmartReply = async (payload: {
  incomingMessage: string;
  originalPitch?: string;
  leadName?: string;
}): Promise<{
  reply: string;
  sentiment: { sentiment: string; toneLabel: string; recommendedStyle: string };
  warnings?: string[];
}> => {
  const res = await api.post('/replies/generate-ai-response', payload);
  return res.data;
};

export const enhanceReplyDraft = async (payload: {
  rawDraft: string;
  incomingMessage: string;
  leadName?: string;
  brandMode?: string;
}): Promise<{ reply: string; provider: string }> => {
  const res = await api.post('/replies/enhance-reply', payload);
  return res.data;
};

export const sendQuickWhatsAppResponse = async (payload: {
  leadId?: number;
  phone?: string;
  email?: string;
  channel?: string;
  subject?: string;
  message: string;
}): Promise<{ success: boolean; message?: string }> => {
  const res = await api.post('/replies/send-response', payload);
  return res.data;
};

// Direct In-App Email API Methods
export const sendDirectEmailMessage = async (payload: {
  to: string;
  subject?: string;
  message: string;
  leadId?: number;
}): Promise<{ success: boolean; message: string; messageId?: string }> => {
  const res = await api.post('/email/send', payload);
  return res.data;
};

export const sendBatchEmailMessages = async (
  leads: Array<{ id: number; name: string; email: string; subject?: string; message: string }>
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/email/batch-send', { leads });
  return res.data;
};

export const getEmailSendStatus = async (): Promise<{ sentToday: number; dailyLimit: number; limitReached: boolean }> => {
  const res = await api.get('/email/status');
  return res.data;
};

export const testSmtpSettings = async (credentials?: {
  smtpHost?: string;
  smtpPort?: string | number;
  smtpUser?: string;
  smtpPass?: string;
}): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/email/test', credentials || {});
  return res.data;
};

export const testResendKey = async (resendApiKey?: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.post('/email/test-resend', { resendApiKey });
  return res.data;
};

export const getExportCsvUrl = (): string => {
  return '/api/leads/export/csv';
};
