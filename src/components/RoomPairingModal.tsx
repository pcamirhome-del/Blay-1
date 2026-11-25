import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Heart,
  Link2,
  LogIn,
  Sparkles,
  Users,
} from 'lucide-react';

interface RoomPairingModalProps {
  user: User | null;
  authLoading: boolean;
  onGoogleSignIn: () => Promise<void>;
  onCreateRoom: (
    roomCode: string,
    partner1Name: string,
    partner2Name: string
  ) => Promise<void>;
  onJoinRoom: (roomCode: string, partner2Name: string) => Promise<void>;
  errorMsg: string;
  isSubmitting: boolean;
}

export const RoomPairingModal: React.FC<RoomPairingModalProps> = ({
  user,
  authLoading,
  onGoogleSignIn,
  onCreateRoom,
  onJoinRoom,
  errorMsg,
  isSubmitting,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState<string>(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'HB';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  });
  const [partner1Name, setPartner1Name] = useState<string>(
    user?.displayName?.split(' ')[0] || 'حبيبي'
  );
  const [partner2Name, setPartner2Name] = useState<string>('روحي');
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinName, setJoinName] = useState<string>(
    user?.displayName?.split(' ')[0] || 'روحي'
  );
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      const cleaned = roomCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (cleaned.length < 4) return;
      await onCreateRoom(
        cleaned,
        partner1Name.trim() || 'الشريك الأول',
        partner2Name.trim() || 'الشريك الثاني'
      );
    } else {
      const cleaned = joinCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (cleaned.length < 4) return;
      await onJoinRoom(cleaned, joinName.trim() || 'الشريك الثاني');
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-2 overflow-y-auto custom-scroll">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-md border border-rose-500/35 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-500/25 border border-rose-500/40 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              ربط الجهازين برمز الغرفة الخاص
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              مزامنة لحظية للخلفية، الأهداف، البطاقات، والعجلة
            </p>
          </div>
        </div>

        {!user ? (
          <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-5 text-center space-y-3">
            <Heart className="w-9 h-9 text-rose-400 mx-auto" />
            <h3 className="text-sm sm:text-base font-bold text-white font-display">
              تسجيل الدخول لتفعيل المزامنة بين الشاشتين
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed whitespace-normal break-words">
              سجّل الدخول بحساب Google لربط هاتفك بهاتف شريكك ومزامنة الصور والفيديوهات والأهداف لحظياً.
            </p>
            <button
              type="button"
              disabled={authLoading}
              onClick={onGoogleSignIn}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{authLoading ? 'جاري الاتصال...' : 'تسجيل الدخول عبر Google'}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'create'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                إنشاء غرفة جديدة
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'join'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الانضمام برمز الشريك
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'create' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      رمز الغرفة الخاص بكما (شاركه مع شريكك)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={20}
                        value={roomCode}
                        onChange={(e) =>
                          setRoomCode(
                            e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                          )
                        }
                        dir="ltr"
                        className="flex-1 min-h-[46px] rounded-xl bg-slate-950 border border-rose-500/40 px-3 text-center font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="min-h-[46px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-rose-400" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        اسمك (أو لقبك)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={partner1Name}
                        onChange={(e) => setPartner1Name(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        اسم شريكك
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={partner2Name}
                        onChange={(e) => setPartner2Name(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      أدخل رمز الغرفة الذي أرسله شريكك
                    </label>
                    <input
                      type="text"
                      required
                      minLength={4}
                      maxLength={20}
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(
                          e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                        )
                      }
                      dir="ltr"
                      className="w-full min-h-[46px] rounded-xl bg-slate-950 border border-amber-500/40 px-4 text-center font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                      placeholder="HB4829"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      اسمك أو لقبك
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {errorMsg && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2 text-xs text-rose-300 font-medium whitespace-normal break-words">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {mode === 'create' ? (
                  <>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      {isSubmitting ? 'جاري التجهيز...' : 'إنشاء الغرفة وبدء السهرة'}
                    </span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      {isSubmitting ? 'جاري الربط...' : 'ربط الجهازين والانضمام'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
