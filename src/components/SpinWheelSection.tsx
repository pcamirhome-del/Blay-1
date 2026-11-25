import React, { useState } from 'react';
import { Compass, Plus, RotateCw, Sparkles, Trash2 } from 'lucide-react';
import { CoupleRoom, PartnerRole } from '../types';

interface SpinWheelSectionProps {
  room: CoupleRoom;
  activeRole: PartnerRole;
  onSpinWheel: (targetAngle: number, winner: string) => Promise<void>;
  onUpdateWheelOptions: (newOptions: string[]) => Promise<void>;
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

export const SpinWheelSection: React.FC<SpinWheelSectionProps> = ({
  room,
  activeRole,
  onSpinWheel,
  onUpdateWheelOptions,
}) => {
  const [newOption, setNewOption] = useState('');
  const [updatingOptions, setUpdatingOptions] = useState(false);

  const options =
    room.wheelOptions && room.wheelOptions.length >= 2
      ? room.wheelOptions
      : ['مساج رومانسي', 'عشاء على الشموع', 'طلب خاص مجاب', 'اختيار فيلم السهرة'];

  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;

  const handleTriggerSpin = async () => {
    if (room.wheelSpinning || options.length < 2) return;
    const winningIndex = Math.floor(Math.random() * options.length);
    const segmentAngle = 360 / options.length;
    // Calculate deterministic rotation so pointer at top (0 deg) lands on winningIndex
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetSegmentCenter = 360 - (winningIndex * segmentAngle + segmentAngle / 2);
    const currentBase = room.wheelSpinAngle - (room.wheelSpinAngle % 360);
    const nextAngle = Math.round(currentBase + extraSpins + targetSegmentCenter);
    await onSpinWheel(nextAngle, options[winningIndex]);
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

  // Build SVG wheel slices
  const numSegments = options.length;
  const anglePerSegment = 360 / numSegments;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: Synchronized Spinning Wheel Visual */}
      <div className="lg:col-span-7 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-rose-500/35 p-5 sm:p-7 shadow-xl flex flex-col items-center text-center">
        <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-4 text-right">
          <div>
            <h2 className="text-xl font-bold text-white font-display">
              عجلة الحظ المشتركة للزوجين
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              عند تدوير العجلة من أحد الجهازين، تدور العجلة بنفس الزاوية والنتيجة على شاشة الشريك فوراً
            </p>
          </div>
          {room.wheelSpunBy && (
            <span className="text-xs text-amber-300">
              آخر تدوير: بواسطة {room.wheelSpunBy}
            </span>
          )}
        </div>

        {/* Top Pointer Indicator */}
        <div className="relative my-3 flex flex-col items-center">
          <div className="z-20 -mb-3 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-lg" />

          {/* Rotating SVG Wheel */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-2 bg-slate-950 border-4 border-rose-500/40 shadow-2xl shadow-rose-500/15">
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
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textPos.x}, ${textPos.y})`}
                    >
                      {label.length > 16 ? `${label.slice(0, 15)}…` : label}
                    </text>
                  </g>
                );
              })}
              <circle
                cx="160"
                cy="160"
                r="26"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>

        {/* Synchronized Result Banner */}
        {room.wheelWinner && (
          <div className="w-full max-w-md rounded-2xl bg-gradient-to-r from-rose-950/60 via-amber-950/40 to-rose-950/60 border border-amber-500/45 px-5 py-3.5 my-3">
            <p className="text-xs text-amber-300 font-semibold mb-0.5">
              {room.wheelSpinning
                ? 'العجلة تدور الآن على الشاشتين...'
                : `نتيجة عجلة الحظ (أدارها ${room.wheelSpunBy || myName}):`}
            </p>
            <p className="text-lg font-bold text-white font-display">
              {room.wheelSpinning ? 'ترقبوا المفاجأة...' : room.wheelWinner}
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={room.wheelSpinning}
          onClick={handleTriggerSpin}
          className="w-full max-w-sm min-h-[50px] mt-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${room.wheelSpinning ? 'animate-spin' : ''}`} />
          <span>
            {room.wheelSpinning
              ? 'جاري الدوران بالمزامنة اللحظية...'
              : `أدر عجلة الحظ الآن باسم ${myName}`}
          </span>
        </button>
      </div>

      {/* Right 5 Columns: Customize Wheel Options */}
      <div className="lg:col-span-5 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-amber-500/35 p-5 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display">
              تخصيص خيارات العجلة ({options.length}/20)
            </h3>
            <p className="text-xs text-slate-400">
              أضيفا أحكامكما أو رغباتكما الخاصة لتدخل في عجلة الحظ المشتركة
            </p>
          </div>
        </div>

        <form onSubmit={handleAddOption} className="flex items-center gap-2 mb-5">
          <input
            type="text"
            maxLength={100}
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="مثال: مساج قدمين، سهرة سينما..."
            className="flex-1 min-h-[46px] rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={updatingOptions || !newOption.trim() || options.length >= 20}
            className="min-h-[46px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة</span>
          </button>
        </form>

        <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
          {options.map((opt, idx) => (
            <div
              key={`${opt}-${idx}`}
              className="rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}.
                </span>
                <span className="text-xs font-medium text-slate-200 truncate">
                  {opt}
                </span>
              </div>
              <button
                type="button"
                disabled={options.length <= 2 || updatingOptions}
                onClick={() => handleRemoveOption(idx)}
                title="حذف الخيار (يجب بقاء خيارين على الأقل)"
                className="min-h-[34px] min-w-[34px] rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
