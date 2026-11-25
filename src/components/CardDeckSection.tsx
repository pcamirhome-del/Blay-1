import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Heart,
  Layers,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CoupleRoom,
  CustomCard,
  DeckCardItem,
  DEFAULT_DECK_CARDS,
  PartnerRole,
} from '../types';

interface CardDeckSectionProps {
  room: CoupleRoom;
  activeRole: PartnerRole;
  customCards: CustomCard[];
  currentUserId: string;
  onDrawCard: (card: DeckCardItem) => Promise<void>;
  onFlipActiveCard: () => Promise<void>;
  onCompleteCard: () => Promise<void>;
  onPostponeCard: () => Promise<void>;
  onAddCustomCard: (input: {
    level: 1 | 2 | 3;
    title: string;
    prompt: string;
    points: number;
  }) => Promise<void>;
  onDeleteCustomCard: (cardId: string) => Promise<void>;
}

const LEVEL_INFO: Record<
  1 | 2 | 3,
  {
    name: string;
    subtitle: string;
    accentText: string;
    borderGlow: string;
    bgGrad: string;
    defaultPoints: number;
  }
> = {
  1: {
    name: 'المستوى ١: رومانسية ودفء',
    subtitle: 'أسئلة عاطفية دافئة ولمسات حنونة تقرب القلوب',
    accentText: 'text-rose-300',
    borderGlow: 'border-rose-500/40',
    bgGrad: 'from-rose-950/50 via-slate-900 to-slate-950',
    defaultPoints: 25,
  },
  2: {
    name: 'المستوى ٢: مرح وتحدي',
    subtitle: 'تحديات مرحة وأنشطة تفاعلية تكسر الروتين',
    accentText: 'text-amber-300',
    borderGlow: 'border-amber-500/40',
    bgGrad: 'from-amber-950/50 via-slate-900 to-slate-950',
    defaultPoints: 40,
  },
  3: {
    name: 'المستوى ٣: خاص جداً (VIP)',
    subtitle: 'همسات جريئة ورغبات خاصة للزوجين فقط',
    accentText: 'text-rose-400',
    borderGlow: 'border-rose-500/60',
    bgGrad: 'from-rose-950/70 via-amber-950/30 to-slate-950',
    defaultPoints: 65,
  },
};

export const CardDeckSection: React.FC<CardDeckSectionProps> = ({
  room,
  activeRole,
  customCards,
  currentUserId,
  onDrawCard,
  onFlipActiveCard,
  onCompleteCard,
  onPostponeCard,
  onAddCustomCard,
  onDeleteCustomCard,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(
    (room.activeCardLevel as 1 | 2 | 3) || 1
  );
  const [customLevel, setCustomLevel] = useState<1 | 2 | 3>(1);
  const [customTitle, setCustomTitle] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customPoints, setCustomPoints] = useState<number>(35);
  const [submittingCustom, setSubmittingCustom] = useState(false);

  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;

  // Combine default deck + custom secret cards for selectedLevel
  const cardsForSelectedLevel: DeckCardItem[] = [
    ...DEFAULT_DECK_CARDS.filter((c) => c.level === selectedLevel),
    ...customCards
      .filter((c) => c.level === selectedLevel)
      .map((c) => ({
        id: c.id,
        level: c.level,
        title: c.title,
        prompt: c.prompt,
        points: c.points,
        isCustom: true,
        authorName: c.authorName,
      })),
  ];

  const handleDrawRandomCard = async (level: 1 | 2 | 3) => {
    setSelectedLevel(level);
    const pool: DeckCardItem[] = [
      ...DEFAULT_DECK_CARDS.filter((c) => c.level === level),
      ...customCards
        .filter((c) => c.level === level)
        .map((c) => ({
          id: c.id,
          level: c.level,
          title: c.title,
          prompt: c.prompt,
          points: c.points,
          isCustom: true,
          authorName: c.authorName,
        })),
    ];
    if (pool.length === 0) return;
    // Pick a different card than the currently active one if possible
    const candidates =
      pool.length > 1 ? pool.filter((c) => c.id !== room.activeCardId) : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    await onDrawCard(chosen);
  };

  const handleAddSecretCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customPrompt.trim()) return;
    setSubmittingCustom(true);
    try {
      await onAddCustomCard({
        level: customLevel,
        title: customTitle.trim(),
        prompt: customPrompt.trim(),
        points: Math.min(5000, Math.max(5, Number(customPoints) || 35)),
      });
      setCustomTitle('');
      setCustomPrompt('');
    } finally {
      setSubmittingCustom(false);
    }
  };

  const activeLevelMeta =
    LEVEL_INFO[(room.activeCardLevel as 1 | 2 | 3) || selectedLevel];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: 3-Level Interactive 3D Card Table */}
      <div className="lg:col-span-7 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-rose-500/35 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white font-display">
              بطاقات الرومانسية والتحدي (٣ مستويات متزامنة)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              عند سحب أو قلب أي بطاقة، تنقلب بنفس اللحظة بحركة ثلاثية الأبعاد (3D) على شاشتيكما معاً
            </p>
          </div>
          <span className="text-xs text-slate-400">
            إجمالي بطاقات المستوى: {cardsForSelectedLevel.length}
          </span>
        </div>

        {/* 3 Level Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
          {([1, 2, 3] as const).map((lvl) => {
            const isSelected = selectedLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleDrawRandomCard(lvl)}
                className={`min-h-[54px] rounded-2xl p-3 text-right border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-rose-600/25 to-amber-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/15'
                    : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold font-display">
                    {LEVEL_INFO[lvl].name}
                  </span>
                  {lvl === 1 && <Heart className="w-4 h-4 text-rose-400 shrink-0" />}
                  {lvl === 2 && <Flame className="w-4 h-4 text-amber-400 shrink-0" />}
                  {lvl === 3 && <Crown className="w-4 h-4 text-rose-400 shrink-0" />}
                </div>
                <span className="text-[11px] text-slate-400 mt-1">
                  اضغط لسحب بطاقة جديدة
                </span>
              </button>
            );
          })}
        </div>

        {/* 3D Synchronized Flipping Card Container */}
        <div className="perspective-1000 w-full max-w-lg mx-auto my-4">
          <div
            className={`relative w-full min-h-[290px] transition-transform duration-700 transform-style-3d ${
              room.activeCardFlipped && room.activeCardText ? 'rotate-y-180' : ''
            }`}
          >
            {/* Card Back (Unflipped / Waiting to Flip) */}
            <div
              onClick={() => {
                if (room.activeCardText && !room.activeCardFlipped) {
                  onFlipActiveCard();
                } else {
                  handleDrawRandomCard(selectedLevel);
                }
              }}
              className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-950 border-2 border-rose-500/40 p-6 flex flex-col items-center justify-center text-center shadow-2xl cursor-pointer hover:border-rose-400 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-display mb-1.5">
                {room.activeCardText
                  ? `بطاقة جاهزة للكشف (سحبها: ${room.activeCardDrawnBy})`
                  : LEVEL_INFO[selectedLevel].name}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
                {room.activeCardText
                  ? 'اضغط هنا لقلب البطاقة ثلاثية الأبعاد وكشف التحدي على شاشتيكما معاً!'
                  : LEVEL_INFO[selectedLevel].subtitle}
              </p>
              <span className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-rose-600/25">
                <RotateCw className="w-4 h-4" />
                <span>
                  {room.activeCardText ? 'اكشف البطاقة الآن' : 'اسحب بطاقة عشوائية'}
                </span>
              </span>
            </div>

            {/* Card Front (Flipped Face-Up on Both Screens) */}
            <div
              className={`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br ${activeLevelMeta.bgGrad} border-2 ${activeLevelMeta.borderGlow} p-6 flex flex-col justify-between shadow-2xl`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${activeLevelMeta.accentText}`}>
                    {activeLevelMeta.name}
                  </span>
                  {room.activeCardDrawnBy && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>سحبها: {room.activeCardDrawnBy}</span>
                    </>
                  )}
                </div>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  +{room.activeCardPoints} نقطة
                </span>
              </div>

              <div className="my-auto py-4 text-center">
                <h3 className="text-xl font-bold text-white font-display mb-3">
                  {room.activeCardTitle || 'بطاقة الحب'}
                </h3>
                <p className="text-base text-slate-100 leading-relaxed max-w-md mx-auto">
                  {room.activeCardText}
                </p>
              </div>

              {/* Action Buttons: Completed (+points) or Postpone */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={room.activeCardStage === 'done'}
                  onClick={onCompleteCard}
                  className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {room.activeCardStage === 'done'
                      ? 'تم التنفيذ!'
                      : `تم التنفيذ (+${room.activeCardPoints})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onPostponeCard}
                  className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>تأجيل</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDrawRandomCard((room.activeCardLevel as 1 | 2 | 3) || selectedLevel)
                  }
                  className="col-span-2 sm:col-span-1 min-h-[44px] rounded-xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 shrink-0" />
                  <span>بطاقة أخرى</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right 5 Columns: Custom Secret Card Creator (صندوق البطاقات الخاصة) */}
      <div className="lg:col-span-5 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-amber-500/35 p-5 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display">
              صندوق البطاقات الخاصة السرية
            </h3>
            <p className="text-xs text-slate-400">
              أضف أسئلتك أو رغباتك الخاصة لأي مستوى لتظهر كبطاقات مفاجئة أثناء اللعب
            </p>
          </div>
        </div>

        <form onSubmit={handleAddSecretCard} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اختر المستوى
              </label>
              <select
                value={customLevel}
                onChange={(e) => {
                  const lvl = Number(e.target.value) as 1 | 2 | 3;
                  setCustomLevel(lvl);
                  setCustomPoints(LEVEL_INFO[lvl].defaultPoints);
                }}
                className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-white focus:outline-none focus:border-amber-500"
              >
                <option value={1}>المستوى ١: رومانسية ودفء</option>
                <option value={2}>المستوى ٢: مرح وتحدي</option>
                <option value={3}>المستوى ٣: خاص جداً - VIP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                نقاط المكافأة
              </label>
              <input
                type="number"
                min={5}
                max={5000}
                step={5}
                value={customPoints}
                onChange={(e) => setCustomPoints(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              عنوان البطاقة
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="مثال: أمنية سرية مني لك..."
              className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              محتوى التحدي أو السؤال أو الأمنية (يُحفظ باسم {myName})
            </label>
            <textarea
              rows={3}
              required
              maxLength={1000}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="اكتب هنا التحدي أو الطلب الخاص ليظهر في صندوق البطاقات..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={submittingCustom || !customTitle.trim() || !customPrompt.trim()}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>
              {submittingCustom
                ? 'جاري الحفظ...'
                : 'حفظ البطاقة في الصندوق الخاص'}
            </span>
          </button>
        </form>

        {/* List of Custom Cards Added by Couple */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span>البطاقات الخاصة المضافة بينكما ({customCards.length})</span>
          </div>

          {customCards.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              لم تضيفا بطاقات مخصصة بعد — أي بطاقة تضيفانها هنا تدخل فوراً ضمن السحب العشوائي!
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pl-1">
              {customCards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="text-rose-300 font-semibold">
                        مستوى {c.level}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>بواسطة {c.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-amber-300">+{c.points}</span>
                    </div>
                    <p className="text-xs font-bold text-white truncate mt-0.5">
                      {c.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onDrawCard({
                          id: c.id,
                          level: c.level,
                          title: c.title,
                          prompt: c.prompt,
                          points: c.points,
                          isCustom: true,
                          authorName: c.authorName,
                        })
                      }
                      className="min-h-[34px] px-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/30 text-rose-300 text-[11px] font-semibold cursor-pointer"
                    >
                      سحب الآن
                    </button>
                    {c.authorId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomCard(c.id)}
                        className="min-h-[34px] min-w-[34px] rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
