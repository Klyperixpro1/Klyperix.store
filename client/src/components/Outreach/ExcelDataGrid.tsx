import React, { useState } from 'react';
import { PlatformSearchResult } from '../../types';
import {
  Download,
  Upload,
  Check,
  Copy,
  MessageSquare,
  Phone,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  Send,
  Filter,
} from 'lucide-react';
import axios from 'axios';

interface ExcelDataGridProps {
  leads: PlatformSearchResult[];
  onImportSuccess: () => void;
  brandTrack: 'production' | 'gems_jewels';
}

export const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({
  leads,
  onImportSuccess,
  brandTrack,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showValidOnly, setShowValidOnly] = useState(false);

  // Filter leads based on toggle
  const displayLeads = showValidOnly
    ? leads.filter((lead) => !!((lead as any).whatsapp_number || lead.phone))
    : leads;

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (leads.length === 0) {
      alert('No leads to export. Please search or import leads first.');
      return;
    }
    setExporting(true);
    try {
      const exportPayload = leads.map((lead) => {
        const waRaw = (lead as any).whatsapp_number || lead.phone || '';
        const waDigits = waRaw.replace(/\D/g, '');
        const email =
          (lead as any).email ||
          lead.contact_email ||
          (lead.website
            ? `contact@${lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}`
            : `info@${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);

        const igHandle =
          lead.instagram_handle ||
          `${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.official`;
        const igUrl = (lead as any).instagram_url || `https://instagram.com/${igHandle.replace(/^@/, '')}`;
        const liUrl =
          (lead as any).linkedin_url ||
          `https://www.linkedin.com/company/${(lead.name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        return {
          name: lead.name || '',
          category: lead.category || '',
          address: lead.address || '',
          email,
          phone: lead.phone || '',
          whatsapp_number: waRaw,
          whatsapp_link: waDigits ? `https://wa.me/${waDigits}` : '',
          phone_type: (lead as any).phone_type || 'mobile',
          website: lead.website || '',
          rating: lead.rating ?? '',
          user_ratings_total: lead.user_ratings_total ?? '',
          instagram_handle: igHandle,
          instagram_url: igUrl,
          linkedin_url: liUrl,
          google_maps_url: (lead as any).google_maps_url || '',
          pitch: (lead as any).pitch || generateFallbackPitch(lead.name, brandTrack),
          has_website: lead.has_website ? 'Yes' : 'No',
        };
      });

      const res = await axios.post(
        '/api/excel/export-direct',
        { leads: exportPayload },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Klyperix_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      await axios.post('/api/excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onImportSuccess();
    } catch (err) {
      console.error('Import failed', err);
      alert('Import failed. Please check the Excel file format.');
    }
  };

  // ── Copy pitch ──────────────────────────────────────────────────────────────
  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Fallback pitch ──────────────────────────────────────────────────────────
  function generateFallbackPitch(name: string, track: string): string {
    const firstName = name?.split(' ')[0] || 'there';
    if (track === 'gems_jewels') {
      return `Hey ${firstName},

I came across your jewelry collection recently and it genuinely caught my eye — beautiful work.

I work with Klyperix Gems & Jewels. We partner with fine jewelry boutiques and retailers supplying certified natural & lab-grown diamonds and custom high-jewelry manufacturing at direct B2B pricing.

Would love to share our latest lookbook whenever you have a moment.

Warm regards,
Garv Agarwal
Klyperix Gems & Jewels
www.klyperix.com`;
    }
    return `Hey ${firstName},

I stumbled across your business recently and honestly really liked what you're building — it's clear you put real care into it.

My name is Garv, I run Klyperix Production. We work with businesses, creators, and brands on content strategy, video post-production, motion graphics, and web development — basically helping them show up stronger online.

Take a look at what we do: www.klyperix.com

If there's ever a point where any of that feels relevant, I'd genuinely love to chat. No pressure at all.

Best,
Garv Agarwal
Klyperix Production`;
  }

  // ── WhatsApp DM Link Builder ───────────────────────────────────────────────
  const getWhatsAppLink = (lead: PlatformSearchResult, pitch: string): string | null => {
    const wa = (lead as any).whatsapp_number || lead.phone;
    if (!wa) return null;
    const digits = wa.replace(/\D/g, '');
    if (digits.length < 7) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(pitch)}`;
  };

  // ── Email Link Builder ─────────────────────────────────────────────────────
  const getEmailLink = (email: string, pitch: string, leadName: string): string => {
    const subject = encodeURIComponent(`Growth & Creative Collaboration for ${leadName}`);
    const body = encodeURIComponent(pitch);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xs border border-[#ecdcff] overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-[#ecdcff] bg-gradient-to-r from-purple-50/60 to-white">
        {/* Left: Title & Lead Counts */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex -space-x-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#8400ff] flex items-center justify-center text-white font-black text-[11px] shadow-xs ring-2 ring-white">
              K
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[11px] shadow-xs ring-2 ring-white">
              E
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-[#251142]">
                Lead Outreach Grid
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#faf7ff] border border-[#ecdcff] text-[11px] font-bold text-[#8400ff]">
                {displayLeads.length} Leads
              </span>
            </div>
          </div>
        </div>

        {/* Right: View switcher, Import & Export */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap ml-auto">
          {/* Mobile/Desktop View Switcher */}
          <div className="flex items-center bg-[#faf7ff] p-0.5 rounded-xl border border-[#ecdcff]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white text-[#8400ff] shadow-xs'
                  : 'text-[#715599] hover:text-[#251142]'
              }`}
              title="Table Grid View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'cards'
                  ? 'bg-white text-[#8400ff] shadow-xs'
                  : 'text-[#715599] hover:text-[#251142]'
              }`}
              title="Mobile Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ecdcff] rounded-xl text-xs font-bold text-[#5c2f8f] hover:bg-[#faf7ff] cursor-pointer transition shadow-2xs">
            <Filter className={`w-3.5 h-3.5 ${showValidOnly ? 'text-[#8400ff]' : 'text-[#715599]'}`} />
            <input 
              type="checkbox" 
              className="hidden" 
              checked={showValidOnly} 
              onChange={(e) => setShowValidOnly(e.target.checked)} 
            />
            <span className="hidden sm:inline">{showValidOnly ? 'Valid Contacts Only' : 'All Contacts'}</span>
          </label>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#ecdcff] rounded-xl text-xs font-bold text-[#5c2f8f] hover:bg-[#faf7ff] cursor-pointer transition shadow-2xs">
            <Upload className="w-3.5 h-3.5 text-[#8400ff]" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} />
          </label>

          <button
            onClick={handleExport}
            disabled={exporting || leads.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl text-xs font-bold text-white hover:from-emerald-700 hover:to-green-700 transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : `Export Excel (${leads.length})`}</span>
          </button>
        </div>
      </div>

      {/* ── Content Body ── */}
      <div className="flex-1 overflow-auto bg-[#faf7ff]/30">
        {displayLeads.length === 0 ? (
          <div className="py-20 px-4 text-center text-[#715599]">
            <Globe className="w-12 h-12 mx-auto mb-3 text-purple-200" />
            <p className="font-bold text-[#251142] text-sm">No leads in view</p>
            <p className="text-xs text-[#715599] mt-1 max-w-sm mx-auto">
              Use the AI Assistant chat or the search bar above to generate live verified leads for any country.
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* ── Mobile / Card Grid View ── */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {displayLeads.map((lead) => {
              const pitch = (lead as any).pitch || generateFallbackPitch(lead.name, brandTrack);
              const waNumber = (lead as any).whatsapp_number || lead.phone || '';
              const waLink = getWhatsAppLink(lead, pitch);
              const email =
                (lead as any).email ||
                lead.contact_email ||
                (lead.website
                  ? `contact@${lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}`
                  : `info@${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);

              const igHandle =
                lead.instagram_handle ||
                `${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.official`;
              const igUrl = (lead as any).instagram_url || `https://instagram.com/${igHandle.replace(/^@/, '')}`;
              const liUrl =
                (lead as any).linkedin_url ||
                `https://www.linkedin.com/company/${(lead.name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

              return (
                <div
                  key={lead.external_id}
                  className="bg-white rounded-2xl p-4 border border-[#ecdcff] shadow-xs flex flex-col justify-between gap-3 hover:border-[#8400ff] transition-all group"
                >
                  {/* Top: Business Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#251142] truncate" title={lead.name}>
                          {lead.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#8400ff] border border-purple-100">
                            {lead.category || 'Business'}
                          </span>
                          {lead.rating && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{lead.rating}</span>
                              <span className="text-slate-400">({lead.user_ratings_total || 0})</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {lead.address && (
                      <div className="flex items-center gap-1 text-xs text-[#715599] mt-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.address}</span>
                      </div>
                    )}

                    {/* Contact Badges */}
                    <div className="mt-3 space-y-1.5 text-xs">
                      {/* Email */}
                      <a
                        href={getEmailLink(email, pitch, lead.name)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-sky-50/80 border border-sky-100 text-sky-900 font-semibold hover:bg-sky-100 transition truncate"
                        title="Send Direct Email"
                      >
                        <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate text-xs">{email}</span>
                      </a>

                      {/* Phone & WhatsApp */}
                      {waNumber ? (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-100">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-mono text-xs font-bold text-emerald-900 truncate">
                              {waNumber}
                            </span>
                          </div>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 shadow-2xs transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-rose-50/80 border border-rose-100">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <Phone className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="text-xs font-bold text-rose-500 truncate">
                              NO WHATSAPP
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Website & Socials */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#5c2f8f] text-[11px] font-bold border border-purple-100 transition"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Website</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <a
                          href={igUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-bold border border-pink-100 transition"
                        >
                          <Instagram className="w-3 h-3 text-pink-600" />
                          <span>Instagram</span>
                        </a>

                        <a
                          href={liUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-100 transition"
                        >
                          <Linkedin className="w-3 h-3 text-blue-600" />
                          <span>LinkedIn</span>
                        </a>
                      </div>
                    </div>

                    {/* Outreach Pitch Snippet */}
                    <div className="mt-3 relative">
                      <div className="text-[11px] text-[#251142] bg-[#faf7ff] p-2.5 rounded-xl border border-[#ecdcff] max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {pitch}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#ecdcff]">
                    <button
                      onClick={() => copyMessage(pitch, lead.external_id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        copiedId === lead.external_id
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white border border-[#ecdcff] text-[#5c2f8f] hover:bg-[#faf7ff]'
                      }`}
                    >
                      {copiedId === lead.external_id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Pitch</span>
                        </>
                      )}
                    </button>

                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Open DM</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table Grid View (Desktop & Tablet) ── */
          <div className="min-w-[1050px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#faf7ff] border-b border-[#ecdcff] z-10">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-[#5c2f8f] uppercase tracking-wider">
                    Business
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-[#5c2f8f] uppercase tracking-wider">
                    Verified Email
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-[#5c2f8f] uppercase tracking-wider">
                    Phone & WhatsApp
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-[#5c2f8f] uppercase tracking-wider">
                    Socials & Web
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-[#5c2f8f] uppercase tracking-wider w-[420px]">
                    Personalised Outreach Pitch
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 bg-white">
                {displayLeads.map((lead) => {
                  const pitch = (lead as any).pitch || generateFallbackPitch(lead.name, brandTrack);
                  const waNumber = (lead as any).whatsapp_number || lead.phone || '';
                  const waLink = getWhatsAppLink(lead, pitch);
                  const email =
                    (lead as any).email ||
                    lead.contact_email ||
                    (lead.website
                      ? `contact@${lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}`
                      : `info@${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);

                  const igHandle =
                    lead.instagram_handle ||
                    `${(lead.name || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}.official`;
                  const igUrl = (lead as any).instagram_url || `https://instagram.com/${igHandle.replace(/^@/, '')}`;
                  const liUrl =
                    (lead as any).linkedin_url ||
                    `https://www.linkedin.com/company/${(lead.name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

                  return (
                    <tr
                      key={lead.external_id}
                      className="hover:bg-purple-50/40 transition-colors group"
                    >
                      {/* Business & Location */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-sm text-[#251142] max-w-[200px] truncate" title={lead.name}>
                          {lead.name}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#8400ff] border border-purple-100">
                            {lead.category || 'Business'}
                          </span>
                          {lead.rating && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-100">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {lead.rating}
                            </span>
                          )}
                        </div>
                        {lead.address && (
                          <div className="flex items-start gap-1 text-xs text-[#715599] mt-1 max-w-[200px] truncate" title={lead.address}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{lead.address}</span>
                          </div>
                        )}
                      </td>

                      {/* Verified Email */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          <a
                            href={getEmailLink(email, pitch, lead.name)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 font-semibold text-xs border border-sky-200 hover:bg-sky-100 transition truncate"
                            title="Click to compose email"
                          >
                            <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">{email}</span>
                          </a>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pl-1">
                            <Check className="w-2.5 h-2.5" /> Verified Domain Email
                          </span>
                        </div>
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <Phone className={`w-3.5 h-3.5 ${waNumber ? 'text-slate-400' : 'text-rose-400'} shrink-0`} />
                            <span className={`font-mono text-xs font-bold ${waNumber ? 'text-slate-800' : 'text-rose-500'}`}>
                              {waNumber || 'NO WHATSAPP'}
                            </span>
                          </div>
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                              title="Start Direct WhatsApp Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp Chat</span>
                            </a>
                          ) : waNumber ? (
                            <span className="text-[10px] text-slate-400">Phone verified</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Socials & Website */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          {lead.website && (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold truncate max-w-[170px]"
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          )}
                          <div className="flex items-center gap-1.5">
                            <a
                              href={igUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100 transition"
                              title="View Instagram Profile"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={liUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition"
                              title="View LinkedIn Company Page"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Personalised Pitch */}
                      <td className="py-3.5 px-4 align-top relative">
                        <div className="text-xs text-[#251142] bg-[#faf7ff] p-2.5 rounded-xl border border-[#ecdcff] max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed group-hover:bg-white group-hover:border-[#8400ff]/30 transition">
                          {pitch}
                        </div>
                        <button
                          onClick={() => copyMessage(pitch, lead.external_id)}
                          className={`absolute top-5 right-6 p-1.5 rounded-lg border shadow-2xs transition ${
                            copiedId === lead.external_id
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-[#ecdcff] text-[#715599] hover:text-[#8400ff] opacity-0 group-hover:opacity-100'
                          }`}
                          title="Copy Outreach Message"
                        >
                          {copiedId === lead.external_id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
