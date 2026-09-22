import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface OnboardingTourProps {
  onClose: () => void;
}

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Klyperix Outreach',
    body: "This app finds real business leads, writes a personalized first message with AI, and sends it for you across the channels you connect. Let's walk through it in a minute.",
  },
  {
    title: '1. Connections — log in, no API keys',
    body: 'Scan a QR code to connect WhatsApp, or click Sign in with Google to connect Gmail. Google Maps search already works for free out of the box. That\'s it — no keys to paste.',
  },
  {
    title: '2. Find Leads — real sources only',
    body: 'Search Google Maps (free, real businesses), YouTube creators, and Reddit hiring posts. Every result is real data or an honest "nothing found" message — never a fabricated business.',
  },
  {
    title: '3. Bulk Campaign — AI sends the first message',
    body: 'Select leads, generate a personalized first message with AI, and send it automatically over WhatsApp or email. Daily send limits protect your accounts from bans.',
  },
  {
    title: '4. Replies Inbox — you always send replies',
    body: 'AI never auto-sends a reply. When a lead responds, you see it here and choose: a ready-made preset, "Enhance My Draft" to have AI polish what you wrote, or just type your own and send it — always your click, always your words.',
  },
  {
    title: "5. Already-contacted leads are remembered",
    body: "Once a lead is messaged, it's ticked and tracked automatically — future searches and campaigns skip it so you never double-message the same person.",
  },
  {
    title: "You're ready",
    body: 'Start in Connections to log in, then head to Find Leads. You can reopen this tour anytime from the help icon.',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    localStorage.setItem('klyperix_onboarding_done', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#ecdcff] shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[#8400ff]' : 'w-1.5 bg-[#ecdcff]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setConfirmingSkip(true)}
            className="p-1.5 rounded-lg text-[#8d76ab] hover:bg-[#faf7ff] hover:text-[#251142] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmingSkip ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm font-bold text-[#251142]">Skip the tour?</p>
            <p className="text-xs text-[#5c2f8f]">You can reopen it anytime from the help icon.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setConfirmingSkip(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-[#5c2f8f] bg-[#faf7ff] hover:bg-[#ecdcff] border border-[#ecdcff] transition"
              >
                Keep going
              </button>
              <button
                onClick={finish}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition"
              >
                Yes, skip
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 min-h-[110px]">
              <h2 className="text-base font-black text-[#251142]">{STEPS[step].title}</h2>
              <p className="text-sm text-[#5c2f8f] leading-relaxed">{STEPS[step].body}</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-[#5c2f8f] bg-[#faf7ff] hover:bg-[#ecdcff] border border-[#ecdcff] transition disabled:opacity-30 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              {isLast ? (
                <button
                  onClick={finish}
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-[#8400ff] hover:bg-[#7200db] transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Get started
                </button>
              ) : (
                <button
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-[#8400ff] hover:bg-[#7200db] transition flex items-center gap-1.5"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
