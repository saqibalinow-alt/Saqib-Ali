import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home, Zap } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  autoFire: boolean;
  onToggleAutoFire: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToTitle,
  isMuted,
  onToggleMute,
  autoFire,
  onToggleAutoFire,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">TACTICAL PAUSE</h2>
        <p className="text-xs text-slate-400 mb-6">Mission in progress · Systems on standby</p>

        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME SIMULATION</span>
            <span className="text-[11px] font-mono-numbers opacity-80">[ESC / P]</span>
          </button>

          <button
            onClick={onToggleAutoFire}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm border transition-colors cursor-pointer ${
              autoFire
                ? 'bg-sky-950/80 border-sky-500/80 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Zap className={`w-4 h-4 ${autoFire ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
            <span>AUTO-SHOOTER: {autoFire ? 'ACTIVE' : 'MANUAL'}</span>
            <span className="text-[11px] font-mono-numbers opacity-80">[F]</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART SECTOR</span>
          </button>

          <button
            onClick={onToggleMute}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>

          <button
            onClick={onReturnToTitle}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE SCREEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
