import React, { useState } from 'react';
import { Delete, HeartHandshake, KeyRound, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { triggerActionChime } from '../firebase';

interface PinLockScreenProps {
  savedPin: string | null;
  onUnlock: (pin: string) => void;
  onResetPin: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  savedPin,
  onUnlock,
  onResetPin,
}) => {
  const [digits, setDigits] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const isSettingNewPin = !savedPin;

  const handleDigitPress = (digit: string) => {
    setError('');
    if (digits.length >= 4) return;
    const next = digits + digit;
    setDigits(next);

    if (next.length === 4) {
      if (isSettingNewPin) {
        triggerActionChime();
        onUnlock(next);
      } else if (next === savedPin) {
        triggerActionChime();
        onUnlock(next);
      } else {
        setError('رمز الحماية غير صحيح، حاول مرة أخرى');
        setTimeout(() => setDigits(''), 350);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleQuickDemoPin = () => {
    triggerActionChime();
    onUnlock(savedPin || '1234');
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="w-full max-w-md rounded-3xl bg-slate-900/80 backdrop-blur-md border border-rose-500/30 p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/40 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
            {isSettingNewPin ? (
              <KeyRound className="w-7 h-7 text-amber-400" />
            ) : (
              <Lock className="w-7 h-7 text-rose-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">
            {isSettingNewPin ? 'إعداد رمز الخصوصية (PIN)' : 'قفل الخصوصية للزوجين'}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-xs leading-relaxed">
            {isSettingNewPin
              ? 'اختر رمزاً سرياً من ٤ أرقام لحماية مساحتكما الخاصة على هذا الجهاز'
              : 'أدخل رمز الحماية المكون من ٤ أرقام للدخول إلى مساحتكما الخاصة'}
          </p>
        </div>

        {/* 4-Digit Indicator Slots */}
        <div className="flex items-center justify-center gap-3.5 my-6" dir="ltr">
          {[0, 1, 2, 3].map((index) => {
            const filled = index < digits.length;
            return (
              <div
                key={index}
                className={`w-13 h-14 rounded-2xl flex items-center justify-center border text-xl font-bold font-mono transition-all duration-150 ${
                  filled
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/15 scale-105'
                    : 'bg-slate-950/70 border-slate-800 text-slate-600'
                }`}
              >
                {filled ? '•' : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-400 text-center font-medium mb-4">{error}</p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitPress(num)}
              className="min-h-[54px] rounded-2xl bg-slate-800/70 hover:bg-slate-800 active:scale-95 border border-slate-700/70 hover:border-rose-500/40 text-lg font-bold font-mono text-white transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDigits('')}
            className="min-h-[54px] rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="min-h-[54px] rounded-2xl bg-slate-800/70 hover:bg-slate-800 active:scale-95 border border-slate-700/70 hover:border-rose-500/40 text-lg font-bold font-mono text-white transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="حذف رقم"
            className="min-h-[54px] rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Quick Entry / Reset Controls */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleQuickDemoPin}
            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-rose-600/20 to-amber-500/20 hover:from-rose-600/30 hover:to-amber-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>
              {isSettingNewPin
                ? 'تعيين الرمز السريع (1234) والدخول فوراً'
                : 'فتح القفل السريع للمعاينة'}
            </span>
          </button>

          {!isSettingNewPin && (
            <div className="text-center">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-xs text-slate-400 hover:text-amber-300 transition-colors py-1 cursor-pointer"
                >
                  نسيت رمز الحماية؟ إعادة تعيين الرمز المحلي
                </button>
              ) : (
                <div className="flex items-center justify-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onResetPin();
                      setConfirmReset(false);
                      setDigits('');
                    }}
                    className="text-xs text-rose-400 font-semibold hover:underline cursor-pointer"
                  >
                    تأكيد إعادة التعيين
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>مشفر ومحمي بخصوصية تامة بين جهازيكما فقط</span>
        </div>
      </div>
    </div>
  );
};
