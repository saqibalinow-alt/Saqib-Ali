import React from 'react';
import { GameStats } from '../game/types';
import { RotateCcw, Home, Award, Target, ShieldAlert } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onReturnToTitle,
}) => {
  const isNewHigh = stats.score > 0 && stats.score >= stats.highScore;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Emblem */}
        <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_16px_rgba(244,63,94,0.3)]">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
          Hull Destroyed
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-5">
          3-Life limit exhausted · Fighter signal lost in Sector 0{stats.wave}
        </p>

        {/* Score Highlight Box */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-4 mb-5 flex flex-col items-center">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wider">FINAL SCORE</span>
          <span className="text-3xl sm:text-4xl font-mono-numbers font-black text-amber-400 my-1">
            {stats.score.toLocaleString()}
          </span>

          {isNewHigh ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-1">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>NEW ALL-TIME RECORD!</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono-numbers">
              BEST RECORD: {stats.highScore.toLocaleString()}
            </span>
          )}
        </div>

        {/* Mission Telemetry Summary */}
        <div className="w-full grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-xs font-mono-numbers mb-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500">SECTOR</span>
            <span className="text-slate-200 font-bold text-sm">0{stats.wave}</span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-800">
            <span className="text-[10px] text-slate-500">KILLS</span>
            <span className="text-sky-400 font-bold text-sm">{stats.enemiesDestroyed}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500">ACCURACY</span>
            <span className="text-emerald-400 font-bold text-sm">{stats.accuracy}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>DEPLOY AGAIN</span>
            <span className="text-xs font-mono-numbers px-1.5 py-0.5 rounded bg-sky-950/20 text-slate-950">
              SPACE / ENTER
            </span>
          </button>

          <button
            onClick={onReturnToTitle}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
