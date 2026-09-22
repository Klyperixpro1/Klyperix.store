import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import {
  RotateCcw,
  Shield,
  Gem,
  Octagon,
  Menu,
  Mail,
  MessageCircle,
  MessageSquare,
  Youtube,
  MapPin,
  Bot,
  KeyRound,
  Search,
  Moon,
  Sun,
} from 'lucide-react';
import { toggleEmergencyKillSwitch } from '../../services/api';
import { BrandTrack } from '../../types';

interface NavbarProps {
  currentTab: NavTab;
  brandTrack: BrandTrack;
  onBrandTrackChange: (track: BrandTrack) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectTab: (tab: NavTab) => void;
  mockMode?: boolean;
  killSwitchActive?: boolean;
  onKillSwitchToggled?: (active: boolean) => void;
  onOpenMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab: _currentTab,
  brandTrack,
  onBrandTrackChange,
  onRefresh,
  isRefreshing,
  onSelectTab,
  mockMode = false,
  killSwitchActive = false,
  onKillSwitchToggled,
  onOpenMobileMenu,
  onOpenCommandPalette,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  const handleKillSwitchClick = async () => {
    const nextState = !killSwitchActive;
    if (nextState) {
      if (
        !window.confirm(
          '🚨 ACTIVATE EMERGENCY PAUSE?\n\nThis will immediately pause and halt all active auto-sending, WhatsApp queues, and batch campaigns.'
        )
      ) {
        return;
      }
    }

    setTogglingKillSwitch(true);
    try {
      const res = await toggleEmergencyKillSwitch(nextState);
      if (onKillSwitchToggled) {
        onKillSwitchToggled(res.killSwitchActive);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle kill switch:', err);
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const isGems = brandTrack === 'gems_jewels';

  return (
    <header className="h-16 px-3 sm:px-5 lg:px-6 bg-white border-b border-[#ecdcff] flex items-center justify-between gap-2 md:gap-4 select-none shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger, Brand Logo, Brand Track Toggle & Quick Find */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl text-[#5c2f8f] hover:bg-[#faf7ff] border border-[#ecdcff] lg:hidden shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Dynamic Logo based on active track */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 shrink-0 rounded-full border border-[#ecdcff] bg-white overflow-hidden flex items-center justify-center shadow-xs">
            <img
              src={isGems ? '/logo-gems.png' : '/logo.png'}
              alt="Klyperix Logo"
              className="h-full w-full object-contain p-0.5"
            />
          </div>

          {/* Top Brand Track Toggle (Framer Pill Style) */}
          <div className="flex items-center bg-[#faf7ff] p-1 rounded-xl border border-[#ecdcff] shrink-0">
            <button
              onClick={() => onBrandTrackChange('production')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                !isGems
                  ? 'bg-[#8400ff] text-white shadow-xs'
                  : 'text-[#5c2f8f] hover:bg-[#ecdcff]/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Production</span>
            </button>

            <button
              onClick={() => onBrandTrackChange('gems_jewels')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isGems
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs'
                  : 'text-[#5c2f8f] hover:bg-[#ecdcff]/50'
              }`}
            >
              <Gem className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Gems & Jewels</span>
            </button>
          </div>
        </div>

        {/* Quick Find (Command Palette) */}
        {onOpenCommandPalette && (
          <>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#faf7ff] hover:bg-[#ecdcff] border border-[#ecdcff] text-xs text-[#5c2f8f] transition shadow-2xs whitespace-nowrap shrink-0"
              title="Press Ctrl+K to search anything"
            >
              <Search className="w-3.5 h-3.5 text-[#8400ff] shrink-0" />
              <span className="font-semibold text-[11px] whitespace-nowrap">Quick Find</span>
              <kbd className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-white text-[#8d76ab] border border-[#ecdcff] rounded shadow-2xs whitespace-nowrap">
                Ctrl+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden lg:flex 2xl:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#faf7ff] hover:bg-[#ecdcff] border border-[#ecdcff] text-xs text-[#5c2f8f] transition shadow-2xs whitespace-nowrap shrink-0"
              title="Press Ctrl+K to search anything"
            >
              <Search className="w-3.5 h-3.5 text-[#8400ff] shrink-0" />
              <kbd className="px-1 py-0.2 text-[9px] font-mono font-bold bg-white text-[#8d76ab] border border-[#ecdcff] rounded shadow-2xs">
                Ctrl+K
              </kbd>
            </button>
          </>
        )}
      </div>

      {/* Center: Verified Outreach Engines Indicator */}
      <div className="hidden lg:flex items-center justify-center shrink-0">
        {/* Full Desktop List (2xl screens and up) */}
        <div className="hidden 2xl:flex items-center gap-1.5 bg-[#faf7ff] px-3 py-1 rounded-xl border border-[#ecdcff] shrink-0">
          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5c2f8f] hover:bg-white transition whitespace-nowrap shrink-0"
            title="Gmail & SMTP Delivery: Active"
          >
            <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="whitespace-nowrap">Gmail</span>
          </button>

          <span className="text-slate-200">|</span>

          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5c2f8f] hover:bg-white transition whitespace-nowrap shrink-0"
            title="WhatsApp Web Socket: Direct Messaging"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="whitespace-nowrap">WhatsApp</span>
          </button>

          <span className="text-slate-200">|</span>

          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5c2f8f] hover:bg-white transition whitespace-nowrap shrink-0"
            title="Google Maps & OSM: Live"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="whitespace-nowrap">Maps</span>
          </button>

          <span className="text-slate-200">|</span>

          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5c2f8f] hover:bg-white transition whitespace-nowrap shrink-0"
            title="YouTube Data API v3: Active"
          >
            <Youtube className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="whitespace-nowrap">YouTube</span>
          </button>

          <span className="text-slate-200">|</span>

          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5c2f8f] hover:bg-white transition whitespace-nowrap shrink-0"
            title="Reddit Live Hiring API: Active"
          >
            <MessageSquare className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="whitespace-nowrap">Reddit</span>
          </button>

          <span className="text-slate-200">|</span>

          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5c2f8f] hover:bg-white transition whitespace-nowrap shrink-0"
            title="Klyperix Assistant Engine: Active"
          >
            <Bot className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="whitespace-nowrap">Klyperix Assistant</span>
          </button>
        </div>

        {/* Compact, Sleek Multi-Engine Status Pill for Laptop Screens (lg to 2xl) */}
        <div className="flex 2xl:hidden items-center">
          <button
            onClick={() => onSelectTab('connections')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#faf7ff] border border-[#ecdcff] hover:bg-white transition shadow-2xs shrink-0"
            title="6 Outreach Engines Active: Gmail, WhatsApp, Maps, YouTube, Reddit, Groq AI"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <Youtube className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <MessageSquare className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <Bot className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-[#5c2f8f] whitespace-nowrap">Engines Active</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Fill API Keys, Pause All & Refresh */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dark Mode Toggle */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#faf7ff] hover:bg-[#ecdcff] text-[#5c2f8f] text-xs flex items-center gap-1.5 border border-[#ecdcff] transition-colors shadow-xs font-bold shrink-0 whitespace-nowrap"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-[#8400ff]" />
            )}
          </button>
        )}

        {/* Primary Fill API Keys Button */}
        <button
          onClick={() => onSelectTab('settings')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#8400ff] via-[#7200db] to-[#5c2f8f] hover:from-[#7200db] hover:to-[#8400ff] transition shadow-xs hover:shadow-md shrink-0 whitespace-nowrap"
          title="Fill or Add API Keys"
        >
          <KeyRound className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="whitespace-nowrap">API Keys</span>
        </button>

        {mockMode && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ecdcff] text-[#5c2f8f] border border-[#bb7eff]/40 shrink-0 whitespace-nowrap">
            Demo
          </span>
        )}

        {/* Emergency Pause Button */}
        <button
          onClick={handleKillSwitchClick}
          disabled={togglingKillSwitch}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap ${
            killSwitchActive
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
              : 'bg-[#faf7ff] hover:bg-rose-50 text-[#5c2f8f] hover:text-rose-600 border border-[#ecdcff]'
          }`}
          title={
            killSwitchActive
              ? 'Click to unlock safety lock & resume operations'
              : '1-Click Pause: Instantly halt all auto-sending & batch queues'
          }
        >
          <Octagon className={`h-3.5 w-3.5 shrink-0 ${killSwitchActive ? 'fill-white text-rose-600' : 'text-rose-500'}`} />
          <span className="hidden sm:inline whitespace-nowrap">{killSwitchActive ? 'PAUSED' : 'Pause All'}</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#faf7ff] hover:bg-[#ecdcff] text-[#5c2f8f] text-xs flex items-center gap-1.5 border border-[#ecdcff] transition-colors shadow-xs font-bold shrink-0 whitespace-nowrap"
          title="Refresh metrics & queues"
        >
          <RotateCcw className={`h-3.5 w-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-[#8400ff]' : ''}`} />
          <span className="hidden sm:inline whitespace-nowrap">Refresh</span>
        </button>
      </div>
    </header>
  );
};
