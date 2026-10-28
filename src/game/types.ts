/**
 * Type definitions for Nova Striker
 */

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type WeaponTier = 1 | 2 | 3;

export interface PlayerShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  tilt: number; // for banking animation (-1 to 1)
  lives: number; // starts at 3
  maxLives: number;
  shield: boolean;
  weaponTier: WeaponTier;
  rapidFireTimer: number; // temporary boost
  bombs: number;
  invulnerableTimer: number; // seconds of invulnerability
  fireCooldown: number;
}

export interface Laser {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  damage: number;
  isEnemy: boolean;
  glowColor: string;
}

export type EnemyType = 'scout' | 'interceptor' | 'cruiser' | 'kamikaze' | 'boss';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  fireCooldown: number;
  fireInterval: number;
  age: number;
  telegraphTimer: number; // windup before special attack
  sineOffset?: number;
  sineSpeed?: number;
  sineAmplitude?: number;
  startX?: number;
}

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  rotation: number;
  rotationSpeed: number;
  vertices: { x: number; y: number }[];
  tier: 1 | 2 | 3; // 3 = large, 2 = medium, 1 = small fragment
}

export type PickupType = 'upgrade' | 'shield' | 'bomb' | 'points';

export interface Pickup {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  duration: number; // bobbing pulse
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'spark' | 'ring';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
}

export interface GameStats {
  score: number;
  highScore: number;
  wave: number;
  lives: number;
  bombs: number;
  shieldActive: boolean;
  weaponTier: WeaponTier;
  autoFire: boolean;
  enemiesDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
}
