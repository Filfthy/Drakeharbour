// river-core.js - "River" (working title): rummy meets a guild town.
// Rules engine only (no DOM).
//
// Cards: four heraldic suits (Dragon, Moon, Raven, Tower), ranks 1-12, plus
// spell cards. Suits are only card structure; they are not resources.
// Resources: Gold, Steel, Faith, Lore.
// Town: six places in a ring. The Market, Forge, Temple and Library each
// make a resource; the Tavern offers quests; at the Harbour you trade.
//
// Your turn:
//  1. Your Charters pay rent: 1 of each one's resource. (A Charter nobody has
//     laid off onto for two rounds fades first: its cards are shuffled back
//     into the deck and the Charter goes back on offer.)
//  2. Draw 2 cards, each from the deck or the top of the discard pile.
//  3. Play cards for stamina (AP in the code), as well as 2 free AP:
//     - found a Charter: lay a meld (3+ of a rank, or 3+ in a row in one
//       suit) on any Charter on offer. It's yours. 1 AP and 1 renown per
//       card, and +2 AP if the meld is the Charter's preferred shape.
//     - lay off a card onto any Charter's meld: 2 AP if it's someone else's
//       (its owner gets 1 of the Charter's resource), 1 AP if it's yours.
//     - one spell a turn (Glamour, the wild card, counts when it's melded).
//  4. Spend AP: move one step (1), work your place, or buy a card from the
//     deck or the top of the discard pile. Each vendor (the Market, Forge,
//     Temple, Library and the card stall) raises its price as you buy from it:
//     1 AP for your first purchase there this turn, then 2, then 3.
// There are two copies of every card, so sets keep growing and lay-offs abound.
//  5. Discard a card, then hand in one quest you can pay for.
//     Hold at most 8 cards and 10 resources.
// Quests: open ones at the Tavern (the oldest leaves each round), a sealed
// commission (hidden until taken, worth more), and three-part sagas.
// Each round a town event is posted: one small boon that holds for everyone that round.
// When someone reaches the target renown, the round is finished; most
// renown wins, counting each character's bonus for favoured quests.

const SUITS = ["Dragon", "Moon", "Raven", "Tower"];
const RES = ["Gold", "Steel", "Faith", "Lore"];
const GOLD = 0, STEEL = 1, FAITH = 2, LORE = 3;
// Six places round the ring road, and the Square in the middle of town, a step from each of them.
const PLACES = ["Market", "Forge", "Tavern", "Temple", "Library", "Harbour", "Square"];
const MARKET = 0, FORGE = 1, TAVERN = 2, TEMPLE = 3, LIBRARY = 4, HARBOUR = 5, SQUARE = 6;
const NPL = 6;
const ADJ = Array.from({ length: NPL }, (_, i) => [(i + NPL - 1) % NPL, (i + 1) % NPL]);
const DIST = ADJ.map((_, a) => ADJ.map((_, b) => { const d = Math.abs(a - b); return Math.min(d, NPL - d); }));
const PRODUCES = [GOLD, STEEL, -1, FAITH, LORE, -1, -1];
const TYPES = ["Adventure", "Diplomacy", "Devotion", "Scholarship", "Exploration"];

// Spell cards. Glamour is the wild card: it is played in a meld, not cast.
const SPELLS = {
  blink: { name: "Blink", text: "Move your piece to any place, for no stamina." },
  glamour: { name: "Glamour", text: "A wild card. It stands in for any one card in a new meld, but that meld earns no shape bonus." },
  scry: { name: "Scry", text: "Draw two cards from the deck." },
  recall: { name: "Recall", text: "Take any card from the discard pile." },
  haggle: { name: "Haggle", text: "Every vendor's price drops back to 1 stamina." },
  renew: { name: "Renew", text: "One of your Charters is renewed: its rounds before it lapses start again from full." }
};

// Town events, one a round, the same for everyone.
const EVENTS = [
  { key: "market", name: "Market Day", text: "The Market gives 1 more Gold.", place: MARKET },
  { key: "forge", name: "The Smiths' Fair", text: "The Forge gives 1 more Steel.", place: FORGE },
  { key: "temple", name: "Pilgrim Season", text: "The Temple gives 1 more Faith.", place: TEMPLE },
  { key: "library", name: "The Scholars' Conclave", text: "The Library gives 1 more Lore.", place: LIBRARY },
  { key: "harbour", name: "Fair Winds", text: "Harbour trades give 2 for 1.", place: HARBOUR },
  { key: "bounty", name: "Bounty Night", text: "Each quest completed: +2 renown." },
  { key: "feast", name: "The Guild Feast", text: "Lay-offs on others' Charters: +1 stamina." },
  { key: "charter", name: "Charter Week", text: "Founding a Charter: +2 stamina." },
  { key: "free", name: "Free Market", text: "Prices don't rise this round." },
  { key: "progress", name: "The Royal Progress", text: "Everyone starts with 1 more stamina." }
];

// Preferred meld shapes for Charters.
const SHAPES = {
  set: { text: "a set", test: cs => isSet(cs) },
  run: { text: "a run", test: cs => isRun(cs) },
  run4: { text: "a run of 4 or more", test: cs => isRun(cs) && cs.length >= 4 },
  set4: { text: "a set of 4", test: cs => isSet(cs) && cs.length >= 4 },
  long: { text: "5 or more cards", test: cs => cs.length >= 5 },
  // "low" and "high" are the bottom and top third of the ranks: 4 or lower and 9 or higher with 12 ranks
  low: { get text() { return `all cards ${LOW} or lower`; }, test: cs => cs.every(c => c.r <= LOW) },
  high: { get text() { return `all cards ${HIGH} or higher`; }, test: cs => cs.every(c => c.r >= HIGH) }
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
// Sealed commissions: taken unseen from the Tavern, and worth about a quarter more than an open quest.
const SEALED = [
  Q("Smuggle silk past the toll", 1, { G: 2, S: 1 }, 8), Q("Steal the bishop's ledger", 3, { L: 2, F: 1 }, 8),
  Q("Rescue the hostage", 0, { S: 2, G: 1, F: 1 }, 10), Q("Bury the scandal", 1, { G: 3, L: 1 }, 10),
  Q("Forge the royal seal", 3, { L: 2, S: 1, G: 1 }, 10), Q("Break the witch's curse", 2, { F: 3, L: 1 }, 10),
  Q("Hunt the grave-robbers", 0, { S: 3, F: 1, L: 1 }, 13), Q("Ransom the merchant prince", 1, { G: 3, S: 1, F: 1 }, 13),
  Q("Sanctify the haunted mill", 2, { F: 3, S: 1, G: 1 }, 13), Q("Steal a dragon's egg", 4, { G: 1, S: 2, F: 1, L: 1 }, 13),
  Q("Unmask the spymaster", 3, { L: 3, G: 2, F: 1 }, 16), Q("Raise the drowned bell", 4, { G: 2, S: 2, F: 1, L: 1 }, 16)
];
// Sagas: three quests in a row. Part I is an open quest; completing a part hands you the next,
// worth more than an ordinary quest of its size, but of a different type.
const SAGAS = [
  { name: "The Sunken Crown", parts: [Q("Chart the wreck", 4, { G: 1, S: 1, L: 1 }, 6), Q("Raise the hull", 0, { S: 3, G: 1 }, 12), Q("Return the crown", 1, { G: 3, F: 1, L: 1 }, 16)] },
  { name: "The Heretic's Codex", parts: [Q("Find the forbidden book", 3, { L: 2, G: 1 }, 6), Q("Hide it from the Inquisition", 1, { G: 2, F: 1, L: 1 }, 12), Q("Purge its heresy", 2, { F: 3, L: 1, S: 1 }, 16)] },
  { name: "The Wyrm of the Moon Peak", parts: [Q("Track the wyrm", 4, { S: 1, F: 1, L: 1 }, 6), Q("Bless the spears", 2, { F: 2, S: 2 }, 12), Q("Slay the wyrm", 0, { S: 3, G: 1, F: 1 }, 16)] },
  { name: "The Pretender's Gambit", parts: [Q("Hear the rumour", 1, { G: 2, L: 1 }, 6), Q("Win the archbishop", 2, { F: 2, G: 2 }, 12), Q("Crown the true heir", 1, { G: 3, S: 1, L: 1 }, 16)] }
];
const sagaPart = (s, k) => Object.assign({ id: 100 + 3 * s + k, saga: s, part: k }, SAGAS[s].parts[k]);
// The open quests: the ordinary ones and the first part of each saga.
function questDeck(o) {
  return QUESTS.map((q, i) => Object.assign({ id: i }, q)).concat(o.sagas ? SAGAS.map((_, s) => sagaPart(s, 0)) : []);
}

const CHARACTERS = [
  { name: "Ser Aldric", title: "Knight of the Bridge", favour: 0 },
  { name: "Lady Velia", title: "Envoy of the Crown", favour: 1 },
  { name: "Brother Anselm", title: "Keeper of the Shrine", favour: 2 },
  { name: "Magister Orrin", title: "Master of the Archive", favour: 3 },
  { name: "Kestra", title: "Far-Wanderer", favour: 4 }
];

const RV_DEFAULTS = {
  players: 3, ranks: 8, handStart: 8, draws: 2, display: 4,
  copies: 2,        // copies of each suited card in the deck: two of everything, so sets can grow and lay-offs abound
  spells: { blink: 2, glamour: 2, scry: 2, recall: 2, haggle: 2, renew: 2 },   // copies of each in the deck
  freeAP: 2, meldAP: 1, meldRenown: 1, shapeAP: 2, layoffAP: 2, ownLayoffAP: 1,
  ownerBonus: 1, rent: 1, workYield: 1, life: 3,
  buyCost: 1, buyCap: 2,          // AP per bought card, and at most this many a turn
  escalate: true,   // purchases in a turn (resources or cards) rise in price: each costs 1 AP more than the one before,
  riseAfter: 1,     //   once this many have been made at the base price
  perVendor: true,  // each vendor (the Market, Forge, Temple, Library and the card stall) keeps its own count
  crowdAP: 0,       // extra AP to work a place where another player's piece stands
  questCards: true,  // completing a quest draws cards: 1 for a small one, 2 for a middling one, 3 for a big one
  refill: 0,         // at the start of your turn, a hand smaller than this is topped up from the deck, before the draws
  crowdLapse: 8,     // with this many Charters founded or more, they last a round less untended (0: never)
  setSuits: "found", // "distinct": a set's cards must all be different suits (so a set holds at most four);
                     // "found": a new set needs different suits, but any card of its rank can be laid off on it
  runAP: 0,          // extra AP for each card of a run, when it founds a Charter
  buyDraw: 1,        // cards a purchase from the deck brings (up to your hand limit, and always at least one)
  scryDraw: 2,       // cards Scry draws
  square: true,     // the Square in the middle of town: a step from every place, so nowhere is more than 2 AP away
  questLimit: 3, startQuests: 2, questsPerTurn: 1, favourBonus: 4,
  qrowSize: 4,      // quests on offer at the Tavern
  favStart: true,   // one of your starting quests is of your favoured type
  sealed: true,     // a sealed commission on offer at the Tavern
  sagas: true,      // three-part sagas among the quests
  refresh: true,    // the oldest quest on offer leaves the Tavern each round
  events: true,     // a town event each round
  handLimit: 9, resCap: 10, target: 100, maxRounds: 40
};

function shuffle(a, rnd = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

// ---------------------------------------------------------------- melds
// A meld is 3 or more cards of one rank (a set), or 3 or more in a row in one suit (a run).
// One Glamour may stand in for a card. Other spells never meld.
// With two copies of each card, a set can hold two of a suit (up to 8 cards).
let COPIES = 1, LOW = 4, HIGH = 9, SET_DISTINCT = false, SET_LAYOFF_DISTINCT = false;
// The deck's shape, used by the meld rules: copies of each card, and what counts as low and high.
function deckShape(o) { COPIES = o.copies || 1; LOW = Math.round(o.ranks / 3); HIGH = o.ranks - LOW + 1; SET_DISTINCT = o.setSuits === "distinct" || o.setSuits === "found"; SET_LAYOFF_DISTINCT = o.setSuits === "distinct"; }
const isWild = c => c.spell === "glamour";
function parts(cs) {
  const nat = [], wild = [];
  for (const c of cs) { if (!c.spell) nat.push(c); else if (isWild(c)) wild.push(c); else return null; }
  return wild.length > 1 || nat.length < 2 ? null : { nat, wild: wild.length };
}
function isSet(cs) {
  const m = cs.length >= 3 && parts(cs);
  if (!m || !m.nat.every(c => c.r === m.nat[0].r)) return false;
  // with distinct suits, no suit twice, so a set holds four at most (a Glamour stands in for a missing suit)
  if (SET_DISTINCT) return cs.length <= 4 && new Set(m.nat.map(c => c.s)).size === m.nat.length;
  return !m.wild || cs.length <= 4 * COPIES;
}
function isRun(cs, ranks = 12) {
  const m = cs.length >= 3 && parts(cs);
  if (!m || m.nat.some(c => c.s !== m.nat[0].s)) return false;
  const rs = m.nat.map(c => c.r).sort((a, b) => a - b);
  for (let i = 1; i < rs.length; i++) if (rs[i] === rs[i - 1]) return false;
  const gaps = rs[rs.length - 1] - rs[0] + 1 - rs.length;
  if (gaps > m.wild) return false;
  return !(m.wild && !gaps && rs[0] === 1 && rs[rs.length - 1] === ranks);   // a wild needs somewhere to go
}
function isMeld(cs) { return isSet(cs) || isRun(cs); }
// Does laying this meld on a Charter earn the preferred-shape bonus? (Never with a wild in it.)
function shapeHit(def, cs) { return !cs.some(isWild) && SHAPES[def.shape].test(cs); }
// The cards of a new meld as they lie on the Charter: a Glamour becomes a copy of itself
// carrying the rank and suit it stands for (in the gap of a run, or at its top end).
function placeWild(cs, ranks = 12) {
  const w = cs.find(isWild);
  if (!w) return cs;
  const nat = cs.filter(c => !c.spell);
  let r, s;
  if (isSet(cs)) {
    r = nat[0].r;
    const have = [0, 0, 0, 0];
    nat.forEach(c => have[c.s]++);
    s = [0, 1, 2, 3].find(x => have[x] < (SET_DISTINCT ? 1 : COPIES));
    if (s == null) s = 0;
  } else {
    const rs = nat.map(c => c.r).sort((a, b) => a - b);
    const after = rs.find((x, i) => i && x !== rs[i - 1] + 1);
    s = nat[0].s;
    r = after != null ? after - 1 : rs[rs.length - 1] < ranks ? rs[rs.length - 1] + 1 : rs[0] - 1;
  }
  return cs.map(c => (c === w ? { id: w.id, s, r, spell: "glamour" } : c));
}
// A card returning to the deck from a Charter: a Glamour sheds the rank it stood for.
const unplace = c => (c.spell ? { id: c.id, s: -1, r: 0, spell: c.spell } : c);
// Would this card extend a founded Charter's meld? (Spells are never laid off.)
function fits(card, ch) {
  if (card.spell) return false;
  if (ch.kind === "set") return card.r === ch.cards[0].r && !(SET_LAYOFF_DISTINCT && ch.cards.some(c => c.s === card.s));
  if (card.s !== ch.cards[0].s) return false;
  let lo = 99, hi = 0;
  for (const c of ch.cards) { if (c.r < lo) lo = c.r; if (c.r > hi) hi = c.r; }
  return card.r === lo - 1 || card.r === hi + 1;
}

class RiverGame {
  constructor(opts = {}) { this.o = Object.assign({}, RV_DEFAULTS, opts); deckShape(this.o); }

  setup(rnd = Math.random) {
    const o = this.o;
    this.rnd = rnd;
    const cards = [];
    let id = 0;
    deckShape(o);
    for (let s = 0; s < 4; s++) for (let r = 1; r <= o.ranks; r++) for (let k = 0; k < COPIES; k++) cards.push({ id: id++, s, r });
    for (const [k, n] of Object.entries(o.spells || {})) for (let i = 0; i < n; i++) cards.push({ id: id++, s: -1, r: 0, spell: k });
    this.deck = shuffle(cards, rnd);
    this.discard = [this.deck.pop()];
    this.charterDeck = shuffle(CHARTERS.map((c, i) => Object.assign({ cid: i }, c)), rnd);
    this.display = this.charterDeck.splice(0, o.display);
    this.charters = [];
    this.nextCharter = 0;
    this.qdeck = shuffle(questDeck(o), rnd);
    this.sealedDeck = o.sealed ? shuffle(SEALED.map((q, i) => Object.assign({ id: 200 + i, sealed: true }, q)), rnd) : [];
    this.eventDeck = o.events ? shuffle(EVENTS.slice(), rnd) : [];
    this.event = null;
    this.nextEvent();
    const chars = shuffle(CHARACTERS.slice(), rnd);
    this.players = [];
    for (let p = 0; p < o.players; p++) {
      const character = chars[p % chars.length], quests = [];
      if (o.favStart) { const i = this.qdeck.findIndex(q => q.type === character.favour && q.saga == null); if (i >= 0) quests.push(this.qdeck.splice(i, 1)[0]); }
      while (quests.length < o.startQuests) quests.push(this.qdeck.pop());
      this.players.push({ pos: TAVERN, hand: this.deck.splice(0, o.handStart), res: [0, 0, 0, 0], quests, done: [], renown: 0, bounty: 0, character });
    }
    this.qrow = this.qdeck.splice(0, o.qrowSize);
    this.turn = 0;
    this.round = 1;
    this.turnCount = 0;
    this.over = false;
    this.endTriggered = false;
    this.stats = { founds: 0, shapeHits: 0, layoffs: 0, ownLayoffs: 0, faded: 0, casts: 0, spells: {}, buys: 0, moves: 0, quests: 0, offType: 0,
      fromWork: 0, fromRent: 0, fromOwner: 0, swaps: 0, works: new Array(NPL).fill(0), apSpent: 0, apWasted: 0, discardDraws: 0, capped: 0, charterLife: 0,
      sealedTaken: 0, sealedDone: 0, sagaDone: [0, 0, 0], torn: 0, expired: 0, foundSets: 0, foundRuns: 0, layoffSets: 0, layoffRuns: 0, questCards: 0 };
    for (const k in SPELLS) this.stats.spells[k] = 0;
    this.startTurn();
  }

  pl(p) { return this.players[p]; }

  // The round's town event: the next from its deck, reshuffled when it runs out.
  nextEvent() {
    if (!this.o.events) return;
    if (!this.eventDeck) this.eventDeck = [];
    if (!this.eventDeck.length) this.eventDeck = shuffle(EVENTS.filter(e => !this.event || e.key !== this.event.key), this.rnd);
    this.event = this.eventDeck.shift();
  }
  ev(key) { return !!this.event && this.event.key === key; }
  // What working a place yields this round.
  yieldAt(sp) { return this.o.workYield + (this.event && this.event.place === sp && PRODUCES[sp] >= 0 ? 1 : 0); }

  // The top card of the deck. When the deck runs out the discard pile is shuffled to make a new one;
  // if both have run out, the Charter left untouched longest fades at once to refill it.
  draw1() {
    if (!this.deck.length && this.discard.length <= 1 && this.charters.length) {
      const ch = this.charters.reduce((a, b) => (b.touched < a.touched ? b : a));
      this.charters = this.charters.filter(x => x !== ch);
      for (const c of ch.cards) this.deck.push(unplace(c));
      shuffle(this.deck, this.rnd);
      this.charterDeck.push(ch.def);
      this.refillDisplay();
      this.starved = (this.starved || []).concat([ch]);
      if (this.stats) this.stats.faded++;
    }
    if (!this.deck.length) {
      const top = this.discard.pop();
      this.deck = shuffle(this.discard, this.rnd);
      this.discard = top ? [top] : [];
    }
    return this.deck.pop() || null;
  }

  // Rounds a Charter has left before it fades (0: fades at its owner's next turn).
  // How many rounds a Charter lasts untended: a round less when the town is crowded with them.
  life() { return this.o.life - (this.o.crowdLapse && this.charters.length >= this.o.crowdLapse ? 1 : 0); }
  roundsLeft(ch) { return this.life() - Math.floor((this.turnCount - ch.touched) / this.o.players); }

  startTurn() {
    const p = this.turn, o = this.o, pl = this.pl(p);
    // fading
    const keep = [];
    this.lastFaded = [];
    for (const ch of this.charters) {
      if (ch.owner === p && this.turnCount - ch.touched >= o.players * this.life()) {
        for (const c of ch.cards) this.deck.splice(Math.floor(this.rnd() * (this.deck.length + 1)), 0, unplace(c));
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
    this.t = { drawsLeft: o.draws, ap: o.freeAP + (this.ev("progress") ? 1 : 0), spellUsed: false, buys: 0, bought: {}, discarded: false, handed: 0 };
    // a short hand is topped up
    this.lastRefill = [];
    while (o.refill && pl.hand.length < o.refill) { const c = this.draw1(); if (!c) break; pl.hand.push(c); this.lastRefill.push(c); }
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
  // A Glamour in the meld counts as this turn's spell.
  found(p, ids, di) {
    const pl = this.pl(p), o = this.o;
    const cs = ids.map(id => pl.hand.find(c => c.id === id));
    const def = this.display[di];
    const wild = cs.some(c => c && isWild(c));
    if (!def || cs.some(c => !c) || !this.canPlay(p, cs.length) || !isMeld(cs) || (wild && this.t.spellUsed)) throw new Error("can't found");
    pl.hand = pl.hand.filter(c => !ids.includes(c.id));
    this.display.splice(di, 1);
    const hit = shapeHit(def, cs);
    const ch = { id: this.nextCharter++, def, owner: p, kind: isSet(cs) ? "set" : "run", cards: placeWild(cs, o.ranks), touched: this.turnCount, born: this.turnCount };
    this.charters.push(ch);
    this.refillDisplay();
    this.t.ap += cs.length * o.meldAP + (hit ? o.shapeAP : 0) + (this.ev("charter") ? 2 : 0) + (ch.kind === "run" ? cs.length * (o.runAP || 0) : 0);
    pl.renown += cs.length * o.meldRenown;
    if (wild) { this.t.spellUsed = true; if (this.stats) { this.stats.casts++; this.stats.spells.glamour++; } }
    if (this.stats) { this.stats.founds++; this.stats[ch.kind === "set" ? "foundSets" : "foundRuns"]++; if (hit) this.stats.shapeHits++; }
    return { ch, shapeHit: hit };
  }

  layoff(p, id, chId) {
    const pl = this.pl(p), o = this.o;
    const c = pl.hand.find(x => x.id === id), ch = this.charters.find(x => x.id === chId);
    if (!c || !ch || !this.canPlay(p, 1) || !fits(c, ch)) throw new Error("can't lay off");
    pl.hand = pl.hand.filter(x => x.id !== id);
    ch.cards.push(c);
    ch.touched = this.turnCount;
    if (this.stats) this.stats[ch.kind === "set" ? "layoffSets" : "layoffRuns"]++;
    if (ch.owner === p) { this.t.ap += o.ownLayoffAP; if (this.stats) this.stats.ownLayoffs++; }
    else {
      this.t.ap += o.layoffAP + (this.ev("feast") ? 1 : 0);
      this.pl(ch.owner).res[ch.def.res] += o.ownerBonus;
      if (this.stats) { this.stats.layoffs++; this.stats.fromOwner += o.ownerBonus; }
    }
    return true;
  }

  // Cast a spell from your hand, one a turn. arg: Blink, the place to go to; Recall, an index in
  // the discard pile; Renew, the id of one of your Charters. Returns any cards it brought you.
  canCast(p) { return this.canPlay(p, 1) && !this.t.spellUsed; }
  castable(p, c) {
    if (!c || !c.spell || isWild(c) || !this.canCast(p)) return false;
    if (c.spell === "recall") return this.discard.length > 0;
    if (c.spell === "renew") return this.charters.some(ch => ch.owner === p);
    if (c.spell === "scry") return this.deck.length + this.discard.length > 1;
    return true;
  }
  cast(p, id, arg) {
    const pl = this.pl(p), c = pl.hand.find(x => x.id === id);
    if (!this.castable(p, c)) throw new Error("can't cast");
    const k = c.spell;
    if (k === "blink" && (!(arg >= 0 && arg < NPL) || arg === pl.pos)) throw new Error("blink where?");
    if (k === "renew" && !this.charters.some(ch => ch.id === arg && ch.owner === p)) throw new Error("renew which Charter?");
    pl.hand = pl.hand.filter(x => x.id !== id);
    this.t.spellUsed = true;
    const got = [];
    if (k === "blink") pl.pos = arg;
    else if (k === "scry") for (let n = 0; n < (this.o.scryDraw || 2); n++) { const d = this.draw1(); if (d) { pl.hand.push(d); got.push(d); } }
    else if (k === "recall") {
      const i = Math.max(0, Math.min(this.discard.length - 1, arg == null ? this.discard.length - 1 : arg));
      const d = this.discard.splice(i, 1)[0];
      pl.hand.push(d);
      got.push(d);
    } else if (k === "haggle") this.t.bought = {};
    else if (k === "renew") this.charters.find(ch => ch.id === arg).touched = this.turnCount;
    this.discard.push(c);
    if (this.stats) { this.stats.casts++; this.stats.spells[k]++; }
    return got;
  }

  // What the next purchase costs: a card bought ("cards"), or a resource worked from a place (its index).
  // Prices rise with each purchase, counted for each vendor, or across all of them.
  priceRise(k) { return this.o.escalate && !this.ev("free") ? Math.max(0, k - this.o.riseAfter + 1) : 0; }   // with k purchases made
  vendorOf(v) { return this.o.perVendor ? String(v) : "all"; }
  bought(v) { return (this.t.bought || {})[this.vendorOf(v)] || 0; }
  rise(v) { return this.priceRise(this.bought(v)); }
  noteBuy(v) { const k = this.vendorOf(v); this.t.bought = this.t.bought || {}; this.t.bought[k] = (this.t.bought[k] || 0) + 1; }
  buyPrice() { return this.o.buyCost + this.rise("cards"); }
  workCost(p) {
    const sp = this.pl(p).pos;
    let c = 1;
    if (PRODUCES[sp] >= 0) c += this.rise(sp);
    if (this.o.crowdAP && this.players.some((q, i) => i !== p && q.pos === sp)) c += this.o.crowdAP;
    return c;
  }

  canBuy(p) { return p === this.turn && this.t.drawsLeft === 0 && !this.t.discarded && this.t.ap >= this.buyPrice() && this.t.buys < this.o.buyCap; }
  buy(p, from) {
    if (!this.canBuy(p)) throw new Error("can't buy");
    let c = null;
    const pl = this.pl(p);
    this.lastBought = [];
    if (from === "discard" && this.discard.length) c = this.discard.pop(); else c = this.draw1();
    if (c) { pl.hand.push(c); this.lastBought.push(c); }
    if (from !== "discard") for (let k = Math.min(this.o.buyDraw || 1, Math.max(1, this.o.handLimit + 1 - pl.hand.length + 1)) - 1; k > 0; k--) {
      const d = this.draw1();
      if (d) { pl.hand.push(d); this.lastBought.push(d); }
    }
    const cost = this.buyPrice();
    this.t.ap -= cost;
    this.t.buys++;
    this.noteBuy("cards");
    if (this.stats) { this.stats.buys++; this.stats.apSpent += cost; }
    return c;
  }

  // Walking costs 1 AP a step: round the ring road to the next place, or between any place and the Square.
  neighbours(sp) {
    if (!this.o.square) return ADJ[sp];
    return sp === SQUARE ? ADJ.map((_, i) => i) : ADJ[sp].concat(SQUARE);
  }
  moveCost(from, dest) { return this.neighbours(from).includes(dest) ? 1 : Infinity; }
  // AP to get from one spot to another by the shortest way.
  travel(a, b) {
    if (a === b) return 0;
    if (!this.o.square) return DIST[a][b];
    return a === SQUARE || b === SQUARE ? 1 : Math.min(DIST[a][b], 2);
  }
  canMove(p, dest) { const pl = this.pl(p); return p === this.turn && this.t.drawsLeft === 0 && !this.t.discarded && this.t.ap >= this.moveCost(pl.pos, dest); }
  move(p, dest) {
    const pl = this.pl(p);
    if (!this.canMove(p, dest)) throw new Error("can't move");
    const cost = this.moveCost(pl.pos, dest);
    pl.pos = dest;
    this.t.ap -= cost;
    if (this.stats) { this.stats.moves++; this.stats.apSpent += cost; }
  }

  // Quests on offer at the Tavern: the open row, and the sealed commission.
  tavernHas() { return this.qrow.length > 0 || this.sealedDeck.length > 0 || this.qdeck.length > 0; }
  canWork(p) {
    const pl = this.pl(p), sp = pl.pos;
    if (p !== this.turn || this.t.drawsLeft > 0 || this.t.discarded || this.t.ap < this.workCost(p)) return false;
    if (PRODUCES[sp] >= 0) return true;
    if (sp === TAVERN) return this.tavernHas() && (pl.quests.length < this.o.questLimit || pl.quests.length > 0);
    if (sp === HARBOUR) return pl.res.some(x => x > 0);
    return false;
  }

  // Tavern: arg = index in the quest row, "sealed" for the sealed commission, or -1 for the top of
  // the quest deck; tear = which of your quests to tear up (needed when you hold your limit).
  // Harbour: arg = [give, get].
  work(p, arg, tear) {
    const pl = this.pl(p), sp = pl.pos;
    if (!this.canWork(p)) throw new Error("can't work");
    const r = PRODUCES[sp], cost = this.workCost(p);
    if (r >= 0) { const y = this.yieldAt(sp); pl.res[r] += y; if (this.stats) this.stats.fromWork += y; }
    else if (sp === TAVERN) {
      const full = pl.quests.length >= this.o.questLimit;
      if (full && !pl.quests[tear]) throw new Error("tear up a quest to take another");
      const pick = arg === "sealed" ? (this.sealedDeck.length ? "sealed" : null) : arg != null && arg >= 0 ? (this.qrow[arg] ? "row" : null) : (this.qdeck.length ? "deck" : null);
      if (!pick) throw new Error("no such quest");
      if (full) this.tearUp(p, tear);
      let q;
      if (pick === "sealed") { q = this.sealedDeck.shift(); if (this.stats) this.stats.sealedTaken++; }
      else if (pick === "row") { q = this.qrow.splice(arg, 1)[0]; if (this.qdeck.length) this.qrow.push(this.qdeck.pop()); }
      else q = this.qdeck.pop();
      pl.quests.push(q);
    } else if (sp === HARBOUR) {
      if (!arg || arg[0] === arg[1] || pl.res[arg[0]] < 1) throw new Error("bad trade");
      pl.res[arg[0]]--; pl.res[arg[1]] += this.ev("harbour") ? 2 : 1;
      if (this.stats) this.stats.swaps++;
    }
    this.t.ap -= cost;
    if (r >= 0) this.noteBuy(sp);
    if (this.stats) { this.stats.works[sp]++; this.stats.apSpent += cost; }
  }

  // For 1 AP, fresh quests at the Tavern (you must be standing there), or fresh Charters on offer
  // (from anywhere): the ones on offer go to the bottom of their deck and new ones come out.
  canRefreshQuests(p) { return p === this.turn && this.t.drawsLeft === 0 && !this.t.discarded && this.t.ap >= 1 && this.pl(p).pos === TAVERN && this.qdeck.length > 0; }
  refreshQuests(p) {
    if (!this.canRefreshQuests(p)) throw new Error("can't refresh the quests");
    this.qdeck.unshift(...this.qrow.splice(0));
    while (this.qrow.length < this.o.qrowSize && this.qdeck.length) this.qrow.push(this.qdeck.pop());
    this.t.ap--;
    if (this.stats) { this.stats.refreshes = (this.stats.refreshes || 0) + 1; this.stats.apSpent++; }
  }
  canRefreshCharters(p) { return p === this.turn && this.t.drawsLeft === 0 && !this.t.discarded && this.t.ap >= 1 && this.charterDeck.length > 0; }
  refreshCharters(p) {
    if (!this.canRefreshCharters(p)) throw new Error("can't refresh the Charters");
    this.charterDeck.push(...this.display.splice(0));
    this.refillDisplay();
    this.t.ap--;
    if (this.stats) { this.stats.refreshes = (this.stats.refreshes || 0) + 1; this.stats.apSpent++; }
  }

  // A torn-up quest goes to the bottom of its deck; a torn-up saga ends there.
  tearUp(p, qi) {
    const pl = this.pl(p), q = pl.quests.splice(qi, 1)[0];
    if (q.sealed) this.sealedDeck.push(q);
    else if (q.saga == null) this.qdeck.unshift(q);
    this.lastTorn = q;
    if (this.stats) this.stats.torn++;
    return q;
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

  // The cards a quest draws when it's completed: 1 for a small one (3 resources), 2 for a middling
  // one (4 or 5), 3 for a big one (6 or more).
  questCards(q) {
    if (!this.o.questCards) return 0;
    const n = q.need.reduce((a, b) => a + b, 0);
    return n <= 3 ? 1 : n <= 5 ? 2 : 3;
  }
  // Hand in a quest. Completing part of a saga hands you the next part; with questCards, it draws you cards.
  handIn(p, qi) {
    if (!this.canHandIn(p, qi)) return false;
    const pl = this.pl(p), q = pl.quests[qi];
    for (let r = 0; r < 4; r++) pl.res[r] -= q.need[r];
    pl.renown += q.pts;
    if (this.ev("bounty")) { pl.renown += 2; pl.bounty = (pl.bounty || 0) + 2; }
    pl.quests.splice(qi, 1);
    pl.done.push(q);
    this.t.handed++;
    this.lastNext = null;
    this.lastDrawn = [];
    for (let k = this.questCards(q); k > 0; k--) { const d = this.draw1(); if (d) { pl.hand.push(d); this.lastDrawn.push(d); } }
    if (this.stats) this.stats.questCards += this.lastDrawn.length;
    if (q.saga != null && q.part < 2) { this.lastNext = sagaPart(q.saga, q.part + 1); pl.quests.push(this.lastNext); }
    if (this.stats) {
      this.stats.quests++;
      if (q.type !== pl.character.favour) this.stats.offType++;
      if (q.sealed) this.stats.sealedDone++;
      if (q.saga != null) this.stats.sagaDone[q.part]++;
    }
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
    this.lastExpired = null;
    this.newEvent = null;
    if (this.turn === 0) {
      if (this.endTriggered) { this.over = true; return; }
      if (++this.round > this.o.maxRounds) { this.over = true; return; }
      this.nextEvent();
      this.newEvent = this.event;
      // a new round: the quest longest on offer at the Tavern leaves
      if (this.o.refresh && this.qrow.length && this.qdeck.length) {
        this.lastExpired = this.qrow.shift();
        this.qrow.push(this.qdeck.pop());
        this.qdeck.unshift(this.lastExpired);
        if (this.stats) this.stats.expired++;
      }
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
    g.qdeck = this.qdeck.slice(); g.qrow = this.qrow.slice(); g.sealedDeck = this.sealedDeck.slice();
    g.eventDeck = (this.eventDeck || []).slice(); g.event = this.event || null;
    g.players = this.players.map(pl => ({ pos: pl.pos, hand: pl.hand.slice(), res: pl.res.slice(), quests: pl.quests.slice(), done: pl.done.slice(), renown: pl.renown, bounty: pl.bounty || 0, character: pl.character }));
    g.turn = this.turn; g.round = this.round; g.turnCount = this.turnCount; g.over = this.over; g.endTriggered = this.endTriggered;
    g.t = Object.assign({}, this.t, { bought: Object.assign({}, this.t.bought) });
    g.stats = null;
    return g;
  }
}

if (typeof module !== "undefined" && typeof window === "undefined") {
  module.exports = { RiverGame, RV_DEFAULTS, SUITS, RES, PLACES, TYPES, ADJ, DIST, PRODUCES, QUESTS, SEALED, SAGAS, SPELLS, EVENTS, CHARTERS, CHARACTERS, SHAPES,
    shuffle, isSet, isRun, isMeld, isWild, shapeHit, placeWild, fits, questDeck, sagaPart, deckShape,
    MARKET, FORGE, TAVERN, TEMPLE, LIBRARY, HARBOUR, SQUARE, NPL, GOLD, STEEL, FAITH, LORE };
}
