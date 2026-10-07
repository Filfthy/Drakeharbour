// river-music.js - bardcore-style tunes written for River, synthesised in the browser:
// a plucked lute, recorder and crumhorn leads, a hurdy-gurdy drone, a tabor (a snared frame drum) and a tambourine.

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
    Bc: "Em Am Dm Em C C F Em" },
  { name: "The Harbour Hornpipe", step: 0.18, bar: 6, feel: "jig", lead: "rec", lead2: "horn", drone: "D", droneV: 0.06,
    A: "D5:2 F#5:1 A5:2 F#5:1 | G5:2 E5:1 C5:2 E5:1 | D5:2 F#5:1 A5:1 B5:1 A5:1 | G5:3 E5:3 | D5:2 F#5:1 A5:2 F#5:1 | G5:2 B5:1 A5:2 G5:1 | F#5:1 E5:1 D5:1 C5:2 E5:1 | D5:6",
    Ac: "D C D Em D G C D",
    B: "A5:2 B5:1 C6:2 B5:1 | A5:2 G5:1 E5:2 G5:1 | A5:2 F#5:1 D5:2 F#5:1 | E5:3 A4:3 | D5:1 E5:1 F#5:1 G5:2 A5:1 | B5:2 A5:1 G5:2 E5:1 | F#5:2 D5:1 E5:2 C5:1 | D5:6",
    Bc: "Am C D Am D Em C D" },
  { name: "Pavane of the Lapsed Charter", step: 0.3, bar: 8, feel: "ballad", lead: "rec", lead2: "rec", drone: "D", droneV: 0.035, form: "AABB",
    A: "D5:3 E5:1 F5:2 A5:2 | G5:2 F5:2 E5:4 | F5:3 G5:1 A5:2 C6:2 | B5:2 A5:2 A5:4 | G5:3 F5:1 E5:2 D5:2 | C5:2 D5:2 E5:2 F5:2 | E5:2 D5:2 C5:2 E5:2 | D5:8",
    Ac: "Dm C F G Em Am C Dm",
    B: "A5:3 B5:1 C6:2 A5:2 | G5:2 A5:2 F5:4 | E5:3 F5:1 G5:2 E5:2 | D5:6 E5:2 | F5:3 E5:1 D5:2 C5:2 | D5:2 F5:2 A5:4 | G5:2 F5:2 E5:2 C#5:2 | D5:8",
    Bc: "Am F C Dm Dm Dm A Dm" },
  { name: "Branle of the Bellfounders", step: 0.22, bar: 6, feel: "dance3", lead: "horn", lead2: "rec", drone: "G", droneV: 0.06,
    A: "G4:2 G4:1 A4:1 B4:2 | C5:2 B4:2 A4:2 | B4:2 B4:1 C5:1 D5:2 | E5:4 D5:2 | C5:2 C5:1 B4:1 A4:2 | B4:2 A4:1 G4:1 F#4:2 | G4:2 A4:2 B4:1 A4:1 | G4:6",
    Ac: "G Am G C Am D G G",
    B: "D5:2 D5:1 E5:1 F#5:2 | G5:2 F#5:2 E5:2 | D5:2 B4:1 C5:1 D5:2 | A4:4 D5:2 | G5:2 F#5:1 E5:1 D5:2 | C5:2 B4:1 A4:1 B4:2 | A4:2 B4:1 C5:1 A4:2 | G4:6",
    Bc: "D Em G D G Am D G" },
  { name: "The Tavern Round", step: 0.17, bar: 6, feel: "jig2", lead: "rec", lead2: "horn", drone: "A", droneV: 0.06,
    A: "A4:1 C5:1 E5:1 A5:2 E5:1 | G5:2 E5:1 D5:2 B4:1 | C5:1 D5:1 E5:1 F5:2 E5:1 | D5:3 B4:3 | A4:1 C5:1 E5:1 A5:2 G5:1 | F5:2 E5:1 D5:2 C5:1 | B4:1 C5:1 D5:1 E5:2 G#4:1 | A4:6",
    Ac: "Am G F G Am Dm E Am",
    B: "E5:2 A5:1 G5:2 E5:1 | F5:2 D5:1 E5:2 C5:1 | D5:2 G5:1 F5:2 D5:1 | E5:3 E4:3 | A4:1 B4:1 C5:1 D5:2 E5:1 | F5:1 E5:1 D5:1 C5:2 A4:1 | B4:2 G#4:1 E4:2 B4:1 | A4:6",
    Bc: "Am Dm G E Am Dm E Am" }
];

// The lute's part for each kind of tune: [step, strings, loudness, strummed]. Strings are
// b bass root, q bass fifth, r root, t third, f fifth, R the root an octave up.
const MUSIC_LUTE = {
  jig: [[0, "b", 0.2], [0, "rtf", 0.22, 1], [3, "q", 0.15], [3, "rtf", 0.14, 1]],
  jig2: [[0, "b", 0.2], [0, "rtf", 0.2, 1], [3, "q", 0.15], [4, "rt", 0.11, 1]],
  dance3: [[0, "b", 0.2], [0, "rtfR", 0.22, 1], [2, "tf", 0.12, 1], [4, "tf", 0.12, 1]],
  ballad: [[0, "b", 0.22], [1, "q", 0.16], [2, "r", 0.24], [3, "t", 0.24], [4, "f", 0.24], [5, "t", 0.22], [6, "r", 0.22], [7, "q", 0.15]]
};
// The drum's part: the first time through, then the second (with the tambourine).
const MUSIC_DRUM = {
  jig: [[[0, "dum", 0.57], [2, "tek", 0.14], [3, "dum", 0.38], [5, "tek", 0.14]], [[1, "jingle", 0.08], [4, "jingle", 0.08]]],
  jig2: [[[0, "dum", 0.57], [1, "tek", 0.11], [3, "dum", 0.41], [4, "tek", 0.11], [5, "tek", 0.11]], [[2, "jingle", 0.08], [5, "jingle", 0.07]]],
  dance3: [[[0, "dum", 0.57], [2, "tek", 0.14], [4, "tek", 0.14]], [[3, "jingle", 0.08]]],
  ballad: [[[0, "dum", 0.42], [4, "dum", 0.28]], [[6, "tek", 0.08]]]
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
    // low strings get a softer pluck and die away sooner, so they hum rather than twang
    const soft = m < 48 ? 0.2 : m < 60 ? 0.38 : 0.55, keep = m < 48 ? 0.9955 : 0.9978;
    let lp = 0;
    for (let i = 0; i < N + 2; i++) { lp += soft * ((Math.random() * 2 - 1) - lp); y[i] = lp; }
    for (let i = N + 2; i < len; i++) {
      const a = y[i - N] * (1 - fr) + y[i - N - 1] * fr, b = y[i - N - 1] * (1 - fr) + y[i - N - 2] * fr;
      y[i] = keep * 0.5 * (a + b);
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
    this.chain(src, this.filter("peaking", 230, 1, 1.5), this.filter("lowpass", m < 48 ? 900 : 2400, 0.7), g, this.pan.lute);
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

  // A medieval tabor, the drum of pipe-and-tabor: a skin with a ringing overtone, the slap of the stick
  // and the buzz of its gut snare, so it carries on small speakers too; a rim stroke; the tambourine.
  drum(kind, t, v) {
    const c = this.ctx;
    v *= 1.8;   // the drum sits a little forward in the band, as it does in a dance
    const noise = (type, f, q, peak, dur, at = t) => {
      const n = c.createBufferSource(), g = c.createGain();
      n.buffer = this.noise;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      this.chain(n, this.filter(type, f, q), g, this.pan.drum);
      n.start(at, Math.random()); n.stop(at + dur + 0.02);
    };
    const tone = (f0, f1, peak, dur) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.pan.drum);
      o.start(t); o.stop(t + dur + 0.02);
    };
    if (kind === "dum") {
      tone(150, 88, v * 1.1, 0.32);                   // the skin
      tone(245, 190, v * 0.9, 0.2);                   // its ringing overtone
      noise("bandpass", 800, 1.1, v * 2.2, 0.08);     // the stick's slap
      noise("bandpass", 3200, 0.8, v * 0.75, 0.16);   // the snare's buzz
    } else if (kind === "tek") {
      noise("bandpass", 2400, 1.4, v * 3.6, 0.05);    // a stroke on the rim
      tone(1700, 1500, v * 0.35, 0.04);
      noise("bandpass", 3600, 0.8, v * 1.2, 0.09);
    } else {
      // a shake of the tambourine's jingles
      const n = c.createBufferSource(), ng = c.createGain();
      n.buffer = this.noise;
      ng.gain.setValueAtTime(0.0001, t);
      for (const [dt, a] of [[0, 1], [0.03, 0.6], [0.06, 0.35]]) {
        ng.gain.setValueAtTime(v * a * 1.3, t + dt);
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
// "sound" mutes everything; the music has its own switch and volume (0 to 1, a slider).
const Music = {
  MAXGAIN: 0.5,
  sound: true,
  on: true,
  volume: 0.4,
  ctx: null,
  band: null,
  timer: 0,
  // the slider is shaped so that its lower half is properly quiet
  gain() { return this.MAXGAIN * Math.pow(this.volume, 1.75); },
  init() {
    try {
      const s = localStorage.getItem("rv_sound"), on = localStorage.getItem("rv_musicon"), v = localStorage.getItem("rv_musicvol"), old = localStorage.getItem("rv_music");
      if (s != null) this.sound = s === "1";
      if (v != null) { this.volume = +v; this.on = on !== "0"; }
      else if (old != null) { this.on = old !== "0"; this.volume = old === "1" ? 0.35 : 0.6; }   // the old Off / Quiet / On choice
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
  save() {
    try {
      localStorage.setItem("rv_sound", this.sound ? "1" : "0");
      localStorage.setItem("rv_musicon", this.on ? "1" : "0");
      localStorage.setItem("rv_musicvol", String(this.volume));
    } catch (e) { /* ignore */ }
  },
  playing() { return this.sound && this.on && this.volume > 0; },
  setSound(on) { this.sound = on; this.save(); this.ensure(); this.refresh(); },
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); if (this.volume > 0) this.on = true; this.save(); this.ensure(); this.refresh(); },
  toggleMusic() { this.on = !(this.on && this.volume > 0); if (this.on && !this.volume) this.volume = 0.5; this.save(); this.ensure(); this.refresh(); },
  refresh() {
    Ambience.refresh();
    if (!this.playing()) return this.stop();
    if (!this.ctx) return;
    if (this.band) this.band.out.gain.setTargetAtTime(this.gain(), this.ctx.currentTime, 0.15);
    else this.start();
  },
  start() {
    if (this.band || !this.ensure()) return;
    this.band = new MusicBand(this.ctx, this.ctx.destination, this.gain());
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
  volume: (() => { try { const v = localStorage.getItem("rv_sfxvol"); return v == null ? 1 : +v; } catch (e) { return 1; } })(),
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem("rv_sfxvol", String(this.volume)); } catch (e) { /* ignore */ }
    if (this.bus) this.bus.gain.value = this.busGain();
  },
  busGain() { return 1.25 * this.volume * this.volume; },
  ready() { return Music.sound && this.volume > 0 && Music.ctx && Music.ctx.state === "running" ? Music.ctx : null; },
  // at most one of each sound every few hundredths of a second, so a handful of cards is one sound
  gate(k, ms) { const n = performance.now(), prev = this.last[k]; if (prev != null && n - prev < ms) return false; this.last[k] = n; return true; },
  // everything goes through one bus (the Effects volume); what the other players do goes through a quieter
  // one inside it, so your own moves stand out (dim is set while their moves play)
  dim: false,
  out(c) {
    if (!this.bus || this.bus.context !== c) {
      this.bus = c.createGain(); this.bus.gain.value = this.busGain(); this.bus.connect(c.destination);
      this.dimBus = c.createGain(); this.dimBus.gain.value = 0.6; this.dimBus.connect(this.bus);
    }
    return this.dim ? this.dimBus : this.bus;
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
  burst(c, t, dur, type, f0, f1, q, peak, dest) {
    const s = this.noise(c), f = c.createBiquadFilter(), g = c.createGain();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.out(c));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  // One oscillator: a pitch that may glide, a quick rise and a fall, optionally filtered, panned or wavering.
  // o: glide (seconds the glide takes), attack, lp / bp (filter frequency), q, vib ([rate, depth]), pan, dest.
  osc(c, t, type, f0, f1, dur, peak, o = {}) {
    const s = c.createOscillator(), g = c.createGain();
    s.type = type;
    s.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) s.frequency.exponentialRampToValueAtTime(f1, t + (o.glide || dur));
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
    let node = s;
    for (const [kind, f] of [["lowpass", o.lp], ["bandpass", o.bp]]) {
      if (!f) continue;
      const fl = c.createBiquadFilter();
      fl.type = kind; fl.frequency.value = f; fl.Q.value = o.q || (kind === "lowpass" ? 0.7 : 1);
      node.connect(fl); node = fl;
    }
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      l.connect(lg); lg.connect(s.frequency);
      l.start(t); l.stop(t + dur + 0.05);
    }
    if (o.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = o.pan; node.connect(pn); node = pn; }
    node.connect(g);
    g.connect(o.dest || this.out(c));
    s.start(t); s.stop(t + dur + 0.03);
  },
  // Struck metal or a bell: sine partials at the given ratios of a base pitch, each with its own level and decay.
  partials(c, t, base, list, dest, pan) {
    for (const [ratio, peak, decay] of list) this.osc(c, t, "sine", base * ratio, 0, decay, peak, { attack: 0.002, dest, pan });
  },
  // Play a sound now, at most once in ms milliseconds.
  play(name, ms, fn) { const c = this.ready(); if (c && this.gate(name, ms)) fn(c, c.currentTime); },
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
  spell() { this.tones([[1319, 0, 0.35], [1760, 0.05, 0.4], [2349, 0.1, 0.45], [2637, 0.16, 0.7], [3520, 0.22, 0.6]], "sine", 0.035); },
  fanfare() { this.tones([[523, 0, 0.25], [659, 0.09, 0.25], [784, 0.18, 0.3], [1047, 0.28, 0.7], [784, 0.28, 0.7]], "triangle", 0.06); },
  turn() { this.tones([[784, 0, 0.35], [1175, 0.12, 0.5]], "sine", 0.045); },
  // ---------------------------------------------------------------- the town's places
  // the Market: a few coins dropped on the counter
  coins() { this.play("coins", 150, (c, t) => {
    [0, 0.07, 0.15].forEach(d => this.partials(c, t + d, 2500 + Math.random() * 900, [[1, 0.03, 0.16], [1.48, 0.02, 0.12], [2.3, 0.012, 0.08]]));
    this.burst(c, t, 0.03, "highpass", 5000, 5000, 0.7, 0.05);
  }); },
  // the Forge: a hammer on the anvil, and a lighter tap after it
  anvil() { this.play("anvil", 200, (c, t) => {
    this.burst(c, t, 0.04, "highpass", 2500, 2500, 0.7, 0.09);
    this.partials(c, t, 830, [[1, 0.02, 0.9], [1.47, 0.016, 0.7], [2.09, 0.011, 0.5], [2.76, 0.008, 0.35], [3.93, 0.005, 0.25]]);
    this.partials(c, t + 0.3, 830, [[1, 0.008, 0.5], [2.09, 0.0045, 0.3]]);
  }); },
  // the Temple: a small hand bell
  templeBell() { this.play("tbell", 400, (c, t) => {
    this.partials(c, t, 660, [[0.5, 0.025, 2.2], [1, 0.03, 1.8], [1.19, 0.018, 1.3], [1.56, 0.014, 1.0], [2, 0.012, 0.8], [2.66, 0.008, 0.5]]);
  }); },
  // the Library: a page turned
  page() { this.play("page", 150, (c, t) => {
    this.burst(c, t, 0.13, "bandpass", 1300, 3600, 1.3, 0.12);
    this.burst(c, t + 0.1, 0.16, "bandpass", 3600, 1800, 1.1, 0.09);
    this.burst(c, t + 0.26, 0.06, "lowpass", 1800, 1200, 0.7, 0.07);
  }); },
  // the Tavern: a tankard set down on the table
  mug() { this.play("mug", 150, (c, t) => {
    this.osc(c, t, "sine", 210, 140, 0.13, 0.11);
    this.burst(c, t, 0.06, "bandpass", 900, 700, 2, 0.08);
    this.osc(c, t + 0.1, "sine", 190, 130, 0.09, 0.05);
    this.burst(c, t + 0.1, 0.04, "bandpass", 850, 650, 2, 0.04);
  }); },
  // the Harbour: a wave against the quay, and a gull
  harbour() { this.play("harbour", 300, (c, t) => {
    this.burst(c, t, 0.6, "lowpass", 500, 1100, 0.6, 0.1);
    this.gull(c, t + 0.15, 0.035);
  }); },
  gull(c, t, peak, dest, pan = 0) {
    [[0, 1750, 1250, 0.17], [0.22, 1650, 1150, 0.2]].forEach(([d, f0, f1, dur]) => this.osc(c, t + d, "sawtooth", f0, f1, dur, peak, { bp: 1800, q: 1.2, attack: 0.02, dest, pan }));
  },
  // ---------------------------------------------------------------- moves
  // founding a Charter: a wax seal pressed, and a bright chord
  seal() { this.play("seal", 200, (c, t) => {
    this.osc(c, t, "sine", 160, 55, 0.22, 0.085, { glide: 0.12 });
    this.burst(c, t, 0.09, "lowpass", 700, 300, 0.7, 0.06);
    [[523, 0.06], [659, 0.085], [784, 0.11], [1047, 0.14]].forEach(([f, d]) => this.osc(c, t + d, "triangle", f, f, 1.1, 0.019, { attack: 0.02 }));
  }); },
  // stamina coming in: a little sparkle; and going out: a soft tick for each
  sparkle() { this.play("sparkle", 120, (c, t) => {
    [[1568, 0], [2093, 0.045], [2637, 0.09]].forEach(([f, d]) => this.osc(c, t + d, "sine", f, f, 0.28, 0.022));
  }); },
  spend() { this.play("spend", 45, (c, t) => this.osc(c, t, "sine", 1250, 1100, 0.05, 0.035)); },
  // Blink: a rush of air
  whoosh() { this.play("whoosh", 300, (c, t) => {
    this.burst(c, t, 0.22, "bandpass", 500, 3200, 1.4, 0.14);
    this.burst(c, t + 0.2, 0.25, "bandpass", 3200, 900, 1.4, 0.1);
  }); },
  // a saga goes on: a horn call
  horn() { this.play("horn", 500, (c, t) => {
    this.osc(c, t, "sawtooth", 392, 392, 0.3, 0.065, { lp: 1300, attack: 0.04, vib: [5.5, 3] });
    this.osc(c, t + 0.28, "sawtooth", 587, 587, 0.65, 0.075, { lp: 1500, attack: 0.04, vib: [5.5, 4] });
  }); },
  // a sealed commission opened: the wax cracking
  crack() { this.play("crack", 200, (c, t) => {
    this.burst(c, t, 0.025, "highpass", 1800, 1800, 0.7, 0.11);
    [0.035, 0.06, 0.1].forEach(d => this.burst(c, t + d, 0.018, "bandpass", 4200, 4200, 1.5, 0.05));
  }); },
  // one of your Charters will lapse unless you act: two low notes
  warn() { this.play("warn", 800, (c, t) => {
    this.osc(c, t, "triangle", 330, 330, 0.35, 0.06, { attack: 0.02 });
    this.osc(c, t + 0.2, "triangle", 262, 262, 0.55, 0.06, { attack: 0.02 });
  }); },
  // something lost to a limit: a falling note
  drop() { this.play("drop", 300, (c, t) => this.osc(c, t, "sine", 420, 180, 0.32, 0.05)); },
  // ---------------------------------------------------------------- the table
  // a button pressed: a soft tap on parchment
  tap() { this.play("tap", 40, (c, t) => { this.burst(c, t, 0.035, "bandpass", 1500, 1100, 1.1, 0.11); this.osc(c, t, "sine", 520, 420, 0.04, 0.022); }); },
  tick() { this.play("tick", 35, (c, t) => { this.osc(c, t, "sine", 2300, 2300, 0.03, 0.03); this.burst(c, t, 0.012, "bandpass", 5000, 5000, 1, 0.035); }); },
  // a click that can't do anything just now: a soft dull tap
  dud() { this.play("dud", 160, (c, t) => { this.osc(c, t, "sine", 150, 105, 0.09, 0.06); this.burst(c, t, 0.05, "lowpass", 450, 300, 0.7, 0.03); }); },
  // a perk at work: a soft high glint
  perk() { this.play("perk", 250, (c, t) => { this.osc(c, t, "sine", 1760, 1760, 0.35, 0.014); this.osc(c, t + 0.06, "sine", 2637, 2637, 0.45, 0.009); }); },
  ping() { this.play("ping", 300, (c, t) => { this.osc(c, t, "sine", 1319, 1319, 0.6, 0.03); this.osc(c, t, "sine", 2637, 2637, 0.4, 0.012); }); },
  rewind() { this.play("rewind", 150, (c, t) => { this.burst(c, t, 0.2, "bandpass", 3200, 900, 1.3, 0.11); this.osc(c, t, "sine", 900, 480, 0.16, 0.03); }); },
  // ---------------------------------------------------------------- the end of the game
  drumroll(c, t, dur, from, to) {
    const n = Math.round(dur / 0.045);
    for (let k = 0; k < n; k++) this.burst(c, t + k * 0.045, 0.06, "lowpass", 900, 700, 0.7, from + (to - from) * k / n);
  },
  // the final round begins: a drum roll and a brass call
  finalRound() { this.play("final", 2000, (c, t) => {
    this.drumroll(c, t, 0.65, 0.02, 0.07);
    this.osc(c, t + 0.66, "sine", 110, 70, 0.3, 0.12);
    [[523, 0.68, 0.16], [659, 0.84, 0.16], [784, 1.0, 0.16], [1047, 1.16, 0.8]].forEach(([f, d, dur]) => this.osc(c, t + d, "sawtooth", f, f, dur, 0.022, { lp: 2200, attack: 0.03, vib: [5.5, 3] }));
  }); },
  // you won: a drum and a rising fanfare that holds its chord
  victory() { this.play("victory", 2000, (c, t) => {
    this.osc(c, t, "sine", 110, 70, 0.35, 0.13);
    this.burst(c, t, 0.12, "lowpass", 900, 500, 0.7, 0.09);
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc(c, t + 0.12 + i * 0.11, "triangle", f, f, 0.3, 0.03, { attack: 0.01 }));
    [523, 659, 784, 1047].forEach(f => this.osc(c, t + 0.7, "triangle", f, f, 1.8, 0.017, { attack: 0.03 }));
  }); },
  // someone else won: a gentle falling phrase
  defeat() { this.play("defeat", 2000, (c, t) => {
    [[440, 0, 0.4], [392, 0.35, 0.4], [349, 0.7, 0.4], [330, 1.05, 1.2]].forEach(([f, d, dur]) => this.osc(c, t + d, "triangle", f, f, dur, 0.04, { attack: 0.03 }));
  }); },
  // a town bell: a new town event
  bell() { this.tones([[587, 0, 1.4], [880, 0, 1.1], [1175, 0.01, 0.8], [440, 0.42, 1.6], [659, 0.42, 1.2]], "sine", 0.035); }
};

// The town around you, very quietly: water lapping at the quays, a murmur of people, a gull now and then,
// and the Forge's hammer in the distance. It has its own volume (Town) and follows the sound switch.
const Ambience = {
  volume: (() => { try { const v = localStorage.getItem("rv_ambvol"); return v == null ? 0.15 : +v; } catch (e) { return 0.15; } })(),
  nodes: null,
  timers: {},
  // very low: at the default setting the water and voices sit far below every sound effect
  gain() { return 0.012 * this.volume * this.volume; },
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem("rv_ambvol", String(this.volume)); } catch (e) { /* ignore */ }
    this.refresh();
  },
  refresh() {
    const c = Music.ctx, want = !!(Music.sound && this.volume > 0 && c && c.state === "running");
    if (want && !this.nodes) this.start(c);
    else if (!want && this.nodes) this.stop();
    else if (this.nodes) this.nodes.out.gain.setTargetAtTime(this.gain(), c.currentTime, 0.2);
  },
  start(c) {
    const out = c.createGain();
    out.gain.value = 0.0001;
    out.gain.setTargetAtTime(this.gain(), c.currentTime, 1.2);   // it fades in
    out.connect(c.destination);
    // a few seconds of soft, deep noise, looped (each side its own)
    const buf = c.createBuffer(2, c.sampleRate * 4, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b = 0;
      for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 5; }
    }
    const loop = (type, f, q, level) => {
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.loop = true;
      fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      g.gain.value = level;
      s.connect(fl); fl.connect(g); g.connect(out);
      s.start(c.currentTime, Math.random() * 3);
      return { s, g };
    };
    const swell = (target, rate, depth) => {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = rate; lg.gain.value = depth;
      l.connect(lg); lg.connect(target);
      l.start();
      return l;
    };
    const water = loop("lowpass", 520, 0.5, 0.5), murmur = loop("bandpass", 480, 0.9, 0.11);
    this.nodes = { out, srcs: [water.s, murmur.s, swell(water.g.gain, 0.11, 0.32), swell(water.g.gain, 0.047, 0.15), swell(murmur.g.gain, 0.05, 0.05)] };
    // now and then: a gull somewhere, or the hammer at the Forge
    const later = (key, min, max, fn) => {
      this.timers[key] = setTimeout(() => {
        if (!this.nodes) return;
        if (!document.hidden && c.state === "running") fn();
        later(key, min, max, fn);
      }, (min + Math.random() * (max - min)) * 1000);
    };
    later("gull", 9, 26, () => Sfx.gull(c, c.currentTime, 0.03 + Math.random() * 0.015, out, Math.random() * 1.6 - 0.8));
    later("hammer", 14, 34, () => {
      const n = 3 + Math.floor(Math.random() * 3), base = 800 + Math.random() * 60;
      for (let k = 0; k < n; k++) Sfx.partials(c, c.currentTime + k * 0.42, base, [[1, 0.02, 0.35], [2.09, 0.011, 0.2]], out, 0.35);
    });
  },
  stop() {
    const n = this.nodes;
    this.nodes = null;
    for (const k in this.timers) clearTimeout(this.timers[k]);
    this.timers = {};
    if (!n) return;
    const c = n.out.context;
    n.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
    setTimeout(() => { n.srcs.forEach(s => { try { s.stop(); } catch (e) { /* ignore */ } }); n.out.disconnect(); }, 1500);
  }
};
