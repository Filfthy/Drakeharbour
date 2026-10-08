// river-app.js - the table for River: you against computer players.

// Each character's colour, for their piece, their name plate and the Charters they own.
// ("Ser Aldric" was his name in saves made before 2026-10-07)
const CHAR_COL = { "Sir Aldric": "#e06a24", "Ser Aldric": "#e06a24", "Lady Velia": "#9e6fbf", "Brother Anselm": "#e9e2cf", "Magister Orrin": "#34373f", "Kestra": "#2bb3c0" };
// Characters with painted art (tools/make-characters.py): a shield, a portrait and a miniature.
const ART = new Set(["aldric", "velia", "anselm", "orrin", "kestra"]);
// Seat by seat for the game in play: each player's colour and character.
let PCOL = [], PKEY = [];
const RESKEY = ["gold", "steel", "faith", "lore"];
const PLACEKEY = ["market", "forge", "tavern", "temple", "library", "harbour", "square"];
const TYPEKEY = ["adventure", "diplomacy", "devotion", "scholarship", "exploration"];
const CHARKEY = { "Sir Aldric": "aldric", "Ser Aldric": "aldric", "Lady Velia": "velia", "Brother Anselm": "anselm", "Magister Orrin": "orrin", "Kestra": "kestra" };
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
const GAME_URL = "https://bug-victim.itch.io/drakeharbour";
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
  musicOff: svgIcon('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M3 3l18 18"/>'),
  hint: svgIcon('<path d="M9.5 17.5h5M10.5 20.5h3"/><path d="M8.3 13.8A6 6 0 1 1 15.7 13.8c-.8.7-1.2 1.5-1.2 2.2h-5c0-.7-.4-1.5-1.2-2.2z"/>'),
  rules: svgIcon('<path d="M3 5.5c2.6-1 5.6-.8 9 1.2 3.4-2 6.4-2.2 9-1.2V19c-2.6-1-5.6-.8-9 1.2-3.4-2-6.4-2.2-9-1.2z"/><path d="M12 6.7v13.5"/>'),
  cog: svgIcon('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.3"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M5.3 18.7l2.2-2.2M16.5 7.5l2.2-2.2"/>'),
  calendar: svgIcon('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2"/>')
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
// Why a selection of cards isn't a meld, in a few words (null when it is one).
const SUIT_COLOUR = ["red", "blue", "purple", "green"];
const LAST_CARD = "You can't play your last card: <b>you need it to discard</b> and end your turn.";
function meldTrouble(cs) {
  if (isMeld(cs)) return null;
  if (cs.some(c => c.spell && !isWild(c))) return "spells can't go in a meld (only a Glamour can).";
  if (cs.filter(isWild).length > 1) return "a meld can hold only one Glamour.";
  if (cs.length < 3) return "a meld needs 3 cards or more.";
  const nat = cs.filter(c => !c.spell);
  if (nat.every(c => c.r === nat[0].r)) {
    const dup = nat.find((c, i) => nat.findIndex(x => x.s === c.s) !== i);
    if (dup) return `each card of a new set must be a different suit, and two are ${SUIT_COLOUR[dup.s]} ${SUITS[dup.s]}s.`;
    return "a set holds 4 cards at most, one of each suit.";
  }
  if (nat.every(c => c.s === nat[0].s)) {
    const rs = nat.map(c => c.r).sort((a, b) => a - b), miss = [];
    if (rs.some((r, i) => i && r === rs[i - 1])) return "a run can't hold the same rank twice.";
    for (let r = rs[0] + 1; r < rs[rs.length - 1]; r++) if (!rs.includes(r)) miss.push(r);
    return `a run must be in a row, and this one is missing the ${miss.join(" and ")}${cs.some(isWild) ? " (a Glamour fills one gap only)" : ""}.`;
  }
  return "a set is 3 or 4 of one rank, each a different suit; a run is 3 or more in a row, in one suit.";
}
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
    e.dataset.tip = `<b>${c.r} of ${SUITS[c.s]}s</b>`;
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
// Tips for the start screen.
const TITLE_TIPS = [
  "Each character has a perk of their own. In New game, <i>Compare all five</i> shows them side by side.",
  "Your personal quest, marked ★, doesn't count towards your three quests. Completing it empowers your perk.",
  "Laying a card off on someone else's Charter gives you 2 stamina. Look for lay-offs every turn.",
  "Each vendor's price rises as you buy from it in a turn: 1 stamina, then 2, then 3. Another vendor starts again at 1.",
  "A Charter nobody lays off on for three rounds lapses. A Renew spell keeps it going.",
  "The sealed commission hides what it needs until you take it, and pays about a quarter more.",
  "Sagas, marked Part 1/3, hand you their next part as you complete each one, every part worth more.",
  "Scry and Recall bring cards back, so either may be your last card.",
  "A Glamour stands in for any one card in a new meld, but that meld earns no shape bonus.",
  "A Charter founded in its preferred shape gives 2 stamina more.",
  "Each round's town event holds for everyone. It's posted at the top right, by the calendar.",
  "Quests draw you cards when you're short: up to 3 for a big one.",
  "Your favourite kind of quest scores 4 extra renown.",
  "Hold V during a game to see the whole town without the panels.",
  "Stuck? Hint (or the H key) shows what a strong player would do now.",
  "Want closer finishes? Try <i>Underdog's luck</i> in New game: whoever is last draws an extra card each turn.",
  "Playing to 150 or 200 makes a longer game, about 11 or 15 rounds."
];
// The cards a quest draws, as that many little card backs, overlapping in a small arc (one alone leans a little).
const cardFan = (n, cls = "", tip = "") => `<span class="qcards${cls ? " " + cls : ""}" style="--n:${n}"${tip ? ` data-tip="${tip}"` : ""}>${Array.from({ length: n }, (_, k) => {
  const t = n === 1 ? -0.5 : k - (n - 1) / 2;
  return `<i style="--k:${k};--t:${t};--a:${Math.abs(t)}"></i>`;
}).join("")}</span>`;
// A quest's tooltip: its name and flavour.
const questTip = (q, click = "Click to see it in full.") => `<b>${q.name}</b>${q.flavour ? `<br><i>${q.flavour}</i>` : ""}<br>${click}`;
// A character's perk in words: for you ("your first trade…") or for anyone else ("their first trade…").
const PERK_IC = { forge: "forge", tongue: "trade", tithe: "charter", grimoire: "cast", shortcut: "square" };
const perkTxt = (k, you, emp) => (emp ? EMPOWERED : PERKS)[k].text.replace(/\{(they|their|them|They|Their)\}/g, (_, w) => (you ? { they: "you", their: "your", them: "you", They: "You", Their: "Your" }[w] : w));
// A player's perk, and its empowered form once they've completed their personal quest, for a tooltip.
const perkTip = (g, p) => {
  const k = g.perkOf(p);
  if (!k) return "";
  return `<br><b>${PERKS[k].name}</b><br>${perkTxt(k, p === 0)}` + (g.power(p) ? `<br><b>★ ${EMPOWERED[k].name}</b><br>${perkTxt(k, p === 0, true)}`
    : g.pl(p).personal ? `<br><i>${p === 0 ? "Your" : "Their"} personal quest, <b>${g.pl(p).personal.name}</b>, empowers it.</i>` : "");
};
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

const noFx = () => ({ hide: new Set(), pawn: -1, discard: false, fanIn: {}, pend: [], renown: {}, quest: -1, charter: -1, flash: -1, turnover: null });

class App {
  constructor() {
    this.opponents = load("opponents", 2);
    this.you = load("you", null);         // the character you play (null: dealt at random)
    this.target = load("target", 100);    // the renown that ends the game
    this.personal = load("personal", true); // personal quests, which empower the characters' perks
    this.underdog = load("underdog", false); // Underdog's luck, the optional catch-up rule
    this.level = load("level", "hard");
    this.sortMode = load("sort", "suit");
    this.speed = load("speed", 1);
    SPEED = this.speed;
    // text size: the largest unless chosen otherwise in Settings (it became the default on 2026-10-07)
    if (!load("fsdefault2", false)) { save("fs", 2); save("fsdefault2", true); }
    this.fs = Math.max(0, Math.min(2, load("fs", 2)));
    this.fullStart = load("fullstart", true);
    this.panels = load("panels", "clear");
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
    $("btn-hint").innerHTML = ICONS.hint;
    $("btn-rules").innerHTML = ICONS.rules;
    $("btn-menu").innerHTML = ICONS.cog;
    $("btn-rules").onclick = () => this.showRules(() => this.closePanel());
    $("btn-menu").onclick = () => this.showTitle();
    $("btn-hint").onclick = e => { e.currentTarget.blur(); this.showHint(); };
    $("mixer").innerHTML = `<div class="mx-row mx-sw"><span>Sound</span><button class="mx-toggle" id="mx-sound" role="switch"><i></i></button><b id="mx-sound-v"></b></div>` + this.volRows();
    $("mx-sound").onclick = () => { Music.setSound(!Music.sound); this.audioUi(); };
    document.addEventListener("musicchange", () => this.audioUi());
    this.wireVols($("mixer"));
    $("mixer").addEventListener("pointerdown", e => e.stopPropagation());
    document.addEventListener("pointerdown", () => this.toggleMixer(false));
    $("btn-sound").onclick = e => { e.currentTarget.blur(); e.stopPropagation(); this.toggleMixer(); };
    $("btn-full").onclick = e => { e.currentTarget.blur(); this.toggleFull(); };
    $("chronicle").onclick = () => this.lensLog();
    $("me-char").onclick = () => { if (this.g) this.lensPlayer(0); };
    document.addEventListener("pointerdown", e => { const b = e.target.closest && e.target.closest("button"); if (b && !b.disabled && !b.closest("#hand")) Sfx.tap(); });
    this.wireTips();
    $("sort-suit").onclick = () => this.setSort("suit");
    $("sort-rank").onclick = () => this.setSort("rank");
    $("overlay").addEventListener("click", () => { if ($("overlay").classList.contains("lens")) this.closePanel(); });
    draggable($("panel"), this, { transform: true, when: () => $("overlay").classList.contains("ask") });
    document.addEventListener("keydown", e => {
      if (this.titleUp()) return;
      if (e.key === "h" || e.key === "H") this.showHint();
      // hold V to see the whole town, without the panels
      if ((e.key === "v" || e.key === "V") && !e.repeat && this.g) $("stage").classList.add("peek");
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undoLast(); }
    });
    document.addEventListener("keyup", e => { if (e.key === "v" || e.key === "V") $("stage").classList.remove("peek"); });
    window.addEventListener("blur", () => $("stage").classList.remove("peek"));
    document.addEventListener("fullscreenchange", () => this.fullUi());
    document.addEventListener("webkitfullscreenchange", () => this.fullUi());
    window.addEventListener("resize", () => this.fit());
    $("nightlights").innerHTML = SCENE.lights.map(([x, y, r]) =>
      `<i style="left:${x * MAP_K}px;top:${y * MAP_K}px;width:${r * 4}px;height:${r * 4}px"></i>`).join("");
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
    // Reveal extra countryside at the same scale as the original, fixed town map.
    const sceneWidth = Math.max(1600, innerWidth / s);
    $("stage").style.setProperty("--scene-width", `${sceneWidth}px`);
    $("stage").classList.toggle("wide-scene", sceneWidth > 1600.5);
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
      timer = setTimeout(() => this.showTip(t), t.classList.contains("card") ? 750 : 260);
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
    const tunes = MUSIC_TUNES.map((t, i) => `<option value="${i}">${t.name}</option>`).join("");
    return row("sfx", "Game") + row("music", "Music") + row("amb", "Ambient")
      + `<div class="mx-row mx-tune"><span>Tune</span><select class="music-pick" aria-label="Choose a tune"><option value="" disabled>Choose a tune</option>${tunes}</select></div>`
      + `<div class="mx-note music-now" aria-live="polite"></div>`;
  }
  wireVols(root) {
    root.querySelectorAll("select.music-pick").forEach(sel => {
      sel.onchange = () => { if (sel.value !== "") Music.choose(Number(sel.value)); };
    });
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
    const queued = Music.requested == null ? null : MUSIC_TUNES[Music.requested];
    const current = queued || Music.tune;
    document.querySelectorAll("select.music-pick").forEach(sel => {
      sel.value = current ? String(MUSIC_TUNES.indexOf(current)) : "";
    });
    document.querySelectorAll(".music-now").forEach(el => {
      el.textContent = queued ? `Queued: ${queued.name}` : Music.playing() && Music.band && current ? `Playing: ${current.name}` : "Music paused. Turn on Sound and raise Music to listen.";
    });
    const s = $("btn-sound"), on = Music.on && Music.volume > 0;
    const lvl = k => (k === "music" ? (on ? Music.volume : 0) : k === "amb" ? Ambience.volume : Sfx.volume);
    document.querySelectorAll("b.vol-v").forEach(b => { const v = lvl(b.dataset.k); b.textContent = v ? Math.round(v * 100) + "%" : "off"; });
    document.querySelectorAll("input.vol").forEach(i => { if (document.activeElement !== i) i.value = Math.round(100 * lvl(i.dataset.k)); });
    // Starting music on pointerdown must not replace the icon beneath the pointer before click.
    if (s.dataset.sound !== String(Music.sound)) {
      s.innerHTML = Music.sound ? ICONS.sound : ICONS.muted;
      s.dataset.sound = String(Music.sound);
    }
    s.dataset.tip = `<b>Sound: ${Music.sound ? "on" : "off"}</b><br>Click to switch it on or off, or set the game, music and ambient volumes.`;
    s.classList.toggle("muted", !Music.sound);
    const sw = $("mx-sound");
    if (sw) { sw.classList.toggle("on", Music.sound); sw.setAttribute("aria-checked", String(Music.sound)); $("mx-sound-v").textContent = Music.sound ? "On" : "Off"; $("mixer").classList.toggle("off", !Music.sound); }
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
    b.dataset.tip = on ? "<b>Leave fullscreen</b>" : "<b>Fullscreen</b>";
    [60, 300].forEach(ms => setTimeout(() => this.fit(), ms));
  }

  // ------------------------------------------------------------ panels, questions and the lens
  // mode: "" for menus, "lens" for a closer look (click anywhere to close), "ask" for a question you can drag aside
  panel(h, mode = "", cls = "") {
    const P = $("panel");
    P.classList.remove("end");
    P.classList.toggle("narrow", cls === "narrow");
    P.classList.toggle("wide", cls === "wide");
    P.classList.toggle("games-panel", cls === "games");
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
    this.cancelNight();
    this.closePanel();
    this.toggleMixer(false);
    if (!this.g) $("stage").classList.add("idle");
    const live = this.g && !this.g.over, s0 = !live && load("save", null), saved = s0 && s0.v === SAVE_VERSION ? s0 : null;
    const first = live ? `<button class="btn big parch" id="b-resume">Resume</button>` : saved ? `<button class="btn big parch" id="b-continue">Continue<small>${this.savedLine(saved)}</small></button>` : "";
    $("title-menu").innerHTML = `${first}<button class="btn big parch" id="b-new">New game</button>
      <button class="btn big parch" id="b-tut">Tutorial</button><button class="btn big parch" id="b-settings">Settings</button>
      <div class="t-row"><button class="btn parch" id="b-rules">Rules</button><button class="btn parch" id="b-credits">Credits</button><button class="btn parch" id="b-more-games">More card games</button></div>
      <div id="title-tip"></div>`;
    $("title-foot").innerHTML = `${this.recordLine()}<div class="t-maker"><img src="img/bugvictim-scroll-v2.webp" alt="© BugVictim 2026" width="2169" height="725"></div>`;
    // a tip under the menu, a different one each visit; a click shows the next
    const tip = $("title-tip");
    let ti = Math.floor(Math.random() * TITLE_TIPS.length);
    const showTip = () => { tip.innerHTML = `<b>Tip</b> · ${TITLE_TIPS[ti % TITLE_TIPS.length]} <span class="more">›</span>`; };
    showTip();
    tip.onclick = () => { ti++; showTip(); };
    const go = fn => () => { this.goFull(); this.hideTitle(); fn(); };
    if (live) $("b-resume").onclick = go(() => {});
    if (saved) $("b-continue").onclick = go(() => this.resume(saved));
    $("b-new").onclick = () => this.showSetup(!!(live || saved));
    $("b-tut").onclick = go(() => this.startTutorial());
    $("b-settings").onclick = () => this.showSettings();
    $("b-rules").onclick = () => this.showRules(() => this.closePanel());
    $("b-credits").onclick = () => this.showCredits();
    $("b-more-games").onclick = () => this.showMoreGames();
    $("b-share").onclick = () => this.shareGame();
    $("b-copy-link").onclick = () => this.copyGameLink();
    $("share-status").textContent = "";
    $("b-copy-link").textContent = "Copy link";
    $("share-link").hidden = true;
    $("stage").classList.add("titled");
    $("title").classList.remove("hidden");
  }
  // A saved game in a few words: the round, and where you stand.
  savedLine(data) {
    try {
      const g = data.g, fb = (g.o && g.o.favourBonus) || 4;
      const sc = g.players.map(pl => pl.renown + pl.done.filter(q => q.type === pl.character.favour).length * fb);
      const best = Math.max(...sc.slice(1)), lead = sc.indexOf(best);
      const t = g.o && g.o.target && g.o.target !== 100 ? ` (to ${g.o.target})` : "";
      return `Round ${g.round}${t} · you ${sc[0]}, ${sc[0] >= best ? "in the lead" : `${g.players[lead].character.name} ${best}`}`;
    } catch (e) { return ""; }
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
    const picks = CHARACTERS.map((c, i) => `<button class="pick${this.you === c.name ? " on" : ""}" data-c="${c.name}"><div class="portrait" style="--pc:${CHAR_COL[c.name]}">${face(c.name)}</div><small>${c.name.split(" ").pop()}</small></button>`).join("");
    this.panel(`<h2>New game</h2>
      <div class="opt"><span>You play</span><button class="linkish" id="b-chars">Compare all five</button></div>
      <div class="picks">${picks}<button class="pick${this.you ? "" : " on"}" data-c=""><div class="portrait rnd">?</div><small>Random</small></button></div>
      <div class="pick-note" id="pick-note"></div>
      <div class="opt"><span>Opponents</span>${this.seg("opponents", [1, 2, 3], ["1", "2", "3"], this.opponents)}</div>
      <div class="opt"><span data-tip="<b>Their skill</b><br>Easy opponents play by rules of thumb. Normal ones look a little ahead before each turn, and Hard ones a round or two.">Their skill</span>${this.seg("level", ["easy", "normal", "hard"], ["Easy", "Normal", "Hard"], this.level)}</div>
      <div class="opt"><span data-tip="<b>Play to</b><br>The renown that ends the game: the first to reach it ends the game at the end of that round.">Play to</span>${this.seg("target", [100, 150, 200], ["100", "150", "200"], this.target)}<small class="opt-note" id="target-note"></small></div>
      <div class="opt"><span data-tip="<b>Personal quests</b><br>Each character holds a quest of their own from the start, marked ★. Completing it empowers their perk for the rest of the game.">Personal quests</span>${this.seg("personal", [true, false], ["On", "Off"], this.personal !== false)}<small class="opt-note">each empowers a perk</small></div>
      <div class="opt"><span data-tip="<b>Underdog's luck</b><br>Whoever is alone in last place draws a card at the start of their turn, and their quests score up to 2 more renown, never taking them past the leader. Closer finishes, but a lead still counts.">Underdog's luck</span>${this.seg("underdog", [false, true], ["Off", "On"], !!this.underdog)}<small class="opt-note">a catch-up rule, to try</small></div>
      ${ending ? `<p class="note">A new game ends the one in progress.</p>` : ""}
      <div class="btns"><button class="btn dark" id="b-back">Back</button><button class="btn" id="b-begin">Begin</button></div>`, "", "narrow");
    this.wireSegs();
    // who you'll be: a portrait, or Random; the note under them says what it means (and how you've done as them)
    const rec = name => { const r = load("record", null), c = r && r.by && r.by[name]; return c && c.games ? c : null; };
    const note = () => {
      const c = CHARACTERS.find(x => x.name === this.you);
      $("pick-note").innerHTML = c ? `<b>${c.name}</b>, ${c.title}. Favours <b>${TYPES[c.favour]}</b> quests. <b>${PERKS[c.perk].name}.</b> ${perkTxt(c.perk, true)}`
        + (this.personal !== false ? ` Your personal quest, <i>${PERSONAL[c.perk].name}</i>, empowers it into <b>${EMPOWERED[c.perk].name}</b>.` : "")
        + (rec(c.name) ? ` <span class="rec">Your record as ${c.name.split(" ").pop()}: ${plural(rec(c.name).wins, "win")} from ${plural(rec(c.name).games, "game")}.</span>` : "")
        : "A character dealt at random, as are your opponents'.";
      $("target-note").textContent = { 100: "about 8 rounds", 150: "about 11 rounds", 200: "about 15 rounds" }[this.target] || "";
    };
    $("panel").querySelectorAll(".pick").forEach(b => b.onclick = () => {
      this.you = b.dataset.c || null;
      save("you", this.you);
      $("panel").querySelectorAll(".pick").forEach(x => x.classList.toggle("on", x === b));
      note();
    });
    $("panel").querySelectorAll('.seg[data-k="target"] button, .seg[data-k="personal"] button').forEach(b => b.addEventListener("click", note));
    $("b-chars").onclick = () => this.showCharacters(() => this.showSetup(ending));
    note();
    $("b-back").onclick = () => this.closePanel();
    $("b-begin").onclick = () => { this.goFull(); this.closePanel(); this.hideTitle(); this.newGame(); };
  }

  // The five characters side by side: who they are, what they favour, their perk, and what their personal quest makes of it.
  showCharacters(back) {
    const rows = CHARACTERS.map(c => `<div class="crow" data-c="${c.name}" data-tip="Click to play as <b>${c.name}</b>"><div class="portrait" style="--pc:${CHAR_COL[c.name]}">${face(c.name)}</div>
      <div class="cinfo"><div class="cname"><b>${c.name}</b>, <i>${c.title}</i> <span class="cfav">${ic(TYPEKEY[c.favour])}${TYPES[c.favour]}</span></div>
        <div class="cperk">${ic(PERK_IC[c.perk])}<span><b>${PERKS[c.perk].name}.</b> ${perkTxt(c.perk, true)}</span></div>
        ${this.personal !== false ? `<div class="cperk emp"><span class="star">★</span><span><i>${PERSONAL[c.perk].name}</i> ${needTxt(PERSONAL[c.perk].need)} empowers it: <b>${EMPOWERED[c.perk].name}.</b> ${perkTxt(c.perk, true, true)}</span></div>` : ""}</div></div>`).join("");
    this.panel(`<h2>The characters</h2><p class="note">Each favours one kind of quest (${RV_DEFAULTS.favourBonus} extra renown each) and has a perk of their own.</p>
      <div class="chars">${rows}</div>
      <div class="btns"><button class="btn" id="b-back">Back</button></div>`, "", "wide");
    $("b-back").onclick = () => back();
    // a click on a character chooses them
    $("panel").querySelectorAll(".crow").forEach(r => r.onclick = () => { this.you = r.dataset.c; save("you", this.you); back(); });
  }

  showSettings() {
    const canFull = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    this.panel(`<h2>Settings</h2>
      <div class="opt"><span>Text size</span>${this.seg("fs", [0, 1, 2], FS_NAMES, this.fs)}</div>
      <div class="opt"><span>Panels</span>${this.seg("panels", ["clear", "tinted", "dark"], ["Clear", "Tinted", "Dark"], this.panels)}</div>
      <div class="opt"><span>Map</span>${this.seg("scenery", [true, false], ["Animated", "Still"], this.scenery)}</div>
      <div class="vols">${this.volRows()}</div>
      <div class="opt"><span>Sound</span>${this.seg("sound", [true, false], ["On", "Off"], Music.sound)}</div>
      <div class="opt"><span>Speed</span>${this.seg("speed", [1, 0.55, 0.3], ["Normal", "Fast", "Fastest"], this.speed)}</div>
      ${canFull ? `<div class="opt"><span>Fullscreen</span>${this.seg("full", [true, false], ["On", "Off"], this.fullStart)}</div>` : ""}
      <div class="btns"><button class="btn" id="b-done">Done</button></div>`, "", "narrow");
    this.wireSegs();
    this.wireVols($("panel"));
    $("b-done").onclick = () => this.closePanel();
  }

  // The rules as headings that open one at a time.
  showRules(back) {
    const o = Object.assign({}, RV_DEFAULTS, { target: (this.g && this.g.o.target) || this.target || RV_DEFAULTS.target });
    const sec = (h, b, open) => `<div class="acc${open ? " open" : ""}"><button class="acc-h">${h}</button><div class="acc-b">${b}</div></div>`;
    this.panel(`<h2>How to play</h2>
      ${sec("The goal", `<p>Complete <b>quests</b> for renown. The first to ${o.target} renown ends the game at the end of that round, and the most renown wins.</p>`, true)}
      ${sec("Your turn", `<ol><li><b>Rent:</b> each Charter you own pays you 1 of its resource.</li><li><b>Draw 2 cards</b>, from the deck or the top of the discard pile.</li>
        <li><b>Play cards</b> for <b>stamina</b> ${stTok()}. You start each turn with ${o.freeAP}. You may also cast one spell.</li>
        <li><b>Spend stamina:</b> a step costs 1, to a district next to yours or into the <b>Square</b> in the middle of town, which borders every place. Nowhere is more than two steps away, and one click on a district walks you there. Each <b>vendor</b> (the Market, Forge, Temple, Library and the card stall) charges 1 stamina for your first purchase there this turn, then 2, then 3. Walk to another vendor to start at 1 again.</li>
        <li><b>Discard a card</b> to end your turn, then hand in one quest.</li></ol>`)}
      ${sec("Melds and Charters", `<ul><li>A <b>meld</b> is a <b>set</b>: 3 or 4 cards of one rank, each a different suit; or a <b>run</b>: 3 or more in a row in one suit.</li>
        <li>Once a set is down, any card of its rank can be laid off on it, a second copy of a suit too. A run takes the next card at either end.</li>
        <li><b>Found</b> a Charter by laying a meld on one on offer: 1 stamina and 1 renown per card, and ${o.shapeAP} stamina more for its preferred shape.</li>
        <li><b>Lay off</b> a card that extends a founded Charter: ${o.layoffAP} stamina on someone else's (its owner gets 1 resource), ${o.ownLayoffAP} on your own.</li>
        <li>A Charter nobody lays off on for ${o.life} rounds <b>lapses</b>, and its cards go back into the deck. A Renew spell keeps it going.</li>
        <li>When the town is crowded, with ${o.crowdLapse} or more Charters founded, they last a round less.</li>
        <li>If the deck and the discard pile both run out, the Charter left alone longest lapses at once, to fill the deck again.</li>
        <li>A <b>Glamour</b> can stand in for one card in a new meld, but that meld earns no shape bonus.</li>
        <li>Each game deals 12 of the town's 20 Charters, 3 for each resource, so the guilds differ from game to game. With four players it deals 16, and the deck holds a third copy of each spell.</li></ul>`)}
      ${sec("Characters", `<p>Each character favours one kind of quest, which scores them ${o.favourBonus} extra renown, and has a perk of their own.</p>
        <ul>${CHARACTERS.map(c => `<li><b>${c.name}</b> favours ${TYPES[c.favour]}. <b>${PERKS[c.perk].name}.</b> ${perkTxt(c.perk, false)}</li>`).join("")}</ul>
        <p>Each also holds a <b>personal quest</b> (marked <span class="qbadge personal">★</span>) from the start, outside the quest limit. Completing it <b>empowers</b> their perk for the rest of the game:</p>
        <ul>${CHARACTERS.map(c => `<li><b>${c.name}</b>, <i>${PERSONAL[c.perk].name}</i>. <b>${EMPOWERED[c.perk].name}.</b> ${perkTxt(c.perk, false, true)}</li>`).join("")}</ul>`)}
      ${sec("Spells", `<p>One spell a turn (Magister Orrin may cast two), after your draws. Select it and press <b>Cast</b>. A Glamour counts when you meld it.</p>
        <p>Your turn ends with a discard, so you can't play your last card. A Scry or a Recall may be your last card, though, as it brings cards back.</p>
        <ul>${Object.values(SPELLS).map(s => `<li><b>${s.name}:</b> ${s.text}</li>`).join("")}</ul>`)}
      ${sec("The town", `<ul><li>Market: Gold. Forge: Steel. Temple: Faith. Library: Lore.</li><li>Tavern: take a quest. You can hold ${o.questLimit}. Or pay 1 stamina there for fresh quests on offer.</li><li>Harbour: trade 1 resource for another.</li>
        <li>From anywhere, pay 1 stamina to replace the Charters on offer with fresh ones.</li>
        <li>Each round brings a <b>town event</b>, on the notice at the top right. It holds for everyone that round:</li></ul>
        <ul class="events">${EVENTS.map(e => `<li><b>${e.name}:</b> ${e.text}</li>`).join("")}</ul>`)}
      ${sec("Quests and limits", `<ul><li>Hand in one quest a turn, after your discard.</li>
        <li>Completing a quest draws you cards: 1 for a small quest (3 resources or fewer), 2 for one needing 4 or 5, and 3 for one needing 6 or more. They stop when you hold ${o.questCardCap || "any number of"} cards.</li><li>Your character's favourite kind of quest scores ${o.favourBonus} extra renown.</li>
        <li>A <b>sealed commission</b> waits at the Tavern. What it needs stays hidden until you take it, and it pays about a quarter more.</li>
        <li><b>Sagas</b> (marked <span class="qbadge">Part 1/3</span>) come in three parts. Completing one hands you the next, worth more but of a different kind.</li>
        <li>The quest on offer longest leaves the Tavern at the start of each round.</li>
        <li>Holding ${o.questLimit} quests? Take another at the Tavern by tearing one up.</li>
        <li>At the end of your turn you keep at most ${o.handLimit} cards and ${o.resCap} resources.</li>
        <li><b>Underdog's luck</b> (an option in New game): whoever is alone in last place draws a card at the start of their turn, from round 2, and their quests score up to 2 more renown, never taking them past the leader.</li></ul>`)}
      ${sec("Help on the table", `<ul><li>Click any Charter, quest, player or the chronicle to see it in full.</li><li><b>Hint</b> (or the H key) shows what a strong player would do now.</li>
        <li>Settings (the cog, or the start screen) changes the text size. Drag the tutorial and question boxes out of the way.</li>
        <li>Hold <b>V</b> to see the whole town without the panels.</li></ul>`)}
      <div class="btns"><button class="btn" id="b-back">Got it</button></div>`);
    $("panel").querySelectorAll(".acc-h").forEach(h => h.onclick = () => {
      const a = h.parentElement, was = a.classList.contains("open");
      $("panel").querySelectorAll(".acc").forEach(x => x.classList.remove("open"));
      if (!was) a.classList.add("open");
    });
    $("b-back").onclick = back;
  }

  async shareGame() {
    $("share-status").textContent = "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Drakeharbour Syndicates", text: "Charters, quests and cards in a guild town. Play Drakeharbour Syndicates.", url: GAME_URL });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    await this.copyGameLink();
  }

  async copyGameLink() {
    try {
      await navigator.clipboard.writeText(GAME_URL);
      $("share-link").hidden = true;
      $("share-status").textContent = "Link copied. Share it with a friend!";
      $("b-copy-link").textContent = "Copied!";
    } catch (error) {
      const link = $("share-link");
      link.value = GAME_URL;
      link.hidden = false;
      link.focus();
      link.select();
      $("share-status").textContent = "Copy the link above to share.";
    }
  }

  showMoreGames() {
    const games = [
      { key: "artifact", devices: "Mobile & desktop", title: "Artifact", description: "Tactical space rummy. Collect planet cards and steer a probe to discover alien artifacts, playing against up to three computer opponents." },
      { key: "oh-hell-extended", devices: "Mobile & desktop", title: "Oh Hell! Extended", description: "Bid your tricks, then win exactly that many. Play classic Oh Hell or add Suns, Moons, Dragons and Jokers, against up to four computer opponents." },
      { key: "german-whist", devices: "Desktop", image: "german-whist-v2", title: "German Whist", description: "Build your hand, then battle for tricks in this classic two-player card game. Choose from three computer skill levels." }
    ];
    this.panel(`<h2>More card games</h2><p class="games-intro">Other games by BugVictim.</p>
      <div class="other-games">${games.map(game => `<article class="other-game">
        <div class="game-picture ${game.key}"><img src="img/more-games-${game.image || game.key}.webp" alt="${game.title} artwork"></div>
        <h3>${game.title}</h3><span class="game-devices">${game.devices}</span><p>${game.description}</p>
        <a class="btn parch" href="https://bug-victim.itch.io/${game.key}" target="_blank" rel="noopener noreferrer" aria-label="Play ${game.title} on itch.io (opens in a new tab)">Play on itch.io</a>
      </article>`).join("")}</div>
      <p class="games-share">Please share with your friends if you enjoy.</p>
      <div class="games-bottom"><small>Links open in a new tab.</small><button class="btn parch" id="b-back">Back</button></div>`, "", "games");
    $("b-back").onclick = () => this.closePanel();
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
      const left = g.roundsLeft(ch), ext = extenders(g, ch);
      rows.push([fadeRing(left, g.life(), "span"), left <= 0 ? "<b>Lapses</b> at its owner's next turn unless someone lays off on it." : `Lapses in <b>${plural(left, "round")}</b> if nobody lays off on it.${g.life() < g.o.life ? " The town is crowded, so Charters last a round less." : ""}`]);
      rows.push(["buy", ext.length ? `Lay off: <b>${ext.join(" or ")}</b>. ${ch.owner === 0 ? `+${g.o.ownLayoffAP} stamina${g.power(0, "tithe") ? ` and 1 ${RES[d.res]} (Great Tithe)` : ""} for you.` : `+${g.o.layoffAP + (g.ev("feast") ? 1 : 0)} stamina for you, ${g.ownerGift(ch.owner)} ${RES[d.res]} for its owner${g.perkOf(ch.owner) === "tithe" ? " (Tithe)" : ""}.`}` : "Nothing more can be laid off on it."]);
    }
    this.panel(`<div class="lens-head">${tok(d.res)}<h2>${d.name}</h2></div>
      <div class="facts">${rows.map(([k, t]) => `${k.startsWith("<") ? k : ic(k)}<div>${t}</div>`).join("")}</div>
      <div class="lens-cards" id="lens-cards"></div><div class="close-hint">Click anywhere to close</div>`, "lens");
    if (ch) ch.cards.slice().sort((a, b) => a.r - b.r || a.s - b.s).forEach(c => $("lens-cards").appendChild(cardEl(c, "md")));
  }

  lensQuest(q) {
    const g = this.view || this.g, me = g.players[0], fav = q.type === me.character.favour;
    this.panel(`<div class="lens-head"><span class="seal">${ic(TYPEKEY[q.type])}</span><h2>${q.name}</h2></div>
      ${q.flavour ? `<p class="flavour">${q.flavour}</p>` : ""}
      <div class="facts">${ic(TYPEKEY[q.type])}<div>${/^[AEIOU]/.test(TYPES[q.type]) ? "An" : "A"} <b>${TYPES[q.type]}</b> quest.${fav ? ` Your favourite kind: <b>+${g.o.favourBonus} renown</b>.` : ""}</div>
      ${ic("quest")}<div>Needs ${needTxt(q.need)} &nbsp;·&nbsp; you have ${needTxt(me.res) || "nothing"}</div>
      ${ic("renown")}<div>Worth <b>${q.pts + (fav ? g.o.favourBonus : 0)} renown</b>. Hand it in after your discard.</div>
      ${g.questCards(q) ? `${cardFan(g.questCards(q), "big")}<div>${g.questCards(q) === 1 ? "Completing it draws you <b>a card</b>" : `Completing it draws you up to <b>${g.questCards(q)} cards</b>`}${g.o.questCardCap ? `, while you hold fewer than ${g.o.questCardCap}` : ""}.</div>` : ""}
      ${q.saga != null ? `${ic("quest")}<div>Part <b>${q.part + 1} of 3</b> of the saga <i>${SAGAS[q.saga].name}</i>. ${q.part < 2 ? "Completing it hands you the next part." : "The last part."}</div>` : ""}
      ${q.sealed ? `${ic("seal")}<div>A <b>sealed commission</b>, worth more than an open quest of its size.</div>` : ""}
      ${q.personal ? (() => { const o = g.players.findIndex(x => x.personal === q), k = o >= 0 && g.perkOf(o); return k ? `<span class="star">★</span><div>${o === 0 ? "Your" : "Their"} <b>personal quest</b>, outside the quest limit. Completing it empowers ${o === 0 ? "your" : "their"} perk, ${PERKS[k].name}, into <b>${EMPOWERED[k].name}</b>: ${perkTxt(k, o === 0, true).replace(/^./, x => x.toLowerCase())}</div>` : ""; })() : ""}</div>
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
    this.panel(`<div class="lens-head"><div class="portrait${g.power(p) ? " emp" : ""}" style="--pc:${PCOL[p]};width:60px;height:60px;position:relative;flex:none">${face(pl.character.name)}</div>${ART.has(CHARKEY[pl.character.name]) ? `<div class="lens-arms">${arms(pl.character.name)}</div>` : ""}<h2>${pl.character.name}</h2></div>
      <div class="facts">${ic(TYPEKEY[pl.character.favour])}<div><i>${pl.character.title}</i>. Favours <b>${TYPES[pl.character.favour]}</b> quests.</div>
      ${g.perkOf(p) ? `${ic(PERK_IC[g.perkOf(p)])}<div><b>${PERKS[g.perkOf(p)].name}.</b> ${perkTxt(g.perkOf(p), p === 0)}</div>` : ""}
      ${g.power(p) ? `<span class="star">★</span><div><b>${EMPOWERED[g.perkOf(p)].name}.</b> ${perkTxt(g.perkOf(p), p === 0, true)}</div>`
        : pl.personal ? `<span class="star dim">★</span><div>Personal quest: <b>${pl.personal.name}</b> ${needTxt(pl.personal.need)}. Completing it empowers ${p === 0 ? "your" : "their"} perk into <b>${EMPOWERED[g.perkOf(p)].name}</b>.</div>` : ""}
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
    const g = new RiverGame({ players: this.opponents + 1, you: this.you || null, target: this.target || 100, personal: this.personal !== false, underdog: !!this.underdog });
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
  // What each player has done this game, for the awards at the end.
  count(p, k) { if (this.tally && this.tally[p]) this.tally[p][k] = (this.tally[p][k] || 0) + 1; }
  saveGame() {
    const g = this.g;
    if (!g || this.tut || g.over) return;
    const data = { v: SAVE_VERSION, level: this.level, lines: this.lines.slice(-150), tally: this.tally, g: {} };
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
    g.players.forEach(pl => { if (pl.character.name === "Ser Aldric") pl.character = Object.assign({}, pl.character, { name: "Sir Aldric" }); });
    this.level = data.level || this.level;
    this.begin(g, null, data.lines, data.tally);
  }

  begin(g, ais = null, lines = null, tally = null) {
    $("stage").classList.remove("idle");
    this.g = g;
    this.tally = tally && tally.length === g.players.length ? tally : g.players.map(() => ({}));
    PCOL = g.players.map(pl => CHAR_COL[pl.character.name]);
    PKEY = g.players.map(pl => CHARKEY[pl.character.name]);
    // Easy: rules of thumb; Normal: a short look ahead (wins ~39% at 3 players against Easy ones); Hard: a longer one (~43%)
    const opponent = { hard: () => RiverAI.planner({ worlds: 8 }), normal: () => RiverAI.planner({ worlds: 2, rounds: 1 }) }[this.level] || (() => RiverAI.greedy());
    this.ais = ais || [null].concat(g.players.slice(1).map(opponent));
    this.lines = lines ? lines.slice() : [];
    this.events = [];
    this.aiSays = null;
    this.shownEvent = null;
    this.cancelNight();
    this.clearAnnounce();
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
      const pk = g.perkOf(0);
      this.log(`You are <b>${me.character.name}</b>, ${me.character.title}. You favour ${TYPES[me.character.favour]} quests.${pk ? ` Your perk is <b>${PERKS[pk].name}</b>. ${perkTxt(pk, true)}` : ""}`);
      if (me.personal) this.log(`Your personal quest is <i>${me.personal.name}</i>. Complete it to empower your perk into <b>${EMPOWERED[pk].name}</b>.`);
      if (g.o.target !== 100) this.log(`The first to <b>${g.o.target} renown</b> ends the game.`);
      if (g.event) this.log(`<b>Round 1.</b> Town event: <b>${g.event.name}</b>. ${g.event.text}`);
    }
    this.nextTurn();
  }

  log(t) { this.lines.push(t); if (this.lines.length > 300) this.lines.shift(); }
  // A player's name in the chronicle, with a dot of their colour.
  nameTag(p) { return `<b class="who" style="--pc:${PCOL[p]}">${this.pname(p)}</b>`; }
  // Runs of the same move by the same player in one turn read as one line in the chronicle: walking on
  // through a place, working a place twice, drawing or buying two cards. Returns how this event joins in.
  mergeable(e) {
    const p = e.p, tc = e.snap.turnCount, N = this.nameTag(p), a = e.args;
    const list = xs => (xs.length > 1 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : xs[0]);
    const times = n => (n === 2 ? "twice" : n === 3 ? "three times" : `${n} times`);
    if (e.fn === "move") return { key: `move:${p}:${tc}`, item: a[1],
      text: s => `${N} walked to the ${PLACES[s.items[s.items.length - 1]]}${s.items.length > 1 ? `, by way of the ${list(s.items.slice(0, -1).map(i => PLACES[i]))}` : ""}.` };
    if (e.fn === "work" && e.pre.pl[p].pos === HARBOUR) {
      // trades at the Harbour in one turn: "traded 3 Lore for 3 Gold", or each pair in turn
      const [give, get] = a[1], n = e.snap.players[p].res[get] - e.pre.pl[p].res[get], k = e.snap.perkOf(p);
      const why = n > 1 && !e.snap.ev("harbour") && k === "tongue" ? (e.snap.power(p) ? EMPOWERED[k].name : PERKS[k].name) : "";
      return { key: `trade:${p}:${tc}`, item: { give, get, n, why },
        text: s => {
          const pairs = [];
          for (const it of s.items) { const q = pairs.find(x => x.give === it.give && x.get === it.get); if (q) { q.out++; q.in += it.n; } else pairs.push({ give: it.give, get: it.get, out: 1, in: it.n }); }
          const why = [...new Set(s.items.map(it => it.why).filter(Boolean))];
          return `${N} traded ${list(pairs.map(x => `${x.out} ${RES[x.give]} for ${x.in} ${RES[x.get]}`))}${why.length ? ` (${why.join(", ")})` : ""}.`;
        } };
    }
    if (e.fn === "work") {
      const sp = e.pre.pl[p].pos, r = PRODUCES[sp];
      if (r < 0) return null;
      const got = e.snap.players[p].res[r] - e.pre.pl[p].res[r];
      const base = e.snap.o.workYield + (e.snap.event && e.snap.event.place === sp ? 1 : 0), k = e.snap.perkOf(p);
      const why = s => (sp === FORGE && k === "forge" && s.items.some(x => x > base) ? ` (${e.snap.power(p) ? EMPOWERED[k].name : PERKS[k].name})` : "");
      return { key: `work:${p}:${tc}:${sp}`, item: got,
        text: s => `${N} worked the ${PLACES[sp]}${s.items.length > 1 ? " " + times(s.items.length) : ""}: +${s.items.reduce((x, y) => x + y, 0)} ${RES[r]}${why(s)}.` };
    }
    if ((e.fn === "draw" || e.fn === "buy") && a[1] !== "discard" && e.r) {
      const verb = e.fn === "draw" ? "drew" : "bought";
      return { key: `${e.fn}:${p}:${tc}`, item: e.r,
        text: s => (p === 0 ? `${N} ${verb} ${list(s.items.map(cardTxt))}.` : `${N} ${verb} ${s.items.length === 1 ? "a card" : s.items.length === 2 ? "two cards" : s.items.length + " cards"}.`) };
    }
    return null;
  }

  // Record every move made on the real game: a short description and a snapshot.
  watch(g) {
    const app = this;
    const N = p => app.nameTag(p);
    const whose = p => (p === 0 ? "your" : app.pname(p) + "'s");
    const wrap = (fn, describe) => {
      const orig = RiverGame.prototype[fn];
      g[fn] = function (...a) {
        const pre = { turn: g.turn, round: g.round, ended: g.endTriggered, ap: g.t ? g.t.ap : 0, pl: g.players.map(x => ({ res: x.res.slice(), hand: x.hand.slice(), quests: x.quests.slice(), pos: x.pos, personal: x.personal })), charters: g.charters.map(ch => ({ id: ch.id, owner: ch.owner, def: ch.def, cards: ch.cards.slice() })) };
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
    wrap("found", (pre, [p], r) => (app.count(p, "found"), "") + `${N(p)} founded the <i>${r.ch.def.name}</i>${r.ch.cards.some(c => c.spell) ? " with a Glamour" : ""}: +${g.t.ap - pre.ap} stamina, +${r.ch.cards.length * g.o.meldRenown} renown.`
      + ((g.lastSpellDraw || []).length ? (p === 0 ? ` Spellbound drew you ${cardTxt(g.lastSpellDraw[0])}.` : " Spellbound drew them a card.") : ""));
    wrap("layoff", (pre, [p, id, chId]) => {
      const c = pre.pl[p].hand.find(x => x.id === id), ch = pre.charters.find(x => x.id === chId);
      if (ch.owner === p) return `${N(p)} laid ${cardTxt(c)} on ${p === 0 ? "your" : "their"} own <i>${ch.def.name}</i>: +${g.t.ap - pre.ap} stamina${g.power(p, "tithe") ? `, and 1 ${RES[ch.def.res]}` : ""}.`;
      app.count(p, "lay");
      return `${N(p)} laid ${cardTxt(c)} on ${whose(ch.owner)} <i>${ch.def.name}</i>: +${g.t.ap - pre.ap} stamina, and ${g.ownerGift(ch.owner)} ${RES[ch.def.res]} for ${ch.owner === 0 ? "you" : app.pname(ch.owner)}.`;
    });
    wrap("cast", (pre, [p, id, arg], got) => {
      const k = pre.pl[p].hand.find(x => x.id === id).spell, nm = `<b>${SPELLS[k].name}</b>`;
      app.count(p, "cast");
      // Spellbound's card is the last one the spell brought
      const cards = got.slice(), bound = g.power(p, "grimoire") && cards.length > (k === "scry" ? g.o.scryDraw || 2 : k === "recall" ? 1 : 0) ? cards.pop() : null;
      const more = bound ? ` ${p === 0 ? `Spellbound drew you ${cardTxt(bound)}` : "Spellbound drew them a card"}.` : "";
      return describeCast() + more;
      function describeCast() {
      if (k === "blink") return `${N(p)} cast ${nm} and appeared at the ${PLACES[arg]}.`;
      if (k === "scry") return `${N(p)} cast ${nm}: ${p === 0 ? `drew ${cards.map(cardTxt).join(" and ")}` : "two cards"}.`;
      if (k === "recall") return `${N(p)} cast ${nm} and took ${cardTxt(cards[0])} from the discard pile.`;
      if (k === "haggle") return `${N(p)} cast ${nm}: prices start again.`;
      return `${N(p)} cast ${nm}: the <i>${pre.charters.find(x => x.id === arg).def.name}</i> is renewed.`;
      }
    });
    wrap("buy", (pre, [p, from], c) => (from === "discard" && c ? `${N(p)} bought ${cardTxt(c)} from the discard pile.` : p === 0 && c ? `${N(0)} bought ${cardTxt(c)}.` : `${N(p)} bought a card.`));
    wrap("move", (pre, [p, dest]) => `${N(p)} walked to the ${PLACES[dest]}.`);
    wrap("refreshQuests", (pre, [p]) => `${N(p)} paid 1 stamina for fresh quests at the Tavern.`);
    wrap("refreshCharters", (pre, [p]) => `${N(p)} paid 1 stamina for fresh Charters on offer.`);
    wrap("work", (pre, [p, arg]) => {
      const sp = pre.pl[p].pos, pl = g.players[p];
      if (PRODUCES[sp] >= 0) return `${N(p)} worked the ${PLACES[sp]}: +${g.players[p].res[PRODUCES[sp]] - pre.pl[p].res[PRODUCES[sp]]} ${RES[PRODUCES[sp]]}.`;
      if (sp === TAVERN) {
        const before = new Set(pre.pl[p].quests.map(q => q.id)), took = pl.quests.find(q => !before.has(q.id)), torn = pre.pl[p].quests.find(q => !pl.quests.includes(q));
        return `${N(p)} ${torn ? `tore up <i>${torn.name}</i> and ` : ""}took ${took.sealed ? "the sealed commission" : "the quest"} <i>${took.name}</i>.`;
      }
      const n = g.players[p].res[arg[1]] - pre.pl[p].res[arg[1]], k = g.perkOf(p);
      return `${N(p)} traded 1 ${RES[arg[0]]} for ${n} ${RES[arg[1]]}${n > 1 && !g.ev("harbour") && k === "tongue" ? ` (${g.power(p) ? EMPOWERED[k].name : PERKS[k].name})` : ""}.`;
    });
    wrap("discardCard", (pre, [p, id]) => `${N(p)} discarded ${cardTxt(pre.pl[p].hand.find(x => x.id === id))}.`);
    wrap("handIn", (pre, [p, qi], ok) => {
      if (!ok) return [];
      const q = qi === "personal" ? pre.pl[p].personal : pre.pl[p].quests[qi], fav = q.type === g.players[p].character.favour;
      const drew = g.lastDrawn || [], got = !drew.length ? "" : p === 0 ? `, and drew ${drew.map(cardTxt).join(" and ")}` : `, and drew ${plural(drew.length, "card")}`;
      const out = [`${N(p)} completed <i>${q.name}</i>: +${q.pts + (fav ? g.o.favourBonus : 0)} renown${got}.${g.lastNext ? ` <i>${SAGAS[q.saga].name}</i> continues: <i>${g.lastNext.name}</i>.` : ""}`];
      if (g.lastLuckRenown) out.push(`<span class="faint">Underdog's luck: +${g.lastLuckRenown} renown.</span>`);
      if (qi === "personal") { const k = g.perkOf(p); out.push(`<b>★ ${p === 0 ? "Your" : app.pname(p) + "'s"} ${PERKS[k].name} grows into ${EMPOWERED[k].name}.</b> ${perkTxt(k, p === 0, true)}`); }
      if (g.endTriggered && !pre.ended) out.push(`<b class="final">${p === 0 ? "You have" : app.pname(p) + " has"} ${g.score(p)} renown: this is the final round.</b>`);
      return out;
    });
    wrap("endTurn", (pre, [p]) => {
      const out = [];
      if (g.turn === 0 || g.over) g.players.forEach((_, q) => { const t = app.tally && app.tally[q]; if (t) (t.hist = t.hist || []).push(g.score(q)); });
      const lost = pre.pl[p].res.reduce((a, b) => a + b, 0) - g.players[p].res.reduce((a, b) => a + b, 0);
      if (lost > 0) out.push(`<span class="faint">${app.pname(p)} gave up ${plural(lost, "resource")} over the limit.</span>`);
      if (g.over) return out;
      if (g.newEvent) out.push(`<b>Round ${g.round}.</b> Town event: <b>${g.newEvent.name}</b>. ${g.newEvent.text}`);
      if (g.lastExpired) out.push(`<span class="faint"><i>${g.lastExpired.name}</i> left the Tavern.</span>`);
      for (const ch of g.lastFaded || []) out.push(`<span class="faint">${whose(ch.owner).replace(/^y/, "Y")} <i>${ch.def.name}</i> lapsed.</span>`);
      const rent = (g.lastRent || []).map((n, r) => (n ? `+${n} ${RES[r]}` : "")).filter(Boolean);
      if (rent.length) out.push(`<span class="faint">${whose(g.turn).replace(/^y/, "Y")} Charters paid ${rent.join(", ")}.</span>`);
      if (g.lastLuck) out.push(`<span class="faint">Underdog's luck: ${g.turn === 0 ? `you draw ${cardTxt(g.lastLuck)}` : `${app.pname(g.turn)} draws a card`}.</span>`);
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

  // A perk at work: its name floats up for a moment from where it made a difference.
  // (base: it was the plain perk at work, even though it has since been empowered)
  perkFlash(at, g, p, delay = 0, base = false) {
    const k = g.perkOf(p);
    if (!at || !k) return;
    const name = g.power(p) && !base ? `★ ${EMPOWERED[k].name}` : PERKS[k].name;
    setTimeout(() => {
      const f = document.createElement("div");
      f.className = "perkflash";
      f.textContent = name;
      Sfx.perk();
      Object.assign(f.style, { left: at.cx + "px", top: (at.cy - 30) + "px" });
      $("stage").appendChild(f);
      setTimeout(() => f.remove(), 1700);
    }, delay * SPEED);
  }

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
    const arrive = (x, open, from, delay = 0, who = p) => {
      if (who === 0) { fx.hide.add(x.id); F.push({ make: () => cardEl(x), from, toFn: () => this.handCard(x.id), delay }); return; }
      fx.fanIn[who] = (fx.fanIn[who] || 0) + 1;
      F.push({ make: () => (open ? cardEl(x) : backEl()), from, toFn: () => this.seatAnchor(who), delay, land: () => { this.fx.fanIn[who]--; this.renderOpps(this.view || this.g); this.updateCounts(); } });
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
        // a Glamour cast by a Spellbound player draws them a card
        { const had = new Set(e.pre.pl[p].hand.map(x => x.id)), extra = e.snap.players[p].hand.filter(x => !had.has(x.id));
          extra.forEach((x, n) => arrive(x, false, deckBox(), 420 + n * 100));
          if (extra.length) this.perkFlash(p === 0 ? deckBox() : this.box(this.seat(p)), e.snap, p, 450); }
        break;
      }
      case "layoff": {
        const [, id, chId] = e.args;
        const c = e.pre.pl[p].hand.find(x => x.id === id), ch = e.pre.charters.find(x => x.id === chId);
        fx.hide.add(id);
        F.push({ make: () => cardEl(c), from: this.fromHand(p, id), toFn: () => this.q(`.charter[data-id="${chId}"] .card[data-id="${id}"]`) });
        const gift = e.snap.players[ch.owner].res[ch.def.res] - e.pre.pl[ch.owner].res[ch.def.res];
        for (let k = 0; k < gift; k++) token(ch.owner, ch.def.res, null, { fromFn: () => this.box(this.q(`.charter[data-id="${chId}"] .yield .tok`)), delay: 240 + k * 130 });
        if (e.snap.perkOf(ch.owner) === "tithe" && gift > (ch.owner === p ? 0 : e.snap.o.ownerBonus)) this.perkFlash(this.box(this.q(`.charter[data-id="${chId}"]`)), e.snap, ch.owner, 200, ch.owner !== p);
        break;
      }
      case "cast": {
        const [, id, arg] = e.args, c = e.pre.pl[p].hand.find(x => x.id === id), k = c.spell;
        toDiscard(c);
        { const drew = e.snap.players[p].hand.length - (e.pre.pl[p].hand.length - 1) - (k === "scry" ? e.snap.o.scryDraw || 2 : k === "recall" ? 1 : 0);
          if (e.snap.perkOf(p) === "grimoire" && (drew > 0 || e.snap.t.spells > 1)) this.perkFlash(p === 0 ? deckBox() : this.box(this.seat(p)), e.snap, p, 250, drew <= 0); }
        Sfx.spell();
        if (k === "blink") {
          Sfx.whoosh();
          fx.pawn = p;
          F.push({ make: () => pawnEl(p), from: this.box(this.q(`.place[data-sp="${e.pre.pl[p].pos}"] .pawn[data-p="${p}"]`)), toFn: () => this.q(`.place[data-sp="${arg}"] .pawn[data-p="${p}"]`), ms: 560, delay: 120, quiet: true });
        } else if (k === "renew") fx.flash = arg;
        // Scry's cards come off the deck, Recall's off the discard pile, and Spellbound's card off the deck
        const before = new Set(e.pre.pl[p].hand.map(x => x.id));
        e.snap.players[p].hand.filter(x => !before.has(x.id)).forEach((x, n) => arrive(x, k === "recall" && n === 0, k === "recall" && n === 0 ? discBox() : deckBox(), 180 + n * 100));
        break;
      }
      case "discardCard":
        toDiscard(e.pre.pl[p].hand.find(x => x.id === e.args[1]));
        break;
      case "refreshQuests": fx.turnover = "qrow"; Sfx.riffle(); break;
      case "refreshCharters": fx.turnover = "offer"; Sfx.riffle(); break;
      case "move":
        if (e.args[1] !== SQUARE && e.snap.t.ap === e.pre.ap && e.snap.power(p, "shortcut")) this.perkFlash(this.box(this.q(`.place[data-sp="${e.args[1]}"] .medal`)), e.snap, p, 200);
        fx.pawn = p;
        F.push({ make: () => pawnEl(p), from: this.box(this.q(`.place[data-sp="${e.pre.pl[p].pos}"] .pawn[data-p="${p}"]`)), toFn: () => this.q(`.place[data-sp="${e.args[1]}"] .pawn[data-p="${p}"]`), ms: 280 });
        break;
      case "work": {
        const sp = e.pre.pl[p].pos, m = this.box(this.q(`.place[data-sp="${sp}"] .medal`));
        if (sp === TAVERN) (e.args[1] === "sealed" ? Sfx.crack() : Sfx.mug());
        else ({ [MARKET]: () => Sfx.coins(), [FORGE]: () => Sfx.anvil(), [TEMPLE]: () => Sfx.templeBell(), [LIBRARY]: () => Sfx.page(), [HARBOUR]: () => Sfx.harbour() })[sp]();
        const at = m && { cx: m.cx, cy: m.cy, w: 30, h: 30 };
        if (PRODUCES[sp] >= 0) {
          const r = PRODUCES[sp], got = e.snap.players[p].res[r] - e.pre.pl[p].res[r];
          for (let k = 0; k < got; k++) token(p, r, at, { delay: k * 130 });
          const base = e.snap.o.workYield + (e.snap.event && e.snap.event.place === sp ? 1 : 0);
          if (sp === FORGE && got > base && e.snap.perkOf(p) === "forge") this.perkFlash(at, e.snap, p, 120);
        }
        else if (sp === HARBOUR) {
          const [give, get] = e.args[1], n = e.snap.players[p].res[get] - e.pre.pl[p].res[get];
          F.push({ make: () => tokEl(give), from: this.box(this.resTok(p, give)), to: at, ms: 400 });
          for (let k = 0; k < n; k++) token(p, get, at, { delay: 380 + k * 130 });
          if (n > 1 && !e.snap.ev("harbour") && e.snap.perkOf(p) === "tongue") this.perkFlash(at, e.snap, p, 300);
        } else if (sp === TAVERN) {
          const arg = e.args[1], qs = e.snap.players[p].quests, qq = qs[qs.length - 1];
          const src = arg === "sealed" ? this.q("#qsealed .quest") : arg != null && arg >= 0 ? this.q("#qrow").children[arg] : this.q("#qmore");
          fx.quest = p;
          F.push({ make: () => this.questEl(qq, null, "strip"), from: this.box(src), toFn: () => (p === 0 ? [...this.q("#my-quests").querySelectorAll(".quest")].pop() : this.q(`#opps .seat[data-p="${p}"] .qs`).lastElementChild), ms: 460 });
          // a quest torn up to make room goes back to the Tavern
          const ti = e.pre.pl[p].quests.findIndex(q => !qs.includes(q));
          if (ti >= 0 && p === 0) F.push({ make: () => this.questEl(e.pre.pl[p].quests[ti], null, "strip"), from: this.box(this.q("#my-quests").querySelectorAll(".quest:not(.personal)")[ti]), toFn: () => this.q("#qmore"), ms: 420, quiet: true });
        }
        break;
      }
      case "handIn": {
        if (!e.r) break;
        const qi = e.args[1], own = qi === "personal", q = own ? e.pre.pl[p].personal : e.pre.pl[p].quests[qi];
        fx.renown[p] = q.pts + (q.type === e.snap.players[p].character.favour ? e.snap.o.favourBonus : 0);
        const land = () => { this.fx.renown[p] = 0; this.updateCounts(); this.pop(this.renownIc(p)); Sfx.fanfare(); };
        if (p === 0) {
          F.push({ make: () => this.questEl(q, null, "strip"), from: this.box(own ? this.q("#my-quests .quest.personal") : this.q("#my-quests").querySelectorAll(".quest:not(.personal)")[qi]), toFn: () => this.renownIc(0), ms: 520, land, quiet: true });
        } else {
          const s = this.box(this.seat(p)), icon = own ? this.q(`#opps .seat[data-p="${p}"] .qs .personal`) : this.q(`#opps .seat[data-p="${p}"] .qs`).querySelectorAll(".ic:not(.personal)")[qi];
          F.push({ make: () => { const d = this.questEl(q, null, "card-q"); d.classList.add("show"); return d; }, from: this.box(icon) || s, via: s && { cx: s.cx, cy: s.cy + 160, w: 184, h: 102 }, hold: 750, toFn: () => this.renownIc(p), ms: 400, land, quiet: true });
        }
        // a perk empowered: proclaimed once the quest has landed
        if (own) setTimeout(() => this.proclaimPower(p), (p === 0 ? 900 : 1900) * SPEED);
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
          if (e.snap.lastLuck) arrive(e.snap.lastLuck, false, deckBox(), 300, nx);
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
      // Finish the old day before rendering the new event, rent, and refreshed Tavern.
      if (e.fn === "endTurn" && e.snap.round > e.pre.round && !e.snap.over) {
        await this.passNight(g);
        if (this.g !== g) return;
      }
      Sfx.dim = e.p !== 0;
      const m = this.mergeable(e), L = this.lastMerge;
      if (m && L && L.key === m.key && this.lines[this.lines.length - 1] === L.line) {
        L.items.push(m.item);
        L.line = this.lines[this.lines.length - 1] = m.text(L);
        e.texts.slice(1).forEach(t => this.log(t));
      } else {
        e.texts.forEach(t => this.log(t));
        this.lastMerge = m && e.texts.length === 1 ? { key: m.key, items: [m.item], line: this.lines[this.lines.length - 1] } : null;
        if (this.lastMerge) this.lastMerge.line = this.lines[this.lines.length - 1] = m.text(this.lastMerge);
      }
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

  // A short night between rounds. Only the scenery is tinted; the table stays readable.
  async passNight(g) {
    if (this.tut || this.titleUp() || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.cancelNight();
    const timing = { duration: 3200 * SPEED, easing: "linear" };
    const animations = [
      $("nightfall").animate([
        { offset: 0, opacity: 0, backgroundColor: "#d68340" },
        { offset: 0.2, opacity: 0.25, backgroundColor: "#9f504c" },
        { offset: 0.42, opacity: 0.72, backgroundColor: "#0a1635" },
        { offset: 0.58, opacity: 0.72, backgroundColor: "#0a1635" },
        { offset: 0.8, opacity: 0.2, backgroundColor: "#e7b271" },
        { offset: 1, opacity: 0, backgroundColor: "#e7b271" }
      ], timing),
      $("nightlights").animate([
        { offset: 0, opacity: 0 }, { offset: 0.25, opacity: 0.15 },
        { offset: 0.42, opacity: 1 }, { offset: 0.58, opacity: 1 },
        { offset: 0.8, opacity: 0.2 }, { offset: 1, opacity: 0 }
      ], timing)
    ];
    this.nightAnimations = animations;
    $("stage").classList.add("night-passing");
    try { await Promise.all(animations.map(a => a.finished.catch(() => {}))); }
    finally { if (this.nightAnimations === animations) this.cancelNight(); }
  }
  cancelNight() {
    for (const a of this.nightAnimations || []) a.cancel();
    this.nightAnimations = null;
    $("stage").classList.remove("night-passing");
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
    // a ribbon over your board for a moment
    const Y = $("yourturn");
    Y.textContent = g.endTriggered ? "Your last turn" : "Your turn";
    Y.classList.remove("on"); void Y.offsetWidth; Y.classList.add("on");
    if (g.charters.some(ch => ch.owner === 0 && g.roundsLeft(ch) <= 1)) setTimeout(() => Sfx.warn(), 550);
  }

  // ------------------------------------------------------------ your turn
  mine() { return this.g && !this.g.over && this.g.turn === 0 && !this.view && !this.playing && this.mode !== "ai"; }
  selCards() { const h = this.g.players[0].hand; return [...this.sel].map(id => h.find(c => c.id === id)).filter(Boolean); }
  allow(kind, info) { if (!this.tut) return true; if (this.tut.allows(kind, info)) return true; this.tut.nudge(); Sfx.dud(); return false; }
  // A move that can't be made: say why on the status line for a few seconds, with a dull thud.
  refuse(text) {
    Sfx.dud();
    const why = this.why = { text, sel: [...this.sel].join() };
    clearTimeout(this.whyT);
    this.whyT = setTimeout(() => { if (this.why === why) { this.why = null; this.render(); } }, 5000);
    this.render();
    const s = $("status"); s.classList.remove("refused"); void s.offsetWidth; s.classList.add("refused");
  }
  // Why the selected cards can't found a Charter just now (null when they can).
  whyNotFound(cs) {
    const g = this.g, t = meldTrouble(cs);
    if (t) return `Not a meld: ${t}`;
    if (cs.some(isWild) && g.t.spellUsed) return this.spellsDone();
    if (g.players[0].hand.length - cs.length < 1) return "That's every card you hold: <b>keep one to discard</b> and end your turn.";
    return null;
  }
  spellsDone() { return this.g.spellLimit(0) > 1 ? "You've cast both your spells this turn: the <b>Glamour</b> can wait for next turn." : "You've used your spell this turn: the <b>Glamour</b> can wait for next turn."; }
  bumpAP() { const e = $("me-ap"); e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }
  // undoable: the move showed you nothing new (no card off the deck, no quest turned over)
  async act(fn, undoable = false) {
    this.clearHint();
    this.why = null;
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
    if (this.mode === "play" && !g.canBuy(0)) {
      if (g.t.buys >= g.o.buyCap) return this.refuse(`You can buy <b>${plural(g.o.buyCap, "card")}</b> a turn, and you've bought them.`);
      return this.refuse(g.t.ap ? `A card costs <b>${g.buyPrice()} stamina</b> now, and you have ${g.t.ap}.` : "You have no stamina left to buy a card: <b>discard</b> one to end your turn.");
    }
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
    this.why = null;
    this.sel.has(c.id) ? this.sel.delete(c.id) : this.sel.add(c.id);
    Sfx.tick();
    this.render();
  }

  // A tile is a target when your selection can be played on it; otherwise clicking opens it up.
  clickOffer(di) {
    const g = this.g, cs = this.mine() ? this.selCards() : [];
    const def = (this.view || g).display[di];
    if (!def) return;
    if (this.mode !== "play" || !this.mine() || cs.length < 2) return this.lensCharter(null, def);
    const no = this.whyNotFound(cs);
    if (no) return this.refuse(no);
    if (!this.allow("found", di)) return;
    this.act(() => g.found(0, cs.map(c => c.id), di), true);
  }

  clickCharter(ch) {
    const g = this.g, cs = this.mine() ? this.selCards() : [];
    if (this.targeting && this.targeting.kind === "renew" && this.mine()) return ch.owner === 0 ? this.castAt(ch.id) : null;
    const live = g.charters.find(x => x.id === ch.id);
    if (this.mode !== "play" || !this.mine() || !cs.length || !live) return this.lensCharter(ch);
    if (cs.length > 1) return this.refuse("Lay off <b>one card at a time</b>: select just the one.");
    if (isWild(cs[0])) return this.refuse("A <b>Glamour</b> can't be laid off: it goes into a new meld.");
    if (cs[0].spell) return this.refuse(`Spells can't be laid off: <b>cast</b> the ${SPELLS[cs[0].spell].name}, or keep it.`);
    if (!fits(cs[0], live)) return this.refuse(live.kind === "set" ? `The ${cardName(cs[0])} doesn't fit there: a set takes only cards of its own rank.` : `The ${cardName(cs[0])} doesn't fit there: a run takes the next card at either end, in its suit.`);
    if (!g.canPlay(0, 1)) return this.refuse(LAST_CARD);
    if (!this.allow("layoff", ch.owner)) return;
    this.act(() => g.layoff(0, cs[0].id, ch.id), true);
  }

  refreshQuests() {
    const g = this.g;
    if (!this.mine() || this.mode !== "play") return;
    if (!g.canRefreshQuests(0)) return this.refuse(g.players[0].pos !== TAVERN ? "Fresh quests are only to be had <b>at the Tavern</b>: walk there first." : !g.qdeck.length ? "There are no more quests in the deck to bring out." : "Fresh quests cost <b>1 stamina</b>, and you have none left.");
    if (!this.allow("refresh")) return;
    this.act(() => g.refreshQuests(0));
  }
  refreshCharters() {
    const g = this.g;
    if (!this.mine() || this.mode !== "play") return;
    if (!g.canRefreshCharters(0)) return this.refuse(!g.charterDeck.length ? "There are no more Charters waiting to come out." : "Fresh Charters cost <b>1 stamina</b>, and you have none left.");
    if (!this.allow("refresh")) return;
    this.act(() => g.refreshCharters(0));
  }

  // What a place in town is for, for its tooltip.
  placeTip(g, sp) {
    const pr = PRODUCES[sp], ev = g.event && g.event.place === sp ? `<br><i>This round: ${g.event.text}</i>` : "";
    if (sp === SQUARE) return `<b>The Square</b><br>The middle of town: a step from every district. There's nothing to work here.${g.perkOf(0) === "shortcut" ? "<br>With your <b>Shortcuts</b>, stepping in is free." : ""}`;
    if (pr >= 0) return `<b>${PLACES[sp]}</b><br>Work here for ${RES[pr]}: ${sp === FORGE && g.power(0, "forge") ? "always 1 stamina for you, a <b>Master-Smith</b>, and 1 more Steel each time" : "1 stamina for your first this turn, then 2, then 3"}.`
      + (sp === FORGE && g.perkOf(0) === "forge" && !g.power(0) ? "<br>Your <b>Sworn to Steel</b>: your first work here each turn gives 1 more Steel." : "") + ev;
    if (sp === TAVERN) return "<b>The Tavern</b><br>Take a quest for 1 stamina, or the sealed commission. Pay 1 stamina for fresh quests on offer.";
    const tongue = g.perkOf(0) === "tongue" ? (g.power(0) ? "<br>Your <b>Golden Tongue</b>: every trade gives 2 for 1." : "<br>Your <b>Silver Tongue</b>: your first trade each turn gives 2 for 1.") : "";
    return `<b>The Harbour</b><br>Trade 1 resource for 1 of another, for 1 stamina a trade.${tongue}${ev}`;
  }

  // The steps from one district to another the cheapest way (round the ring road, or through the Square).
  route(from, to) {
    const g = this.g, path = [];
    for (let at = from; at !== to && path.length < 4;) {
      at = g.nextStep(0, at, to);
      if (at == null) return null;
      path.push(at);
    }
    return path;
  }

  clickPlace(sp) {
    const g = this.g, me = g.players[0];
    if (this.targeting && this.targeting.kind === "blink" && this.mine()) {
      if (sp === me.pos || !this.allow("blink-to", sp)) return;
      return this.castAt(sp);
    }
    if (!this.mine() || this.mode !== "play") return;
    if (sp !== me.pos) {
      const path = this.route(me.pos, sp), cost = g.walkCost(0, me.pos, sp);
      if (!path || !path.length) return Sfx.dud();
      if (g.t.ap < cost) return this.refuse(g.t.ap ? `Walking to the ${sp === SQUARE ? "Square" : PLACES[sp]} costs <b>${cost} stamina</b>, and you have ${g.t.ap}.` : "You have no stamina left: <b>discard</b> a card to end your turn.");
      if (!this.allow("move", sp)) return;
      return this.act(() => path.forEach(s => g.move(0, s)), true);
    }
    if (!g.canWork(0)) {
      if (sp === SQUARE) return Sfx.dud();
      if (sp === HARBOUR && !me.res.some(x => x > 0)) return this.refuse("You have nothing to trade at the Harbour.");
      if (g.t.ap < g.workCost(0)) return this.refuse(g.t.ap ? `Working the ${PLACES[sp]} now costs <b>${g.workCost(0)} stamina</b>, and you have ${g.t.ap}.` : "You have no stamina left: <b>discard</b> a card to end your turn.");
      return Sfx.dud();
    }
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
      : q.sealed ? ` <span class="qbadge" data-tip="<b>A sealed commission</b><br>It pays more than an open quest, and what it needs is revealed when it's taken.">${ic("seal")}</span>`
      : "";
    d.innerHTML = `<div class="tname"><span class="seal" data-tip="<b>${TYPES[q.type]}</b><br>The kind of quest. Each character favours one kind.">${ic(TYPEKEY[q.type])}</span>${q.personal ? `<span class="qbadge personal first">★</span>` : ""}${q.name}${badge}</div>
      <div class="needs">${q.need.map((n, r) => (n ? `<span class="need${pl && pl.res[r] < n ? " short" : ""}">${tok(r)}${n}</span>` : "")).join("")}</div>
      <div class="reward">${this.qcards(q)}${ic("renown")}${q.pts}${this.bountyTag()}</div>${fav ? `<div class="fav" data-tip="<b>Your favourite kind</b><br>+${this.g.o.favourBonus} renown when you complete it.">★</div>` : ""}`;
    return d;
  }
  // The cards a quest draws when it's completed, as a small card back with the number on it.
  qcards(q) {
    const n = this.g.questCards(q);
    const cap = this.g.o.questCardCap;
    return n ? cardFan(n, "", `<b>Draws ${plural(n, "card")}</b><br>when you complete it, if you're short of cards${cap ? ` (it stops when you hold ${cap})` : ""}. Bigger quests draw more.`) : "";
  }

  // A sealed commission as it lies at the Tavern: its reward shows, what it needs doesn't.
  sealedEl(q) {
    const d = document.createElement("div");
    d.className = "quest parchment strip sealed";
    d.innerHTML = `<div class="tname"><span class="seal">${ic("seal")}</span>A sealed commission</div><div class="needs"><span class="hidden-needs">its needs are revealed when it's taken</span></div><div class="reward">${this.qcards(q)}${ic("renown")}${q.pts}${this.bountyTag()}</div>`;
    return d;
  }
  // Bounty Night's extra renown, shown on every quest's reward while it lasts.
  bountyTag() {
    return (this.view || this.g).ev("bounty") ? `<small class="bounty" data-tip="<b>Bounty Night</b><br>Each quest completed this round scores 2 more renown.">+2</small>` : "";
  }

  askTavern() {
    const g = this.g, me = g.players[0], full = me.quests.length >= g.o.questLimit;
    this.panel(`<h2>The Tavern</h2><p>${full ? `You hold ${g.o.questLimit} quests. To take another, you'll tear one up.` : `Choose a quest. You can hold ${g.o.questLimit}.`}</p><div class="qlist" id="tq"></div><div class="btns"><button class="btn dark" id="b-fresh" ${g.canRefreshQuests(0) && g.t.ap >= 2 ? "" : "disabled"}>Fresh quests ${stCost(1)}</button><button class="btn dark" id="b-x">Cancel</button></div>`, "ask");
    $("b-fresh").onclick = async () => { if (!this.allow("refresh")) return; this.closePanel(); await this.act(() => g.refreshQuests(0)); if (this.g.canWork(0)) this.askTavern(); };
    g.qrow.forEach((q, i) => { const d = this.questEl(q, me, "strip"); d.dataset.tip = questTip(q, "Click to take it."); d.onclick = () => this.takeQuest(i); $("tq").appendChild(d); });
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
    const me = this.g.players[0], gold = this.g.power(0, "tongue"), two = this.g.ev("harbour") || this.g.t.tradeBonus || gold;
    this.panel(`<h2>The Harbour</h2><p>${give < 0 ? `Give which resource?${two ? ` This trade gives <b>2 for 1</b>${this.g.ev("harbour") ? "" : `, thanks to your <b>${gold ? "Golden" : "Silver"} Tongue</b>`}.` : ""}` : `Give 1 ${RES[give]} for ${two ? 2 : 1} of:`}</p>
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
    const can = (g.canHandIn(0, "personal") ? ["personal"] : []).concat(me.quests.map((q, i) => (g.canHandIn(0, i) ? i : -1)).filter(i => i >= 0));
    if (can.length) {
      await new Promise(res => {
        this.panel(`<h2>Hand in a quest</h2><p>You can complete one quest this turn.</p><div class="qlist" id="hq"></div><div class="btns"><button class="btn dark" id="b-no">Not now</button></div>`, "ask");
        for (const i of can) {
          const d = this.questEl(g.questAt(0, i), me, "strip");
          if (i === "personal") { d.classList.add("personal"); d.insertAdjacentHTML("beforeend", `<div class="qnote">★ and your perk grows into <b>${EMPOWERED[g.perkOf(0)].name}</b></div>`); }
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
  // The race, round by round: each player's renown at the end of every round, a line in their colour.
  raceChart(g) {
    const H = g.players.map((_, p) => [0].concat((this.tally && this.tally[p] && this.tally[p].hist) || []));
    const n = Math.max(...H.map(h => h.length));
    // (a game carried on from an older save has rounds missing: no chart then)
    if (n < 3 || H.some(h => h.length - 1 < g.round)) return "";
    const W = 560, Ht = 132, L = 30, Rt = 14, T = 10, B = 22, top = Math.max(g.o.target, ...H.flat());
    const x = i => L + (W - L - Rt) * i / (n - 1), y = v => T + (Ht - T - B) * (1 - v / top);
    const pts = h => h.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    // you last, so your line lies on top
    const order = H.map((_, p) => p).reverse();
    const lines = order.map(p => `<polyline class="under" pathLength="1" points="${pts(H[p])}"/><polyline pathLength="1" points="${pts(H[p])}" style="stroke:${PCOL[p]}"/>`
      + `<circle cx="${x(H[p].length - 1).toFixed(1)}" cy="${y(H[p][H[p].length - 1]).toFixed(1)}" r="4" style="fill:${PCOL[p]}"/>`).join("");
    const rounds = Array.from({ length: n - 1 }, (_, i) => `<text x="${x(i + 1).toFixed(1)}" y="${Ht - 6}">${i + 1}</text>`).join("");
    return `<div class="race-chart"><div class="rc-title">Renown, round by round</div>
      <svg viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}">
        <line class="goal" x1="${L}" x2="${W - Rt}" y1="${y(g.o.target).toFixed(1)}" y2="${y(g.o.target).toFixed(1)}"/>
        <text class="goal-t" x="${L - 5}" y="${(y(g.o.target) + 4).toFixed(1)}">${g.o.target}</text>
        <text class="goal-t" x="${L - 5}" y="${(y(0) + 4).toFixed(1)}">0</text>
        <g class="rounds">${rounds}</g>${lines}</svg></div>`;
  }

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
      // and as each character
      r.by = r.by || {};
      const nm = g.players[0].character.name, c = r.by[nm] = r.by[nm] || { games: 0, wins: 0 };
      c.games++;
      if (mine === top) c.wins++;
      save("record", r);
      try { localStorage.removeItem("rv_save"); } catch (e) { /* ignore */ }
    }
    this.counted = true;
    (g.final(0) === Math.max(...g.players.map((_, p) => g.final(p))) ? Sfx.victory() : Sfx.defeat());
    const rows = g.players.map((pl, p) => {
      const qp = pl.done.reduce((a, q) => a + q.pts, 0) + (pl.bounty || 0), fav = pl.done.filter(q => q.type === pl.character.favour).length * g.o.favourBonus;
      return { p, pl, qp, mp: pl.renown - qp, fav, total: g.final(p) };
    }).sort((a, b) => b.total - a.total);
    // the winner's arms and figure at the top; everyone's renown counts up, place by place
    const win = rows[0], wname = win.pl.character.name, key = CHARKEY[wname], tie = rows.length > 1 && rows[1].total === win.total;
    const title = tie ? (rows.filter(r => r.total === win.total).some(r => r.p === 0) ? "You share the win!" : "A shared win") : win.p === 0 ? "You win!" : `${wname} wins`;
    const medal = i => `<span class="place-no n${i}">${i + 1}</span>`;
    // a few titles for the game's best at each thing (shared on a tie, none for nothing)
    const T = this.tally || [], AW = [
      ["found", "Guildmaster", "Founded the most Charters"],
      ["lay", "Free Trader", "Laid off the most cards on other players' Charters"],
      ["quests", "Questing Knight", "Completed the most quests"],
      ["cast", "Spellbinder", "Cast the most spells"]
    ];
    const val = (p, k) => (k === "quests" ? g.players[p].done.length : (T[p] && T[p][k]) || 0);
    const awards = p => {
      const won = AW.filter(([k]) => { const best = Math.max(...g.players.map((_, q) => val(q, k))); return best > 0 && val(p, k) === best; });
      return won.length ? `<div class="awards">${won.map(([k, name, tip]) => `<span class="award" data-tip="<b>${name}</b><br>${tip}: ${val(p, k)}.">${name}</span>`).join("")}</div>` : "";
    };
    const num = v => `<span class="count" data-v="${v}">0</span>`;
    this.panel(`<div class="end-head">${ART.has(key) ? `<div class="end-arms">${arms(wname)}</div>` : ""}
        <div class="end-title"><div class="end-sub">after ${plural(g.round, "round")} in Drakeharbour</div><h2>${title}</h2><div class="end-sub">${win.pl.character.title}, with ${win.total} renown</div></div>
        ${ART.has(key) ? `<img class="end-fig" src="img/token-${key}.webp" alt="">` : ""}</div>
      <table class="end-table"><tr><th></th><th></th><th class="n">Quests</th><th class="n">Charters</th><th class="n">Favoured</th><th class="n">Renown</th></tr>
      ${rows.map((r, i) => `<tr class="${r.p === 0 ? "me" : ""}"><td>${medal(rows.findIndex(x => x.total === r.total))}</td>
        <td class="who"><div class="portrait${g.power(r.p) ? " emp" : ""}" style="--pc:${PCOL[r.p]}">${face(r.pl.character.name)}</div><div><b>${r.p === 0 ? "You" : r.pl.character.name}</b><br><small>${r.pl.character.title}</small>${g.power(r.p) ? `<div class="emp-name" data-tip="<b>${EMPOWERED[g.perkOf(r.p)].name}</b><br>${perkTxt(g.perkOf(r.p), r.p === 0, true)}">★ ${EMPOWERED[g.perkOf(r.p)].name}</div>` : ""}${awards(r.p)}</div></td>
        <td class="n">${num(r.qp)} <small>(${r.pl.done.length})</small>${this.questMarks(r.pl)}</td><td class="n">${num(r.mp)}</td><td class="n">${num(r.fav)}</td><td class="n total">${num(r.total)}</td></tr>`).join("")}</table>
      ${this.raceChart(g)}
      ${this.tut ? "" : this.recordLine()}
      <div class="btns"><button class="btn dark" id="b-menu">Menu</button><button class="btn" id="b-again">Play again</button></div>`);
    $("panel").classList.add("end");
    const t0 = performance.now(), els = [...$("panel").querySelectorAll(".count")];
    const tick = now => {
      const k = Math.min(1, (now - t0) / (1400 * SPEED)), e = 1 - Math.pow(1 - k, 3);
      els.forEach(el => { el.textContent = Math.round(+el.dataset.v * e); });
      if (k < 1 && document.body.contains(els[0])) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
        const goal = acts.filter(z => z.fn === "move").pop().a[1];
        text = `walk to the <b>${PLACES[goal]}</b>.`;
        targets = [`.place[data-sp="${goal}"]`];
        break;
      }
      case "work": {
        const sp = me.pos;
        text = PRODUCES[sp] >= 0 ? `work the <b>${PLACES[sp]}</b> for ${g.yieldAt(sp, 0)} ${RES[PRODUCES[sp]]}.` : sp === TAVERN ? (a.a[2] != null && me.quests[a.a[2]] ? `tear up <b>${me.quests[a.a[2]].name}</b> and ` : "") + (a.a[1] === "sealed" ? "take the <b>sealed commission</b> at the Tavern." : `take <b>${g.qrow[a.a[1]] ? g.qrow[a.a[1]].name : "a quest"}</b> at the Tavern.`) : `trade ${RES[a.a[1][0]]} for <b>${RES[a.a[1][1]]}</b> at the Harbour.`;
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
    $("final").classList.toggle("on", !!(g.endTriggered && !g.over && !g.event));
    if (this.tut) { this.tut.advance(); this.tut.decorate(); }
  }

  // The round's town event, on a notice at the top right under the buttons; it unfolds when a new one goes up.
  renderNotice(g) {
    const N = $("notice"), e = g.event;
    N.classList.toggle("on", !!e);
    if (!e) return;
    const last = !!(g.endTriggered && !g.over);
    N.classList.toggle("final", last);
    if (this.shownEvent !== e.key || this.shownEventFs !== this.fs || this.shownLast !== last || this.shownRound !== g.round) {
      this.shownRound = g.round;
      this.shownLast = last;
      N.innerHTML = `<div class="nt-cal"><svg viewBox="0 0 40 42"><rect x="2" y="5" width="36" height="35" rx="4" fill="#f8efd8" stroke="#5a2a10" stroke-width="2"/><path d="M2 9a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v6H2z" fill="#a3260f" stroke="#5a2a10" stroke-width="2"/><path d="M12 2v8M28 2v8" stroke="#3a2313" stroke-width="3" stroke-linecap="round"/></svg><b>${g.round}</b></div>`
        + `<div class="nt-body"><div class="nt-when">${last ? "Final round" : "This round"}</div><div class="nt-name">${e.name}</div><div class="nt-text">${e.text}</div></div>`;
      // a long name shrinks a little to stay on one line; a long text runs onto a second
      for (const T of N.querySelectorAll(".nt-name"))
        if (T.scrollWidth > T.clientWidth) T.style.fontSize = (parseFloat(getComputedStyle(T).fontSize) * T.clientWidth / T.scrollWidth - 0.2).toFixed(1) + "px";
      this.shownEventFs = this.fs;
      N.dataset.tip = `<b>Round ${g.round}${last ? ", the final round" : ""}: ${e.name}</b><br>${e.text}`;
      if (this.shownEvent !== e.key) this.proclaim(e, g.round);
      this.shownEvent = e.key;
    }
  }
  // A new round's event, called out in the middle of the town: it holds for a moment, then flies to its
  // notice at the top right. A click sends it there at once.
  proclaim(e, round) {
    const N = $("notice");
    this.announce(`<div class="pr-round">Round ${round} · this round only</div><div class="pr-name">${ICONS.calendar}${e.name}</div><div class="pr-text">${e.text}</div>`,
      () => Sfx.bell(), 2800, () => { N.classList.remove("fresh"); void N.offsetWidth; N.classList.add("fresh"); });
  }

  // A perk empowered: its new name and what it does, in the middle of the town for a moment.
  proclaimPower(p) {
    const g = this.g, k = g.perkOf(p);
    if (!k) return;
    this.announce(`<div class="pr-round">${p === 0 ? "Your personal quest is complete" : `${this.pname(p)} completed a personal quest`}</div><div class="pr-name">★ ${EMPOWERED[k].name}</div><div class="pr-text">${perkTxt(k, p === 0, true)}</div>`,
      () => Sfx.horn(), 2600);
  }

  // Something proclaimed in the middle of the town for a moment: one at a time, so a second waits for the first
  // (a click sends the one showing on its way).
  announce(html, sound, ms, onAway) {
    (this.prQueue = this.prQueue || []).push({ html, sound, ms, onAway });
    if (!this.prBusy) this.nextAnnounce();
  }
  nextAnnounce() {
    const a = (this.prQueue || []).shift(), P = $("proclaim");
    this.prBusy = !!a;
    if (!a) return;
    P.innerHTML = a.html;
    clearTimeout(this.prTimer);
    P.classList.remove("show", "away");
    void P.offsetWidth;
    P.classList.add("show");
    a.sound();
    let gone = false;
    const away = () => {
      if (gone) return;
      gone = true;
      clearTimeout(this.prTimer);
      P.classList.add("away");
      if (a.onAway) a.onAway();
      this.prTimer = setTimeout(() => { P.classList.remove("show", "away"); this.nextAnnounce(); }, 650);
    };
    P.onclick = away;
    this.prTimer = setTimeout(away, a.ms * SPEED);
  }
  // A new game clears anything still waiting to be proclaimed.
  clearAnnounce() {
    this.prQueue = [];
    this.prBusy = false;
    clearTimeout(this.prTimer);
    $("proclaim").classList.remove("show", "away");
  }

  // How far a player is along the race to the target renown.
  race(v, g) {
    const t = g.o.target, f = Math.max(0, Math.min(1, v / t));
    return `<div class="race${v >= t ? " done" : ""}" data-tip="<b>${v} of ${t} renown</b><br>The first to ${t} ends the game at the end of that round."><i style="width:${(100 * f).toFixed(1)}%"></i></div>`;
  }

  // Resources and renown, holding back whatever is still flying towards them.
  updateCounts() {
    const g = this.view || this.g;
    if (!g) return;
    const res = (p, r) => g.players[p].res[r] - this.fx.pend.filter(x => x.p === p && x.r === r).length;
    const ren = p => g.score(p) - (this.fx.renown[p] || 0);
    const me = g.players[0];
    $("me-res").innerHTML = [0, 1, 2, 3].map(r => `<div class="r" data-r="${r}" data-tip="<b>${RES[r]}</b><br>From the ${PLACES[PRODUCES.indexOf(r)]}, and from ${RES[r]} Charters: their rent, and lay-offs on yours. Quests need it.">${tok(r)}${res(0, r)}<small>${RES[r]}</small></div>`).join("");
    $("me-renown").innerHTML = `${ic("renown")}<span>${ren(0)}<small>renown</small></span>${this.race(ren(0), g)}`;
    const total = me.res.reduce((a, b) => a + b, 0);
    $("me-cap").innerHTML = total > g.o.resCap ? `<span class="over">${total} of ${g.o.resCap} resources: ${total - g.o.resCap} lost at turn end</span>` : `${total} of ${g.o.resCap} resources · keep ${g.o.handLimit} cards`;
    for (let p = 1; p < g.players.length; p++) {
      const s = this.seat(p);
      if (!s) continue;
      s.querySelector(".res").innerHTML = [0, 1, 2, 3].map(r => `<span data-r="${r}">${tok(r)}${res(p, r)}</span>`).join("");
      s.querySelector(".renown").innerHTML = `${ic("renown")}${ren(p)}`;
      s.querySelector(".race-at").innerHTML = this.race(ren(p), g);
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
      const qs = (pl.personal ? `<b class="personal" data-tip="<b>Personal quest</b><br>${pl.personal.name.replace(/"/g, "&quot;")}">★</b>` : "") + pl.quests.map((q, i) => `<i class="ic ic-${TYPEKEY[q.type]}${this.fx.quest === p && i === pl.quests.length - 1 ? " hidden-for-flight" : ""}"></i>`).join("");
      s.innerHTML = `<div class="fan">${fan}<div class="anchor"></div></div><div class="count">${n}</div>
        <div class="plate leather"><div class="portrait" style="--pc:${PCOL[p]}">${face(pl.character.name)}</div>
        <div class="nm">${pl.character.name}</div><div class="renown"></div><div class="race-at"></div>
        <div class="row"><span class="res"></span><span class="qs">${qs}</span></div></div>`;
      s.dataset.tip = `<b>${pl.character.name}</b>${perkTip(g, p)}<br><i>Click to see their quests, Charters and more.</i>`;
      s.querySelector(".plate .portrait").classList.toggle("emp", g.power(p));
      s.onclick = () => this.lensPlayer(p);
      O.appendChild(s);
    });
  }

  renderTown(g) {
    const T = $("town"), me = g.players[0], mine = this.mine() && this.mode === "play", ap = mine ? this.g.t.ap : 0;
    const P = TOWN.map(t => t.at.map(v => v * MAP_K));
    const aim = mine && this.targeting && this.targeting.kind === "blink", spots = g.o.square ? 7 : 6;
    const state = sp => {
      if (aim) return { go: false, work: false, blink: sp !== me.pos && sp !== SQUARE };
      // a step you can take now, or a longer walk you can afford (either may be free, with Kestra's perks)
      const go = mine && sp !== me.pos && this.g.canMove(0, sp), cost = mine && sp !== me.pos ? this.g.walkCost(0, me.pos, sp) : 0;
      return { go, cost, far: mine && !go && sp !== me.pos && cost <= ap, work: mine && ap >= 1 && me.pos === sp && this.g.canWork(0) };
    };
    T.innerHTML = this.pieSvg(g, state);
    T.querySelectorAll(".sector").forEach(e => { e.onclick = () => this.clickPlace(+e.dataset.sp); });
    // the Square's label goes down first, so the figures in the districts below it stand in front
    for (const sp of spots === 7 ? [SQUARE, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5]) {
      const { go, cost, far, work, blink } = state(sp), pr = PRODUCES[sp];
      const boon = g.event && g.event.place === sp, y = g.yieldAt(sp, mine ? 0 : null), two = boon || (mine && (this.g.t.tradeBonus || this.g.power(0, "tongue")));
      const walk = n => (n ? stCost(n) : `<span class="stc free">free</span>`);
      const b = document.createElement("div");
      b.className = "place" + (sp === SQUARE ? " square" : "") + (go ? " go" : "") + (far ? " far" : "") + (work ? " work" : "") + (boon ? " boon" : "") + (blink ? " blink" : "") + (aim && !blink ? " here" : "");
      b.dataset.sp = sp;
      b.dataset.tip = this.placeTip(g, sp);
      b.style.left = P[sp][0] + "px";
      b.style.top = P[sp][1] + "px";
      // the Square needs no name: just what a walk there costs, when you can make it
      if (sp === SQUARE) b.innerHTML = go || far ? walk(cost) : "";
      else {
        const sub = aim ? (blink ? "Blink here" : "you are here") : go || far ? `Walk ${walk(cost)}` : work ? (pr >= 0 ? `Work ${stCost(this.g.workCost(0))}${y > 1 ? ` · +${y}` : ""}` : sp === TAVERN ? "Work · a quest" : `Work · trade${two ? " 1 for 2" : ""}`)
          : pr >= 0 ? (y > 1 ? `makes ${y} ${RES[pr]} ${boon ? "today" : "for you"}` : `makes ${RES[pr]}`) : (sp === TAVERN ? "quests" : boon ? "trade 1 for 2 today" : "trade");
        b.innerHTML = `${pr >= 0 ? `<div class="medal res r${pr}">${ic(RESKEY[pr])}</div>` : `<div class="medal">${ic(PLACEKEY[sp])}</div>`}<div><div class="pn">${PLACES[sp]}</div><div class="pw">${sub}</div></div>`;
      }
      const here = g.players.map((pl, p) => (pl.pos === sp ? p : -1)).filter(p => p >= 0);
      here.forEach((p, k) => {
        const e = pawnEl(p);
        if (this.fx.pawn === p) e.classList.add("hidden-for-flight");
        if (p === g.turn && !g.over) e.classList.add("active");
        e.dataset.p = p;
        e.dataset.tip = `<b>${this.pname(p)}</b>`;
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
    const cls = s => (s.go ? " go" : "") + (s.far ? " far" : "") + (s.work ? " work" : "") + (s.blink ? " blink" : "");
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
    const sq = k ? `<ellipse class="sector square${cls(state(SQUARE))}" data-sp="${SQUARE}" data-tip="${this.placeTip(g, SQUARE)}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * k).toFixed(1)}" ry="${(ry * k).toFixed(1)}"/>` : "";
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
      const ap = cs.length * g.o.meldAP + (hit ? g.o.shapeAP : 0) + (g.ev("charter") ? 2 : 0);
      d.innerHTML = `<div class="tname">${def.name}</div><div class="yield" data-tip="<b>${RES[def.res]}</b><br>Pays its owner 1 ${RES[def.res]} each turn.">${tok(def.res)}</div>
        <div class="shape">${meld ? "" : `<span class="pre">prefers</span>`}<b>${SHAPE_SHORT[def.shape]}</b></div>${meld ? `<div class="gain">${stGain(ap)}${hit ? " ✓" : ""}</div>` : ""}`;
      d.dataset.tip = meld ? `<b>Found the ${def.name}</b><br>with the cards you've selected.` : `<b>${def.name}</b><br>Click to see it in full.`;
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
        ${ART.has(CHARKEY[owner]) ? `<div class="owner arms" data-tip="<b>${ch.owner === 0 ? "Yours" : owner + "'s"}</b>">${arms(owner)}</div>` : `<div class="owner portrait" style="--pc:${PCOL[ch.owner]}" data-tip="<b>${ch.owner === 0 ? "Yours" : owner + "'s"}</b>">${face(owner)}</div>`}
        <div class="meld"></div>${can ? `<div class="gain">${stGain(ch.owner === 0 ? g.o.ownLayoffAP : g.o.layoffAP + (g.ev("feast") ? 1 : 0))}</div>` : ""}`;
      const M = d.querySelector(".meld");
      const sorted = ch.cards.slice().sort((a, b) => a.r - b.r || a.s - b.s);
      const step = sorted.length > 1 ? Math.min(22, (room - cw) / (sorted.length - 1)) : 0;
      sorted.forEach((c, k) => {
        const e = cardEl(c, "sm");
        if (k) e.style.marginLeft = (step - cw) + "px";
        if (this.fx.hide.has(c.id)) e.classList.add("hidden-for-flight");
        M.appendChild(e);
      });
      d.dataset.tip = can ? `<b>Lay off on the ${ch.def.name}</b>` : `<b>${ch.def.name}</b><br>${ch.owner === 0 ? "Yours" : owner + "'s"}. Click to see it in full.`;
      d.onclick = () => this.clickCharter(ch);
      F.appendChild(d);
    }
  }

  renderTavern(g) {
    const Q = $("qrow");
    Q.innerHTML = "";
    const me = g.players[0];
    g.qrow.forEach(q => { const d = this.questEl(q, me, "strip"); d.dataset.tip = questTip(q); d.onclick = () => this.lensQuest(q); Q.appendChild(d); });
    const S = $("qsealed");
    S.innerHTML = "";
    if (g.sealedDeck.length) { const d = this.sealedEl(g.sealedDeck[0]); d.dataset.tip = "<b>A sealed commission</b><br>Click to see what it pays."; d.onclick = () => this.lensSealed(g.sealedDeck[0]); S.appendChild(d); }
    $("qmore").textContent = g.qdeck.length ? `· ${g.qdeck.length} more` : "· none left";
    const mine = this.mine() && this.mode === "play";
    $("btn-request").classList.toggle("on", !!(mine && this.g.canRefreshQuests(0)));
    $("btn-request").dataset.tip = this.g.players[0].pos === TAVERN ? "<b>Fresh quests</b><br>Put these to the bottom of the deck and draw fresh ones, for 1 stamina." : "<b>Fresh quests</b><br>Stand at the Tavern to draw fresh ones, for 1 stamina.";
    $("btn-reoffer").classList.toggle("on", !!(mine && this.g.canRefreshCharters(0)));
  }

  renderBoard(g) {
    const live = this.g, me = g.players[0], mine = this.mine();
    const myTurn = g.turn === 0 && !live.over && this.mode !== "ai";
    const pk = g.perkOf(0);
    $("me-char").innerHTML = `<div class="portrait" style="--pc:${PCOL[0]}">${face(me.character.name)}</div>
      <div class="nm">${me.character.name}</div>${pk ? `<div class="pk${g.power(0) ? " emp" : ""}">${ic(PERK_IC[pk])}${g.power(0) ? `★ ${EMPOWERED[pk].name}` : PERKS[pk].name}</div>` : `<div class="ti">${me.character.title}</div>`}
      <div class="fv">${ic(TYPEKEY[me.character.favour])} Favours ${TYPES[me.character.favour]} (+${g.o.favourBonus})</div>`;
    $("me-char").dataset.tip = `<b>${me.character.name}</b>, ${me.character.title}${perkTip(g, 0)}<br>You favour <b>${TYPES[me.character.favour]}</b> quests: ${g.o.favourBonus} extra renown each.`;
    $("me-char").querySelector(".portrait").classList.toggle("emp", g.power(0));
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
    if (g.deck.length) ds.appendChild(backEl("md", g.deck.length % 4));
    $("deck").querySelector(".lbl").innerHTML = drawing ? "<b>Draw</b>" : buying ? `<b>Buy</b> ${stCost(live.buyPrice())}` : `Deck · ${g.deck.length}`;
    $("deck").classList.toggle("go", drawing || buying);
    const xs = $("discard").querySelector(".slot"), D = g.discard;
    xs.innerHTML = "";
    xs.className = "slot" + (D.length ? "" : " empty");
    D.slice(-3).forEach((c, k, arr) => {
      const e = cardEl(c, "md");
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
    const n = hand.length, W = H.clientWidth || 744, cw = 96;
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
    MQ.innerHTML = `<div class="label"${me.personal ? ` data-tip="<b>Your quests</b><br>You may hold ${g.o.questLimit}. Your personal quest, marked ★, is held besides them."` : ""}>Your quests · ${me.quests.length} of ${g.o.questLimit}${me.personal ? " + ★" : ""}</div>`;
    MQ.classList.toggle("four", !!me.personal);
    if (me.personal) {
      const q = me.personal, k = g.perkOf(0), d = this.questEl(q, me, "strip");
      d.classList.add("personal");
      if (q.need.every((x, r) => me.res[r] >= x)) d.classList.add("ready");
      d.dataset.tip = `<b>${q.name}</b>${q.flavour ? `<br><i>${q.flavour}</i>` : ""}<br>Your <b>personal quest</b>. It doesn't count towards your ${g.o.questLimit}, and completing it empowers your perk into <b>${EMPOWERED[k].name}</b>.`;
      d.onclick = () => this.lensQuest(q);
      MQ.appendChild(d);
    }
    me.quests.forEach((q, i) => {
      const d = this.questEl(q, me, "strip");
      if (q.need.every((x, r) => me.res[r] >= x)) d.classList.add("ready");
      if (this.fx.quest === 0 && i === me.quests.length - 1) d.classList.add("hidden-for-flight");
      d.dataset.tip = questTip(q);
      d.onclick = () => this.lensQuest(q);
      MQ.appendChild(d);
    });
    if (!me.quests.length) MQ.insertAdjacentHTML("beforeend", `<div class="empty">No quests. Work the Tavern to take one.</div>`);

    // status: one short line
    let st;
    if (live.over) st = "The game is over.";
    else if (g.turn !== 0 || this.mode === "ai") st = this.aiSays && this.mode === "ai" ? this.aiSays : `<b>${this.pname(g.turn !== 0 ? g.turn : this.aiTurn)}</b> is playing…`;
    else if (this.why && mine && this.why.sel === [...this.sel].join()) st = `<span class="why">${this.why.text}</span>`;
    else if (this.hint && mine) st = `<span class="hint">${this.hint.text}</span>`;
    else if (this.targeting && mine) st = this.targeting.kind === "blink" ? "<b>Blink:</b> click a place on the map to appear there, or <b>Clear</b> to keep the spell." : "<b>Renew:</b> click one of your Charters, or <b>Clear</b> to keep the spell.";
    else if (live.endTriggered && this.mode === "draw") st = `<b class="final">Final round:</b> this is your last turn. Draw ${live.t.drawsLeft}.`;
    else if (this.mode === "draw") st = `Your turn. <b>Draw ${live.t.drawsLeft}</b> from the deck or the discard pile.`;
    else if (this.mode === "trim") st = `Too many cards: pick <b>${me.hand.length - live.o.handLimit - this.drops.size}</b> more to throw away.`;
    else if (this.mode === "ending") st = "Ending your turn…";
    else if (cs.length >= 3 && isMeld(cs) && cs.some(isWild) && live.t.spellUsed) st = this.spellsDone();
    else if (cs.length >= 3 && isMeld(cs) && me.hand.length - cs.length < 1) st = "A meld, but it's every card you hold: <b>keep one to discard</b> and end your turn.";
    else if (cs.length >= 3 && isMeld(cs)) st = !live.display.length ? "A meld, but no Charters are on offer." : cs.some(isWild) ? `<b>A meld of ${cs.length} with a Glamour</b> (no shape bonus). Click a Charter on offer.` : `<b>A meld of ${cs.length}.</b> Click a Charter on offer to found it.`;
    else if (cs.length === 1 && cs[0].spell === "glamour") st = "<b>Glamour</b> is wild: select it with two or more cards to make a meld.";
    else if (cs.length === 1 && cs[0].spell) st = live.castable(0, cs[0]) ? `<b>${SPELLS[cs[0].spell].name}:</b> ${SPELLS[cs[0].spell].text} Press <b>Cast</b>.` : live.t.spellUsed ? `${live.spellLimit(0) > 1 ? "Two spells a turn" : "One spell a turn"}: keep this one for next turn, or discard it.` : me.hand.length === 1 && !live.refills(cs[0], 0) ? `<b>${SPELLS[cs[0].spell].name}</b> can't be your last card: you need one to discard.` : `<b>${SPELLS[cs[0].spell].name}</b> can't be cast just now.`;
    else if (cs.length === 1 && me.hand.length === 1) st = "Your last card can't be played: <b>discard</b> it to end your turn.";
    else if (cs.length === 1 && live.charters.some(ch => fits(cs[0], ch))) st = "Click a glowing Charter to <b>lay it off</b>.";
    else if (cs.length === 1) {
      // a quest you can pay for: the discard is the moment to hand it in
      const can = q => q && q.need.every((n, r) => me.res[r] >= n), ready = [me.personal].concat(me.quests).filter(can)[0];
      const then = ready ? ` Then hand in <i>${ready.name}</i>${ready.personal ? " ★" : ""}.` : "";
      st = live.t.ap > 0 ? `<b>Discard</b> it to end your turn, losing your <b>${live.t.ap} stamina</b>.${then}` : `<b>Discard</b> it to end your turn.${then}`;
    }
    else if (cs.length >= 3) st = `Not a meld: ${meldTrouble(cs)}`;
    else if (cs.length >= 2) st = "Not a meld yet.";
    else st = `<b>${live.t.ap} stamina</b> to spend${PRODUCES[me.pos] >= 0 && live.rise(me.pos) ? `. The ${PLACES[me.pos]} now charges <b>${live.workCost(0)}</b>; other vendors start at 1` : ""}. Discard a card to end your turn.`;
    $("status").innerHTML = `<span>${st}</span>`;
  }
}

const app = new App();
