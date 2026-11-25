import React, { useState } from 'react';
import { Check, Copy, Heart, Radio, Send, Sparkles, Trophy, UserCheck } from 'lucide-react';
import { CoupleRoom, MOOD_OPTIONS, PartnerRole } from '../types';

interface MoodAndPulseBarProps {
  room: CoupleRoom;
  activeRole: PartnerRole;
  onSwitchRole: (role: PartnerRole) => void;
  onUpdateMood: (mood: string) => Promise<void>;
  onSendPulse: (customMessage?: string) => Promise<void>;
  showPulseOverlay: boolean;
  onDismissPulseOverlay: () => void;
}

export const MoodAndPulseBar: React.FC<MoodAndPulseBarProps> = ({
  room,
  activeRole,
  onSwitchRole,
  onUpdateMood,
  onSendPulse,
  showPulseOverlay,
  onDismissPulseOverlay,
}) => {
  const [customPulseNote, setCustomPulseNote] = useState('');
  const [sendingPulse, setSendingPulse] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const myMood = activeRole === 'partner1' ? room.partner1Mood : room.partner2Mood;
  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
  const partnerName = activeRole === 'partner1' ? room.partner2Name : room.partner1Name;

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTriggerPulse = async () => {
    setSendingPulse(true);
    try {
      await onSendPulse(
        customPulseNote.trim() || `نبضة شوق دافئة من ${myName} إلى ${partnerName}`
      );
      setCustomPulseNote('');
    } finally {
      setSendingPulse(false);
    }
  };

  return (
    <>
      {/* Full-Screen Live Heart Pulse Alert Overlay when a pulse arrives */}
      {showPulseOverlay && (
        <div
          onClick={onDismissPulseOverlay}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 cursor-pointer"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900/95 border border-rose-500 p-8 text-center shadow-2xl shadow-rose-500/30">
            <div className="relative w-24 h-24 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-rose-500/40 animate-pulse-ring" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-xl shadow-rose-500/40">
                <Heart className="w-10 h-10 text-white fill-white" />
              </div>
            </div>
            <p className="text-xs font-semibold text-amber-400 mb-1">
              وصلتك نبضة شوق حية الآن من {room.lastPulseFromName || partnerName}
            </p>
            <h3 className="text-xl font-bold text-white font-display mb-3">
              «{room.lastPulseMessage || 'أشتاق إليك في هذه اللحظة!'}»
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              تمت المزامنة الفورية بين الشاشتين — اضغط للرد بنبضة أو المتابعة
            </p>
            <button
              type="button"
              onClick={onDismissPulseOverlay}
              className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              استلمت النبضة بحب
            </button>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-slate-900/75 backdrop-blur-md border border-rose-500/30 p-5 sm:p-6 shadow-xl">
        {/* Top Row: Room Code Pairing Status & Active Partner Perspective Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>رمز الغرفة المشتركة:</span>
              <span className="font-mono font-bold text-amber-300 tracking-wider">
                {room.code}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرمز للشريك</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Partner Perspective Selector (allows switching active partner when testing or playing together) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 px-2">تتفاعل الآن باسم:</span>
            <button
              type="button"
              onClick={() => onSwitchRole('partner1')}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeRole === 'partner1'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {room.partner1Name}
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole('partner2')}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeRole === 'partner2'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {room.partner2Name}
            </button>
          </div>
        </div>

        {/* Two Partners Live Status Cards + Send Pulse Action */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Partner 1 & Partner 2 Live Status */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Partner 1 Card */}
            <div
              className={`rounded-2xl p-4 border transition-all ${
                activeRole === 'partner1'
                  ? 'bg-rose-950/25 border-rose-500/50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-white text-base font-display">
                    {room.partner1Name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-sm tabular-nums">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{room.partner1Points}</span>
                  <span className="text-[11px] font-sans font-normal text-slate-400">
                    نقطة
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>الحالة المزاجية الآن:</span>
                <span className="text-rose-300 font-semibold">{room.partner1Mood}</span>
              </div>
            </div>

            {/* Partner 2 Card */}
            <div
              className={`rounded-2xl p-4 border transition-all ${
                activeRole === 'partner2'
                  ? 'bg-amber-950/25 border-amber-500/50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold text-white text-base font-display">
                    {room.partner2Name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-sm tabular-nums">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{room.partner2Points}</span>
                  <span className="text-[11px] font-sans font-normal text-slate-400">
                    نقطة
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>الحالة المزاجية الآن:</span>
                <span className="text-amber-300 font-semibold">{room.partner2Mood}</span>
              </div>
            </div>

            {/* Quick Mood Toggles for Active Partner */}
            <div className="sm:col-span-2 pt-1">
              <p className="text-xs text-slate-400 mb-2">
                حدّث حالتك المزاجية الآن ({myName}) لتظهر فوراً على شاشة {partnerName}:
              </p>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const isSelected = myMood === mood;
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => onUpdateMood(mood)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-rose-500/40 hover:text-white'
                      }`}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Prominent "إرسال نبضة شوق" Box */}
          <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-950/80 to-amber-950/30 border border-rose-500/35 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-rose-400" />
                  <span>نبضة الشوق اللحظية</span>
                </span>
                {room.lastPulseFromName && (
                  <span className="text-[11px] text-slate-400">
                    آخر نبضة: من {room.lastPulseFromName}
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={140}
                value={customPulseNote}
                onChange={(e) => setCustomPulseNote(e.target.value)}
                placeholder={`اكتب همسة سريعة إلى ${partnerName} (اختياري)...`}
                className="w-full min-h-[42px] rounded-xl bg-slate-950/90 border border-slate-800 px-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 mb-3"
              />
            </div>

            <button
              type="button"
              disabled={sendingPulse}
              onClick={handleTriggerPulse}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>إرسال نبضة شوق</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};
