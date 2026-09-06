// Procedural Ambient Sound Generator using Web Audio API (100% Offline, Zero external audio assets)

export type AmbientSoundType = 'none' | 'rain' | 'fire' | 'binaural' | 'lofi' | 'wind';

export interface AmbientTrackInfo {
  id: AmbientSoundType;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
}

export const AMBIENT_TRACKS: AmbientTrackInfo[] = [
  {
    id: 'rain',
    name: 'Шум дождя',
    nameEn: 'Gentle Rain',
    icon: '🌧️',
    description: 'Мягкий шелест капель дождя для глубокой концентрации',
  },
  {
    id: 'fire',
    name: 'Уютный костер',
    nameEn: 'Cozy Fireplace',
    icon: '🔥',
    description: 'Теплый треск поленьев и мягкое потрескивание углей',
  },
  {
    id: 'binaural',
    name: 'Бинауральные 40Hz',
    nameEn: 'Binaural 40Hz',
    icon: '🧘',
    description: 'Гамма-волны 40Hz для максимального фокуса и когнитивной ясности',
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Tape Hum',
    nameEn: 'Lo-Fi Tape Drone',
    icon: '☕',
    description: 'Теплый винтажный аналоговый шум кассетной ленты',
  },
  {
    id: 'wind',
    name: 'Лесной ветерок',
    nameEn: 'Forest Wind',
    icon: '🌲',
    description: 'Гармоничный шелест крон деревьев и свежий бриз',
  },
];

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentTrack: AmbientSoundType = 'none';
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;
  private isPlaying: boolean = false;
  private cleanupFn: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('zenith_ambient_volume');
      if (savedVol) this.volume = parseFloat(savedVol);
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('zenith_ambient_volume', String(this.volume));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.35, this.ctx.currentTime, 0.05);
    }
  }

  public getCurrentTrack(): AmbientSoundType {
    return this.currentTrack;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public stop() {
    if (this.cleanupFn) {
      try {
        this.cleanupFn();
      } catch {}
      this.cleanupFn = null;
    }
    this.isPlaying = false;
    this.currentTrack = 'none';
  }

  public play(track: AmbientSoundType) {
    this.stop();
    if (track === 'none') return;

    const ctx = this.getContext();
    if (!ctx) return;

    this.currentTrack = track;
    this.isPlaying = true;

    // Master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    switch (track) {
      case 'rain':
        this.cleanupFn = this.synthesizeRain(ctx, this.masterGain);
        break;
      case 'fire':
        this.cleanupFn = this.synthesizeFire(ctx, this.masterGain);
        break;
      case 'binaural':
        this.cleanupFn = this.synthesizeBinaural(ctx, this.masterGain);
        break;
      case 'lofi':
        this.cleanupFn = this.synthesizeLoFi(ctx, this.masterGain);
        break;
      case 'wind':
        this.cleanupFn = this.synthesizeWind(ctx, this.masterGain);
        break;
      default:
        break;
    }
  }

  // 1. Procedural Rain Generator (Pink Noise + Low-pass filter modulation)
  private synthesizeRain(ctx: AudioContext, destination: GainNode): () => void {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(300, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(highpass);
    highpass.connect(destination);

    whiteNoise.start();

    // Occasional gentle water drops (LFO modulation)
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(4, ctx.currentTime);
    dropGain.gain.setValueAtTime(200, ctx.currentTime);

    dropOsc.connect(dropGain);
    dropGain.connect(filter.frequency);
    dropOsc.start();

    return () => {
      try {
        whiteNoise.stop();
        dropOsc.stop();
        whiteNoise.disconnect();
        dropOsc.disconnect();
      } catch {}
    };
  }

  // 2. Procedural Fireplace Crackle (Brown noise + Poisson crackle impulses)
  private synthesizeFire(ctx: AudioContext, destination: GainNode): () => void {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const brownNoise = ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    brownNoise.connect(filter);
    filter.connect(destination);
    brownNoise.start();

    // Random crackle pulses
    let isRunning = true;
    const crackleInterval = setInterval(() => {
      if (!isRunning || !this.ctx) return;
      if (Math.random() > 0.45) {
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(800 + Math.random() * 1400, this.ctx.currentTime);
        popGain.gain.setValueAtTime(0.04 * Math.random(), this.ctx.currentTime);
        popGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);
        popOsc.connect(popGain);
        popGain.connect(destination);
        popOsc.start();
        popOsc.stop(this.ctx.currentTime + 0.03);
      }
    }, 120);

    return () => {
      isRunning = false;
      clearInterval(crackleInterval);
      try {
        brownNoise.stop();
        brownNoise.disconnect();
      } catch {}
    };
  }

  // 3. Binaural 40Hz Gamma Focus Beats (Left 200Hz, Right 240Hz stereo separation)
  private synthesizeBinaural(ctx: AudioContext, destination: GainNode): () => void {
    const merger = ctx.createChannelMerger(2);

    // Left Ear: 200Hz Carrier
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(200, ctx.currentTime);
    const gainLeft = ctx.createGain();
    gainLeft.gain.setValueAtTime(0.3, ctx.currentTime);
    oscLeft.connect(gainLeft);
    gainLeft.connect(merger, 0, 0);

    // Right Ear: 240Hz (40Hz Gamma differential)
    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(240, ctx.currentTime);
    const gainRight = ctx.createGain();
    gainRight.gain.setValueAtTime(0.3, ctx.currentTime);
    oscRight.connect(gainRight);
    gainRight.connect(merger, 0, 1);

    // Subtle warm sub-drone at 100Hz
    const oscSub = ctx.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(100, ctx.currentTime);
    const gainSub = ctx.createGain();
    gainSub.gain.setValueAtTime(0.12, ctx.currentTime);
    oscSub.connect(gainSub);
    gainSub.connect(destination);

    merger.connect(destination);

    oscLeft.start();
    oscRight.start();
    oscSub.start();

    return () => {
      try {
        oscLeft.stop();
        oscRight.stop();
        oscSub.stop();
        oscLeft.disconnect();
        oscRight.disconnect();
        oscSub.disconnect();
      } catch {}
    };
  }

  // 4. Lo-Fi Tape Drone & Vinyl Hum
  private synthesizeLoFi(ctx: AudioContext, destination: GainNode): () => void {
    // Warm harmonic drone (C2 + G2 + C3 chords)
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(196.00, ctx.currentTime); // G3

    const lofiFilter = ctx.createBiquadFilter();
    lofiFilter.type = 'lowpass';
    lofiFilter.frequency.setValueAtTime(600, ctx.currentTime);

    const gainDrone = ctx.createGain();
    gainDrone.gain.setValueAtTime(0.2, ctx.currentTime);

    osc1.connect(lofiFilter);
    osc2.connect(lofiFilter);
    lofiFilter.connect(gainDrone);
    gainDrone.connect(destination);

    osc1.start();
    osc2.start();

    // Subtle tape hiss
    const bufferSize = ctx.sampleRate * 2;
    const hissBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const hissData = hissBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      hissData[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const hissSource = ctx.createBufferSource();
    hissSource.buffer = hissBuffer;
    hissSource.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.setValueAtTime(3200, ctx.currentTime);
    hissFilter.Q.setValueAtTime(1.5, ctx.currentTime);
    hissSource.connect(hissFilter);
    hissFilter.connect(destination);
    hissSource.start();

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        hissSource.stop();
        osc1.disconnect();
        osc2.disconnect();
        hissSource.disconnect();
      } catch {}
    };
  }

  // 5. Forest Wind (Sweeping resonant bandpass)
  private synthesizeWind(ctx: AudioContext, destination: GainNode): () => void {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    // LFO for swaying breeze sweep
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(250, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(destination);

    noise.start();
    lfo.start();

    return () => {
      try {
        noise.stop();
        lfo.stop();
        noise.disconnect();
        lfo.disconnect();
      } catch {}
    };
  }
}

export const ambientSound = new AmbientSoundEngine();
