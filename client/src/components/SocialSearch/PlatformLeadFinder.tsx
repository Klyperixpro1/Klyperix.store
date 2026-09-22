import React, { useState, useEffect } from 'react';
import {
  saveLeads,
  searchReddit,
  searchPlaces,
  searchYouTube,
  searchPlatformLeads,
  extractWebsiteContacts,
} from '../../services/api';
import { LeadSource, OfferedService, PlatformSearchResult, BrandTrack } from '../../types';
import {
  Search,
  Phone,
  Mail,
  CheckSquare,
  Square,
  BookmarkCheck,
  ExternalLink,
  MessageSquare,
  Youtube,
  MapPin,
  Sparkles,
  Award,
  Clock,
  Compass,
  Copy,
  Check,
  Linkedin,
  Instagram,
  Twitter,
  Facebook,
  AtSign,
  Palette,
  Briefcase,
  Zap,
  Flame,
  Globe,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WorldMapRadiusPicker } from '../PlacesSearch/WorldMapRadiusPicker';
import { DirectDMDispatchModal } from '../Outreach/DirectDMDispatchModal';
import { ExcelDataGrid } from '../Outreach/ExcelDataGrid';
import { AIAssistantChat } from '../Outreach/AIAssistantChat';

interface PlatformLeadFinderProps {
  initialPlatform?: LeadSource;
  brandTrack?: BrandTrack;
  onLeadsSaved: () => void;
  onOpenCampaign?: () => void;
}

const HIGH_INCOME_COUNTRIES = [
  { code: 'US', name: 'United States 🇺🇸' },
  { code: 'GB', name: 'United Kingdom 🇬🇧' },
  { code: 'CA', name: 'Canada 🇨🇦' },
  { code: 'AU', name: 'Australia 🇦🇺' },
  { code: 'AE', name: 'UAE (Dubai) 🇦🇪' },
  { code: 'DE', name: 'Germany 🇩🇪' },
  { code: 'FR', name: 'France 🇫🇷' },
  { code: 'NL', name: 'Netherlands 🇳🇱' },
  { code: 'CH', name: 'Switzerland 🇨🇭' },
  { code: 'SG', name: 'Singapore 🇸🇬' },
  { code: 'NZ', name: 'New Zealand 🇳🇿' },
  { code: 'IE', name: 'Ireland 🇮🇪' },
  { code: 'CUSTOM', name: '🌍 Custom Country...' },
];

export const PlatformLeadFinder: React.FC<PlatformLeadFinderProps> = ({
  initialPlatform = 'google_places',
  brandTrack = 'production',
  onLeadsSaved,
  onOpenCampaign,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [customCountryName, setCustomCountryName] = useState<string>('');
  const [activePlatform, setActivePlatform] = useState<LeadSource>(initialPlatform);
  const [query, setQuery] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [selectedService, setSelectedService] = useState<OfferedService>('video_editing');

  // Interactive Maps state
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat?: number; lng?: number; radiusKm?: number }>({
    lat: 40.7128,
    lng: -74.006,
    radiusKm: 10,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<PlatformSearchResult[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resultsAreMock, setResultsAreMock] = useState<boolean>(false);
  const [resultsNotice, setResultsNotice] = useState<string | null>(null);
  const [quickPitchLead, setQuickPitchLead] = useState<PlatformSearchResult | null>(null);
  const [pitchTone, setPitchTone] = useState<'friendly' | 'direct' | 'creative' | 'bold'>('friendly');
  const [pitchCopied, setPitchCopied] = useState<boolean>(false);
  const [extractingMap, setExtractingMap] = useState<Record<string, boolean>>({});

  const handleExtractContacts = async (lead: PlatformSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.website) return;
    setExtractingMap((prev) => ({ ...prev, [lead.external_id]: true }));
    try {
      const res = await extractWebsiteContacts(lead.website);
      if (res.success && res.contacts) {
        setResults((prev) =>
          prev.map((l) =>
            l.external_id === lead.external_id
              ? {
                  ...l,
                  contact_email: res.contacts.email || l.contact_email,
                  phone: res.contacts.phone || l.phone,
                  instagram_handle: res.contacts.instagramHandle || l.instagram_handle,
                }
              : l
          )
        );
      }
    } catch (err: any) {
      console.warn('Extraction notice:', err.message);
    } finally {
      setExtractingMap((prev) => ({ ...prev, [lead.external_id]: false }));
    }
  };

  useEffect(() => {
    if (brandTrack === 'gems_jewels') {
      setSelectedService('jewelry_wholesale_supply');
      if (activePlatform === 'google_places') {
        setQuery('Luxury Fine Jewelry Boutiques');
        setLocation('New York, NY');
      } else if (activePlatform === 'youtube') {
        setQuery('Luxury Diamond & Jewelry Reviews');
      } else if (activePlatform === 'reddit') {
        setQuery('hiring jewelry photographer or wholesale supplier');
      } else {
        setQuery('luxury fine jewelry boutique');
      }
    } else {
      setSelectedService('video_editing');
      if (activePlatform === 'google_places') {
        setQuery('MedSpa & Aesthetic Clinics');
        setLocation('Miami, FL');
      } else if (activePlatform === 'youtube') {
        setQuery('Real Estate Podcast');
      } else if (activePlatform === 'reddit') {
        setQuery('hiring video editor');
      } else {
        setQuery('hiring video editor');
      }
    }
  }, [activePlatform, brandTrack]);

  const handleSearch = async (
    e?: React.FormEvent,
    queryOverride?: string,
    platformOverride?: LeadSource,
    locationOverride?: string
  ) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    const platformToSearch = platformOverride || activePlatform;
    const queryToSearch = queryOverride !== undefined ? queryOverride : query;
    const locToSearch = locationOverride !== undefined ? locationOverride : location;

    try {
      let fetchedLeads: PlatformSearchResult[] = [];
      let isMockFlag = false;
      let noticeMsg: string | null = null;

      if (platformToSearch === 'all') {
        const [placesRes, ytRes, redditRes] = await Promise.allSettled([
          searchPlaces({
            category: queryToSearch || (brandTrack === 'gems_jewels' ? 'Luxury Fine Jewelry' : 'MedSpa Clinic'),
            location: locToSearch || 'United States',
            brandTrack,
            countryCode: selectedCountry,
            latitude: showInteractiveMap ? mapCoords.lat : undefined,
            longitude: showInteractiveMap ? mapCoords.lng : undefined,
            radius: mapCoords.radiusKm || 10,
          }),
          searchYouTube({
            keyword: queryToSearch || (brandTrack === 'gems_jewels' ? 'Luxury Jewelry' : 'Creators'),
            brandTrack,
            regionCode: selectedCountry,
          }),
          searchReddit({ queryKeyword: queryToSearch || 'hiring video editor' }),
        ]);

        const combined: any[] = [];
        if (placesRes.status === 'fulfilled') combined.push(...(placesRes.value?.leads || []).slice(0, 5));
        if (ytRes.status === 'fulfilled') combined.push(...(ytRes.value?.leads || []).slice(0, 5));
        if (redditRes.status === 'fulfilled') combined.push(...(redditRes.value?.leads || []).slice(0, 5));

        fetchedLeads = combined.map((l: any) => ({
          ...l,
          source: l.source || 'all',
          brand_track: brandTrack,
          country_code: selectedCountry,
        }));
      } else if (platformToSearch === 'google_places') {
        const data = await searchPlaces({
          category: queryToSearch || 'Business',
          location: locToSearch || 'United States',
          brandTrack,
          countryCode: selectedCountry,
          latitude: showInteractiveMap ? mapCoords.lat : undefined,
          longitude: showInteractiveMap ? mapCoords.lng : undefined,
          radius: mapCoords.radiusKm || 10,
        });
        fetchedLeads = (data?.leads || []).map((l: any) => ({
          ...l,
          source: l.source || platformToSearch,
          brand_track: brandTrack,
          country_code: selectedCountry,
        }));
        isMockFlag = Boolean(data?.isMock);
        noticeMsg = data?.message || null;
      } else if (platformToSearch === 'youtube') {
        const data = await searchYouTube({
          keyword: queryToSearch || 'Creators',
          brandTrack,
          regionCode: selectedCountry,
        });
        fetchedLeads = (data?.leads || []).map((l: any) => ({
          ...l,
          source: l.source || platformToSearch,
          brand_track: brandTrack,
          country_code: selectedCountry,
        }));
        isMockFlag = Boolean(data?.isMock);
        noticeMsg = data?.message || null;
      } else if (platformToSearch === 'reddit') {
        const data = await searchReddit({ queryKeyword: queryToSearch || 'hiring video editor' });
        fetchedLeads = (data?.leads || []).map((l: any) => ({
          ...l,
          source: l.source || platformToSearch,
          brand_track: brandTrack,
          country_code: selectedCountry,
        }));
        isMockFlag = Boolean(data?.isMock);
        noticeMsg = data?.message || null;
      } else {
        const data = await searchPlatformLeads(platformToSearch, {
          queryKeyword: queryToSearch,
          countryCode: selectedCountry,
          brandTrack,
        });
        fetchedLeads = (data?.leads || []).map((l: any) => ({
          ...l,
          source: l.source || platformToSearch,
          brand_track: brandTrack,
          country_code: selectedCountry,
        }));
        isMockFlag = Boolean(data?.isMock);
        noticeMsg = data?.isMock ? data?.message || null : null;
      }

      setResults(fetchedLeads);
      setResultsAreMock(isMockFlag);
      setResultsNotice(noticeMsg);

      // Auto-select uncontacted leads
      const initialMap: Record<string, boolean> = {};
      fetchedLeads.forEach((l) => {
        if (!l.already_contacted) {
          initialMap[l.external_id] = true;
        }
      });
      setSelectedMap(initialMap);
    } catch (err: any) {
      console.error('Search failed:', err);
      setErrorMsg(err.message || 'Discovery search failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (extId: string) => {
    setSelectedMap((prev) => ({ ...prev, [extId]: !prev[extId] }));
  };

  const toggleSelectAll = () => {
    const allSelected = results.every((r) => selectedMap[r.external_id]);
    const newMap: Record<string, boolean> = {};
    results.forEach((r) => {
      newMap[r.external_id] = !allSelected;
    });
    setSelectedMap(newMap);
  };

  const handleCopyText = (key: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveSelected = async (autoPitch: boolean = true) => {
    const selected = results.filter((r) => selectedMap[r.external_id]);
    if (selected.length === 0) {
      alert('Please select at least 1 lead to save.');
      return;
    }

    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const res = await saveLeads(selected, autoPitch, selectedService);
      setSaveSuccessMsg(
        resultsAreMock
          ? `Saved ${res.savedCount} sample leads into CRM. Verify contact details before outreach.`
          : `Saved ${res.savedCount} leads into CRM.`
      );
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      onLeadsSaved();
    } catch (err: any) {
      console.error('Failed to save leads:', err);
      setErrorMsg(err.message || 'Failed to save leads.');
    } finally {
      setSaving(false);
    }
  };

  const getDirectRedirectUrl = (lead: PlatformSearchResult) => {
    if (lead.profile_url && lead.profile_url.startsWith('http')) return lead.profile_url;
    if (lead.website && lead.website.startsWith('http')) return lead.website;
    if (lead.source === 'google_places' || lead.address) {
      return `https://maps.google.com/?q=${encodeURIComponent(lead.name + ' ' + (lead.address || ''))}`;
    }
    if (lead.contact_email) {
      return `mailto:${lead.contact_email}`;
    }
    return '#';
  };

  const KLYPERIX_SIGNATURE = 'klyperix.com | www.linkedin.com/in/klyperix-production-1a466940a';

  const getPitchTextForLead = (lead: PlatformSearchResult, tone: string) => {
    const firstName = lead.name.split(' ')[0] || lead.name;
    const isGems = brandTrack === 'gems_jewels';

    if (isGems) {
      if (tone === 'direct') {
        return `Hi ${firstName}, loved your collection at ${lead.name}. Klyperix Gems & Jewels manufactures certified GIA natural & lab diamond jewelry at direct wholesale pricing. Open to seeing our latest wholesale lookbook?`;
      }
      if (tone === 'bold') {
        return `Hi ${firstName}, elevate your boutique's margins. We supply fine certified diamonds & bespoke bridal manufacturing directly to luxury retailers. May I share our catalog?`;
      }
      return `Hi ${firstName}, hope you're having a great week. I came across ${lead.name} and love your fine pieces. We supply direct-from-source certified diamonds and bespoke craftsmanship. Would you be open to a quick look at our lookbook?`;
    }

    let body: string;
    if (tone === 'direct') {
      body = `Hi ${firstName}, loved the work at ${lead.name}. We provide video editing, motion graphics, and graphic design that drive measurable conversions. Open to seeing 2 quick samples tailored for you?`;
    } else if (tone === 'bold') {
      body = `Hi ${firstName}, let's scale ${lead.name}'s visual content. We produce scroll-stopping video edits, motion graphics, and graphic design with 24-48h turnaround. Mind if I share a sample reel?`;
    } else {
      body = `Hi ${firstName}, came across ${lead.name} and really liked what you're building! We handle video editing, motion graphics, graphic design, and website design & development for growing brands. Would you be open to seeing a quick concept we made for you?`;
    }
    return `${body}\n\n${KLYPERIX_SIGNATURE}`;
  };

  const selectedCount = results.filter((r) => selectedMap[r.external_id]).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 py-6">
      {/* Top Country Selector & All 13 Platform Chips */}
      <div className="bg-white p-4 rounded-2xl border border-[#ecdcff] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#251142] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8400ff]" />
            <span>Select Discovery Platform (real data sources only):</span>
          </span>

          {/* Country Selector & Interactive Map Button */}
          <div className="flex items-center gap-2">
            {activePlatform === 'google_places' && (
              <button
                onClick={() => setShowInteractiveMap(!showInteractiveMap)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition ${
                  showInteractiveMap
                    ? 'bg-[#8400ff] text-white border-[#8400ff]'
                    : 'bg-[#faf7ff] text-[#5c2f8f] border-[#ecdcff] hover:bg-[#ecdcff]/50'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{showInteractiveMap ? 'Hide Radius Map' : 'Interactive Map'}</span>
              </button>
            )}

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[#ecdcff] bg-[#faf7ff] text-[#251142] focus:outline-none"
            >
              {HIGH_INCOME_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-Time Live Discovery Platforms */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1">
          {[
            { id: 'all', name: '⚡ All Real Engines (Ek Sath)', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'google_places', name: 'Google Maps & Places (OSM / Places API)', icon: <MapPin className="w-3.5 h-3.5 text-blue-500" /> },
            { id: 'youtube', name: 'YouTube Creators (Data API v3)', icon: <Youtube className="w-3.5 h-3.5 text-red-600" /> },
            { id: 'reddit', name: 'Reddit Hiring Leads (Live API)', icon: <MessageSquare className="w-3.5 h-3.5 text-orange-500" /> },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id as LeadSource)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activePlatform === p.id
                  ? 'bg-[#8400ff] text-white shadow-xs'
                  : 'text-[#5c2f8f] bg-[#faf7ff] hover:bg-[#ecdcff]/50 border border-[#ecdcff]'
              }`}
            >
              {p.icon}
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map if enabled */}
      {showInteractiveMap && activePlatform === 'google_places' && (
        <div className="bg-white p-4 rounded-2xl border border-[#ecdcff] shadow-sm">
          <WorldMapRadiusPicker
            initialLat={mapCoords.lat}
            initialLng={mapCoords.lng}
            initialRadiusKm={mapCoords.radiusKm}
            onLocationSelect={(data) => {
              setMapCoords({ lat: data.lat, lng: data.lng, radiusKm: data.radiusKm });
              setLocation(data.locationName);
            }}
          />
        </div>
      )}

      {/* Real-Time Live Verification Engine Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#ecdcff] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-50">
          <span className="text-[11px] font-bold text-[#5c2f8f] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8400ff]" />
            <span>Real-Time Engine Status:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>100% Real Live Leads • Sub-Second Speed • Full Metro Area Coverage</span>
            </span>
          </div>
        </div>

        {/* Active Buying Intent Presets */}
        <div>
          <span className="text-[11px] font-bold text-[#5c2f8f] flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#8400ff]" />
            <span>High-Intent Buying Signals (Actively Looking for Services):</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {[
              { label: '🎬 "Looking for video editor"', query: 'looking for video editor' },
              { label: '🌐 "Need website redesign"', query: 'need someone to redesign website' },
              { label: '🎨 "Hiring graphic designer"', query: 'hiring graphic designer' },
              { label: '🖼️ "Need YouTube thumbnails"', query: 'need youtube thumbnails' },
              { label: '🚀 "Looking for content agency"', query: 'looking for content agency' },
            ].map((intent) => {
              const isMatch = query === intent.query;
              return (
                <button
                  key={intent.label}
                  type="button"
                  onClick={() => {
                    setQuery(intent.query);
                    handleSearch(undefined, intent.query);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-xl whitespace-nowrap transition border ${
                    isMatch
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {intent.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Niche Presets */}
        <div>
          <span className="text-[11px] font-bold text-[#5c2f8f] flex items-center gap-1.5 mb-1.5">
            <Award className="w-3 h-3 text-[#8400ff]" />
            <span>High-Ticket Professional Clients & Niches:</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {(brandTrack === 'gems_jewels'
              ? [
                  { label: '💎 Fine Jewelry Boutiques', query: 'Luxury Fine Jewelry Boutiques' },
                  { label: '💍 Bespoke Bridal Salons', query: 'Custom Bridal & Diamond Jewelry' },
                  { label: '👑 Luxury Watch Retailers', query: 'Luxury Watch & Diamond Retailers' },
                  { label: '🏢 Wholesale Diamond Traders', query: 'Wholesale Certified Diamond Suppliers' },
                  { label: '🪙 Gemstone Merchants', query: 'Precious Gemstone Dealers & Importers' },
                  { label: '🎨 Custom Jewelry Artisans', query: 'Custom Jewelry Designers & Goldsmiths' },
                ]
              : [
                  { label: '🎥 YouTubers & Content Studios', query: 'Video Production & Creator Studios' },
                  { label: '🎙️ Podcasters & Audio Shows', query: 'Podcast Production Studios' },
                  { label: '💼 Business Coaches & Consultants', query: 'Business Consulting & Executive Coaches' },
                  { label: '⚖️ Law Firms & Attorneys', query: 'Corporate Law Firm Attorneys' },
                  { label: '🏥 Plastic Surgeons & MedSpas', query: 'MedSpa & Aesthetic Dermatology Clinics' },
                  { label: '🦷 Cosmetic Dentistry', query: 'Cosmetic Dentistry & Implant Clinics' },
                  { label: '🏗️ Architects & Interior Design', query: 'Architects & Luxury Interior Designers' },
                  { label: '🏢 Luxury Real Estate Brokers', query: 'Luxury Real Estate Agencies' },
                  { label: '🏋️ Fitness Coaches & Gyms', query: 'Luxury Fitness & Personal Training' },
                  { label: '🚗 Luxury Auto Detailers', query: 'Luxury Auto Detailing & Dealerships' },
                  { label: '🎓 Online Course Creators', query: 'Online Course Creators & Academies' },
                  { label: '🚀 SaaS & Tech Founders', query: 'Tech Startups & SaaS Software' },
                  { label: '🍽️ Fine Dining & Lounges', query: 'Fine Dining Restaurants & Lounges' },
                  { label: '🛍️ DTC Brands', query: 'DTC E-Commerce Fashion Brands' },
                ]
            ).map((preset) => {
              const isMatch = query === preset.query;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setQuery(preset.query);
                    handleSearch(undefined, preset.query);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-xl whitespace-nowrap transition border ${
                    isMatch
                      ? 'bg-[#8400ff] text-white border-[#8400ff] shadow-xs'
                      : 'bg-[#faf7ff] text-[#5c2f8f] border-[#ecdcff] hover:bg-[#ecdcff]/60'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search Bar Form */}
      <form onSubmit={(e) => handleSearch(e)} className="bg-white p-4 rounded-2xl border border-[#ecdcff] shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search niche, business category, or keyword (e.g. Real Estate, MedSpa)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-[#ecdcff] bg-[#faf7ff] focus:bg-white text-[#251142]"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State, or Country (e.g. India, Delhi, California)..."
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border border-[#ecdcff] bg-[#faf7ff] focus:bg-white text-[#251142]"
            />
            {/* Quick Country Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-2">
              <span className="text-[10px] font-bold text-[#715599] shrink-0">Country:</span>
              {[
                { flag: '🇰🇼', label: 'Kuwait', loc: 'Kuwait City, Kuwait', code: 'KW' },
                { flag: '🇦🇪', label: 'UAE', loc: 'Dubai, UAE', code: 'AE' },
                { flag: '🇸🇦', label: 'Saudi', loc: 'Riyadh, Saudi Arabia', code: 'SA' },
                { flag: '🇶🇦', label: 'Qatar', loc: 'Doha, Qatar', code: 'QA' },
                { flag: '🇬🇧', label: 'UK', loc: 'London, UK', code: 'GB' },
                { flag: '🇺🇸', label: 'USA', loc: 'United States', code: 'US' },
                { flag: '🇨🇦', label: 'Canada', loc: 'Toronto, Canada', code: 'CA' },
                { flag: '🇮🇳', label: 'India', loc: 'India', code: 'IN' },
              ].map((reg) => {
                const isMatch = location.toLowerCase().includes(reg.loc.toLowerCase()) || (location.toLowerCase() === reg.label.toLowerCase()) || (selectedCountry === reg.code);
                return (
                  <button
                    key={reg.code}
                    type="button"
                    onClick={() => {
                      setLocation(reg.loc);
                      setSelectedCountry(reg.code);
                      handleSearch(undefined, undefined, undefined, reg.loc);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition border ${
                      isMatch
                        ? 'bg-[#8400ff] text-white border-[#8400ff] shadow-xs'
                        : 'bg-[#faf7ff] text-[#5c2f8f] border-[#ecdcff] hover:bg-[#ecdcff]'
                    }`}
                  >
                    {reg.flag} {reg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#715599] font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8400ff]" />
            <span>
              {brandTrack === 'gems_jewels'
                ? 'Targeting luxury fine jewelry salons, certified diamond wholesalers & boutique buyers'
                : 'Targeting high-ticket brands needing high-retention video editing & studio web design'}
            </span>
          </span>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-[#8400ff] hover:bg-[#7200db] rounded-xl flex items-center gap-2 shadow-xs transition"
          >
            <Search className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Searching...' : 'Find Leads'}
          </button>
        </div>
      </form>

      {/* Save Success Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{saveSuccessMsg}</span>
          {onOpenCampaign && (
            <button onClick={onOpenCampaign} className="underline font-black ml-4">
              Open Bulk Dispatch →
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {resultsAreMock && results.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
          ⚠️ Sample/demo data — {activePlatform} is not connected to a live data source, so these are placeholder profiles, not real scraped businesses. Verify every phone number and email address before sending any message. {resultsNotice}
        </div>
      )}

      {/* Results Header & Main Body */}
      {results.length > 0 || true ? (
        <div className="flex flex-col lg:flex-row gap-4 min-h-[600px] lg:h-[720px] pb-8">
          {/* Left Column: AI Assistant Chat */}
          <div className="w-full lg:w-1/3 flex flex-col h-[480px] lg:h-full">
            <AIAssistantChat 
              onLeadsFound={(leads) => {
                setResults(leads);
                // Also automatically select them all for saving
                const map: Record<string, boolean> = {};
                leads.forEach(l => { map[l.external_id] = true; });
                setSelectedMap(map);
              }} 
              selectedCountry={selectedCountry} 
            />
          </div>

          {/* Right Column: Excel CRM View */}
          <div className="w-full lg:w-2/3 flex flex-col min-h-[480px] lg:h-full">
            <ExcelDataGrid 
              leads={results} 
              onImportSuccess={() => handleSearch(undefined, query)} 
              brandTrack={brandTrack}
            />
            
            {/* Quick CRM Save Actions inside the Excel view wrapper */}
            {results.length > 0 && (
              <div className="mt-4 flex items-center justify-between p-3 bg-white border border-[#ecdcff] rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-xs font-bold text-[#5c2f8f] hover:text-[#251142]"
                  >
                    {results.every((r) => selectedMap[r.external_id]) ? (
                      <CheckSquare className="w-4 h-4 text-[#8400ff]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Select All</span>
                  </button>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs font-semibold text-[#5c2f8f]">
                    {selectedCount} selected for CRM
                  </span>
                </div>
                <button
                  onClick={() => handleSaveSelected(true)}
                  disabled={saving || selectedCount === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#8400ff] hover:bg-[#7200db] rounded-xl flex items-center gap-2 shadow-xs transition disabled:opacity-50"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  {saving ? 'Saving to CRM...' : `Save ${selectedCount} Leads to CRM`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 1-Click Universal DM Dispatch Drawer Modal */}
      {quickPitchLead && (
        <DirectDMDispatchModal
          lead={quickPitchLead}
          brandTrack={brandTrack}
          onClose={() => setQuickPitchLead(null)}
          onLeadContacted={() => {
            // Update local state if needed
            setResults((prev) =>
              prev.map((r) =>
                r.external_id === quickPitchLead.external_id ? { ...r, already_contacted: true } : r
              )
            );
          }}
        />
      )}
    </div>
  );
};
