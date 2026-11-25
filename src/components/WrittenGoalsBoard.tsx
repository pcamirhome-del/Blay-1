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
    <section className="space-y-6">
      {/* Header & Interactive Composer Card */}
      <div className="rounded-3xl bg-slate-900/80 backdrop-blur-md border border-rose-500/35 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-500/25 border border-rose-500/40 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display">
                لوحة الأهداف والأمنيات المكتوبة (مباشر - LIVE)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                اكتب هدف الليلة أو أمنية خاصة لتظهر فوراً لشريكك أو كمفاجأة مخفية يكشفها عند قبول التحدي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>قيد التنفيذ: {activeCount}</span>
            <span aria-hidden="true">·</span>
            <span>تم التحقيق: {completedCount}</span>
          </div>
        </div>

        {/* Written Goal Creation Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-slate-950/75 border border-slate-800/90 p-4 sm:p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تصنيف الهدف أو الأمنية
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 px-3 text-white focus:outline-none focus:border-rose-500"
              >
                {GOAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الإطار الزمني المستهدف
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 px-3 text-white focus:outline-none focus:border-amber-500"
              >
                {GOAL_TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                مكافأة الإنجاز (نقاط حب)
              </label>
              <input
                type="number"
                min={5}
                max={5000}
                step={5}
                value={rewardPoints}
                onChange={(e) => setRewardPoints(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 px-3.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اكتب الهدف أو الأمنية بالتفصيل (باسم {myName} إلى {partnerName})
            </label>
            <textarea
              rows={2}
              required
              maxLength={1000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`مثال: ${category}: أن نجلس الليلة على ضوء الشموع بدون هواتف لمدة ساعة ونتبادل ٣ أمنيات خاصة...`}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          {/* Goal Visibility Mode Selection + Submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setVisibilityMode('immediate')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  visibilityMode === 'immediate'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ظاهر للطرفين فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibilityMode('hidden')}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  visibilityMode === 'hidden'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>هدف مخفي / مفاجأة</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="min-h-[46px] px-6 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>
                {submitting ? 'جاري النشر...' : 'إضافة الهدف للوحة المشتركة'}
              </span>
            </button>
          </div>
        </form>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              كل الأهداف ({goals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('in_progress')}
              className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تم التحقيق بنجاح ({completedCount})
            </button>
          </div>
        </div>

        {/* Live Goals Grid */}
        {filteredGoals.length === 0 ? (
          <div className="rounded-2xl bg-slate-950/50 border border-slate-800/80 p-8 text-center">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-300">
              لا توجد أهداف في هذا القسم حالياً
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ابدأ بكتابة هدف الليلة أو أمنية خاصة أعلاه لتظهر فوراً على شاشة شريكك!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const isHiddenAndUnrevealed =
                goal.visibilityMode === 'hidden' && !goal.isRevealed;
              const isCompleted = goal.status === 'completed';

              return (
                <div
                  key={goal.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-slate-950/60 border-emerald-500/35'
                      : isHiddenAndUnrevealed
                      ? 'bg-gradient-to-br from-amber-950/30 to-slate-950/90 border-amber-500/45'
                      : 'bg-slate-950/80 border-rose-500/30 hover:border-rose-500/50'
                  }`}
                >
                  <div>
                    {/* Clean unboxed metadata row */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-rose-300">{goal.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>كتبه: {goal.authorName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>{goal.timeframe}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300 tabular-nums shrink-0">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        <span>+{goal.rewardPoints} نقطة</span>
                      </div>
                    </div>

                    {/* Goal Body: either visible or mystery blurred */}
                    {isHiddenAndUnrevealed ? (
                      <div className="relative rounded-xl bg-slate-900/90 border border-amber-500/30 p-4 my-2 overflow-hidden">
                        <p
                          className="text-sm text-slate-400 select-none blur-md pointer-events-none"
                          aria-hidden="true"
                        >
                          هذا الهدف مخفي كمفاجأة خاصة من شريكك، اضغط على زر كشف الهدف بالأسفل لقبول التحدي ورؤية التفاصيل
                        </p>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 text-center">
                          <span className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                            <EyeOff className="w-4 h-4" />
                            <span>هدف مخفي / مفاجأة من {goal.authorName}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onRevealGoal(goal)}
                            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
                          >
                            قبول التحدي وكشف الهدف
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-base leading-relaxed my-2 font-medium ${
                          isCompleted ? 'text-slate-300 line-through decoration-emerald-500/60' : 'text-white'
                        }`}
                      >
                        {goal.content}
                      </p>
                    )}
                  </div>

                  {/* Bottom Action Bar: Status Toggle & Attach Extra Reward Points */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 mt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم التحقيق بنجاح (+{goal.rewardPoints} نقطة)</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCompleteGoal(goal)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>قيد التنفيذ — اضغط لإعلان التحقيق</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => onBoostRewardPoints(goal, 15)}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          title="إرفاق مكافأة نقاط إضافية عند الإنجاز"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>+١٥ نقطة مكافأة</span>
                        </button>
                      )}

                      {goal.authorId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteGoal(goal.id)}
                          aria-label="حذف الهدف"
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </section>
  );
};
