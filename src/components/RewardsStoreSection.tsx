import React, { useState } from 'react';
import {
  Crown,
  Flame,
  Gift,
  Heart,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { CoupleRoom, PartnerRole, StoreReward } from '../types';

interface RewardsStoreSectionProps {
  room: CoupleRoom;
  activeRole: PartnerRole;
  rewards: StoreReward[];
  currentUserId: string;
  onRedeemReward: (reward: StoreReward) => Promise<void>;
  onAddReward: (input: {
    title: string;
    description: string;
    costPoints: number;
    iconName: string;
  }) => Promise<void>;
  onDeleteReward: (rewardId: string) => Promise<void>;
}

export const RewardsStoreSection: React.FC<RewardsStoreSectionProps> = ({
  room,
  activeRole,
  rewards,
  currentUserId,
  onRedeemReward,
  onAddReward,
  onDeleteReward,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costPoints, setCostPoints] = useState<number>(75);
  const [iconName, setIconName] = useState<string>('Sparkles');
  const [submitting, setSubmitting] = useState(false);

  const myName = activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
  const myPoints =
    activeRole === 'partner1' ? room.partner1Points : room.partner2Points;

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await onAddReward({
        title: title.trim(),
        description: description.trim(),
        costPoints: Math.min(50000, Math.max(10, Number(costPoints) || 50)),
        iconName,
      });
      setTitle('');
      setDescription('');
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRewardIcon = (name: string) => {
    switch (name) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'Crown':
        return <Crown className="w-5 h-5 text-amber-300 shrink-0" />;
      case 'Heart':
        return <Heart className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Sparkles className="w-5 h-5 text-rose-400 shrink-0" />;
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Top Balance & Add Reward Bar */}
      <div className="rounded-2xl bg-slate-900/80 backdrop-blur-md border border-amber-500/35 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white font-display">
              متجر مكافآت الحب
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>رصيد {myName}: {myPoints} نقطة</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>إضافة مكافأة جديدة</span>
        </button>
      </div>

      {/* Rewards Grid inside remaining viewport height */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pl-0.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
          {rewards.map((reward) => {
            const canAfford = myPoints >= reward.costPoints;
            return (
              <div
                key={reward.id}
                className="rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-amber-500/40 p-4 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        {renderRewardIcon(reward.iconName)}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white font-display leading-snug whitespace-normal break-words">
                        {reward.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm tabular-nums">
                        {reward.costPoints} نقطة
                      </span>
                      {reward.authorId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteReward(reward.id)}
                          className="min-h-[38px] min-w-[38px] rounded-xl text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
                          title="حذف المكافأة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words mb-3">
                    {reward.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>تم الاستبدال: {reward.redeemedCount} مرة</span>
                    {reward.lastRedeemedBy && (
                      <span className="text-rose-300">
                        آخر طلب: {reward.lastRedeemedBy}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onRedeemReward(reward)}
                    className={`w-full min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer px-3 ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-amber-500/15'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Gift className="w-4 h-4 shrink-0" />
                    <span>
                      {canAfford
                        ? `استبدال المكافأة (${reward.costPoints} نقطة)`
                        : `تحتاج ${reward.costPoints - myPoints} نقطة إضافية`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Reward Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display">
                إضافة مكافأة جديدة للمتجر
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReward} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  عنوان المكافأة
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: سهرة مساج خاصة..."
                  className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    تكلفة النقاط
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    step={5}
                    value={costPoints}
                    onChange={(e) => setCostPoints(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رمز المكافأة
                  </label>
                  <select
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sparkles">نجوم وبريق</option>
                    <option value="Heart">قلب رومانسي</option>
                    <option value="Flame">شعلة شغف</option>
                    <option value="Crown">تاج ملكي VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  تفاصيل وشروط المكافأة
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={600}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح تفاصيل المكافأة..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{submitting ? 'جاري الإضافة...' : 'حفظ المكافأة في المتجر'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
