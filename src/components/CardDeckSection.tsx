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
  X,
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
    shortName: string;
    subtitle: string;
    accentText: string;
    borderGlow: string;
    bgGrad: string;
    defaultPoints: number;
  }
> = {
  1: {
    name: 'المستوى ١: رومانسية ودفء',
    shortName: '١. رومانسية ودفء',
    subtitle: 'أسئلة عاطفية دافئة ولمسات حنونة تقرب القلوب',
    accentText: 'text-rose-300',
    borderGlow: 'border-rose-500/45',
    bgGrad: 'from-rose-950/75 via-slate-900/95 to-slate-950/95',
    defaultPoints: 25,
  },
  2: {
    name: 'المستوى ٢: مرح وتحدي',
    shortName: '٢. مرح وتحدي',
    subtitle: 'تحديات مرحة وأنشطة تفاعلية تكسر الروتين',
    accentText: 'text-amber-300',
    borderGlow: 'border-amber-500/45',
    bgGrad: 'from-amber-950/75 via-slate-900/95 to-slate-950/95',
    defaultPoints: 40,
  },
  3: {
    name: 'المستوى ٣: خاص جداً (VIP)',
    shortName: '٣. خاص جداً VIP',
    subtitle: 'همسات جريئة ورغبات خاصة للزوجين فقط',
    accentText: 'text-rose-400',
    borderGlow: 'border-rose-500/65',
    bgGrad: 'from-rose-950/85 via-amber-950/40 to-slate-950/95',
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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLevel, setCustomLevel] = useState<1 | 2 | 3>(1);
  const [customTitle, setCustomTitle] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customPoints, setCustomPoints] = useState<number>(35);
  const [submittingCustom, setSubmittingCustom] = useState(false);

  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;

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
    <div className="h-full flex flex-col justify-between gap-3 overflow-hidden">
      {/* Top Level Selector Bar + Custom Secret Card Box Trigger */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white font-display">
              اختر المستوى لسحب بطاقة متزامنة (3D)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>صندوق البطاقات ({customCards.length})</span>
          </button>
        </div>

        {/* 3 Level Touch-Friendly Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((lvl) => {
            const isSelected = selectedLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleDrawRandomCard(lvl)}
                className={`min-h-[48px] rounded-2xl px-2.5 py-2 border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-br from-rose-600 to-amber-600 border-rose-400 text-white shadow-lg shadow-rose-600/20'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-rose-500/40'
                }`}
              >
                {lvl === 1 && <Heart className="w-3.5 h-3.5 shrink-0" />}
                {lvl === 2 && <Flame className="w-3.5 h-3.5 shrink-0" />}
                {lvl === 3 && <Crown className="w-3.5 h-3.5 shrink-0" />}
                <span className="text-xs font-bold font-display leading-tight">
                  {LEVEL_INFO[lvl].shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: 3D Synchronized Flipping Card fitting cleanly inside viewport */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-1">
        <div className="perspective-1000 w-full max-w-lg h-full max-h-[340px]">
          <div
            className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
              room.activeCardFlipped && room.activeCardText ? 'rotate-y-180' : ''
            }`}
          >
            {/* Card Back (Unflipped) */}
            <div
              onClick={() => {
                if (room.activeCardText && !room.activeCardFlipped) {
                  onFlipActiveCard();
                } else {
                  handleDrawRandomCard(selectedLevel);
                }
              }}
              className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-rose-950/60 to-slate-950/95 backdrop-blur-md border-2 border-rose-500/45 p-5 flex flex-col items-center justify-center text-center shadow-2xl cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display mb-1.5 whitespace-normal break-words">
                {room.activeCardText
                  ? `بطاقة جاهزة للكشف (سحبها: ${room.activeCardDrawnBy})`
                  : LEVEL_INFO[selectedLevel].name}
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed whitespace-normal break-words">
                {room.activeCardText
                  ? 'اضغط لقلب البطاقة ثلاثية الأبعاد وكشف التحدي على شاشتيكما معاً!'
                  : LEVEL_INFO[selectedLevel].subtitle}
              </p>
              <span className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg">
                <RotateCw className="w-4 h-4 shrink-0" />
                <span>
                  {room.activeCardText ? 'اكشف البطاقة الآن' : 'اسحب بطاقة عشوائية'}
                </span>
              </span>
            </div>

            {/* Card Front (Flipped Face-Up on Both Screens) */}
            <div
              className={`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br ${activeLevelMeta.bgGrad} backdrop-blur-md border-2 ${activeLevelMeta.borderGlow} p-4 sm:p-6 flex flex-col justify-between shadow-2xl overflow-hidden`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300 border-b border-slate-800/80 pb-2.5 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-bold ${activeLevelMeta.accentText}`}>
                    {activeLevelMeta.shortName}
                  </span>
                  {room.activeCardDrawnBy && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>سحبها: {room.activeCardDrawnBy}</span>
                    </>
                  )}
                </div>
                <span className="font-mono font-bold text-amber-300 tabular-nums shrink-0">
                  +{room.activeCardPoints} نقطة
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scroll flex flex-col items-center justify-center text-center py-2 px-1">
                <h3 className="text-base sm:text-xl font-bold text-white font-display mb-2 whitespace-normal break-words">
                  {room.activeCardTitle || 'بطاقة الحب'}
                </h3>
                <p className="text-sm sm:text-base text-slate-100 leading-relaxed whitespace-normal break-words max-w-md">
                  {room.activeCardText}
                </p>
              </div>

              {/* Action Buttons: Completed (+points), Postpone, Next Card */}
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-800/80 shrink-0">
                <button
                  type="button"
                  disabled={room.activeCardStage === 'done'}
                  onClick={onCompleteCard}
                  className="min-h-[44px] px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {room.activeCardStage === 'done'
                      ? 'تم التنفيذ!'
                      : `تم (+${room.activeCardPoints})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onPostponeCard}
                  className="min-h-[44px] px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>تأجيل</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDrawRandomCard(
                      (room.activeCardLevel as 1 | 2 | 3) || selectedLevel
                    )
                  }
                  className="min-h-[44px] px-2 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 shrink-0" />
                  <span>بطاقة أخرى</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Secret Card Creator Modal (صندوق البطاقات الخاصة) */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5">
          <div className="w-full max-w-md max-h-[88dvh] flex flex-col rounded-3xl bg-slate-900 border border-amber-500/40 p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <h3 className="text-base font-bold text-white font-display">
                صندوق البطاقات الخاصة السرية
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scroll space-y-4">
              <form onSubmit={handleAddSecretCard} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      المستوى
                    </label>
                    <select
                      value={customLevel}
                      onChange={(e) => {
                        const lvl = Number(e.target.value) as 1 | 2 | 3;
                        setCustomLevel(lvl);
                        setCustomPoints(LEVEL_INFO[lvl].defaultPoints);
                      }}
                      className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-2.5 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={1}>١: رومانسية ودفء</option>
                      <option value={2}>٢: مرح وتحدي</option>
                      <option value={3}>٣: خاص جداً VIP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      النقاط
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
                    محتوى التحدي أو الطلب (باسم {myName})
                  </label>
                  <textarea
                    rows={2}
                    required
                    maxLength={1000}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="اكتب التحدي أو الطلب الخاص..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submittingCustom || !customTitle.trim() || !customPrompt.trim()
                  }
                  className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>
                    {submittingCustom
                      ? 'جاري الإضافة...'
                      : 'حفظ البطاقة في الصندوق الخاص'}
                  </span>
                </button>
              </form>

              {/* Saved Custom Cards List */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-400">
                  البطاقات المخصصة المحفوظة ({customCards.length}):
                </p>
                {customCards.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">
                    لا توجد بطاقات مخصصة بعد.
                  </p>
                ) : (
                  customCards.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white whitespace-normal break-words">
                          {c.title} (مستوى {c.level})
                        </p>
                        <p className="text-[11px] text-slate-400 whitespace-normal break-words mt-0.5">
                          {c.prompt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDrawCard({
                              id: c.id,
                              level: c.level,
                              title: c.title,
                              prompt: c.prompt,
                              points: c.points,
                              isCustom: true,
                              authorName: c.authorName,
                            });
                            setShowCustomModal(false);
                          }}
                          className="min-h-[44px] px-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer"
                        >
                          سحب
                        </button>
                        {c.authorId === currentUserId && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomCard(c.id)}
                            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 text-slate-400 hover:text-rose-300 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
