import React, { useState, useEffect } from 'react';
import {
  getInboundReplies,
  markRepliesAsRead,
  sendQuickWhatsAppResponse,
  sendDirectEmailMessage,
  generateAISmartReply,
  enhanceReplyDraft,
  updateLead,
} from '../../services/api';
import { InboundReply, LeadStatus } from '../../types';
import {
  Inbox,
  MessageCircle,
  Mail,
  CheckCircle2,
  Sparkles,
  Send,
  User,
  Flame,
  Check,
  CheckCheck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RepliesInboxProps {
  onRepliesUpdated: () => void;
}

export const RepliesInbox: React.FC<RepliesInboxProps> = ({ onRepliesUpdated }) => {
  const [replies, setReplies] = useState<InboundReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplyId, setSelectedReplyId] = useState<number | null>(null);
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [generatingAIReply, setGeneratingAIReply] = useState(false);
  const [enhancingDraft, setEnhancingDraft] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchReplies = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getInboundReplies();
      setReplies(data.replies || []);

      if ((data.replies || []).length > 0 && selectedReplyId === null) {
        setSelectedReplyId(data.replies[0].id);
      }
    } catch (err) {
      console.error('Failed to load inbound replies:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();

    const timer = setInterval(() => {
      fetchReplies(true);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const activeReply = replies.find((r) => r.id === selectedReplyId) || replies[0];

  const handleSelectReply = async (reply: InboundReply) => {
    setSelectedReplyId(reply.id);
    if (!reply.is_read) {
      try {
        await markRepliesAsRead([reply.id]);
        setReplies((prev) =>
          prev.map((r) => (r.id === reply.id ? { ...r, is_read: 1 } : r))
        );
        onRepliesUpdated();
      } catch (err) {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markRepliesAsRead();
      setReplies((prev) => prev.map((r) => ({ ...r, is_read: 1 })));
      onRepliesUpdated();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleGenerateAISmartReply = async () => {
    if (!activeReply) return;
    setGeneratingAIReply(true);
    setActionMsg(null);
    try {
      const res = await generateAISmartReply({
        incomingMessage: activeReply.message_text,
        originalPitch: activeReply.original_pitch,
        leadName: activeReply.lead_name || activeReply.sender_name,
      });

      setResponseText(res.reply);
      setActionMsg('Drafted personalized reply.');
    } catch (err) {
      console.error('Failed to generate smart reply:', err);
      setActionMsg('Failed to draft response.');
    } finally {
      setGeneratingAIReply(false);
    }
  };

  const handleEnhanceDraft = async () => {
    if (!activeReply || !responseText.trim()) return;
    setEnhancingDraft(true);
    setActionMsg(null);
    try {
      const res = await enhanceReplyDraft({
        rawDraft: responseText.trim(),
        incomingMessage: activeReply.message_text,
        leadName: activeReply.lead_name || activeReply.sender_name,
      });
      setResponseText(res.reply);
      setActionMsg('AI enhanced your draft — review, then send.');
    } catch (err) {
      console.error('Failed to enhance draft:', err);
      setActionMsg('Failed to enhance draft.');
    } finally {
      setEnhancingDraft(false);
    }
  };

  const handleSendQuickResponse = async () => {
    if (!activeReply || !responseText.trim()) return;
    setSendingResponse(true);
    setActionMsg(null);

    try {
      if (activeReply.channel === 'whatsapp') {
        const phone = activeReply.lead_phone || (activeReply.sender_id?.replace(/[^0-9]/g, '').length >= 7 ? activeReply.sender_id : '');
        if (!phone) {
          setActionMsg('Cannot send WhatsApp reply: Lead does not have a valid phone number recorded.');
          setSendingResponse(false);
          return;
        }
        await sendQuickWhatsAppResponse({
          leadId: activeReply.lead_id,
          phone,
          message: responseText.trim(),
        });
      } else {
        const email = activeReply.lead_email || (activeReply.sender_id?.includes('@') ? activeReply.sender_id : '');
        if (!email || !email.includes('@')) {
          setActionMsg('Cannot send Email reply: Lead does not have a valid email address recorded.');
          setSendingResponse(false);
          return;
        }
        await sendDirectEmailMessage({
          leadId: activeReply.lead_id,
          to: email,
          subject: `Re: Conversation with Klyperix Studio`,
          message: responseText.trim(),
        });
      }

      setActionMsg('Reply sent successfully.');
      setResponseText('');
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      fetchReplies();
      onRepliesUpdated();
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      setActionMsg(err.message || 'Failed to dispatch reply.');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleUpdateStatus = async (leadId: number, status: LeadStatus) => {
    try {
      await updateLead(leadId, { status });
      if (status === 'converted') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }
      fetchReplies(true);
      onRepliesUpdated();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const filteredReplies = replies.filter((r) => {
    if (filterChannel === 'all') return true;
    return r.channel === filterChannel;
  });

  const unreadCount = replies.filter((r) => !r.is_read).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#ecdcff] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#faf7ff] rounded-xl border border-[#ecdcff]">
            <Inbox className="w-5 h-5 text-[#8400ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#251142]">Unified Inbound Replies</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p className="text-xs text-[#5c2f8f] mt-0.5">
              Live incoming prospect responses across WhatsApp and Email in one central hub.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-1.5 text-xs font-bold text-[#5c2f8f] bg-[#faf7ff] hover:bg-[#ecdcff] rounded-xl border border-[#ecdcff] transition"
            >
              Mark All as Read
            </button>
          )}

          <button
            onClick={() => fetchReplies()}
            disabled={loading}
            className="p-2 text-[#5c2f8f] bg-[#faf7ff] hover:bg-[#ecdcff] rounded-xl border border-[#ecdcff] transition"
            title="Refresh Inbox"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {actionMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold text-emerald-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Conversation Split View */}
      {replies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Replies List */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#ecdcff] p-4 h-[700px] flex flex-col shadow-xs">
            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#faf7ff] rounded-xl border border-[#ecdcff] mb-3">
              {(['all', 'whatsapp', 'email'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setFilterChannel(ch)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition ${
                    filterChannel === ch
                      ? 'bg-[#8400ff] text-white shadow-xs'
                      : 'text-[#5c2f8f] hover:bg-[#ecdcff]/40'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredReplies.map((reply) => {
                const isSelected = activeReply?.id === reply.id;
                const isUnread = !reply.is_read;

                return (
                  <div
                    key={reply.id}
                    onClick={() => handleSelectReply(reply)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#8400ff] bg-[#faf7ff] ring-2 ring-[#8400ff]/20'
                        : 'border-[#ecdcff] hover:bg-[#fdfdfc]'
                    } ${isUnread ? 'border-l-4 border-l-[#8400ff]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {reply.channel === 'whatsapp' ? (
                          <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Mail className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-[#251142] truncate max-w-[180px]">
                          {reply.lead_name || reply.sender_name || 'Prospect'}
                        </h4>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(reply.received_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-[#5c2f8f] mt-1.5 line-clamp-2 leading-relaxed font-medium">
                      "{reply.message_text}"
                    </p>

                    <div className="mt-2 pt-2 border-t border-[#ecdcff] flex items-center justify-between text-[10px] flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-[#ecdcff] text-[#5c2f8f] capitalize">
                        via {reply.channel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-purple-50 text-[#8400ff]">
                        {reply.sentiment?.toneLabel}
                      </span>

                      {reply.lead_status && (
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          {reply.lead_status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Chat & Reply Pane */}
          {activeReply && (
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#ecdcff] p-5 h-[700px] flex flex-col justify-between shadow-xs">
              {/* Top Header info */}
              <div className="pb-3 border-b border-[#ecdcff] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#faf7ff] rounded-xl border border-[#ecdcff]">
                    {activeReply.channel === 'whatsapp' ? (
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Mail className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-black text-[#251142]">
                        {activeReply.lead_name || activeReply.sender_name || 'Prospect'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ecdcff] text-[#5c2f8f] capitalize">
                        via {activeReply.channel}
                      </span>
                    </div>
                    <p className="text-xs text-[#5c2f8f] mt-0.5">
                      {activeReply.lead_phone || activeReply.lead_email || activeReply.sender_id} • Received {new Date(activeReply.received_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {activeReply.lead_id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(activeReply.lead_id!, 'converted')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Converted 🎉</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
                {/* Outbound Pitch */}
                {activeReply.original_pitch && (
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium">Initial Pitch Sent:</span>
                    <div className="p-3.5 rounded-2xl rounded-tr-none bg-[#faf7ff] border border-[#ecdcff] text-xs text-[#251142] max-w-lg leading-relaxed shadow-xs">
                      {activeReply.original_pitch}
                    </div>
                  </div>
                )}

                {/* Inbound Reply */}
                <div className="flex flex-col items-start space-y-1">
                  <span className="text-[10px] text-[#8400ff] font-bold">
                    Incoming Message from {activeReply.lead_name || 'Prospect'}:
                  </span>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-[#faf7ff] border border-[#bb7eff]/40 text-xs font-semibold text-[#251142] max-w-lg leading-relaxed shadow-xs">
                    {activeReply.message_text}
                  </div>
                </div>
              </div>

              {/* Reply composer — replies are always human-sent, AI only drafts/enhances */}
              <div className="pt-3 border-t border-[#ecdcff] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#5c2f8f] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your reply — nothing sends until you click Send</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateAISmartReply}
                      disabled={generatingAIReply}
                      title="Preset: fill the box with a ready-made sentiment-matched reply"
                      className="px-3 py-1 text-xs font-bold text-[#8400ff] bg-[#ecdcff]/50 hover:bg-[#ecdcff] rounded-xl border border-[#ecdcff] flex items-center gap-1.5 transition"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${generatingAIReply ? 'animate-spin' : ''}`} />
                      <span>Preset Reply</span>
                    </button>

                    <button
                      onClick={handleEnhanceDraft}
                      disabled={enhancingDraft || !responseText.trim()}
                      title="Custom: AI enhance — polish whatever you've typed into a professional reply"
                      className="px-3 py-1 text-xs font-bold text-[#8400ff] bg-[#ecdcff]/50 hover:bg-[#ecdcff] rounded-xl border border-[#ecdcff] flex items-center gap-1.5 transition disabled:opacity-40"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${enhancingDraft ? 'animate-spin' : ''}`} />
                      <span>Enhance My Draft</span>
                    </button>
                  </div>
                </div>

                {/* Response Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write your own reply (Custom: Manual — sent exactly as typed), or use Preset Reply / Enhance My Draft above..."
                    className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl border border-[#ecdcff] bg-[#faf7ff] focus:bg-white text-[#251142]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendQuickResponse();
                    }}
                  />

                  <button
                    onClick={handleSendQuickResponse}
                    disabled={sendingResponse || !responseText.trim()}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#8400ff] hover:bg-[#7200db] rounded-xl flex items-center gap-1.5 shadow-xs transition disabled:opacity-40"
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingResponse ? 'animate-spin' : ''}`} />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-[#ecdcff] p-16 text-center space-y-3">
          <div className="p-3 bg-[#faf7ff] rounded-2xl w-fit mx-auto border border-[#ecdcff] text-[#8400ff]">
            <Inbox className="w-8 h-8 text-[#8400ff]" />
          </div>
          <h3 className="text-base font-bold text-[#251142]">Inbound Inbox is Ready & Listening</h3>
          <p className="text-xs text-[#5c2f8f] max-w-md mx-auto leading-relaxed">
            When prospective clients reply to your email or WhatsApp campaigns, their messages will immediately appear here for 1-click response.
          </p>
        </div>
      )}
    </div>
  );
};
