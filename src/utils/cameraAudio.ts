/**
 * Real-time Web Audio API synthesized mechanical camera sounds.
 * Delivers authentic Leica / Fujifilm mechanical camera tactile acoustic feedback:
 * shutter curtains, ratcheted film advance, metallic dial detents, and electronic chimes.
 */

class CameraAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Authentic Double-Curtain Mechanical Shutter + Mirror Slap + Spring Recoil
   */
  public playShutter() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;

      // 1. First Curtain Release Slap (Low-frequency heavy mechanical thump)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(140, t);
      osc1.frequency.exponentialRampToValueAtTime(32, t + 0.045);
      gain1.gain.setValueAtTime(0.7, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.055);

      // 2. High-frequency Metallic Clatter / Blade Friction Noise
      const bufferSize = ctx.sampleRate * 0.06;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.Q.setValueAtTime(2.5, t);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.065);

      // 3. Second Curtain Closure + Mechanical Click (delayed by 65ms)
      const t2 = t + 0.065;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(380, t2);
      osc2.frequency.exponentialRampToValueAtTime(80, t2 + 0.04);
      gain2.gain.setValueAtTime(0.5, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.045);

      // 4. Spring Recoil Ring (subtle metallic ping)
      const oscPing = ctx.createOscillator();
      const pingGain = ctx.createGain();
      oscPing.type = 'sine';
      oscPing.frequency.setValueAtTime(1450, t2 + 0.02);
      pingGain.gain.setValueAtTime(0.12, t2 + 0.02);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.14);
      oscPing.connect(pingGain);
      pingGain.connect(ctx.destination);
      oscPing.start(t2 + 0.02);
      oscPing.stop(t2 + 0.15);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Ratcheted Film Advance Gear Winding sound (whirrr-clack-clack)
   */
  public playFilmAdvance() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const startT = ctx.currentTime + 0.05;

      // Series of ratcheted gear clicks
      for (let i = 0; i < 4; i++) {
        const clickTime = startT + i * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + i * 80, clickTime);
        osc.frequency.exponentialRampToValueAtTime(120, clickTime + 0.02);
        gain.gain.setValueAtTime(0.25, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(clickTime);
        osc.stop(clickTime + 0.025);
      }

      // Motor / gear spool whir
      const whirOsc = ctx.createOscillator();
      const whirGain = ctx.createGain();
      whirOsc.type = 'sawtooth';
      whirOsc.frequency.setValueAtTime(120, startT);
      whirOsc.frequency.linearRampToValueAtTime(220, startT + 0.15);
      whirOsc.frequency.linearRampToValueAtTime(90, startT + 0.28);
      whirGain.gain.setValueAtTime(0.08, startT);
      whirGain.gain.exponentialRampToValueAtTime(0.001, startT + 0.28);
      whirOsc.connect(whirGain);
      whirGain.connect(ctx.destination);
      whirOsc.start(startT);
      whirOsc.stop(startT + 0.29);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Sharp metallic notched detent click (for rotating knobs and dials)
   */
  public playDialClick() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1850, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.012);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.016);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Heavy mechanical toggle switch snap
   */
  public playToggleSwitch() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.03);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Classic electronic rangefinder autofocus confirmation beep (880Hz crisp pip)
   */
  public playFocusBeep() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.075);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Warm darkroom chime when photo completes chemical developing
   */
  public playDevelopingComplete() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;

      // Two-note harmonic bell
      [1046.5, 1318.5].forEach((freq, idx) => {
        const noteT = t + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteT);
        gain.gain.setValueAtTime(0.2, noteT);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteT + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteT);
        osc.stop(noteT + 0.42);
      });
    } catch {
      // AudioContext fallback
    }
  }
}

export const cameraAudio = new CameraAudioSynthesizer();
