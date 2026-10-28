import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onShoot: (active: boolean) => void;
  onBomb: () => void;
  bombCount: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onShoot,
  onBomb,
  bombCount,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });

  const maxRadius = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      originRef.current = { x: centerX, y: centerY };

      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);

      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;

      setKnobPos({ x: kx, y: ky });
      setIsTouching(true);
      onMove(kx / maxRadius, ky / maxRadius);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const dx = touch.clientX - originRef.current.x;
        const dy = touch.clientY - originRef.current.y;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const kx = Math.cos(angle) * clampedDist;
        const ky = Math.sin(angle) * clampedDist;

        setKnobPos({ x: kx, y: ky });
        onMove(kx / maxRadius, ky / maxRadius);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        setIsTouching(false);
        onMove(0, 0);
        break;
      }
    }
  };

  // Only render on devices that support touch
  const [hasTouch, setHasTouch] = useState(false);
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setHasTouch(true);
    }
  }, []);

  if (!hasTouch) return null;

  return (
    <div className="absolute inset-x-0 bottom-16 sm:bottom-20 z-15 pointer-events-none flex items-end justify-between px-6 select-none">
      {/* Left: Virtual Joystick Pad */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-slate-900/60 border border-slate-700/80 backdrop-blur-xs flex items-center justify-center touch-none"
      >
        {/* Direction Crosshairs */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-1 h-full bg-slate-500 rounded-full" />
          <div className="absolute h-1 w-full bg-slate-500 rounded-full" />
        </div>

        {/* Joystick Thumb Knob */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-transform duration-75 ${
            isTouching
              ? 'bg-sky-500/80 border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.6)]'
              : 'bg-slate-700/70 border-slate-500'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white/60" />
        </div>
      </div>

      {/* Right: Touch Action Buttons */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Bomb Button */}
        {bombCount > 0 && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onBomb();
            }}
            className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-500/80 flex flex-col items-center justify-center text-rose-300 active:scale-90 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
          >
            <Sparkles className="w-5 h-5 text-rose-400" />
            <span className="text-[9px] font-mono-numbers font-bold">BOMB</span>
          </button>
        )}

        {/* Fire Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onShoot(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onShoot(false);
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            onShoot(false);
          }}
          className="w-20 h-20 rounded-full bg-sky-500/80 border-2 border-sky-300 flex flex-col items-center justify-center text-slate-950 active:scale-95 shadow-[0_0_16px_rgba(56,189,248,0.5)] touch-none"
        >
          <Crosshair className="w-7 h-7 text-slate-950" />
          <span className="text-[10px] font-black uppercase tracking-wider">FIRE</span>
        </button>
      </div>
    </div>
  );
};
