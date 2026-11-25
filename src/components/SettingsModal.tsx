import React, { useState } from 'react';
import {
  Check,
  Copy,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  RotateCcw,
  Sliders,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import { CoupleRoom, PartnerRole } from '../types';
import { PWAInstallButton } from './PWAInstallPrompt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: CoupleRoom | null;
  activeRole: PartnerRole;
  onSwitchRole: (role: PartnerRole) => void;
  onUploadBackground: (
    file: File,
    onProgress: (pct: number) => void
  ) => Promise<void>;
  onUpdateOverlayOpacity: (opacity: number) => Promise<void>;
  onResetBackground: () => Promise<void>;
  currentPin: string;
  onChangePin: (newPin: string) => void;
  onLeaveRoom: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  room,
  activeRole,
  onSwitchRole,
  onUploadBackground,
  onUpdateOverlayOpacity,
  onResetBackground,
  currentPin,
  onChangePin,
  onLeaveRoom,
}) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');
  const [localOpacity, setLocalOpacity] = useState<number>(
    room?.bgOverlayOpacity ?? 65
  );
  const [newPin, setNewPin] = useState<string>(currentPin || '0000');
  const [pinSaved, setPinSaved] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(5);
    try {
      await onUploadBackground(file, (pct) => setUploadProgress(pct));
      setUploadSuccess('تم رفع الخلفية ومزامنتها على شاشتي الطرفين بنجاح!');
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'تعذر رفع ملف الخلفية، حاول بملف أصغر'
      );
    } finally {
      setTimeout(() => setUploadProgress(null), 900);
      e.target.value = '';
    }
  };

  const handleOpacityChange = async (val: number) => {
    const clamped = Math.min(90, Math.max(20, val));
    setLocalOpacity(clamped);
    await onUpdateOverlayOpacity(clamped);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPin.replace(/[^0-9]/g, '').slice(0, 4);
    if (cleaned.length !== 4) return;
    onChangePin(cleaned);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2200);
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5"
    >
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl bg-slate-900/95 border border-rose-500/35 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-rose-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              الإعدادات والخلفية الحية المشتركة
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 overflow-y-auto custom-scroll space-y-5">
          {/* 1. Shared Live Media Background Upload */}
          {room && (
            <div className="rounded-2xl bg-slate-950/80 border border-rose-500/30 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-rose-400 shrink-0" />
                  <h3 className="text-sm font-bold text-white font-display">
                    ١. رفع خلفية حية مشتركة (صورة / GIF / فيديو)
                  </h3>
                </div>
                <Video className="w-4 h-4 text-amber-400 shrink-0" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                أي صورة أو صورة متحركة (GIF) أو فيديو قصير (MP4 / WebM) ترفعه هنا يظهر فوراً كخلفية حية على شاشتك وشاشة شريكك في نفس اللحظة.
              </p>

              <label className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 px-4 py-2.5 shadow-lg shadow-rose-600/20 cursor-pointer transition-all">
                <Upload className="w-4 h-4 shrink-0" />
                <span>اختيار صورة أو GIF أو فيديو من جهازك</span>
                <input
                  type="file"
                  accept="image/*,image/gif,video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Live Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                    <span>جاري الرفع والمزامنة مع شاشة الشريك...</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <p className="text-xs text-emerald-400 font-semibold leading-relaxed">
                  {uploadSuccess}
                </p>
              )}

              {uploadError && (
                <p className="text-xs text-rose-400 font-semibold leading-relaxed">
                  {uploadError}
                </p>
              )}

              {/* 2. Overlay Darkness Slider (20% to 90%) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    ٢. شريط التحكم في عتامة الخلفية (للطرفين):
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {localOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={localOpacity}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>إضاءة أوضح (20%)</span>
                  <span>عتامة عالية للنصوص (90%)</span>
                </div>
              </div>

              {/* 3. Reset to Default Theme Button */}
              <button
                type="button"
                onClick={onResetBackground}
                className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                <span>استعادة الخلفية الرومانسية الافتراضية للطرفين</span>
              </button>
            </div>
          )}

          {/* 4. Change 4-Digit Stealth Lock PIN */}
          <form
            onSubmit={handleSavePin}
            className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-white font-display">
                تغيير رمز شاشة القفل السرية (PIN من ٤ أرقام)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              الرمز الافتراضي هو <span className="font-mono text-amber-300">0000</span>. يمكنك تخصيصه لحماية التطبيق على جهازك.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                required
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))
                }
                dir="ltr"
                placeholder="0000"
                className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 px-3 text-center font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={newPin.length !== 4}
                className="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                {pinSaved ? 'تم الحفظ!' : 'حفظ الرمز'}
              </button>
            </div>
          </form>

          {/* 5. Room Pairing Code & Active Partner Role Switcher */}
          {room && (
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-400 shrink-0" />
                  <h3 className="text-sm font-bold text-white font-display">
                    غرفة الزوجين والربط بين الجهازين
                  </h3>
                </div>
                <span className="font-mono font-bold text-amber-300 text-xs">
                  {room.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchRole('partner1')}
                  className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeRole === 'partner1'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-300'
                  }`}
                >
                  التفاعل باسم: {room.partner1Name}
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole('partner2')}
                  className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeRole === 'partner2'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 border border-slate-800 text-slate-300'
                  }`}
                >
                  التفاعل باسم: {room.partner2Name}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>تم نسخ الرمز ({room.code})</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>نسخ رمز الغرفة للشريك</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLeaveRoom();
                  }}
                  className="min-h-[44px] px-3.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>تغيير الغرفة</span>
                </button>
              </div>
            </div>
          )}

          {/* PWA Install Helper inside Settings */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-3">
            <span className="text-xs text-slate-300">
              تثبيت التطبيق على الشاشة الرئيسية:
            </span>
            <PWAInstallButton />
          </div>
        </div>
      </div>
    </div>
  );
};
