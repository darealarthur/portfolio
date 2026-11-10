// ============================================================================
// PERSONA 5 WEB AUDIO SYNTHESIZER (SFX + SHIBUYA ACID-JAZZ GROOVE)
// ============================================================================
// Recria os efeitos sonoros icônicos da UI de Persona 5 / P5 Strikers usando
// Web Audio API pura (100% offline, zero arquivos externos quebrados).

class P5AudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = false;
    this.bgmPlayer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Som icônico de mover o cursor no menu (Tick metálico + Blip agudo rápido)
  playHover() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Blip tonal agudo curto (estilo P5 menu move)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(2240, now + 0.032);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.048);

    // 2. Transiente percussivo de recorte (Click de papel/faca)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(520, now);
    osc2.frequency.exponentialRampToValueAtTime(180, now + 0.02);

    gain2.gain.setValueAtTime(0.09, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.025);
  }

  // Som de confirmar / abrir seção (Slash cortante + Acorde Jazz/Rock P5)
  playConfirm() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Ruído branco filtrado simulando o "SLASH" de tela
    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.13);
    filter.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // 2. Duplo tom ascendente afiado (Chime de confirmação)
    const freqs = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
      const startTime = now + idx * 0.018;
      osc.frequency.setValueAtTime(f, startTime);

      g.gain.setValueAtTime(0.08, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.24);
    });
  }

  // Som de voltar / fechar sub-tela (Swoosh descendente duplo)
  playBack() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [987.77, 659.25]; // B5 -> E5
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.07);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  // Som especial ao enviar Calling Card ou subir Rank
  playCallingCard() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Acorde dramático Em9 estilo "Take Your Heart"
    const chord = [329.63, 392.00, 493.88, 587.33, 739.99, 987.77];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3600, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + 0.65);

      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  }

  // Trilha sonora oficial Acid-Jazz (assets/bgm.mp3) em loop contínuo
  toggleBGM(forceState) {
    this.bgmEnabled = typeof forceState === "boolean" ? forceState : !this.bgmEnabled;

    if (!this.bgmPlayer) {
      this.bgmPlayer = new Audio("assets/bgm.mp3");
      this.bgmPlayer.loop = true;
      this.bgmPlayer.volume = 0.45;
    }

    if (!this.bgmEnabled) {
      this.bgmPlayer.pause();
      return false;
    }

    this.bgmPlayer.play().catch((err) => {
      console.warn("Reprodução bloqueada até interação do usuário:", err);
    });
    return true;
  }
}

window.p5Audio = new P5AudioEngine();
