import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  CoupleRoom,
  GOAL_CATEGORIES,
  GOAL_TIMEFRAMES,
  PartnerRole,
  WrittenGoal,
} from '../types';

interface WrittenGoalsBoardProps {
  room: CoupleRoom;
  activeRole: PartnerRole;
  goals: WrittenGoal[];
  currentUserId: string;
  onAddGoal: (goalInput: {
    category: string;
    content: string;
    visibilityMode: 'immediate' | 'hidden';
    timeframe: string;
    rewardPoints: number;
  }) => Promise<void>;
  onRevealGoal: (goal: WrittenGoal) => Promise<void>;
  onCompleteGoal: (goal: WrittenGoal) => Promise<void>;
  onBoostRewardPoints: (goal: WrittenGoal, extraPoints: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const WrittenGoalsBoard: React.FC<WrittenGoalsBoardProps> = ({
  room,
  activeRole,
  goals,
  currentUserId,
  onAddGoal,
  onRevealGoal,
  onCompleteGoal,
  onBoostRewardPoints,
  onDeleteGoal,
}) => {
  const [showComposerModal, setShowComposerModal] = useState(false);
  const [category, setCategory] = useState(GOAL_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [visibilityMode, setVisibilityMode] = useState<'immediate' | 'hidden'>('immediate');
  const [timeframe, setTimeframe] = useState(GOAL_TIMEFRAMES[0]);
  const [rewardPoints, setRewardPoints] = useState<number>(30);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [submitting, setSubmitting] = useState(false);

  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
  const partnerName = activeRole === 'partner1' ? room.partner2Name : room.partner1Name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onAddGoal({
        category,
        content: content.trim(),
        visibilityMode,
        timeframe,
        rewardPoints: Math.min(5000, Math.max(5, Number(rewardPoints) || 25)),
      });
      setContent('');
      setShowComposerModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (filter === 'all') return true;
    return g.status === filter;
  });

  const activeCount = goals.filter((g) => g.status === 'in_progress').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Compact Top Control Bar inside Tab 1 */}
      <div className="rounded-2xl bg-slate-900/80 backdrop-blur-md border border-rose-500/30 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white font-display leading-snug">
              لوحة الأهداف والأمنيات المكتوبة
            </h2>
            <p className="text-[11px] text-slate-400 leading-normal">
              قيد التنفيذ: {activeCount} · تم التحقيق: {completedCount}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowComposerModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>كتابة هدف أو أمنية</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-950/75 border border-slate-800/90 shrink-0">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors cursor-pointer px-2 ${
            filter === 'all'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          الكل ({goals.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('in_progress')}
          className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors cursor-pointer px-2 ${
            filter === 'in_progress'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          قيد التنفيذ ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors cursor-pointer px-2 ${
            filter === 'completed'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          تم التحقيق ({completedCount})
        </button>
      </div>

      {/* Goals Feed Container (Fits cleanly inside the remaining viewport height) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll space-y-3 pl-0.5">
        {filteredGoals.length === 0 ? (
          <div className="h-full min-h-[180px] rounded-2xl bg-slate-900/65 backdrop-blur-md border border-slate-800/80 p-6 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-200">
              لا توجد أهداف مكتوبة في هذا القسم حالياً
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed whitespace-normal break-words">
              اضغط على «كتابة هدف أو أمنية» بالأعلى لمشاركة هدف الليلة أو مفاجأة مخفية مع {partnerName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
            {filteredGoals.map((goal) => {
              const isHiddenAndUnrevealed =
                goal.visibilityMode === 'hidden' && !goal.isRevealed;
              const isCompleted = goal.status === 'completed';

              return (
                <div
                  key={goal.id}
                  className={`rounded-2xl p-4 border backdrop-blur-md transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-slate-950/75 border-emerald-500/40'
                      : isHiddenAndUnrevealed
                      ? 'bg-gradient-to-br from-amber-950/45 to-slate-950/90 border-amber-500/50'
                      : 'bg-slate-900/85 border-rose-500/35'
                  }`}
                >
                  <div>
                    {/* Metadata Row */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap leading-relaxed">
                        <span className="font-bold text-rose-300">{goal.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>بواسطة: {goal.authorName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{goal.timeframe}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono font-bold text-amber-300 tabular-nums shrink-0">
                        <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>+{goal.rewardPoints}</span>
                      </div>
                    </div>

                    {/* Full Readable Goal Content without truncation */}
                    {isHiddenAndUnrevealed ? (
                      <div className="rounded-xl bg-slate-950/80 border border-amber-500/40 p-3.5 my-2 text-center space-y-2.5">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
                          <EyeOff className="w-4 h-4 shrink-0" />
                          <span>هدف مخفي / مفاجأة من {goal.authorName}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-normal break-words">
                          هذا الهدف مخفي كمفاجأة خاصة؛ اقبل التحدي الآن لكشف تفاصيله على الشاشتين!
                        </p>
                        <button
                          type="button"
                          onClick={() => onRevealGoal(goal)}
                          className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
                        >
                          كشف الهدف وقبول التحدي
                        </button>
                      </div>
                    ) : (
                      <p
                        className={`text-sm sm:text-base leading-relaxed my-2 font-medium whitespace-normal break-words ${
                          isCompleted
                            ? 'text-slate-300 line-through decoration-emerald-500/60'
                            : 'text-white'
                        }`}
                      >
                        {goal.content}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-800/80">
                    {isCompleted ? (
                      <span className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>تم التحقيق بنجاح (+{goal.rewardPoints} نقطة)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCompleteGoal(goal)}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>قيد التنفيذ — إعلان التحقيق</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => onBoostRewardPoints(goal, 15)}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 shrink-0" />
                          <span>+١٥</span>
                        </button>
                      )}

                      {goal.authorId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteGoal(goal.id)}
                          aria-label="حذف الهدف"
                          className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-950/80 hover:bg-rose-950/70 border border-slate-800 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Writing a New Goal / Desire */}
      {showComposerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display">
                كتابة هدف أو أمنية جديدة (باسم {myName})
              </h3>
              <button
                type="button"
                onClick={() => setShowComposerModal(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    التصنيف
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-2.5 text-white focus:outline-none focus:border-rose-500"
                  >
                    {GOAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    الوقت المستهدف
                  </label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {GOAL_TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  مكافأة الإنجاز (نقاط حب)
                </label>
                <input
                  type="number"
                  min={5}
                  max={5000}
                  step={5}
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  تفاصيل الهدف أو الأمنية
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={1000}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب هدف الليلة أو أمنية خاصة تريد تحقيقها مع شريكك..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setVisibilityMode('immediate')}
                  className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    visibilityMode === 'immediate'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>ظاهر للطرفين فوراً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityMode('hidden')}
                  className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    visibilityMode === 'hidden'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span>هدف مخفي / مفاجأة</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{submitting ? 'جاري النشر...' : 'نشر الهدف على الشاشتين'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
