// river-core.js - "River" (working title): rummy meets a guild town.
// Rules engine only (no DOM).
//
// Cards: four heraldic suits (Dragon, Moon, Raven, Tower), ranks 1-12, plus
// a few Writs. Suits are only card structure; they are not resources.
// Resources: Gold, Steel, Faith, Lore.
// Town: six places in a ring. The Market, Forge, Temple and Library each
// make a resource; the Tavern offers quests; at the Harbour you trade.
//
// Your turn:
//  1. Your Charters pay rent: 1 of each one's resource. (A Charter nobody has
//     laid off onto for two rounds fades first: its cards are shuffled back
//     into the deck and the Charter goes back on offer.)
//  2. Draw 2 cards, each from the deck or the top of the discard pile.
//  3. Play cards for action points (AP), as well as 2 free AP:
//     - found a Charter: lay a meld (3+ of a rank, or 3+ in a row in one
//       suit) on any Charter on offer. It's yours. 1 AP and 1 renown per
//       card, and +2 AP if the meld is the Charter's preferred shape.
//     - lay off a card onto any Charter's meld: 2 AP if it's someone else's
//       (its owner gets 1 of the Charter's resource), 1 AP if it's yours.
//     - one Writ a turn: +2 AP, any card from the discard pile, or draw 2.
//  4. Spend AP: move one step (1), work your place (1), or buy a card from
//     the deck or the top of the discard pile.
//  5. Discard a card, then hand in one quest you can pay for.
//     Hold at most 8 cards and 10 resources.
// When someone reaches the target renown, the round is finished; most
// renown wins, counting each character's bonus for favoured quests.

const SUITS = ["Dragon", "Moon", "Raven", "Tower"];
const RES = ["Gold", "Steel", "Faith", "Lore"];
const GOLD = 0, STEEL = 1, FAITH = 2, LORE = 3;
const PLACES = ["Market", "Forge", "Tavern", "Temple", "Library", "Harbour"];
const MARKET = 0, FORGE = 1, TAVERN = 2, TEMPLE = 3, LIBRARY = 4, HARBOUR = 5;
const NPL = PLACES.length;
const ADJ = Array.from({ length: NPL }, (_, i) => [(i + NPL - 1) % NPL, (i + 1) % NPL]);
const DIST = ADJ.map((_, a) => ADJ.map((_, b) => { const d = Math.abs(a - b); return Math.min(d, NPL - d); }));
const PRODUCES = [GOLD, STEEL, -1, FAITH, LORE, -1];
const TYPES = ["Adventure", "Diplomacy", "Devotion", "Scholarship", "Exploration"];

// Preferred meld shapes for Charters.
const SHAPES = {
  set: { text: "a set", test: cs => isSet(cs) },
  run: { text: "a run", test: cs => isRun(cs) },
  run4: { text: "a run of 4 or more", test: cs => isRun(cs) && cs.length >= 4 },
  set4: { text: "a set of 4", test: cs => isSet(cs) && cs.length === 4 },
  long: { text: "5 or more cards", test: cs => cs.length >= 5 },
  low: { text: "all cards 4 or lower", test: cs => cs.every(c => c.r <= 4) },
  high: { text: "all cards 9 or higher", test: cs => cs.every(c => c.r >= 9) }
};
const CHARTERS = [
  { name: "Merchants' Guild", res: GOLD, shape: "set" },
  { name: "Royal Mint", res: GOLD, shape: "high" },
  { name: "Counting House", res: GOLD, shape: "run4" },
  { name: "Armourers' Guild", res: STEEL, shape: "run" },
  { name: "City Watch", res: STEEL, shape: "set4" },
  { name: "Free Company", res: STEEL, shape: "long" },
  { name: "Cathedral Chapter", res: FAITH, shape: "set" },
  { name: "Order of Pilgrims", res: FAITH, shape: "low" },
  { name: "House of Healing", res: FAITH, shape: "run" },
  { name: "University", res: LORE, shape: "run4" },
  { name: "Scriveners' Guild", res: LORE, shape: "set" },
  { name: "Star Chamber", res: LORE, shape: "high" }
];

const Q = (name, type, need, pts) => ({ name, type, need: [need.G || 0, need.S || 0, need.F || 0, need.L || 0], pts });
const QUESTS = [
  Q("Clear the sewers", 0, { S: 2, G: 1 }, 6), Q("Escort the caravan", 0, { S: 2, F: 1 }, 6), Q("Hunt the wyvern", 0, { S: 3, L: 1 }, 8),
  Q("Defend the bridge", 0, { S: 2, G: 2 }, 8), Q("Storm the bandit keep", 0, { S: 3, G: 1, F: 1 }, 10), Q("Slay the dragon", 0, { S: 4, L: 1, F: 1 }, 13),
  Q("Bribe the magistrate", 1, { G: 2, L: 1 }, 6), Q("Host a banquet", 1, { G: 2, F: 1 }, 6), Q("Negotiate a truce", 1, { G: 3, S: 1 }, 8),
  Q("Charter the fleet", 1, { G: 2, S: 2 }, 8), Q("Arrange a royal marriage", 1, { G: 3, F: 1, L: 1 }, 10), Q("Crown the prince", 1, { G: 4, F: 1, S: 1 }, 13),
  Q("Bless the harvest", 2, { F: 2, G: 1 }, 6), Q("Tend the sick", 2, { F: 2, L: 1 }, 6), Q("Consecrate the shrine", 2, { F: 3, G: 1 }, 8),
  Q("Exorcise the crypt", 2, { F: 2, S: 2 }, 8), Q("Lead the pilgrimage", 2, { F: 3, S: 1, G: 1 }, 10), Q("Raise the cathedral", 2, { F: 4, G: 1, L: 1 }, 13),
  Q("Copy the codex", 3, { L: 2, G: 1 }, 6), Q("Chart the stars", 3, { L: 2, F: 1 }, 6), Q("Decipher the runes", 3, { L: 3, S: 1 }, 8),
  Q("Brew an elixir", 3, { L: 2, F: 2 }, 8), Q("Found an academy", 3, { L: 3, G: 1, F: 1 }, 10), Q("Bind the demon", 3, { L: 4, S: 1, F: 1 }, 13),
  Q("Map the marshes", 4, { G: 1, S: 1, L: 1 }, 6), Q("Cross the mountains", 4, { S: 1, F: 1, L: 1 }, 6), Q("Sail the Dragon Sea", 4, { G: 1, S: 1, F: 1, L: 1 }, 9),
  Q("Find the lost city", 4, { G: 2, S: 1, F: 1, L: 1 }, 11), Q("Climb the Moon Peak", 4, { G: 1, S: 2, F: 1, L: 1 }, 11), Q("Reach the world's edge", 4, { G: 2, S: 2, F: 1, L: 2 }, 15)
];
const CHARACTERS = [
  { name: "Ser Aldric", title: "Knight of the Bridge", favour: 0 },
  { name: "Lady Velia", title: "Envoy of the Crown", favour: 1 },
  { name: "Brother Anselm", title: "Keeper of the Shrine", favour: 2 },
  { name: "Magister Orrin", title: "Master of the Archive", favour: 3 },
  { name: "Kestra", title: "Far-Wanderer", favour: 4 }
];

const RV_DEFAULTS = {
  players: 3, ranks: 12, writs: 6, handStart: 7, draws: 2, display: 4,
  freeAP: 2, meldAP: 1, meldRenown: 1, shapeAP: 2, layoffAP: 2, ownLayoffAP: 1, writAP: 2,
  ownerBonus: 1, rent: 1, workYield: 1, life: 2,
  buyCost: 1, buyCap: 2,          // AP per bought card, and at most this many a turn
  questLimit: 3, startQuests: 2, questsPerTurn: 1, favourBonus: 4,
  qrowSize: 4,      // quests on offer at the Tavern
  favStart: true,   // one of your starting quests is of your favoured type
  handLimit: 8, resCap: 10, target: 70, maxRounds: 40
};

function shuffle(a, rnd = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

// ---------------------------------------------------------------- melds
function isSet(cs) { return cs.length >= 3 && cs.every(c => !c.writ && c.r === cs[0].r); }
function isRun(cs) {
  if (cs.length < 3 || cs.some(c => c.writ || c.s !== cs[0].s)) return false;
  const rs = cs.map(c => c.r).sort((a, b) => a - b);
  for (let i = 1; i < rs.length; i++) if (rs[i] !== rs[i - 1] + 1) return false;
  return true;
}
function isMeld(cs) { return isSet(cs) || isRun(cs); }
// Would this card extend a founded Charter's meld?
function fits(card, ch) {
  if (card.writ) return false;
  if (ch.kind === "set") return card.r === ch.cards[0].r;
  if (card.s !== ch.cards[0].s) return false;
  let lo = 99, hi = 0;
  for (const c of ch.cards) { if (c.r < lo) lo = c.r; if (c.r > hi) hi = c.r; }
  return card.r === lo - 1 || card.r === hi + 1;
}

class RiverGame {
  constructor(opts = {}) { this.o = Object.assign({}, RV_DEFAULTS, opts); }

  setup(rnd = Math.random) {
    const o = this.o;
    this.rnd = rnd;
    const cards = [];
    let id = 0;
    for (let s = 0; s < 4; s++) for (let r = 1; r <= o.ranks; r++) cards.push({ id: id++, s, r, writ: false });
    for (let k = 0; k < o.writs; k++) cards.push({ id: id++, s: -1, r: 0, writ: true });
    this.deck = shuffle(cards, rnd);
    this.discard = [this.deck.pop()];
    this.charterDeck = shuffle(CHARTERS.map((c, i) => Object.assign({ cid: i }, c)), rnd);
    this.display = this.charterDeck.splice(0, o.display);
    this.charters = [];
    this.nextCharter = 0;
    this.qdeck = shuffle(QUESTS.map((q, i) => Object.assign({ id: i }, q)), rnd);
    const chars = shuffle(CHARACTERS.slice(), rnd);
    this.players = [];
    for (let p = 0; p < o.players; p++) {
      const character = chars[p % chars.length], quests = [];
      if (o.favStart) { const i = this.qdeck.findIndex(q => q.type === character.favour); if (i >= 0) quests.push(this.qdeck.splice(i, 1)[0]); }
      while (quests.length < o.startQuests) quests.push(this.qdeck.pop());
      this.players.push({ pos: TAVERN, hand: this.deck.splice(0, o.handStart), res: [0, 0, 0, 0], quests, done: [], renown: 0, character });
    }
    this.qrow = this.qdeck.splice(0, o.qrowSize);
    this.turn = 0;
    this.round = 1;
    this.turnCount = 0;
    this.over = false;
    this.endTriggered = false;
    this.stats = { founds: 0, shapeHits: 0, layoffs: 0, ownLayoffs: 0, faded: 0, writs: 0, buys: 0, moves: 0, quests: 0, offType: 0,
      fromWork: 0, fromRent: 0, fromOwner: 0, swaps: 0, works: new Array(NPL).fill(0), apSpent: 0, apWasted: 0, discardDraws: 0, capped: 0, charterLife: 0 };
    this.startTurn();
  }

  pl(p) { return this.players[p]; }

  draw1() {
    if (!this.deck.length) {
      const top = this.discard.pop();
      this.deck = shuffle(this.discard, this.rnd);
      this.discard = top ? [top] : [];
    }
    return this.deck.pop() || null;
  }

  // Rounds a Charter has left before it fades (0: fades at its owner's next turn).
  roundsLeft(ch) { return this.o.life - Math.floor((this.turnCount - ch.touched) / this.o.players); }

  startTurn() {
    const p = this.turn, o = this.o, pl = this.pl(p);
    // fading
    const keep = [];
    this.lastFaded = [];
    for (const ch of this.charters) {
      if (ch.owner === p && this.turnCount - ch.touched >= o.players * o.life) {
        for (const c of ch.cards) this.deck.splice(Math.floor(this.rnd() * (this.deck.length + 1)), 0, c);
        this.charterDeck.push(ch.def);
        this.lastFaded.push(ch);
        if (this.stats) { this.stats.faded++; this.stats.charterLife += this.turnCount - ch.born; }
      } else keep.push(ch);
    }
    this.charters = keep;
    this.refillDisplay();
    // rent
    this.lastRent = [0, 0, 0, 0];
    for (const ch of this.charters) if (ch.owner === p) { pl.res[ch.def.res] += o.rent; this.lastRent[ch.def.res] += o.rent; if (this.stats) this.stats.fromRent += o.rent; }
    this.t = { drawsLeft: o.draws, ap: o.freeAP, writUsed: false, buys: 0, discarded: false, handed: 0 };
  }

  refillDisplay() { while (this.display.length < this.o.display && this.charterDeck.length) this.display.push(this.charterDeck.shift()); }

  draw(p, from) {
    if (p !== this.turn || this.t.drawsLeft <= 0) throw new Error("no draws left");
    let c = null;
    if (from === "discard" && this.discard.length) { c = this.discard.pop(); if (this.stats) this.stats.discardDraws++; }
    else c = this.draw1();
    if (c) this.pl(p).hand.push(c);
    this.t.drawsLeft--;
    return c;
  }

  canPlay(p, n) { return p === this.turn && this.t.drawsLeft === 0 && !this.t.discarded && this.pl(p).hand.length - n >= 1; }

  // Found a Charter: a meld laid on the Charter at position di of the display.
  found(p, ids, di) {
    const pl = this.pl(p), o = this.o;
    const cs = ids.map(id => pl.hand.find(c => c.id === id));
    const def = this.display[di];
    if (!def || cs.some(c => !c) || !this.canPlay(p, cs.length) || !isMeld(cs)) throw new Error("can't found");
    pl.hand = pl.hand.filter(c => !ids.includes(c.id));
    this.display.splice(di, 1);
    const shapeHit = SHAPES[def.shape].test(cs);
    const ch = { id: this.nextCharter++, def, owner: p, kind: isSet(cs) ? "set" : "run", cards: cs, touched: this.turnCount, born: this.turnCount };
    this.charters.push(ch);
    this.refillDisplay();
    this.t.ap += cs.length * o.meldAP + (shapeHit ? o.shapeAP : 0);
    pl.renown += cs.length * o.meldRenown;
    if (this.stats) { this.stats.founds++; if (shapeHit) this.stats.shapeHits++; }
    return { ch, shapeHit };
  }

  layoff(p, id, chId) {
    const pl = this.pl(p), o = this.o;
    const c = pl.hand.find(x => x.id === id), ch = this.charters.find(x => x.id === chId);
    if (!c || !ch || !this.canPlay(p, 1) || !fits(c, ch)) throw new Error("can't lay off");
    pl.hand = pl.hand.filter(x => x.id !== id);
    ch.cards.push(c);
    ch.touched = this.turnCount;
    if (ch.owner === p) { this.t.ap += o.ownLayoffAP; if (this.stats) this.stats.ownLayoffs++; }
    else {
      this.t.ap += o.layoffAP;
      this.pl(ch.owner).res[ch.def.res] += o.ownerBonus;
      if (this.stats) { this.stats.layoffs++; this.stats.fromOwner += o.ownerBonus; }
    }
    return true;
  }

  // mode: "ap" | "salvage" (arg: index in the discard pile) | "draw"
  writ(p, id, mode, arg) {
    const pl = this.pl(p);
    const c = pl.hand.find(x => x.id === id);
    if (!c || !c.writ || this.t.writUsed || !this.canPlay(p, 1)) throw new Error("can't use a writ");
    pl.hand = pl.hand.filter(x => x.id !== id);
    this.t.writUsed = true;
    if (mode === "salvage" && this.discard.length) {
      const i = Math.max(0, Math.min(this.discard.length - 1, arg == null ? this.discard.length - 1 : arg));
      pl.hand.push(this.discard.splice(i, 1)[0]);
    } else if (mode === "draw") {
      for (let k = 0; k < 2; k++) { const d = this.draw1(); if (d) pl.hand.push(d); }
    } else this.t.ap += this.o.writAP;
    this.discard.push(c);
    if (this.stats) this.stats.writs++;
  }

  canBuy(p) { return p === this.turn && this.t.drawsLeft === 0 && !this.t.discarded && this.t.ap >= this.o.buyCost && this.t.buys < this.o.buyCap; }
  buy(p, from) {
    if (!this.canBuy(p)) throw new Error("can't buy");
    let c = null;
    if (from === "discard" && this.discard.length) c = this.discard.pop(); else c = this.draw1();
    if (c) this.pl(p).hand.push(c);
    this.t.ap -= this.o.buyCost;
    this.t.buys++;
    if (this.stats) { this.stats.buys++; this.stats.apSpent += this.o.buyCost; }
    return c;
  }

  move(p, dest) {
    const pl = this.pl(p);
    if (p !== this.turn || this.t.drawsLeft > 0 || this.t.discarded || this.t.ap < 1 || !ADJ[pl.pos].includes(dest)) throw new Error("can't move");
    pl.pos = dest;
    this.t.ap--;
    if (this.stats) { this.stats.moves++; this.stats.apSpent++; }
  }

  canWork(p) {
    const pl = this.pl(p), sp = pl.pos;
    if (p !== this.turn || this.t.drawsLeft > 0 || this.t.discarded || this.t.ap < 1) return false;
    if (PRODUCES[sp] >= 0) return true;
    if (sp === TAVERN) return pl.quests.length < this.o.questLimit && (this.qrow.length > 0 || this.qdeck.length > 0);
    if (sp === HARBOUR) return pl.res.some(x => x > 0);
    return false;
  }

  // Tavern: arg = index in the quest row (-1: the top of the quest deck).
  // Harbour: arg = [give, get].
  work(p, arg) {
    const pl = this.pl(p), sp = pl.pos;
    if (!this.canWork(p)) throw new Error("can't work");
    const r = PRODUCES[sp];
    if (r >= 0) { pl.res[r] += this.o.workYield; if (this.stats) this.stats.fromWork += this.o.workYield; }
    else if (sp === TAVERN) {
      let q = null;
      if (arg != null && arg >= 0 && this.qrow[arg]) { q = this.qrow.splice(arg, 1)[0]; if (this.qdeck.length) this.qrow.push(this.qdeck.pop()); }
      else if (this.qdeck.length) q = this.qdeck.pop();
      if (!q) throw new Error("no quests left");
      pl.quests.push(q);
    } else if (sp === HARBOUR) {
      if (!arg || arg[0] === arg[1] || pl.res[arg[0]] < 1) throw new Error("bad trade");
      pl.res[arg[0]]--; pl.res[arg[1]]++;
      if (this.stats) this.stats.swaps++;
    }
    this.t.ap--;
    if (this.stats) { this.stats.works[sp]++; this.stats.apSpent++; }
  }

  discardCard(p, id) {
    const pl = this.pl(p);
    const c = pl.hand.find(x => x.id === id);
    if (!c || p !== this.turn || this.t.drawsLeft > 0 || this.t.discarded) throw new Error("can't discard");
    pl.hand = pl.hand.filter(x => x.id !== id);
    this.discard.push(c);
    this.t.discarded = true;
    if (this.stats) this.stats.apWasted += this.t.ap;
    this.t.ap = 0;
  }

  canHandIn(p, qi) {
    const pl = this.pl(p), q = pl.quests[qi];
    return !!q && p === this.turn && this.t.discarded && this.t.handed < this.o.questsPerTurn && q.need.every((n, r) => pl.res[r] >= n);
  }

  handIn(p, qi) {
    if (!this.canHandIn(p, qi)) return false;
    const pl = this.pl(p), q = pl.quests[qi];
    for (let r = 0; r < 4; r++) pl.res[r] -= q.need[r];
    pl.renown += q.pts;
    pl.quests.splice(qi, 1);
    pl.done.push(q);
    this.t.handed++;
    if (this.stats) { this.stats.quests++; if (q.type !== pl.character.favour) this.stats.offType++; }
    if (this.score(p) >= this.o.target) this.endTriggered = true;
    return true;
  }

  // drop: resources to give up first when over the cap (counts per resource).
  endTurn(p, drop = null) {
    const pl = this.pl(p);
    if (p !== this.turn || !this.t.discarded) throw new Error("discard first");
    if (pl.hand.length > this.o.handLimit) this.discard.push(...pl.hand.splice(this.o.handLimit));
    let total = pl.res.reduce((a, b) => a + b, 0);
    if (total > this.o.resCap) {
      if (this.stats) this.stats.capped++;
      if (drop) for (let r = 0; r < 4; r++) { const d = Math.min(drop[r] || 0, pl.res[r], total - this.o.resCap); pl.res[r] -= d; total -= d; }
      while (total > this.o.resCap) { let r = 0; for (let k = 1; k < 4; k++) if (pl.res[k] > pl.res[r]) r = k; pl.res[r]--; total--; }
    }
    this.turnCount++;
    this.turn = (this.turn + 1) % this.players.length;
    if (this.turn === 0) {
      if (this.endTriggered) { this.over = true; return; }
      if (++this.round > this.o.maxRounds) { this.over = true; return; }
    }
    this.startTurn();
  }

  // Renown including the character's bonus for favoured quests.
  score(p) {
    const pl = this.pl(p);
    return pl.renown + pl.done.filter(q => q.type === pl.character.favour).length * this.o.favourBonus;
  }
  final(p) { return this.score(p); }

  clone() {
    const g = Object.create(RiverGame.prototype);
    g.o = this.o; g.rnd = this.rnd;
    g.deck = this.deck.slice(); g.discard = this.discard.slice();
    g.charterDeck = this.charterDeck.slice(); g.display = this.display.slice();
    g.charters = this.charters.map(ch => ({ id: ch.id, def: ch.def, owner: ch.owner, kind: ch.kind, cards: ch.cards.slice(), touched: ch.touched, born: ch.born }));
    g.nextCharter = this.nextCharter;
    g.qdeck = this.qdeck.slice(); g.qrow = this.qrow.slice();
    g.players = this.players.map(pl => ({ pos: pl.pos, hand: pl.hand.slice(), res: pl.res.slice(), quests: pl.quests.slice(), done: pl.done.slice(), renown: pl.renown, character: pl.character }));
    g.turn = this.turn; g.round = this.round; g.turnCount = this.turnCount; g.over = this.over; g.endTriggered = this.endTriggered;
    g.t = Object.assign({}, this.t);
    g.stats = null;
    return g;
  }
}

if (typeof module !== "undefined" && typeof window === "undefined") {
  module.exports = { RiverGame, RV_DEFAULTS, SUITS, RES, PLACES, TYPES, ADJ, DIST, PRODUCES, QUESTS, CHARTERS, CHARACTERS, SHAPES, shuffle, isSet, isRun, isMeld, fits,
    MARKET, FORGE, TAVERN, TEMPLE, LIBRARY, HARBOUR, GOLD, STEEL, FAITH, LORE };
}
