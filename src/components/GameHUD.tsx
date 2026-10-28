import React from 'react';
import { GameStats } from '../game/types';
import { Volume2, VolumeX, Pause, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { soundEngine } from '../game/audio';

interface GameHUDProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onTriggerBomb: () => void;
  onToggleAutoFire: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onPause,
  onTriggerBomb,
  onToggleAutoFire,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 z-10">
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between gap-4">
        {/* Top Left: 3-Life Meter & Deflector Shield */}
        <div className="flex flex-col gap-1.5 bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400">HULL INTEGRITY</span>
            <span className="text-xs font-mono-numbers font-bold text-sky-400">
              {stats.lives} / 3 LIVES
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            {/* Visual Ship Life Nodes */}
            {[1, 2, 3].map((lifeIndex) => {
              const active = lifeIndex <= stats.lives;
              return (
                <div
                  key={lifeIndex}
                  className={`w-7 h-5 flex items-center justify-center rounded transition-all duration-200 border ${
                    active
                      ? 'bg-sky-950/80 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                      : 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-30'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={active ? '#38bdf8' : 'none'}
                    stroke={active ? '#38bdf8' : '#475569'}
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M12 2L4 20L12 16L20 20L12 2Z" />
                  </svg>
                </div>
              );
            })}

            {/* Shield Status */}
            {stats.shieldActive && (
              <div className="flex items-center gap-1 ml-2 text-cyan-400 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-mono-numbers">DEFLECTOR</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Center: Sector & Wave Marker */}
        <div className="flex flex-col items-center bg-slate-950/70 border border-slate-800/80 rounded-lg px-4 py-2 backdrop-blur-xs">
          <span className="text-[10px] tracking-widest text-slate-400 font-medium">SECTOR PROGRESS</span>
          <span className="text-base sm:text-lg font-mono-numbers font-extrabold tracking-wider text-white">
            ZONE 0{stats.wave}
          </span>
        </div>

        {/* Top Right: Score Tracker & Best Record */}
        <div className="flex flex-col items-end gap-1 bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold tracking-wider">SCORE</span>
            <span className="font-mono-numbers font-extrabold text-lg text-amber-400 tracking-wider">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>BEST</span>
            <span className="font-mono-numbers font-medium text-slate-300">
              {stats.highScore.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter Cluster */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom Left: Nova Bomb, Auto-Fire & Cannon Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onTriggerBomb}
            disabled={stats.bombs <= 0}
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg border font-mono-numbers transition-all ${
              stats.bombs > 0
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 hover:bg-rose-900/90 active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.3)] cursor-pointer'
                : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title="Detonate Screen-Clearing Nova Pulse [Key B]"
          >
            <Sparkles className="w-4 h-4 text-rose-400" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-xs font-bold tracking-wide">NOVA BOMB</span>
              <span className="text-[10px] text-rose-400/90">{stats.bombs} READY · [B]</span>
            </div>
          </button>

          {/* Auto-Shooter / Auto-Fire Mode Toggle */}
          <button
            onClick={onToggleAutoFire}
            className={`pointer-events-auto flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg border font-mono-numbers transition-all cursor-pointer ${
              stats.autoFire
                ? 'bg-sky-950/80 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
            title="Toggle Continuous Auto-Fire Blasters [Key F]"
          >
            <Zap className={`w-4 h-4 ${stats.autoFire ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[11px] font-bold tracking-wide">AUTO-FIRE</span>
              <span className={`text-[10px] ${stats.autoFire ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
                {stats.autoFire ? 'ACTIVE' : 'MANUAL'} · [F]
              </span>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs font-mono-numbers text-slate-300">
            <span className="text-slate-500">CANNON:</span>
            <span className="text-sky-400 font-bold">
              {stats.weaponTier === 1 ? 'DUAL BLASTER' : stats.weaponTier === 2 ? 'TRIPLE SPREAD' : 'HYPER PLASMA'}
            </span>
          </div>
        </div>

        {/* Bottom Right: Quick Utility Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="pointer-events-auto p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label="Toggle sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          <button
            onClick={onPause}
            className="pointer-events-auto p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Pause Simulation [P / Esc]"
            aria-label="Pause game"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
