export type LeadSource =
  | 'all'
  | 'google_places'
  | 'youtube'
  | 'facebook'
  | 'threads'
  | 'instagram'
  | 'x'
  | 'behance'
  | 'linkedin'
  | 'upwork'
  | 'freelancer'
  | 'fiverr'
  | 'contra'
  | 'reddit'
  | 'gmail'
  | 'whatsapp';

export type BrandTrack = 'production' | 'gems_jewels';

export type LeadStatus = 'not_contacted' | 'contacted' | 'replied' | 'converted' | 'rejected';
export type PitchStatus = 'draft' | 'ready' | 'sent';
export type PitchTone = 'friendly' | 'professional' | 'direct' | 'creative' | 'bold';

export type OfferedService =
  | 'website_design'
  | 'video_editing'
  | 'graphic_design'
  | 'content_creation_reels'
  | 'branding_logo'
  | 'jewelry_wholesale_supply'
  | 'custom_diamond_manufacturing'
  | 'luxury_retail_collection'
  | 'general';

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'meeting'
  | 'proposal'
  | 'won'
  | 'lost';

export interface WebsiteAuditResult {
  score: number;
  problems: string[];
  opportunities: string[];
  summary: string;
  has_website: boolean;
}

export interface SocialAuditResult {
  score: number;
  visualQuality: string;
  postingConsistency: string;
  opportunities: string[];
  summary: string;
}

export interface MessageQualityScore {
  quality_score: number;
  human_sound_score: number;
  is_spammy: boolean;
  is_too_salesy: boolean;
  suggestions: string[];
  breakdown: {
    personalization: number;
    relevance: number;
    conciseness: number;
    safety: number;
  };
}

export interface FollowupMessage {
  step: number;
  delay_days: number;
  subject: string;
  message: string;
  rationale: string;
}

export interface DailySummary {
  date: string;
  metrics: {
    leads_found_today: number;
    qualified_leads: number;
    high_ticket_leads: number;
    contacted_today: number;
    replies_today: number;
    meetings_booked: number;
    proposals_sent: number;
  };
  best_platform: string;
  best_country: string;
  best_service: string;
  top_opportunity: {
    name: string;
    country: string;
    score: number;
    service: string;
  } | null;
}

export interface BestOpportunity {
  id: number;
  name: string;
  country_code: string;
  category: string;
  high_ticket_score: number;
  intent_level: string;
  offered_service: string;
  website: string;
  reason: string;
}

export interface SocialPost {
  id: number;
  media_type: 'reel' | 'video' | 'image' | 'carousel' | 'text';
  media_url?: string;
  title?: string;
  base_text?: string;
  target_platforms: string[];
  platform_copies?: MultiPlatformSocialCopies;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at?: string;
  created_at?: string;
}

export interface MultiPlatformSocialCopies {
  instagram?: { hook?: string; caption: string; hashtags: string[]; cta?: string };
  facebook?: { title?: string; narrative?: string; text?: string; cta?: string };
  linkedin?: { headline?: string; professionalPost?: string; text?: string; takeaways?: string[]; hashtags?: string[] };
  youtube_shorts?: { title?: string; videoTitle?: string; description: string; tags: string[] };
  youtubeShorts?: { title?: string; videoTitle?: string; description: string; tags: string[] };
  x?: { tweet?: string; tweetHook?: string; threadContent?: string };
  xTwitter?: { tweet?: string; tweetHook?: string; threadContent?: string };
}

export interface PlatformPublishResult {
  platform: string;
  name?: string;
  status: 'published' | 'intent_ready' | 'api_configured';
  message: string;
  intentUrl?: string;
  copyText?: string;
  instructions?: string;
}

export interface Lead {
  id: number;
  source: LeadSource;
  brand_track?: BrandTrack;
  external_id: string;
  name: string;
  category?: string;
  address?: string;
  country_code?: string;
  high_ticket_score?: number;
  intent_level?: 'low' | 'medium' | 'high' | 'urgent';
  budget_estimate?: string;
  lead_quality_score?: number;
  website_audit_json?: string;
  social_audit_json?: string;
  pipeline_stage?: PipelineStage;
  followup_step?: number;
  followup_due_at?: string;
  phone?: string;
  whatsapp_number?: string;
  phone_type?: 'mobile' | 'landline' | 'unknown' | 'none';
  website?: string;
  has_website?: boolean;
  email?: string;
  contact_email?: string;
  instagram_handle?: string;
  instagram_url?: string;
  linkedin_url?: string;
  channel_handle?: string;
  profile_url?: string;
  followers_count?: number;
  subscriber_count?: number;
  video_count?: number;
  view_count?: number;
  rating?: number;
  user_ratings_total?: number;
  description?: string;
  budget?: string;
  project_title?: string;
  headline?: string;
  sub_reddit?: string;
  status: LeadStatus;
  notes?: string;
  pitch?: string;
  pitch_status?: PitchStatus;
  offered_service?: OfferedService;
  in_campaign_queue?: boolean;
  markContacted?: boolean;
  created_at?: string;
  updated_at?: string;
  last_contacted_at?: string;
}

export interface PlaceLeadResult {
  external_id: string;
  name: string;
  category: string;
  brand_track?: BrandTrack;
  address: string;
  country_code?: string;
  high_ticket_score?: number;
  phone?: string;
  whatsapp_number?: string;
  phone_type?: 'mobile' | 'landline' | 'unknown' | 'none';
  email?: string;
  contact_email?: string;
  website?: string;
  has_website: boolean;
  instagram_handle?: string;
  instagram_url?: string;
  linkedin_url?: string;
  rating?: number;
  user_ratings_total?: number;
  description?: string;
  google_maps_url?: string;
  selected?: boolean;
  already_contacted?: boolean;
  pitch?: string;
}

export type PlaceSearchResult = PlaceLeadResult;

export type ThumbnailQualityStatus =
  | 'needs_thumbnail_redesign'
  | 'needs_video_editing'
  | 'optimized_visuals';

export interface YouTubeSearchResult {
  external_id: string;
  name: string;
  category: string;
  brand_track?: BrandTrack;
  channel_handle?: string;
  region_code?: string;
  high_ticket_score?: number;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  avg_views_per_video?: number;
  view_to_sub_ratio?: number;
  thumbnail_quality_status?: ThumbnailQualityStatus;
  opportunity_reason?: string;
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

export interface PlatformSearchResult {
  external_id: string;
  source: LeadSource;
  brand_track?: BrandTrack;
  name: string;
  category: string;
  address?: string;
  country_code?: string;
  high_ticket_score?: number;
  phone?: string;
  whatsapp_number?: string;
  phone_type?: 'mobile' | 'landline' | 'unknown' | 'none';
  website?: string;
  has_website?: boolean;
  email?: string;
  contact_email?: string;
  instagram_handle?: string;
  instagram_url?: string;
  linkedin_url?: string;
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
  pitch?: string;
}

export interface DashboardStats {
  totalLeads: number;
  notContacted: number;
  contacted: number;
  replied: number;
  converted: number;
  rejected: number;
  totalReached: number;
  conversionRate: string;
  responseRate: string;
  placesCount: number;
  youtubeCount: number;
  facebookCount?: number;
  threadsCount?: number;
  instagramCount?: number;
  xCount?: number;
  behanceCount?: number;
  linkedinCount?: number;
  upworkCount?: number;
  freelancerCount?: number;
  fiverrCount?: number;
  redditCount?: number;
  gmailCount?: number;
  pitchesReady: number;
  recentLeads: Lead[];
}

export interface PlatformConnection {
  id: string;
  platform: string;
  name: string;
  status: 'connected' | 'disconnected' | 'expired' | 'action_required';
  account_identifier?: string;
  last_synced_at?: string;
  compliance_mode: 'human_in_the_loop' | 'authorized_oauth' | 'unofficial_risk_controlled';
  description: string;
  setup_help_url?: string;
  details?: Record<string, any>;
}

export interface AppSettings {
  googlePlacesApiKey?: string;
  youtubeApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  groqModel?: string;
  grokApiKey?: string;
  instagramApiKey?: string;
  facebookApiKey?: string;
  threadsApiKey?: string;
  linkedinApiKey?: string;
  linkedinClientId?: string;
  linkedinClientSecret?: string;
  xApiKey?: string;
  xApiSecret?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  instagramAccessToken?: string;
  behanceApiKey?: string;
  upworkApiKey?: string;
  freelancerApiKey?: string;
  fiverrApiKey?: string;
  redditApiKey?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  smtpHost?: string;
  smtpPort?: string | number;
  smtpUser?: string;
  smtpPass?: string;
  defaultPitchTone?: PitchTone;
  mockModeEnabled?: boolean;
  hasGooglePlacesKey?: boolean;
  hasYoutubeKey?: boolean;
  hasGroqKey?: boolean;
  hasRedditKey?: boolean;
  hasGrokKey?: boolean;
  hasResendKey?: boolean;
  hasSmtpConfigured?: boolean;
  hasLinkedinCredentials?: boolean;
  hasXCredentials?: boolean;
  hasMetaCredentials?: boolean;
  killSwitchActive?: boolean;
  defaultBrandTrack?: BrandTrack;
  detectedGoogleProject?: { found: boolean; projectId?: string; projectName?: string } | any;
  businessContactPhone?: string;
  customApiKeys?: Array<{ id: string; name: string; key: string; value: string }>;
}

export type WhatsAppStatus = 'disconnected' | 'qr_ready' | 'connecting' | 'connected' | 'error';

export interface WhatsAppStatusState {
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  errorMessage: string | null;
  sentToday?: number;
  dailyLimit?: number;
  limitReached?: boolean;
}

export interface WhatsAppAccountState {
  id: string;
  name: string;
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  errorMessage: string | null;
  lastActive: string | null;
  killSwitchActive?: boolean;
  sentToday?: number;
  dailyLimit?: number;
  limitReached?: boolean;
}

export interface BatchWhatsAppProgress {
  isRunning: boolean;
  currentIndex: number;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  currentLeadName: string | null;
  currentPhone: string | null;
  secondsRemaining: number;
  statusMessage: string | null;
  activeAccountsCount?: number;
  logs: Array<{ time: string; leadName: string; phone: string; success: boolean; message: string; accountName?: string }>;
}

export interface InboundReply {
  id: number;
  lead_id?: number;
  lead_name?: string;
  lead_category?: string;
  lead_status?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_source?: string;
  original_pitch?: string;
  channel: string;
  sender_id: string;
  sender_name?: string;
  message_text: string;
  received_at: string;
  is_read: boolean | number;
  sentiment?: { sentiment: string; toneLabel: string; recommendedStyle: string };
}
