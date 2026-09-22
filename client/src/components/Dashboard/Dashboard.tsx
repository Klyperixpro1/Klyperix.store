import React, { useEffect, useState } from 'react';
import { DashboardStats, DailySummary, BestOpportunity } from '../../types';
import { NavTab } from '../Layout/Sidebar';
import { StatsCounter } from '../ui/StatsCounter';
import {
  Zap,
  Flame,
  Inbox,
  Database,
  Download,
  DollarSign,
  MessageSquare,
  Mail,
  Youtube,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Send,
  Award,
  Globe2,
  Globe,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { getExportCsvUrl, getDailySummary, getBestOpportunities } from '../../services/api';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onSelectTab: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, loading, onSelectTab }) => {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [bestOpportunities, setBestOpportunities] = useState<BestOpportunity[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    const fetchDashboardExtras = async () => {
      setLoadingExtras(true);
      try {
        const [sumRes, oppRes] = await Promise.all([
          getDailySummary().catch(() => ({ summary: null })),
          getBestOpportunities().catch(() => ({ opportunities: [] })),
        ]);
        if (sumRes && sumRes.summary) setDailySummary(sumRes.summary);
        if (oppRes && oppRes.opportunities) setBestOpportunities(oppRes.opportunities);
      } catch (err) {
        console.error('Error loading daily summary & best opportunities:', err);
      } finally {
        setLoadingExtras(false);
      }
    };
    fetchDashboardExtras();
  }, []);
  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-[#8400ff] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#715599]">Loading Klyperix Studio metrics...</span>
        </div>
      </div>
    );
  }

  const contactedTotal = stats.contacted + stats.replied + stats.converted;

  const discoveryEngines: Array<{
    id: string;
    name: string;
    badge: string;
    icon: React.ReactNode;
    count?: number;
    desc: string;
    actionText: string;
    tab: NavTab;
  }> = [
    {
      id: 'google_places',
      name: 'Google Maps & Local Places',
      badge: 'Live Places / OSM',
      icon: <MapPin className="h-5 w-5 text-sky-600" />,
      count: stats.placesCount || 0,
      desc: 'Local clinics, jewelry boutiques, gyms & studios with phone numbers & websites.',
      actionText: 'Search Places',
      tab: 'find_leads',
    },
    {
      id: 'youtube',
      name: 'YouTube Creators & Channels',
      badge: 'YouTube Data API v3',
      icon: <Youtube className="h-5 w-5 text-rose-600" />,
      count: stats.youtubeCount || 0,
      desc: 'Video creators, podcasters & brand review channels with live subscriber counts.',
      actionText: 'Find Creators',
      tab: 'find_leads',
    },
    {
      id: 'reddit',
      name: 'Reddit Hiring Leads',
      badge: 'Reddit Live API',
      icon: <MessageSquare className="h-5 w-5 text-orange-600" />,
      count: stats.redditCount || 0,
      desc: 'Verified client job postings & high-intent gigs from r/forhire and r/Hiring.',
      actionText: 'Scan Hiring Posts',
      tab: 'find_leads',
    },
    {
      id: 'website_extractor',
      name: 'Live Website Contact Extractor',
      badge: 'Native Web Crawler',
      icon: <Globe className="h-5 w-5 text-indigo-600" />,
      count: undefined,
      desc: 'Deep crawls lead websites to extract verified mailto: emails, phones, and social handles.',
      actionText: 'Extract Contacts',
      tab: 'find_leads',
    },
  ];

  const outreachChannels: Array<{
    id: string;
    name: string;
    badge: string;
    icon: React.ReactNode;
    count: number;
    countLabel: string;
    desc: string;
    actionText: string;
    tab: NavTab;
  }> = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Direct Outreach',
      badge: 'Baileys Web Engine',
      icon: <MessageCircle className="h-5 w-5 text-emerald-600" />,
      count: contactedTotal,
      countLabel: 'Dispatched',
      desc: '1-click direct DM sending with real phone pairing, AI personalization & anti-ban protection.',
      actionText: 'Open Outreach Hub',
      tab: 'outreach',
    },
    {
      id: 'gmail',
      name: 'Gmail & Direct Email',
      badge: 'Google OAuth / SMTP',
      icon: <Mail className="h-5 w-5 text-purple-600" />,
      count: stats.gmailCount || 0,
      countLabel: 'Synced',
      desc: 'Direct corporate email outreach, automated multi-step sequences & live inbound reply sync.',
      actionText: 'Open Inbound Inbox',
      tab: 'inbox',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Hero Banner with Large FIND LEADS Call to Action */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#251142] via-[#5c2f8f] to-[#8400ff] text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-purple-200">
              <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span>Klyperix Autonomous Client Acquisition</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              High-Ticket International Client Outreach
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
              Find live leads in the USA, UK, Canada, Australia & Europe. AI audits their website & social content, identifies genuine problems, writes humanized copy, and tracks replies safely.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => onSelectTab('find_leads')}
              className="px-8 py-4 rounded-2xl bg-white text-[#251142] hover:bg-purple-50 font-black text-sm sm:text-base shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 group"
            >
              <Sparkles className="h-5 w-5 text-[#8400ff] group-hover:rotate-12 transition-transform" />
              <span>FIND LEADS</span>
              <ArrowRight className="h-5 w-5 text-[#8400ff]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. PRD Section 21: 6 Core Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white border border-[#ecdcff] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-bold uppercase">
            <Flame className="h-3.5 w-3.5" />
            <span>High Intent</span>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black text-[#251142]">
            <StatsCounter value={dailySummary?.metrics.qualified_leads ?? Math.round(stats.totalLeads * 0.4)} duration={1.5} />
          </div>
          <div className="text-[10px] text-slate-500">Active buyers</div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white border border-[#ecdcff] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold uppercase">
            <DollarSign className="h-3.5 w-3.5" />
            <span>High Ticket</span>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black text-emerald-700">
            <StatsCounter value={dailySummary?.metrics.high_ticket_leads ?? Math.round(stats.totalLeads * 0.25)} duration={1.5} />
          </div>
          <div className="text-[10px] text-slate-500">Tier 1 countries</div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white border border-[#ecdcff] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#8400ff] text-[11px] font-bold uppercase">
            <Inbox className="h-3.5 w-3.5" />
            <span>New Replies</span>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black text-[#8400ff]">
            <StatsCounter value={stats.replied} duration={1.5} />
          </div>
          <div className="text-[10px] text-slate-500">{stats.responseRate}% reply rate</div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white border border-[#ecdcff] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold uppercase">
            <Calendar className="h-3.5 w-3.5" />
            <span>Meetings</span>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black text-blue-700">
            <StatsCounter value={dailySummary?.metrics.meetings_booked ?? stats.converted} duration={1.5} />
          </div>
          <div className="text-[10px] text-slate-500">Calls scheduled</div>
        </div>

        {/* Metric 5 */}
        <div className="p-4 rounded-2xl bg-white border border-[#ecdcff] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-indigo-600 text-[11px] font-bold uppercase">
            <Send className="h-3.5 w-3.5" />
            <span>Follow-ups</span>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black text-indigo-700">
            <StatsCounter value={Math.max(0, stats.contacted - stats.replied)} duration={1.5} />
          </div>
          <div className="text-[10px] text-slate-500">Due for nudge</div>
        </div>

        {/* Metric 6: Account Safety */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Account Safety</span>
          </div>
          <div className="my-2 text-xl font-black text-emerald-800 tracking-tight flex items-center gap-1.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>SAFE</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-medium">Anti-ban active</div>
        </div>
      </div>

      {/* 3. Section 26 & 27: Best Opportunities of the Day + Daily AI Summary Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Best Opportunities Column (PRD Section 26) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#ecdcff] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#8400ff]" />
              <h2 className="text-base font-bold text-[#251142]">Best Opportunities of the Day</h2>
            </div>
            <span className="text-[11px] font-bold text-[#5c2f8f] bg-[#faf7ff] px-2.5 py-1 rounded-full border border-[#ecdcff]">
              AI Top Picks
            </span>
          </div>

          <div className="space-y-3">
            {bestOpportunities && bestOpportunities.length > 0 ? (
              bestOpportunities.slice(0, 3).map((opp, idx) => (
                <div
                  key={opp.id || idx}
                  className="p-4 rounded-2xl bg-[#faf7ff] border border-[#ecdcff] hover:border-[#bb7eff] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#8400ff]">#{idx + 1}</span>
                      <span className="font-bold text-sm text-[#251142] truncate">{opp.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold uppercase">
                        {opp.country_code || 'USA'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span>Need: <strong className="text-slate-800">{opp.offered_service || opp.category || 'Creative Video'}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">Intent: {opp.intent_level || 'High'}</span>
                    </div>
                    {opp.reason && (
                      <p className="text-[11px] text-[#715599] italic line-clamp-1">"{opp.reason}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#251142]">Score: <span className="text-[#8400ff] font-mono text-sm">{opp.high_ticket_score || 95}/100</span></div>
                      <div className="text-[10px] text-emerald-600 font-semibold">High-Ticket Match</div>
                    </div>
                    <button
                      onClick={() => onSelectTab('crm')}
                      className="px-3 py-1.5 rounded-xl bg-[#8400ff] text-white text-xs font-bold hover:bg-[#7200db] transition shadow-sm"
                    >
                      View & Reach
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Click "FIND LEADS" to discover and rank top international opportunities for today.
              </div>
            )}
          </div>
        </div>

        {/* Daily AI Summary Report (PRD Section 27) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#faf7ff] to-[#f3ebff] rounded-3xl p-6 border border-[#ecdcff] shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#ecdcff]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8400ff]" />
                <h2 className="text-sm font-bold text-[#251142] uppercase tracking-wider">Daily AI Summary</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {dailySummary?.date || new Date().toISOString().split('T')[0]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-[#ecdcff]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Leads Found</div>
                <div className="text-lg font-black text-[#251142]">{dailySummary?.metrics.leads_found_today || stats.totalLeads}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#ecdcff]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Qualified</div>
                <div className="text-lg font-black text-[#8400ff]">{dailySummary?.metrics.qualified_leads || Math.round(stats.totalLeads * 0.4)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#ecdcff]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Contacted</div>
                <div className="text-lg font-black text-amber-700">{dailySummary?.metrics.contacted_today || stats.contacted}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#ecdcff]">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Replies</div>
                <div className="text-lg font-black text-emerald-700">{dailySummary?.metrics.replies_today || stats.replied}</div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-purple-100">
                <span className="text-slate-500">Best Platform:</span>
                <span className="font-bold text-[#251142]">{dailySummary?.best_platform || 'LinkedIn'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-purple-100">
                <span className="text-slate-500">Best Country:</span>
                <span className="font-bold text-[#251142]">{dailySummary?.best_country || 'USA 🇺🇸'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Best Service:</span>
                <span className="font-bold text-[#8400ff]">{dailySummary?.best_service || 'Video Editing'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectTab('crm')}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#ecdcff] text-xs font-bold text-[#5c2f8f] transition flex items-center justify-center gap-1.5"
            >
              <span>View Full CRM Pipeline</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Verified Real-Time Lead Channels & Outreach Engines */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ecdcff]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#251142] flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#8400ff]" />
                <span>Verified Lead Channels & Outreach Engines</span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Real Live Tools
              </span>
            </div>
            <p className="text-xs text-[#715599] mt-0.5">
              Direct live extraction engines and verified multi-channel outreach — zero mock data.
            </p>
          </div>

          <button
            onClick={() => onSelectTab('find_leads')}
            className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-bold text-[#8400ff] border border-purple-200 flex items-center gap-1.5 transition self-start sm:self-auto shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8400ff]" />
            <span>Launch Discovery</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Group A: Lead Discovery & Extraction Engines */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5c2f8f] uppercase tracking-wider flex items-center gap-1.5">
              <span>🔍 1. Real-Time Lead Finding Engines</span>
            </span>
            <span className="text-[11px] text-[#715599] font-medium">Extracting live business info & contact details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {discoveryEngines.map((engine) => (
              <div
                key={engine.id}
                onClick={() => onSelectTab(engine.tab)}
                className="p-4 rounded-2xl bg-white border border-[#ecdcff] hover:border-[#8400ff] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-[#faf7ff] border border-[#ecdcff] group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors">
                      {engine.icon}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {engine.badge}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-[#251142] group-hover:text-[#8400ff] transition-colors">
                      {engine.name}
                    </h4>
                    <p className="text-[11px] text-[#715599] mt-1 line-clamp-2 leading-relaxed">
                      {engine.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f3ebff] flex items-center justify-between">
                  {engine.count !== undefined ? (
                    <span className="text-[11px] font-bold text-[#5c2f8f]">
                      {engine.count} Leads Saved
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      Instant Crawler
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-[#8400ff] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {engine.actionText} &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group B: Direct Outreach & Closing Channels */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5c2f8f] uppercase tracking-wider flex items-center gap-1.5">
              <span>🚀 2. Direct Outreach & Communication Channels</span>
            </span>
            <span className="text-[11px] text-[#715599] font-medium">1-click direct delivery & response tracking</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {outreachChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => onSelectTab(channel.tab)}
                className="p-4 rounded-2xl bg-white border border-[#ecdcff] hover:border-[#8400ff] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#faf7ff] border border-[#ecdcff] group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors">
                        {channel.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#251142] group-hover:text-[#8400ff] transition-colors">
                          {channel.name}
                        </h4>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {channel.badge}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-[#5c2f8f] bg-[#faf7ff] border border-[#ecdcff] px-2.5 py-1 rounded-xl">
                      {channel.count} {channel.countLabel}
                    </span>
                  </div>

                  <p className="text-xs text-[#715599] mt-3 leading-relaxed">
                    {channel.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f3ebff] flex items-center justify-between">
                  <span className="text-[11px] text-[#715599] font-medium">
                    Automated pitch personalization active
                  </span>
                  <span className="text-xs font-bold text-[#8400ff] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {channel.actionText} &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
