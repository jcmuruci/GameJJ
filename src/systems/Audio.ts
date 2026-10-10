/**
 * Áudio 100% sintetizado com WebAudio: efeitos sonoros e músicas chiptune.
 * Nenhum arquivo de áudio externo é necessário.
 */

export type Sfx =
  | 'blip' | 'select' | 'confirm' | 'back' | 'pick' | 'drop' | 'chop' | 'sizzle' | 'fire' | 'magic'
  | 'slash' | 'hit' | 'hurt' | 'faint' | 'revive' | 'coin' | 'deliver' | 'wrong' | 'expire' | 'push'
  | 'plate' | 'gate' | 'rune' | 'crystal' | 'hug' | 'thunder' | 'boss' | 'win' | 'lose' | 'step'
  | 'crow' | 'wind' | 'bell' | 'heart' | 'lever' | 'burn' | 'horn' | 'camera' | 'jump' | 'splash' | 'gator';

type TrackName = 'menu' | 'kitchen' | 'forest' | 'festival' | 'boss' | 'ending' | 'map' | 'road' | 'jungle';

interface Track {
  bpm: number;
  /** Notas MIDI (0 = pausa), uma por colcheia. */
  lead: number[];
  bass: number[];
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  drums?: string; // 'k' bumbo, 's' caixa, 'h' chimbal, '.' nada (por colcheia)
  leadVol?: number;
}

const N = (name: string): number => {
  // ex.: C4, F#4, Bb3
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + base + acc;
};
const seq = (s: string): number[] => s.trim().split(/\s+/).map((t) => (t === '-' ? 0 : N(t)));

const TRACKS: Record<TrackName, Track> = {
  menu: {
    bpm: 92, leadWave: 'triangle', bassWave: 'sine', leadVol: 0.5,
    lead: seq('E5 - G5 - A5 - G5 E5 D5 - E5 - C5 - D5 - - - E5 - G5 - A5 - C6 B5 A5 - G5 - E5 - G5 - - - A5 - C6 - B5 - A5 G5 E5 - G5 - D5 - E5 - - - D5 - E5 - G5 - E5 D5 C5 - D5 - C5 - C5 - - -'),
    bass: seq('C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - F2 - C3 - G2 - D3 - C3 - G3 - C3 - - -'),
    drums: 'k...h...s...h...',
  },
  map: {
    bpm: 100, leadWave: 'triangle', bassWave: 'triangle', leadVol: 0.45,
    lead: seq('G4 - B4 - D5 - B4 - C5 - E5 - D5 - - - G4 - A4 - B4 - D5 - C5 B4 A4 - G4 - - - B4 - D5 - G5 - F#5 - E5 - D5 - C5 - B4 - A4 - B4 - G4 - - -'),
    bass: seq('G2 - D3 - G2 - D3 - C3 - G3 - C3 - G3 - G2 - D3 - G2 - D3 - D3 - A3 - D3 - A3 - E3 - B3 - E3 - B3 - C3 - G3 - D3 - A3 - G2 - D3 - G2 - - -'),
    drums: 'k...h.h.s...h...',
  },
  kitchen: {
    bpm: 138, leadWave: 'square', bassWave: 'triangle', leadVol: 0.32,
    lead: seq('C5 E5 G5 E5 A5 G5 E5 C5 D5 F5 A5 F5 G5 - - - E5 G5 C6 G5 A5 G5 F5 E5 D5 E5 F5 D5 C5 - - - A4 C5 E5 C5 F5 E5 D5 C5 B4 D5 G5 D5 E5 - - - C5 E5 G5 C6 B5 G5 A5 F5 G5 E5 D5 B4 C5 - - -'),
    bass: seq('C3 - C3 G2 C3 - G2 - F2 - F2 C3 G2 - G2 - C3 - C3 G2 A2 - A2 - D3 - G2 - C3 - G2 - A2 - A2 E2 F2 - F2 - G2 - G2 D3 C3 - C3 - C3 - E3 - F3 - D3 - G2 - G2 - C3 - - -'),
    drums: 'k.h.s.h.k.k.s.h.',
  },
  festival: {
    bpm: 150, leadWave: 'square', bassWave: 'triangle', leadVol: 0.3,
    lead: seq('G5 - E5 G5 A5 - G5 E5 D5 E5 G5 - E5 - C5 - D5 - D5 E5 F5 - E5 D5 C5 D5 E5 - G5 - - - G5 - E5 G5 A5 - C6 A5 G5 A5 G5 E5 D5 - C5 - D5 - E5 D5 C5 - D5 - C5 - - - - - - -'),
    bass: seq('C3 G3 C3 G3 C3 G3 C3 G3 F2 C3 F2 C3 C3 G3 C3 G3 G2 D3 G2 D3 G2 D3 G2 D3 C3 G3 C3 G3 C3 G3 C3 G3 A2 E3 A2 E3 F2 C3 F2 C3 G2 D3 G2 D3 G2 D3 G2 D3 C3 G3 C3 G3 C3 - - -'),
    drums: 'k.hhs.h.k.hhs.hh',
  },
  forest: {
    bpm: 84, leadWave: 'triangle', bassWave: 'sine', leadVol: 0.45,
    lead: seq('A4 - C5 - E5 - - - D5 - C5 - B4 - - - G4 - B4 - D5 - - - C5 - B4 - A4 - - - A4 - C5 - E5 - A5 - G5 - E5 - D5 - - - E5 - D5 - C5 - B4 - A4 - - - - - - -'),
    bass: seq('A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - D3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - E2 - - - A2 - - - - - - -'),
    drums: 'k.......h.......',
  },
  boss: {
    bpm: 156, leadWave: 'sawtooth', bassWave: 'square', leadVol: 0.22,
    lead: seq('A4 - A4 C5 E5 - D5 C5 B4 - B4 D5 E5 - - - A4 - A4 C5 F5 - E5 D5 E5 - G#4 - A4 - - - C5 - C5 E5 A5 - G5 F5 E5 - E5 F5 G5 - - - F5 - E5 D5 C5 - B4 C5 B4 - G#4 - A4 - - -'),
    bass: seq('A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2 F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2 A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2 F2 F2 F3 F2 E2 E2 E3 E2'),
    drums: 'k.hsk.hsk.hsk.ss',
  },
  road: {
    bpm: 144, leadWave: 'square', bassWave: 'triangle', leadVol: 0.3,
    lead: seq('E5 - E5 G5 A5 - G5 E5 D5 - D5 E5 G5 - - - C5 - C5 E5 G5 - A5 G5 E5 - D5 - E5 - - - E5 - E5 G5 A5 - C6 A5 G5 - A5 - B5 - - - C6 - B5 A5 G5 - E5 D5 E5 - G5 - E5 - - -'),
    bass: seq('A2 E3 A2 E3 A2 E3 A2 E3 G2 D3 G2 D3 G2 D3 G2 D3 F2 C3 F2 C3 F2 C3 F2 C3 G2 D3 G2 D3 E2 B2 E2 B2 A2 E3 A2 E3 A2 E3 A2 E3 F2 C3 F2 C3 G2 D3 G2 D3 C3 G3 C3 G3 G2 D3 G2 D3 A2 E3 A2 -'),
    drums: 'k.h.s.hkk.h.s.hh',
  },
  jungle: {
    bpm: 104, leadWave: 'triangle', bassWave: 'triangle', leadVol: 0.45,
    lead: seq('D5 - F5 - A5 - G5 F5 E5 - D5 - C5 - - - D5 - F5 - A5 - C6 A5 G5 - - - - - - - F5 - A5 - D6 - C6 A5 G5 - F5 - E5 - - - D5 - E5 F5 E5 - C5 - D5 - - - - - - -'),
    bass: seq('D3 - A2 - D3 - A2 - C3 - G2 - C3 - G2 - Bb2 - F2 - Bb2 - F2 - A2 - E2 - A2 - E2 - D3 - A2 - D3 - A2 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - D3 - A2 - D3 - - -'),
    drums: 'k..hk.s.k..hk.sh',
  },
  ending: {
    bpm: 76, leadWave: 'triangle', bassWave: 'sine', leadVol: 0.5,
    lead: seq('E5 - - G5 - - C6 - - B5 - - A5 - - G5 - - F5 - - E5 - - D5 - - G5 - - E5 - - - - - C5 - - E5 - - A5 - - G5 - - F5 - - A5 - - G5 - - E5 - - D5 - - - - - C5 - - - - -'),
    bass: seq('C3 - - G3 - - C3 - - G3 - - F2 - - C3 - - F2 - - C3 - - G2 - - D3 - - C3 - - G3 - - A2 - - E3 - - F2 - - C3 - - D3 - - A3 - - G2 - - D3 - - C3 - - G3 - - C3 - - - - -'),
    drums: 'k.....h.....',
  },
};

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** WAV de meio segundo de silêncio (8 kHz, 8 bits, mono) como data URI. */
function silentWav(): string {
  const n = 4000;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'data:audio/wav;base64,' + btoa(bin);
}

class AudioImpl {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private track: TrackName | null = null;
  private wanted: TrackName | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private lastPlay: Partial<Record<Sfx, number>> = {};
  musicVol = 0.5;
  sfxVol = 0.7;

  /** Deve ser chamado após um gesto do usuário (política dos navegadores). */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.applyVolumes();
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const state = this.ctx.state as AudioContextState | 'interrupted';
    if (state !== 'running') {
      void this.ctx.resume().catch(() => undefined);
      // iOS antigo só libera o áudio se algo tocar dentro do próprio toque
      const b = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.connect(this.ctx.destination);
      src.start(0);
    }
    this.iosPlayback();
    if (this.wanted && this.track !== this.wanted) this.music(this.wanted);
  }

  /** O áudio já está tocando de verdade (e, no iPhone, com a sessão de mídia ativa)? */
  get running(): boolean {
    return this.ctx?.state === 'running' && (!this.silentEl || !this.silentEl.paused);
  }

  private silentEl: HTMLAudioElement | null = null;

  /**
   * No iPhone/iPad, o som da Web fica mudo com a chave de silencioso ligada.
   * Tocar um <audio> silencioso em loop muda a sessão para "reprodução de mídia",
   * e aí o jogo toca mesmo no modo silencioso (como um vídeo).
   */
  private iosPlayback(): void {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (!ios) return;
    try { if (nav.audioSession) nav.audioSession.type = 'playback'; } catch { /* sem suporte */ }
    if (!this.silentEl) {
      this.silentEl = document.createElement('audio');
      this.silentEl.setAttribute('playsinline', '');
      this.silentEl.loop = true;
      this.silentEl.src = silentWav();
    }
    if (this.silentEl.paused) void this.silentEl.play().catch(() => undefined);
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    this.musicGain.gain.value = this.musicVol * 0.35;
    this.sfxGain.gain.value = this.sfxVol * 0.6;
  }

  private tone(o: {
    type?: OscillatorType; f: number; f2?: number; dur: number; vol?: number; delay?: number;
    attack?: number; dest?: AudioNode;
  }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    const v = o.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g).connect(o.dest ?? this.sfxGain);
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
  }

  private noise(o: { dur: number; vol?: number; delay?: number; filter?: number; type?: BiquadFilterType; dest?: AudioNode; f2?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const t = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = o.type ?? 'lowpass';
    filt.frequency.setValueAtTime(o.filter ?? 2000, t);
    if (o.f2) filt.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filt).connect(g).connect(o.dest ?? this.sfxGain);
    src.start(t);
    src.stop(t + o.dur + 0.02);
  }

  play(name: Sfx): void {
    if (!this.ctx || this.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    if ((this.lastPlay[name] ?? -1) > now - 0.04) return; // evita empilhar o mesmo som
    this.lastPlay[name] = now;
    switch (name) {
      case 'blip': this.tone({ f: 660, dur: 0.05, vol: 0.15 }); break;
      case 'select': this.tone({ f: 520, f2: 780, dur: 0.07, vol: 0.18 }); break;
      case 'confirm': this.tone({ f: 523, dur: 0.07, vol: 0.2 }); this.tone({ f: 784, dur: 0.12, vol: 0.2, delay: 0.07 }); break;
      case 'back': this.tone({ f: 500, f2: 300, dur: 0.1, vol: 0.18 }); break;
      case 'pick': this.tone({ type: 'triangle', f: 400, f2: 700, dur: 0.08, vol: 0.3 }); break;
      case 'drop': this.tone({ type: 'triangle', f: 500, f2: 250, dur: 0.08, vol: 0.3 }); break;
      case 'chop': this.noise({ dur: 0.06, vol: 0.35, filter: 3000, type: 'bandpass' }); this.tone({ f: 180, dur: 0.04, vol: 0.15 }); break;
      case 'sizzle': this.noise({ dur: 0.35, vol: 0.12, filter: 6000, type: 'highpass' }); break;
      case 'fire': this.noise({ dur: 0.5, vol: 0.3, filter: 400, f2: 2500 }); this.tone({ type: 'sawtooth', f: 120, f2: 300, dur: 0.3, vol: 0.12 }); break;
      case 'burn': this.noise({ dur: 0.4, vol: 0.25, filter: 1200, f2: 200 }); break;
      case 'magic': this.tone({ type: 'sine', f: 600, f2: 1400, dur: 0.18, vol: 0.25 }); this.tone({ type: 'triangle', f: 900, f2: 1800, dur: 0.15, vol: 0.12, delay: 0.04 }); break;
      case 'slash': this.noise({ dur: 0.12, vol: 0.35, filter: 1500, f2: 6000, type: 'bandpass' }); break;
      case 'hit': this.tone({ f: 220, f2: 80, dur: 0.12, vol: 0.3 }); this.noise({ dur: 0.08, vol: 0.2 }); break;
      case 'hurt': this.tone({ type: 'sawtooth', f: 400, f2: 120, dur: 0.25, vol: 0.3 }); break;
      case 'faint': [523, 440, 349, 262].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.18, vol: 0.25, delay: i * 0.13 })); break;
      case 'revive': [262, 330, 392, 523, 659].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.14, vol: 0.22, delay: i * 0.07 })); break;
      case 'coin': this.tone({ f: 988, dur: 0.06, vol: 0.18 }); this.tone({ f: 1319, dur: 0.18, vol: 0.18, delay: 0.06 }); break;
      case 'deliver': [523, 659, 784, 1047].forEach((f, i) => this.tone({ f, dur: 0.1, vol: 0.18, delay: i * 0.06 })); break;
      case 'wrong': this.tone({ f: 200, dur: 0.12, vol: 0.25 }); this.tone({ f: 150, dur: 0.18, vol: 0.25, delay: 0.12 }); break;
      case 'expire': this.tone({ type: 'sawtooth', f: 300, f2: 100, dur: 0.4, vol: 0.2 }); break;
      case 'push': this.noise({ dur: 0.2, vol: 0.3, filter: 300 }); break;
      case 'plate': this.tone({ type: 'triangle', f: 300, dur: 0.06, vol: 0.25 }); this.tone({ f: 450, dur: 0.06, vol: 0.12, delay: 0.05 }); break;
      case 'gate': this.noise({ dur: 0.35, vol: 0.25, filter: 500 }); this.tone({ type: 'square', f: 110, f2: 90, dur: 0.3, vol: 0.12 }); break;
      case 'rune': this.tone({ type: 'sine', f: 440, f2: 880, dur: 0.3, vol: 0.2 }); this.tone({ type: 'sine', f: 660, f2: 1320, dur: 0.3, vol: 0.12, delay: 0.05 }); break;
      case 'crystal': [1047, 1319, 1568, 2093].forEach((f, i) => this.tone({ type: 'sine', f, dur: 0.25, vol: 0.18, delay: i * 0.06 })); break;
      case 'hug': [523, 659, 784].forEach((f, i) => this.tone({ type: 'sine', f, dur: 0.4, vol: 0.18, delay: i * 0.05 })); break;
      case 'heart': this.tone({ type: 'sine', f: 784, f2: 1047, dur: 0.15, vol: 0.18 }); break;
      case 'thunder': this.noise({ dur: 0.9, vol: 0.55, filter: 900, f2: 80 }); break;
      case 'boss': this.tone({ type: 'sawtooth', f: 90, f2: 60, dur: 0.6, vol: 0.3 }); this.tone({ type: 'square', f: 95, f2: 55, dur: 0.6, vol: 0.15 }); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone({ type: 'square', f, dur: 0.16, vol: 0.18, delay: i * 0.11 })); break;
      case 'lose': [392, 370, 349, 330].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.3, vol: 0.25, delay: i * 0.25 })); break;
      case 'step': this.noise({ dur: 0.03, vol: 0.06, filter: 800 }); break;
      case 'crow': this.tone({ type: 'sawtooth', f: 700, f2: 500, dur: 0.12, vol: 0.18 }); this.tone({ type: 'sawtooth', f: 650, f2: 420, dur: 0.15, vol: 0.18, delay: 0.16 }); break;
      case 'wind': this.noise({ dur: 1.2, vol: 0.25, filter: 300, f2: 1500, type: 'bandpass' }); break;
      case 'bell': this.tone({ type: 'sine', f: 1568, dur: 0.6, vol: 0.2 }); this.tone({ type: 'sine', f: 2093, dur: 0.4, vol: 0.1 }); break;
      case 'horn': this.tone({ type: 'square', f: 440, dur: 0.16, vol: 0.2 }); this.tone({ type: 'square', f: 554, dur: 0.16, vol: 0.2 }); this.tone({ type: 'square', f: 440, dur: 0.2, vol: 0.2, delay: 0.2 }); this.tone({ type: 'square', f: 554, dur: 0.2, vol: 0.2, delay: 0.2 }); break;
      case 'camera': this.noise({ dur: 0.05, vol: 0.35, filter: 5000, type: 'highpass' }); this.tone({ type: 'sine', f: 1800, dur: 0.08, vol: 0.12, delay: 0.05 }); break;
      case 'jump': this.tone({ type: 'square', f: 300, f2: 700, dur: 0.15, vol: 0.18 }); break;
      case 'splash': this.noise({ dur: 0.35, vol: 0.3, filter: 2500, f2: 400 }); break;
      case 'gator': this.tone({ type: 'sawtooth', f: 90, f2: 70, dur: 0.35, vol: 0.25 }); this.tone({ type: 'triangle', f: 600, f2: 900, dur: 0.12, vol: 0.12, delay: 0.3 }); break;
      case 'lever': this.tone({ f: 300, dur: 0.05, vol: 0.2 }); this.noise({ dur: 0.06, vol: 0.2, filter: 2000, delay: 0.03 }); break;
    }
  }

  music(name: TrackName | null): void {
    this.wanted = name;
    if (!this.ctx) return;
    if (this.track === name) return;
    this.track = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
    if (!name) return;
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track) return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const delay = Math.max(0, this.nextTime - ctx.currentTime);
      const i = this.step;
      const ln = tr.lead[i % tr.lead.length];
      if (ln) this.tone({ type: tr.leadWave, f: midiHz(ln), dur: stepDur * 1.6, vol: 0.22 * (tr.leadVol ?? 0.4) * 2, delay, attack: 0.01, dest: this.musicGain });
      const bn = tr.bass[i % tr.bass.length];
      if (bn) this.tone({ type: tr.bassWave, f: midiHz(bn), dur: stepDur * 1.8, vol: 0.28, delay, attack: 0.01, dest: this.musicGain });
      if (tr.drums) {
        const d = tr.drums[i % tr.drums.length];
        if (d === 'k') this.tone({ type: 'sine', f: 150, f2: 45, dur: 0.12, vol: 0.5, delay, dest: this.musicGain });
        else if (d === 's') this.noise({ dur: 0.09, vol: 0.18, filter: 2500, type: 'bandpass', delay, dest: this.musicGain });
        else if (d === 'h') this.noise({ dur: 0.03, vol: 0.08, filter: 7000, type: 'highpass', delay, dest: this.musicGain });
      }
      this.step++;
      this.nextTime += stepDur;
    }
  }
}

export const Audio = new AudioImpl();
export type { TrackName };
