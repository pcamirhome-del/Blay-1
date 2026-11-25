import React, { useEffect, useRef, useState } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { triggerActionChime } from '../firebase';

interface PinLockScreenProps {
  savedPin: string;
  onUnlock: () => void;
}

interface FloatingParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftX: number;
  phase: number;
  opacity: number;
  symbol: string;
}

const SYMBOLS = ['❤️', '💖', '💕', '💋', '❤️', '💋', '💖'];

/**
 * Ultra-Private Stealth Lock Screen:
 * - ZERO text titles, ZERO app descriptions, ZERO hints about the app's content.
 * - Full-screen 100dvh non-scrollable canvas of floating glowing hearts (❤️, 💖, 💕) and kisses (💋) on #090d16.
 * - Minimalist 4 circular dot indicators + semi-transparent glassmorphic numeric keypad (0–9).
 */
export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  savedPin,
  onUnlock,
}) => {
  const [digits, setDigits] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Continuous HTML5 Canvas Floating Hearts & Kisses Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const count = Math.min(34, Math.max(18, Math.floor(width / 26)));
    const particles: FloatingParticle[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 16 + Math.random() * 18,
      speedY: 0.45 + Math.random() * 0.9,
      driftX: 0.35 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.25 + Math.random() * 0.6,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y -= p.speedY;
        p.phase += 0.015;
        const currentX = p.x + Math.sin(p.phase) * 18 * p.driftX;

        if (p.y < -40) {
          p.y = height + 30;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.font = `${Math.round(p.size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(244, 63, 94, 0.55)';
        ctx.shadowBlur = 14;
        ctx.fillText(p.symbol, currentX, p.y);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const targetPin = savedPin && savedPin.length === 4 ? savedPin : '0000';

  const handleDigitPress = (digit: string) => {
    setHasError(false);
    if (digits.length >= 4) return;
    const next = digits + digit;
    setDigits(next);

    if (next.length === 4) {
      if (next === targetPin) {
        triggerActionChime();
        onUnlock();
      } else {
        setHasError(true);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([80, 50, 80]);
        }
        setTimeout(() => {
          setDigits('');
          setHasError(false);
        }, 420);
      }
    }
  };

  const handleBackspace = () => {
    setHasError(false);
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setHasError(false);
    setDigits('');
  };

  return (
    <div
      dir="ltr"
      className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[#090d16] flex flex-col items-center justify-center p-4 select-none"
    >
      {/* Background Canvas of Floating Glowing Hearts & Kisses */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full z-0"
      />

      {/* Ambient Subtle Radial Glow */}
      <div className="pointer-events-none absolute w-80 h-80 rounded-full bg-rose-500/10 blur-3xl z-0" />

      {/* Minimalist PIN Pad Container — ZERO text titles or hints */}
      <div className="relative z-10 w-full max-w-[290px] rounded-3xl bg-slate-900/45 backdrop-blur-xl border border-rose-500/25 p-5 shadow-2xl shadow-black/70 flex flex-col items-center">
        {/* 4 Circular Dot Indicators */}
        <div
          className={`flex items-center justify-center gap-4 my-4 ${
            hasError ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const filled = index < digits.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  hasError
                    ? 'bg-rose-500 shadow-lg shadow-rose-500/60 scale-110'
                    : filled
                    ? 'bg-gradient-to-br from-rose-400 to-amber-400 shadow-md shadow-rose-500/50 scale-110'
                    : 'bg-white/15 border border-white/25'
                }`}
              />
            );
          })}
        </div>

        {/* Sleek Glassmorphic Numeric Keypad (0-9) */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitPress(num)}
              className="min-h-[54px] h-14 rounded-2xl bg-white/[0.06] hover:bg-rose-500/20 active:scale-95 border border-white/10 hover:border-rose-400/40 text-xl font-bold font-mono text-white/90 transition-all flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear"
            className="min-h-[54px] h-14 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="min-h-[54px] h-14 rounded-2xl bg-white/[0.06] hover:bg-rose-500/20 active:scale-95 border border-white/10 hover:border-rose-400/40 text-xl font-bold font-mono text-white/90 transition-all flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="min-h-[54px] h-14 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-slate-400 hover:text-rose-300 transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
