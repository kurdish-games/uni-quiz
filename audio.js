/**
 * Cozy Audio Engine
 * - Smooth cubic fade-in & fade-out for MainMenu.mp3
 * - Seamless loop-boundary crossfade + reveal ducking
 * - Juicy, cozy BUBBLY Web Audio UI sound effects!
 */

class AudioEngine {
  constructor() {
    this.bgm = new Audio('./MainMenu.mp3');
    this.bgm.preload = 'auto';
    this.bgm.loop = false;
    this.bgm.volume = 0;

    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.baseVolume = 0.42;
    this.duckFactor = 1.0;
    this.currentGain = 0;
    this.isStarted = false;
    this.isLoopFading = false;

    this.fadeAnim = null;
    this.duckAnim = null;
    this.ctx = null;
    this.lastHoverTime = 0;

    this._bindLoopWatcher();
    this._bindVisibility();
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _applyVolume() {
    const v = Math.max(0, Math.min(1, this.currentGain * this.duckFactor));
    this.bgm.volume = v;
  }

  _animateGain(target, durationMs, onComplete) {
    if (this.fadeAnim) {
      cancelAnimationFrame(this.fadeAnim);
      this.fadeAnim = null;
    }

    const startVal = this.currentGain;
    const delta = target - startVal;
    const startTime = performance.now();

    if (durationMs <= 0 || Math.abs(delta) < 0.001) {
      this.currentGain = target;
      this._applyVolume();
      if (onComplete) onComplete();
      return;
    }

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.currentGain = startVal + delta * eased;
      this._applyVolume();

      if (t < 1) {
        this.fadeAnim = requestAnimationFrame(step);
      } else {
        this.fadeAnim = null;
        if (onComplete) onComplete();
      }
    };

    this.fadeAnim = requestAnimationFrame(step);
  }

  async startMusic(fadeMs = 2600) {
    this._ensureCtx();
    this.isStarted = true;
    if (!this.musicEnabled) return;

    try {
      if (this.bgm.paused) {
        this.currentGain = 0;
        this._applyVolume();
        await this.bgm.play();
      }
      this._animateGain(this.baseVolume, fadeMs);
    } catch {
      // Retry on next gesture
    }
  }

  fadeIn(durationMs = 2000) {
    if (!this.musicEnabled) return;
    this.isStarted = true;
    if (this.bgm.paused) {
      this.currentGain = 0;
      this._applyVolume();
      this.bgm.play().catch(() => {});
    }
    this._animateGain(this.baseVolume, durationMs);
  }

  fadeOut(durationMs = 1200, pauseAfter = true) {
    this._animateGain(0, durationMs, () => {
      if (pauseAfter && !this.bgm.paused) this.bgm.pause();
    });
  }

  toggleMusic() {
    this._ensureCtx();
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) this.fadeIn(1600);
    else this.fadeOut(900, true);
    return this.musicEnabled;
  }

  toggleSfx() {
    this._ensureCtx();
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxEnabled) this.playClick();
    return this.sfxEnabled;
  }

  setVolume(val) {
    this.baseVolume = Math.max(0.05, Math.min(1, Number(val)));
    if (this.musicEnabled && !this.bgm.paused) {
      this._animateGain(this.baseVolume, 250);
    }
  }

  duck(factor = 0.44, holdMs = 1350) {
    if (!this.musicEnabled || this.bgm.paused) return;
    this._animateDuck(factor, 360, () => {
      setTimeout(() => this._animateDuck(1.0, 900), holdMs);
    });
  }

  _animateDuck(target, durationMs, onDone) {
    if (this.duckAnim) cancelAnimationFrame(this.duckAnim);
    const start = this.duckFactor;
    const delta = target - start;
    const t0 = performance.now();

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const e = 1 - Math.pow(1 - p, 3);
      this.duckFactor = start + delta * e;
      this._applyVolume();
      if (p < 1) this.duckAnim = requestAnimationFrame(tick);
      else {
        this.duckAnim = null;
        if (onDone) onDone();
      }
    };
    this.duckAnim = requestAnimationFrame(tick);
  }

  _bindLoopWatcher() {
    this.bgm.addEventListener('timeupdate', () => {
      if (!this.musicEnabled || this.bgm.paused || !this.bgm.duration) return;
      const remaining = this.bgm.duration - this.bgm.currentTime;
      if (remaining <= 2.8 && !this.isLoopFading) {
        this.isLoopFading = true;
        this._animateGain(0, 2400, () => {
          this.bgm.currentTime = 0;
          this.isLoopFading = false;
          if (this.musicEnabled) {
            this.bgm.play().catch(() => {});
            this._animateGain(this.baseVolume, 2400);
          }
        });
      }
    });

    this.bgm.addEventListener('ended', () => {
      if (this.musicEnabled && !this.isLoopFading) {
        this.bgm.currentTime = 0;
        this.currentGain = 0;
        this._applyVolume();
        this.bgm.play().catch(() => {});
        this._animateGain(this.baseVolume, 2200);
      }
    });
  }

  _bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (!this.isStarted || !this.musicEnabled) return;
      if (document.hidden) this.fadeOut(700, true);
      else this.fadeIn(1400);
    });
  }

  // ── Juicy Bubbly Pop Synthesizer ──

  _bubble({ startFreq, endFreq, duration = 0.085, gain = 0.09, delay = 0, type = 'sine' }) {
    if (!this.sfxEnabled) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.85);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(3.2, now); // gives that round liquid resonance!

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  playHover() {
    const now = performance.now();
    if (now - this.lastHoverTime < 75) return;
    this.lastHoverTime = now;
    // Tiny soft water-drop bubble tick
    this._bubble({ startFreq: 420, endFreq: 760, duration: 0.048, gain: 0.028 });
  }

  playClick() {
    // Classic juicy bubble pop!
    this._bubble({ startFreq: 260, endFreq: 740, duration: 0.085, gain: 0.085 });
    this._bubble({ startFreq: 520, endFreq: 980, duration: 0.055, gain: 0.032, delay: 0.018 });
  }

  playSelect() {
    // Cozy double-bubble plop
    this._bubble({ startFreq: 230, endFreq: 520, duration: 0.08, gain: 0.075 });
    this._bubble({ startFreq: 340, endFreq: 720, duration: 0.095, gain: 0.068, delay: 0.06 });
  }

  playLockIn() {
    this.duck(0.45, 1150);
    // Bouncy rising bubbles
    this._bubble({ startFreq: 220, endFreq: 440, duration: 0.11, gain: 0.07 });
    this._bubble({ startFreq: 300, endFreq: 580, duration: 0.11, gain: 0.07, delay: 0.09 });
    this._bubble({ startFreq: 390, endFreq: 760, duration: 0.13, gain: 0.075, delay: 0.18 });
  }

  playCorrect(isCheckpoint = false) {
    this.duck(0.42, isCheckpoint ? 1600 : 950);
    const pops = isCheckpoint
      ? [
          [320, 523.25],
          [420, 659.25],
          [520, 783.99],
          [640, 1046.5],
          [780, 1318.5],
        ]
      : [
          [320, 523.25],
          [440, 659.25],
          [540, 783.99],
        ];

    pops.forEach(([s, e], i) => {
      this._bubble({
        startFreq: s,
        endFreq: e,
        duration: isCheckpoint ? 0.14 : 0.11,
        gain: 0.085,
        delay: i * 0.065,
      });
    });
  }

  playWrong() {
    this.duck(0.38, 1200);
    // Soft low cozy bloop-bloop (never harsh)
    this._bubble({ startFreq: 360, endFreq: 195, duration: 0.16, gain: 0.085 });
    this._bubble({ startFreq: 260, endFreq: 135, duration: 0.22, gain: 0.08, delay: 0.13 });
  }

  playLifeline() {
    // Sparkling bubbly ripple
    [
      [380, 680],
      [480, 860],
      [600, 1060],
      [740, 1280],
    ].forEach(([s, e], i) => {
      this._bubble({ startFreq: s, endFreq: e, duration: 0.09, gain: 0.065, delay: i * 0.05 });
    });
  }
}

export const audio = new AudioEngine();
