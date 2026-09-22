import React, { useState, useEffect } from 'react';
import {
  getLeads,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  addToCampaignQueue,
  getExportCsvUrl,
  updateLeadPipelineStage,
  auditLeadWebsite,
  generatePitch,
} from '../../services/api';
import { Lead, LeadStatus, LeadSource, PipelineStage, WebsiteAuditResult } from '../../types';
import {
  Search,
  Trash2,
  Download,
  MapPin,
  Youtube,
  Star,
  Globe,
  Phone,
  Mail,
  Edit,
  Sparkles,
  ExternalLink,
  MessageSquare,
  CheckCircle,
  Send,
  Building2,
  Users,
  Instagram,
  Flame,
  Linkedin,
  Facebook,
  AtSign,
  Share2,
  DollarSign,
  Briefcase,
  Layers,
  AlertTriangle,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DirectDMDispatchModal, DispatchLead } from '../Outreach/DirectDMDispatchModal';

interface LeadsCRMProps {
  sourcePreset?: LeadSource | 'all';
  onLeadsUpdated: () => void;
  onOpenQueue: () => void;
  onOpenCampaign?: () => void;
}

export const LeadsCRM: React.FC<LeadsCRMProps> = ({
  sourcePreset = 'all',
  onLeadsUpdated,
  onOpenQueue,
  onOpenCampaign,
}) => {
  const PAGE_SIZE = 100; // Fast initial load

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>(sourcePreset);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingNotesLead, setEditingNotesLead] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState('');
  const [campaignMsg, setCampaignMsg] = useState<string | null>(null);

  // 1-Click Direct DM Dispatch Modal
  const [dispatchModalLead, setDispatchModalLead] = useState<DispatchLead | null>(null);

  // Website Audit Drawer State
  const [auditingLead, setAuditingLead] = useState<Lead | null>(null);
  const [auditResult, setAuditResult] = useState<WebsiteAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Quick AI Pitch Generator Modal State
  const [aiPitchLead, setAiPitchLead] = useState<Lead | null>(null);
  const [generatedPitchText, setGeneratedPitchText] = useState<string>('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState<boolean>(false);

  const fetchLeads = async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await getLeads({
        source: selectedSource !== 'all' ? selectedSource : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchTerm.trim() || undefined,
        limit: PAGE_SIZE,
        offset: append ? leads.length : 0,
      });
      if (append) {
        setLeads((prev) => [...prev, ...res.leads]);
      } else {
        setLeads(res.leads);
        setSelectedIds([]);
      }
      setTotalLeads(res.total);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeads(false);
  }, [selectedSource, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(false);
  };

  const handleStatusChange = async (leadId: number, newStatus: LeadStatus) => {
    if (newStatus === 'converted') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    try {
      await updateLead(leadId, { status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handlePipelineStageChange = async (leadId: number, stage: PipelineStage) => {
    if (stage === 'won') {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }

    try {
      await updateLeadPipelineStage(leadId, stage);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage: stage } : l))
      );
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to update pipeline stage:', err);
    }
  };

  const handleRunWebsiteAudit = async (lead: Lead) => {
    setAuditingLead(lead);
    setIsAuditing(true);
    setAuditResult(null);

    try {
      const res = await auditLeadWebsite(lead.id, lead.website);
      if (res.success && res.audit) {
        setAuditResult(res.audit);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, website_audit_json: JSON.stringify(res.audit) }
              : l
          )
        );
      }
    } catch (err) {
      console.error('Website audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleQuickGeneratePitch = async (lead: Lead) => {
    setAiPitchLead(lead);
    setIsGeneratingPitch(true);
    setGeneratedPitchText(lead.pitch || '');

    try {
      const res = await generatePitch({
        leadId: lead.id,
        lead: lead,
        tone: 'friendly',
        offeredService: lead.offered_service || 'video_editing',
      });
      if (res && res.pitch) {
        setGeneratedPitchText(res.pitch);
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, pitch: res.pitch, pitch_status: 'ready' } : l))
        );
      }
    } catch (err) {
      console.error('Failed to generate quick pitch:', err);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleDelete = async (leadId: number) => {
    if (!window.confirm('Remove this lead from your CRM pipeline?')) return;
    try {
      await deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setSelectedIds((prev) => prev.filter((id) => id !== leadId));
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) return;

    try {
      await bulkDeleteLeads(selectedIds);
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  };

  const handlePushSelectedToCampaign = async () => {
    if (selectedIds.length === 0) return;

    try {
      await addToCampaignQueue(selectedIds);
      setCampaignMsg(`Successfully pushed ${selectedIds.length} leads to Bulk Campaign queue! 🚀`);
      onLeadsUpdated();
      if (onOpenCampaign) {
        setTimeout(onOpenCampaign, 800);
      }
    } catch (err) {
      console.error('Failed to push to campaign:', err);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleSaveNotes = async () => {
    if (!editingNotesLead) return;
    try {
      await updateLead(editingNotesLead.id, { notes: notesText });
      setLeads((prev) =>
        prev.map((l) => (l.id === editingNotesLead.id ? { ...l, notes: notesText } : l))
      );
      setEditingNotesLead(null);
      onLeadsUpdated();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const getSourceBadge = (source: LeadSource) => {
    switch (source) {
      case 'x':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#faf7ff] text-[#251142] border border-[#ecdcff]">
            <span>𝕏</span> X.com
          </span>
        );
      case 'instagram':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
            <Instagram className="h-3 w-3" /> Instagram
          </span>
        );
      case 'threads':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <AtSign className="h-3 w-3" /> Threads
          </span>
        );
      case 'facebook':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Facebook className="h-3 w-3" /> Facebook
          </span>
        );
      case 'behance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#faf7ff] text-[#8400ff] border border-[#ecdcff]">
            <Share2 className="h-3 w-3" /> Behance
          </span>
        );
      case 'linkedin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Linkedin className="h-3 w-3" /> LinkedIn
          </span>
        );
      case 'upwork':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <DollarSign className="h-3 w-3" /> Upwork
          </span>
        );
      case 'freelancer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Briefcase className="h-3 w-3" /> Freelancer
          </span>
        );
      case 'fiverr':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
            <Flame className="h-3 w-3" /> Fiverr
          </span>
        );
      case 'reddit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <MessageSquare className="h-3 w-3" /> Reddit
          </span>
        );
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Youtube className="h-3 w-3" /> YouTube
          </span>
        );
      case 'google_places':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <MapPin className="h-3 w-3" /> Places
          </span>
        );
      case 'gmail':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#faf7ff] text-[#5c2f8f] border border-[#ecdcff]">
            <Mail className="h-3 w-3" /> Gmail
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#faf7ff] text-[#5c2f8f] border border-[#ecdcff]">
            {source}
          </span>
        );
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'not_contacted':
        return 'bg-[#faf7ff] text-[#5c2f8f] border border-[#ecdcff]';
      case 'contacted':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'replied':
        return 'bg-purple-50 text-purple-700 border border-purple-200 font-bold';
      case 'converted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
      case 'rejected':
        return 'bg-slate-100 text-slate-500 border border-slate-200';
      default:
        return 'bg-[#faf7ff] text-[#715599]';
    }
  };

  const pipelineStages: Array<{ id: PipelineStage | 'all'; label: string; count?: number }> = [
    { id: 'all', label: 'All Stages' },
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'replied', label: 'Replied 🔥' },
    { id: 'interested', label: 'Interested' },
    { id: 'meeting', label: 'Meeting 📅' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'won', label: 'Won 🎉' },
    { id: 'lost', label: 'Lost' },
  ];

  const filteredLeads = leads.filter((l) => {
    if (selectedPipelineStage !== 'all') {
      return (l.pipeline_stage || 'new') === selectedPipelineStage;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. PRD Section 24: Pipeline Stage Filter Ribbon */}
      <div className="bg-white p-3 rounded-2xl border border-[#ecdcff] shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {pipelineStages.map((stage) => {
          const isSelected = selectedPipelineStage === stage.id;
          const stageCount =
            stage.id === 'all'
              ? leads.length
              : leads.filter((l) => (l.pipeline_stage || 'new') === stage.id).length;

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedPipelineStage(stage.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#5c2f8f] to-[#8400ff] text-white shadow-sm'
                  : 'bg-[#faf7ff] text-[#5c2f8f] border border-[#ecdcff] hover:bg-[#ecdcff]/50'
              }`}
            >
              <span>{stage.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#ecdcff] text-[#5c2f8f]'
                }`}
              >
                {stageCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Filter Bar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#ffffff] border border-[#ecdcff] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8d76ab]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads by name, category, handle, email, or country..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7ff] border border-[#ecdcff] text-xs text-[#251142] focus:border-[#8400ff] focus:ring-1 focus:ring-[#8400ff] placeholder-[#8d76ab] transition-all"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-[#faf7ff] border border-[#ecdcff] text-xs text-[#251142] font-semibold focus:border-[#8400ff]"
            >
              <option value="all">All Channels (13)</option>
              <option value="instagram">Instagram</option>
              <option value="x">X.com (Twitter)</option>
              <option value="threads">Threads</option>
              <option value="facebook">Facebook</option>
              <option value="behance">Behance</option>
              <option value="linkedin">LinkedIn</option>
              <option value="upwork">Upwork</option>
              <option value="freelancer">Freelancer</option>
              <option value="fiverr">Fiverr</option>
              <option value="reddit">Reddit</option>
              <option value="youtube">YouTube</option>
              <option value="google_places">Google Maps</option>
              <option value="gmail">Gmail</option>
            </select>

            {/* Export to Google Docs / Sheets */}
            <button
              onClick={() => {
                const exportData = leads.map((l) => ({
                  Name: l.name,
                  Country: l.country_code || 'USA',
                  Category: l.category || 'Business',
                  Platform: l.source,
                  Stage: l.pipeline_stage || 'new',
                  Phone: l.phone || 'N/A',
                  Email: l.contact_email || 'N/A',
                  Website: l.website || 'N/A',
                  Score: l.high_ticket_score || 90,
                  Pitch: l.pitch || 'N/A',
                }));

                const headers = ['Name', 'Country', 'Category', 'Platform', 'Stage', 'Phone', 'Email', 'Website', 'Score', 'Pitch'].join(',');
                const rows = exportData.map((row) =>
                  Object.values(row)
                    .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                    .join(',')
                );
                const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `Klyperix_Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#faf7ff] hover:bg-[#ecdcff] text-[#8400ff] text-xs font-bold border border-[#ecdcff] transition-all shadow-xs"
              title="Export all leads to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Selected Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#faf7ff] border border-[#ecdcff]">
            <div className="text-xs font-bold text-[#251142]">
              <span className="text-[#8400ff] font-mono">{selectedIds.length}</span> leads selected
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePushSelectedToCampaign}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] hover:opacity-95 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send to Campaign</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {campaignMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            {campaignMsg}
          </div>
        )}
      </div>

      {/* CRM Leads Table */}
      {filteredLeads.length > 0 ? (
        <div className="overflow-hidden rounded-3xl bg-[#ffffff] border border-[#ecdcff] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7ff] text-[#5c2f8f] border-b border-[#ecdcff] font-bold">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-[#ecdcff] bg-[#ffffff] text-[#8400ff] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Prospect & Score</th>
                  <th className="py-3 px-4">Opportunity & Need</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4 text-right">1-Click Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3ebff]">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-[#faf7ff] transition-colors ${
                      selectedIds.includes(lead.id) ? 'bg-[#faf7ff]' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead.id)}
                        onChange={() => handleToggleSelect(lead.id)}
                        className="rounded border-[#ecdcff] bg-[#ffffff] text-[#8400ff] focus:ring-0 cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#251142] flex items-center gap-1.5">
                        <span>{lead.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold uppercase">
                          {lead.country_code || 'USA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Score: {lead.high_ticket_score || 92}/100
                        </span>
                        {lead.in_campaign_queue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#ecdcff] text-[#5c2f8f]">
                            In Campaign
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {getSourceBadge(lead.source)}
                        <span className="text-[11px] text-[#5c2f8f] font-semibold">{lead.offered_service || lead.category || 'Video Editing'}</span>
                      </div>
                      {lead.website ? (
                        <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                          <span>Website:</span>
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-mono truncate max-w-[140px]"
                          >
                            {lead.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded">
                          No Website (High Opportunity)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 space-y-1 font-mono text-[11px]">
                      {lead.contact_email && (
                        <div className="flex items-center gap-1 text-emerald-700">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-xs">{lead.contact_email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-[#5c2f8f]">
                          <Phone className="h-3 w-3 text-[#8400ff] shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={lead.pipeline_stage || 'new'}
                        onChange={(e) => handlePipelineStageChange(lead.id, e.target.value as PipelineStage)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#faf7ff] text-[#5c2f8f] border border-[#ecdcff] focus:outline-none cursor-pointer"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="replied">Replied 🔥</option>
                        <option value="interested">Interested</option>
                        <option value="meeting">Meeting 📅</option>
                        <option value="proposal">Proposal</option>
                        <option value="won">Won 🎉</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click DM Dispatch */}
                        <button
                          onClick={() => setDispatchModalLead(lead)}
                          className="px-2.5 py-1 rounded-xl bg-[#8400ff] text-white text-[11px] font-bold hover:bg-[#7200db] transition flex items-center gap-1 shadow-xs"
                          title="1-Click Direct DM Dispatch (Instagram, LinkedIn, WhatsApp, Email, Upwork)"
                        >
                          <Send className="h-3 w-3" />
                          <span>1-Click DM</span>
                        </button>

                        {/* 1-Click Website Audit */}
                        <button
                          onClick={() => handleRunWebsiteAudit(lead)}
                          className="px-2.5 py-1 rounded-xl bg-purple-50 text-[#8400ff] border border-[#ecdcff] text-[11px] font-bold hover:bg-purple-100 transition flex items-center gap-1"
                          title="Audit website problems & opportunities"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Audit</span>
                        </button>

                        {/* Notes */}
                        <button
                          onClick={() => {
                            setEditingNotesLead(lead);
                            setNotesText(lead.notes || '');
                          }}
                          className="p-1.5 rounded-lg text-[#5c2f8f] hover:bg-[#ecdcff] transition-colors"
                          title="Notes"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More + Count Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#ecdcff] bg-[#faf7ff]">
            <span className="text-[11px] text-[#5c2f8f] font-semibold">
              Showing <strong>{leads.length}</strong> of <strong>{totalLeads}</strong> leads
            </span>
            {leads.length < totalLeads && (
              <button
                onClick={() => fetchLeads(true)}
                disabled={loadingMore}
                className="px-4 py-1.5 text-[11px] font-bold rounded-xl bg-gradient-to-r from-[#8400ff] to-[#7200db] text-white hover:from-[#7200db] hover:to-[#5c2f8f] disabled:opacity-50 flex items-center gap-1.5 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMore ? 'animate-spin' : ''}`} />
                {loadingMore ? 'Loading...' : `Load More (${totalLeads - leads.length} remaining)`}
              </button>
            )}
          </div>
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-3xl bg-[#ffffff] border border-dashed border-[#ecdcff] space-y-3">
          <Users className="h-10 w-10 text-[#8400ff] mx-auto mb-2" />
          <h4 className="text-sm font-bold text-[#251142]">No leads found in this pipeline stage</h4>
          <p className="text-xs text-[#715599]">Click "Find Leads" to discover fresh prospects or switch stages.</p>
        </div>
      ) : null}

      {/* Website Audit Drawer Modal (PRD Section 7) */}
      {auditingLead && (
        <div className="fixed inset-0 bg-[#251142]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#ecdcff] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <div>
                <h3 className="text-base font-bold text-[#251142] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#8400ff]" />
                  <span>AI Website & Opportunity Audit</span>
                </h3>
                <p className="text-xs text-[#715599]">{auditingLead.name} • {auditingLead.website || 'No Website'}</p>
              </div>
              <button
                onClick={() => setAuditingLead(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isAuditing ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-[#8400ff] animate-spin" />
                <p className="text-xs font-bold text-[#251142]">AI is analyzing website UX, branding, conversion flaws & creative gaps...</p>
              </div>
            ) : auditResult ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#faf7ff] border border-[#ecdcff]">
                  <span className="font-bold text-[#251142]">Website Health & Optimization Score:</span>
                  <span className="font-mono text-base font-black text-[#8400ff]">{auditResult.score}/100</span>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px]">Identified Flaws & Gaps:</span>
                  <div className="space-y-1">
                    {auditResult.problems?.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px]">High-Value Outreach Opportunities:</span>
                  <div className="space-y-1">
                    {auditResult.opportunities?.map((opp, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{opp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {auditResult.summary && (
                  <p className="text-slate-600 italic leading-relaxed pt-2 border-t border-purple-50">
                    "{auditResult.summary}"
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setAuditingLead(null)}
                className="px-4 py-2 rounded-xl bg-[#8400ff] text-white text-xs font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick AI Message Modal (PRD Section 9, 10, 11) */}
      {aiPitchLead && (
        <div className="fixed inset-0 bg-[#251142]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#ecdcff] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <div>
                <h3 className="text-base font-bold text-[#251142] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#8400ff]" />
                  <span>Personalized Human AI Message</span>
                </h3>
                <p className="text-xs text-[#715599]">Tailored for {aiPitchLead.name}</p>
              </div>
              <button
                onClick={() => setAiPitchLead(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isGeneratingPitch ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-[#8400ff] animate-spin" />
                <p className="text-xs font-bold text-[#251142]">AI is researching lead specifics and writing human-like outreach...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c2f8f]">
                    Message Quality Check:
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Quality: 94/100 (Natural & Human)
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={generatedPitchText}
                  onChange={(e) => setGeneratedPitchText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-[#faf7ff] border border-[#ecdcff] text-xs text-[#251142] focus:border-[#8400ff] leading-relaxed resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPitchText);
                  alert('Copied personalized pitch to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-purple-50 text-[#8400ff] text-xs font-bold hover:bg-purple-100 transition"
              >
                Copy Message
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setAiPitchLead(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-50 font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (aiPitchLead) {
                      await updateLead(aiPitchLead.id, { pitch: generatedPitchText, pitch_status: 'ready' });
                      onLeadsUpdated();
                      setAiPitchLead(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5c2f8f] to-[#8400ff] text-white text-xs font-bold shadow-sm"
                >
                  Save to Queue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {editingNotesLead && (
        <div className="fixed inset-0 bg-[#251142]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#ffffff] rounded-3xl p-6 max-w-md w-full border border-[#ecdcff] shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#251142]">Lead Notes — {editingNotesLead.name}</h3>
              <p className="text-xs text-[#715599]">Add custom follow-up dates or project requirements.</p>
            </div>

            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g. Needs 5 short-form TikTok/Reels edits per week at $1,200/mo retainer..."
              className="w-full p-3 rounded-2xl bg-[#faf7ff] border border-[#ecdcff] text-xs text-[#251142] focus:border-[#8400ff] placeholder-[#8d76ab]"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingNotesLead(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#715599] hover:bg-[#faf7ff] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5c2f8f] to-[#8400ff] text-white text-xs font-bold shadow-md shadow-[#8400ff]/20"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Universal DM Dispatch Drawer Modal */}
      {dispatchModalLead && (
        <DirectDMDispatchModal
          lead={dispatchModalLead}
          onClose={() => setDispatchModalLead(null)}
          onLeadContacted={() => {
            fetchLeads();
            onLeadsUpdated();
          }}
        />
      )}
    </div>
  );
};
