import React, { useState } from 'react';
import {
  Compass,
  Heart,
  Plus,
  RotateCw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { CoupleRoom, MOOD_OPTIONS, PartnerRole } from '../types';

interface SpinWheelSectionProps {
  room: CoupleRoom;
  activeRole: PartnerRole;
  onSpinWheel: (targetAngle: number, winner: string) => Promise<void>;
  onUpdateWheelOptions: (newOptions: string[]) => Promise<void>;
  onUpdateMood: (mood: string) => Promise<void>;
  onSendPulse: (customMessage?: string) => Promise<void>;
}

const SEGMENT_COLORS = [
  '#e11d48', // rose-600
  '#d97706', // amber-600
  '#be123c', // rose-700
  '#b45309', // amber-700
  '#9f1239', // rose-800
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#78350f', // amber-900
];

/**
 * Tab 3 — Synchronized Spin Wheel & Live Mood (عجلة الحظ والمزاج اللحظي):
 * Fits cleanly inside the 100dvh viewport with zero vertical overflow.
 */
export const SpinWheelSection: React.FC<SpinWheelSectionProps> = ({
  room,
  activeRole,
  onSpinWheel,
  onUpdateWheelOptions,
  onUpdateMood,
  onSendPulse,
}) => {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [updatingOptions, setUpdatingOptions] = useState(false);
  const [sendingPulse, setSendingPulse] = useState(false);

  const options =
    room.wheelOptions && room.wheelOptions.length >= 2
      ? room.wheelOptions
      : ['مساج رومانسي', 'عشاء على الشموع', 'طلب خاص مجاب', 'اختيار فيلم السهرة'];

  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
  const partnerName = activeRole === 'partner1' ? room.partner2Name : room.partner1Name;
  const myMood = activeRole === 'partner1' ? room.partner1Mood : room.partner2Mood;
  const partnerMood =
    activeRole === 'partner1' ? room.partner2Mood : room.partner1Mood;

  const handleTriggerSpin = async () => {
    if (room.wheelSpinning || options.length < 2) return;
    const winningIndex = Math.floor(Math.random() * options.length);
    const segmentAngle = 360 / options.length;
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetSegmentCenter = 360 - (winningIndex * segmentAngle + segmentAngle / 2);
    const currentBase = room.wheelSpinAngle - (room.wheelSpinAngle % 360);
    const nextAngle = Math.round(currentBase + extraSpins + targetSegmentCenter);
    await onSpinWheel(nextAngle, options[winningIndex]);
  };

  const handleTriggerPulse = async () => {
    setSendingPulse(true);
    try {
      await onSendPulse(`نبضة شوق حية من ${myName} إلى ${partnerName} ❤️`);
    } finally {
      setSendingPulse(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOption.trim();
    if (!trimmed || options.length >= 20) return;
    setUpdatingOptions(true);
    try {
      await onUpdateWheelOptions([...options, trimmed]);
      setNewOption('');
    } finally {
      setUpdatingOptions(false);
    }
  };

  const handleRemoveOption = async (idx: number) => {
    if (options.length <= 2) return;
    setUpdatingOptions(true);
    try {
      const next = options.filter((_, i) => i !== idx);
      await onUpdateWheelOptions(next);
    } finally {
      setUpdatingOptions(false);
    }
  };

  const numSegments = options.length;
  const anglePerSegment = 360 / numSegments;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const createSlicePath = (index: number) => {
    const startAngle = index * anglePerSegment;
    const endAngle = (index + 1) * anglePerSegment;
    const start = polarToCartesian(160, 160, 150, endAngle);
    const end = polarToCartesian(160, 160, 150, startAngle);
    const largeArcFlag = anglePerSegment <= 180 ? '0' : '1';
    return [
      'M',
      160,
      160,
      'L',
      start.x,
      start.y,
      'A',
      150,
      150,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      'Z',
    ].join(' ');
  };

  return (
    <div className="h-full flex flex-col justify-between gap-2.5 overflow-hidden">
      {/* Top Section: Synchronized Spin Wheel Card */}
      <div className="flex-1 min-h-0 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-rose-500/35 p-3.5 sm:p-5 flex flex-col items-center justify-between overflow-hidden">
        <div className="w-full flex items-center justify-between gap-2 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white font-display">
              عجلة الحظ المشتركة
            </h2>
            {room.wheelWinner && !room.wheelSpinning ? (
              <p className="text-xs text-amber-300 font-bold leading-snug whitespace-normal break-words">
                النتيجة: {room.wheelWinner}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                تدور بنفس اللحظة والنتيجة على الشاشتين
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowOptionsModal(true)}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>خيارات العجلة ({options.length})</span>
          </button>
        </div>

        {/* Proportionally Scaled SVG Spinning Wheel */}
        <div className="relative flex flex-col items-center justify-center my-auto">
          <div className="z-20 -mb-2.5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-lg" />
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full p-1.5 bg-slate-950 border-4 border-rose-500/45 shadow-2xl">
            <svg
              viewBox="0 0 320 320"
              className="w-full h-full rounded-full transition-transform duration-[3800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `rotate(${room.wheelSpinAngle || 0}deg)`,
              }}
            >
              {options.map((label, idx) => {
                const midAngle = idx * anglePerSegment + anglePerSegment / 2;
                const textPos = polarToCartesian(160, 160, 96, midAngle);
                const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                return (
                  <g key={`${label}-${idx}`}>
                    <path
                      d={createSlicePath(idx)}
                      fill={color}
                      stroke="#090d16"
                      strokeWidth="2"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textPos.x}, ${textPos.y})`}
                    >
                      {label.length > 14 ? `${label.slice(0, 13)}…` : label}
                    </text>
                  </g>
                );
              })}
              <circle
                cx="160"
                cy="160"
                r="24"
                fill="#090d16"
                stroke="#f59e0b"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>

        <button
          type="button"
          disabled={room.wheelSpinning}
          onClick={handleTriggerSpin}
          className="w-full max-w-sm min-h-[44px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RotateCw className={`w-4 h-4 shrink-0 ${room.wheelSpinning ? 'animate-spin' : ''}`} />
          <span>
            {room.wheelSpinning
              ? 'العجلة تدور الآن على الشاشتين...'
              : `أدر عجلة الحظ الآن (${myName})`}
          </span>
        </button>
      </div>

      {/* Bottom Section: Live Mood Selector + Prominent "إرسال نبضة شوق" Button */}
      <div className="rounded-3xl bg-slate-900/85 backdrop-blur-md border border-amber-500/35 p-3.5 sm:p-4 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-semibold">
            مزاجك الآن ({myName}): <strong className="text-rose-300">{myMood}</strong>
          </span>
          <span className="text-slate-300 font-semibold">
            مزاج {partnerName}: <strong className="text-amber-300">{partnerMood}</strong>
          </span>
        </div>

        {/* Mood Buttons Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {MOOD_OPTIONS.map((mood) => {
            const isSelected = myMood === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => onUpdateMood(mood)}
                className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                    : 'bg-slate-950/85 border border-slate-800 text-slate-300 hover:border-rose-500/40'
                }`}
              >
                {mood}
              </button>
            );
          })}
        </div>

        {/* Prominent "إرسال نبضة شوق" Button */}
        <button
          type="button"
          disabled={sendingPulse}
          onClick={handleTriggerPulse}
          className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <Heart className="w-4 h-4 fill-white shrink-0" />
          <span>إرسال نبضة شوق فورية إلى {partnerName}</span>
          <Send className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      {/* Modal to Customize Wheel Options */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5">
          <div className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-3xl bg-slate-900 border border-amber-500/40 p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <h3 className="text-base font-bold text-white font-display">
                تخصيص خيارات عجلة الحظ ({options.length}/20)
              </h3>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOption} className="flex items-center gap-2 mb-3 shrink-0">
              <input
                type="text"
                maxLength={100}
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="أضف حكماً أو رغبة جديدة..."
                className="flex-1 min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={updatingOptions || !newOption.trim() || options.length >= 20}
                className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>إضافة</span>
              </button>
            </form>

            <div className="overflow-y-auto custom-scroll space-y-2">
              {options.map((opt, idx) => (
                <div
                  key={`${opt}-${idx}`}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-medium text-slate-200 whitespace-normal break-words">
                    {idx + 1}. {opt}
                  </span>
                  <button
                    type="button"
                    disabled={options.length <= 2 || updatingOptions}
                    onClick={() => handleRemoveOption(idx)}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 flex items-center justify-center cursor-pointer disabled:opacity-30 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
