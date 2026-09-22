import React, { useState, useEffect, useRef } from 'react';
import { getConnections, getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp, disconnectGmail } from '../../services/api';
import { PlatformConnection, WhatsAppStatusState } from '../../types';
import { NavTab } from '../Layout/Sidebar';
import {
  Mail,
  MessageCircle,
  MessageSquare,
  Youtube,
  MapPin,
  Bot,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  QrCode,
  CheckCircle2,
  LogOut,
  Check,
  Globe,
  KeyRound,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ConnectionsHubProps {
  onSelectTab?: (tab: NavTab) => void;
}

export const ConnectionsHub: React.FC<ConnectionsHubProps> = ({ onSelectTab }) => {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const [waState, setWaState] = useState<WhatsAppStatusState | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const pollingRef = useRef<any>(null);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await getConnections();
      setConnections(res.connections || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppStatus = async () => {
    try {
      const data = await getWhatsAppStatus();
      setWaState(data);
      if (data.status === 'qr_ready' || data.status === 'connecting') {
        startPolling();
      }
    } catch (err) {
      console.error('Failed to load WhatsApp status:', err);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await getWhatsAppStatus();
        setWaState(data);
        if (data.status === 'connected') {
          clearInterval(pollingRef.current);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          fetchConnections();
        }
      } catch (err) {
        // ignore
      }
    }, 2500);
  };

  useEffect(() => {
    fetchConnections();
    loadWhatsAppStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleConnectWhatsApp = async (forceRestart: boolean = true) => {
    setWaLoading(true);
    try {
      const data = await connectWhatsApp(forceRestart);
      setWaState(data);
      startPolling();
    } catch (err) {
      console.error('Failed to initiate WhatsApp pairing:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('Disconnect your active WhatsApp session?')) return;
    setWaLoading(true);
    try {
      const data = await disconnectWhatsApp();
      setWaState(data);
      if (pollingRef.current) clearInterval(pollingRef.current);
      fetchConnections();
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleSignInWithGoogle = () => {
    window.location.href = '/api/auth/google/start';
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Log out of Gmail? Email will fall back to SMTP/Resend if configured.')) return;
    try {
      await disconnectGmail();
      fetchConnections();
    } catch (err) {
      console.error('Failed to disconnect Gmail:', err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'gmail':
        return <Mail className="w-5 h-5 text-red-500" />;
      case 'whatsapp':
        return <MessageCircle className="w-5 h-5 text-emerald-500" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-600" />;
      case 'google_places':
        return <MapPin className="w-5 h-5 text-blue-500" />;
      case 'reddit':
        return <MessageSquare className="w-5 h-5 text-orange-500" />;
      case 'groq':
        return <Bot className="w-5 h-5 text-purple-600" />;
      case 'website_extractor':
        return <Globe className="w-5 h-5 text-indigo-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
    }
  };

  const getComplianceBadge = (mode: string) => {
    switch (mode) {
      case 'authorized_oauth':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3" /> Official, compliant
          </span>
        );
      case 'human_in_the_loop':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3" /> AI draft, human sends
          </span>
        );
      case 'unofficial_risk_controlled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3 h-3" /> Unofficial client, risk-controlled
          </span>
        );
      default:
        return null;
    }
  };

  const otherConnections = connections.filter((c) => c.id !== 'gmail' && c.id !== 'whatsapp');
  const gmailConn = connections.find((c) => c.id === 'gmail');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      <div className="bg-gradient-to-r from-white via-[#faf7ff] to-[#ecdcff]/40 p-6 rounded-2xl border border-[#ecdcff] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="text-xl font-black text-[#251142]">Connections</h1>
          <p className="text-xs text-[#5c2f8f] max-w-2xl leading-relaxed">
            Log in to Gmail and WhatsApp below — no API keys to type. Google Maps works out of
            the box with free real data. YouTube, Reddit, and the Groq AI writer are optional
            upgrades a technical setup step can enable (see SETUP.md); nothing here requires you
            to paste a key. Instagram, Facebook, X, LinkedIn, Upwork, Freelancer and Fiverr are
            not offered — none of them provide a way for an app like this to log in and message
            other people on your behalf without violating their rules and risking a ban.
          </p>
        </div>
        <button
          onClick={fetchConnections}
          disabled={loading}
          className="p-2.5 text-[#5c2f8f] bg-white hover:bg-[#faf7ff] border border-[#ecdcff] rounded-xl transition shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick API Keys Fill Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100/80 text-[#8400ff] border border-purple-200">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#251142]">Configure Discovery & AI API Keys</h4>
            <p className="text-[11px] text-[#5c2f8f]">
              Directly fill or add Google Places, YouTube v3, Reddit, Groq AI, Gemini, and Resend keys in Settings without modifying code.
            </p>
          </div>
        </div>
        {onSelectTab && (
          <button
            onClick={() => onSelectTab('settings')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#8400ff] to-[#7200db] hover:from-[#7200db] hover:to-[#5c2f8f] transition flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>Fill API Keys 🔑</span>
          </button>
        )}
      </div>

      {/* Two primary login cards: WhatsApp QR + Gmail Sign-in */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WhatsApp */}
        <div className="bg-white rounded-2xl border border-[#ecdcff] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#251142]">WhatsApp</h3>
                <p className="text-xs text-[#5c2f8f]">Scan a QR code — messages send automatically once linked.</p>
              </div>
            </div>
            {waState?.status === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : waState?.status === 'qr_ready' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> Scan now
              </span>
            ) : waLoading || waState?.status === 'connecting' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#8400ff] border border-purple-200 shrink-0">
                <RefreshCw className="w-3 h-3 animate-spin" /> Starting...
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                Not linked
              </span>
            )}
          </div>

          {waLoading || waState?.status === 'connecting' ? (
            <div className="p-6 bg-[#faf7ff] rounded-2xl border border-[#ecdcff] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-9 h-9 border-3 border-[#8400ff] border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-xs font-black text-[#251142]">Connecting WhatsApp Gateway...</p>
                <p className="text-[11px] text-[#5c2f8f] mt-0.5">Generating live QR code for mobile scanner. Takes ~2 seconds.</p>
              </div>
            </div>
          ) : waState?.status === 'qr_ready' && waState.qrCodeDataUrl ? (
            <div className="p-5 bg-[#faf7ff] rounded-2xl border border-[#ecdcff] flex flex-col sm:flex-row items-center gap-5">
              <div className="p-3 bg-white rounded-2xl border border-[#ecdcff] shadow-sm shrink-0 flex flex-col items-center">
                <img
                  src={waState.qrCodeDataUrl}
                  alt="Scan WhatsApp QR Code"
                  className="w-44 h-44 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleConnectWhatsApp(true)}
                  disabled={waLoading}
                  className="mt-2.5 text-[11px] font-bold text-[#8400ff] hover:text-[#7200db] flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${waLoading ? 'animate-spin' : ''}`} />
                  <span>Regenerate QR Code</span>
                </button>
              </div>
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>QR Ready — Waiting for mobile scan</span>
                </div>
                <h4 className="text-xs font-black text-[#251142]">Scan with WhatsApp on your phone:</h4>
                <ol className="text-xs text-[#5c2f8f] list-decimal list-inside space-y-1.5 font-medium leading-relaxed">
                  <li>Open WhatsApp on your mobile device</li>
                  <li>Tap <strong>Settings</strong> (iPhone) or <strong>⋮ Menu</strong> (Android)</li>
                  <li>Tap <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                  <li>Point your phone camera at this QR code</li>
                </ol>
                <div className="text-[11px] text-[#715599] bg-white p-2.5 rounded-xl border border-[#ecdcff] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Anti-Ban rate limiting & human delay intervals are active.</span>
                </div>
              </div>
            </div>
          ) : waState?.status === 'connected' ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">WhatsApp Session Linked:</span>
                    <span className="ml-1 font-mono text-emerald-950 font-semibold">+{waState.userPhone || 'Active'}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Online</span>
              </div>
              <button
                onClick={handleDisconnectWhatsApp}
                disabled={waLoading}
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect WhatsApp Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {waState?.errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {waState.errorMessage}
                </div>
              )}
              <button
                onClick={() => handleConnectWhatsApp(true)}
                disabled={waLoading}
                className="w-full px-5 py-3 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-2 transition"
              >
                <QrCode className="w-4 h-4" />
                <span>{waLoading ? 'Generating QR Code...' : 'Connect WhatsApp (Open QR Code)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Gmail */}
        <div className="bg-white rounded-2xl border border-[#ecdcff] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-500 border border-red-200">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#251142]">Gmail</h3>
                <p className="text-xs text-[#5c2f8f]">{gmailConn?.description || 'Sign in with Google to send real email.'}</p>
              </div>
            </div>
            {gmailConn?.status === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                Not linked
              </span>
            )}
          </div>

          {gmailConn?.account_identifier && (
            <div className="p-2 bg-[#faf7ff] rounded-xl border border-[#ecdcff] text-xs font-mono text-[#5c2f8f] truncate">
              {gmailConn.account_identifier}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSignInWithGoogle}
              className="flex-1 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-[#8400ff] hover:bg-[#7200db] shadow-xs flex items-center justify-center gap-2 transition"
            >
              <Mail className="w-4 h-4" />
              {gmailConn?.status === 'connected' ? 'Re-connect / switch account' : 'Sign in with Google'}
            </button>
            {gmailConn?.status === 'connected' && (
              <button
                onClick={handleDisconnectGmail}
                title="Log out of Gmail"
                className="px-3.5 py-2.5 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Automatic status cards for verified engines */}
      <p className="text-xs text-[#5c2f8f] px-1">
        Active verified discovery engines & APIs — to configure or swap keys, edit the value in{' '}
        <code className="px-1 py-0.5 bg-[#faf7ff] border border-[#ecdcff] rounded text-[11px]">server/.env</code>{' '}
        and restart the server. See <a href="/SETUP.md" target="_blank" rel="noreferrer" className="underline font-semibold text-[#8400ff]">SETUP.md</a>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {otherConnections.map((conn) => {
          const isConnected = conn.status === 'connected';
          return (
            <div key={conn.id} className="bg-white rounded-2xl border border-[#ecdcff] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 bg-[#faf7ff] rounded-xl border border-[#ecdcff]">{getPlatformIcon(conn.platform)}</div>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      Optional
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#251142]">{conn.name}</h3>
                <p className="text-xs text-[#5c2f8f] mt-1 leading-relaxed">{conn.description}</p>
                <div className="mt-3">{getComplianceBadge(conn.compliance_mode)}</div>
              </div>
              {conn.setup_help_url && !isConnected && (
                <a
                  href={conn.setup_help_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 pt-3 border-t border-[#ecdcff] text-xs font-semibold text-[#8400ff] hover:underline flex items-center gap-1"
                >
                  Setup instructions <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
