import React, { useState, useEffect } from 'react';
import { NavTab } from '../Layout/Sidebar';
import { BrandTrack } from '../../types';
import {
  Search,
  Compass,
  Send,
  Users,
  Inbox,
  Settings,
  Sparkles,
  Download,
  Flame,
  ArrowRight,
  X,
  Keyboard,
  Globe,
  Instagram,
  Linkedin,
  DollarSign,
  Youtube,
  MapPin,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  brandTrack: BrandTrack;
  onBrandTrackChange: (track: BrandTrack) => void;
  onExportGoogleDocs?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  brandTrack,
  onBrandTrackChange,
  onExportGoogleDocs,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'finder_maps',
      title: 'Find High-Ticket Leads (USA, UK, Canada, Australia, UAE)',
      category: 'Lead Discovery',
      icon: MapPin,
      color: 'text-blue-500',
      action: () => {
        onSelectTab('find_leads');
        onClose();
      },
    },
    {
      id: 'crm',
      title: 'Sales CRM & Pipeline Stages',
      category: 'CRM',
      icon: Users,
      color: 'text-blue-600',
      action: () => {
        onSelectTab('crm');
        onClose();
      },
    },
    {
      id: 'campaign',
      title: 'Outreach & Mass Campaign Hub',
      category: 'Outreach',
      icon: Send,
      color: 'text-[#8400ff]',
      action: () => {
        onSelectTab('outreach');
        onClose();
      },
    },
    {
      id: 'inbox',
      title: 'Unified Inbound Replies Inbox',
      category: 'CRM',
      icon: Inbox,
      color: 'text-purple-600',
      action: () => {
        onSelectTab('inbox');
        onClose();
      },
    },
    {
      id: 'content',
      title: 'Create & Publish Social Content (AI Studio)',
      category: 'Content',
      icon: Sparkles,
      color: 'text-amber-500',
      action: () => {
        onSelectTab('content');
        onClose();
      },
    },
    {
      id: 'connections',
      title: 'Platform Connections (Google, WhatsApp, YouTube)',
      category: 'System',
      icon: Globe,
      color: 'text-emerald-500',
      action: () => {
        onSelectTab('connections');
        onClose();
      },
    },
    {
      id: 'switch_track',
      title:
        brandTrack === 'production'
          ? 'Switch to Klyperix Gems & Jewels Track 💎'
          : 'Switch to Klyperix Production Track 🎬',
      category: 'Brand Track',
      icon: Sparkles,
      color: 'text-amber-500',
      action: () => {
        onBrandTrackChange(brandTrack === 'production' ? 'gems_jewels' : 'production');
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Settings & Emergency Guardrails',
      category: 'System',
      icon: Settings,
      color: 'text-slate-700',
      action: () => {
        onSelectTab('settings');
        onClose();
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#ecdcff] shadow-2xl overflow-hidden">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#ecdcff] bg-[#faf7ff]">
          <Search className="w-5 h-5 text-[#8400ff]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to any section..."
            className="flex-1 bg-transparent border-none text-sm text-[#251142] placeholder-[#8d76ab] focus:outline-none font-medium"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-[#5c2f8f] bg-white border border-[#ecdcff] rounded-lg">
            ESC
          </kbd>
          <button onClick={onClose} className="text-[#8d76ab] hover:text-[#251142]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#faf7ff]">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-[#faf7ff] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-[#ecdcff] group-hover:border-[#8400ff] transition">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#251142] group-hover:text-[#8400ff] transition">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-[#8d76ab] font-medium">{item.category}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8d76ab] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition" />
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#8d76ab]">No commands matching "{query}"</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#faf7ff] border-t border-[#ecdcff] flex items-center justify-between text-[11px] text-[#5c2f8f]">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3 h-3 text-[#8400ff]" /> Klyperix Quick Navigator
          </span>
          <span className="text-[10px] text-[#8d76ab]">Tip: Press Ctrl+K anytime</span>
        </div>
      </div>
    </div>
  );
};
