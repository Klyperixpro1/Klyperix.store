import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, testSmtpSettings, testResendKey, testApiKey } from '../../services/api';
import { AppSettings, PitchTone } from '../../types';
import {
  KeyRound,
  Save,
  Mail,
  CheckCircle2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  Globe,
  Youtube,
  MessageSquare,
  Bot,
  Sparkles,
  Phone,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Check,
  Copy,
  Share2,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsProps {
  onSettingsSaved: () => void;
}

interface CustomKeyItem {
  id: string;
  name: string;
  key: string;
  value: string;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Visibility toggles for masked keys
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // SMTP & Resend test states
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingResend, setTestingResend] = useState(false);
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Google Maps & YouTube verify states
  const [verifyingMaps, setVerifyingMaps] = useState(false);
  const [mapsResult, setMapsResult] = useState<{ success: boolean; message: string } | null>(null);
  const [verifyingYT, setVerifyingYT] = useState(false);
  const [ytResult, setYtResult] = useState<{ success: boolean; message: string } | null>(null);

  // Custom API Keys Section State
  const [customKeys, setCustomKeys] = useState<CustomKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyId, setNewKeyId] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
      if (data.customApiKeys && Array.isArray(data.customApiKeys)) {
        setCustomKeys(data.customApiKeys);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: Partial<AppSettings> = {
        ...settings,
        customApiKeys: customKeys,
      };
      await saveSettings(payload);
      setSaveMsg({ type: 'success', text: '✅ All API keys & settings saved permanently!' });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onSettingsSaved();
      await loadSettings();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setSaveMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Verify & Save Google Maps API Key ──────────────────────────────────────
  const handleVerifyGoogleMaps = async () => {
    if (!settings.googlePlacesApiKey?.trim()) {
      setMapsResult({ success: false, message: '❌ Please enter your Google Maps API Key first.' });
      return;
    }
    setVerifyingMaps(true);
    setMapsResult(null);
    try {
      const res = await testApiKey('google_places', settings.googlePlacesApiKey.trim());
      setMapsResult({ success: res.success, message: res.message });
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        await loadSettings();
        onSettingsSaved();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed.';
      setMapsResult({ success: false, message: `❌ ${msg}` });
    } finally {
      setVerifyingMaps(false);
    }
  };

  // ── Verify & Save YouTube API Key ──────────────────────────────────────────
  const handleVerifyYouTube = async () => {
    if (!settings.youtubeApiKey?.trim()) {
      setYtResult({ success: false, message: '❌ Please enter your YouTube API Key first.' });
      return;
    }
    setVerifyingYT(true);
    setYtResult(null);
    try {
      const res = await testApiKey('youtube', settings.youtubeApiKey.trim());
      setYtResult({ success: res.success, message: res.message });
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        await loadSettings();
        onSettingsSaved();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed.';
      setYtResult({ success: false, message: `❌ ${msg}` });
    } finally {
      setVerifyingYT(false);
    }
  };

  const handleConnectSmtp = async () => {
    if (!settings.smtpUser || !settings.smtpPass) return;
    setTestingSmtp(true);
    setSmtpResult(null);
    try {
      await saveSettings({ ...settings, customApiKeys: customKeys });
      const res = await testSmtpSettings({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
      });
      setSmtpResult(res);
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        await loadSettings();
        onSettingsSaved();
      }
    } catch (err: any) {
      setSmtpResult({
        success: false,
        message: err.response?.data?.message || err.message || 'SMTP connection failed.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleDisconnectSmtp = async () => {
    if (!window.confirm('Disconnect this SMTP email account?')) return;
    const updated = { ...settings, smtpUser: '', smtpPass: '', customApiKeys: customKeys };
    setSettings(updated);
    await saveSettings(updated);
    await loadSettings();
    onSettingsSaved();
  };

  const handleConnectResend = async () => {
    if (!settings.resendApiKey) return;
    setTestingResend(true);
    setResendResult(null);
    try {
      await saveSettings({ ...settings, customApiKeys: customKeys });
      const res = await testResendKey(settings.resendApiKey);
      setResendResult(res);
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        await loadSettings();
        onSettingsSaved();
      }
    } catch (err: any) {
      setResendResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Resend verification failed.',
      });
    } finally {
      setTestingResend(false);
    }
  };

  // Add a new custom API Key
  const handleAddCustomKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      alert('Please enter both an API Name and API Key value.');
      return;
    }
    const cleanId =
      newKeyId.trim() ||
      newKeyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') + '_key';

    const newItem: CustomKeyItem = {
      id: Date.now().toString(),
      name: newKeyName.trim(),
      key: cleanId,
      value: newKeyValue.trim(),
    };

    const updated = [...customKeys, newItem];
    setCustomKeys(updated);
    setNewKeyName('');
    setNewKeyId('');
    setNewKeyValue('');
    setShowNewKeyForm(false);

    // Save immediately
    saveSettings({ ...settings, customApiKeys: updated })
      .then(() => {
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
        setSaveMsg({ type: 'success', text: `Added custom API key: ${newItem.name}` });
        onSettingsSaved();
      })
      .catch((e) => console.error(e));
  };

  // Delete a custom API Key
  const handleDeleteCustomKey = (id: string, name: string) => {
    if (!window.confirm(`Remove custom API key for "${name}"?`)) return;
    const updated = customKeys.filter((k) => k.id !== id);
    setCustomKeys(updated);
    saveSettings({ ...settings, customApiKeys: updated })
      .then(() => {
        setSaveMsg({ type: 'success', text: `Removed ${name}` });
        onSettingsSaved();
      })
      .catch((e) => console.error(e));
  };

  const configuredCount = [
    Boolean(settings.googlePlacesApiKey),
    Boolean(settings.youtubeApiKey),
    Boolean(settings.redditApiKey),
    Boolean(settings.groqApiKey),
    Boolean(settings.geminiApiKey),
    Boolean(settings.resendApiKey || settings.smtpUser),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      {/* Top Header & Save Strip */}
      <div className="bg-gradient-to-r from-white via-[#faf7ff] to-purple-50 p-6 rounded-2xl border border-[#ecdcff] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white rounded-2xl border border-[#ecdcff] shadow-xs text-[#8400ff]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#251142]">API Keys & Integrations</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#8400ff] border border-purple-200">
                {configuredCount} of 6 Core Active
              </span>
            </div>
            <p className="text-xs text-[#5c2f8f] mt-0.5 max-w-xl">
              Fill in your API keys below to power real-time discovery and AI generation. All keys are saved securely in your local database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveMsg && (
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                saveMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {saveMsg.text}
            </span>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#8400ff] to-[#7200db] hover:from-[#7200db] hover:to-[#5c2f8f] rounded-xl flex items-center gap-2 shadow-sm transition disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Apply Keys'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Real-Time Lead Discovery APIs */}
      <div className="bg-white rounded-2xl border border-[#ecdcff] p-6 shadow-xs space-y-5">
        <div className="border-b border-[#ecdcff]/80 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#251142] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#8400ff]" />
              <span>Real-Time Lead Discovery APIs</span>
            </h2>
            <p className="text-xs text-[#5c2f8f] mt-0.5">
              Extract verified local businesses, YouTube creator channels, and Reddit client gigs with real phone numbers and emails.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Real Leads
          </span>
        </div>

        <div className="space-y-4">
          {/* 1. Google Places API Key */}
          <div className="p-4 rounded-xl border border-[#ecdcff] bg-[#faf7ff]/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#251142]">Google Places API Key</span>
                {settings.googlePlacesApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Free OSM Fallback Active
                  </span>
                )}
              </div>
              <a
                href="https://console.cloud.google.com/google/maps-apis"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Key from Google Cloud</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#5c2f8f]">
              Extracts high-ticket businesses (clinics, agencies, lawyers, contractors) worldwide with phone, address, and Google rating.
            </p>
            <div className="relative">
              <input
                type={showKeys['googlePlacesApiKey'] ? 'text' : 'password'}
                value={settings.googlePlacesApiKey || ''}
                onChange={(e) => {
                  setSettings((prev) => ({ ...prev, googlePlacesApiKey: e.target.value }));
                  setMapsResult(null);
                }}
                placeholder="AIzaSyB..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-10 focus:border-[#8400ff] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('googlePlacesApiKey')}
                className="absolute right-3 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                title="Toggle Visibility"
              >
                {showKeys['googlePlacesApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Smart Detection Banner for OAuth Client Secret */}
            {settings.googlePlacesApiKey?.trim().startsWith('GOCSPX-') && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Important: This is a Google OAuth Client Secret, NOT an API Key</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Keys starting with <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">GOCSPX-</code> are OAuth Client Secrets (for Google Login/Gmail). A Google Maps API key starts with <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">AIzaSy...</code>.
                </p>
                <div className="pt-1 text-amber-800 font-medium">
                  👉 <b>How to get your API key in Google Cloud Console:</b> Click <b>&apos;+ CREATE CREDENTIALS&apos;</b> at the top of the Credentials page → select <b>&apos;API key&apos;</b>. Copy the key starting with <b>AIzaSy...</b> and paste it here.
                </div>
              </div>
            )}

            {/* Verify & Save button */}
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={handleVerifyGoogleMaps}
                disabled={verifyingMaps || !settings.googlePlacesApiKey?.trim()}
                className="px-4 py-1.5 text-[11px] font-bold rounded-xl bg-gradient-to-r from-[#8400ff] to-[#7200db] text-white hover:from-[#7200db] hover:to-[#5c2f8f] disabled:opacity-40 flex items-center gap-1.5 transition shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {verifyingMaps ? 'Verifying...' : 'Verify & Save Permanently'}
              </button>
              {mapsResult && (
                <div className={`text-[11px] font-semibold p-2.5 rounded-xl border flex flex-col gap-1 ${
                  mapsResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span>{mapsResult.message}</span>
                  </div>
                  {mapsResult.message.toLowerCase().includes('billing') && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-200/60 text-emerald-900">
                      <span>👉</span>
                      <a
                        href="https://console.cloud.google.com/project/_/billing/enable"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold text-[#8400ff] hover:text-[#5c2f8f] flex items-center gap-1"
                      >
                        Enable Free Billing on Google Cloud ($200 monthly free credit)
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. YouTube Data API v3 Key */}
          <div className="p-4 rounded-xl border border-[#ecdcff] bg-[#faf7ff]/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#251142]">YouTube Data API v3 Key</span>
                {settings.youtubeApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Key Needed for Channel Leads
                  </span>
                )}
              </div>
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free YouTube API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#5c2f8f]">
              Finds creators & business channels by niche, subscriber count, and verified contact business emails for video/design pitching.
            </p>
            <div className="relative">
              <input
                type={showKeys['youtubeApiKey'] ? 'text' : 'password'}
                value={settings.youtubeApiKey || ''}
                onChange={(e) => {
                  setSettings((prev) => ({ ...prev, youtubeApiKey: e.target.value }));
                  setYtResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-10 focus:border-[#8400ff] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('youtubeApiKey')}
                className="absolute right-3 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                title="Toggle Visibility"
              >
                {showKeys['youtubeApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Verify & Save button */}
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={handleVerifyYouTube}
                disabled={verifyingYT || !settings.youtubeApiKey?.trim()}
                className="px-4 py-1.5 text-[11px] font-bold rounded-xl bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 transition shadow-sm"
              >
                <Youtube className="w-3.5 h-3.5" />
                {verifyingYT ? 'Verifying...' : 'Verify & Save Permanently'}
              </button>
              {ytResult && (
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-xl border ${
                  ytResult.success
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {ytResult.message}
                </span>
              )}
            </div>
          </div>

          {/* 3. Reddit API Credentials */}
          <div className="p-4 rounded-xl border border-[#ecdcff] bg-[#faf7ff]/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#251142]">Reddit API Credentials</span>
                {settings.redditApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Public RSS Fallback Active
                  </span>
                )}
              </div>
              <a
                href="https://www.reddit.com/prefs/apps"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Create Reddit App ↗</span>
              </a>
            </div>
            <p className="text-[11px] text-[#5c2f8f]">
              Searches live client hiring posts across r/forhire, r/freelance_forhire, r/DesignJobs. Format: <code className="bg-white px-1 rounded border border-[#ecdcff]">client_id:client_secret</code> or bearer token.
            </p>
            <div className="relative">
              <input
                type={showKeys['redditApiKey'] ? 'text' : 'password'}
                value={settings.redditApiKey || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, redditApiKey: e.target.value }))}
                placeholder="your_client_id:your_client_secret"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-10 focus:border-[#8400ff] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('redditApiKey')}
                className="absolute right-3 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                title="Toggle Visibility"
              >
                {showKeys['redditApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI Pitch & Cold Outreach Engines */}
      <div className="bg-white rounded-2xl border border-[#ecdcff] p-6 shadow-xs space-y-5">
        <div className="border-b border-[#ecdcff]/80 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#251142] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#8400ff]" />
              <span>AI Cold Pitch & Outreach Copy Engines</span>
            </h2>
            <p className="text-xs text-[#5c2f8f] mt-0.5">
              Generates sub-second personalized pitches, tailored proposals, and social content for outreach.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-[#8400ff] border border-purple-200">
            Sub-second Generation
          </span>
        </div>

        <div className="space-y-4">
          {/* 1. Groq AI API Key (Llama 3.3 70B) */}
          <div className="p-4 rounded-xl border border-[#ecdcff] bg-[#faf7ff]/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#251142]">Groq AI Key (Llama 3.3 70B Engine)</span>
                {settings.groqApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Active (Sub-second speed)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-50 text-[#8400ff] border border-purple-200">
                    Recommended (Free tier)
                  </span>
                )}
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Groq API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#5c2f8f]">
              Ultra-fast AI generation (~400 tokens/sec) for instant cold emails, WhatsApp opening lines, and tailored client pitches.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <input
                  type={showKeys['groqApiKey'] ? 'text' : 'password'}
                  value={settings.groqApiKey || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, groqApiKey: e.target.value }))}
                  placeholder="gsk_..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-10 focus:border-[#8400ff] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('groqApiKey')}
                  className="absolute right-3 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                  title="Toggle Visibility"
                >
                  {showKeys['groqApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <select
                value={settings.groqModel || 'llama-3.3-70b-versatile'}
                onChange={(e) => setSettings((prev) => ({ ...prev, groqModel: e.target.value }))}
                className="px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142] font-semibold"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Best)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
              </select>
            </div>
          </div>

          {/* 2. Google Gemini API Key */}
          <div className="p-4 rounded-xl border border-[#ecdcff] bg-[#faf7ff]/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#251142]">Google Gemini API Key</span>
                {settings.geminiApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Optional
                  </span>
                )}
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Gemini Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#5c2f8f]">
              Gemini 2.0 / 1.5 Flash for image & video lead analysis, social media post creation in Content Studio, and reels scripts.
            </p>
            <div className="relative">
              <input
                type={showKeys['geminiApiKey'] ? 'text' : 'password'}
                value={settings.geminiApiKey || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-10 focus:border-[#8400ff] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility('geminiApiKey')}
                className="absolute right-3 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                title="Toggle Visibility"
              >
                {showKeys['geminiApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Dedicated Custom API Keys (API Add Section) */}
      <div className="bg-white rounded-2xl border border-[#ecdcff] p-6 shadow-xs space-y-5">
        <div className="border-b border-[#ecdcff]/80 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#251142] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#8400ff]" />
              <span>Custom / Additional API Keys</span>
            </h2>
            <p className="text-xs text-[#5c2f8f] mt-0.5">
              Add any extra API keys for custom integrations (e.g. OpenAI, Anthropic Claude, Apollo.io, Hunter.io, ScraperAPI).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewKeyForm((v) => !v)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#8400ff] hover:bg-[#7200db] transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New API Key</span>
          </button>
        </div>

        {/* Inline Add New Key Form */}
        {showNewKeyForm && (
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3">
            <h4 className="text-xs font-black text-[#251142]">Add Custom API Key</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#5c2f8f] block mb-1">Service / API Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. OpenAI GPT-4, Apollo.io, Hunter"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5c2f8f] block mb-1">
                  Key Identifier <span className="text-[#8d76ab] font-normal">(Optional variable name)</span>
                </label>
                <input
                  type="text"
                  value={newKeyId}
                  onChange={(e) => setNewKeyId(e.target.value)}
                  placeholder="e.g. openaiApiKey"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#5c2f8f] block mb-1">API Key Value</label>
              <input
                type="text"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewKeyForm(false)}
                className="px-3 py-1.5 text-xs text-[#5c2f8f] hover:bg-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomKey}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#8400ff] hover:bg-[#7200db] rounded-xl transition shadow-xs"
              >
                Save Custom Key
              </button>
            </div>
          </div>
        )}

        {/* Existing Custom Keys List */}
        {customKeys.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[#ecdcff] text-center bg-[#faf7ff]/40">
            <p className="text-xs text-[#5c2f8f]">No custom API keys added yet.</p>
            <p className="text-[11px] text-[#8d76ab] mt-0.5">Click &quot;Add New API Key&quot; above to store additional integration tokens.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customKeys.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-[#ecdcff] bg-[#faf7ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#251142]">{item.name}</span>
                    <span className="px-2 py-0.2 rounded-md font-mono text-[9px] bg-white text-[#715599] border border-[#ecdcff]">
                      {item.key}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#5c2f8f] mt-1">
                    {showKeys[item.id] ? item.value : '••••••••••••••••' + item.value.slice(-4)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(item.id)}
                    className="p-1.5 text-[#5c2f8f] hover:bg-white border border-transparent hover:border-[#ecdcff] rounded-lg transition"
                    title="Toggle Visibility"
                  >
                    {showKeys[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomKey(item.id, item.name)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition"
                    title="Delete Key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: Email Delivery (Resend API) */}
      <div className="bg-white rounded-2xl border border-[#ecdcff] p-6 shadow-xs space-y-4">
        <div className="border-b border-[#ecdcff]/80 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#251142] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8400ff]" />
              <span>Direct Cold Email Delivery (Resend API)</span>
            </h2>
            <p className="text-xs text-[#5c2f8f] mt-0.5">
              Sign in with Google in Connections is recommended for personal Gmail. For transactional domain email, configure Resend API here.
            </p>
          </div>
        </div>

        {/* Resend API Card */}
        <div className="bg-[#faf7ff] rounded-2xl border border-[#ecdcff] p-4 space-y-2 max-w-xl">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-[#251142]">Resend API Key</h4>
            {settings.hasResendKey && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" /> Connected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type={showKeys['resendApiKey'] ? 'text' : 'password'}
              value={settings.resendApiKey || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, resendApiKey: e.target.value }))}
              placeholder="re_..."
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
            />
            <button
              type="button"
              onClick={() => toggleKeyVisibility('resendApiKey')}
              className="p-2 text-[#8d76ab] hover:text-[#251142]"
              title="Toggle Visibility"
            >
              {showKeys['resendApiKey'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleConnectResend}
              disabled={testingResend || !settings.resendApiKey}
              className="px-3 py-2 text-xs font-bold rounded-xl text-white bg-[#8400ff] hover:bg-[#7200db] transition shrink-0"
            >
              {testingResend ? 'Testing...' : 'Test'}
            </button>
          </div>
          {resendResult && (
            <div
              className={`p-2 rounded-xl text-[11px] font-bold ${
                resendResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {resendResult.message}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: Social Media Publishing APIs & Client Credentials */}
      <div className="bg-white rounded-2xl border border-[#ecdcff] p-6 shadow-xs space-y-5">
        <div className="border-b border-[#ecdcff]/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-[#251142] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#8400ff]" />
              <span>Social Media Publishing APIs & Client Credentials</span>
            </h2>
            <p className="text-xs text-[#5c2f8f] mt-0.5">
              Fill in your official Developer App Client IDs and Secrets for direct social media publishing & automated posting.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-[#8400ff] border border-purple-200 self-start sm:self-auto">
            Social Credentials
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LinkedIn Developer Credentials */}
          <div className="bg-[#faf7ff] rounded-2xl border border-[#ecdcff] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#251142]">LinkedIn Developer App</h4>
                  <span className="text-[9px] text-slate-400">OAuth 2.0 (w_member_social)</span>
                </div>
              </div>
              <a
                href="https://www.linkedin.com/developers/"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Keys</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">LinkedIn Client ID</label>
                <input
                  type="text"
                  value={settings.linkedinClientId || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, linkedinClientId: e.target.value }))}
                  placeholder="e.g. 78xxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">LinkedIn Client Secret</label>
                <div className="relative">
                  <input
                    type={showKeys['linkedinClientSecret'] ? 'text' : 'password'}
                    value={settings.linkedinClientSecret || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, linkedinClientSecret: e.target.value }))}
                    placeholder="Client Secret"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('linkedinClientSecret')}
                    className="absolute right-2.5 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                  >
                    {showKeys['linkedinClientSecret'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* X (Twitter) Developer Credentials */}
          <div className="bg-[#faf7ff] rounded-2xl border border-[#ecdcff] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
                  <Twitter className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#251142]">X (Twitter) Developer App</h4>
                  <span className="text-[9px] text-slate-400">API Key & Secret (tweet.write)</span>
                </div>
              </div>
              <a
                href="https://developer.x.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Keys</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">API Key / Client ID</label>
                <input
                  type="text"
                  value={settings.xApiKey || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, xApiKey: e.target.value }))}
                  placeholder="e.g. Consumer Key or Client ID"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">API Secret / Client Secret</label>
                <div className="relative">
                  <input
                    type={showKeys['xApiSecret'] ? 'text' : 'password'}
                    value={settings.xApiSecret || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, xApiSecret: e.target.value }))}
                    placeholder="API Secret Key"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('xApiSecret')}
                    className="absolute right-2.5 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                  >
                    {showKeys['xApiSecret'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Meta (Instagram & Facebook) Credentials */}
          <div className="bg-[#faf7ff] rounded-2xl border border-[#ecdcff] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
                  <Instagram className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#251142]">Meta (Instagram & Facebook) App</h4>
                  <span className="text-[9px] text-slate-400">Graph API Content Publishing</span>
                </div>
              </div>
              <a
                href="https://developers.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Meta Portal</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Meta App ID (Client ID)</label>
                <input
                  type="text"
                  value={settings.metaAppId || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, metaAppId: e.target.value }))}
                  placeholder="e.g. 1029384756..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Meta App Secret / Access Token</label>
                <div className="relative">
                  <input
                    type={showKeys['metaAppSecret'] ? 'text' : 'password'}
                    value={settings.metaAppSecret || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, metaAppSecret: e.target.value }))}
                    placeholder="App Secret or Page Access Token"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('metaAppSecret')}
                    className="absolute right-2.5 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                  >
                    {showKeys['metaAppSecret'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* YouTube Data API Key */}
          <div className="bg-[#faf7ff] rounded-2xl border border-[#ecdcff] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                  <Youtube className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#251142]">YouTube Data API v3</h4>
                  <span className="text-[9px] text-slate-400">Creator Search & Shorts Metadata</span>
                </div>
              </div>
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#8400ff] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Google Cloud</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">YouTube API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['youtubeApiKey'] ? 'text' : 'password'}
                    value={settings.youtubeApiKey || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, youtubeApiKey: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#ecdcff] bg-white text-[#251142] pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('youtubeApiKey')}
                    className="absolute right-2.5 top-2.5 text-[#8d76ab] hover:text-[#251142]"
                  >
                    {showKeys['youtubeApiKey'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic pt-1">
                Enables YouTube Creator Search and Shorts title/tag generation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="pt-3 border-t border-[#ecdcff]/80 flex justify-end">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#8400ff] hover:bg-[#7200db] rounded-xl flex items-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Apply All Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
