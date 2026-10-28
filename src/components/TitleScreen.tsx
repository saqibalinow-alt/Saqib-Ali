import React from 'react';
import { Play, Shield, Crosshair, Zap } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  highScore: number;
  autoFire: boolean;
  onToggleAutoFire: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  highScore,
  autoFire,
  onToggleAutoFire,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-12 select-none pointer-events-auto">
      {/* Top Header metadata */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono-numbers">
        <span className="tracking-widest">TACTICAL AEROSPACE COMBAT SIMULATOR</span>
        <div className="flex items-center gap-2">
          <span>HIGH SCORE RECORD</span>
          <span className="text-amber-400 font-bold">{highScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Centerpiece: Bespoke inline SVG Title Lockup with generous negative space */}
      <div className="flex flex-col items-center text-center max-w-xl mx-auto my-auto">
        <div className="relative mb-6">
          {/* Bespoke Geometric Aerospace Wings Emblem */}
          <svg
            className="w-24 h-24 mx-auto mb-4 text-sky-400 filter drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outer Wings */}
            <path d="M50 8L88 68L68 62L50 92L32 62L12 68L50 8Z" fill="#0f172a" fillOpacity="0.8" />
            {/* Inner Core */}
            <path d="M50 24L70 64L50 56L30 64L50 24Z" stroke="#38bdf8" />
            {/* Center Photon Eye */}
            <circle cx="50" cy="50" r="5" fill="#38bdf8" />
            <line x1="50" y1="4" x2="50" y2="18" stroke="#38bdf8" strokeWidth="2" />
          </svg>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            Nova Striker
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 font-medium tracking-wide">
            Defend Deep Space Sector 07 from invading hostile armadas
          </p>
        </div>

        {/* Feature Highlights (Clean unboxed text) */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-300 mb-6 font-medium">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>Precise Vector Blasters</span>
          </div>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>3-Life Hull Limit</span>
          </div>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Procedural Waves & Bosses</span>
          </div>
        </div>

        {/* Firing Mode Selector */}
        <div className="flex items-center gap-2 mb-6 p-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
          <span className="text-slate-400 px-2 font-mono-numbers text-[11px]">CANNON TRIGGER:</span>
          <button
            onClick={onToggleAutoFire}
            className={`px-3 py-1.5 rounded-md font-mono-numbers transition-colors cursor-pointer ${
              autoFire
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AUTO-SHOOTER [ON]
          </button>
          <button
            onClick={onToggleAutoFire}
            className={`px-3 py-1.5 rounded-md font-mono-numbers transition-colors cursor-pointer ${
              !autoFire
                ? 'bg-slate-800 text-slate-200 border border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MANUAL [SPACEBAR]
          </button>
        </div>

        {/* Primary Start CTA Button */}
        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 active:scale-95 rounded-lg shadow-[0_0_24px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>LAUNCH MISSION</span>
          <span className="text-xs font-mono-numbers px-2 py-0.5 rounded bg-sky-950/20 text-slate-950 font-bold">
            SPACE / ENTER
          </span>
        </button>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="w-full text-center py-2 border-t border-slate-800/80 text-xs sm:text-sm text-slate-400 font-mono-numbers">
        <span>Arrow Keys / WASD Move</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>Space / F Auto-Fire</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>B Nova Bomb</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>P / Esc Pause</span>
      </div>
    </div>
  );
};
