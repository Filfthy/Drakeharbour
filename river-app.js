// river-app.js - the table for River: you against computer players.

// Each character's colour, for their piece, their name plate and the Charters they own.
const CHAR_COL = { "Ser Aldric": "#e06a24", "Lady Velia": "#9e6fbf", "Brother Anselm": "#e9e2cf", "Magister Orrin": "#34373f", "Kestra": "#2bb3c0" };
// Characters with painted art (tools/make-characters.py): a shield, a portrait and a miniature.
const ART = new Set(["aldric", "velia", "anselm", "orrin", "kestra"]);
// Seat by seat for the game in play: each player's colour and character.
let PCOL = [], PKEY = [];
const RESKEY = ["gold", "steel", "faith", "lore"];
const PLACEKEY = ["market", "forge", "tavern", "temple", "library", "harbour", "square"];
const TYPEKEY = ["adventure", "diplomacy", "devotion", "scholarship", "exploration"];
const CHARKEY = { "Ser Aldric": "aldric", "Lady Velia": "velia", "Brother Anselm": "anselm", "Magister Orrin": "orrin", "Kestra": "kestra" };
const SHAPE_SHORT = { set: "Set", run: "Run", run4: "Run of 4+", set4: "Set of 4", long: "5+ cards", get low() { return `${LOW} or lower`; }, get high() { return `${HIGH} or higher`; } };
// The town on the map (img/map.webp, from art/town-map-plain.webp, 1672 pixels wide, shown 1600 wide):
// for each place, where its name banner sits and the building you can click (centre, width, height),
// in the map's own pixels. The places go round the ring road in this order.
const MAP_K = 1600 / 1672;
const TOWN = [
  { at: [668, 418] },    // Market
  { at: [845, 387] },    // Forge
  { at: [1005, 427] },   // Tavern
  { at: [1029, 573] },   // Temple
  { at: [852, 588] },    // Library
  { at: [662, 575] },    // Harbour
  { at: [844, 494] }     // the Square: a small label in its circle, under the feet of whoever stands there
];
const FOUNTAIN = [844, 469];   // the middle of the Square
// The town as a disc of six districts round the Square (in stage pixels): its half-width and half-height,
// and the Square's size as a share of them. The districts are 60 degrees each, the Market's starting at 180.
const PIE = { rx: 290, ry: 175, inner: 0.215 };
const FLY = 340;   // ms for a card to cross the table
let SPEED = 1;     // the player's choice: 1 normal, 0.55 fast (every movement and pause scales by it)
const SAVE_VERSION = 2;   // bump when the rules change, so an old save isn't carried on under new rules
// What a game in progress is saved as, so a refresh can carry on.
const SAVE_KEYS = ["o", "deck", "discard", "charterDeck", "display", "charters", "nextCharter", "qdeck", "qrow", "sealedDeck", "eventDeck", "event", "players", "turn", "round", "turnCount", "over", "endTriggered", "t", "stats"];
const FS_NAMES = ["Normal", "Large", "Larger"];

const svgIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  full: svgIcon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  exitFull: svgIcon('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  sound: svgIcon('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  muted: svgIcon('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  music: svgIcon('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  musicOff: svgIcon('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M3 3l18 18"/>')
};

const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
const load = (k, d) => { try { const v = localStorage.getItem("rv_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem("rv_" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const ic = k => `<i class="ic ic-${k}"></i>`;
const tok = r => `<span class="tok r${r}">${ic(RESKEY[r])}</span>`;
// Stamina (AP in the code) is a token too. A price shows one token for each point (up to five);
// a gain shows "+n" and one token.
const stTok = (cls = "") => `<span class="tok st${cls ? " " + cls : ""}">${ic("stamina")}</span>`;
const stCost = n => `<span class="stc">${n <= 5 ? stTok().repeat(n) : `${n}×${stTok()}`}</span>`;
const stGain = n => `<span class="stc">+${n}${stTok()}</span>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const ROMAN = ["I", "II", "III"];
const cardTxt = c => (c.spell ? `a ${SPELLS[c.spell].name}` : `the ${c.r} of ${SUITS[c.s]}s`);
const cardName = c => (c.spell ? SPELLS[c.spell].name : `${c.r} of ${SUITS[c.s]}s`);
const cardsTxt = cs => cs.slice().sort((a, b) => a.r - b.r || a.s - b.s).map(c => (c.spell ? (c.r ? `a Glamour (as ${c.r})` : "a Glamour") : `${c.r} ${SUITS[c.s]}`)).join(", ");
const needTxt = need => need.map((n, r) => (n ? `<span class="need">${tok(r)}${n}</span>` : "")).filter(Boolean).join(" ");
const PAWN = col => `<svg viewBox="0 0 24 32"><path d="M12 2a5 5 0 0 1 3.2 8.8c1.6 1 2.6 2.6 2.6 4.6 0 1.2-.4 2.4-1 3.3l3.2 6.3c.4.8.3 1.6-.3 2.2-.4.5-1 .8-1.7.8H6.2c-.7 0-1.3-.3-1.7-.8-.6-.6-.7-1.4-.3-2.2l3.2-6.3c-.6-.9-1-2.1-1-3.3 0-2 1-3.6 2.6-4.6A5 5 0 0 1 12 2z" fill="${col}" stroke="#1a0f06" stroke-width="1.5"/></svg>`;

function cardEl(c, size = "") {
  const e = document.createElement("div");
  if (c.spell) {
    // a spell card; a Glamour lying in a Charter shows the rank it stands for
    e.className = `card spell sp-${c.spell} ${size}` + (c.r ? " placed" : "");
    e.innerHTML = c.r ? `<div class="idx"><div class="rk">${c.r}</div></div><div class="sp-art"></div>`
      : `<div class="sp-name">${SPELLS[c.spell].name}</div><div class="sp-art"></div>`;
    e.dataset.tip = c.r ? `<b>Glamour</b><br>Standing in for the ${c.r} of ${SUITS[c.s]}s.`
      : `<b>${SPELLS[c.spell].name}</b><br>${SPELLS[c.spell].text}<br><i>${c.spell === "glamour" ? "Play it in a meld." : "Select it, then press Cast. One spell a turn."}</i>`;
  } else {
    e.className = `card s${c.s} ${size}`;
    e.innerHTML = `<div class="idx"><div class="rk">${c.r}</div><div class="pip"></div></div><div class="emb"></div>`;
    e.title = `${c.r} of ${SUITS[c.s]}s`;
  }
  e.style.setProperty("--bx", `${-(c.id * 37) % 400}px`);
  e.style.setProperty("--by", `${-(c.id * 61) % 380}px`);
  e.dataset.id = c.id;
  return e;
}
// A Charter's life as a ring of slices, one for each round; they go out one by one as it nears lapsing,
// green while it's healthy, then amber, then red. A lay-off on the Charter fills the ring again.
function fadeRing(left, life, tag = "div") {
  const n = Math.max(1, life), on = Math.max(0, Math.min(n, left)), r = 10, c = 12, f = on / n;
  const lvl = on === 0 ? "out" : f > 0.67 ? "full" : f > 0.34 ? "mid" : "low";
  const p = a => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  let s = "";
  if (n === 1) s = `<circle class="${on ? "on" : "off"}" cx="${c}" cy="${c}" r="${r}"/>`;
  else for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
    s += `<path class="${i < on ? "on" : "off"}" d="M${c} ${c} L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}Z"/>`;
  }
  const tip = left <= 0 ? "<b>Lapsing</b><br>It lapses at its owner's next turn, unless someone lays off on it."
    : `<b>${plural(left, "round")} left</b><br>It lapses if nobody lays off on it for that long. A lay-off fills the ring again.`;
  return `<${tag} class="fade ${lvl}" data-tip="${tip}"><svg class="ring" viewBox="0 0 24 24"><circle class="rim" cx="${c}" cy="${c}" r="${r + 1}"/>${s}</svg></${tag}>`;
}
// A card face down. The back is shown four ways (as drawn, upside down, mirrored, both), so cards side by side
// differ: v picks one, or any at random.
function backEl(size = "", v = Math.floor(Math.random() * 4)) { const e = document.createElement("div"); e.className = `card back bv${v} ${size}`; return e; }
function tokEl(r) { const t = document.createElement("span"); t.className = `tok r${r}`; t.innerHTML = ic(RESKEY[r]); return t; }
// A player's piece: their painted miniature on a ring of their colour, or a plain pawn.
function pawnEl(p) {
  const d = document.createElement("div");
  d.className = "pawn";
  if (ART.has(PKEY[p])) { d.classList.add("token"); d.style.setProperty("--pc", PCOL[p]); d.innerHTML = `<i class="ring"></i><img src="img/token-${PKEY[p]}.webp" alt="">`; }
  else d.innerHTML = PAWN(PCOL[p]);
  return d;
}
// What goes inside a portrait disc, and the mark on a Charter its owner holds.
const face = name => (ART.has(CHARKEY[name]) ? `<img src="img/portrait-${CHARKEY[name]}.webp" alt="">` : ic(CHARKEY[name]));
const arms = name => `<img src="img/arms-${CHARKEY[name]}.webp" alt="">`;

// Let a box be dragged by any bare part of it (its buttons, cards and quests still click as normal).
function draggable(el, app, opts = {}) {
  let s = null;
  el.addEventListener("pointerdown", e => {
    if (e.button > 0 || (opts.when && !opts.when()) || e.target.closest("button, .card, .quest, input, a")) return;
    const m = (el.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/) || [0, 0, 0]).slice(1).map(Number);
    s = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop, tx: m[0], ty: m[1] };
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
  });
  el.addEventListener("pointermove", e => {
    if (!s) return;
    const dx = (e.clientX - s.x) / app.scale, dy = (e.clientY - s.y) / app.scale;
    if (opts.transform) { el.style.transform = `translate(${s.tx + dx}px, ${s.ty + dy}px)`; return; }
    // keep enough of it on the table to grab again
    el.style.left = Math.max(80 - el.offsetWidth, Math.min(1600 - 80, s.l + dx)) + "px";
    el.style.top = Math.max(0, Math.min(900 - 40, s.t + dy)) + "px";
  });
  const end = () => { if (!s) return; s = null; el.classList.remove("dragging"); if (opts.onEnd) opts.onEnd(); };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

// Cards that would extend a founded Charter's meld.
function extenders(g, ch) {
  if (ch.kind === "set") {
    // with two of every card, any card of the rank fits until all are laid down
    const r = ch.cards[0].r;
    return ch.cards.length < 4 * (g.o.copies || 1) ? [`any ${r}`] : [];
  }
  const rs = ch.cards.map(c => c.r), lo = Math.min(...rs), hi = Math.max(...rs), s = SUITS[ch.cards[0].s];
  const out = [];
  if (lo > 1) out.push(`${lo - 1} of ${s}s`);
  if (hi < g.o.ranks) out.push(`${hi + 1} of ${s}s`);
  return out;
}

// The longest melds in a hand, leaving out the ones inside a longer meld.
function bigMelds(hand) {
  const all = RiverAI.meldOptions(hand).concat(RiverAI.wildMelds(hand)).sort((a, b) => b.length - a.length), out = [];
  for (const m of all) if (!out.some(o => m.every(c => o.includes(c)))) out.push(m);
  return out;
}

const noFx = () => ({ hide: new Set(), pawn: -1, discard: false, fanIn: {}, pend: [], renown: {}, quest: -1, charter: -1, flash: -1, turnover: null });

class App {
  constructor() {
    this.opponents = load("opponents", 2);
    this.level = load("level", "hard");
    this.sortMode = load("sort", "suit");
    this.speed = load("speed", 1);
    SPEED = this.speed;
    this.fs = Math.max(0, Math.min(2, load("fs", 0)));
    this.fullStart = load("fullstart", true);
    this.panels = load("panels", "tinted");
    this.scenery = load("scenery", !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches));
    this.lines = [];
    this.events = [];
    this.sel = new Set();
    this.drops = new Set();
    this.fresh = new Set();
    this.handEls = new Map();
    this.undo = [];
    this.targeting = null;
    this.fx = noFx();
    this.hint = null;
    this.mode = "idle";
    this.view = null;
    this.playing = false;
    this.tut = null;
    this.scale = 1;
    $("btn-cast").onclick = () => this.askCast();
    $("btn-clear").onclick = () => { this.sel.clear(); this.targeting = null; this.clearHint(); this.render(); };
    $("btn-reoffer").onclick = e => { e.stopPropagation(); this.refreshCharters(); };
    $("btn-reoffer").innerHTML = $("btn-request").innerHTML = `Fresh ${stCost(1)}`;
    $("btn-request").onclick = e => { e.stopPropagation(); this.refreshQuests(); };
    $("btn-undo").onclick = e => { e.currentTarget.blur(); this.undoLast(); };
    $("btn-end").onclick = () => this.endMyTurn();
    $("deck").onclick = () => this.clickPile("deck");
    $("discard").onclick = () => this.clickPile("discard");
    $("btn-rules").onclick = () => this.showRules(() => this.closePanel());
    $("btn-menu").onclick = () => this.showTitle();
    $("btn-hint").onclick = e => { e.currentTarget.blur(); this.showHint(); };
    $("btn-fs-down").onclick = () => this.setFs(this.fs - 1);
    $("btn-fs-up").onclick = () => this.setFs(this.fs + 1);
    $("btn-music").onclick = e => { e.currentTarget.blur(); e.stopPropagation(); this.toggleMixer(); };
    $("mixer").innerHTML = this.volRows() + `<div class="mx-note">The speaker button mutes everything.</div>`;
    this.wireVols($("mixer"));
    $("mixer").addEventListener("pointerdown", e => e.stopPropagation());
    document.addEventListener("pointerdown", () => this.toggleMixer(false));
    $("btn-sound").onclick = e => { e.currentTarget.blur(); Music.setSound(!Music.sound); this.audioUi(); };
    $("btn-full").onclick = e => { e.currentTarget.blur(); this.toggleFull(); };
    $("chronicle").onclick = () => this.lensLog();
    this.wireTips();
    $("sort-suit").onclick = () => this.setSort("suit");
    $("sort-rank").onclick = () => this.setSort("rank");
    $("overlay").addEventListener("click", () => { if ($("overlay").classList.contains("lens")) this.closePanel(); });
    draggable($("panel"), this, { transform: true, when: () => $("overlay").classList.contains("ask") });
    document.addEventListener("keydown", e => {
      if (this.titleUp()) return;
      if (e.key === "h" || e.key === "H") this.showHint();
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undoLast(); }
    });
    document.addEventListener("fullscreenchange", () => this.fullUi());
    document.addEventListener("webkitfullscreenchange", () => this.fullUi());
    window.addEventListener("resize", () => this.fit());
    this.fit();
    this.setFs(this.fs);
    this.setPanels(this.panels);
    Scenery.init($("mapfx"), () => !document.hidden, $("mapfolk"));
    Scenery.set(this.scenery);
    this.audioUi();
    this.fullUi();
    this.showTitle();
  }

  fit() {
    const s = Math.min(innerWidth / 1600, innerHeight / 900);
    this.scale = s;
    $("stage").style.transform = `translate(${Math.round((innerWidth - 1600 * s) / 2)}px, ${Math.round((innerHeight - 900 * s) / 2)}px) scale(${s})`;
  }

  pname(p) { return p === 0 ? "You" : this.g.players[p].character.name; }

  // Tooltips: anything with a data-tip shows it in a parchment box above itself, soon after the
  // pointer settles on it (the browser's own tooltips are slow, and some viewers never show them).
  wireTips() {
    let cur = null, timer = 0;
    const hide = () => { clearTimeout(timer); cur = null; $("tip").classList.remove("on"); };
    document.addEventListener("pointerover", e => {
      const t = e.target.closest ? e.target.closest("[data-tip]") : null;
      if (t === cur) return;
      hide();
      if (!t || e.pointerType === "touch") return;
      cur = t;
      timer = setTimeout(() => this.showTip(t), 260);
    });
    document.addEventListener("pointerdown", hide);
    window.addEventListener("blur", hide);
  }
  showTip(t) {
    const tip = $("tip");
    if (!document.body.contains(t)) return;
    tip.innerHTML = t.dataset.tip;
    const r = t.getBoundingClientRect(), st = $("stage").getBoundingClientRect(), s = this.scale;
    const x = (r.left + r.width / 2 - st.left) / s, top = (r.top - st.top) / s, bottom = (r.bottom - st.top) / s;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let y = top - h - 10;
    if (y < 8) y = Math.min(900 - h - 8, bottom + 10);
    tip.style.left = Math.max(8, Math.min(1600 - w - 8, x - w / 2)) + "px";
    tip.style.top = y + "px";
    tip.classList.add("on");
  }
  setSort(m) { this.sortMode = m; save("sort", m); this.render(); }

  // ------------------------------------------------------------ the corner buttons
  setFs(l) {
    this.fs = Math.max(0, Math.min(2, l));
    save("fs", this.fs);
    $("stage").classList.remove("fs0", "fs1", "fs2");
    $("stage").classList.add("fs" + this.fs);
    $("btn-fs-down").disabled = this.fs === 0;
    $("btn-fs-up").disabled = this.fs === 2;
    $("btn-fs-down").title = `Smaller text (now ${FS_NAMES[this.fs]})`;
    $("btn-fs-up").title = `Bigger text (now ${FS_NAMES[this.fs]})`;
    if (this.tut) this.tut.place();
    if (this.g) this.renderNotice(this.view || this.g);
  }

  // How see-through the frames over the map are: clear, tinted or dark.
  setPanels(v) {
    this.panels = ["clear", "tinted", "dark"].includes(v) ? v : "tinted";
    save("panels", this.panels);
    $("stage").classList.remove("panels-clear", "panels-tinted", "panels-dark");
    $("stage").classList.add("panels-" + this.panels);
  }

  // Volume sliders for the music and the effects: on the start screen, and under the music button.
  volRows() {
    const row = (k, label) => `<div class="mx-row"><span>${label}</span><input type="range" class="vol" data-k="${k}" min="0" max="100" step="1" aria-label="${label} volume"><b class="vol-v" data-k="${k}"></b></div>`;
    return row("music", "Music") + row("sfx", "Effects") + row("amb", "Town");
  }
  wireVols(root) {
    root.querySelectorAll("input.vol").forEach(inp => {
      const k = inp.dataset.k;
      inp.value = Math.round(100 * (k === "music" ? (Music.on ? Music.volume : 0) : k === "amb" ? Ambience.volume : Sfx.volume));
      inp.oninput = () => {
        const v = inp.value / 100;
        if (k === "music") Music.setVolume(v);
        else if (k === "amb") { Music.ensure(); Ambience.setVolume(v); }
        else { Sfx.setVolume(v); Music.ensure(); Sfx.flick(); }
        this.audioUi();
      };
    });
    this.audioUi();
  }
  toggleMixer(show) {
    const m = $("mixer"), open = show == null ? m.classList.contains("hidden") : show;
    if (open === !m.classList.contains("hidden")) return;
    m.classList.toggle("hidden", !open);
    if (open) this.wireVols(m);
  }

  audioUi() {
    const m = $("btn-music"), s = $("btn-sound"), on = Music.on && Music.volume > 0;
    m.innerHTML = on ? ICONS.music : ICONS.musicOff;
    m.title = on ? `Music: ${Math.round(Music.volume * 100)}% (click for volume)` : "Music: off (click for volume)";
    const lvl = k => (k === "music" ? (on ? Music.volume : 0) : k === "amb" ? Ambience.volume : Sfx.volume);
    document.querySelectorAll("b.vol-v").forEach(b => { const v = lvl(b.dataset.k); b.textContent = v ? Math.round(v * 100) + "%" : "off"; });
    document.querySelectorAll("input.vol").forEach(i => { if (document.activeElement !== i) i.value = Math.round(100 * lvl(i.dataset.k)); });
    m.classList.toggle("muted", !on || !Music.sound);
    s.innerHTML = Music.sound ? ICONS.sound : ICONS.muted;
    s.title = Music.sound ? "Sound: on" : "Sound: off";
    s.classList.toggle("muted", !Music.sound);
  }

  fullEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  toggleFull() {
    try {
      const root = document.documentElement;
      const p = this.fullEl() ? (document.exitFullscreen || document.webkitExitFullscreen).call(document) : (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignore */ }
  }
  fullUi() {
    const b = $("btn-full");
    if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) { b.style.display = "none"; return; }
    const on = !!this.fullEl();
    b.innerHTML = on ? ICONS.exitFull : ICONS.full;
    b.title = on ? "Leave fullscreen" : "Fullscreen";
    [60, 300].forEach(ms => setTimeout(() => this.fit(), ms));
  }

  // ------------------------------------------------------------ panels, questions and the lens
  // mode: "" for menus, "lens" for a closer look (click anywhere to close), "ask" for a question you can drag aside
  panel(h, mode = "", cls = "") {
    const P = $("panel");
    P.classList.toggle("narrow", cls === "narrow");
    document.querySelectorAll(".hint-glow").forEach(e => e.remove());
    P.innerHTML = h;
    P.style.transform = "";
    P.classList.toggle("lens-panel", mode === "lens");
    $("overlay").classList.toggle("lens", mode === "lens");
    $("overlay").classList.toggle("ask", mode === "ask");
    $("overlay").classList.remove("hidden");
  }
  closePanel() { $("overlay").classList.add("hidden"); $("overlay").classList.remove("lens", "ask"); }

  // ------------------------------------------------------------ the start screen, a new game, the settings
  // The start screen covers the table. Starting or carrying on a game fills the screen, unless Settings says not to.
  showTitle() {
    this.closePanel();
    this.toggleMixer(false);
    if (!this.g) $("stage").classList.add("idle");
    const live = this.g && !this.g.over, s0 = !live && load("save", null), saved = s0 && s0.v === SAVE_VERSION ? s0 : null;
    const first = live ? `<button class="btn big" id="b-resume">Resume</button>` : saved ? `<button class="btn big" id="b-continue">Continue</button>` : "";
    $("title-menu").innerHTML = `${first}<button class="btn big${first ? " parch" : ""}" id="b-new">New game</button>
      <button class="btn big parch" id="b-tut">Tutorial</button><button class="btn big parch" id="b-settings">Settings</button>
      <div class="t-row"><button class="btn dark" id="b-rules">Rules</button><button class="btn dark" id="b-credits">Credits</button></div>`;
    $("title-foot").innerHTML = `${this.recordLine()}<div>© BugVictim 2026</div>`;
    const go = fn => () => { this.goFull(); this.hideTitle(); fn(); };
    if (live) $("b-resume").onclick = go(() => {});
    if (saved) $("b-continue").onclick = go(() => this.resume(saved));
    $("b-new").onclick = () => this.showSetup(!!(live || saved));
    $("b-tut").onclick = go(() => this.startTutorial());
    $("b-settings").onclick = () => this.showSettings();
    $("b-rules").onclick = () => this.showRules(() => this.closePanel());
    $("b-credits").onclick = () => this.showCredits();
    $("stage").classList.add("titled");
    $("title").classList.remove("hidden");
  }
  hideTitle() { $("title").classList.add("hidden"); $("stage").classList.remove("titled"); }
  titleUp() { return !$("title").classList.contains("hidden"); }
  goFull() {
    if (!this.fullStart || this.fullEl()) return;
    try {
      const r = document.documentElement, p = (r.requestFullscreen || r.webkitRequestFullscreen).call(r);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // A row of choices in a panel; wireSegs makes them work.
  seg(key, vals, labels, cur) {
    return `<span class="seg" data-k="${key}">${vals.map((v, i) => `<button data-v='${JSON.stringify(v)}' class="${cur === v ? "on" : ""}">${labels[i]}</button>`).join("")}</span>`;
  }
  wireSegs() {
    $("panel").querySelectorAll(".seg button").forEach(b => b.onclick = () => {
      const k = b.parentElement.dataset.k, v = JSON.parse(b.dataset.v);
      if (k === "fs") this.setFs(v);
      else if (k === "sound") { Music.setSound(v); this.audioUi(); }
      else if (k === "full") { this.fullStart = v; save("fullstart", v); if (v !== !!this.fullEl()) this.toggleFull(); }
      else if (k === "panels") this.setPanels(v);
      else if (k === "scenery") { this.scenery = v; save("scenery", v); Scenery.set(v); }
      else { this[k] = v; save(k, v); if (k === "speed") SPEED = v; }
      b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    });
  }

  showSetup(ending) {
    this.panel(`<h2>New game</h2>
      <div class="opt"><span>Opponents</span>${this.seg("opponents", [1, 2, 3], ["1", "2", "3"], this.opponents)}</div>
      <div class="opt"><span>Their skill</span>${this.seg("level", ["easy", "hard"], ["Easy", "Hard"], this.level)}</div>
      ${ending ? `<p class="note">A new game ends the one in progress.</p>` : ""}
      <div class="btns"><button class="btn dark" id="b-back">Back</button><button class="btn" id="b-begin">Begin</button></div>`, "", "narrow");
    this.wireSegs();
    $("b-back").onclick = () => this.closePanel();
    $("b-begin").onclick = () => { this.goFull(); this.closePanel(); this.hideTitle(); this.newGame(); };
  }

  showSettings() {
    const canFull = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    this.panel(`<h2>Settings</h2>
      <div class="opt"><span>Text size</span>${this.seg("fs", [0, 1, 2], FS_NAMES, this.fs)}</div>
      <div class="opt"><span>Panels</span>${this.seg("panels", ["clear", "tinted", "dark"], ["Clear", "Tinted", "Dark"], this.panels)}</div>
      <div class="opt"><span>Map</span>${this.seg("scenery", [true, false], ["Animated", "Still"], this.scenery)}</div>
      <div class="vols">${this.volRows()}</div>
      <div class="opt"><span>Sound</span>${this.seg("sound", [true, false], ["On", "Off"], Music.sound)}</div>
      <div class="opt"><span>Speed</span>${this.seg("speed", [1, 0.55], ["Normal", "Fast"], this.speed)}</div>
      ${canFull ? `<div class="opt"><span>Fullscreen</span>${this.seg("full", [true, false], ["On", "Off"], this.fullStart)}</div>` : ""}
      <div class="btns"><button class="btn" id="b-done">Done</button></div>`, "", "narrow");
    this.wireSegs();
    this.wireVols($("panel"));
    $("b-done").onclick = () => this.closePanel();
  }

  // The rules as headings that open one at a time.
  showRules(back) {
    const o = RV_DEFAULTS;
    const sec = (h, b, open) => `<div class="acc${open ? " open" : ""}"><button class="acc-h">${h}</button><div class="acc-b">${b}</div></div>`;
    this.panel(`<h2>How to play</h2>
      ${sec("The goal", `<p>Complete <b>quests</b> for renown. The first to ${o.target} renown ends the game at the end of that round, and the most renown wins.</p>`, true)}
      ${sec("Your turn", `<ol><li><b>Rent:</b> each Charter you own pays you 1 of its resource.</li><li><b>Draw 2 cards</b>, from the deck or the top of the discard pile.</li>
        <li><b>Play cards</b> for <b>stamina</b> ${stTok()}. You start each turn with ${o.freeAP}. You may also cast one spell.</li>
        <li><b>Spend stamina:</b> a step costs 1, to a district next to yours or into the <b>Square</b> in the middle of town, which borders every place. Nowhere is more than two steps away. Each <b>vendor</b> (the Market, Forge, Temple, Library and the card stall) charges 1 stamina for your first purchase there this turn, then 2, then 3. Walk to another vendor to start at 1 again.</li>
        <li><b>Discard a card</b> to end your turn, then hand in one quest.</li></ol>`)}
      ${sec("Melds and Charters", `<ul><li>A <b>meld</b> is a <b>set</b>: 3 or 4 cards of one rank, each a different suit; or a <b>run</b>: 3 or more in a row in one suit.</li>
        <li>Once a set is down, any card of its rank can be laid off on it, a second copy of a suit too. A run takes the next card at either end.</li>
        <li><b>Found</b> a Charter by laying a meld on one on offer: 1 stamina and 1 renown per card, and ${o.shapeAP} stamina more for its preferred shape.</li>
        <li><b>Lay off</b> a card that extends a founded Charter: ${o.layoffAP} stamina on someone else's (its owner gets 1 resource), ${o.ownLayoffAP} on your own.</li>
        <li>A Charter nobody lays off on for ${o.life} rounds <b>lapses</b>, and its cards go back into the deck. A Renew spell keeps it going.</li>
        <li>When the town is crowded, with ${o.crowdLapse} or more Charters founded, they last a round less.</li>
        <li>If the deck and the discard pile both run out, the Charter left alone longest lapses at once, to fill the deck again.</li>
        <li>A <b>Glamour</b> can stand in for one card in a new meld, but that meld earns no shape bonus.</li></ul>`)}
      ${sec("Spells", `<p>One spell a turn, after your draws. Select it and press <b>Cast</b>. A Glamour counts when you meld it.</p>
        <ul>${Object.values(SPELLS).map(s => `<li><b>${s.name}:</b> ${s.text}</li>`).join("")}</ul>`)}
      ${sec("The town", `<ul><li>Market: Gold. Forge: Steel. Temple: Faith. Library: Lore.</li><li>Tavern: take a quest. You can hold ${o.questLimit}. Or pay 1 stamina there for fresh quests on offer.</li><li>Harbour: trade 1 resource for another.</li>
        <li>From anywhere, pay 1 stamina to replace the Charters on offer with fresh ones.</li>
        <li>Each round brings a <b>town event</b>, on the notice at the left of the town. It holds for everyone that round:</li></ul>
        <ul class="events">${EVENTS.map(e => `<li><b>${e.name}:</b> ${e.text}</li>`).join("")}</ul>`)}
      ${sec("Quests and limits", `<ul><li>Hand in one quest a turn, after your discard.</li>
        <li>Completing a quest draws you cards: 1 for a small quest (3 resources or fewer), 2 for one needing 4 or 5, and 3 for one needing 6 or more.</li><li>Your character's favourite kind of quest scores ${o.favourBonus} extra renown.</li>
        <li>A <b>sealed commission</b> waits at the Tavern. What it needs stays hidden until you take it, and it pays about a quarter more.</li>
        <li><b>Sagas</b> (marked <span class="qbadge">Part 1/3</span>) come in three parts. Completing one hands you the next, worth more but of a different kind.</li>
        <li>The quest on offer longest leaves the Tavern at the start of each round.</li>
        <li>Holding ${o.questLimit} quests? Take another at the Tavern by tearing one up.</li>
        <li>At the end of your turn you keep at most ${o.handLimit} cards and ${o.resCap} resources.</li></ul>`)}
      ${sec("Help on the table", `<ul><li>Click any Charter, quest, player or the chronicle to see it in full.</li><li><b>Hint</b> (or the H key) shows what a strong player would do now.</li>
        <li><b>A&minus;</b> and <b>A+</b> change the text size. Drag the tutorial and question boxes out of the way.</li></ul>`)}
      <div class="btns"><button class="btn" id="b-back">Got it</button></div>`);
    $("panel").querySelectorAll(".acc-h").forEach(h => h.onclick = () => {
      const a = h.parentElement, was = a.classList.contains("open");
      $("panel").querySelectorAll(".acc").forEach(x => x.classList.remove("open"));
      if (!was) a.classList.add("open");
    });
    $("b-back").onclick = back;
  }

  showCredits() {
    this.panel(`<h2>Credits</h2>
      <p class="credits">Icons from <b>game-icons.net</b> by Lorc, Delapouite, Faithtoken and Quoting, licensed under CC BY 3.0.</p>
      <p class="credits">Cinzel typeface by Natanael Gama, SIL Open Font License.</p>
      <p class="credits">Music written for the game and played by your browser.</p>
      <p class="credits">© BugVictim 2026</p>
      <div class="btns"><button class="btn" id="b-back">Back</button></div>`);
    $("b-back").onclick = () => this.closePanel();
  }

  // A closer look at a Charter, founded (ch) or on offer (def).
  lensCharter(ch, def) {
    const g = this.view || this.g, d = ch ? ch.def : def, me = g.players[0];
    const rows = [];
    if (ch) rows.push(["charter", `Owner: <b>${ch.owner === 0 ? "you" : g.players[ch.owner].character.name}</b>`]);
    else rows.push(["charter", "<b>On offer.</b> Found it with any meld: 1 stamina and 1 renown a card."]);
    rows.push([RESKEY[d.res], `Its owner gets <b>1 ${RES[d.res]}</b> each turn.`]);
    rows.push([stTok(), `Prefers <b>${SHAPES[d.shape].text}</b>: +${g.o.shapeAP} stamina when founded that way.`]);
    if (ch) {
      const left = g.roundsLeft(ch), ext = extenders(g, ch), mine = me.hand.filter(c => fits(c, ch));
      rows.push([fadeRing(left, g.life(), "span"), left <= 0 ? "<b>Lapses</b> at its owner's next turn unless someone lays off on it." : `Lapses in <b>${plural(left, "round")}</b> if nobody lays off on it.${g.life() < g.o.life ? " The town is crowded, so Charters last a round less." : ""}`]);
      rows.push(["buy", ext.length ? `Lay off: <b>${ext.join(" or ")}</b>. ${ch.owner === 0 ? `+${g.o.ownLayoffAP} stamina for you.` : `+${g.o.layoffAP} stamina for you, 1 ${RES[d.res]} for its owner.`}` : "Nothing more can be laid off on it."]);
      if (mine.length) rows.push(["quest", `You hold <b>${cardsTxt(mine)}</b>.`]);
    } else {
      const ms = bigMelds(me.hand).slice(0, 3);
      if (ms.length) rows.push(["quest", `Your melds: ${ms.map(m => `<b>${cardsTxt(m)}</b> (${m.length * g.o.meldAP + (shapeHit(d, m) ? g.o.shapeAP : 0)} stamina)`).join("; ")}.`]);
    }
    this.panel(`<div class="lens-head">${tok(d.res)}<h2>${d.name}</h2></div>
      <div class="facts">${rows.map(([k, t]) => `${k.startsWith("<") ? k : ic(k)}<div>${t}</div>`).join("")}</div>
      <div class="lens-cards" id="lens-cards"></div><div class="close-hint">Click anywhere to close</div>`, "lens");
    if (ch) ch.cards.slice().sort((a, b) => a.r - b.r || a.s - b.s).forEach(c => $("lens-cards").appendChild(cardEl(c, "md")));
  }

  lensQuest(q) {
    const g = this.view || this.g, me = g.players[0], fav = q.type === me.character.favour;
    this.panel(`<div class="lens-head"><span class="seal">${ic(TYPEKEY[q.type])}</span><h2>${q.name}</h2></div>
      <div class="facts">${ic(TYPEKEY[q.type])}<div>${/^[AEIOU]/.test(TYPES[q.type]) ? "An" : "A"} <b>${TYPES[q.type]}</b> quest.${fav ? ` Your favourite kind: <b>+${g.o.favourBonus} renown</b>.` : ""}</div>
      ${ic("quest")}<div>Needs ${needTxt(q.need)} &nbsp;·&nbsp; you have ${needTxt(me.res) || "nothing"}</div>
      ${ic("renown")}<div>Worth <b>${q.pts + (fav ? g.o.favourBonus : 0)} renown</b>. Hand it in after your discard.</div>
      ${g.questCards(q) ? `<span class="qcards big">${g.questCards(q)}</span><div>Completing it draws you <b>${plural(g.questCards(q), "card")}</b>.</div>` : ""}
      ${q.saga != null ? `${ic("quest")}<div>Part <b>${q.part + 1} of 3</b> of the saga <i>${SAGAS[q.saga].name}</i>. ${q.part < 2 ? "Completing it hands you the next part." : "The last part."}</div>` : ""}
      ${q.sealed ? `${ic("seal")}<div>A <b>sealed commission</b>, worth more than an open quest of its size.</div>` : ""}</div>
      <div class="close-hint">Click anywhere to close</div>`, "lens");
  }

  lensSealed(q) {
    this.panel(`<div class="lens-head"><span class="seal">${ic("seal")}</span><h2>A sealed commission</h2></div>
      <div class="facts">${ic("renown")}<div>Worth <b>${q.pts} renown</b>, about a quarter more than an open quest needing as much.</div>
      ${ic("quest")}<div>What it needs, and its kind, stay hidden until someone takes it at the Tavern.</div></div>
      <div class="close-hint">Click anywhere to close</div>`, "lens");
  }

  lensPlayer(p) {
    const g = this.view || this.g, pl = g.players[p], owned = g.charters.filter(ch => ch.owner === p);
    this.panel(`<div class="lens-head"><div class="portrait" style="--pc:${PCOL[p]};width:60px;height:60px">${face(pl.character.name)}</div>${ART.has(CHARKEY[pl.character.name]) ? `<div class="lens-arms">${arms(pl.character.name)}</div>` : ""}<h2>${pl.character.name}</h2></div>
      <div class="facts">${ic(TYPEKEY[pl.character.favour])}<div><i>${pl.character.title}</i>. Favours <b>${TYPES[pl.character.favour]}</b> quests.</div>
      ${ic("renown")}<div><b>${g.score(p)} renown</b> · ${plural(pl.hand.length, "card")} in hand · ${plural(pl.done.length, "quest")} done</div>
      ${ic("gold")}<div>${needTxt(pl.res) || "No resources"}</div>
      ${ic("quest")}<div>${pl.quests.length ? pl.quests.map(q => `<b>${q.name}</b>${q.saga != null ? ` <span class="qbadge">Part ${q.part + 1}/3</span>` : ""} ${needTxt(q.need)}`).join("<br>") : "No quests"}</div>
      ${ic("charter")}<div>${owned.length ? owned.map(ch => `<b>${ch.def.name}</b>`).join(", ") : "No Charters"}</div></div>
      <div class="close-hint">Click anywhere to close</div>`, "lens");
  }

  lensLog() {
    if (!this.g) return;
    this.panel(`<h2>Chronicle</h2><div class="loglist">${this.lines.map(l => `<div>${l}</div>`).join("")}</div><div class="close-hint">Click anywhere to close</div>`, "lens");
    const L = $("panel").querySelector(".loglist");
    L.scrollTop = L.scrollHeight;
  }

  // ------------------------------------------------------------ starting
  newGame() {
    if (this.tut) this.tut.close();
    this.counted = false;
    const g = new RiverGame({ players: this.opponents + 1 });
    g.setup();
    this.begin(g);
  }

  startTutorial() {
    if (this.tut) this.tut.close();
    this.counted = false;
    const g = tutorialGame();
    this.tut = new Tutorial(this);
    this.begin(g, [null, RiverAI.greedy()]);
  }

  // Save the game at the start of each of your turns (never the tutorial); a refresh carries on from there.
  saveGame() {
    const g = this.g;
    if (!g || this.tut || g.over) return;
    const data = { v: SAVE_VERSION, level: this.level, lines: this.lines.slice(-150), g: {} };
    for (const k of SAVE_KEYS) data.g[k] = g[k];
    save("save", data);
  }
  resume(data) {
    if (this.tut) this.tut.close();
    const g = Object.create(RiverGame.prototype);
    Object.assign(g, data.g);
    g.rnd = Math.random;
    // a game saved before something was added to the rules carries on without it
    g.o = Object.assign({}, RV_DEFAULTS, g.o);
    deckShape(g.o);
    if (!g.sealedDeck) g.sealedDeck = [];
    if (!g.eventDeck) { g.eventDeck = []; g.o.events = false; }
    if (g.event === undefined) g.event = null;
    this.level = data.level || this.level;
    this.begin(g, null, data.lines);
  }

  begin(g, ais = null, lines = null) {
    $("stage").classList.remove("idle");
    this.g = g;
    PCOL = g.players.map(pl => CHAR_COL[pl.character.name]);
    PKEY = g.players.map(pl => CHARKEY[pl.character.name]);
    this.ais = ais || [null].concat(g.players.slice(1).map(() => (this.level === "hard" ? RiverAI.planner({ worlds: 8 }) : RiverAI.greedy())));
    this.lines = lines ? lines.slice() : [];
    this.events = [];
    this.aiSays = null;
    this.shownEvent = null;
    this.sel.clear();
    this.fresh.clear();
    this.handEls.forEach(e => e.remove());
    this.handEls.clear();
    this.fx = noFx();
    this.view = null;
    this.playing = false;   // a game still playing back notices it has been replaced and stops
    this.clearHint();
    this.watch(g);
    const me = g.players[0];
    if (lines) this.log(`<span class="faint">The game carries on from the start of your turn in round ${g.round}.</span>`);
    else {
      this.log(`You are <b>${me.character.name}</b>, ${me.character.title}. You favour ${TYPES[me.character.favour]} quests.`);
      if (g.event) this.log(`<b>Round 1.</b> Town event: <b>${g.event.name}</b>. ${g.event.text}`);
    }
    this.nextTurn();
  }

  log(t) { this.lines.push(t); if (this.lines.length > 300) this.lines.shift(); }

  // Record every move made on the real game: a short description and a snapshot.
  watch(g) {
    const app = this;
    const N = p => `<b>${app.pname(p)}</b>`;
    const whose = p => (p === 0 ? "your" : app.pname(p) + "'s");
    const wrap = (fn, describe) => {
      const orig = RiverGame.prototype[fn];
      g[fn] = function (...a) {
        const pre = { turn: g.turn, ended: g.endTriggered, ap: g.t ? g.t.ap : 0, pl: g.players.map(x => ({ res: x.res.slice(), hand: x.hand.slice(), quests: x.quests.slice(), pos: x.pos })), charters: g.charters.map(ch => ({ id: ch.id, owner: ch.owner, def: ch.def, cards: ch.cards.slice() })) };
        const r = orig.apply(g, a);
        const texts = [].concat(describe(pre, a, r) || []);
        for (const ch of g.starved || []) texts.push(`<span class="faint">The deck ran out: ${whose(ch.owner)} <i>${ch.def.name}</i> lapsed, and its cards were shuffled in.</span>`);
        g.starved = null;
        if (app.g === g) app.events.push({ texts, snap: g.clone(), fn, p: pre.turn, args: a, r, pre, faded: (g.lastFaded || []).slice(), next: g.turn,
          expired: fn === "endTurn" ? g.lastExpired : null, nextPart: fn === "handIn" && r ? g.lastNext : null });
        return r;
      };
    };
    wrap("draw", (pre, [p, from], c) => (!c ? [] : from === "discard" ? `${N(p)} took ${cardTxt(c)} from the discard pile.` : p === 0 ? `${N(0)} drew ${cardTxt(c)}.` : `${N(p)} drew a card.`));
    wrap("found", (pre, [p], r) => `${N(p)} founded the <i>${r.ch.def.name}</i>${r.ch.cards.some(c => c.spell) ? " with a Glamour" : ""}: +${r.ch.cards.length * g.o.meldAP + (r.shapeHit ? g.o.shapeAP : 0)} stamina, +${r.ch.cards.length * g.o.meldRenown} renown.`);
    wrap("layoff", (pre, [p, id, chId]) => {
      const c = pre.pl[p].hand.find(x => x.id === id), ch = pre.charters.find(x => x.id === chId);
      if (ch.owner === p) return `${N(p)} laid ${cardTxt(c)} on ${p === 0 ? "your" : "their"} own <i>${ch.def.name}</i>: +${g.o.ownLayoffAP} stamina.`;
      return `${N(p)} laid ${cardTxt(c)} on ${whose(ch.owner)} <i>${ch.def.name}</i>: +${g.o.layoffAP} stamina, and 1 ${RES[ch.def.res]} for ${ch.owner === 0 ? "you" : app.pname(ch.owner)}.`;
    });
    wrap("cast", (pre, [p, id, arg], got) => {
      const k = pre.pl[p].hand.find(x => x.id === id).spell, nm = `<b>${SPELLS[k].name}</b>`;
      if (k === "blink") return `${N(p)} cast ${nm} and appeared at the ${PLACES[arg]}.`;
      if (k === "scry") return `${N(p)} cast ${nm}: ${p === 0 ? `drew ${got.map(cardTxt).join(" and ")}` : "two cards"}.`;
      if (k === "recall") return `${N(p)} cast ${nm} and took ${cardTxt(got[0])} from the discard pile.`;
      if (k === "haggle") return `${N(p)} cast ${nm}: prices start again.`;
      return `${N(p)} cast ${nm}: the <i>${pre.charters.find(x => x.id === arg).def.name}</i> is renewed.`;
    });
    wrap("buy", (pre, [p, from], c) => (from === "discard" && c ? `${N(p)} bought ${cardTxt(c)} from the discard pile.` : p === 0 && c ? `${N(0)} bought ${cardTxt(c)}.` : `${N(p)} bought a card.`));
    wrap("move", (pre, [p, dest]) => `${N(p)} walked to the ${PLACES[dest]}.`);
    wrap("refreshQuests", (pre, [p]) => `${N(p)} paid 1 stamina for fresh quests at the Tavern.`);
    wrap("refreshCharters", (pre, [p]) => `${N(p)} paid 1 stamina for fresh Charters on offer.`);
    wrap("work", (pre, [p, arg]) => {
      const sp = pre.pl[p].pos, pl = g.players[p];
      if (PRODUCES[sp] >= 0) return `${N(p)} worked the ${PLACES[sp]}: +1 ${RES[PRODUCES[sp]]}.`;
      if (sp === TAVERN) {
        const before = new Set(pre.pl[p].quests.map(q => q.id)), took = pl.quests.find(q => !before.has(q.id)), torn = pre.pl[p].quests.find(q => !pl.quests.includes(q));
        return `${N(p)} ${torn ? `tore up <i>${torn.name}</i> and ` : ""}took ${took.sealed ? "the sealed commission" : "the quest"} <i>${took.name}</i>.`;
      }
      return `${N(p)} traded ${RES[arg[0]]} for ${RES[arg[1]]}.`;
    });
    wrap("discardCard", (pre, [p, id]) => `${N(p)} discarded ${cardTxt(pre.pl[p].hand.find(x => x.id === id))}.`);
    wrap("handIn", (pre, [p, qi], ok) => {
      if (!ok) return [];
      const q = pre.pl[p].quests[qi], fav = q.type === g.players[p].character.favour;
      const drew = g.lastDrawn || [], got = !drew.length ? "" : p === 0 ? `, and drew ${drew.map(cardTxt).join(" and ")}` : `, and drew ${plural(drew.length, "card")}`;
      const out = [`${N(p)} completed <i>${q.name}</i>: +${q.pts + (fav ? g.o.favourBonus : 0)} renown${got}.${g.lastNext ? ` <i>${SAGAS[q.saga].name}</i> continues: <i>${g.lastNext.name}</i>.` : ""}`];
      if (g.endTriggered && !pre.ended) out.push(`<b class="final">${p === 0 ? "You have" : app.pname(p) + " has"} ${g.score(p)} renown: this is the final round.</b>`);
      return out;
    });
    wrap("endTurn", (pre, [p]) => {
      const out = [];
      const lost = pre.pl[p].res.reduce((a, b) => a + b, 0) - g.players[p].res.reduce((a, b) => a + b, 0);
      if (lost > 0) out.push(`<span class="faint">${app.pname(p)} gave up ${plural(lost, "resource")} over the limit.</span>`);
      if (g.over) return out;
      if (g.newEvent) out.push(`<b>Round ${g.round}.</b> Town event: <b>${g.newEvent.name}</b>. ${g.newEvent.text}`);
      if (g.lastExpired) out.push(`<span class="faint"><i>${g.lastExpired.name}</i> left the Tavern.</span>`);
      for (const ch of g.lastFaded || []) out.push(`<span class="faint">${whose(ch.owner).replace(/^y/, "Y")} <i>${ch.def.name}</i> lapsed.</span>`);
      const rent = (g.lastRent || []).map((n, r) => (n ? `+${n} ${RES[r]}` : "")).filter(Boolean);
      if (rent.length) out.push(`<span class="faint">${whose(g.turn).replace(/^y/, "Y")} Charters paid ${rent.join(", ")}.</span>`);
      return out;
    });
  }

  // ------------------------------------------------------------ moving pieces
  q(sel) { return document.querySelector(sel); }
  // Where an element sits on the stage: its centre, its own size and its tilt.
  box(el) {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect(), st = $("stage").getBoundingClientRect(), s = this.scale;
    if (!r.width && !r.height) return null;
    return { cx: (r.left + r.width / 2 - st.left) / s, cy: (r.top + r.height / 2 - st.top) / s, w: el.offsetWidth || r.width / s, h: el.offsetHeight || r.height / s, rot: parseFloat(el.style.getPropertyValue("--rot")) || 0 };
  }
  handCard(id) { return this.handEls.get(id) || null; }
  seat(p) { return this.q(`#opps .seat[data-p="${p}"]`); }
  seatAnchor(p) { return this.q(`#opps .seat[data-p="${p}"] .anchor`); }
  fromHand(p, id) { return this.box(p === 0 ? this.handCard(id) : this.seatAnchor(p)); }
  resTok(p, r) { return p === 0 ? this.q(`#me-res .r[data-r="${r}"] .tok`) : this.q(`#opps .seat[data-p="${p}"] .res [data-r="${r}"] .tok`); }
  renownIc(p) { return p === 0 ? this.q("#me-renown .ic") : this.q(`#opps .seat[data-p="${p}"] .renown .ic`); }
  pop(el) { if (!el) return; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }

  // A glow laid over an element for a moment (a new Charter, a hint).
  glow(el, cls, ms, pad = 0) {
    const b = this.box(el);
    if (!b) return;
    const f = document.createElement("div");
    f.className = cls;
    Object.assign(f.style, { left: (b.cx - b.w / 2 - pad) + "px", top: (b.cy - b.h / 2 - pad) + "px", width: (b.w + 2 * pad) + "px", height: (b.h + 2 * pad) + "px" });
    if (b.rot) f.style.transform = `rotate(${b.rot}deg)`;
    $("stage").appendChild(f);
    setTimeout(() => f.remove(), ms);
  }

  // Fly a piece across the stage: from a box to an element (or a box), optionally pausing on the way.
  async fly(f) {
    if (f.delay) await wait(f.delay * SPEED);
    const from = f.from || (f.fromFn && f.fromFn());
    const toEl = f.toFn ? f.toFn() : null;
    const to = f.to || this.box(toEl);
    let kind = "";
    if (from && to) {
      const el = f.make(), ms = (f.ms || FLY) * SPEED;
      kind = el.classList.contains("tok") ? "tok" : el.classList.contains("pawn") ? "pawn" : "card";
      if (kind === "card") Sfx.slide();
      el.classList.add("flier");
      el.style.transition = "none";
      $("stage").appendChild(el);
      const nw = el.offsetWidth || 1, nh = el.offsetHeight || 1;
      const sc = b => Math.min(b.w / nw, b.h / nh);
      el.style.left = (from.cx - nw / 2) + "px";
      el.style.top = (from.cy - nh / 2) + "px";
      el.style.transform = `translate(0px, 0px) rotate(${from.rot || 0}deg) scale(${sc(from)})`;
      void el.offsetWidth;
      const leg = (b, t) => {
        el.style.transition = `transform ${t}ms cubic-bezier(.4, .1, .3, 1)`;
        el.style.transform = `translate(${b.cx - from.cx}px, ${b.cy - from.cy}px) rotate(${b.rot || 0}deg) scale(${sc(b)})`;
      };
      if (f.via) { leg(f.via, ms); await wait(ms + (f.hold || 800) * SPEED); }
      leg(to, ms);
      await wait(ms + 20);
      el.remove();
      if (kind === "tok") Sfx.clink(); else if (kind === "pawn") Sfx.step(); else if (!f.quiet) Sfx.flick();
    }
    if (toEl) toEl.classList.remove("hidden-for-flight");
    if (f.land) f.land();
  }

  // What moves for an event. Sources are read from the table as it is now;
  // destinations are found after the table is redrawn.
  plan(e) {
    const p = e.p, fx = noFx(), F = [];
    const deckBox = () => this.box(this.q("#deck .slot")), discBox = () => this.box(this.q("#discard .slot"));
    const token = (who, r, from, opts = {}) => {
      fx.pend.push({ p: who, r });
      F.push(Object.assign({ make: () => tokEl(r), from, toFn: () => this.resTok(who, r), ms: 420,
        land: () => { const i = this.fx.pend.findIndex(x => x.p === who && x.r === r); if (i >= 0) this.fx.pend.splice(i, 1); this.updateCounts(); this.pop(this.resTok(who, r)); } }, opts));
    };
    // a card arriving in p's hand: face up in yours, face down in theirs unless it came off the discard pile
    const arrive = (x, open, from, delay = 0) => {
      if (p === 0) { fx.hide.add(x.id); F.push({ make: () => cardEl(x), from, toFn: () => this.handCard(x.id), delay }); return; }
      fx.fanIn[p] = (fx.fanIn[p] || 0) + 1;
      F.push({ make: () => (open ? cardEl(x) : backEl()), from, toFn: () => this.seatAnchor(p), delay, land: () => { this.fx.fanIn[p]--; this.renderOpps(this.view || this.g); this.updateCounts(); } });
    };
    const toDiscard = c => { fx.discard = true; F.push({ make: () => cardEl(c), from: this.fromHand(p, c.id), toFn: () => this.q("#discard .top") }); };
    switch (e.fn) {
      case "draw": case "buy": {
        if (!e.r) break;
        const open = e.args[1] === "discard";
        arrive(e.r, open, open ? discBox() : deckBox());
        break;
      }
      case "found": {
        const ch = e.r.ch, tile = this.q(`.offer[data-i="${e.args[2]}"]`);
        fx.charter = ch.id;
        fx.flash = ch.id;
        if (tile) F.push({ make: () => { const t = tile.cloneNode(true); t.classList.remove("can", "hit"); t.querySelectorAll(".gain").forEach(x => x.remove()); return t; }, from: this.box(tile), toFn: () => this.q(`.charter[data-id="${ch.id}"]`), ms: 300, quiet: true, land: () => Sfx.seal() });
        else Sfx.seal();
        ch.cards.forEach((c, k) => {
          fx.hide.add(c.id);
          F.push({ make: () => cardEl(c), from: this.fromHand(p, c.id), toFn: () => this.q(`.charter[data-id="${ch.id}"] .card[data-id="${c.id}"]`), delay: 120 + k * 80 });
        });
        break;
      }
      case "layoff": {
        const [, id, chId] = e.args;
        const c = e.pre.pl[p].hand.find(x => x.id === id), ch = e.pre.charters.find(x => x.id === chId);
        fx.hide.add(id);
        F.push({ make: () => cardEl(c), from: this.fromHand(p, id), toFn: () => this.q(`.charter[data-id="${chId}"] .card[data-id="${id}"]`) });
        if (ch.owner !== p) token(ch.owner, ch.def.res, null, { fromFn: () => this.box(this.q(`.charter[data-id="${chId}"] .yield .tok`)), delay: 240 });
        break;
      }
      case "cast": {
        const [, id, arg] = e.args, c = e.pre.pl[p].hand.find(x => x.id === id), k = c.spell;
        toDiscard(c);
        Sfx.spell();
        if (k === "blink") {
          Sfx.whoosh();
          fx.pawn = p;
          F.push({ make: () => pawnEl(p), from: this.box(this.q(`.place[data-sp="${e.pre.pl[p].pos}"] .pawn[data-p="${p}"]`)), toFn: () => this.q(`.place[data-sp="${arg}"] .pawn[data-p="${p}"]`), ms: 560, delay: 120, quiet: true });
        } else if (k === "scry" || k === "recall") {
          const before = new Set(e.pre.pl[p].hand.map(x => x.id));
          e.snap.players[p].hand.filter(x => !before.has(x.id)).forEach((x, n) => arrive(x, k === "recall", k === "recall" ? discBox() : deckBox(), 180 + n * 100));
        } else if (k === "renew") fx.flash = arg;
        break;
      }
      case "discardCard":
        toDiscard(e.pre.pl[p].hand.find(x => x.id === e.args[1]));
        break;
      case "refreshQuests": fx.turnover = "qrow"; Sfx.riffle(); break;
      case "refreshCharters": fx.turnover = "offer"; Sfx.riffle(); break;
      case "move":
        fx.pawn = p;
        F.push({ make: () => pawnEl(p), from: this.box(this.q(`.place[data-sp="${e.pre.pl[p].pos}"] .pawn[data-p="${p}"]`)), toFn: () => this.q(`.place[data-sp="${e.args[1]}"] .pawn[data-p="${p}"]`), ms: 280 });
        break;
      case "work": {
        const sp = e.pre.pl[p].pos, m = this.box(this.q(`.place[data-sp="${sp}"] .medal`));
        if (sp === TAVERN) (e.args[1] === "sealed" ? Sfx.crack() : Sfx.mug());
        else ({ [MARKET]: () => Sfx.coins(), [FORGE]: () => Sfx.anvil(), [TEMPLE]: () => Sfx.templeBell(), [LIBRARY]: () => Sfx.page(), [HARBOUR]: () => Sfx.harbour() })[sp]();
        const at = m && { cx: m.cx, cy: m.cy, w: 30, h: 30 };
        if (PRODUCES[sp] >= 0) token(p, PRODUCES[sp], at);
        else if (sp === HARBOUR) {
          const [give, get] = e.args[1];
          F.push({ make: () => tokEl(give), from: this.box(this.resTok(p, give)), to: at, ms: 400 });
          token(p, get, at, { delay: 380 });
        } else if (sp === TAVERN) {
          const arg = e.args[1], qs = e.snap.players[p].quests, qq = qs[qs.length - 1];
          const src = arg === "sealed" ? this.q("#qsealed .quest") : arg != null && arg >= 0 ? this.q("#qrow").children[arg] : this.q("#qmore");
          fx.quest = p;
          F.push({ make: () => this.questEl(qq, null, "strip"), from: this.box(src), toFn: () => (p === 0 ? [...this.q("#my-quests").querySelectorAll(".quest")].pop() : this.q(`#opps .seat[data-p="${p}"] .qs`).lastElementChild), ms: 460 });
          // a quest torn up to make room goes back to the Tavern
          const ti = e.pre.pl[p].quests.findIndex(q => !qs.includes(q));
          if (ti >= 0 && p === 0) F.push({ make: () => this.questEl(e.pre.pl[p].quests[ti], null, "strip"), from: this.box(this.q("#my-quests").querySelectorAll(".quest")[ti]), toFn: () => this.q("#qmore"), ms: 420, quiet: true });
        }
        break;
      }
      case "handIn": {
        if (!e.r) break;
        const qi = e.args[1], q = e.pre.pl[p].quests[qi];
        fx.renown[p] = q.pts + (q.type === e.snap.players[p].character.favour ? e.snap.o.favourBonus : 0);
        const land = () => { this.fx.renown[p] = 0; this.updateCounts(); this.pop(this.renownIc(p)); Sfx.fanfare(); };
        if (p === 0) {
          F.push({ make: () => this.questEl(q, null, "strip"), from: this.box(this.q("#my-quests").querySelectorAll(".quest")[qi]), toFn: () => this.renownIc(0), ms: 520, land, quiet: true });
        } else {
          const s = this.box(this.seat(p)), icon = this.q(`#opps .seat[data-p="${p}"] .qs`).children[qi];
          F.push({ make: () => { const d = this.questEl(q, null, "card-q"); d.classList.add("show"); return d; }, from: this.box(icon) || s, via: s && { cx: s.cx, cy: s.cy + 160, w: 184, h: 102 }, hold: 750, toFn: () => this.renownIc(p), ms: 400, land, quiet: true });
        }
        // the cards it draws come off the deck
        const had = new Set(e.pre.pl[p].hand.map(x => x.id));
        e.snap.players[p].hand.filter(x => !had.has(x.id)).forEach((x, n) => arrive(x, false, deckBox(), (p === 0 ? 520 : 1300) + n * 140));
        // the last round begins
        if (e.snap.endTriggered && !e.pre.ended) setTimeout(() => Sfx.finalRound(), 1100 * SPEED);
        // a saga: the next part arrives, shown for a moment on its way
        if (e.nextPart) {
          setTimeout(() => Sfx.horn(), ((p === 0 ? 560 : 1600) + 120) * SPEED);
          fx.quest = p;
          const at = p === 0 ? { cx: 1370, cy: 560, w: 184, h: 102 } : (() => { const s = this.box(this.seat(p)); return s && { cx: s.cx, cy: s.cy + 160, w: 184, h: 102 }; })();
          F.push({ make: () => { const d = this.questEl(e.nextPart, null, "card-q"); d.classList.add("show", "next"); return d; }, from: at && { cx: at.cx, cy: at.cy + 30, w: 30, h: 17 }, via: at, hold: 900,
            toFn: () => (p === 0 ? [...this.q("#my-quests").querySelectorAll(".quest")].pop() : this.q(`#opps .seat[data-p="${p}"] .qs`).lastElementChild), ms: 420, delay: p === 0 ? 560 : 1600, quiet: true });
        }
        break;
      }
      case "endTurn": {
        if (e.faded.length) Sfx.riffle();
        const sum = r => r.reduce((a, b) => a + b, 0);
        if (p === 0 && (sum(e.snap.players[0].res) < sum(e.pre.pl[0].res) || e.snap.players[0].hand.length < e.pre.pl[0].hand.length)) Sfx.drop();
        // the quest longest on offer leaves the Tavern
        if (e.expired && this.q("#qrow").children[0]) { const src = this.q("#qrow").children[0]; F.push({ make: () => this.questEl(e.expired, null, "strip"), from: this.box(src), toFn: () => this.q("#qmore"), ms: 520, quiet: true }); }
        for (const ch of e.faded) {
          const tile = this.q(`.charter[data-id="${ch.id}"]`);
          if (tile) ch.cards.forEach((c, k) => F.push({ make: () => cardEl(c), from: this.box(tile.querySelector(`.card[data-id="${c.id}"]`)), toFn: () => this.q("#deck .slot"), delay: k * 60, quiet: true }));
        }
        if (!e.snap.over) {
          const nx = e.next;
          e.snap.charters.filter(ch => ch.owner === nx).forEach((ch, k) => token(nx, ch.def.res, null, { fromFn: () => this.box(this.q(`.charter[data-id="${ch.id}"] .yield .tok`)), delay: 200 + k * 110 }));
        }
        break;
      }
    }
    return { F, fx };
  }

  // Play queued events one at a time, with their moving pieces.
  async playEvents() {
    if (this.playing) return;
    this.playing = true;
    const g = this.g;
    while (this.events.length) {
      const e = this.events.shift();
      Sfx.dim = e.p !== 0;
      e.texts.forEach(t => this.log(t));
      if (e.p !== 0 && e.texts.length && !/^<span class="faint/.test(e.texts[0])) this.aiSays = e.texts[0];
      const { F, fx } = this.plan(e);
      this.fx = fx;
      this.view = e.snap;
      this.render();
      await Promise.all(F.map(f => this.fly(f)));
      if (this.g !== g) return;
      this.fx = noFx();
      this.render();
      if (fx.flash >= 0) { this.glow(this.q(`.charter[data-id="${fx.flash}"]`), "flash", 1500); if (e.fn !== "found") Sfx.chime(); }
      if (fx.turnover) { const el = $(fx.turnover); el.classList.remove("turnover"); void el.offsetWidth; el.classList.add("turnover"); await wait(450 * SPEED); }
      if (e.p === 0 && e.snap.turn === 0 && e.snap.t) {
        if (e.snap.t.ap > e.pre.ap) { this.bumpAP(); Sfx.sparkle(); }
        else if (e.snap.t.ap < e.pre.ap && e.fn !== "discardCard") Sfx.spend();
      }
      if (e.p !== 0) await wait((e.fn === "move" || e.fn === "work" ? 40 : 140) * SPEED);
      if (this.g !== g) return;
    }
    Sfx.dim = false;
    this.view = null;
    this.playing = false;
    this.render();
  }

  async nextTurn() {
    const g = this.g;
    await this.playEvents();
    if (this.g !== g) return;
    while (!g.over && g.turn !== 0) {
      this.mode = "ai";
      this.aiTurn = g.turn;
      this.render();
      await wait(250 * SPEED);
      if (this.g !== g) return;
      this.ais[g.turn](g, g.turn);
      await this.playEvents();
      if (this.g !== g) return;
    }
    if (g.over) return this.gameOver();
    this.mode = "draw";
    this.aiSays = null;
    this.undo = [];
    this.sel.clear();
    this.saveGame();
    this.render();
    Sfx.turn();
    if (g.charters.some(ch => ch.owner === 0 && g.roundsLeft(ch) <= 1)) setTimeout(() => Sfx.warn(), 550);
  }

  // ------------------------------------------------------------ your turn
  mine() { return this.g && !this.g.over && this.g.turn === 0 && !this.view && !this.playing && this.mode !== "ai"; }
  selCards() { const h = this.g.players[0].hand; return [...this.sel].map(id => h.find(c => c.id === id)).filter(Boolean); }
  allow(kind, info) { if (!this.tut) return true; if (this.tut.allows(kind, info)) return true; this.tut.nudge(); Sfx.dud(); return false; }
  bumpAP() { const e = $("me-ap"); e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }
  // undoable: the move showed you nothing new (no card off the deck, no quest turned over)
  async act(fn, undoable = false) {
    this.clearHint();
    this.targeting = null;
    if (undoable && !this.tut) this.undo.push(this.snapshot()); else this.undo = [];
    fn();
    this.sel.clear();
    await this.playEvents();
  }
  snapshot() {
    const g = this.g, x = g.clone(), s = {};
    for (const k of SAVE_KEYS) s[k] = x[k];
    s.stats = g.stats ? JSON.parse(JSON.stringify(g.stats)) : null;
    return { g: s, lines: this.lines.slice(), mode: this.mode, fresh: new Set(this.fresh) };
  }
  undoLast() {
    if (!this.undo.length || !this.mine() || !(this.mode === "play" || this.mode === "draw")) return;
    const s = this.undo.pop();
    Object.assign(this.g, s.g);
    this.lines = s.lines;
    this.mode = s.mode;
    this.fresh = s.fresh;
    this.sel.clear();
    this.clearHint();
    this.log(`<span class="faint">You took that back.</span>`);
    Sfx.rewind();
    this.render();
  }

  clickPile(src) {
    if (!this.mine()) return;
    const g = this.g;
    if (this.mode === "draw") {
      if (src === "discard" && !g.discard.length) return;
      if (!this.allow("draw", src)) return;
      return this.act(() => { const c = g.draw(0, src); if (c) this.fresh.add(c.id); if (g.t.drawsLeft <= 0) this.mode = "play"; }, src === "discard");
    }
    if (this.mode === "play" && !g.canBuy(0)) return Sfx.dud();
    if (this.mode === "play" && g.canBuy(0)) {
      if (src === "discard" && !g.discard.length) return;
      if (!this.allow("buy", src)) return;
      this.act(() => { const c = g.buy(0, src); if (c) this.fresh.add(c.id); }, src === "discard");
    }
  }

  clickCard(c) {
    if (!this.mine()) return;
    this.clearHint();
    this.targeting = null;
    if (this.mode === "trim") {
      this.drops.has(c.id) ? this.drops.delete(c.id) : this.drops.add(c.id);
      Sfx.tick();
      const need = this.g.players[0].hand.length - this.g.o.handLimit;
      if (this.drops.size >= need && this.onTrim) { const f = this.onTrim; this.onTrim = null; f(); return; }
      return this.render();
    }
    if (this.mode !== "play") return;
    this.sel.has(c.id) ? this.sel.delete(c.id) : this.sel.add(c.id);
    Sfx.tick();
    this.render();
  }

  // A tile is a target when your selection can be played on it; otherwise clicking opens it up.
  clickOffer(di) {
    const g = this.g, cs = this.mine() ? this.selCards() : [];
    const def = (this.view || g).display[di];
    if (!def) return;
    if (this.mode !== "play" || !this.mine() || !isMeld(cs) || !g.canPlay(0, cs.length)) return this.lensCharter(null, def);
    if (!this.allow("found", di)) return;
    this.act(() => g.found(0, cs.map(c => c.id), di), true);
  }

  clickCharter(ch) {
    const g = this.g, cs = this.mine() ? this.selCards() : [];
    if (this.targeting && this.targeting.kind === "renew" && this.mine()) return ch.owner === 0 ? this.castAt(ch.id) : null;
    const live = g.charters.find(x => x.id === ch.id);
    if (this.mode !== "play" || !this.mine() || cs.length !== 1 || !live || !fits(cs[0], live) || !g.canPlay(0, 1)) return this.lensCharter(ch);
    if (!this.allow("layoff", ch.owner)) return;
    this.act(() => g.layoff(0, cs[0].id, ch.id), true);
  }

  refreshQuests() {
    const g = this.g;
    if (!this.mine() || this.mode !== "play" || !g.canRefreshQuests(0) || !this.allow("refresh")) return;
    this.act(() => g.refreshQuests(0));
  }
  refreshCharters() {
    const g = this.g;
    if (!this.mine() || this.mode !== "play" || !g.canRefreshCharters(0) || !this.allow("refresh")) return;
    this.act(() => g.refreshCharters(0));
  }

  clickPlace(sp) {
    const g = this.g, me = g.players[0];
    if (this.targeting && this.targeting.kind === "blink" && this.mine()) {
      if (sp === me.pos || !this.allow("blink-to", sp)) return;
      return this.castAt(sp);
    }
    if (!this.mine() || this.mode !== "play") return;
    if (g.t.ap < 1) return Sfx.dud();
    if (g.neighbours(me.pos).includes(sp)) { if (!g.canMove(0, sp)) return Sfx.dud(); if (!this.allow("move", sp)) return; return this.act(() => g.move(0, sp), true); }
    if (sp !== me.pos || !g.canWork(0)) return Sfx.dud();
    if (!this.allow("work", sp)) return;
    if (PRODUCES[sp] >= 0) return this.act(() => g.work(0), true);
    if (sp === TAVERN) return this.askTavern();
    if (sp === HARBOUR) return this.askHarbour();
  }

  questEl(q, pl, kind = "card-q") {
    const d = document.createElement("div");
    d.className = `quest parchment ${kind}`;
    const fav = pl && q.type === pl.character.favour;
    const badge = q.saga != null ? ` <span class="qbadge" data-tip="<b>A saga, part ${q.part + 1} of 3</b><br>${SAGAS[q.saga].name.replace(/"/g, "&quot;")}. ${q.part < 2 ? "Completing it hands you the next part, worth more." : "The last part."}">Part ${q.part + 1}/3</span>`
      : q.sealed ? ` <span class="qbadge" data-tip="<b>A sealed commission</b><br>It pays more than an open quest, and what it needs is revealed when it's taken.">${ic("seal")}</span>` : "";
    d.innerHTML = `<div class="tname"><span class="seal" title="${TYPES[q.type]}">${ic(TYPEKEY[q.type])}</span>${q.name}${badge}</div>
      <div class="needs">${q.need.map((n, r) => (n ? `<span class="need${pl && pl.res[r] < n ? " short" : ""}">${tok(r)}${n}</span>` : "")).join("")}</div>
      <div class="reward">${this.qcards(q)}${ic("renown")}${q.pts}</div>${fav ? `<div class="fav" title="Your favourite kind: +${this.g.o.favourBonus} renown">★</div>` : ""}`;
    return d;
  }
  // The cards a quest draws when it's completed, as a small card back with the number on it.
  qcards(q) {
    const n = this.g.questCards(q);
    return n ? `<span class="qcards" data-tip="<b>Draws ${plural(n, "card")}</b><br>when you complete it. Bigger quests draw more.">${n}</span>` : "";
  }

  // A sealed commission as it lies at the Tavern: its reward shows, what it needs doesn't.
  sealedEl(q) {
    const d = document.createElement("div");
    d.className = "quest parchment strip sealed";
    d.innerHTML = `<div class="tname"><span class="seal">${ic("seal")}</span>A sealed commission</div><div class="needs"><span class="hidden-needs">what it needs is revealed when it's taken</span></div><div class="reward">${this.qcards(q)}${ic("renown")}${q.pts}</div>`;
    return d;
  }

  askTavern() {
    const g = this.g, me = g.players[0], full = me.quests.length >= g.o.questLimit;
    this.panel(`<h2>The Tavern</h2><p>${full ? `You hold ${g.o.questLimit} quests. To take another, you'll tear one up.` : `Choose a quest. You can hold ${g.o.questLimit}.`}</p><div class="qlist" id="tq"></div><div class="btns"><button class="btn dark" id="b-fresh" ${g.canRefreshQuests(0) && g.t.ap >= 2 ? "" : "disabled"}>Fresh quests ${stCost(1)}</button><button class="btn dark" id="b-x">Cancel</button></div>`, "ask");
    $("b-fresh").onclick = async () => { if (!this.allow("refresh")) return; this.closePanel(); await this.act(() => g.refreshQuests(0)); if (this.g.canWork(0)) this.askTavern(); };
    g.qrow.forEach((q, i) => { const d = this.questEl(q, me, "strip"); d.onclick = () => this.takeQuest(i); $("tq").appendChild(d); });
    if (g.sealedDeck.length) { const d = this.sealedEl(g.sealedDeck[0]); d.onclick = () => this.takeQuest("sealed"); $("tq").appendChild(d); }
    $("b-x").onclick = () => this.closePanel();
  }
  takeQuest(arg) {
    const g = this.g;
    if (g.players[0].quests.length >= g.o.questLimit) return this.askTear(arg);
    this.closePanel();
    this.act(() => g.work(0, arg));
  }
  askTear(arg) {
    const g = this.g, me = g.players[0];
    this.panel(`<h2>Tear up a quest</h2><p>Which quest do you give up for ${arg === "sealed" ? "the sealed commission" : `<i>${g.qrow[arg].name}</i>`}?</p><div class="qlist" id="tq"></div><div class="btns"><button class="btn dark" id="b-x">Back</button></div>`, "ask");
    me.quests.forEach((q, i) => { const d = this.questEl(q, me, "strip"); d.onclick = () => { this.closePanel(); this.act(() => g.work(0, arg, i)); }; $("tq").appendChild(d); });
    $("b-x").onclick = () => this.askTavern();
  }

  askHarbour(give = -1) {
    const me = this.g.players[0];
    this.panel(`<h2>The Harbour</h2><p>${give < 0 ? "Give which resource?" : `Give 1 ${RES[give]} for 1 of:`}</p>
      <div class="choices">${[0, 1, 2, 3].map(r => `<button data-r="${r}" ${(give < 0 ? me.res[r] > 0 : r !== give) ? "" : "disabled"}>${tok(r)} ${RES[r]}${give < 0 ? ` (${me.res[r]})` : ""}</button>`).join("")}</div>
      <div class="btns"><button class="btn dark" id="b-x">Cancel</button></div>`, "ask");
    $("panel").querySelectorAll(".choices button").forEach(b => b.onclick = () => {
      const r = +b.dataset.r;
      if (give < 0) return this.askHarbour(r);
      this.closePanel();
      this.act(() => this.g.work(0, [give, r]), true);
    });
    $("b-x").onclick = () => this.closePanel();
  }

  // Cast the selected spell; Blink, Recall and Renew ask where, which card or which Charter.
  askCast() {
    const g = this.g, cs = this.selCards(), sp = cs[0];
    if (!this.mine() || this.mode !== "play" || cs.length !== 1 || !g.castable(0, sp)) return;
    if (!this.allow("cast", sp.spell)) return;
    const k = sp.spell;
    const go = arg => {
      this.closePanel();
      const before = new Set(g.players[0].hand.map(x => x.id));
      this.act(() => { g.cast(0, sp.id, arg); g.players[0].hand.forEach(x => { if (!before.has(x.id)) this.fresh.add(x.id); }); }, k !== "scry");
    };
    const mine = g.charters.filter(ch => ch.owner === 0);
    if (k === "scry" || k === "haggle" || (k === "renew" && mine.length === 1)) return go(k === "renew" ? mine[0].id : undefined);
    // Blink and Renew are aimed on the table itself: the places, or your Charters, light up to be clicked
    if (k === "blink" || k === "renew") { this.targeting = { kind: k, id: sp.id }; this.render(); return; }
    this.panel(`<h2>Recall</h2><p>Take which card from the discard pile?</p><div class="cards" id="w-pile"></div><div class="btns"><button class="btn dark" id="b-x">Cancel</button></div>`, "ask");
    g.discard.forEach((x, i) => { const e = cardEl(x, "md"); e.onclick = () => go(i); $("w-pile").appendChild(e); });
    $("b-x").onclick = () => this.closePanel();
  }
  // Cast the spell being aimed, at what was clicked.
  castAt(arg) {
    const g = this.g, id = this.targeting.id;
    this.targeting = null;
    this.act(() => g.cast(0, id, arg), true);
  }

  async endMyTurn() {
    const g = this.g, me = g.players[0], cs = this.selCards();
    if (!this.mine() || this.mode !== "play" || cs.length !== 1) return;
    if (!this.allow("end")) return;
    this.mode = "ending";
    await this.act(() => g.discardCard(0, cs[0].id));
    const can = me.quests.map((q, i) => (g.canHandIn(0, i) ? i : -1)).filter(i => i >= 0);
    if (can.length) {
      await new Promise(res => {
        this.panel(`<h2>Hand in a quest</h2><p>You can complete one quest this turn.</p><div class="qlist" id="hq"></div><div class="btns"><button class="btn dark" id="b-no">Not now</button></div>`, "ask");
        for (const i of can) {
          const d = this.questEl(me.quests[i], me, "strip");
          d.onclick = () => {
            this.closePanel();
            const had = new Set(me.hand.map(x => x.id));
            g.handIn(0, i);
            me.hand.forEach(x => { if (!had.has(x.id)) this.fresh.add(x.id); });
            res();
          };
          $("hq").appendChild(d);
        }
        $("b-no").onclick = () => { this.closePanel(); res(); };
      });
      await this.playEvents();
    }
    if (me.hand.length > g.o.handLimit) {
      this.mode = "trim";
      this.drops.clear();
      this.render();
      await new Promise(res => (this.onTrim = res));
      me.hand.sort((a, b) => this.drops.has(a.id) - this.drops.has(b.id));
      this.drops.clear();
    }
    this.fresh.clear();
    g.endTurn(0, RiverAI.needsOf(g, me).pool);
    this.nextTurn();
  }

  // Your games, wins and best score, kept in this browser.
  recordLine() {
    const r = load("record", null);
    return r && r.games ? `<p class="record">Your record: ${plural(r.wins, "win")} from ${plural(r.games, "game")} · best ${r.best} renown</p>` : "";
  }

  gameOver() {
    const g = this.g;
    if (!this.tut && !this.counted) {
      const r = load("record", { games: 0, wins: 0, best: 0 }), mine = g.final(0), top = Math.max(...g.players.map((_, p) => g.final(p)));
      r.games++;
      if (mine === top) r.wins++;
      r.best = Math.max(r.best, mine);
      save("record", r);
      try { localStorage.removeItem("rv_save"); } catch (e) { /* ignore */ }
    }
    this.counted = true;
    (g.final(0) === Math.max(...g.players.map((_, p) => g.final(p))) ? Sfx.victory() : Sfx.defeat());
    const rows = g.players.map((pl, p) => {
      const qp = pl.done.reduce((a, q) => a + q.pts, 0) + (pl.bounty || 0), fav = pl.done.filter(q => q.type === pl.character.favour).length * g.o.favourBonus;
      return { p, pl, qp, mp: pl.renown - qp, fav, total: g.final(p) };
    }).sort((a, b) => b.total - a.total);
    this.panel(`<h2>${rows[0].p === 0 ? "You win!" : this.pname(rows[0].p) + " wins"}</h2>
      <table><tr><th></th><th class="n">Quests</th><th class="n">Charters</th><th class="n">Favoured</th><th class="n">Renown</th></tr>
      ${rows.map(r => `<tr><td><b>${r.p === 0 ? "You" : r.pl.character.name}</b><br><small>${r.pl.character.title}</small></td><td class="n">${r.qp} (${r.pl.done.length})${this.questMarks(r.pl)}</td><td class="n">${r.mp}</td><td class="n">${r.fav}</td><td class="n"><b>${r.total}</b></td></tr>`).join("")}</table>
      ${this.tut ? "" : this.recordLine()}
      <div class="btns"><button class="btn dark" id="b-menu">Menu</button><button class="btn" id="b-again">Play again</button></div>`);
    $("b-menu").onclick = () => this.showTitle();
    $("b-again").onclick = () => { this.closePanel(); this.newGame(); };
  }
  // Sealed commissions and saga parts among a player's completed quests.
  questMarks(pl) {
    const sealed = pl.done.filter(q => q.sealed).length, saga = pl.done.filter(q => q.saga != null).length;
    return sealed || saga ? `<br><small>${sealed ? `${ic("seal")}${sealed} ` : ""}${saga ? `${saga} saga ${saga > 1 ? "parts" : "part"}` : ""}</small>` : "";
  }

  // ------------------------------------------------------------ hints
  canHint() { return !this.tut && this.mine() && (this.mode === "draw" || this.mode === "play") && $("overlay").classList.contains("hidden"); }
  clearHint() { this.hint = null; document.querySelectorAll(".hint-glow").forEach(e => e.remove()); }

  // What a strong player would do next: the planner picks its style for this turn, then we
  // watch it play on a copy of the game and stop at its first move.
  showHint() {
    if (!this.canHint()) return;
    const g = this.g, me = g.players[0];
    const params = (this.hintAI || (this.hintAI = RiverAI.planner({ worlds: 6 }))).choose(g.clone(), 0);
    const x = g.clone(), acts = [], STOP = {};
    for (const fn of ["draw", "found", "layoff", "cast", "buy", "move", "work", "discardCard"]) {
      const orig = RiverGame.prototype[fn];
      x[fn] = function (...a) {
        const def = fn === "found" ? x.display[a[2]] : null, top = x.discard[x.discard.length - 1], pile = x.discard.slice();
        const r = orig.apply(x, a);
        acts.push({ fn, a, r, def, top, pile });
        if (fn !== "move" || acts.length > 8) throw STOP;
        return r;
      };
    }
    try { RiverAI.playTurn(x, 0, params); } catch (e) { if (e !== STOP) throw e; }
    const a = acts[0];
    if (!a) return;
    const card = id => me.hand.find(c => c.id === id), hand = id => `#hand .card[data-id="${id}"]`;
    let text = "", targets = [];
    this.sel.clear();
    switch (a.fn) {
      case "draw":
        text = a.a[1] === "discard" ? `take the <b>${cardName(a.top)}</b> from the discard pile.` : "draw from the <b>deck</b>.";
        targets = [a.a[1] === "discard" ? "#discard .slot" : "#deck .slot"];
        break;
      case "cast": {
        const k = card(a.a[1]).spell, arg = a.a[2];
        this.sel.add(a.a[1]);
        text = k === "blink" ? `cast <b>Blink</b> to jump to the <b>${PLACES[arg]}</b>.` : k === "scry" ? "cast <b>Scry</b> for two more cards."
          : k === "recall" ? `cast <b>Recall</b> to take back the <b>${cardName(a.pile[arg])}</b>.` : k === "haggle" ? "cast <b>Haggle</b>, so every vendor charges 1 stamina again."
          : `cast <b>Renew</b>, so your <b>${g.charters.find(ch => ch.id === arg).def.name}</b> doesn't lapse.`;
        targets = [hand(a.a[1]), "#btn-cast"];
        break;
      }
      case "found":
        a.a[1].forEach(id => this.sel.add(id));
        text = `found the <b>${a.def.name}</b> with these ${a.a[1].length} cards.`;
        targets = [...a.a[1].map(hand), `.offer[data-i="${a.a[2]}"]`];
        break;
      case "layoff": {
        const ch = g.charters.find(c => c.id === a.a[2]);
        this.sel.add(a.a[1]);
        text = `lay the <b>${cardName(card(a.a[1]))}</b> off on the <b>${ch.def.name}</b>.`;
        targets = [hand(a.a[1]), `.charter[data-id="${ch.id}"]`];
        break;
      }
      case "buy":
        text = a.a[1] === "discard" ? `buy the <b>${cardName(a.top)}</b> from the discard pile.` : "buy a card from the <b>deck</b>.";
        targets = [a.a[1] === "discard" ? "#discard .slot" : "#deck .slot"];
        break;
      case "move": {
        const step = a.a[1], goal = acts.filter(z => z.fn === "move").pop().a[1];
        text = `walk to the <b>${PLACES[step]}</b>${goal !== step ? `, on the way to the <b>${PLACES[goal]}</b>` : ""}.`;
        targets = [`.place[data-sp="${step}"]`].concat(goal !== step ? [`.place[data-sp="${goal}"]`] : []);
        break;
      }
      case "work": {
        const sp = me.pos;
        text = PRODUCES[sp] >= 0 ? `work the <b>${PLACES[sp]}</b> for 1 ${RES[PRODUCES[sp]]}.` : sp === TAVERN ? (a.a[1] === "sealed" ? "take the <b>sealed commission</b> at the Tavern." : `take <b>${g.qrow[a.a[1]] ? g.qrow[a.a[1]].name : "a quest"}</b> at the Tavern.`) : `trade ${RES[a.a[1][0]]} for <b>${RES[a.a[1][1]]}</b> at the Harbour.`;
        targets = [`.place[data-sp="${sp}"]`];
        break;
      }
      case "discardCard":
        this.sel.add(a.a[1]);
        text = `nothing more worth doing: discard the <b>${cardName(card(a.a[1]))}</b> to end your turn.`;
        targets = [hand(a.a[1]), "#btn-end"];
        break;
    }
    this.hint = { text: "Hint: " + text };
    Sfx.ping();
    this.render();
    requestAnimationFrame(() => { for (const s of targets) document.querySelectorAll(s).forEach(el => this.glow(el, "hint-glow", 4600, 5)); });
  }

  // ------------------------------------------------------------ drawing
  render() {
    if (!this.g) return;
    const g = this.view || this.g;
    this.renderOpps(g);
    this.renderTown(g);
    this.renderCharters(g);
    this.renderTavern(g);
    this.renderBoard(g);
    this.updateCounts();
    $("log").innerHTML = this.lines.slice(-3).map(l => `<div>${l}</div>`).join("");
    this.renderNotice(g);
    $("btn-hint").disabled = !this.canHint();
    $("final").classList.toggle("on", !!(g.endTriggered && !g.over));
    if (this.tut) { this.tut.advance(); this.tut.decorate(); }
  }

  // The round's town event, on a notice at the left of the town; it unfolds when a new one goes up.
  renderNotice(g) {
    const N = $("notice"), e = g.event;
    N.classList.toggle("on", !!e);
    if (!e) return;
    if (this.shownEvent !== e.key || this.shownEventFs !== this.fs) {
      N.innerHTML = `<div class="nt-name">${ic("seal")}${e.name}</div><div class="nt-text">${e.text}</div>`;
      // a long event shrinks its text a little to stay on one line
      const T = N.querySelector(".nt-text");
      if (T.scrollWidth > T.clientWidth) T.style.fontSize = (parseFloat(getComputedStyle(T).fontSize) * T.clientWidth / T.scrollWidth - 0.2).toFixed(1) + "px";
      this.shownEventFs = this.fs;
      N.title = `This round: ${e.name}. ${e.text}`;
      if (this.shownEvent) { N.classList.remove("fresh"); void N.offsetWidth; N.classList.add("fresh"); Sfx.bell(); }
      this.shownEvent = e.key;
    }
  }

  // Resources and renown, holding back whatever is still flying towards them.
  updateCounts() {
    const g = this.view || this.g;
    if (!g) return;
    const res = (p, r) => g.players[p].res[r] - this.fx.pend.filter(x => x.p === p && x.r === r).length;
    const ren = p => g.score(p) - (this.fx.renown[p] || 0);
    const me = g.players[0];
    $("me-res").innerHTML = [0, 1, 2, 3].map(r => `<div class="r" data-r="${r}">${tok(r)}${res(0, r)}<small>${RES[r]}</small></div>`).join("");
    $("me-renown").innerHTML = `${ic("renown")}<span>${ren(0)}<small>renown</small></span>`;
    const total = me.res.reduce((a, b) => a + b, 0);
    $("me-cap").innerHTML = total > g.o.resCap ? `<span class="over">${total} of ${g.o.resCap} resources: ${total - g.o.resCap} lost at turn end</span>` : `${total} of ${g.o.resCap} resources · keep ${g.o.handLimit} cards`;
    for (let p = 1; p < g.players.length; p++) {
      const s = this.seat(p);
      if (!s) continue;
      s.querySelector(".res").innerHTML = [0, 1, 2, 3].map(r => `<span data-r="${r}">${tok(r)}${res(p, r)}</span>`).join("");
      s.querySelector(".renown").innerHTML = `${ic("renown")}${ren(p)}`;
    }
  }

  renderOpps(g) {
    const O = $("opps");
    O.innerHTML = "";
    g.players.forEach((pl, p) => {
      if (p === 0) return;
      const s = document.createElement("div");
      s.className = "seat" + (g.turn === p && !g.over ? " turn" : "");
      s.dataset.p = p;
      const n = Math.max(0, pl.hand.length - (this.fx.fanIn[p] || 0)), shown = Math.min(n, 12);
      const step = shown > 1 ? Math.min(20, 190 / (shown - 1)) : 0, spread = shown > 1 ? Math.min(5, 44 / (shown - 1)) : 0;
      let fan = "";
      for (let i = 0; i < shown; i++) {
        const t = i - (shown - 1) / 2;
        fan += `<div class="card back bv${(i * 3 + p) % 4}" style="left:${(t * step).toFixed(1)}px;transform:rotate(${(-t * spread).toFixed(2)}deg)"></div>`;
      }
      const qs = pl.quests.map((q, i) => `<i class="ic ic-${TYPEKEY[q.type]}${this.fx.quest === p && i === pl.quests.length - 1 ? " hidden-for-flight" : ""}"></i>`).join("");
      s.innerHTML = `<div class="fan">${fan}<div class="anchor"></div></div><div class="count">${n}</div>
        <div class="plate leather"><div class="portrait" style="--pc:${PCOL[p]}">${face(pl.character.name)}</div>
        <div class="nm">${pl.character.name}</div><div class="renown"></div>
        <div class="row"><span class="res"></span><span class="qs">${qs}</span></div></div>`;
      s.title = `${pl.character.name}: click for more`;
      s.onclick = () => this.lensPlayer(p);
      O.appendChild(s);
    });
  }

  renderTown(g) {
    const T = $("town"), me = g.players[0], mine = this.mine() && this.mode === "play", ap = mine ? this.g.t.ap : 0;
    const P = TOWN.map(t => t.at.map(v => v * MAP_K));
    const aim = mine && this.targeting && this.targeting.kind === "blink", spots = g.o.square ? 7 : 6;
    const state = sp => (aim ? { go: false, work: false, blink: sp !== me.pos && sp !== SQUARE } : { go: mine && sp !== me.pos && this.g.canMove(0, sp), work: mine && ap >= 1 && me.pos === sp && this.g.canWork(0) });
    T.innerHTML = this.pieSvg(g, state);
    T.querySelectorAll(".sector").forEach(e => { e.onclick = () => this.clickPlace(+e.dataset.sp); });
    // the Square's label goes down first, so the figures in the districts below it stand in front
    for (const sp of spots === 7 ? [SQUARE, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5]) {
      const { go, work, blink } = state(sp), pr = PRODUCES[sp];
      const boon = g.event && g.event.place === sp, y = g.yieldAt(sp);
      const b = document.createElement("div");
      b.className = "place" + (sp === SQUARE ? " square" : "") + (go ? " go" : "") + (work ? " work" : "") + (boon ? " boon" : "") + (blink ? " blink" : "") + (aim && !blink ? " here" : "");
      b.dataset.sp = sp;
      b.style.left = P[sp][0] + "px";
      b.style.top = P[sp][1] + "px";
      if (sp === SQUARE) b.innerHTML = `<div class="pn">Square${go ? ` ${stCost(1)}` : ""}</div>`;
      else {
        const sub = aim ? (blink ? "Blink here" : "you are here") : go ? `Walk ${stCost(1)}` : work ? (pr >= 0 ? `Work ${stCost(this.g.workCost(0))}${y > 1 ? ` · +${y}` : ""}` : sp === TAVERN ? "Work · a quest" : `Work · trade${boon ? " 1 for 2" : ""}`)
          : pr >= 0 ? (y > 1 ? `makes ${y} ${RES[pr]} today` : `makes ${RES[pr]}`) : (sp === TAVERN ? "quests" : boon ? "trade 1 for 2 today" : "trade");
        b.innerHTML = `${pr >= 0 ? `<div class="medal res r${pr}">${ic(RESKEY[pr])}</div>` : `<div class="medal">${ic(PLACEKEY[sp])}</div>`}<div><div class="pn">${PLACES[sp]}</div><div class="pw">${sub}</div></div>`;
      }
      const here = g.players.map((pl, p) => (pl.pos === sp ? p : -1)).filter(p => p >= 0);
      here.forEach((p, k) => {
        const e = pawnEl(p);
        if (this.fx.pawn === p) e.classList.add("hidden-for-flight");
        if (p === g.turn && !g.over) e.classList.add("active");
        e.dataset.p = p;
        e.title = this.pname(p);
        e.style.left = `calc(50% + ${((k - (here.length - 1) / 2) * 32).toFixed(1)}px)`;
        e.style.zIndex = String(2 + k);
        b.appendChild(e);
      });
      b.onclick = () => this.clickPlace(sp);
      T.appendChild(b);
    }
  }

  // The town drawn as a disc: six districts round the Square in the middle. A step goes to any district
  // that shares a border with yours, so the Square, touching them all, is a step from everywhere.
  // Each district is one place; it lights up gold when you can walk there, green when you can work it.
  pieSvg(g, state) {
    const [cx, cy] = FOUNTAIN.map(v => v * MAP_K), { rx, ry } = PIE, k = g.o.square ? PIE.inner : 0;
    const pt = (deg, s) => { const a = deg * Math.PI / 180; return `${(cx + rx * s * Math.cos(a)).toFixed(1)} ${(cy + ry * s * Math.sin(a)).toFixed(1)}`; };
    const cls = s => (s.go ? " go" : "") + (s.work ? " work" : "") + (s.blink ? " blink" : "");
    const grad = (id, col, a) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}" gradientTransform="translate(${cx} ${cy}) scale(1 ${(ry / rx).toFixed(4)}) translate(${-cx} ${-cy})">
      <stop offset="${k}" stop-color="${col}" stop-opacity="${a}"/><stop offset="0.72" stop-color="${col}" stop-opacity="${(a * 0.6).toFixed(2)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
    let defs = "", sectors = "", edges = "";
    for (const [key, col, a] of [["go", "#ffd66e", 0.34], ["work", "#7be07f", 0.34], ["blink", "#b496ff", 0.38]]) defs += grad(`pg-${key}`, col, a) + grad(`pg-${key}-hi`, col, Math.min(0.62, a * 1.7));
    // the borders fade out towards the town wall
    defs += `<radialGradient id="pg-fade" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}" gradientTransform="translate(${cx} ${cy}) scale(1 ${(ry / rx).toFixed(4)}) translate(${-cx} ${-cy})">
      <stop offset="0.55" stop-color="#fff"/><stop offset="0.95" stop-color="#000"/></radialGradient><mask id="pm-fade"><rect width="1600" height="900" fill="url(#pg-fade)"/></mask>`;
    for (let sp = 0; sp < 6; sp++) {
      const a0 = (180 + 60 * sp) % 360, a1 = a0 + 60;
      const d = k ? `M${pt(a0, k)} L${pt(a0, 1)} A${rx} ${ry} 0 0 1 ${pt(a1, 1)} L${pt(a1, k)} A${(rx * k).toFixed(1)} ${(ry * k).toFixed(1)} 0 0 0 ${pt(a0, k)}Z`
        : `M${cx.toFixed(1)} ${cy.toFixed(1)} L${pt(a0, 1)} A${rx} ${ry} 0 0 1 ${pt(a1, 1)}Z`;
      sectors += `<path class="sector${cls(state(sp))}" data-sp="${sp}" d="${d}"/>`;
      edges += `M${pt(a0, k)} L${pt(a0, 1)} `;
    }
    const sq = k ? `<ellipse class="sector square${cls(state(SQUARE))}" data-sp="${SQUARE}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * k).toFixed(1)}" ry="${(ry * k).toFixed(1)}"/>` : "";
    const ring = k ? `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * k).toFixed(1)}" ry="${(ry * k).toFixed(1)}"/>` : "";
    return `<svg class="pie" width="1600" height="900"><defs>${defs}</defs>${sectors}${sq}
      <g class="borders" mask="url(#pm-fade)"><path class="b-dark" d="${edges}"/><path class="b-light" d="${edges}"/></g>
      ${ring ? `<g class="borders">${ring.replace("<ellipse", '<ellipse class="b-dark"')}${ring.replace("<ellipse", '<ellipse class="b-light"')}</g>` : ""}</svg>`;
  }

  renderCharters(g) {
    const mine = this.mine() && this.mode === "play";
    const cs = mine ? this.selCards() : [];
    const meld = mine && isMeld(cs) && this.g.canPlay(0, cs.length) && !(cs.some(isWild) && this.g.t.spellUsed);
    const O = $("offer");
    O.innerHTML = "";
    for (let i = 0; i < g.o.display; i++) {
      const def = g.display[i];
      const d = document.createElement("div");
      if (!def) { d.className = "offer empty"; d.textContent = "none on offer"; O.appendChild(d); continue; }
      const hit = meld && shapeHit(def, cs);
      d.className = "offer parchment" + (meld ? " can" : "") + (hit ? " hit" : "");
      d.dataset.i = i;
      const ap = cs.length * g.o.meldAP + (hit ? g.o.shapeAP : 0);
      d.innerHTML = `<div class="tname">${def.name}</div><div class="yield" title="Pays its owner 1 ${RES[def.res]} each turn">${tok(def.res)}</div>
        <div class="shape">${meld ? "" : `<span class="pre">prefers</span>`}<b>${SHAPE_SHORT[def.shape]}</b></div>${meld ? `<div class="gain">${stGain(ap)}${hit ? " ✓" : ""}</div>` : ""}`;
      d.title = meld ? `Found the ${def.name} with these cards` : `${def.name}: click for more`;
      d.onclick = () => this.clickOffer(i);
      O.appendChild(d);
    }
    const crowded = g.o.crowdLapse && g.charters.length >= g.o.crowdLapse;
    $("crowd").innerHTML = crowded ? "· crowded" : "";
    $("crowd").dataset.tip = crowded ? `<b>The town is crowded</b><br>With ${g.o.crowdLapse} or more Charters founded, each lasts ${plural(g.life(), "round")} untended instead of ${g.o.life}.` : "";
    const F = $("founded");
    F.innerHTML = "";
    const dense = g.charters.length > 6;
    F.classList.toggle("dense", dense);
    F.classList.toggle("denser", g.charters.length > 8);
    F.classList.toggle("densest", g.charters.length > 10);
    if (!g.charters.length) F.innerHTML = `<div class="none">None yet. Lay a meld on a Charter on offer to found it.</div>`;
    const one = mine && cs.length === 1 && !cs[0].spell && this.g.canPlay(0, 1) ? cs[0] : null;
    const room = g.charters.length > 10 ? 82 : dense ? 136 : 142, cw = dense ? 26 : 36;
    for (const ch of g.charters) {
      const d = document.createElement("div");
      const can = one && fits(one, ch);
      const left = g.roundsLeft(ch);
      const owner = g.players[ch.owner].character.name;
      const renew = mine && this.targeting && this.targeting.kind === "renew" && ch.owner === 0;
      d.className = "charter parchment" + (can ? " can" : "") + (renew ? " renew" : "") + (this.fx.charter === ch.id ? " hidden-for-flight" : "");
      d.dataset.id = ch.id;
      d.style.setProperty("--pc", PCOL[ch.owner]);
      d.innerHTML = `<div class="bar"></div><div class="tname">${ch.def.name}</div><div class="yield">${tok(ch.def.res)}</div>
        ${fadeRing(left, g.life())}
        ${ART.has(CHARKEY[owner]) ? `<div class="owner arms" title="${ch.owner === 0 ? "Yours" : owner}">${arms(owner)}</div>` : `<div class="owner portrait" style="--pc:${PCOL[ch.owner]}" title="${ch.owner === 0 ? "Yours" : owner}">${face(owner)}</div>`}
        <div class="meld"></div>${can ? `<div class="gain">${stGain(ch.owner === 0 ? g.o.ownLayoffAP : g.o.layoffAP)}</div>` : ""}`;
      const M = d.querySelector(".meld");
      const sorted = ch.cards.slice().sort((a, b) => a.r - b.r || a.s - b.s);
      const step = sorted.length > 1 ? Math.min(22, (room - cw) / (sorted.length - 1)) : 0;
      sorted.forEach((c, k) => {
        const e = cardEl(c, "sm");
        if (k) e.style.marginLeft = (step - cw) + "px";
        if (this.fx.hide.has(c.id)) e.classList.add("hidden-for-flight");
        M.appendChild(e);
      });
      d.title = can ? `Lay off on the ${ch.def.name}` : `${ch.def.name} (${ch.owner === 0 ? "yours" : owner}): click for more`;
      d.onclick = () => this.clickCharter(ch);
      F.appendChild(d);
    }
  }

  renderTavern(g) {
    const Q = $("qrow");
    Q.innerHTML = "";
    const me = g.players[0];
    g.qrow.forEach(q => { const d = this.questEl(q, me, "strip"); d.title = `${q.name}: click for more`; d.onclick = () => this.lensQuest(q); Q.appendChild(d); });
    const S = $("qsealed");
    S.innerHTML = "";
    if (g.sealedDeck.length) { const d = this.sealedEl(g.sealedDeck[0]); d.title = "A sealed commission: click for more"; d.onclick = () => this.lensSealed(g.sealedDeck[0]); S.appendChild(d); }
    $("qmore").textContent = g.qdeck.length ? `· ${g.qdeck.length} more` : "· none left";
    const mine = this.mine() && this.mode === "play";
    $("btn-request").classList.toggle("on", !!(mine && this.g.canRefreshQuests(0)));
    $("btn-request").title = this.g.players[0].pos === TAVERN ? "Put these quests to the bottom of the deck and draw fresh ones (1 stamina)" : "Stand at the Tavern to draw fresh quests (1 stamina)";
    $("btn-reoffer").classList.toggle("on", !!(mine && this.g.canRefreshCharters(0)));
  }

  renderBoard(g) {
    const live = this.g, me = g.players[0], mine = this.mine();
    const myTurn = g.turn === 0 && !live.over && this.mode !== "ai";
    $("me-char").innerHTML = `<div class="portrait" style="--pc:${PCOL[0]}">${face(me.character.name)}</div>
      <div class="nm">${me.character.name}</div><div class="ti">${me.character.title}</div>
      <div class="fv">${ic(TYPEKEY[me.character.favour])} Favours ${TYPES[me.character.favour]} (+${g.o.favourBonus})</div>`;
    // your stamina as tokens: new ones pop in, spent ones fade away
    const sta = g.turn === 0 && g.t ? g.t.ap : 0, was = this.shownSt == null ? sta : this.shownSt, MAXT = 18;
    this.shownSt = sta;
    let toks = "";
    for (let i = 0; i < Math.min(sta, MAXT); i++) toks += stTok(i >= was ? "new" : "");
    for (let i = sta; i < Math.min(was, MAXT); i++) toks += stTok("gone");
    const S = $("me-ap");
    S.classList.toggle("off", !myTurn || this.mode === "draw");
    S.classList.toggle("many", Math.max(sta, was) > 12);
    S.innerHTML = `<div class="st-row">${toks || stTok("empty")}${sta > MAXT ? `<b>+${sta - MAXT}</b>` : ""}</div><small>${sta ? `${sta} stamina` : "no stamina"}</small>`;
    S.dataset.tip = "<b>Stamina</b><br>Spend it to walk (1 a step), and to work a place or buy a card: 1, then 2, then 3 at the same vendor. You get 2 each turn, and more for every card you play onto a Charter.";

    // the piles
    const drawing = mine && this.mode === "draw", buying = mine && this.mode === "play" && live.canBuy(0);
    const ds = $("deck").querySelector(".slot");
    ds.innerHTML = "";
    ds.className = "slot" + (g.deck.length ? "" : " empty");
    if (g.deck.length) ds.appendChild(backEl("", g.deck.length % 4));
    $("deck").querySelector(".lbl").innerHTML = drawing ? "<b>Draw</b>" : buying ? `<b>Buy</b> ${stCost(live.buyPrice())}` : `Deck · ${g.deck.length}`;
    $("deck").classList.toggle("go", drawing || buying);
    const xs = $("discard").querySelector(".slot"), D = g.discard;
    xs.innerHTML = "";
    xs.className = "slot" + (D.length ? "" : " empty");
    D.slice(-3).forEach((c, k, arr) => {
      const e = cardEl(c);
      const under = arr.length - 1 - k;   // 0 for the top card
      if (under) e.style.transform = `rotate(${((c.id * 7) % 11) - 5}deg) translate(${under * 2}px, ${under * 2}px)`;
      else { e.classList.add("top"); if (this.fx.discard) e.classList.add("hidden-for-flight"); }
      xs.appendChild(e);
    });
    $("discard").querySelector(".lbl").innerHTML = drawing && D.length ? "<b>Take</b>" : buying && D.length ? `<b>Buy</b> ${stCost(live.buyPrice())}` : "Discard";
    $("discard").classList.toggle("go", (drawing || buying) && D.length > 0);

    // the hand, fanned; cards keep their elements so they slide when the hand changes
    const H = $("hand");
    const hand = me.hand.slice().sort(this.sortMode === "rank"
      ? (a, b) => (!!a.spell - !!b.spell) || a.r - b.r || a.s - b.s || (a.spell || "").localeCompare(b.spell || "")
      : (a, b) => (!!a.spell - !!b.spell) || a.s - b.s || a.r - b.r || (a.spell || "").localeCompare(b.spell || ""));
    const ids = new Set(hand.map(c => c.id));
    for (const [id, el] of this.handEls) if (!ids.has(id)) { el.remove(); this.handEls.delete(id); }
    const n = hand.length, W = 640, cw = 96;
    const step = n > 1 ? Math.min(66, (W - cw) / (n - 1)) : 0, spread = n > 1 ? Math.min(3, 22 / (n - 1)) : 0;
    const x0 = (W - cw - step * (n - 1)) / 2, tm = Math.max(1, (n - 1) / 2);
    hand.forEach((c, i) => {
      let e = this.handEls.get(c.id);
      if (!e) { e = cardEl(c); e.onclick = () => this.clickCard(c); H.appendChild(e); this.handEls.set(c.id, e); }
      const t = i - (n - 1) / 2;
      e.style.left = Math.round(x0 + i * step) + "px";
      e.style.setProperty("--rot", (t * spread).toFixed(2) + "deg");
      e.style.bottom = (-6 * (t / tm) * (t / tm)).toFixed(1) + "px";
      e.style.zIndex = String(10 + i);
      e.classList.toggle("sel", this.sel.has(c.id));
      e.classList.toggle("drop", this.drops.has(c.id));
      e.classList.toggle("fresh", this.fresh.has(c.id));
      e.classList.toggle("hidden-for-flight", this.fx.hide.has(c.id));
    });
    $("sort-suit").classList.toggle("on", this.sortMode === "suit");
    $("sort-rank").classList.toggle("on", this.sortMode === "rank");

    // buttons
    const cs = mine ? this.selCards() : [];
    const playing = mine && this.mode === "play";
    $("btn-cast").disabled = !(playing && cs.length === 1 && live.castable(0, cs[0]));
    $("btn-clear").disabled = !(playing && cs.length);
    $("btn-undo").disabled = !(mine && this.undo.length && (this.mode === "play" || this.mode === "draw"));
    $("btn-end").disabled = !(playing && cs.length === 1);

    // your quests
    const MQ = $("my-quests");
    MQ.innerHTML = `<div class="label">Your quests · ${me.quests.length} of ${g.o.questLimit}</div>`;
    me.quests.forEach((q, i) => {
      const d = this.questEl(q, me, "strip");
      if (q.need.every((x, r) => me.res[r] >= x)) d.classList.add("ready");
      if (this.fx.quest === 0 && i === me.quests.length - 1) d.classList.add("hidden-for-flight");
      d.title = `${q.name}: click for more`;
      d.onclick = () => this.lensQuest(q);
      MQ.appendChild(d);
    });
    if (!me.quests.length) MQ.insertAdjacentHTML("beforeend", `<div class="empty">No quests. Work the Tavern to take one.</div>`);

    // status: one short line
    let st;
    if (live.over) st = "The game is over.";
    else if (g.turn !== 0 || this.mode === "ai") st = this.aiSays && this.mode === "ai" ? this.aiSays : `<b>${this.pname(g.turn !== 0 ? g.turn : this.aiTurn)}</b> is playing…`;
    else if (this.hint && mine) st = `<span class="hint">${this.hint.text}</span>`;
    else if (this.targeting && mine) st = this.targeting.kind === "blink" ? "<b>Blink:</b> click a place on the map to appear there, or <b>Clear</b> to keep the spell." : "<b>Renew:</b> click one of your Charters, or <b>Clear</b> to keep the spell.";
    else if (live.endTriggered && this.mode === "draw") st = `<b class="final">Final round:</b> this is your last turn. Draw ${live.t.drawsLeft}.`;
    else if (this.mode === "draw") st = `Your turn. <b>Draw ${live.t.drawsLeft}</b> from the deck or the discard pile.`;
    else if (this.mode === "trim") st = `Too many cards: pick <b>${me.hand.length - live.o.handLimit - this.drops.size}</b> more to throw away.`;
    else if (this.mode === "ending") st = "Ending your turn…";
    else if (cs.length >= 3 && isMeld(cs) && cs.some(isWild) && live.t.spellUsed) st = "You've used your spell this turn: the <b>Glamour</b> can wait for next turn.";
    else if (cs.length >= 3 && isMeld(cs)) st = !live.display.length ? "A meld, but no Charters are on offer." : cs.some(isWild) ? `<b>A meld of ${cs.length} with a Glamour</b> (no shape bonus). Click a Charter on offer.` : `<b>A meld of ${cs.length}.</b> Click a Charter on offer to found it.`;
    else if (cs.length === 1 && cs[0].spell === "glamour") st = "<b>Glamour</b> is wild: select it with two or more cards to make a meld.";
    else if (cs.length === 1 && cs[0].spell) st = live.castable(0, cs[0]) ? `<b>${SPELLS[cs[0].spell].name}:</b> ${SPELLS[cs[0].spell].text} Press <b>Cast</b>.` : live.t.spellUsed ? "One spell a turn: keep this one for next turn, or discard it." : `<b>${SPELLS[cs[0].spell].name}</b> can't be cast just now.`;
    else if (cs.length === 1 && live.charters.some(ch => fits(cs[0], ch))) st = "Click a glowing Charter to <b>lay it off</b>.";
    else if (cs.length === 1) st = "<b>Discard</b> it to end your turn.";
    else if (cs.length >= 3 && cs.every(c => !c.spell && c.r === cs[0].r)) st = "Not a set: <b>each card of a new set must be a different suit</b>.";
    else if (cs.length >= 2) st = "Not a meld yet.";
    else st = `<b>${live.t.ap} stamina</b> to spend${PRODUCES[me.pos] >= 0 && live.rise(me.pos) ? `. The ${PLACES[me.pos]} now charges <b>${live.workCost(0)}</b>; other vendors start at 1` : ""}. Discard a card to end your turn.`;
    $("status").innerHTML = `<span>${st}</span>`;
  }
}

const app = new App();
