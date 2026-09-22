import React, { useState, useEffect, useRef } from 'react';
import {
  getLeads,
  updateLead,
  batchGeneratePitches,
  generatePitch,
  removeFromCampaignQueue,
  clearCampaignQueue,
  getWhatsAppStatus,
  getWhatsAppAccounts,
  startWhatsAppBatchCampaign,
  getWhatsAppBatchStatus,
  stopWhatsAppBatchCampaign,
  sendDirectWhatsAppMessage,
  sendDirectEmailMessage,
  sendBatchEmailMessages,
  getEmailSendStatus,
} from '../../services/api';
import { Lead, OfferedService, PitchTone, WhatsAppStatusState, WhatsAppAccountState, BatchWhatsAppProgress } from '../../types';
import {
  Send,
  Sparkles,
  Mail,
  Copy,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Edit3,
  RefreshCw,
  Code,
  Video,
  Palette,
  TrendingUp,
  Bot,
  Zap,
  Globe,
  Instagram,
  Phone,
  Check,
  Flame,
  ArrowRight,
  ListFilter,
  Play,
  RotateCcw,
  MessageCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Square,
  AlertTriangle,
  X,
  FileText,
  Save,
  CheckSquare,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BulkCampaignProps {
  onCampaignUpdated: () => void;
}

export const BulkCampaign: React.FC<BulkCampaignProps> = ({ onCampaignUpdated }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<OfferedService>('video_editing');
  const [selectedTone, setSelectedTone] = useState<PitchTone>('friendly');
  const [customGuidance, setCustomGuidance] = useState('');
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Active Lead for the Right-Side Message Editor Drawer
  const [activeEditingLead, setActiveEditingLead] = useState<Lead | null>(null);
  const [editingPitchText, setEditingPitchText] = useState('');
  const [savingPitch, setSavingPitch] = useState(false);
  const [generatingSinglePitch, setGeneratingSinglePitch] = useState(false);
  const [sendingDirectWhatsApp, setSendingDirectWhatsApp] = useState(false);
  const [sendingDirectEmail, setSendingDirectEmail] = useState(false);
  const [batchEmailStarting, setBatchEmailStarting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // WhatsApp states & Anti-Ban batch engine (100s human cooldown enforced)
  const [waState, setWaState] = useState<WhatsAppStatusState | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sentToday: number; dailyLimit: number; limitReached: boolean } | null>(null);
  const [waAccounts, setWaAccounts] = useState<WhatsAppAccountState[]>([]);
  const [minDelay, setMinDelay] = useState<number>(100);
  const [maxDelay, setMaxDelay] = useState<number>(120);
  const [batchProgress, setBatchProgress] = useState<BatchWhatsAppProgress | null>(null);
  const [batchStarting, setBatchStarting] = useState(false);
  const pollingRef = useRef<any>(null);

  // Stepper mode state for 1-click sequential mailing
  const [stepperIndex, setStepperIndex] = useState<number | null>(null);

  const fetchCampaignLeads = async () => {
    setLoading(true);
    try {
      const res = await getLeads({ inCampaign: true, limit: 200 });
      setLeads(res.leads);

      if (selectedIds.length === 0 && res.leads.length > 0) {
        setSelectedIds(res.leads.map((l) => l.id));
      }

      try {
        const accounts = await getWhatsAppAccounts();
        if (Array.isArray(accounts)) {
          setWaAccounts(accounts);
        }
      } catch (e) {}

      const wa = await getWhatsAppStatus();
      setWaState(wa);

      try {
        const eStatus = await getEmailSendStatus();
        setEmailStatus(eStatus);
      } catch (e) {}

      const bStatus = await getWhatsAppBatchStatus();
      setBatchProgress(bStatus);
      if (bStatus.isRunning) {
        startBatchPolling();
      }
    } catch (err) {
      console.error('Failed to load campaign leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignLeads();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startBatchPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const bStatus = await getWhatsAppBatchStatus();
        setBatchProgress(bStatus);
        if (!bStatus.isRunning) {
          stopBatchPolling();
          fetchCampaignLeads();
          onCampaignUpdated();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
      } catch (err) {
        // ignore
      }
    }, 1000);
  };

  const stopBatchPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const getDefaultMessageForLead = (targetLead: Lead) => {
    const firstName = targetLead.name.split(' ')[0] || targetLead.name;
    const isPersonalName =
      firstName &&
      firstName.length < 20 &&
      !/clinic|agency|salon|boutique|studio|realtor|group|inc|llc|co|hospital|dental|law|cafe|spa\b/i.test(firstName);
    const greeting = isPersonalName ? `Hey ${firstName},` : 'Hey,';

    return `${greeting}

I’m Garv from Klyperix Production.

We work with businesses, creators, YouTubers & influencers on their content, branding, websites, and online growth.

Our services include business growth consulting, video editing, graphic design, motion graphics, and website design & development.

Take a look at our work:
Website: www.klyperix.com
Instagram: www.instagram.com/klyperix
LinkedIn: www.linkedin.com/in/klyperix

If you think we could be a good fit, I’d be happy to connect.

Regards,
Garv Agarwal
Klyperix Production`;
  };

  const handleOpenMessageDrawer = (lead: Lead) => {
    setActiveEditingLead(lead);
    setEditingPitchText(lead.pitch?.trim() || getDefaultMessageForLead(lead));
    setActionSuccessMsg(null);
  };

  const handleSaveMessage = async () => {
    if (!activeEditingLead) return;
    setSavingPitch(true);
    try {
      await updateLead(activeEditingLead.id, {
        pitch: editingPitchText.trim(),
        pitch_status: editingPitchText.trim() ? 'ready' : 'draft',
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeEditingLead.id
            ? { ...l, pitch: editingPitchText.trim(), pitch_status: editingPitchText.trim() ? 'ready' : 'draft' }
            : l
        )
      );
      setActiveEditingLead((prev) =>
        prev ? { ...prev, pitch: editingPitchText.trim(), pitch_status: editingPitchText.trim() ? 'ready' : 'draft' } : null
      );
      setActionSuccessMsg('Message saved successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to save pitch:', err);
    } finally {
      setSavingPitch(false);
    }
  };

  const handleGenerateSinglePitch = async () => {
    if (!activeEditingLead) return;
    setGeneratingSinglePitch(true);
    try {
      const res = await generatePitch({
        lead: activeEditingLead,
        offeredService: selectedService,
        tone: selectedTone,
        customInstructions: customGuidance.trim() || undefined,
      });

      setEditingPitchText(res.pitch);
      await updateLead(activeEditingLead.id, { pitch: res.pitch, pitch_status: 'ready' });

      setLeads((prev) =>
        prev.map((l) => (l.id === activeEditingLead.id ? { ...l, pitch: res.pitch, pitch_status: 'ready' } : l))
      );
      setActiveEditingLead((prev) => (prev ? { ...prev, pitch: res.pitch, pitch_status: 'ready' } : null));
      setActionSuccessMsg('✨ AI drafted new custom message!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to generate pitch:', err);
    } finally {
      setGeneratingSinglePitch(false);
    }
  };

  const handleSendDirectWhatsAppFromDrawer = async () => {
    if (!activeEditingLead || !activeEditingLead.phone || !editingPitchText.trim()) {
      setActionSuccessMsg('⚠️ Phone number and drafted message are required.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }

    setSendingDirectWhatsApp(true);
    try {
      const res = await sendDirectWhatsAppMessage({
        leadId: activeEditingLead.id,
        phone: activeEditingLead.phone,
        message: editingPitchText.trim(),
      });

      if (res.success) {
        const sentLeadId = activeEditingLead.id;
        setActionSuccessMsg(`✅ Message sent to ${activeEditingLead.name} & removed from Bulk Queue! 🚀`);
        setLeads((prev) => prev.filter((l) => l.id !== sentLeadId));
        setSelectedIds((prev) => prev.filter((i) => i !== sentLeadId));
        setActiveEditingLead(null);
        onCampaignUpdated();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'WhatsApp sending failed. Check Settings.'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to send message.'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setSendingDirectWhatsApp(false);
    }
  };

  const handleStartWhatsAppAntiBanBatch = async () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    const validLeads = targetLeads
      .filter((l) => Boolean(l.phone && l.pitch))
      .map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone!,
        message: l.pitch!,
      }));

    if (validLeads.length === 0) {
      alert('Selected leads must have a Phone number and a Message drafted. Please write/generate messages first!');
      return;
    }

    if (
      !window.confirm(
        `Start Anti-Ban WhatsApp Campaign for ${validLeads.length} leads with a ${minDelay}-${maxDelay}s human delay between each message?`
      )
    ) {
      return;
    }

    setBatchStarting(true);
    try {
      const res = await startWhatsAppBatchCampaign(validLeads, minDelay, maxDelay);
      if (res.success) {
        startBatchPolling();
      } else {
        alert(res.message || 'Failed to start campaign.');
      }
    } catch (err: any) {
      console.error('Failed to start WhatsApp campaign:', err);
      alert(err.response?.data?.message || err.message || 'Failed to start WhatsApp campaign.');
    } finally {
      setBatchStarting(false);
    }
  };

  const handleStopWhatsAppBatch = async () => {
    try {
      await stopWhatsAppBatchCampaign();
      stopBatchPolling();
      const bStatus = await getWhatsAppBatchStatus();
      setBatchProgress(bStatus);
    } catch (err) {
      console.error('Failed to stop batch:', err);
    }
  };

  const handleBatchAIGenerateForSelected = async () => {
    const idsToGen = selectedIds.length > 0 ? selectedIds : leads.map((l) => l.id);
    if (idsToGen.length === 0) return;
    setGeneratingBatch(true);
    try {
      await batchGeneratePitches(idsToGen, selectedTone, selectedService, customGuidance.trim() || undefined);
      await fetchCampaignLeads();
      onCampaignUpdated();
      setActionSuccessMsg(`✨ Generated custom messages for ${idsToGen.length} leads!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to batch generate:', err);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleRemoveSelected = async () => {
    const idsToRemove = selectedIds.length > 0 ? selectedIds : [];
    if (idsToRemove.length === 0) return;
    try {
      await removeFromCampaignQueue(idsToRemove);
      setLeads((prev) => prev.filter((l) => !idsToRemove.includes(l.id)));
      setSelectedIds([]);
      if (activeEditingLead && idsToRemove.includes(activeEditingLead.id)) {
        setActiveEditingLead(null);
      }
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to remove from campaign:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all prospects from this bulk campaign queue?')) return;
    try {
      await clearCampaignQueue();
      setLeads([]);
      setSelectedIds([]);
      setActiveEditingLead(null);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to clear campaign:', err);
    }
  };

  const handleSendDirectEmailFromDrawer = async () => {
    if (!activeEditingLead || !activeEditingLead.contact_email || !editingPitchText.trim()) {
      setActionSuccessMsg('⚠️ Valid email address and drafted message are required.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }

    setSendingDirectEmail(true);
    try {
      const subject = `Quick question regarding ${activeEditingLead.name}`;
      const res = await sendDirectEmailMessage({
        leadId: activeEditingLead.id,
        to: activeEditingLead.contact_email,
        subject,
        message: editingPitchText.trim(),
      });

      if (res.success) {
        const sentLeadId = activeEditingLead.id;
        setActionSuccessMsg(`✅ Email dispatched to ${activeEditingLead.name} & removed from Bulk Queue! 🚀`);
        setLeads((prev) => prev.filter((l) => l.id !== sentLeadId));
        setSelectedIds((prev) => prev.filter((i) => i !== sentLeadId));
        setActiveEditingLead(null);
        onCampaignUpdated();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'Email dispatch failed. Please check SMTP in Settings.'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to send email. Configure SMTP in Settings.'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setSendingDirectEmail(false);
    }
  };

  const handleOpenInGmail = async (lead?: Lead) => {
    const targetLead = lead || activeEditingLead;
    if (!targetLead || !targetLead.contact_email) {
      alert('This lead does not have a contact email.');
      return;
    }

    const messageText = targetLead.id === activeEditingLead?.id ? editingPitchText : (targetLead.pitch || '');
    const subject = `Quick inquiry regarding ${targetLead.name}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      targetLead.contact_email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;

    // Open Gmail Compose in new window
    window.open(gmailUrl, '_blank');

    // Automatically mark as contacted in CRM & remove from Bulk Queue
    try {
      await updateLead(targetLead.id, {
        status: 'contacted',
        in_campaign_queue: false,
        markContacted: true,
      });
      const sentId = targetLead.id;
      setLeads((prev) => prev.filter((l) => l.id !== sentId));
      setSelectedIds((prev) => prev.filter((i) => i !== sentId));
      if (activeEditingLead?.id === sentId) {
        setActiveEditingLead(null);
      }
      setActionSuccessMsg(`📬 Opened in Gmail & marked as Contacted! 🚀`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      onCampaignUpdated();
    } catch (err) {
      console.error('Failed to mark contacted on gmail open:', err);
    }
  };

  const handleStartBatchEmail = async () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    const validLeads = targetLeads
      .filter((l) => Boolean(l.contact_email && l.pitch))
      .map((l) => ({
        id: l.id,
        name: l.name,
        email: l.contact_email!,
        subject: `Quick question regarding ${l.name}`,
        message: l.pitch!,
      }));

    if (validLeads.length === 0) {
      setActionSuccessMsg('⚠️ Selected leads must have an Email and a drafted Message!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      return;
    }

    setBatchEmailStarting(true);
    try {
      const res = await sendBatchEmailMessages(validLeads);
      if (res.success) {
        const sentIds = validLeads.map((v) => v.id);
        setActionSuccessMsg(`🚀 Batch emails dispatched for ${validLeads.length} leads & removed from Queue!`);
        setLeads((prev) => prev.filter((l) => !sentIds.includes(l.id)));
        setSelectedIds((prev) => prev.filter((i) => !sentIds.includes(i)));
        if (activeEditingLead && sentIds.includes(activeEditingLead.id)) {
          setActiveEditingLead(null);
        }
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => setActionSuccessMsg(null), 4500);
        onCampaignUpdated();
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'Failed to start batch email.'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to send batch email. Check SMTP in Settings.'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setBatchEmailStarting(false);
    }
  };

  const handleCleanContactedLeads = async () => {
    const contacted = leads.filter((l) => l.status !== 'not_contacted');
    if (contacted.length === 0) {
      setActionSuccessMsg('✨ All leads in queue are already new/uncontacted!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }
    const ids = contacted.map((l) => l.id);
    await removeFromCampaignQueue(ids);
    setLeads((prev) => prev.filter((l) => l.status === 'not_contacted'));
    setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
    if (activeEditingLead && ids.includes(activeEditingLead.id)) {
      setActiveEditingLead(null);
    }
    setActionSuccessMsg(`🧹 Cleaned ${ids.length} contacted leads from queue!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
    onCampaignUpdated();
  };

  const handleCopyPitch = (lead: Lead) => {
    navigator.clipboard.writeText(lead.pitch || '');
    updateLead(lead.id, { status: 'contacted', markContacted: true, in_campaign_queue: false });
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setSelectedIds((prev) => prev.filter((i) => i !== lead.id));
    if (activeEditingLead?.id === lead.id) setActiveEditingLead(null);
    setActionSuccessMsg(`Copied message for ${lead.name} & removed from Queue! 🚀`);
    setTimeout(() => setActionSuccessMsg(null), 2500);
    onCampaignUpdated();
  };

  const handleCopySelectedDrafts = () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    if (targetLeads.length === 0) return;

    const formatted = targetLeads
      .map(
        (l) =>
          `Recipient: ${l.name} <${l.contact_email || 'No email'}> | Phone: ${l.phone || 'N/A'}\nMessage:\n${l.pitch || 'No message'}\n-----------------------------------\n`
      )
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 3000);
  };

  const handleBatchOpenInGmail = async () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id) && l.contact_email);
    if (targetLeads.length === 0) {
      setActionSuccessMsg('⚠️ None of the selected leads have an email address.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }
    for (const lead of targetLeads) {
      const subject = `Quick inquiry regarding ${lead.name}`;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        lead.contact_email!
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(lead.pitch || '')}`;
      window.open(gmailUrl, '_blank');
      await updateLead(lead.id, { status: 'contacted', in_campaign_queue: false, markContacted: true }).catch(() => {});
    }
    const ids = targetLeads.map((l) => l.id);
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
    if (activeEditingLead && ids.includes(activeEditingLead.id)) setActiveEditingLead(null);
    setActionSuccessMsg(`📬 Opened ${targetLeads.length} leads in Gmail & marked as Contacted! 🚀`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    onCampaignUpdated();
  };

  const handleSendSingleEmailDirect = async (lead: Lead) => {
    if (!lead.contact_email || !lead.pitch) {
      setActionSuccessMsg('⚠️ Valid email and drafted pitch are required.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      return;
    }
    try {
      const subject = `Quick question regarding ${lead.name}`;
      const res = await sendDirectEmailMessage({
        leadId: lead.id,
        to: lead.contact_email,
        subject,
        message: lead.pitch,
      });
      if (res.success) {
        setActionSuccessMsg(`✅ Email dispatched automatically to ${lead.name}!`);
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: 'contacted' } : l)));
        onCampaignUpdated();
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        setTimeout(() => setActionSuccessMsg(null), 3500);
      } else {
        setActionSuccessMsg(`⚠️ ${res.message || 'Email dispatch failed'}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setActionSuccessMsg(`⚠️ ${err.response?.data?.message || err.message || 'Failed to dispatch email'}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const startSequentialMailer = () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    if (targetLeads.length === 0) return;
    setStepperIndex(0);
    handleSendSingleEmailDirect(targetLeads[0]);
  };

  const advanceSequentialMailer = () => {
    const targetLeads = leads.filter((l) => selectedIds.includes(l.id));
    if (stepperIndex === null) return;
    const nextIdx = stepperIndex + 1;
    if (nextIdx < targetLeads.length) {
      setStepperIndex(nextIdx);
      handleSendSingleEmailDirect(targetLeads[nextIdx]);
    } else {
      setStepperIndex(null);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  };

  const isWaConnected = waState?.status === 'connected';
  const readyPitchesCount = leads.filter((l) => Boolean(l.pitch)).length;
  const contactedCount = leads.filter((l) => l.status === 'contacted' || l.status === 'replied' || l.status === 'converted').length;
  const wordCount = editingPitchText.trim() ? editingPitchText.trim().split(/\s+/).length : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/60 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Send className="h-3.5 w-3.5" />
                <span>Bulk Campaign & Multi-Channel Dispatch</span>
              </span>

              {isWaConnected && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    (waState?.sentToday || 0) >= 40
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>
                    🛡️ WhatsApp Cap: {waState?.sentToday || 0} / 40 Sent Today
                  </span>
                </span>
              )}

              {emailStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    emailStatus.limitReached
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>
                    🛡️ Email Cap: {emailStatus.sentToday} / {emailStatus.dailyLimit} Sent Today
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Campaign Queue ({leads.length} Leads)
            </h2>
            <p className="text-xs text-slate-300">
              Select leads to compose custom messages, launch <strong>Safe WhatsApp Automation (30-45s Delay)</strong>, or dispatch <strong>Direct Cold Emails</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {leads.length > 0 && (
              <>
                {contactedCount > 0 && (
                  <button
                    onClick={handleCleanContactedLeads}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors shadow"
                    title="Remove already messaged/contacted prospects from this queue"
                  >
                    <span>🧹 Clean Sent ({contactedCount})</span>
                  </button>
                )}

                <button
                  onClick={handleClearAll}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700 transition-colors"
                >
                  Clear Queue
                </button>

                <button
                  onClick={handleCopySelectedDrafts}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5 text-sky-400" />
                  <span>{copiedBatch ? 'Copied Selected!' : `Copy (${selectedIds.length})`}</span>
                </button>

                <button
                  onClick={handleBatchOpenInGmail}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40"
                  title="Open pre-filled Gmail Compose windows with 1-click (Zero Setup / Zero API)"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Gmail Web ↗ ({selectedIds.length})</span>
                </button>

                <button
                  onClick={handleStartBatchEmail}
                  disabled={batchEmailStarting || selectedIds.length === 0 || Boolean(emailStatus?.limitReached)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all disabled:opacity-40"
                  title={
                    emailStatus?.limitReached
                      ? `Daily anti-ban email limit reached (${emailStatus.sentToday}/${emailStatus.dailyLimit}). Connect another sending account in Settings.`
                      : 'Send emails automatically in the background via SMTP / Resend'
                  }
                >
                  <Mail className={`h-3.5 w-3.5 ${batchEmailStarting ? 'animate-spin' : ''}`} />
                  <span>
                    {batchEmailStarting
                      ? 'Auto-Email...'
                      : emailStatus?.limitReached
                      ? '⚠️ Email Limit Reached'
                      : `Auto-Send (${selectedIds.length})`}
                  </span>
                </button>

                <button
                  onClick={handleStartWhatsAppAntiBanBatch}
                  disabled={
                    batchStarting ||
                    batchProgress?.isRunning ||
                    !isWaConnected ||
                    (waState?.sentToday || 0) >= 40 ||
                    selectedIds.length === 0
                  }
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all ${
                    (waState?.sentToday || 0) >= 40
                      ? 'bg-slate-800 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90'
                      : isWaConnected && selectedIds.length > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    (waState?.sentToday || 0) >= 40
                      ? '40/40 daily safety limit reached on this number to prevent bans. Please link a new WhatsApp account in Settings.'
                      : undefined
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    {batchProgress?.isRunning
                      ? 'Campaign Running...'
                      : (waState?.sentToday || 0) >= 40
                      ? '⚠️ 40/40 Limit Reached (Switch Account)'
                      : isWaConnected
                      ? `🚀 Launch WhatsApp (${selectedIds.length})`
                      : 'Link WhatsApp in Settings'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 40 Messages Daily Safety Limit Alert */}
        {(waState?.sentToday || 0) >= 40 && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <span>
                <strong>🛡️ Anti-Ban Safety Limit Reached (40/40 Messages Sent Today):</strong> Auto-sending is paused on this WhatsApp number to protect it from restrictions. Link a new WhatsApp number in Settings or use 1-Click WhatsApp ↗.
              </span>
            </div>
          </div>
        )}

        {/* Quick Stats Bar */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700/60 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Total in Queue:</span>
              <span className="font-bold text-white font-mono">{leads.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Selected:</span>
              <span className="font-bold text-sky-400 font-mono">{selectedIds.length} Leads</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Messages Ready:</span>
              <span className="font-bold text-emerald-400 font-mono">{readyPitchesCount} / {leads.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Sent Progress:</span>
              <span className="font-bold text-amber-400 font-mono">{contactedCount} / {leads.length}</span>
            </div>
          </div>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* WHATSAPP ANTI-BAN MONITOR (When Running) */}
      {batchProgress?.isRunning && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/50 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <ShieldCheck className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">WhatsApp Anti-Ban Campaign in Progress</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    {batchProgress.currentIndex} / {batchProgress.totalCount} Leads
                  </span>
                </div>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  {batchProgress.statusMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {batchProgress.secondsRemaining > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
                  <Clock className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Next send in: <strong className="text-white text-sm">{batchProgress.secondsRemaining}s</strong></span>
                </div>
              )}

              <button
                onClick={handleStopWhatsAppBatch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-white" />
                <span>Stop Campaign</span>
              </button>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{
                width: `${batchProgress.totalCount > 0 ? (batchProgress.currentIndex / batchProgress.totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Sequential Stepper Modal / Floating Bar for Email */}
      {stepperIndex !== null && leads[stepperIndex] && (
        <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 shadow-xl flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs">
              {stepperIndex + 1} / {leads.length}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Dispatching: {leads[stepperIndex].name}</span>
                <span className="text-slate-400 font-mono text-[11px]">({leads[stepperIndex].contact_email || 'No email'})</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate max-w-md">
                {leads[stepperIndex].pitch || 'No message drafted'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendSingleEmailDirect(leads[stepperIndex])}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow"
            >
              Re-send Email
            </button>
            <button
              onClick={advanceSequentialMailer}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
            >
              <span>{stepperIndex + 1 === leads.length ? 'Finish Campaign 🎉' : 'Next Lead ➔'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Control Strip: Multi-Select Actions & Fast Pitch Generator */}
      {leads.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-sky-400" />
              <span>{selectedIds.length === leads.length ? 'Deselect All' : 'Select All Leads'}</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={handleRemoveSelected}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Service Dropdown & Pills */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as OfferedService)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-sky-500 font-semibold"
              >
                <option value="video_editing">🎬 Video Editing</option>
                <option value="content_creation_reels">🎬 Short Reels / Video Promo</option>
                <option value="graphic_design">🎨 Graphic Design</option>
                <option value="branding_logo">🎨 Visual Branding / Logo</option>
                <option value="website_design">🌐 Web Design / Development</option>
              </select>
            </div>

            <button
              onClick={handleBatchAIGenerateForSelected}
              disabled={generatingBatch || selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-40"
            >
              <Sparkles className={`h-3.5 w-3.5 ${generatingBatch ? 'animate-spin' : ''}`} />
              <span>{generatingBatch ? 'Drafting...' : `AI Generate for Selected (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Table on Left + Message Composer Drawer on Right */}
      {leads.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean, Compact Lead Table */}
          <div className={`${activeEditingLead ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all space-y-3`}>
            <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th
                        className="py-3 px-3.5 w-10 text-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAll();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.length === leads.length && leads.length > 0}
                          readOnly
                          className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                      </th>
                      <th className="py-3 px-4">Lead & Business</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Website & Social</th>
                      <th className="py-3 px-3">Message Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leads.map((lead) => {
                      const isSelected = selectedIds.includes(lead.id);
                      const isEditing = activeEditingLead?.id === lead.id;
                      const hasPitch = Boolean(lead.pitch && lead.pitch.trim());

                      return (
                        <tr
                          key={lead.id}
                          className={`transition-colors cursor-pointer ${
                            isEditing
                              ? 'bg-indigo-950/30 border-l-4 border-l-indigo-500'
                              : isSelected
                              ? 'bg-slate-800/40 hover:bg-slate-800/60'
                              : 'hover:bg-slate-800/20'
                          }`}
                          onClick={() => handleOpenMessageDrawer(lead)}
                        >
                          <td
                            className="py-3 px-3.5 text-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(lead.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span>{lead.name}</span>
                              {lead.rating && (
                                <span className="text-[10px] text-amber-400 font-semibold">★ {lead.rating}</span>
                              )}
                              {lead.status === 'not_contacted' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  NEW
                                </span>
                              ) : lead.status === 'contacted' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  ✓ Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  💬 {lead.status}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {lead.category || 'Lead'} {lead.address ? `• ${lead.address.split(',')[0]}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-0.5 font-mono text-[10px]">
                              {lead.phone ? (
                                <div className="text-emerald-400 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  <span>{lead.phone}</span>
                                </div>
                              ) : null}
                              {lead.contact_email ? (
                                <div className="text-sky-400 flex items-center gap-1 truncate max-w-[150px]">
                                  <Mail className="h-2.5 w-2.5" />
                                  <span>{lead.contact_email}</span>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {lead.has_website && lead.website ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <Globe className="h-2.5 w-2.5" /> Has Website
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                  🔴 No Website
                                </span>
                              )}

                              {lead.instagram_handle && (
                                <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                                  <Instagram className="h-2.5 w-2.5" />
                                  <span>{lead.instagram_handle}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {hasPitch ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Check className="h-3 w-3" /> Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                Draft
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessageDrawer(lead);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ml-auto ${
                                hasPitch
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                              }`}
                            >
                              <Edit3 className="h-3 w-3 text-sky-400" />
                              <span>{hasPitch ? 'Edit Message' : 'Write Message'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Message Composer & Quick Dispatch Drawer */}
          {activeEditingLead && (
            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-4 sticky top-20 animate-in fade-in slide-in-from-right-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span>Personalized Message</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    For: <strong className="text-slate-200">{activeEditingLead.name}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setActiveEditingLead(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Lead Details Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                {activeEditingLead.has_website && activeEditingLead.website ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 Website Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                    🔴 No Website (Hot Lead)
                  </span>
                )}

                {activeEditingLead.phone && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">
                    📞 {activeEditingLead.phone}
                  </span>
                )}

                {activeEditingLead.contact_email && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-mono">
                    ✉️ {activeEditingLead.contact_email}
                  </span>
                )}
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Message Copy (Direct Value Hook):</label>
                  <span
                    className={`font-mono text-[11px] ${
                      wordCount > 70 ? 'text-amber-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {wordCount} words (Recommended: &lt;70w)
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={editingPitchText}
                  onChange={(e) => setEditingPitchText(e.target.value)}
                  placeholder="Click 'AI Draft Custom Message' below or write your custom message here..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
                />
              </div>

              {/* AI Draft & Actions Bar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={handleGenerateSinglePitch}
                  disabled={generatingSinglePitch}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow"
                >
                  <Sparkles className={`h-3.5 w-3.5 text-amber-400 ${generatingSinglePitch ? 'animate-spin' : ''}`} />
                  <span>{generatingSinglePitch ? 'Drafting...' : '🪄 AI Re-Draft'}</span>
                </button>

                <button
                  onClick={handleSaveMessage}
                  disabled={savingPitch || !editingPitchText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingPitch ? 'Saving...' : 'Save Message'}</span>
                </button>
              </div>

              {/* Fast 1-Click Send Strip */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Fast 1-Click Dispatch:</span>
                  <span className="text-[10px] text-slate-400">Zero-setup direct actions</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Open in Gmail (Zero Password / Zero Setup) */}
                  <button
                    onClick={() => handleOpenInGmail()}
                    disabled={!activeEditingLead.contact_email}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-40"
                    title="1-Click Open in Gmail Web with draft pre-filled (Zero Password / Zero Setup)"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Gmail Web ↗</span>
                  </button>

                  {/* Direct WhatsApp */}
                  <button
                    onClick={handleSendDirectWhatsAppFromDrawer}
                    disabled={sendingDirectWhatsApp || !activeEditingLead.phone}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-40"
                    title={isWaConnected ? "Send directly from linked WhatsApp" : "Open WhatsApp chat in new window"}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{sendingDirectWhatsApp ? 'Sending...' : isWaConnected ? 'WhatsApp ⚡' : 'WhatsApp ↗'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  {/* Background SMTP Email */}
                  <button
                    onClick={handleSendDirectEmailFromDrawer}
                    disabled={sendingDirectEmail || !activeEditingLead.contact_email}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold border border-slate-700 disabled:opacity-40"
                    title="Dispatch email automatically in the background via SMTP (Zero Tabs)"
                  >
                    <Send className={`h-3 w-3 ${sendingDirectEmail ? 'animate-spin' : ''}`} />
                    <span>{sendingDirectEmail ? 'Sending...' : 'Auto-SMTP ⚡'}</span>
                  </button>

                  {/* Copy message */}
                  <button
                    onClick={() => handleCopyPitch(activeEditingLead)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700"
                  >
                    <Copy className="h-3 w-3 text-sky-400" />
                    <span>Copy Text</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <Send className="h-10 w-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">Bulk Campaign Queue is Empty</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select prospects in <strong>Find Business Leads</strong>, <strong>Saved Business CRM</strong>, or <strong>YouTube CRM</strong> and click <strong>"Send to Bulk Campaign Queue"</strong> to build your mailing and WhatsApp campaign list here.
          </p>
        </div>
      ) : null}
    </div>
  );
};
