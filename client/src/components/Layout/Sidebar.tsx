import React from 'react';
import {
  LayoutDashboard,
  Send,
  Users,
  Settings,
  Flame,
  Inbox,
  ShieldCheck,
  Globe2,
  Compass,
  Sparkles,
  Link2,
  X,
  KeyRound,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'find_leads'
  | 'crm'
  | 'outreach'
  | 'inbox'
  | 'content'
  | 'connections'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadRepliesCount?: number;
  campaignQueueCount?: number;
  totalLeadsCount?: number;
  pitchesReadyCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  unreadRepliesCount = 0,
  campaignQueueCount = 0,
  totalLeadsCount = 0,
  pitchesReadyCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#251142]/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-[#ffffff] border-r border-[#ecdcff] flex flex-col justify-between shrink-0 select-none z-50 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="hidden lg:flex items-center justify-center p-6 border-b border-gray-100 dark:border-[#222]">
            <img src="/logo.png" alt="Klyperix Logo" className="w-10 h-10 rounded-xl" />
          </div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#ecdcff] bg-[#faf7ff]/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full border border-[#ecdcff] bg-[#ffffff] overflow-hidden flex items-center justify-center">
                <img src="/logo.png" alt="Klyperix Logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-black text-sm tracking-tight text-[#251142] flex items-center gap-1.5">
                  <span>KLYPERIX</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ecdcff] text-[#5c2f8f] font-bold font-mono">
                    OUTREACH
                  </span>
                </div>
                <div className="text-[10px] text-[#715599] font-semibold tracking-wide flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8400ff]" />
                  <span>High-Ticket Client Engine</span>
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-[#5c2f8f] hover:bg-[#ecdcff] lg:hidden"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <nav className="p-3 space-y-2">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white shadow-md shadow-[#8400ff]/20'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${currentTab === 'dashboard' ? 'text-white' : 'text-[#8400ff]'}`} />
              <span>Dashboard</span>
            </button>

            {/* 2. Find Leads */}
            <button
              onClick={() => handleNavClick('find_leads')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'find_leads'
                  ? 'bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white shadow-md shadow-[#8400ff]/20'
                  : 'bg-[#faf7ff] text-[#251142] hover:bg-[#f3ebff] border border-[#ecdcff]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe2 className="h-4 w-4 text-[#8400ff]" />
                <span>Find Leads</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8400ff] text-white font-bold animate-pulse">
                LIVE
              </span>
            </button>

            {/* 3. CRM Pipeline */}
            <button
              onClick={() => handleNavClick('crm')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'crm'
                  ? 'bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white shadow-md shadow-[#8400ff]/20'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-[#8400ff]" />
                <span>CRM Pipeline</span>
              </div>
              {totalLeadsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#ecdcff] text-[#5c2f8f] font-mono font-bold">
                  {totalLeadsCount}
                </span>
              )}
            </button>

            {/* 4. Outreach & Campaigns */}
            <button
              onClick={() => handleNavClick('outreach')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'outreach'
                  ? 'bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white shadow-md shadow-[#8400ff]/20'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className="h-4 w-4 text-[#8400ff]" />
                <span>Outreach Hub</span>
              </div>
              {campaignQueueCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#ecdcff] text-[#5c2f8f] font-mono font-bold">
                  {campaignQueueCount}
                </span>
              )}
            </button>

            {/* 5. Inbox (Replies) */}
            <button
              onClick={() => handleNavClick('inbox')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'inbox'
                  ? 'bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white shadow-md shadow-[#8400ff]/20'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="h-4 w-4 text-[#8400ff]" />
                <span>Inbox</span>
              </div>
              {unreadRepliesCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold font-mono animate-bounce">
                  {unreadRepliesCount} NEW
                </span>
              )}
            </button>

            {/* 6. Content (Create & Publish) */}
            <button
              onClick={() => handleNavClick('content')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'content'
                  ? 'bg-gradient-to-r from-[#5c2f8f] via-[#8400ff] to-[#bb7eff] text-white shadow-md shadow-[#8400ff]/20'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-[#8400ff]" />
                <span>Create & Publish</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                STUDIO
              </span>
            </button>

            {/* 7. Connections */}
            <button
              onClick={() => handleNavClick('connections')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                currentTab === 'connections'
                  ? 'bg-[#ecdcff] text-[#251142] font-bold'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <Link2 className="h-4 w-4 text-[#8400ff]" />
              <span>Connections</span>
            </button>

            {/* 8. API Keys & Settings */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                currentTab === 'settings'
                  ? 'bg-[#ecdcff] text-[#251142] font-bold'
                  : 'text-[#5c2f8f] hover:text-[#251142] hover:bg-[#faf7ff]'
              }`}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-[#8400ff]" />
                <span>API Keys & Settings</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-[#8400ff] font-bold">
                API
              </span>
            </button>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-3.5 m-3 rounded-2xl bg-[#faf7ff] border border-[#ecdcff] text-xs text-[#5c2f8f] space-y-1">
          <div className="flex items-center gap-1.5 text-[#251142] font-bold text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#8400ff]" />
            <span>Klyperix Production</span>
          </div>
          <p className="text-[10px] leading-relaxed text-[#715599]">
            Client acquisition engine with anti-ban guardrails and high-ticket discovery.
          </p>
        </div>
      </aside>
    </>
  );
};
