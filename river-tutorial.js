// river-tutorial.js - two guided turns of River against Ser Aldric.
// The deal is set up so your turns look like ordinary ones (7 AP, then 6), and so that
// Ser Aldric lays a card off on the Charter you found, which pays you.

function tutorialGame() {
  const g = new RiverGame({ players: 2 });
  g.setup();
  const pool = [...g.deck, ...g.discard, ...g.players.flatMap(pl => pl.hand)];
  const take = (s, r) => pool.splice(pool.findIndex(c => !c.writ && c.s === s && c.r === r), 1)[0];
  const writ = () => pool.splice(pool.findIndex(c => c.writ), 1)[0];
  const DRAGON = 0, MOON = 1, RAVEN = 2, TOWER = 3;
  const me = g.players[0], aldric = g.players[1];
  me.character = CHARACTERS.find(c => c.name === "Lady Velia");
  aldric.character = CHARACTERS.find(c => c.name === "Ser Aldric");
  me.hand = [take(DRAGON, 9), take(TOWER, 9), take(MOON, 8), writ(), take(DRAGON, 2), take(RAVEN, 11), take(TOWER, 4)];
  const aldricRun = [take(MOON, 5), take(MOON, 6), take(MOON, 7)];
  // nothing in Ser Aldric's hand makes a meld; his 9 of Moons fits the set of 9s you are about to lay down
  aldric.hand = [take(MOON, 9), take(DRAGON, 12), take(RAVEN, 1), take(TOWER, 3), take(MOON, 11), take(DRAGON, 6), take(TOWER, 8)];
  g.discard = [take(RAVEN, 9)];
  // the top of the deck in drawing order: your second draw, your buy, then quiet cards for Ser Aldric
  const top = [take(RAVEN, 3), take(TOWER, 12), take(TOWER, 10), take(RAVEN, 5), take(RAVEN, 7), take(MOON, 2), take(RAVEN, 12), take(DRAGON, 4)];
  shuffle(pool);
  g.deck = pool.concat(top.reverse());
  // charters
  const def = name => Object.assign({ cid: CHARTERS.findIndex(c => c.name === name) }, CHARTERS.find(c => c.name === name));
  g.display = ["Merchants' Guild", "Armourers' Guild", "University", "Cathedral Chapter"].map(def);
  g.charterDeck = shuffle(CHARTERS.filter(c => !["Merchants' Guild", "Armourers' Guild", "University", "Cathedral Chapter", "Free Company"].includes(c.name)).map(c => def(c.name)));
  g.charters = [{ id: g.nextCharter++, def: def("Free Company"), owner: 1, kind: "run", cards: aldricRun, touched: 0, born: 0 }];
  // quests
  const quest = name => Object.assign({ id: QUESTS.findIndex(q => q.name === name) }, QUESTS.find(q => q.name === name));
  const mine = ["Host a banquet", "Bribe the magistrate"];
  me.quests = mine.map(quest);
  aldric.quests = ["Hunt the wyvern", "Escort the caravan"].map(quest);
  const used = [...mine, "Hunt the wyvern", "Escort the caravan"];
  g.qdeck = shuffle(QUESTS.filter(q => !used.includes(q.name)).map(q => quest(q.name)));
  g.qrow = g.qdeck.splice(0, g.o.qrowSize);
  me.res = [0, 0, 1, 0];
  aldric.res = [0, 1, 0, 0];
  me.pos = TAVERN;
  aldric.pos = TEMPLE;
  g.t = { drawsLeft: 2, ap: g.o.freeAP, writUsed: false, buys: 0, discarded: false, handed: 0 };
  return g;
}

const tutCard = (g, s, r) => g.players[0].hand.find(c => !c.writ && c.s === s && c.r === r);
const tutDisplay = (g, name) => g.display.findIndex(d => d.name === name);
const tutGuild = g => g.charters.find(ch => ch.owner === 0 && ch.def.name === "Merchants' Guild");
const tutCompany = g => g.charters.find(ch => ch.owner === 1);
// turnCount is 0 on your first turn, 1 on Ser Aldric's, 2 on your second
const firstTurn = g => g.turnCount === 0, secondTurn = g => g.turnCount === 2;
// the next place on the way to a place (or the place itself)
const tutStep = (g, to) => { const at = g.players[0].pos; return at === to ? to : ADJ[at].find(n => DIST[n][to] < DIST[at][to]); };

// Each step: a short instruction (head), with the why of it behind "Tell me more" (more).
// The coach steps aside while Ser Aldric plays.
const TUT_STEPS = [
  // ---------------------------------------------------------------- your first turn
  {
    head: "Welcome to <b>River</b>. You win renown by completing <b>quests</b>.",
    more: "Your quests are at the bottom right. They cost <b>resources</b>, which you get by working places in the <b>town</b>. Walking and working cost <b>action points</b> (AP), and you earn AP by playing cards onto <b>Charters</b>: new ones along the top, founded ones on the left.",
    next: true, hi: () => ({ sel: ["#my-quests", "#town .place", "#offers", "#charters"] })
  },
  {
    head: "Take the <b>9 of Ravens</b> from the discard pile.",
    more: "Each turn starts with two draws, from the deck or the discard pile. This 9 goes with the two 9s in your hand.",
    allow: (k, i) => k === "draw" && i === "discard", done: g => !firstTurn(g) || g.t.drawsLeft < 2, hi: () => ({ sel: ["#discard"] })
  },
  {
    head: "Now draw a card from the <b>deck</b>.",
    more: "That's your second draw. Now you can play cards.",
    allow: (k, i) => k === "draw" && i === "deck", done: g => !firstTurn(g) || g.t.drawsLeft === 0, hi: () => ({ sel: ["#deck"] })
  },
  {
    head: "Select your three <b>9s</b>, then click the <b>Merchants' Guild</b>.",
    more: "Three of a rank is a <b>set</b>, which is a meld. Founding a Charter with a meld gives 1 AP for each card, and 2 more because the Guild prefers a set. The Charter is yours now, and pays you 1 Gold every turn.",
    allow: k => k === "found", done: g => !!tutGuild(g),
    hi: g => ({ cards: g.players[0].hand.filter(c => !c.writ && c.r === 9).map(c => c.id), sel: [`.offer[data-i="${tutDisplay(g, "Merchants' Guild")}"]`] })
  },
  {
    head: g => `You have <b>${g.t.ap} AP</b>. Walk to the <b>Market</b>: click the Forge, then the Market.`,
    more: "Your quest <i>Host a banquet</i> needs 2 Gold, and the Market makes Gold. Each step costs 1 AP.",
    allow: (k, i) => k === "move" && (i === FORGE || i === MARKET), done: g => !firstTurn(g) || g.players[0].pos === MARKET,
    hi: () => ({ sel: [`.place[data-sp="${FORGE}"]`, `.place[data-sp="${MARKET}"]`] })
  },
  {
    head: "Click the <b>Market</b> twice to work it.",
    more: "Each work costs 1 AP and gives you 1 Gold.",
    allow: (k, i) => k === "work" && i === MARKET, done: g => !firstTurn(g) || g.players[0].res[GOLD] >= 2,
    hi: () => ({ sel: [`.place[data-sp="${MARKET}"]`, "#me-res"] })
  },
  {
    head: "Click the <b>deck</b> to buy a card for 1 AP.",
    more: "You can buy up to two cards a turn, from the deck or the discard pile.",
    allow: k => k === "buy", done: g => !firstTurn(g) || g.t.buys >= 1, hi: () => ({ sel: ["#deck"] })
  },
  {
    head: "Spend your last AP as you like, then press <b>Next</b>.",
    more: "Your other quest needs Gold too, so working the Market again is a good use.",
    allow: k => ["move", "work", "buy"].includes(k), next: true, hi: () => ({ sel: ["#me-ap"] })
  },
  {
    head: "Select the <b>2 of Dragons</b> and press <b>Discard &amp; end turn</b>. Then hand in <i>Host a banquet</i>.",
    more: "Discarding a card ends your turn. Then you can hand in one quest you can pay for. Lady Velia favours Diplomacy, so it scores 4 extra renown.",
    allow: k => k === "end", done: g => !firstTurn(g),
    hi: g => { const c = tutCard(g, 0, 2); return { cards: c ? [c.id] : [], sel: ["#btn-end"] }; }
  },
  // ---------------------------------------------------------------- your second turn
  {
    head: g => {
      const ch = tutGuild(g), c = ch && ch.cards.length > 3 ? ch.cards[3] : null;
      return c ? `Ser Aldric laid his <b>${c.r} of ${SUITS[c.s]}s</b> on your Merchants' Guild, which paid you <b>1 Gold</b>. Its rent paid you another.`
        : "Your Merchants' Guild paid you <b>1 Gold</b> rent at the start of your turn.";
    },
    more: "Your Charters pay you at the start of each of your turns, and again whenever someone lays off on them. A Charter other people can use pays you most.",
    next: true, hi: g => ({ sel: tutGuild(g) ? [`.charter[data-id="${tutGuild(g).id}"]`, "#me-res"] : ["#me-res"] })
  },
  {
    head: "Draw your two cards.",
    more: "From the deck or the discard pile, as you like.",
    allow: k => k === "draw", done: g => !secondTurn(g) || g.t.drawsLeft === 0, hi: () => ({ sel: ["#deck", "#discard"] })
  },
  {
    head: "Select the <b>8 of Moons</b> and click Ser Aldric's <b>Free Company</b>.",
    more: "Your 8 extends his 5, 6, 7 run. Laying off on someone else's Charter gives you 2 AP, and its owner gets 1 resource.",
    allow: (k, i) => k === "layoff" && i === 1, done: g => !secondTurn(g) || (tutCompany(g) && tutCompany(g).cards.some(c => c.s === 1 && c.r === 8)),
    hi: g => { const c = tutCard(g, 1, 8); return { cards: c ? [c.id] : [], sel: tutCompany(g) ? [`.charter[data-id="${tutCompany(g).id}"]`] : [] }; }
  },
  {
    head: "Select the <b>Writ</b>, press <b>Use Writ</b> and take <b>+2 AP</b>.",
    more: "Writs are special cards. You can use one a turn: for 2 AP, two cards from the deck, or any card from the discard pile.",
    allow: k => k === "writ", done: g => !secondTurn(g) || g.t.writUsed,
    hi: g => ({ cards: g.players[0].hand.filter(c => c.writ).map(c => c.id), sel: ["#btn-writ"] })
  },
  {
    head: g => `You have <b>${g.t.ap} AP</b>. Walk to the <b>Library</b> and work it once for <b>Lore</b>.`,
    more: "Your quest <i>Bribe the magistrate</i> needs 2 Gold and 1 Lore, and you already have the Gold.",
    allow: (k, i) => k === "move" || (k === "work" && i === LIBRARY), done: g => !secondTurn(g) || g.players[0].res[LORE] >= 1,
    hi: g => ({ sel: [`.place[data-sp="${tutStep(g, LIBRARY)}"]`, `.place[data-sp="${LIBRARY}"]`] })
  },
  {
    head: "Spend your last AP as you like, then press <b>Next</b>.",
    more: "Any Gold or Lore you gather now is a start on your next quest.",
    allow: k => ["move", "work", "buy", "found", "layoff"].includes(k), next: true, hi: () => ({ sel: ["#me-ap"] })
  },
  {
    head: "Discard a card to end your turn, then hand in <i>Bribe the magistrate</i>.",
    more: "Any card will do. Keep the ones that might make melds later.",
    allow: k => k === "end", done: g => g.turnCount > 2, hi: () => ({ sel: ["#btn-end"] })
  },
  {
    head: "That's how River plays. <b>Play on</b> against Ser Aldric, or go back to the menu.",
    more: "A Charter that nobody lays off on for two rounds fades, and its cards go back into the deck. Take new quests at the Tavern. The first to 70 renown ends the game at the end of that round.",
    finish: true, allow: () => true
  }
];

const COACH_HOME = { x: 1192, y: 184 };

class Tutorial {
  constructor(app) {
    this.app = app;
    this.i = 0;
    this.box = document.getElementById("coach");
    this.open = load("more", false);
    this.placed = false;
    // the coach can be dragged anywhere on the table, and remembers where
    if (!this.box.dataset.drag) { this.box.dataset.drag = "1"; draggable(this.box, app, { onEnd: () => app.tut && app.tut.moved() }); }
  }
  get step() { return TUT_STEPS[this.i]; }
  allows(kind, info) { const s = this.step; return !!(s && s.allow && s.allow(kind, info, this.app.g)); }
  advance() { while (this.step && this.step.done && this.step.done(this.app.g)) this.i++; }
  nudge() { this.box.classList.remove("nudge"); void this.box.offsetWidth; this.box.classList.add("nudge"); }
  // Put the coach where it was left (or over the Tavern, which it then hides).
  place() {
    const p = load("coach", COACH_HOME);
    const x = Math.max(80 - this.box.offsetWidth, Math.min(1600 - 80, p.x)), y = Math.max(0, Math.min(860, p.y));
    Object.assign(this.box.style, { left: x + "px", top: y + "px", transform: "" });
    this.home();
  }
  moved() { save("coach", { x: this.box.offsetLeft, y: this.box.offsetTop }); this.home(); }
  home() {
    const at = this.box.style.display !== "none" && Math.abs(this.box.offsetLeft - COACH_HOME.x) < 30 && Math.abs(this.box.offsetTop - COACH_HOME.y) < 30;
    document.getElementById("stage").classList.toggle("tutoring", at);
  }
  decorate() {
    document.querySelectorAll(".tut-hi").forEach(e => e.classList.remove("tut-hi"));
    const s = this.step, app = this.app, g = app.g;
    if (!s) return this.close();
    // out of the way while Ser Aldric plays
    if (app.mode === "ai" || g.turn !== 0 || (app.view && app.view.turn !== 0)) { this.box.style.display = "none"; this.home(); return; }
    const head = typeof s.head === "function" ? s.head(g) : s.head;
    this.box.innerHTML = `<div class="seal">${ic("writ")}</div><div class="step">TUTORIAL · ${Math.min(this.i + 1, TUT_STEPS.length)} OF ${TUT_STEPS.length}</div>
      <div class="head">${head}</div>${this.open && s.more ? `<div class="more">${s.more}</div>` : ""}
      <div class="cb">${s.more ? `<button class="tog" id="t-tog">${this.open ? "Less" : "Tell me more"}</button>` : ""}${s.next ? `<button class="btn" id="t-next">Next</button>` : ""}${s.finish ? `<button class="btn dark" id="t-menu">Menu</button><button class="btn" id="t-on">Play on</button>` : `<button class="btn dark" id="t-skip">Skip tutorial</button>`}</div>`;
    this.box.style.display = "block";
    if (!this.placed) { this.placed = true; this.place(); } else this.home();
    const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
    on("t-tog", () => { this.open = !this.open; save("more", this.open); this.decorate(); });
    on("t-next", () => { this.i++; app.render(); });
    on("t-skip", () => { this.close(); app.render(); });
    on("t-on", () => { this.close(); app.render(); });
    on("t-menu", () => { this.close(); app.showStart(); });
    const h = s.hi ? s.hi(g) : {};
    for (const sel of h.sel || []) document.querySelectorAll(sel).forEach(e => e.classList.add("tut-hi"));
    for (const id of h.cards || []) document.querySelectorAll(`#hand .card[data-id="${id}"]`).forEach(e => e.classList.add("tut-hi"));
  }
  close() {
    this.box.style.display = "none";
    document.getElementById("stage").classList.remove("tutoring");
    document.querySelectorAll(".tut-hi").forEach(e => e.classList.remove("tut-hi"));
    if (this.app.tut === this) this.app.tut = null;
  }
}
