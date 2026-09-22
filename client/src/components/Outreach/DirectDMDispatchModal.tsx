import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Mail,
  Phone,
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
  Youtube,
  MapPin,
  Send,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { updateLeadPipelineStage } from '../../services/api';

export interface DispatchLead {
  id?: number;
  external_id?: string;
  name: string;
  category?: string;
  source?: string;
  brand_track?: 'production' | 'gems_jewels';
  phone?: string;
  contact_email?: string;
  website?: string;
  instagram_handle?: string;
  profile_url?: string;
  description?: string;
  budget?: string;
  high_ticket_score?: number;
  intent_level?: string;
  already_contacted?: boolean;
}

interface DirectDMDispatchModalProps {
  lead: DispatchLead;
  brandTrack?: 'production' | 'gems_jewels';
  onClose: () => void;
  onLeadContacted?: (lead: DispatchLead) => void;
}

export const DirectDMDispatchModal: React.FC<DirectDMDispatchModalProps> = ({
  lead,
  brandTrack = 'production',
  onClose,
  onLeadContacted,
}) => {
  const [tone, setTone] = useState<'direct' | 'value' | 'bold' | 'friendly'>('value');
  const [copied, setCopied] = useState(false);
  const [contactedStatus, setContactedStatus] = useState<boolean>(Boolean(lead.already_contacted));
  const [customNote, setCustomNote] = useState<string>('');

  const isGems = brandTrack === 'gems_jewels' || lead.brand_track === 'gems_jewels';
  const firstName = lead.name.split(' ')[0] || lead.name;
  const isPersonalName =
    firstName &&
    firstName.length < 20 &&
    !/clinic|agency|salon|boutique|studio|realtor|group|inc|llc|co|hospital|dental|law|cafe|spa\b/i.test(firstName);
  const greeting = isPersonalName ? `Hey ${firstName},` : 'Hey,';

  const generatePitchText = (): string => {
    if (customNote) return customNote;

    if (isGems) {
      const gemsSign = 'Klyperix Gems & Jewels | Wholesale Certified Diamonds & Bespoke Manufacturing';
      if (tone === 'direct') {
        return `Hi ${firstName}, loved your collection at ${lead.name}. We supply certified GIA/IGI natural and lab-grown diamonds directly to fine jewelry boutiques at wholesale pricing, eliminating middleman markups. May I share our latest catalog?\n\n${gemsSign}`;
      }
      if (tone === 'bold') {
        return `Hi ${firstName}, elevate your salon's profit margins. We manufacture bespoke bridal settings and supply direct wholesale diamonds with guaranteed turnaround. Would you be open to reviewing our wholesale price sheet?\n\n${gemsSign}`;
      }
      if (tone === 'friendly') {
        return `Hi ${firstName}, hope you're having a wonderful week! I came across ${lead.name} and really admired your craftsmanship. We specialize in ethically sourced diamonds and custom CAD jewelry. Would love to send a lookbook if you're exploring new suppliers!\n\n${gemsSign}`;
      }
      return `Hi ${firstName}, noticed ${lead.name}'s luxury collection. We partner with fine retailers to provide high-margin certified diamonds and custom bridal casting. Happy to send a quick sample comparison of our wholesale pricing if helpful!\n\n${gemsSign}`;
    }

    // Exact Garv Klyperix Production outreach message
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

  const currentPitch = customNote || generatePitchText();

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(currentPitch);
    setCopied(true);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    setTimeout(() => setCopied(false), 2000);
  };

  const markLeadAsContacted = async () => {
    setContactedStatus(true);
    if (lead.id) {
      try {
        await updateLeadPipelineStage(lead.id, 'contacted');
      } catch {
        // ignore
      }
    }
    if (onLeadContacted) onLeadContacted(lead);
  };

  const handlePlatformDispatch = (url: string) => {
    handleCopyPitch();
    markLeadAsContacted();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Channel link extractors
  const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
  const cleanHandle = (lead.instagram_handle || '').replace(/^@/, '');
  const subjectLine = isGems
    ? `Bespoke Wholesale Diamond & Fine Jewelry Inquiry — ${lead.name}`
    : `High-Retention Video Editing & Growth Collaboration — ${lead.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#ecdcff] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#251142] to-[#43187a] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{lead.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  Fit Score: {lead.high_ticket_score || 95}/100
                </span>
                {contactedStatus && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Contacted
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                {lead.category || 'High-Ticket Prospect'} • {lead.budget || '$2,500 - $6,000/mo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#faf7ff]/30">
          {/* Tone Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#251142] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#8400ff]" />
                <span>AI Personalized Pitch Tone</span>
              </label>
              <span className="text-[11px] text-[#715599]">Hook-first, non-robotic outreach</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'value', label: '💡 Value-First (Recommended)' },
                { id: 'direct', label: '🎯 Direct & Fast' },
                { id: 'bold', label: '🔥 Bold / High ROI' },
                { id: 'friendly', label: '🤝 Warm & Friendly' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTone(t.id as any);
                    setCustomNote('');
                  }}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition text-center ${
                    tone === t.id && !customNote
                      ? 'bg-[#8400ff] text-white border-[#8400ff] shadow-xs'
                      : 'bg-white text-[#5c2f8f] border-[#ecdcff] hover:bg-[#ecdcff]/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Pitch Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#251142]">Generated Message Copy</label>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="text-xs font-bold text-[#8400ff] hover:text-[#7200db] flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={currentPitch}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white border border-[#ecdcff] text-xs text-[#251142] font-medium leading-relaxed focus:outline-none focus:border-[#8400ff] shadow-xs"
            />
          </div>

          {/* 1-Click Platform DM Dispatch Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-[#251142] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#8400ff]" />
                <span>1-Click Direct DM Dispatch</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ⚡ Auto-copies pitch & opens chat
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {/* 1. Instagram DM */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    cleanHandle ? `https://ig.me/m/${cleanHandle}` : lead.profile_url && lead.profile_url.includes('instagram') ? lead.profile_url : 'https://instagram.com/direct/inbox/'
                  )
                }
                className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-200 hover:border-pink-400 flex flex-col items-center justify-center gap-1.5 text-pink-700 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Instagram className="w-5 h-5 text-pink-600 group-hover:scale-110 transition" />
                <span>Instagram DM</span>
              </button>

              {/* 2. LinkedIn Message */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    lead.profile_url && lead.profile_url.includes('linkedin')
                      ? lead.profile_url
                      : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.name)}`
                  )
                }
                className="p-3 rounded-2xl bg-blue-50 border border-blue-200 hover:border-blue-400 flex flex-col items-center justify-center gap-1.5 text-blue-700 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Linkedin className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
                <span>LinkedIn InMail</span>
              </button>

              {/* 3. WhatsApp Direct Chat */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    cleanPhone
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(currentPitch)}`
                      : `https://web.whatsapp.com/`
                  )
                }
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-1.5 text-emerald-700 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Phone className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
                <span>WhatsApp Chat</span>
              </button>

              {/* 4. Gmail Direct Compose */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    lead.contact_email
                      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.contact_email)}&su=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(currentPitch)}`
                      : `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(currentPitch)}`
                  )
                }
                className="p-3 rounded-2xl bg-red-50 border border-red-200 hover:border-red-400 flex flex-col items-center justify-center gap-1.5 text-red-700 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Mail className="w-5 h-5 text-red-600 group-hover:scale-110 transition" />
                <span>Gmail Compose</span>
              </button>

              {/* 5. X (Twitter) DM */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    lead.profile_url && lead.profile_url.includes('x.com')
                      ? lead.profile_url
                      : `https://x.com/messages/compose?text=${encodeURIComponent(currentPitch)}`
                  )
                }
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 flex flex-col items-center justify-center gap-1.5 text-slate-800 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Twitter className="w-5 h-5 text-slate-800 group-hover:scale-110 transition" />
                <span>X / Twitter DM</span>
              </button>

              {/* 6. Upwork Proposal */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    lead.profile_url && lead.profile_url.includes('upwork.com')
                      ? lead.profile_url
                      : `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(lead.category || 'video editing')}`
                  )
                }
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Briefcase className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
                <span>Upwork Proposal</span>
              </button>

              {/* 7. Contra Commission Pitch */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    lead.profile_url && lead.profile_url.includes('contra.com')
                      ? lead.profile_url
                      : 'https://contra.com/freelance-jobs'
                  )
                }
                className="p-3 rounded-2xl bg-rose-50 border border-rose-200 hover:border-rose-400 flex flex-col items-center justify-center gap-1.5 text-rose-700 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <Flame className="w-5 h-5 text-rose-600 group-hover:scale-110 transition" />
                <span>Contra Pitch</span>
              </button>

              {/* 8. Reddit Direct DM */}
              <button
                type="button"
                onClick={() =>
                  handlePlatformDispatch(
                    lead.profile_url && lead.profile_url.includes('reddit.com')
                      ? lead.profile_url
                      : 'https://reddit.com/r/forhire'
                  )
                }
                className="p-3 rounded-2xl bg-orange-50 border border-orange-200 hover:border-orange-400 flex flex-col items-center justify-center gap-1.5 text-orange-700 font-bold text-xs transition shadow-2xs hover:shadow-xs group"
              >
                <MessageSquare className="w-5 h-5 text-orange-600 group-hover:scale-110 transition" />
                <span>Reddit Message</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#ecdcff] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPitch}
              className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8400ff] font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Pitch Copied!' : 'Copy Pitch'}</span>
            </button>

            <button
              type="button"
              onClick={markLeadAsContacted}
              className={`px-3 py-2 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 ${
                contactedStatus
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-[#faf7ff] text-[#5c2f8f] border-[#ecdcff] hover:bg-[#ecdcff]/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{contactedStatus ? 'Marked as Contacted' : 'Mark as Contacted'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-[#5c2f8f] hover:text-[#251142] bg-[#faf7ff] hover:bg-[#ecdcff]/50 rounded-xl border border-[#ecdcff] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
