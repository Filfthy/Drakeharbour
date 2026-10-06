// river-app.js - the table for River: you against computer players.

// Each character's colour, for their piece, their name plate and the Charters they own.
const CHAR_COL = { "Ser Aldric": "#e06a24", "Lady Velia": "#9e6fbf", "Brother Anselm": "#e9e2cf", "Magister Orrin": "#34373f", "Kestra": "#2bb3c0" };
// Characters with painted art (tools/make-characters.py): a shield, a portrait and a miniature.
const ART = new Set(["aldric", "velia", "anselm", "orrin", "kestra"]);
// Seat by seat for the game in play: each player's colour and character.
let PCOL = [], PKEY = [];
const RESKEY = ["gold", "steel", "faith", "lore"];
const PLACEKEY = ["market", "forge", "tavern", "temple", "library", "harbour"];
const TYPEKEY = ["adventure", "diplomacy", "devotion", "scholarship", "exploration"];
const CHARKEY = { "Ser Aldric": "aldric", "Lady Velia": "velia", "Brother Anselm": "anselm", "Magister Orrin": "orrin", "Kestra": "kestra" };
const SHAPE_SHORT = { set: "Set", run: "Run", run4: "Run of 4+", set4: "Set of 4", long: "5+ cards", low: "4 or lower", high: "9 or higher" };
// The town on the map (img/map.webp, from art/town-map-plain.webp, 1672 pixels wide, shown 1600 wide):
// for each place, where its name banner sits and the building you can click (centre, width, height),
// in the map's own pixels. The places go round the ring road in this order.
const MAP_K = 1600 / 1672;
const TOWN = [
  { at: [668, 418], spot: [676, 366, 200, 110] },   // Market
  { at: [845, 398], spot: [855, 336, 120, 110] },   // Forge
  { at: [1005, 427], spot: [1020, 366, 150, 110] },  // Tavern
  { at: [1010, 586], spot: [1013, 503, 160, 120] },  // Temple
  { at: [852, 588], spot: [853, 528, 130, 100] },    // Library
  { at: [662, 575], spot: [596, 588, 240, 120] }     // Harbour
];
const FLY = 340;   // ms for a card to cross the table
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
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const cardTxt = c => (c.writ ? "a Writ" : `the ${c.r} of ${SUITS[c.s]}s`);
const cardName = c => (c.writ ? "Writ" : `${c.r} of ${SUITS[c.s]}s`);
const cardsTxt = cs => cs.slice().sort((a, b) => a.r - b.r || a.s - b.s).map(c => `${c.r} ${SUITS[c.s]}`).join(", ");
const needTxt = need => need.map((n, r) => (n ? `<span class="need">${tok(r)}${n}</span>` : "")).filter(Boolean).join(" ");
const PAWN = col => `<svg viewBox="0 0 24 32"><path d="M12 2a5 5 0 0 1 3.2 8.8c1.6 1 2.6 2.6 2.6 4.6 0 1.2-.4 2.4-1 3.3l3.2 6.3c.4.8.3 1.6-.3 2.2-.4.5-1 .8-1.7.8H6.2c-.7 0-1.3-.3-1.7-.8-.6-.6-.7-1.4-.3-2.2l3.2-6.3c-.6-.9-1-2.1-1-3.3 0-2 1-3.6 2.6-4.6A5 5 0 0 1 12 2z" fill="${col}" stroke="#1a0f06" stroke-width="1.5"/></svg>`;

function cardEl(c, size = "") {
  const e = document.createElement("div");
  if (c.writ) {
    e.className = "card writ " + size;
    e.innerHTML = `<div class="seal">${ic("writ")}</div><div class="wl">WRIT</div>`;
    e.title = "Writ";
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
function backEl(size = "") { const e = document.createElement("div"); e.className = "card back " + size; e.innerHTML = ic("back"); return e; }
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
    const have = new Set(ch.cards.map(c => c.s));
    return [0, 1, 2, 3].filter(s => !have.has(s)).map(s => `${ch.cards[0].r} of ${SUITS[s]}s`);
  }
  const rs = ch.cards.map(c => c.r), lo = Math.min(...rs), hi = Math.max(...rs), s = SUITS[ch.cards[0].s];
  const out = [];
  if (lo > 1) out.push(`${lo - 1} of ${s}s`);
  if (hi < g.o.ranks) out.push(`${hi + 1} of ${s}s`);
  return out;
}

// The longest melds in a hand, leaving out the ones inside a longer meld.
function bigMelds(hand) {
  const all = RiverAI.meldOptions(hand).sort((a, b) => b.length - a.length), out = [];
  for (const m of all) if (!out.some(o => m.every(c => o.includes(c)))) out.push(m);
  return out;
}

const noFx = () => ({ hide: new Set(), pawn: -1, discard: false, fanIn: {}, pend: [], renown: {}, quest: -1, charter: -1, flash: -1 });

class App {
  constructor() {
    this.opponents = load("opponents", 2);
    this.level = load("level", "hard");
    this.sortMode = load("sort", "suit");
    this.fs = Math.max(0, Math.min(2, load("fs", 0)));
    this.lines = [];
    this.events = [];
    this.sel = new Set();
    this.drops = new Set();
    this.fresh = new Set();
    this.handEls = new Map();
    this.fx = noFx();
    this.hint = null;
    this.mode = "idle";
    this.view = null;
    this.playing = false;
    this.tut = null;
    this.scale = 1;
    $("btn-writ").onclick = () => this.askWrit();
    $("btn-clear").onclick = () => { this.sel.clear(); this.clearHint(); this.render(); };
    $("btn-end").onclick = () => this.endMyTurn();
    $("deck").onclick = () => this.clickPile("deck");
    $("discard").onclick = () => this.clickPile("discard");
    $("btn-rules").onclick = () => this.showRules(() => this.closePanel());
    $("btn-menu").onclick = () => this.showStart();
    $("btn-hint").onclick = e => { e.currentTarget.blur(); this.showHint(); };
    $("btn-fs-down").onclick = () => this.setFs(this.fs - 1);
    $("btn-fs-up").onclick = () => this.setFs(this.fs + 1);
    $("btn-music").onclick = e => { e.currentTarget.blur(); Music.toggleMusic(); this.audioUi(); };
    $("btn-sound").onclick = e => { e.currentTarget.blur(); Music.setSound(!Music.sound); this.audioUi(); };
    $("btn-full").onclick = e => { e.currentTarget.blur(); this.toggleFull(); };
    $("chronicle").onclick = () => this.lensLog();
    $("sort-suit").onclick = () => this.setSort("suit");
    $("sort-rank").onclick = () => this.setSort("rank");
    $("overlay").addEventListener("click", () => { if ($("overlay").classList.contains("lens")) this.closePanel(); });
    draggable($("panel"), this, { transform: true, when: () => $("overlay").classList.contains("ask") });
    document.addEventListener("keydown", e => { if (e.key === "h" || e.key === "H") this.showHint(); });
    document.addEventListener("fullscreenchange", () => this.fullUi());
    document.addEventListener("webkitfullscreenchange", () => this.fullUi());
    window.addEventListener("resize", () => this.fit());
    this.fit();
    this.setFs(this.fs);
    this.audioUi();
    this.fullUi();
    this.showStart();
  }

  fit() {
    const s = Math.min(innerWidth / 1600, innerHeight / 900);
    this.scale = s;
    $("stage").style.transform = `translate(${Math.round((innerWidth - 1600 * s) / 2)}px, ${Math.round((innerHeight - 900 * s) / 2)}px) scale(${s})`;
  }

  pname(p) { return p === 0 ? "You" : this.g.players[p].character.name; }
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
  }

  audioUi() {
    const m = $("btn-music"), s = $("btn-sound"), on = Music.level > 0;
    m.innerHTML = on ? ICONS.music : ICONS.musicOff;
    m.title = on ? "Music: on" : "Music: off";
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
  panel(h, mode = "") {
    const P = $("panel");
    document.querySelectorAll(".hint-glow").forEach(e => e.remove());
    P.innerHTML = h;
    P.style.transform = "";
    P.classList.toggle("lens-panel", mode === "lens");
    $("overlay").classList.toggle("lens", mode === "lens");
    $("overlay").classList.toggle("ask", mode === "ask");
    $("overlay").classList.remove("hidden");
  }
  closePanel() { $("overlay").classList.add("hidden"); $("overlay").classList.remove("lens", "ask"); }

  showStart() {
    if (!this.g) $("stage").classList.add("idle");
    const live = this.g && !this.g.over;
    const seg = (key, vals, labels, cur) => `<span class="seg" data-k="${key}">${vals.map((v, i) => `<button data-v='${JSON.stringify(v)}' class="${cur === v ? "on" : ""}">${labels[i]}</button>`).join("")}</span>`;
    this.panel(`<div class="emblems"><i class="e0"></i><i class="e1"></i><i class="e2"></i><i class="e3"></i></div><h1>RIVER</h1><div class="sub">charters, quests and cards in a guild town</div>
      <div class="opt"><span>Opponents</span>${seg("opponents", [1, 2, 3], ["1", "2", "3"], this.opponents)}</div>
      <div class="opt"><span>Their skill</span>${seg("level", ["easy", "hard"], ["Easy", "Hard"], this.level)}</div>
      <div class="opt"><span>Text size</span>${seg("fs", [0, 1, 2], FS_NAMES, this.fs)}</div>
      <div class="opt"><span>Music</span>${seg("music", [0, 1, 2], ["Off", "Quiet", "On"], Music.level)}</div>
      <div class="btns"><button class="btn dark" id="b-credits">Credits</button><button class="btn dark" id="b-rules">Rules</button><button class="btn" id="b-tut">Tutorial</button><button class="btn" id="b-go">${live ? "New game" : "Play"}</button>${live ? `<button class="btn" id="b-resume">Resume</button>` : ""}</div>`);
    $("panel").querySelectorAll(".seg button").forEach(b => b.onclick = () => {
      const k = b.parentElement.dataset.k, v = JSON.parse(b.dataset.v);
      if (k === "fs") this.setFs(v);
      else if (k === "music") { Music.setLevel(v); this.audioUi(); }
      else { this[k] = v; save(k, v); }
      b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    });
    $("b-rules").onclick = () => this.showRules(() => this.showStart());
    $("b-credits").onclick = () => this.showCredits();
    $("b-tut").onclick = () => { this.closePanel(); this.startTutorial(); };
    $("b-go").onclick = () => { this.closePanel(); this.newGame(); };
    if (live) $("b-resume").onclick = () => this.closePanel();
  }

  // The rules as headings that open one at a time.
  showRules(back) {
    const o = RV_DEFAULTS;
    const sec = (h, b, open) => `<div class="acc${open ? " open" : ""}"><button class="acc-h">${h}</button><div class="acc-b">${b}</div></div>`;
    this.panel(`<h2>How to play</h2>
      ${sec("The goal", `<p>Complete <b>quests</b> for renown. The first to ${o.target} renown ends the game at the end of that round, and the most renown wins.</p>`, true)}
      ${sec("Your turn", `<ol><li><b>Rent:</b> each Charter you own pays you 1 of its resource.</li><li><b>Draw 2 cards</b>, from the deck or the top of the discard pile.</li>
        <li><b>Play cards</b> for action points (AP). You start with ${o.freeAP}.</li><li><b>Spend AP:</b> walk a step, work a place or buy a card, 1 AP each.</li>
        <li><b>Discard a card</b> to end your turn, then hand in one quest.</li></ol>`)}
      ${sec("Melds and Charters", `<ul><li>A <b>meld</b> is 3 or more cards of one rank, or 3 or more in a row in one suit.</li>
        <li><b>Found</b> a Charter by laying a meld on one on offer: 1 AP and 1 renown per card, and ${o.shapeAP} AP more for its preferred shape.</li>
        <li><b>Lay off</b> a card that extends a founded Charter: ${o.layoffAP} AP on someone else's (its owner gets 1 resource), ${o.ownLayoffAP} AP on your own.</li>
        <li>A Charter nobody lays off on for ${o.life} rounds <b>fades</b>, and its cards go back into the deck.</li>
        <li><b>Writs:</b> one a turn, for ${o.writAP} AP, two cards from the deck, or any card from the discard pile.</li></ul>`)}
      ${sec("The town", `<ul><li>Market: Gold. Forge: Steel. Temple: Faith. Library: Lore.</li><li>Tavern: take a quest. You can hold ${o.questLimit}.</li><li>Harbour: trade 1 resource for another.</li></ul>`)}
      ${sec("Quests and limits", `<ul><li>Hand in one quest a turn, after your discard.</li><li>Your character's favourite kind of quest scores ${o.favourBonus} extra renown.</li>
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
      <p class="credits">Suit emblems and town map by BugVictim.</p>
      <p class="credits">Icons from <b>game-icons.net</b> by Lorc, Delapouite and Faithtoken, licensed under CC BY 3.0.</p>
      <p class="credits">Cinzel typeface by Natanael Gama, SIL Open Font License.</p>
      <p class="credits">Music written for River and played by your browser.</p>
      <p class="credits">© BugVictim 2026</p>
      <div class="btns"><button class="btn" id="b-back">Back</button></div>`);
    $("b-back").onclick = () => this.showStart();
  }

  // A closer look at a Charter, founded (ch) or on offer (def).
  lensCharter(ch, def) {
    const g = this.view || this.g, d = ch ? ch.def : def, me = g.players[0];
    const rows = [];
    if (ch) rows.push(["charter", `Owner: <b>${ch.owner === 0 ? "you" : g.players[ch.owner].character.name}</b>`]);
    else rows.push(["charter", "<b>On offer.</b> Found it with any meld: 1 AP and 1 renown a card."]);
    rows.push([RESKEY[d.res], `Its owner gets <b>1 ${RES[d.res]}</b> each turn.`]);
    rows.push(["ap", `Prefers <b>${SHAPES[d.shape].text}</b>: +${g.o.shapeAP} AP when founded that way.`]);
    if (ch) {
      const left = g.roundsLeft(ch), ext = extenders(g, ch), mine = me.hand.filter(c => fits(c, ch));
      rows.push(["fading", left <= 0 ? "<b>Fades</b> at its owner's next turn unless someone lays off on it." : `Fades in <b>${plural(left, "round")}</b> if nobody lays off on it.`]);
      rows.push(["buy", ext.length ? `Lay off: <b>${ext.join(" or ")}</b>. ${ch.owner === 0 ? `+${g.o.ownLayoffAP} AP for you.` : `+${g.o.layoffAP} AP for you, 1 ${RES[d.res]} for its owner.`}` : "Nothing more can be laid off on it."]);
      if (mine.length) rows.push(["quest", `You hold <b>${cardsTxt(mine)}</b>.`]);
    } else {
      const ms = bigMelds(me.hand).slice(0, 3);
      if (ms.length) rows.push(["quest", `Your melds: ${ms.map(m => `<b>${cardsTxt(m)}</b> (${m.length * g.o.meldAP + (SHAPES[d.shape].test(m) ? g.o.shapeAP : 0)} AP)`).join("; ")}.`]);
    }
    this.panel(`<div class="lens-head">${tok(d.res)}<h2>${d.name}</h2></div>
      <div class="facts">${rows.map(([k, t]) => `${ic(k)}<div>${t}</div>`).join("")}</div>
      <div class="lens-cards" id="lens-cards"></div><div class="close-hint">Click anywhere to close</div>`, "lens");
    if (ch) ch.cards.slice().sort((a, b) => a.r - b.r || a.s - b.s).forEach(c => $("lens-cards").appendChild(cardEl(c, "md")));
  }

  lensQuest(q) {
    const g = this.view || this.g, me = g.players[0], fav = q.type === me.character.favour;
    this.panel(`<div class="lens-head"><span class="seal">${ic(TYPEKEY[q.type])}</span><h2>${q.name}</h2></div>
      <div class="facts">${ic(TYPEKEY[q.type])}<div>A <b>${TYPES[q.type]}</b> quest.${fav ? ` Your favourite kind: <b>+${g.o.favourBonus} renown</b>.` : ""}</div>
      ${ic("quest")}<div>Needs ${needTxt(q.need)} &nbsp;·&nbsp; you have ${needTxt(me.res) || "nothing"}</div>
      ${ic("renown")}<div>Worth <b>${q.pts + (fav ? g.o.favourBonus : 0)} renown</b>. Hand it in after your discard.</div></div>
      <div class="close-hint">Click anywhere to close</div>`, "lens");
  }

  lensPlayer(p) {
    const g = this.view || this.g, pl = g.players[p], owned = g.charters.filter(ch => ch.owner === p);
    this.panel(`<div class="lens-head"><div class="portrait" style="--pc:${PCOL[p]};width:60px;height:60px">${face(pl.character.name)}</div>${ART.has(CHARKEY[pl.character.name]) ? `<div class="lens-arms">${arms(pl.character.name)}</div>` : ""}<h2>${pl.character.name}</h2></div>
      <div class="facts">${ic(TYPEKEY[pl.character.favour])}<div><i>${pl.character.title}</i>. Favours <b>${TYPES[pl.character.favour]}</b> quests.</div>
      ${ic("renown")}<div><b>${g.score(p)} renown</b> · ${plural(pl.hand.length, "card")} in hand · ${plural(pl.done.length, "quest")} done</div>
      ${ic("gold")}<div>${needTxt(pl.res) || "No resources"}</div>
      ${ic("quest")}<div>${pl.quests.length ? pl.quests.map(q => `<b>${q.name}</b> ${needTxt(q.need)}`).join("<br>") : "No quests"}</div>
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
    const g = new RiverGame({ players: this.opponents + 1 });
    g.setup();
    this.begin(g);
  }

  startTutorial() {
    if (this.tut) this.tut.close();
    const g = tutorialGame();
    this.tut = new Tutorial(this);
    this.begin(g, [null, RiverAI.greedy()]);
  }

  begin(g, ais = null) {
    $("stage").classList.remove("idle");
    this.g = g;
    PCOL = g.players.map(pl => CHAR_COL[pl.character.name]);
    PKEY = g.players.map(pl => CHARKEY[pl.character.name]);
    this.ais = ais || [null].concat(g.players.slice(1).map(() => (this.level === "hard" ? RiverAI.planner({ worlds: 8 }) : RiverAI.greedy())));
    this.lines = [];
    this.events = [];
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
    this.log(`You are <b>${me.character.name}</b>, ${me.character.title}. You favour ${TYPES[me.character.favour]} quests.`);
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
        const pre = { turn: g.turn, ap: g.t ? g.t.ap : 0, pl: g.players.map(x => ({ res: x.res.slice(), hand: x.hand.slice(), quests: x.quests.slice(), pos: x.pos })), charters: g.charters.map(ch => ({ id: ch.id, owner: ch.owner, def: ch.def, cards: ch.cards.slice() })) };
        const r = orig.apply(g, a);
        const texts = [].concat(describe(pre, a, r) || []);
        if (app.g === g) app.events.push({ texts, snap: g.clone(), fn, p: pre.turn, args: a, r, pre, faded: (g.lastFaded || []).slice(), next: g.turn });
        return r;
      };
    };
    wrap("draw", (pre, [p, from], c) => (!c ? [] : from === "discard" ? `${N(p)} took ${cardTxt(c)} from the discard pile.` : p === 0 ? `${N(0)} drew ${cardTxt(c)}.` : `${N(p)} drew a card.`));
    wrap("found", (pre, [p], r) => `${N(p)} founded the <i>${r.ch.def.name}</i>: +${r.ch.cards.length * g.o.meldAP + (r.shapeHit ? g.o.shapeAP : 0)} AP, +${r.ch.cards.length * g.o.meldRenown} renown.`);
    wrap("layoff", (pre, [p, id, chId]) => {
      const c = pre.pl[p].hand.find(x => x.id === id), ch = pre.charters.find(x => x.id === chId);
      if (ch.owner === p) return `${N(p)} laid ${cardTxt(c)} on ${p === 0 ? "your" : "their"} own <i>${ch.def.name}</i>: +${g.o.ownLayoffAP} AP.`;
      return `${N(p)} laid ${cardTxt(c)} on ${whose(ch.owner)} <i>${ch.def.name}</i>: +${g.o.layoffAP} AP, and 1 ${RES[ch.def.res]} for ${ch.owner === 0 ? "you" : app.pname(ch.owner)}.`;
    });
    wrap("writ", (pre, [p, id, mode]) => `${N(p)} used a Writ: ${mode === "draw" ? "two cards" : mode === "salvage" ? "a card from the discard pile" : `+${g.o.writAP} AP`}.`);
    wrap("buy", (pre, [p, from], c) => (from === "discard" && c ? `${N(p)} bought ${cardTxt(c)} from the discard pile.` : p === 0 && c ? `${N(0)} bought ${cardTxt(c)}.` : `${N(p)} bought a card.`));
    wrap("move", (pre, [p, dest]) => `${N(p)} walked to the ${PLACES[dest]}.`);
    wrap("work", (pre, [p, arg]) => {
      const sp = pre.pl[p].pos, pl = g.players[p];
      if (PRODUCES[sp] >= 0) return `${N(p)} worked the ${PLACES[sp]}: +1 ${RES[PRODUCES[sp]]}.`;
      if (sp === TAVERN) return `${N(p)} took the quest <i>${pl.quests[pl.quests.length - 1].name}</i>.`;
      return `${N(p)} traded ${RES[arg[0]]} for ${RES[arg[1]]}.`;
    });
    wrap("discardCard", (pre, [p, id]) => `${N(p)} discarded ${cardTxt(pre.pl[p].hand.find(x => x.id === id))}.`);
    wrap("handIn", (pre, [p, qi], ok) => {
      if (!ok) return [];
      const q = pre.pl[p].quests[qi], fav = q.type === g.players[p].character.favour;
      return `${N(p)} completed <i>${q.name}</i>: +${q.pts + (fav ? g.o.favourBonus : 0)} renown.`;
    });
    wrap("endTurn", (pre, [p]) => {
      const out = [];
      const lost = pre.pl[p].res.reduce((a, b) => a + b, 0) - g.players[p].res.reduce((a, b) => a + b, 0);
      if (lost > 0) out.push(`<span class="faint">${app.pname(p)} gave up ${plural(lost, "resource")} over the limit.</span>`);
      if (g.over) return out;
      for (const ch of g.lastFaded || []) out.push(`<span class="faint">${whose(ch.owner).replace(/^y/, "Y")} <i>${ch.def.name}</i> faded.</span>`);
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
    if (f.delay) await wait(f.delay);
    const from = f.from || (f.fromFn && f.fromFn());
    const toEl = f.toFn ? f.toFn() : null;
    const to = f.to || this.box(toEl);
    let kind = "";
    if (from && to) {
      const el = f.make(), ms = f.ms || FLY;
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
      if (f.via) { leg(f.via, ms); await wait(ms + (f.hold || 800)); }
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
        if (tile) F.push({ make: () => { const t = tile.cloneNode(true); t.classList.remove("can", "hit"); t.querySelectorAll(".gain").forEach(x => x.remove()); return t; }, from: this.box(tile), toFn: () => this.q(`.charter[data-id="${ch.id}"]`), ms: 300, quiet: true });
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
      case "writ": {
        const [, id, mode] = e.args;
        toDiscard(e.pre.pl[p].hand.find(x => x.id === id));
        const before = new Set(e.pre.pl[p].hand.map(x => x.id));
        e.snap.players[p].hand.filter(x => !before.has(x.id)).forEach((x, k) => arrive(x, mode === "salvage", mode === "salvage" ? discBox() : deckBox(), 180 + k * 100));
        break;
      }
      case "discardCard":
        toDiscard(e.pre.pl[p].hand.find(x => x.id === e.args[1]));
        break;
      case "move":
        fx.pawn = p;
        F.push({ make: () => pawnEl(p), from: this.box(this.q(`.place[data-sp="${e.pre.pl[p].pos}"] .pawn[data-p="${p}"]`)), toFn: () => this.q(`.place[data-sp="${e.args[1]}"] .pawn[data-p="${p}"]`), ms: 280 });
        break;
      case "work": {
        const sp = e.pre.pl[p].pos, m = this.box(this.q(`.place[data-sp="${sp}"] .medal`));
        const at = m && { cx: m.cx, cy: m.cy, w: 30, h: 30 };
        if (PRODUCES[sp] >= 0) token(p, PRODUCES[sp], at);
        else if (sp === HARBOUR) {
          const [give, get] = e.args[1];
          F.push({ make: () => tokEl(give), from: this.box(this.resTok(p, give)), to: at, ms: 400 });
          token(p, get, at, { delay: 380 });
        } else if (sp === TAVERN) {
          const arg = e.args[1], qs = e.snap.players[p].quests, qq = qs[qs.length - 1];
          const src = arg != null && arg >= 0 ? this.q("#qrow").children[arg] : this.q("#qmore");
          fx.quest = p;
          F.push({ make: () => this.questEl(qq, null, "strip"), from: this.box(src), toFn: () => (p === 0 ? [...this.q("#my-quests").querySelectorAll(".quest")].pop() : this.q(`#opps .seat[data-p="${p}"] .qs`).lastElementChild), ms: 460 });
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
        break;
      }
      case "endTurn": {
        if (e.faded.length) Sfx.riffle();
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
      e.texts.forEach(t => this.log(t));
      const { F, fx } = this.plan(e);
      this.fx = fx;
      this.view = e.snap;
      this.render();
      await Promise.all(F.map(f => this.fly(f)));
      if (this.g !== g) return;
      this.fx = noFx();
      this.render();
      if (fx.flash >= 0) { this.glow(this.q(`.charter[data-id="${fx.flash}"]`), "flash", 1500); Sfx.chime(); }
      if (e.p === 0 && e.snap.turn === 0 && e.snap.t && e.snap.t.ap > e.pre.ap) this.bumpAP();
      if (e.p !== 0) await wait(e.fn === "move" || e.fn === "work" ? 40 : 140);
      if (this.g !== g) return;
    }
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
      await wait(250);
      if (this.g !== g) return;
      this.ais[g.turn](g, g.turn);
      await this.playEvents();
      if (this.g !== g) return;
    }
    if (g.over) return this.gameOver();
    this.mode = "draw";
    this.sel.clear();
    this.render();
    Sfx.turn();
  }

  // ------------------------------------------------------------ your turn
  mine() { return this.g && !this.g.over && this.g.turn === 0 && !this.view && !this.playing && this.mode !== "ai"; }
  selCards() { const h = this.g.players[0].hand; return [...this.sel].map(id => h.find(c => c.id === id)).filter(Boolean); }
  allow(kind, info) { if (!this.tut) return true; if (this.tut.allows(kind, info)) return true; this.tut.nudge(); return false; }
  bumpAP() { const e = $("me-ap"); e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }
  async act(fn) { this.clearHint(); fn(); this.sel.clear(); await this.playEvents(); }

  clickPile(src) {
    if (!this.mine()) return;
    const g = this.g;
    if (this.mode === "draw") {
      if (src === "discard" && !g.discard.length) return;
      if (!this.allow("draw", src)) return;
      return this.act(() => { const c = g.draw(0, src); if (c) this.fresh.add(c.id); if (g.t.drawsLeft <= 0) this.mode = "play"; });
    }
    if (this.mode === "play" && g.canBuy(0)) {
      if (src === "discard" && !g.discard.length) return;
      if (!this.allow("buy", src)) return;
      this.act(() => { const c = g.buy(0, src); if (c) this.fresh.add(c.id); });
    }
  }

  clickCard(c) {
    if (!this.mine()) return;
    this.clearHint();
    if (this.mode === "trim") {
      this.drops.has(c.id) ? this.drops.delete(c.id) : this.drops.add(c.id);
      const need = this.g.players[0].hand.length - this.g.o.handLimit;
      if (this.drops.size >= need && this.onTrim) { const f = this.onTrim; this.onTrim = null; f(); return; }
      return this.render();
    }
    if (this.mode !== "play") return;
    this.sel.has(c.id) ? this.sel.delete(c.id) : this.sel.add(c.id);
    this.render();
  }

  // A tile is a target when your selection can be played on it; otherwise clicking opens it up.
  clickOffer(di) {
    const g = this.g, cs = this.mine() ? this.selCards() : [];
    const def = (this.view || g).display[di];
    if (!def) return;
    if (this.mode !== "play" || !this.mine() || !isMeld(cs) || !g.canPlay(0, cs.length)) return this.lensCharter(null, def);
    if (!this.allow("found", di)) return;
    this.act(() => g.found(0, cs.map(c => c.id), di));
  }

  clickCharter(ch) {
    const g = this.g, cs = this.mine() ? this.selCards() : [];
    const live = g.charters.find(x => x.id === ch.id);
    if (this.mode !== "play" || !this.mine() || cs.length !== 1 || !live || !fits(cs[0], live) || !g.canPlay(0, 1)) return this.lensCharter(ch);
    if (!this.allow("layoff", ch.owner)) return;
    this.act(() => g.layoff(0, cs[0].id, ch.id));
  }

  clickPlace(sp) {
    const g = this.g, me = g.players[0];
    if (!this.mine() || this.mode !== "play" || g.t.ap < 1) return;
    if (ADJ[me.pos].includes(sp)) { if (!this.allow("move", sp)) return; return this.act(() => g.move(0, sp)); }
    if (sp !== me.pos || !g.canWork(0)) return;
    if (!this.allow("work", sp)) return;
    if (PRODUCES[sp] >= 0) return this.act(() => g.work(0));
    if (sp === TAVERN) return this.askTavern();
    if (sp === HARBOUR) return this.askHarbour();
  }

  questEl(q, pl, kind = "card-q") {
    const d = document.createElement("div");
    d.className = `quest parchment ${kind}`;
    const fav = pl && q.type === pl.character.favour;
    d.innerHTML = `<div class="tname"><span class="seal" title="${TYPES[q.type]}">${ic(TYPEKEY[q.type])}</span>${q.name}</div>
      <div class="needs">${q.need.map((n, r) => (n ? `<span class="need${pl && pl.res[r] < n ? " short" : ""}">${tok(r)}${n}</span>` : "")).join("")}</div>
      <div class="reward">${ic("renown")}${q.pts}</div>${fav ? `<div class="fav" title="Your favourite kind: +${this.g.o.favourBonus} renown">★</div>` : ""}`;
    return d;
  }

  askTavern() {
    const g = this.g, me = g.players[0];
    this.panel(`<h2>The Tavern</h2><p>Choose a quest. You can hold ${g.o.questLimit}.</p><div class="qlist" id="tq"></div><div class="btns"><button class="btn dark" id="b-blind">Draw one blind</button><button class="btn dark" id="b-x">Cancel</button></div>`, "ask");
    g.qrow.forEach((q, i) => {
      const d = this.questEl(q, me, "strip");
      d.onclick = () => { this.closePanel(); this.act(() => g.work(0, i)); };
      $("tq").appendChild(d);
    });
    $("b-blind").disabled = !g.qdeck.length;
    $("b-blind").onclick = () => { this.closePanel(); this.act(() => g.work(0, -1)); };
    $("b-x").onclick = () => this.closePanel();
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
      this.act(() => this.g.work(0, [give, r]));
    });
    $("b-x").onclick = () => this.closePanel();
  }

  askWrit() {
    const g = this.g, cs = this.selCards();
    if (!this.mine() || this.mode !== "play" || cs.length !== 1 || !cs[0].writ || g.t.writUsed || !g.canPlay(0, 1)) return;
    if (!this.allow("writ")) return;
    const id = cs[0].id;
    this.panel(`<h2>Use the Writ</h2><p>Choose one. One Writ a turn.</p>
      <div class="btns" style="justify-content:flex-start"><button class="btn" id="w-ap">${ic("ap")}+${g.o.writAP} AP</button><button class="btn dark" id="w-draw">Draw 2 cards</button><button class="btn dark" id="w-salv" ${g.discard.length ? "" : "disabled"}>A card from the discard pile</button></div>
      <div class="cards" id="w-pile"></div><div class="btns"><button class="btn dark" id="b-x">Cancel</button></div>`, "ask");
    const done = mode => arg => {
      this.closePanel();
      const before = new Set(g.players[0].hand.map(c => c.id));
      this.act(() => { g.writ(0, id, mode, arg); g.players[0].hand.forEach(c => { if (!before.has(c.id)) this.fresh.add(c.id); }); });
    };
    $("w-ap").onclick = () => done("ap")();
    $("w-draw").onclick = () => done("draw")();
    $("w-salv").onclick = () => {
      const row = $("w-pile");
      row.innerHTML = "";
      g.discard.forEach((c, i) => { const e = cardEl(c, "md"); e.onclick = () => done("salvage")(i); row.appendChild(e); });
    };
    $("b-x").onclick = () => this.closePanel();
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
          d.onclick = () => { this.closePanel(); g.handIn(0, i); res(); };
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

  gameOver() {
    const g = this.g;
    const rows = g.players.map((pl, p) => {
      const qp = pl.done.reduce((a, q) => a + q.pts, 0), fav = pl.done.filter(q => q.type === pl.character.favour).length * g.o.favourBonus;
      return { p, pl, qp, mp: pl.renown - qp, fav, total: g.final(p) };
    }).sort((a, b) => b.total - a.total);
    this.panel(`<h2>${rows[0].p === 0 ? "You win!" : this.pname(rows[0].p) + " wins"}</h2>
      <table><tr><th></th><th class="n">Quests</th><th class="n">Charters</th><th class="n">Favoured</th><th class="n">Renown</th></tr>
      ${rows.map(r => `<tr><td><b>${r.p === 0 ? "You" : r.pl.character.name}</b><br><small>${r.pl.character.title}</small></td><td class="n">${r.qp} (${r.pl.done.length})</td><td class="n">${r.mp}</td><td class="n">${r.fav}</td><td class="n"><b>${r.total}</b></td></tr>`).join("")}</table>
      <div class="btns"><button class="btn dark" id="b-menu">Menu</button><button class="btn" id="b-again">Play again</button></div>`);
    $("b-menu").onclick = () => this.showStart();
    $("b-again").onclick = () => { this.closePanel(); this.newGame(); };
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
    for (const fn of ["draw", "found", "layoff", "writ", "buy", "move", "work", "discardCard"]) {
      const orig = RiverGame.prototype[fn];
      x[fn] = function (...a) {
        const def = fn === "found" ? x.display[a[2]] : null, top = x.discard[x.discard.length - 1];
        const r = orig.apply(x, a);
        acts.push({ fn, a, r, def, top });
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
      case "writ":
        this.sel.add(a.a[1]);
        text = `use your <b>Writ</b> for ${a.a[2] === "draw" ? "<b>two cards</b>" : `<b>+${g.o.writAP} AP</b>`}.`;
        targets = [hand(a.a[1]), "#btn-writ"];
        break;
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
        text = PRODUCES[sp] >= 0 ? `work the <b>${PLACES[sp]}</b> for 1 ${RES[PRODUCES[sp]]}.` : sp === TAVERN ? "take a quest at the <b>Tavern</b>." : `trade ${RES[a.a[1][0]]} for <b>${RES[a.a[1][1]]}</b> at the Harbour.`;
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
    $("btn-hint").disabled = !this.canHint();
    if (this.tut) { this.tut.advance(); this.tut.decorate(); }
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
        fan += `<div class="card back" style="left:${(t * step).toFixed(1)}px;transform:rotate(${(-t * spread).toFixed(2)}deg)">${ic("back")}</div>`;
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
    // the ring road: a smooth loop through the six banners
    let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
    for (let i = 0; i < 6; i++) {
      const p0 = P[(i + 5) % 6], p1 = P[i], p2 = P[(i + 1) % 6], p3 = P[(i + 2) % 6], k = 0.18;
      const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      d += ` C${c1.map(v => v.toFixed(1)).join(" ")} ${c2.map(v => v.toFixed(1)).join(" ")} ${p2.map(v => v.toFixed(1)).join(" ")}`;
    }
    T.innerHTML = `<svg width="1600" height="900"><path d="${d}" stroke="rgba(30, 18, 8, 0.55)" stroke-width="13" fill="none"/><path d="${d}" stroke="rgba(250, 238, 205, 0.92)" stroke-width="8" fill="none"/><path d="${d}" stroke="#4a2e12" stroke-width="3" fill="none" stroke-dasharray="10 8" stroke-linecap="round"/></svg>`;
    const state = sp => ({ go: mine && ap >= 1 && ADJ[me.pos].includes(sp), work: mine && ap >= 1 && me.pos === sp && this.g.canWork(0) });
    for (let sp = 0; sp < 6; sp++) {
      const { go, work } = state(sp), s = TOWN[sp].spot.map(v => v * MAP_K);
      const e = document.createElement("div");
      e.className = "spot" + (go ? " go" : "") + (work ? " work" : "");
      e.dataset.sp = sp;
      Object.assign(e.style, { left: s[0] + "px", top: s[1] + "px", width: s[2] + "px", height: s[3] + "px" });
      e.onclick = () => this.clickPlace(sp);
      T.appendChild(e);
    }
    for (let sp = 0; sp < 6; sp++) {
      const { go, work } = state(sp), pr = PRODUCES[sp];
      const b = document.createElement("div");
      b.className = "place" + (go ? " go" : "") + (work ? " work" : "");
      b.dataset.sp = sp;
      b.style.left = P[sp][0] + "px";
      b.style.top = P[sp][1] + "px";
      const sub = go ? "Walk · 1 AP" : work ? (pr >= 0 ? `Work · +1 ${RES[pr]}` : sp === TAVERN ? "Work · a quest" : "Work · trade") : pr >= 0 ? `makes ${RES[pr]}` : (sp === TAVERN ? "quests" : "trade");
      b.innerHTML = `${pr >= 0 ? `<div class="medal res r${pr}">${ic(RESKEY[pr])}</div>` : `<div class="medal">${ic(PLACEKEY[sp])}</div>`}<div><div class="pn">${PLACES[sp]}</div><div class="pw">${sub}</div></div>`;
      const here = g.players.map((pl, p) => (pl.pos === sp ? p : -1)).filter(p => p >= 0);
      here.forEach((p, k) => {
        const e = pawnEl(p);
        if (this.fx.pawn === p) e.classList.add("hidden-for-flight");
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

  renderCharters(g) {
    const mine = this.mine() && this.mode === "play";
    const cs = mine ? this.selCards() : [];
    const meld = mine && isMeld(cs) && this.g.canPlay(0, cs.length);
    const O = $("offer");
    O.innerHTML = "";
    for (let i = 0; i < g.o.display; i++) {
      const def = g.display[i];
      const d = document.createElement("div");
      if (!def) { d.className = "offer empty"; d.textContent = "none on offer"; O.appendChild(d); continue; }
      const hit = meld && SHAPES[def.shape].test(cs);
      d.className = "offer parchment" + (meld ? " can" : "") + (hit ? " hit" : "");
      d.dataset.i = i;
      const ap = cs.length * g.o.meldAP + (hit ? g.o.shapeAP : 0);
      d.innerHTML = `<div class="tname">${def.name}</div><div class="yield" title="Pays its owner 1 ${RES[def.res]} each turn">${tok(def.res)}</div>
        <div class="shape">${meld ? "" : `<span class="pre">prefers</span>`}<b>${SHAPE_SHORT[def.shape]}</b></div>${meld ? `<div class="gain">+${ap} AP${hit ? " ✓" : ""}</div>` : ""}`;
      d.title = meld ? `Found the ${def.name} with these cards` : `${def.name}: click for more`;
      d.onclick = () => this.clickOffer(i);
      O.appendChild(d);
    }
    const F = $("founded");
    F.innerHTML = "";
    const dense = g.charters.length > 6;
    F.classList.toggle("dense", dense);
    F.classList.toggle("denser", g.charters.length > 8);
    if (!g.charters.length) F.innerHTML = `<div class="none">None yet. Lay a meld on a Charter on offer to found it.</div>`;
    const one = mine && cs.length === 1 && !cs[0].writ && this.g.canPlay(0, 1) ? cs[0] : null;
    const room = dense ? 136 : 142, cw = dense ? 26 : 36;
    for (const ch of g.charters) {
      const d = document.createElement("div");
      const can = one && fits(one, ch);
      const left = g.roundsLeft(ch);
      const owner = g.players[ch.owner].character.name;
      d.className = "charter parchment" + (can ? " can" : "") + (this.fx.charter === ch.id ? " hidden-for-flight" : "");
      d.dataset.id = ch.id;
      d.style.setProperty("--pc", PCOL[ch.owner]);
      d.innerHTML = `<div class="bar"></div><div class="tname">${ch.def.name}</div><div class="yield">${tok(ch.def.res)}</div>
        <div class="fade${left <= 0 ? " warn" : ""}" title="${left <= 0 ? "Fades at its owner's next turn unless someone lays off on it" : "Rounds before it fades, unless someone lays off on it"}">${ic("fading")}${Math.max(0, left)}</div>
        ${ART.has(CHARKEY[owner]) ? `<div class="owner arms" title="${ch.owner === 0 ? "Yours" : owner}">${arms(owner)}</div>` : `<div class="owner portrait" style="--pc:${PCOL[ch.owner]}" title="${ch.owner === 0 ? "Yours" : owner}">${face(owner)}</div>`}
        <div class="meld"></div>${can ? `<div class="gain">+${ch.owner === 0 ? g.o.ownLayoffAP : g.o.layoffAP} AP</div>` : ""}`;
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
    $("qmore").textContent = g.qdeck.length ? `· ${g.qdeck.length} more in the deck` : "· none left in the deck";
  }

  renderBoard(g) {
    const live = this.g, me = g.players[0], mine = this.mine();
    const myTurn = g.turn === 0 && !live.over && this.mode !== "ai";
    $("me-char").innerHTML = `<div class="portrait" style="--pc:${PCOL[0]}">${face(me.character.name)}</div>
      <div class="nm">${me.character.name}</div><div class="ti">${me.character.title}</div>
      <div class="fv">${ic(TYPEKEY[me.character.favour])} Favours ${TYPES[me.character.favour]} (+${g.o.favourBonus})</div>`;
    const ap = g.turn === 0 && g.t ? g.t.ap : 0;
    $("me-ap").innerHTML = `${ic("ap")}${ap}<small>AP</small>`;
    $("me-ap").classList.toggle("off", !myTurn || this.mode === "draw");
    $("me-ap").title = "Action points: 1 to walk a step, work a place or buy a card";

    // the piles
    const drawing = mine && this.mode === "draw", buying = mine && this.mode === "play" && live.canBuy(0);
    const ds = $("deck").querySelector(".slot");
    ds.innerHTML = "";
    ds.className = "slot" + (g.deck.length ? "" : " empty");
    if (g.deck.length) ds.appendChild(backEl());
    $("deck").querySelector(".lbl").innerHTML = drawing ? "<b>Draw</b>" : buying ? "<b>Buy · 1 AP</b>" : `Deck · ${g.deck.length}`;
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
    $("discard").querySelector(".lbl").innerHTML = drawing && D.length ? "<b>Take</b>" : buying && D.length ? "<b>Buy · 1 AP</b>" : "Discard";
    $("discard").classList.toggle("go", (drawing || buying) && D.length > 0);

    // the hand, fanned; cards keep their elements so they slide when the hand changes
    const H = $("hand");
    const hand = me.hand.slice().sort(this.sortMode === "rank"
      ? (a, b) => (a.writ - b.writ) || a.r - b.r || a.s - b.s
      : (a, b) => (a.writ - b.writ) || a.s - b.s || a.r - b.r);
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
    $("btn-writ").disabled = !(playing && cs.length === 1 && cs[0].writ && !live.t.writUsed && live.canPlay(0, 1));
    $("btn-clear").disabled = !(playing && cs.length);
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
    else if (g.turn !== 0 || this.mode === "ai") st = `<b>${this.pname(g.turn !== 0 ? g.turn : this.aiTurn)}</b> is playing…`;
    else if (this.hint && mine) st = `<span class="hint">${this.hint.text}</span>`;
    else if (this.mode === "draw") st = `Your turn. <b>Draw ${live.t.drawsLeft}</b> from the deck or the discard pile.`;
    else if (this.mode === "trim") st = `Too many cards: pick <b>${me.hand.length - live.o.handLimit - this.drops.size}</b> more to throw away.`;
    else if (this.mode === "ending") st = "Ending your turn…";
    else if (cs.length >= 3 && isMeld(cs)) st = live.display.length ? `<b>A meld of ${cs.length}.</b> Click a Charter on offer to found it.` : "A meld, but no Charters are on offer.";
    else if (cs.length === 1 && cs[0].writ) st = "<b>Use Writ</b>, or discard it to end your turn.";
    else if (cs.length === 1 && live.charters.some(ch => fits(cs[0], ch))) st = "Click a glowing Charter to <b>lay it off</b>.";
    else if (cs.length === 1) st = "<b>Discard</b> it to end your turn.";
    else if (cs.length >= 2) st = "Not a meld yet.";
    else st = `<b>${live.t.ap} AP</b> to spend. Discard a card to end your turn.`;
    $("status").innerHTML = `<span>${st}</span>`;
  }
}

const app = new App();
