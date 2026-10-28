/**
 * Procedural Web Audio API sound synthesizer for Nova Striker.
 * Pure synthesized sound - zero external assets required, zero latency.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Check saved mute preference
    try {
      const saved = localStorage.getItem('nova_striker_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      // Ignore localStorage error
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.28, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    try {
      localStorage.setItem('nova_striker_muted', String(mute));
    } catch {
      // Ignore
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.28, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Player blaster laser fire */
  public playLaser(type: 'standard' | 'spread' | 'heavy' = 'standard') {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'heavy') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    } else if (type === 'spread') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(680, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(840, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.1);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  /** Enemy projectile sound */
  public playEnemyLaser() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /** Enemy/Asteroid explosion with synthesized noise */
  public playExplosion(size: 'small' | 'medium' | 'large' = 'medium') {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const duration = size === 'large' ? 0.45 : size === 'medium' ? 0.3 : 0.18;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startFreq = size === 'large' ? 450 : size === 'medium' ? 650 : 900;
    filter.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    const peakGain = size === 'large' ? 0.45 : size === 'medium' ? 0.32 : 0.2;
    gain.gain.setValueAtTime(peakGain, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(this.ctx.currentTime);
    whiteNoise.stop(this.ctx.currentTime + duration);

    // Deep sub bass tone for heavy explosions
    if (size === 'large' || size === 'medium') {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, this.ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + duration * 0.8);
      subGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration * 0.8);
      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(this.ctx.currentTime);
      subOsc.stop(this.ctx.currentTime + duration * 0.8);
    }
  }

  /** Player takes damage */
  public playPlayerHit(shieldDeflected: boolean = false) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    if (shieldDeflected) {
      // High sci-fi deflector chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.25);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } else {
      // Crunchy alarm & impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }

  /** Power-up collected - ascending harmonious arpeggio */
  public playPowerup() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const notes = [440, 554.37, 659.25, 880];
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      gain.gain.setValueAtTime(0.2, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.18);
    });
  }

  /** Nova Bomb detonated */
  public playBomb() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Screech then huge blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.8);
    this.playExplosion('large');
  }

  /** Game Over sound cue */
  public playGameOver() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const notes = [400, 340, 280, 200];
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.15);
      gain.gain.setValueAtTime(0.25, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.35);
    });
  }

  /** Wave / Sector complete chime */
  public playWaveStart() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.22, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
  }
}

export const soundEngine = new SoundEngine();
