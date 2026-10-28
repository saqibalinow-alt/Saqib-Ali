/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameState, GameStats } from './game/types';
import { soundEngine } from './game/audio';
import { GameHUD } from './components/GameHUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { TouchControls } from './components/TouchControls';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    wave: 1,
    lives: 3,
    bombs: 2,
    shieldActive: false,
    weaponTier: 1,
    autoFire: false,
    enemiesDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 0,
  });
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.isMuted());

  // Mount canvas and initialize isolated 60fps simulation engine once
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (newState, newStats) => {
        setGameState(newState);
        setStats(newStats);
      },
      onStatsUpdate: (updatedStats) => {
        setStats(updatedStats);
      },
    });

    engineRef.current = engine;
    engine.start();

    // Initial stats sync
    setStats(engine.getStats());

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = useCallback(() => {
    engineRef.current?.startNewGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.startNewGame();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleTriggerBomb = useCallback(() => {
    engineRef.current?.triggerNovaBomb();
  }, []);

  const handleToggleAutoFire = useCallback(() => {
    engineRef.current?.toggleAutoFire();
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  }, []);

  const handleTouchMove = useCallback((dx: number, dy: number) => {
    engineRef.current?.setTouchMove(dx, dy);
  }, []);

  const handleTouchShoot = useCallback((shooting: boolean) => {
    engineRef.current?.setTouchShoot(shooting);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070f] flex items-center justify-center select-none">
      {/* 
        Isolated Game Canvas Container
        Ensures React state changes never re-mount or re-render canvas graphics
      */}
      <div className="relative w-full h-full max-w-[1200px] max-h-screen flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* In-Game Active HUD */}
        {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
          <>
            <GameHUD
              stats={stats}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onPause={handlePause}
              onTriggerBomb={handleTriggerBomb}
              onToggleAutoFire={handleToggleAutoFire}
            />
            {gameState === 'PLAYING' && (
              <TouchControls
                onMove={handleTouchMove}
                onShoot={handleTouchShoot}
                onBomb={handleTriggerBomb}
                bombCount={stats.bombs}
              />
            )}
          </>
        )}

        {/* Title Screen Overlay */}
        {gameState === 'TITLE_MENU' && (
          <TitleScreen
            onStart={handleStartGame}
            highScore={stats.highScore}
            autoFire={stats.autoFire}
            onToggleAutoFire={handleToggleAutoFire}
          />
        )}

        {/* Pause Modal Overlay */}
        {gameState === 'PAUSED' && (
          <PauseModal
            onResume={handleResume}
            onRestart={handleRestart}
            onReturnToTitle={handleReturnToTitle}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            autoFire={stats.autoFire}
            onToggleAutoFire={handleToggleAutoFire}
          />
        )}

        {/* Game Over Modal Overlay */}
        {gameState === 'GAME_OVER' && (
          <GameOverModal
            stats={stats}
            onRestart={handleRestart}
            onReturnToTitle={handleReturnToTitle}
          />
        )}
      </div>
    </div>
  );
}
