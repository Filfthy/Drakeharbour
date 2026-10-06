// river-music.js - bardcore-style tunes written for River, synthesised in the browser:
// a plucked lute, recorder and crumhorn leads, a hurdy-gurdy drone and a frame drum.

// Melodies are written as note:length, with lengths in steps (each tune sets how long a step is).
// Chords are one per bar. Each tune plays A A B B, then again with the leads swapped.
const MUSIC_TUNES = [
  { name: "The Guildsman's Jig", step: 0.19, bar: 6, feel: "jig", lead: "rec", lead2: "horn", drone: "D", droneV: 0.065,
    A: "D5:2 A4:1 D5:1 E5:1 F5:1 | E5:2 D5:1 C5:2 A4:1 | G4:1 A4:1 B4:1 C5:2 E5:1 | D5:3 A4:3 | D5:2 A4:1 D5:1 E5:1 F5:1 | G5:2 F5:1 E5:2 C5:1 | D5:1 E5:1 F5:1 E5:1 C5:1 A4:1 | D5:6",
    Ac: "Dm Am C Dm Dm C Dm Dm",
    B: "A5:2 G5:1 F5:2 E5:1 | D5:1 E5:1 F5:1 G5:2 A5:1 | C6:2 A5:1 G5:2 E5:1 | A5:3 E5:3 | A5:2 G5:1 F5:2 E5:1 | D5:1 F5:1 A5:1 G5:2 E5:1 | F5:1 E5:1 D5:1 C5:2 E5:1 | D5:6",
    Bc: "F Dm Am Am F Dm C Dm" },
  { name: "Estampie of the Three Towers", step: 0.24, bar: 6, feel: "dance3", lead: "horn", lead2: "rec", drone: "G", droneV: 0.06,
    A: "G4:2 B4:2 D5:2 | C5:2 B4:1 A4:1 G4:2 | F4:2 A4:2 C5:2 | D5:4 B4:2 | G4:2 B4:2 D5:2 | E5:2 D5:1 C5:1 B4:2 | A4:2 F4:2 A4:2 | G4:6",
    Ac: "G C F G G C F G",
    B: "D5:2 E5:1 F5:1 G5:2 | F5:2 E5:2 D5:2 | C5:2 D5:1 E5:1 F5:2 | E5:2 D5:2 C5:2 | D5:2 G5:2 F5:2 | E5:1 D5:1 C5:2 A4:2 | C5:2 A4:2 F4:2 | G4:6",
    Bc: "G F F C G C F G" },
  { name: "The Lantern Ballad", step: 0.27, bar: 8, feel: "ballad", lead: "rec", lead2: "rec", drone: "A", droneV: 0.035, form: "AABB",
    A: "A4:3 B4:1 C5:2 E5:2 | D5:2 C5:2 B4:4 | C5:3 D5:1 E5:2 A5:2 | G5:2 E5:2 E5:4 | F5:3 E5:1 D5:2 C5:2 | B4:2 C5:2 D5:2 E5:2 | C5:2 B4:2 A4:2 G4:2 | A4:8",
    Ac: "Am G Am Em F G Am Am",
    B: "E5:2 A5:2 G5:2 E5:2 | F5:2 E5:2 D5:4 | C5:2 D5:2 E5:2 G5:2 | E5:6 D5:2 | C5:3 B4:1 A4:2 C5:2 | B4:2 G4:2 E4:4 | B4:2 C5:2 B4:2 G#4:2 | A4:8",
    Bc: "Am Dm C Em Am Em E Am" },
  { name: "Saltarello of the Ravens", step: 0.165, bar: 6, feel: "jig2", lead: "horn", lead2: "rec", drone: "E", droneV: 0.06,
    A: "E5:1 F5:1 E5:1 D5:2 C5:1 | B4:2 C5:1 A4:3 | G4:1 A4:1 B4:1 C5:1 D5:1 E5:1 | G5:2 F5:1 E5:3 | E5:1 F5:1 E5:1 D5:2 C5:1 | B4:2 A4:1 G4:2 F4:1 | F4:1 G4:1 A4:1 C5:2 A4:1 | E4:6",
    Ac: "Em Am C Em Em G F Em",
    B: "B4:1 C5:1 D5:1 E5:2 B4:1 | C5:2 A4:1 B4:3 | A4:1 B4:1 C5:1 D5:2 A4:1 | B4:3 E5:3 | G5:2 F5:1 E5:2 D5:1 | C5:1 D5:1 E5:1 F5:2 E5:1 | D5:1 C5:1 B4:1 A4:2 F4:1 | E4:6",
    Bc: "Em Am Dm Em C C F Em" }
];

// The lute's part for each kind of tune: [step, strings, loudness, strummed]. Strings are
// b bass root, q bass fifth, r root, t third, f fifth, R the root an octave up.
const MUSIC_LUTE = {
  jig: [[0, "b", 0.5], [0, "rtf", 0.24, 1], [3, "q", 0.38], [3, "rtf", 0.15, 1]],
  jig2: [[0, "b", 0.5], [0, "rtf", 0.22, 1], [3, "q", 0.38], [4, "rt", 0.12, 1]],
  dance3: [[0, "b", 0.5], [0, "rtfR", 0.24, 1], [2, "tf", 0.13, 1], [4, "tf", 0.13, 1]],
  ballad: [[0, "b", 0.42], [1, "q", 0.26], [2, "r", 0.26], [3, "t", 0.26], [4, "f", 0.26], [5, "t", 0.24], [6, "r", 0.24], [7, "q", 0.26]]
};
// The drum's part: the first time through, then the second (with the tambourine).
const MUSIC_DRUM = {
  jig: [[[0, "dum", 0.57], [2, "tek", 0.14], [3, "dum", 0.38], [5, "tek", 0.14]], [[1, "jingle", 0.08], [4, "jingle", 0.08]]],
  jig2: [[[0, "dum", 0.57], [1, "tek", 0.11], [3, "dum", 0.41], [4, "tek", 0.11], [5, "tek", 0.11]], [[2, "jingle", 0.08], [5, "jingle", 0.07]]],
  dance3: [[[0, "dum", 0.57], [2, "tek", 0.14], [4, "tek", 0.14]], [[3, "jingle", 0.08]]],
  ballad: [[[0, "dum", 0.35], [4, "dum", 0.2]], []]
};

const MUSIC_NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function musicMidi(n) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(n);
  return 12 * (+m[3] + 1) + MUSIC_NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
const musicHz = m => 440 * Math.pow(2, (m - 69) / 12);
function musicLine(s) {
  return s.split(/\s+/).filter(x => x && x !== "|").map(tk => { const [n, d] = tk.split(":"); return { m: n === "R" ? -1 : musicMidi(n), d: +d }; });
}
function musicChord(sym) {
  const m = /^([A-G][#b]?)(m?)$/.exec(sym), r = musicMidi(m[1] + "3");
  return { b: r - 12, q: r - 5, r, t: r + (m[2] ? 3 : 4), f: r + 7, R: r + 12 };
}

// Every note of a tune, with times in seconds from its start.
function musicArrange(T) {
  const sd = T.step, ev = [];
  let t = 0;
  [...(T.form || "AABBAABB")].forEach((s, k) => {
    const pass = k >= 4 ? 1 : 0, lead = pass ? T.lead2 : T.lead;
    let x = 0;
    for (const n of musicLine(T[s])) { if (n.m >= 0) ev.push({ t: t + x * sd, k: lead, m: n.m, d: n.d * sd, v: lead === "rec" ? 0.2 : 0.13 }); x += n.d; }
    const chords = T[s + "c"].split(" ");
    chords.forEach((c, b) => {
      const bt = t + b * T.bar * sd, ch = musicChord(c), ring = T.bar * sd * (T.feel === "ballad" ? 0.6 : 1.1);
      for (const [st, strings, v, strum] of MUSIC_LUTE[T.feel]) [...strings].forEach((w, j) => ev.push({ t: bt + st * sd + (strum ? j * 0.017 : 0), k: "lute", m: ch[w], d: ring, v }));
      const [first, extra] = MUSIC_DRUM[T.feel];
      for (const [st, kind, v] of pass ? first.concat(extra) : first) ev.push({ t: bt + st * sd, k: kind, v });
    });
    t += chords.length * T.bar * sd;
  });
  ev.push({ t: 0, k: "drone", m: musicMidi(T.drone + "4"), d: t, v: T.droneV });
  ev.sort((a, b) => a.t - b.t);
  return { ev, len: t };
}

// The instruments, playing into any audio context (a live one, or an offline one for checking levels).
class MusicBand {
  constructor(ctx, dest, vol) {
    const c = this.ctx = ctx;
    this.ks = new Map();
    this.out = c.createGain();
    this.out.gain.value = 0.0001;
    this.out.gain.setTargetAtTime(vol, c.currentTime, 0.5);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
    this.out.connect(comp);
    comp.connect(dest);
    this.dry = c.createGain();
    this.dry.connect(this.out);
    const rev = c.createConvolver(), wet = c.createGain();
    rev.buffer = this.impulse(2.3, 3.2);
    wet.gain.value = 0.32;
    this.dry.connect(rev); rev.connect(wet); wet.connect(this.out);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.recWave = c.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, 0.13, 0.05, 0.02]));
    this.hornWave = c.createPeriodicWave(new Float32Array(12), new Float32Array([0, 1, 0.1, 0.55, 0.08, 0.36, 0.06, 0.24, 0.05, 0.16, 0.04, 0.1]));
    this.pan = {};
    for (const [k, p] of [["lead", -0.22], ["lute", 0.28], ["drum", -0.1], ["drone", 0.04]]) {
      const n = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
      if (n.pan) n.pan.value = p;
      n.connect(this.dry);
      this.pan[k] = n;
    }
  }

  impulse(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }

  filter(type, f, q = 1, gain = 0) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gain; return b; }
  chain(...nodes) { for (let i = 1; i < nodes.length; i++) nodes[i - 1].connect(nodes[i]); return nodes[0]; }

  play(e, t) {
    t += (Math.random() - 0.5) * 0.01;
    const v = e.v * (0.9 + Math.random() * 0.2);
    if (e.k === "lute") this.lute(e.m, t, e.d, v);
    else if (e.k === "rec") this.recorder(e.m, t, e.d, v);
    else if (e.k === "horn") this.horn(e.m, t, e.d, v);
    else if (e.k === "drone") this.drone(e.m, t, e.d, e.v);
    else this.drum(e.k, t, v);
  }

  // A plucked string (Karplus-Strong), worked out once per pitch.
  string(m) {
    if (this.ks.has(m)) return this.ks.get(m);
    const sr = this.ctx.sampleRate, len = Math.floor(sr * 2.4), y = new Float32Array(len);
    const D = sr / musicHz(m) - 0.5, N = Math.floor(D), fr = D - N;
    let lp = 0;
    for (let i = 0; i < N + 2; i++) { lp += 0.55 * ((Math.random() * 2 - 1) - lp); y[i] = lp; }
    for (let i = N + 2; i < len; i++) {
      const a = y[i - N] * (1 - fr) + y[i - N - 1] * fr, b = y[i - N - 1] * (1 - fr) + y[i - N - 2] * fr;
      y[i] = 0.9978 * 0.5 * (a + b);
    }
    let pk = 1e-9;
    for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(y[i]));
    for (let i = 0; i < len; i++) y[i] /= pk;
    for (let i = len - 3000; i < len; i++) y[i] *= (len - i) / 3000;
    const buf = this.ctx.createBuffer(1, len, sr);
    buf.getChannelData(0).set(y);
    this.ks.set(m, buf);
    return buf;
  }

  lute(m, t, ring, v) {
    const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
    src.buffer = this.string(m);
    g.gain.setValueAtTime(v, t);
    g.gain.setTargetAtTime(0, t + ring, 0.09);
    this.chain(src, this.filter("peaking", 230, 1, 4), this.filter("lowpass", 2600, 0.7), g, this.pan.lute);
    src.start(t);
    src.stop(t + Math.min(2.4, ring + 0.6));
  }

  recorder(m, t, d, v) {
    const c = this.ctx, f = musicHz(m), end = t + d * 0.92;
    const o = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain(), g = c.createGain();
    o.setPeriodicWave(this.recWave);
    o.frequency.value = f;
    vib.frequency.value = 4.8 + Math.random() * 0.8;
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.0045, t + Math.min(0.35, d * 0.7));
    vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.035);
    g.gain.setValueAtTime(v * 0.92, Math.max(t + 0.04, end - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, end + 0.05);
    this.chain(o, this.filter("lowpass", 4200, 0.7), g, this.pan.lead);
    // the breath in the pipe
    const n = c.createBufferSource(), ng = c.createGain();
    n.buffer = this.noise;
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(v * 0.22, t + 0.015);
    ng.gain.linearRampToValueAtTime(v * 0.04, t + 0.08);
    ng.gain.linearRampToValueAtTime(0.0001, end + 0.05);
    this.chain(n, this.filter("bandpass", f * 2.2, 1.5), ng, this.pan.lead);
    o.start(t); vib.start(t); n.start(t, Math.random() * 1.5);
    o.stop(end + 0.1); vib.stop(end + 0.1); n.stop(end + 0.1);
  }

  horn(m, t, d, v) {
    const c = this.ctx, end = t + d * 0.9, o = c.createOscillator(), g = c.createGain();
    o.setPeriodicWave(this.hornWave);
    o.frequency.value = musicHz(m);
    o.detune.setValueAtTime(-25, t);
    o.detune.linearRampToValueAtTime(0, t + 0.04);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.setValueAtTime(v, Math.max(t + 0.02, end - 0.03));
    g.gain.linearRampToValueAtTime(0.0001, end + 0.04);
    this.chain(o, this.filter("peaking", 1200, 1.4, 6), this.filter("lowpass", 2800, 0.7), g, this.pan.lead);
    o.start(t);
    o.stop(end + 0.08);
  }

  // A hurdy-gurdy's drone strings: the tune's home note and its fifth, low down.
  drone(m, t, d, v) {
    const c = this.ctx, f = this.filter("lowpass", 650, 0.7), g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 1.5);
    g.gain.setValueAtTime(v, Math.max(t + 1.6, t + d - 1.5));
    g.gain.linearRampToValueAtTime(0.0001, t + d + 0.6);
    for (const [mm, a] of [[m - 24, 1], [m - 17, 0.6]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = "sawtooth";
      o.frequency.value = musicHz(mm);
      o.detune.value = (Math.random() - 0.5) * 6;
      og.gain.value = a;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + d + 0.7);
    }
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.35;
    lg.gain.value = 120;
    lfo.connect(lg); lg.connect(f.frequency);
    lfo.start(t); lfo.stop(t + d + 0.7);
    f.connect(g); g.connect(this.pan.drone);
  }

  drum(kind, t, v) {
    const c = this.ctx, n = c.createBufferSource(), ng = c.createGain();
    n.buffer = this.noise;
    if (kind === "dum") {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(118, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.18);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.connect(g); g.connect(this.pan.drum);
      o.start(t); o.stop(t + 0.4);
      ng.gain.setValueAtTime(v * 0.45, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      this.chain(n, this.filter("lowpass", 900, 0.7), ng, this.pan.drum);
      n.start(t, Math.random()); n.stop(t + 0.08);
    } else if (kind === "tek") {
      ng.gain.setValueAtTime(v, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      this.chain(n, this.filter("bandpass", 2600, 1.2), ng, this.pan.drum);
      n.start(t, Math.random()); n.stop(t + 0.08);
    } else {
      // a shake of the tambourine's jingles
      ng.gain.setValueAtTime(0.0001, t);
      for (const [dt, a] of [[0, 1], [0.03, 0.6], [0.06, 0.35]]) {
        ng.gain.setValueAtTime(v * a, t + dt);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.028);
      }
      this.chain(n, this.filter("highpass", 6500, 0.7), ng, this.pan.drum);
      n.start(t, Math.random()); n.stop(t + 0.12);
    }
  }

  fadeOut() {
    const c = this.ctx, g = this.out.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setTargetAtTime(0.0001, c.currentTime, 0.15);
    const out = this.out;
    setTimeout(() => out.disconnect(), 1200);
  }
}

// The player: shuffles the tunes and keeps a little ahead of the clock.
// "sound" mutes everything; "level" is the music: 0 off, 1 quiet, 2 normal.
const Music = {
  VOL: [0, 0.22, 0.45],
  sound: true,
  level: 2,
  lastLevel: 2,
  ctx: null,
  band: null,
  timer: 0,
  init() {
    try {
      const s = localStorage.getItem("rv_sound"), v = localStorage.getItem("rv_music");
      if (s != null) this.sound = s === "1";
      if (v != null) this.level = +v;
      if (this.level > 0) this.lastLevel = this.level;
    } catch (e) { /* ignore */ }
    // browsers only let sound start from a click, so the first one wakes it
    document.addEventListener("pointerdown", () => this.ensure() && this.refresh());
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (this.sound) this.ctx.resume();
    });
  },
  ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === "suspended" && !document.hidden) this.ctx.resume();
    return this.ctx;
  },
  save() { try { localStorage.setItem("rv_sound", this.sound ? "1" : "0"); localStorage.setItem("rv_music", String(this.level)); } catch (e) { /* ignore */ } },
  setSound(on) { this.sound = on; this.save(); this.ensure(); this.refresh(); },
  setLevel(l) { this.level = l; if (l > 0) this.lastLevel = l; this.save(); this.ensure(); this.refresh(); },
  toggleMusic() { this.setLevel(this.level > 0 ? 0 : this.lastLevel); },
  refresh() {
    const want = this.sound && this.level > 0;
    if (!want) return this.stop();
    if (!this.ctx) return;
    if (this.band) this.band.out.gain.setTargetAtTime(this.VOL[this.level], this.ctx.currentTime, 0.2);
    else this.start();
  },
  start() {
    if (this.band || !this.ensure()) return;
    this.band = new MusicBand(this.ctx, this.ctx.destination, this.VOL[this.level]);
    this.order = MUSIC_TUNES.map((_, i) => i).sort(() => Math.random() - 0.5);
    this.oi = 0;
    this.next(this.ctx.currentTime + 0.4);
    this.timer = setInterval(() => this.tick(), 80);
  },
  stop() {
    clearInterval(this.timer);
    this.timer = 0;
    if (this.band) { this.band.fadeOut(); this.band = null; }
  },
  next(t) {
    this.tune = MUSIC_TUNES[this.order[this.oi++ % this.order.length]];
    this.cur = musicArrange(this.tune);
    this.t0 = t;
    this.i = 0;
  },
  tick() {
    if (!this.band) return;
    const now = this.ctx.currentTime, ev = this.cur.ev;
    while (this.i < ev.length && this.t0 + ev[this.i].t < now + 0.35) {
      const e = ev[this.i++], at = this.t0 + e.t;
      if (at > now - 0.05 || e.k === "drone") this.band.play(e, Math.max(at, now));
    }
    if (this.i >= ev.length && now > this.t0 + this.cur.len + 0.5) this.next(now + 2);
  }
};
Music.init();

// Sound effects for the table: cards sliding and landing, coins, steps, chimes.
const Sfx = {
  last: {},
  ready() { return Music.sound && Music.ctx && Music.ctx.state === "running" ? Music.ctx : null; },
  // at most one of each sound every few hundredths of a second, so a handful of cards is one sound
  gate(k, ms) { const n = performance.now(); if (n - (this.last[k] || 0) < ms) return false; this.last[k] = n; return true; },
  out(c) {
    if (!this.bus || this.bus.context !== c) { this.bus = c.createGain(); this.bus.gain.value = 0.9; this.bus.connect(c.destination); }
    return this.bus;
  },
  noise(c) {
    if (!this.nbuf || this.nbuf.sampleRate !== c.sampleRate) {
      this.nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource();
    s.buffer = this.nbuf;
    return s;
  },
  burst(c, t, dur, type, f0, f1, q, peak) {
    const s = this.noise(c), f = c.createBiquadFilter(), g = c.createGain();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out(c));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  tones(notes, type = "sine", gain = 0.06) {
    const c = this.ready();
    if (!c) return;
    const now = c.currentTime;
    for (const [f, t0, d] of notes) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now + t0);
      g.gain.setValueAtTime(0.0001, now + t0);
      g.gain.exponentialRampToValueAtTime(gain, now + t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + d);
      o.connect(g); g.connect(this.out(c));
      o.start(now + t0); o.stop(now + t0 + d + 0.02);
    }
  },
  slide() { const c = this.ready(); if (c && this.gate("slide", 70)) this.burst(c, c.currentTime, 0.2, "bandpass", 2600, 1500, 0.9, 0.08); },
  // a card landing: a quick double flick
  flick() {
    const c = this.ready();
    if (!c || !this.gate("flick", 60)) return;
    this.burst(c, c.currentTime, 0.06, "bandpass", 2600, 2600, 1.2, 0.26);
    this.burst(c, c.currentTime + 0.07, 0.05, "bandpass", 3400, 3400, 1.2, 0.19);
  },
  clink() { if (this.gate("clink", 50)) { const k = 1 + (Math.random() - 0.5) * 0.06; this.tones([[2093 * k, 0, 0.22], [3136 * k, 0, 0.16], [4186 * k, 0.012, 0.12]], "sine", 0.035); } },
  step() {
    const c = this.ready();
    if (!c || !this.gate("step", 60)) return;
    this.burst(c, c.currentTime, 0.05, "lowpass", 700, 700, 0.7, 0.16);
    this.tones([[150, 0, 0.09]], "sine", 0.1);
  },
  riffle() {
    const c = this.ready();
    if (!c || !this.gate("riffle", 400)) return;
    for (let i = 0; i < 9; i++) this.burst(c, c.currentTime + i * 0.028, 0.03, "bandpass", 3000, 3000, 1, 0.07);
  },
  chime() { this.tones([[1047, 0, 0.5], [1319, 0.07, 0.5], [1568, 0.14, 0.6]], "sine", 0.05); },
  fanfare() { this.tones([[523, 0, 0.25], [659, 0.09, 0.25], [784, 0.18, 0.3], [1047, 0.28, 0.7], [784, 0.28, 0.7]], "triangle", 0.06); },
  turn() { this.tones([[784, 0, 0.35], [1175, 0.12, 0.5]], "sine", 0.045); }
};
