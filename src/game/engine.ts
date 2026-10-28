/**
 * Core 60fps Game Simulation & Vector Rendering Engine
 * Handles all game logic, collision detection, physics, particles, and input.
 */

import { soundEngine } from './audio';
import {
  Asteroid,
  Enemy,
  FloatingText,
  GameState,
  GameStats,
  Laser,
  Particle,
  Pickup,
  PickupType,
  PlayerShip,
  Star,
  WeaponTier,
} from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Viewport & Scale
  public width: number = 800;
  public height: number = 960;
  private dpr: number = 1;

  // Animation & Loop
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private hitstopMs: number = 0;

  // Camera Shake
  private trauma: number = 0;
  private shakeOffset = { x: 0, y: 0 };

  // Inputs
  private heldKeys = new Set<string>();
  private touchState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    shooting: false,
  };

  // Game Entities
  private player: PlayerShip;
  private lasers: Laser[] = [];
  private enemies: Enemy[] = [];
  private asteroids: Asteroid[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private stars: Star[] = [];

  // Wave / Spawning
  private wave: number = 1;
  private waveTimer: number = 0;
  private waveState: 'spawning' | 'active' | 'cleared' = 'spawning';
  private waveSpawnQueue: { type: Enemy['type']; delay: number }[] = [];
  private asteroidSpawnTimer: number = 2.0;

  // Auto-Fire Mode
  private autoFire: boolean = false;

  // Stats & Progress
  private score: number = 0;
  private highScore: number = 0;
  private enemiesDestroyed: number = 0;
  private shotsFired: number = 0;
  private shotsHit: number = 0;

  // Game State
  public state: GameState = 'TITLE_MENU';
  private onStateChange?: (state: GameState, stats: GameStats) => void;
  private onStatsUpdate?: (stats: GameStats) => void;
  private statsUpdateTimer: number = 0;

  // Unique ID counter
  private nextId: number = 1;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks?: {
      onStateChange?: (state: GameState, stats: GameStats) => void;
      onStatsUpdate?: (stats: GameStats) => void;
    }
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    this.onStateChange = callbacks?.onStateChange;
    this.onStatsUpdate = callbacks?.onStatsUpdate;

    // Load High Score & Auto-Fire preference
    try {
      const savedHigh = localStorage.getItem('nova_striker_high_score');
      if (savedHigh) this.highScore = parseInt(savedHigh, 10) || 0;

      const savedAutoFire = localStorage.getItem('nova_striker_autofire');
      if (savedAutoFire !== null) {
        this.autoFire = savedAutoFire === 'true';
      }
    } catch {
      // Ignore
    }

    this.player = this.createDefaultPlayer();
    this.initStars();
    this.setupWindowListeners();
    this.handleResize();
  }

  private createDefaultPlayer(): PlayerShip {
    return {
      x: this.width / 2,
      y: this.height - 120,
      vx: 0,
      vy: 0,
      speed: 460,
      radius: 20,
      tilt: 0,
      lives: 3,
      maxLives: 3,
      shield: false,
      weaponTier: 1,
      rapidFireTimer: 0,
      bombs: 2,
      invulnerableTimer: 0,
      fireCooldown: 0,
    };
  }

  private initStars() {
    this.stars = [];
    const starCount = 140;
    for (let i = 0; i < starCount; i++) {
      const speedTier = Math.random();
      let speed = 40;
      let size = 1;
      let alpha = 0.4;
      let color = '#64748b';

      if (speedTier > 0.85) {
        speed = 240 + Math.random() * 80;
        size = 2.2;
        alpha = 0.9;
        color = '#38bdf8';
      } else if (speedTier > 0.5) {
        speed = 110 + Math.random() * 50;
        size = 1.5;
        alpha = 0.65;
        color = '#94a3b8';
      }

      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed,
        size,
        alpha,
        color,
      });
    }
  }

  public handleResize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const targetW = rect.width || window.innerWidth;
    const targetH = rect.height || window.innerHeight;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = targetW * this.dpr;
    this.canvas.height = targetH * this.dpr;

    this.width = targetW;
    this.height = targetH;

    // Reposition player if out of bounds
    if (this.player) {
      this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));
      this.player.y = Math.max(50, Math.min(this.height - 50, this.player.y));
    }
  }

  private setupWindowListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', () => this.handleResize());
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default scroll behaviors for game keys
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyB', 'KeyF'].includes(
        e.code
      )
    ) {
      e.preventDefault();
    }

    this.heldKeys.add(e.code);

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
      }
    } else if (e.code === 'KeyF') {
      this.toggleAutoFire();
    } else if (e.code === 'KeyB') {
      if (this.state === 'PLAYING') {
        this.triggerNovaBomb();
      }
    } else if (e.code === 'Space' || e.code === 'Enter') {
      if (this.state === 'TITLE_MENU' || this.state === 'GAME_OVER') {
        this.startNewGame();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = () => {
    // Clear all held inputs on window blur so ship doesn't drift
    this.heldKeys.clear();
    this.touchState.active = false;
    this.touchState.shooting = false;
  };

  public toggleAutoFire(): boolean {
    this.autoFire = !this.autoFire;
    try {
      localStorage.setItem('nova_striker_autofire', String(this.autoFire));
    } catch {
      // Ignore
    }

    if (this.state === 'PLAYING' && this.player) {
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 45,
        this.autoFire ? 'AUTO-FIRE [ACTIVE]' : 'AUTO-FIRE [OFF]',
        this.autoFire ? '#38bdf8' : '#94a3b8',
        16
      );
    }
    this.emitStats();
    return this.autoFire;
  }

  public setAutoFire(enabled: boolean) {
    this.autoFire = enabled;
    try {
      localStorage.setItem('nova_striker_autofire', String(enabled));
    } catch {
      // Ignore
    }
    this.emitStats();
  }

  public isAutoFire(): boolean {
    return this.autoFire;
  }

  // Touch Virtual Controls
  public setTouchMove(dx: number, dy: number) {
    if (this.state !== 'PLAYING') return;
    this.player.vx = dx * this.player.speed;
    this.player.vy = dy * this.player.speed;
  }

  public setTouchShoot(shooting: boolean) {
    this.touchState.shooting = shooting;
  }

  public triggerNovaBomb() {
    if (this.state !== 'PLAYING' || this.player.bombs <= 0) return;

    this.player.bombs--;
    soundEngine.playBomb();
    this.trauma = Math.min(1.0, this.trauma + 0.9);

    // Shockwave particle ring
    this.particles.push({
      x: this.player.x,
      y: this.player.y,
      vx: 0,
      vy: 0,
      color: '#38bdf8',
      radius: 10,
      alpha: 1.0,
      decay: 0.8,
      shape: 'ring',
    });

    // Destroy all enemy lasers
    const laserCount = this.lasers.filter((l) => l.isEnemy).length;
    this.lasers = this.lasers.filter((l) => !l.isEnemy);

    // Heavy damage to all enemies on screen
    for (const enemy of this.enemies) {
      enemy.hp -= 90;
      this.createSparks(enemy.x, enemy.y, '#38bdf8', 12);
    }

    // Clear small asteroids
    for (const ast of this.asteroids) {
      ast.hp -= 50;
      this.createSparks(ast.x, ast.y, '#94a3b8', 8);
    }

    this.spawnFloatingText(
      this.player.x,
      this.player.y - 40,
      `NOVA PULSE! [${laserCount} DEFLECTED]`,
      '#38bdf8',
      18
    );
    this.emitStats();
  }

  public startNewGame() {
    this.player = this.createDefaultPlayer();
    this.lasers = [];
    this.enemies = [];
    this.asteroids = [];
    this.pickups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.score = 0;
    this.enemiesDestroyed = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.waveState = 'spawning';
    this.buildWave(this.wave);

    soundEngine.playWaveStart();
    this.state = 'PLAYING';
    this.emitStateChange();
    this.emitStats();
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.emitStateChange();
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = performance.now();
      this.emitStateChange();
    }
  }

  public returnToTitle() {
    this.state = 'TITLE_MENU';
    this.emitStateChange();
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Strict 60fps delta clamp to prevent spiral of death
    const dt = Math.min(rawDt, 0.05);

    // Hitstop handling
    if (this.hitstopMs > 0) {
      this.hitstopMs -= dt * 1000;
      // Skip logic, still render with subtle shake
      this.render();
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.updateCameraShake(dt);
    this.updateStars(dt);

    // Idle background ambient animation on title menu
    if (this.state === 'TITLE_MENU') {
      this.updateParticles(dt);
      return;
    }

    if (this.state === 'PAUSED') {
      return;
    }

    if (this.state === 'PLAYING' || this.state === 'GAME_OVER') {
      this.updatePlayer(dt);
      this.updateLasers(dt);
      this.updateEnemies(dt);
      this.updateAsteroids(dt);
      this.updatePickups(dt);
      this.updateParticles(dt);
      this.updateFloatingTexts(dt);

      if (this.state === 'PLAYING') {
        this.updateWave(dt);
        this.checkCollisions();
      }
    }

    // Periodic stats emission to React HUD
    this.statsUpdateTimer += dt;
    if (this.statsUpdateTimer >= 0.08) {
      this.statsUpdateTimer = 0;
      this.emitStats();
    }
  }

  private updateCameraShake(dt: number) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
      const shakePower = Math.pow(this.trauma, 2) * 16;
      this.shakeOffset.x = (Math.random() * 2 - 1) * shakePower;
      this.shakeOffset.y = (Math.random() * 2 - 1) * shakePower;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }

  private updateStars(dt: number) {
    const warpBoost = this.state === 'PLAYING' ? 1.0 : 0.6;
    for (const star of this.stars) {
      star.y += star.speed * dt * warpBoost;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }

  private updatePlayer(dt: number) {
    if (this.state === 'GAME_OVER') return;

    // Movement: Keyboard Arrow Keys or WASD
    let moveX = 0;
    let moveY = 0;

    if (this.heldKeys.has('ArrowLeft') || this.heldKeys.has('KeyA')) moveX -= 1;
    if (this.heldKeys.has('ArrowRight') || this.heldKeys.has('KeyD')) moveX += 1;
    if (this.heldKeys.has('ArrowUp') || this.heldKeys.has('KeyW')) moveY -= 1;
    if (this.heldKeys.has('ArrowDown') || this.heldKeys.has('KeyS')) moveY += 1;

    // Normalize diagonal velocity
    if (moveX !== 0 && moveY !== 0) {
      const inv = 1 / Math.SQRT2;
      moveX *= inv;
      moveY *= inv;
    }

    if (moveX !== 0 || moveY !== 0) {
      this.player.vx = moveX * this.player.speed;
      this.player.vy = moveY * this.player.speed;
    } else if (!this.touchState.active) {
      // Natural deceleration friction
      this.player.vx *= Math.pow(0.001, dt);
      this.player.vy *= Math.pow(0.001, dt);
    }

    // Integrate position
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Clamp inside viewport
    const padding = 26;
    this.player.x = Math.max(padding, Math.min(this.width - padding, this.player.x));
    this.player.y = Math.max(padding + 30, Math.min(this.height - padding, this.player.y));

    // Banking tilt animation
    const targetTilt = this.player.vx / this.player.speed;
    this.player.tilt += (targetTilt - this.player.tilt) * Math.min(1, dt * 12);

    // Invulnerability timer
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Rapid-fire boost timer
    if (this.player.rapidFireTimer > 0) {
      this.player.rapidFireTimer -= dt;
    }

    // Shooting: Spacebar, touch shooting, or continuous auto-fire mode
    this.player.fireCooldown -= dt;
    const isTryingToShoot = this.heldKeys.has('Space') || this.touchState.shooting;

    if ((isTryingToShoot || this.autoFire) && this.player.fireCooldown <= 0) {
      this.shootLaser();
      const baseInterval = this.player.rapidFireTimer > 0 ? 0.08 : 0.14;
      this.player.fireCooldown = baseInterval;
    }

    // Thruster exhaust particles
    this.spawnThrusterParticles();
  }

  private shootLaser() {
    this.shotsFired++;
    const px = this.player.x;
    const py = this.player.y - 18;

    if (this.player.weaponTier === 1) {
      // Dual forward lasers
      this.lasers.push(
        {
          id: this.nextId++,
          x: px - 8,
          y: py,
          vx: 0,
          vy: -880,
          width: 3.5,
          height: 18,
          color: '#38bdf8',
          glowColor: '#0284c7',
          damage: 18,
          isEnemy: false,
        },
        {
          id: this.nextId++,
          x: px + 8,
          y: py,
          vx: 0,
          vy: -880,
          width: 3.5,
          height: 18,
          color: '#38bdf8',
          glowColor: '#0284c7',
          damage: 18,
          isEnemy: false,
        }
      );
      soundEngine.playLaser('standard');
    } else if (this.player.weaponTier === 2) {
      // Triple spread laser
      this.lasers.push(
        {
          id: this.nextId++,
          x: px,
          y: py - 4,
          vx: 0,
          vy: -920,
          width: 4.5,
          height: 22,
          color: '#38bdf8',
          glowColor: '#0284c7',
          damage: 22,
          isEnemy: false,
        },
        {
          id: this.nextId++,
          x: px - 12,
          y: py,
          vx: -180,
          vy: -880,
          width: 3.5,
          height: 18,
          color: '#818cf8',
          glowColor: '#4f46e5',
          damage: 18,
          isEnemy: false,
        },
        {
          id: this.nextId++,
          x: px + 12,
          y: py,
          vx: 180,
          vy: -880,
          width: 3.5,
          height: 18,
          color: '#818cf8',
          glowColor: '#4f46e5',
          damage: 18,
          isEnemy: false,
        }
      );
      soundEngine.playLaser('spread');
    } else {
      // Quad plasma hyper cannon
      const speed = -940;
      this.lasers.push(
        {
          id: this.nextId++,
          x: px - 6,
          y: py - 6,
          vx: 0,
          vy: speed,
          width: 5,
          height: 24,
          color: '#f43f5e',
          glowColor: '#e11d48',
          damage: 26,
          isEnemy: false,
        },
        {
          id: this.nextId++,
          x: px + 6,
          y: py - 6,
          vx: 0,
          vy: speed,
          width: 5,
          height: 24,
          color: '#f43f5e',
          glowColor: '#e11d48',
          damage: 26,
          isEnemy: false,
        },
        {
          id: this.nextId++,
          x: px - 18,
          y: py + 4,
          vx: -240,
          vy: -860,
          width: 4,
          height: 20,
          color: '#38bdf8',
          glowColor: '#0284c7',
          damage: 20,
          isEnemy: false,
        },
        {
          id: this.nextId++,
          x: px + 18,
          y: py + 4,
          vx: 240,
          vy: -860,
          width: 4,
          height: 20,
          color: '#38bdf8',
          glowColor: '#0284c7',
          damage: 20,
          isEnemy: false,
        }
      );
      soundEngine.playLaser('heavy');
    }
  }

  private spawnThrusterParticles() {
    const px = this.player.x;
    const py = this.player.y + 16;
    const tilt = this.player.tilt;

    // Dual exhaust emitters
    const exhausts = [px - 7 + tilt * 2, px + 7 + tilt * 2];
    for (const ex of exhausts) {
      this.particles.push({
        x: ex + (Math.random() * 4 - 2),
        y: py + (Math.random() * 4 - 2),
        vx: (Math.random() * 30 - 15) - tilt * 60,
        vy: 120 + Math.random() * 100,
        color: Math.random() > 0.4 ? '#38bdf8' : '#0284c7',
        radius: 2 + Math.random() * 2,
        alpha: 0.85,
        decay: 3.5,
      });
    }
  }

  private updateLasers(dt: number) {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.x += laser.vx * dt;
      laser.y += laser.vy * dt;

      // Despawn off-screen
      if (laser.y < -30 || laser.y > this.height + 30 || laser.x < -30 || laser.x > this.width + 30) {
        this.lasers.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.age += dt;

      // Specific movement patterns per enemy class
      switch (enemy.type) {
        case 'scout': {
          // Smooth sine sweep across screen
          if (enemy.startX !== undefined && enemy.sineAmplitude && enemy.sineSpeed) {
            enemy.x = enemy.startX + Math.sin(enemy.age * enemy.sineSpeed + (enemy.sineOffset || 0)) * enemy.sineAmplitude;
          }
          enemy.y += enemy.vy * dt;
          break;
        }

        case 'interceptor': {
          // Swoop downward, pause slightly at top, then accelerate toward player's horizontal
          if (enemy.y < 220) {
            enemy.y += enemy.vy * dt * 0.7;
          } else {
            const dx = this.player.x - enemy.x;
            enemy.x += Math.sign(dx) * Math.min(Math.abs(dx), 160 * dt);
            enemy.y += enemy.vy * dt * 1.25;
          }
          break;
        }

        case 'cruiser': {
          // Heavy slow downward drift with slight weaving
          enemy.y += enemy.vy * dt;
          enemy.x += Math.sin(enemy.age * 1.2) * 40 * dt;
          break;
        }

        case 'kamikaze': {
          // Erratic homing dive towards player
          const dx = this.player.x - enemy.x;
          enemy.x += Math.sign(dx) * Math.min(Math.abs(dx), 220 * dt);
          enemy.y += enemy.vy * dt;
          break;
        }

        case 'boss': {
          // Boss hovers in top half and glides side to side
          if (enemy.y < 140) {
            enemy.y += enemy.vy * dt;
          } else {
            enemy.x += Math.sin(enemy.age * 0.8) * 120 * dt;
          }
          break;
        }
      }

      // Firing logic
      enemy.fireCooldown -= dt;
      if (enemy.fireCooldown <= 0 && enemy.y > 20 && enemy.y < this.height - 100) {
        this.enemyShoot(enemy);
        enemy.fireCooldown = enemy.fireInterval + (Math.random() * 0.4 - 0.2);
      }

      // Despawn if escaped off bottom
      if (enemy.y > this.height + 60) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private enemyShoot(enemy: Enemy) {
    if (this.state !== 'PLAYING') return;

    if (enemy.type === 'scout') {
      this.lasers.push({
        id: this.nextId++,
        x: enemy.x,
        y: enemy.y + enemy.radius,
        vx: 0,
        vy: 360,
        width: 3.5,
        height: 14,
        color: '#f87171',
        glowColor: '#ef4444',
        damage: 1,
        isEnemy: true,
      });
      soundEngine.playEnemyLaser();
    } else if (enemy.type === 'interceptor') {
      // Twin lasers directed toward player position
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const speed = 420;
      this.lasers.push(
        {
          id: this.nextId++,
          x: enemy.x - 8,
          y: enemy.y + enemy.radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          width: 4,
          height: 16,
          color: '#fb923c',
          glowColor: '#ea580c',
          damage: 1,
          isEnemy: true,
        },
        {
          id: this.nextId++,
          x: enemy.x + 8,
          y: enemy.y + enemy.radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          width: 4,
          height: 16,
          color: '#fb923c',
          glowColor: '#ea580c',
          damage: 1,
          isEnemy: true,
        }
      );
      soundEngine.playEnemyLaser();
    } else if (enemy.type === 'cruiser') {
      // 3-way fan barrage
      const angles = [-0.25, 0, 0.25];
      for (const a of angles) {
        this.lasers.push({
          id: this.nextId++,
          x: enemy.x,
          y: enemy.y + enemy.radius,
          vx: Math.sin(a) * 380,
          vy: Math.cos(a) * 380,
          width: 5,
          height: 18,
          color: '#f43f5e',
          glowColor: '#be123c',
          damage: 1,
          isEnemy: true,
        });
      }
      soundEngine.playEnemyLaser();
    } else if (enemy.type === 'boss') {
      // Boss bullet blossom
      const count = 5;
      for (let i = 0; i < count; i++) {
        const offsetAngle = ((i - (count - 1) / 2) * 0.22);
        this.lasers.push({
          id: this.nextId++,
          x: enemy.x,
          y: enemy.y + enemy.radius - 10,
          vx: Math.sin(offsetAngle) * 350,
          vy: Math.cos(offsetAngle) * 350,
          width: 6,
          height: 18,
          color: '#e11d48',
          glowColor: '#9f1239',
          damage: 1,
          isEnemy: true,
        });
      }
      soundEngine.playEnemyLaser();
    }
  }

  private updateAsteroids(dt: number) {
    // Random asteroid spawner
    this.asteroidSpawnTimer -= dt;
    if (this.asteroidSpawnTimer <= 0) {
      this.asteroidSpawnTimer = 4.0 + Math.random() * 4.0;
      this.spawnRandomAsteroid();
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const ast = this.asteroids[i];
      ast.x += ast.vx * dt;
      ast.y += ast.vy * dt;
      ast.rotation += ast.rotationSpeed * dt;

      if (ast.y > this.height + ast.radius * 2) {
        this.asteroids.splice(i, 1);
      }
    }
  }

  private spawnRandomAsteroid(tier: 1 | 2 | 3 = 3, startX?: number, startY?: number) {
    const radius = tier === 3 ? 34 : tier === 2 ? 22 : 14;
    const x = startX ?? Math.random() * (this.width - 80) + 40;
    const y = startY ?? -radius - 10;
    const hp = tier === 3 ? 45 : tier === 2 ? 22 : 10;

    // Generate irregular polygon vertices
    const vertexCount = 8;
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const dist = radius * (0.75 + Math.random() * 0.45);
      vertices.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      });
    }

    this.asteroids.push({
      id: this.nextId++,
      x,
      y,
      vx: (Math.random() * 50 - 25),
      vy: 65 + Math.random() * 65,
      radius,
      hp,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() * 1.5 - 0.75),
      vertices,
      tier,
    });
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.duration += dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.duration * 3) * 30 * dt;

      if (p.y > this.height + 40) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;

      if (p.shape === 'ring') {
        p.radius += 240 * dt;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const text = this.floatingTexts[i];
      text.y += text.vy * dt;
      text.alpha -= dt * 1.1;

      if (text.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateWave(dt: number) {
    this.waveTimer += dt;

    // Check spawn queue
    if (this.waveSpawnQueue.length > 0) {
      if (this.waveTimer >= this.waveSpawnQueue[0].delay) {
        const item = this.waveSpawnQueue.shift()!;
        this.spawnEnemy(item.type);
      }
    } else if (this.enemies.length === 0 && this.waveState === 'spawning') {
      // Wave cleared!
      this.waveState = 'cleared';
      this.waveTimer = 0;
      soundEngine.playWaveStart();
      this.spawnFloatingText(
        this.width / 2,
        this.height / 2 - 50,
        `SECTOR 0${this.wave} SECURED!`,
        '#38bdf8',
        24
      );
      this.addScore(1000 * this.wave);
    } else if (this.waveState === 'cleared') {
      if (this.waveTimer >= 2.5) {
        this.wave++;
        this.waveState = 'spawning';
        this.waveTimer = 0;
        this.buildWave(this.wave);
      }
    }
  }

  private buildWave(waveNumber: number) {
    this.waveSpawnQueue = [];

    if (waveNumber % 5 === 0) {
      // Boss battle sector!
      this.spawnFloatingText(this.width / 2, 220, 'WARNING: FLAGSHIP DETECTED', '#ef4444', 22);
      this.waveSpawnQueue.push({ type: 'boss', delay: 1.0 });
      return;
    }

    // Standard wave queue
    let delay = 0.5;
    const scoutCount = 4 + waveNumber * 2;
    for (let i = 0; i < scoutCount; i++) {
      this.waveSpawnQueue.push({ type: 'scout', delay });
      delay += 0.45;
    }

    if (waveNumber >= 2) {
      delay += 1.0;
      const interceptorCount = 2 + waveNumber;
      for (let i = 0; i < interceptorCount; i++) {
        this.waveSpawnQueue.push({ type: 'interceptor', delay });
        delay += 0.8;
      }
    }

    if (waveNumber >= 3) {
      delay += 1.2;
      const cruiserCount = Math.min(3, Math.floor(waveNumber / 2));
      for (let i = 0; i < cruiserCount; i++) {
        this.waveSpawnQueue.push({ type: 'cruiser', delay });
        delay += 1.4;
      }
    }

    if (waveNumber >= 4) {
      delay += 1.0;
      const kamiCount = 3 + waveNumber;
      for (let i = 0; i < kamiCount; i++) {
        this.waveSpawnQueue.push({ type: 'kamikaze', delay });
        delay += 0.6;
      }
    }
  }

  private spawnEnemy(type: Enemy['type']) {
    const id = this.nextId++;
    const startX = Math.random() * (this.width - 120) + 60;
    const startY = -40;

    switch (type) {
      case 'scout': {
        this.enemies.push({
          id,
          type,
          x: startX,
          y: startY,
          vx: 0,
          vy: 110 + this.wave * 12,
          radius: 16,
          hp: 20 + this.wave * 4,
          maxHp: 20 + this.wave * 4,
          scoreValue: 120,
          fireCooldown: 1.2 + Math.random() * 1.5,
          fireInterval: 2.2,
          age: 0,
          telegraphTimer: 0,
          startX,
          sineAmplitude: 70 + Math.random() * 40,
          sineSpeed: 2.2,
          sineOffset: Math.random() * Math.PI * 2,
        });
        break;
      }

      case 'interceptor': {
        this.enemies.push({
          id,
          type,
          x: startX,
          y: startY,
          vx: 0,
          vy: 170 + this.wave * 15,
          radius: 20,
          hp: 40 + this.wave * 6,
          maxHp: 40 + this.wave * 6,
          scoreValue: 260,
          fireCooldown: 1.0 + Math.random() * 1.0,
          fireInterval: 1.8,
          age: 0,
          telegraphTimer: 0,
        });
        break;
      }

      case 'cruiser': {
        this.enemies.push({
          id,
          type,
          x: startX,
          y: startY,
          vx: 0,
          vy: 55 + this.wave * 5,
          radius: 34,
          hp: 130 + this.wave * 25,
          maxHp: 130 + this.wave * 25,
          scoreValue: 650,
          fireCooldown: 1.5,
          fireInterval: 2.6,
          age: 0,
          telegraphTimer: 0,
        });
        break;
      }

      case 'kamikaze': {
        this.enemies.push({
          id,
          type,
          x: startX,
          y: startY,
          vx: 0,
          vy: 240 + this.wave * 20,
          radius: 18,
          hp: 25 + this.wave * 4,
          maxHp: 25 + this.wave * 4,
          scoreValue: 220,
          fireCooldown: 9999, // Doesn't shoot, rams!
          fireInterval: 9999,
          age: 0,
          telegraphTimer: 0,
        });
        break;
      }

      case 'boss': {
        this.enemies.push({
          id,
          type,
          x: this.width / 2,
          y: -100,
          vx: 0,
          vy: 70,
          radius: 56,
          hp: 750 + this.wave * 150,
          maxHp: 750 + this.wave * 150,
          scoreValue: 4000,
          fireCooldown: 1.5,
          fireInterval: 1.6,
          age: 0,
          telegraphTimer: 0,
        });
        break;
      }
    }
  }

  // --- Collision Detection Logic ---
  private checkCollisions() {
    const px = this.player.x;
    const py = this.player.y;
    const pr = this.player.radius;

    // 1. Player Lasers vs Enemies
    for (let li = this.lasers.length - 1; li >= 0; li--) {
      const laser = this.lasers[li];
      if (laser.isEnemy) continue;

      let laserHit = false;

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const enemy = this.enemies[ei];
        const distSq = (laser.x - enemy.x) ** 2 + (laser.y - enemy.y) ** 2;
        const hitDist = (laser.width / 2 + enemy.radius) ** 2;

        if (distSq <= hitDist) {
          laserHit = true;
          this.shotsHit++;
          enemy.hp -= laser.damage;
          this.createSparks(laser.x, laser.y, laser.color, 4);

          if (enemy.hp <= 0) {
            this.destroyEnemy(enemy, ei);
          }
          break;
        }
      }

      // Check laser vs Asteroids
      if (!laserHit) {
        for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
          const ast = this.asteroids[ai];
          const distSq = (laser.x - ast.x) ** 2 + (laser.y - ast.y) ** 2;
          if (distSq <= (ast.radius + laser.width) ** 2) {
            laserHit = true;
            this.shotsHit++;
            ast.hp -= laser.damage;
            this.createSparks(laser.x, laser.y, '#94a3b8', 3);

            if (ast.hp <= 0) {
              this.destroyAsteroid(ast, ai);
            }
            break;
          }
        }
      }

      if (laserHit) {
        this.lasers.splice(li, 1);
      }
    }

    // 2. Enemy Lasers vs Player
    if (this.player.invulnerableTimer <= 0) {
      for (let li = this.lasers.length - 1; li >= 0; li--) {
        const laser = this.lasers[li];
        if (!laser.isEnemy) continue;

        const distSq = (laser.x - px) ** 2 + (laser.y - py) ** 2;
        if (distSq <= (laser.width / 2 + pr) ** 2) {
          this.lasers.splice(li, 1);
          this.damagePlayer();
          break;
        }
      }
    }

    // 3. Enemies vs Player (Ramming)
    if (this.player.invulnerableTimer <= 0) {
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const enemy = this.enemies[ei];
        const distSq = (enemy.x - px) ** 2 + (enemy.y - py) ** 2;
        if (distSq <= (enemy.radius + pr) ** 2) {
          enemy.hp -= 50;
          if (enemy.hp <= 0) {
            this.destroyEnemy(enemy, ei);
          }
          this.damagePlayer();
          break;
        }
      }
    }

    // 4. Asteroids vs Player
    if (this.player.invulnerableTimer <= 0) {
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const ast = this.asteroids[ai];
        const distSq = (ast.x - px) ** 2 + (ast.y - py) ** 2;
        if (distSq <= (ast.radius + pr) ** 2) {
          this.destroyAsteroid(ast, ai);
          this.damagePlayer();
          break;
        }
      }
    }

    // 5. Pickups vs Player
    for (let pi = this.pickups.length - 1; pi >= 0; pi--) {
      const p = this.pickups[pi];
      const distSq = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (distSq <= (p.radius + pr + 6) ** 2) {
        this.collectPickup(p);
        this.pickups.splice(pi, 1);
      }
    }
  }

  private damagePlayer() {
    if (this.player.shield) {
      // Shield absorbs hit!
      this.player.shield = false;
      this.player.invulnerableTimer = 1.2;
      soundEngine.playPlayerHit(true);
      this.trauma = Math.min(1.0, this.trauma + 0.35);
      this.spawnFloatingText(this.player.x, this.player.y - 30, 'SHIELD BROKEN!', '#38bdf8', 16);
      this.createSparks(this.player.x, this.player.y, '#38bdf8', 15);
      return;
    }

    // Take hull damage (lose 1 life)
    this.player.lives--;
    this.trauma = Math.min(1.0, this.trauma + 0.8);
    this.hitstopMs = 50; // tactile impact hitstop
    soundEngine.playPlayerHit(false);
    this.createExplosion(this.player.x, this.player.y, 'medium');

    if (this.player.lives <= 0) {
      // 3-life limit exhausted: Game Over
      this.player.lives = 0;
      this.state = 'GAME_OVER';
      soundEngine.playGameOver();
      this.createExplosion(this.player.x, this.player.y, 'large');
      this.emitStateChange();
    } else {
      // Respawn invulnerability
      this.player.invulnerableTimer = 2.4;
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 35,
        `HULL BREACH! [${this.player.lives} LEFT]`,
        '#ef4444',
        17
      );
    }

    this.emitStats();
  }

  private destroyEnemy(enemy: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.enemiesDestroyed++;
    this.addScore(enemy.scoreValue);

    const size = enemy.type === 'boss' ? 'large' : enemy.type === 'cruiser' ? 'large' : 'medium';
    this.createExplosion(enemy.x, enemy.y, size);
    soundEngine.playExplosion(size);

    // Hitstop on heavy enemy death
    if (enemy.type === 'cruiser' || enemy.type === 'boss') {
      this.hitstopMs = 60;
      this.trauma = Math.min(1.0, this.trauma + 0.6);
    }

    this.spawnFloatingText(enemy.x, enemy.y, `+${enemy.scoreValue}`, '#fbbf24', 16);

    // Roll for pickup drop (18% chance)
    if (Math.random() < 0.22 || enemy.type === 'boss' || enemy.type === 'cruiser') {
      this.spawnPickup(enemy.x, enemy.y);
    }
  }

  private destroyAsteroid(ast: Asteroid, index: number) {
    this.asteroids.splice(index, 1);
    this.addScore(ast.tier * 50);
    soundEngine.playExplosion('small');
    this.createSparks(ast.x, ast.y, '#94a3b8', 10);

    // Split into smaller fragments
    if (ast.tier > 1) {
      const nextTier = (ast.tier - 1) as 1 | 2;
      this.spawnRandomAsteroid(nextTier, ast.x - 12, ast.y);
      this.spawnRandomAsteroid(nextTier, ast.x + 12, ast.y);
    }
  }

  private spawnPickup(x: number, y: number) {
    const roll = Math.random();
    let type: PickupType = 'points';

    if (roll < 0.3) {
      type = 'upgrade';
    } else if (roll < 0.55) {
      type = 'shield';
    } else if (roll < 0.75) {
      type = 'bomb';
    } else {
      type = 'points';
    }

    this.pickups.push({
      id: this.nextId++,
      type,
      x,
      y,
      vx: 0,
      vy: 110,
      radius: 14,
      duration: 0,
    });
  }

  private collectPickup(p: Pickup) {
    soundEngine.playPowerup();
    switch (p.type) {
      case 'upgrade': {
        if (this.player.weaponTier < 3) {
          this.player.weaponTier = (this.player.weaponTier + 1) as WeaponTier;
          this.spawnFloatingText(this.player.x, this.player.y - 30, 'BLASTERS UPGRADED!', '#38bdf8', 18);
        } else {
          // Temporary hyper rapid fire
          this.player.rapidFireTimer = 10.0;
          this.spawnFloatingText(this.player.x, this.player.y - 30, 'HYPER RAPID FIRE!', '#f43f5e', 18);
        }
        break;
      }
      case 'shield': {
        this.player.shield = true;
        this.spawnFloatingText(this.player.x, this.player.y - 30, 'DEFLECTOR ONLINE!', '#06b6d4', 18);
        break;
      }
      case 'bomb': {
        this.player.bombs = Math.min(5, this.player.bombs + 1);
        this.spawnFloatingText(this.player.x, this.player.y - 30, '+1 NOVA BOMB', '#ec4899', 18);
        break;
      }
      case 'points': {
        this.addScore(750);
        this.spawnFloatingText(this.player.x, this.player.y - 30, '+750 PTS', '#fbbf24', 18);
        break;
      }
    }
    this.emitStats();
  }

  private addScore(amount: number) {
    this.score += amount;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('nova_striker_high_score', String(this.highScore));
      } catch {
        // Ignore
      }
    }
  }

  private createExplosion(x: number, y: number, size: 'small' | 'medium' | 'large') {
    const count = size === 'large' ? 45 : size === 'medium' ? 24 : 12;
    const colors = ['#f97316', '#fbbf24', '#ef4444', '#f59e0b', '#38bdf8'];

    // Core shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#f97316',
      radius: 6,
      alpha: 1.0,
      decay: size === 'large' ? 1.4 : 2.2,
      shape: 'ring',
    });

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * (size === 'large' ? 320 : 180);
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * (size === 'large' ? 4 : 2.5),
        alpha: 1.0,
        decay: 1.2 + Math.random() * 2.0,
      });
    }
  }

  private createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 1.5 + Math.random() * 1.5,
        alpha: 0.9,
        decay: 3.5 + Math.random() * 2.0,
      });
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, size: number) {
    this.floatingTexts.push({
      id: this.nextId++,
      text,
      x,
      y,
      vy: -55,
      alpha: 1.0,
      color,
      size,
    });
  }

  // --- Rendering Pipeline ---
  private render() {
    const ctx = this.ctx;
    ctx.save();

    // High DPI scaling
    ctx.scale(this.dpr, this.dpr);

    // Apply Camera Shake offset
    ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    // Deep cosmic space background
    ctx.fillStyle = '#05070f';
    ctx.fillRect(-20, -20, this.width + 40, this.height + 40);

    // Draw Parallax Stars
    this.renderStars(ctx);

    // Draw Pickups
    this.renderPickups(ctx);

    // Draw Asteroids
    this.renderAsteroids(ctx);

    // Draw Enemies
    this.renderEnemies(ctx);

    // Draw Lasers
    this.renderLasers(ctx);

    // Draw Player Ship
    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAME_OVER') {
      this.renderPlayer(ctx);
    }

    // Draw Particles
    this.renderParticles(ctx);

    // Draw Floating Damage / Score Texts
    this.renderFloatingTexts(ctx);

    ctx.restore();
  }

  private renderStars(ctx: CanvasRenderingContext2D) {
    for (const star of this.stars) {
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    // If dead in game over, don't draw ship
    if (this.player.lives <= 0 && this.state === 'GAME_OVER') return;

    // Invulnerability blink effect
    if (this.player.invulnerableTimer > 0) {
      if (Math.floor(this.player.invulnerableTimer * 12) % 2 === 0) {
        return;
      }
    }

    const px = this.player.x;
    const py = this.player.y;
    const tilt = this.player.tilt;

    ctx.save();
    ctx.translate(px, py);

    // Shield forcefield bubble
    if (this.player.shield) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius + 12, 0, Math.PI * 2);
      ctx.stroke();

      // Inner pulsating arc
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Ship Hull Vector (Sharp arrowhead swept wings)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    // Nose
    ctx.moveTo(0, -22);
    // Right wingtip
    ctx.lineTo(20 + tilt * 4, 14);
    // Right inner inlet
    ctx.lineTo(10, 10);
    // Center engine tail
    ctx.lineTo(0, 16);
    // Left inner inlet
    ctx.lineTo(-10, 10);
    // Left wingtip
    ctx.lineTo(-20 + tilt * 4, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit canopy
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Weapon pods indicator
    if (this.player.weaponTier >= 2) {
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(-18, 6, 3, 6);
      ctx.fillRect(15, 6, 3, 6);
    }
    if (this.player.weaponTier >= 3) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-22, 10, 3, 5);
      ctx.fillRect(19, 10, 3, 5);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      switch (enemy.type) {
        case 'scout': {
          // Sleek Crimson Scout Fighter
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 6;

          ctx.beginPath();
          ctx.moveTo(0, 16);
          ctx.lineTo(14, -12);
          ctx.lineTo(6, -6);
          ctx.lineTo(0, -14);
          ctx.lineTo(-6, -6);
          ctx.lineTo(-14, -12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sensor eye
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(0, 2, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'interceptor': {
          // Angular Forward-Swept Predator
          ctx.fillStyle = '#1c1917';
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 8;

          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.lineTo(18, 12);
          ctx.lineTo(16, -16);
          ctx.lineTo(0, -6);
          ctx.lineTo(-16, -16);
          ctx.lineTo(-18, 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f97316';
          ctx.fillRect(-4, -2, 8, 4);
          break;
        }

        case 'cruiser': {
          // Armored Hex Frigate
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 10;

          ctx.beginPath();
          ctx.moveTo(0, 32);
          ctx.lineTo(26, 16);
          ctx.lineTo(30, -20);
          ctx.lineTo(14, -30);
          ctx.lineTo(-14, -30);
          ctx.lineTo(-30, -20);
          ctx.lineTo(-26, 16);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Core Reactor
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'kamikaze': {
          // Blazing delta needle with pulsing trail
          ctx.fillStyle = '#3f1118';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 10;

          ctx.beginPath();
          ctx.moveTo(0, 18);
          ctx.lineTo(12, -14);
          ctx.lineTo(0, -8);
          ctx.lineTo(-12, -14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'boss': {
          // Massive Dreadnought Flagship
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#db2777';
          ctx.shadowBlur = 16;

          ctx.beginPath();
          ctx.moveTo(0, 52);
          ctx.lineTo(40, 24);
          ctx.lineTo(54, -18);
          ctx.lineTo(30, -44);
          ctx.lineTo(0, -28);
          ctx.lineTo(-30, -44);
          ctx.lineTo(-54, -18);
          ctx.lineTo(-40, 24);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing reactor ring
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 4, 16, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(0, 4, 8, 0, Math.PI * 2);
          ctx.fill();

          // Boss Health Bar directly in world
          const barW = 90;
          const barH = 6;
          const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(-barW / 2, -62, barW, barH);
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(-barW / 2, -62, barW * hpRatio, barH);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(-barW / 2, -62, barW, barH);
          break;
        }
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderAsteroids(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#1e293b';
    ctx.lineWidth = 2;

    for (const ast of this.asteroids) {
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.rotation);

      ctx.beginPath();
      const first = ast.vertices[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < ast.vertices.length; i++) {
        ctx.lineTo(ast.vertices[i].x, ast.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crater details
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ast.radius * 0.25, ast.radius * 0.2, ast.radius * 0.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderPickups(ctx: CanvasRenderingContext2D) {
    for (const p of this.pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);

      let color = '#38bdf8';
      let symbol = 'UP';

      if (p.type === 'shield') {
        color = '#06b6d4';
        symbol = 'SH';
      } else if (p.type === 'bomb') {
        color = '#ec4899';
        symbol = 'BM';
      } else if (p.type === 'points') {
        color = '#fbbf24';
        symbol = '★';
      }

      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      // Hexagon container
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * p.radius;
        const hy = Math.sin(a) * p.radius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Symbol
      ctx.fillStyle = color;
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, 0, 1);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderLasers(ctx: CanvasRenderingContext2D) {
    for (const laser of this.lasers) {
      ctx.save();
      ctx.strokeStyle = laser.color;
      ctx.fillStyle = laser.color;
      ctx.shadowColor = laser.glowColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = laser.width;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.x - (laser.vx * 0.02), laser.y - (laser.vy * 0.02));
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'ring') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const text of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, text.alpha);
      ctx.fillStyle = text.color;
      ctx.font = `800 ${text.size}px 'JetBrains Mono', monospace`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  // --- External State Notifiers ---
  private emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.getStats());
    }
  }

  private emitStats() {
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }

  public getStats(): GameStats {
    const accuracy =
      this.shotsFired > 0 ? Math.min(100, Math.round((this.shotsHit / this.shotsFired) * 100)) : 0;
    return {
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      lives: this.player ? this.player.lives : 3,
      bombs: this.player ? this.player.bombs : 2,
      shieldActive: this.player ? this.player.shield : false,
      weaponTier: this.player ? this.player.weaponTier : 1,
      autoFire: this.autoFire,
      enemiesDestroyed: this.enemiesDestroyed,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      accuracy,
    };
  }
}
