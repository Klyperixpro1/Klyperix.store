import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User, Plus, Mic } from 'lucide-react';
import axios from 'axios';
import { PlatformSearchResult } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantChatProps {
  onLeadsFound: (leads: PlatformSearchResult[]) => void;
  selectedCountry: string;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({ onLeadsFound, selectedCountry }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey! I am your Klyperix Production Lead Assistant. Tell me what kind of leads you need and I will find them for you. (e.g. "Find real estate agents in Kuwait")',
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await axios.post('/api/assistant/chat', {
        message: userMsg,
        locationContext: selectedCountry
      });

      const { reply, action, leads } = res.data;

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }]);

      if (action === 'POPULATE_LEADS' && leads && leads.length > 0) {
        onLeadsFound(leads);
      }

    } catch (err) {
      console.error('Chat error', err);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Oops! I encountered an error connecting to the search engine. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 scrollbar-hide">
        {messages.length === 1 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-fade-in-up mt-8">
            <img src="/logo.png" alt="Klyperix Logo" className="w-16 h-16 rounded-2xl shadow-lg" />
            <h2 className="text-2xl font-semibold klyperix-gradient-text tracking-tight">Klyperix AI</h2>
            <p className="text-gray-500 max-w-sm text-sm">Ask anything to find leads, format data, or get outreach advice.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (idx === 0 && messages.length === 1) return null; // Hide welcome message if it's the only one, handled by splash above
          return (
            <div key={msg.id} className={`flex gap-4 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-fade-in-up`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden ${
                msg.role === 'assistant' ? 'bg-black' : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300'
              }`}>
                {msg.role === 'assistant' ? <img src="/logo.png" alt="AI" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-3xl text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'assistant' 
                  ? 'bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] text-gray-800 dark:text-gray-100 rounded-tl-sm' 
                  : 'bg-gray-100 dark:bg-[#222] text-gray-800 dark:text-gray-100 rounded-tr-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-4 max-w-[85%] animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
              <img src="/logo.png" alt="AI" className="w-full h-full object-cover" />
            </div>
            <div className="p-4 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-[#8400ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#8400ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[#bb7eff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Google AI Floating Input Bar */}
      <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center">
        <div className="relative flex items-center w-full max-w-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] shadow-xl rounded-full px-2 py-1.5 transition-shadow hover:shadow-2xl">
          <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors shrink-0">
            <Plus className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything"
            className="flex-1 bg-transparent border-none text-[15px] px-4 py-3 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-500"
          />
          
          {input.trim() ? (
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="p-2.5 mr-1 bg-[#8400ff] text-white rounded-full hover:bg-[#5c2f8f] disabled:opacity-50 transition-colors shrink-0 shadow-md"
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          ) : (
            <button className="p-2.5 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0">
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
