import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { PlatformLeadFinder } from './components/SocialSearch/PlatformLeadFinder';
import { LeadsCRM } from './components/LeadsCRM/LeadsCRM';
import { BulkCampaign } from './components/BulkCampaign/BulkCampaign';
import { RepliesInbox } from './components/RepliesInbox/RepliesInbox';
import { ContentStudio } from './components/Content/ContentStudio';
import { ConnectionsHub } from './components/Connections/ConnectionsHub';
import { Settings } from './components/Settings/Settings';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { OnboardingTour } from './components/Onboarding/OnboardingTour';
import { getDashboardStats, getLeads, getInboundReplies, getSettings } from './services/api';
import { DashboardStats, BrandTrack } from './types';
import { HelpCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [brandTrack, setBrandTrack] = useState<BrandTrack>('production');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaignQueueCount, setCampaignQueueCount] = useState<number>(0);
  const [unreadRepliesCount, setUnreadRepliesCount] = useState<number>(0);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('klyperix_onboarding_done')
  );

  // Force pure dark mode always
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Universal Global Ctrl+K / Cmd+K Quick Search Shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);

      const camp = await getLeads({ inCampaign: true, brandTrack });
      setCampaignQueueCount(camp.total || 0);

      const replies = await getInboundReplies();
      setUnreadRepliesCount(replies.unreadCount || 0);

      const settings = await getSettings();
      setKillSwitchActive(Boolean(settings.killSwitchActive));
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const interval = setInterval(async () => {
      try {
        const replies = await getInboundReplies();
        setUnreadRepliesCount(replies.unreadCount || 0);
      } catch (err) {
        // ignore
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [brandTrack]);

  return (
    <div className="flex h-screen w-full bg-[#fdfdfc] text-[#251142] overflow-hidden font-sans">
      {showOnboarding && <OnboardingTour onClose={() => setShowOnboarding(false)} />}

      <button
        onClick={() => setShowOnboarding(true)}
        title="Replay the app tour"
        className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-[#8400ff] text-white shadow-lg hover:bg-[#7200db] transition"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Responsive Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        unreadRepliesCount={unreadRepliesCount}
        campaignQueueCount={campaignQueueCount}
        totalLeadsCount={stats?.totalLeads || 0}
        pitchesReadyCount={stats?.pitchesReady || 0}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fdfdfc]">
        {/* Top Navbar with Brand Track Switcher & Top Social Connect Bar */}
        <Navbar
          currentTab={currentTab}
          brandTrack={brandTrack}
          onBrandTrackChange={(track) => setBrandTrack(track)}
          onRefresh={fetchStats}
          isRefreshing={loadingStats}
          onSelectTab={(tab) => setCurrentTab(tab)}
          mockMode={false}
          killSwitchActive={killSwitchActive}
          onKillSwitchToggled={(active) => setKillSwitchActive(active)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Universal Quick Command Palette (Ctrl+K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectTab={(tab) => setCurrentTab(tab)}
          brandTrack={brandTrack}
          onBrandTrackChange={(track) => setBrandTrack(track)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-[#faf7ff]/50">
          {/* 1. Overview Dashboard */}
          {currentTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              loading={loadingStats}
              onSelectTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {/* 2. Find Leads */}
          {currentTab === 'find_leads' && (
            <PlatformLeadFinder
              initialPlatform="google_places"
              brandTrack={brandTrack}
              onLeadsSaved={fetchStats}
              onOpenCampaign={() => setCurrentTab('outreach')}
            />
          )}

          {/* 3. CRM Pipeline */}
          {currentTab === 'crm' && (
            <LeadsCRM
              sourcePreset="all"
              onLeadsUpdated={fetchStats}
              onOpenQueue={() => setCurrentTab('outreach')}
              onOpenCampaign={() => setCurrentTab('outreach')}
            />
          )}

          {/* 4. Outreach & Campaigns */}
          {currentTab === 'outreach' && (
            <BulkCampaign onCampaignUpdated={fetchStats} />
          )}

          {/* 5. Inbound Replies Inbox */}
          {currentTab === 'inbox' && (
            <RepliesInbox onRepliesUpdated={fetchStats} />
          )}

          {/* 6. Content (Create & Publish Social Media Studio) */}
          {currentTab === 'content' && (
            <ContentStudio />
          )}

          {/* 7. Dedicated Connections Hub */}
          {currentTab === 'connections' && (
            <ConnectionsHub onSelectTab={(tab) => setCurrentTab(tab)} />
          )}

          {/* 8. Settings & API Keys */}
          {currentTab === 'settings' && (
            <Settings onSettingsSaved={fetchStats} />
          )}
        </main>

        {/* Executive Mobile Bottom Navigation Bar (Visible only on mobile/tablet screens < lg) */}
        <nav className="lg:hidden shrink-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#ecdcff] px-2 flex items-center justify-around z-30 shadow-lg">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'find_leads', label: 'Find Leads', icon: '🔍', badge: 'AI' },
            { id: 'crm', label: 'CRM', icon: '👥', count: stats?.totalLeads },
            { id: 'outreach', label: 'Campaigns', icon: '⚡', count: campaignQueueCount },
            { id: 'inbox', label: 'Inbox', icon: '💬', count: unreadRepliesCount },
          ].map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as NavTab)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                  isActive ? 'text-[#8400ff] font-bold' : 'text-[#715599] hover:text-[#251142]'
                }`}
              >
                <div className="relative text-lg">
                  <span>{item.icon}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                  {item.badge && !item.count && (
                    <span className="absolute -top-1 -right-3 px-1 rounded-full bg-[#8400ff] text-white text-[8px] font-black">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 truncate">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 rounded-full bg-[#8400ff]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default App;
