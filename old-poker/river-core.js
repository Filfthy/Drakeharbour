// river-core.js
// River: a card game for an ordinary 52-card deck.
//
// The river is a row of face-up community cards that flows one card a turn:
// the oldest card leaves, the next card from a visible queue joins it, and a
// new card is turned onto the end of the queue. Each turn one extra
// "temporary" card is also turned up, for that turn only.
//
// Everyone secretly plays 1 to 5 cards from hand. Your result is the best
// five-card poker hand that uses every card you played plus community cards
// (the river and the temporary card). The best hand takes the turn's points.
// Spent cards are gone: play few and you stay in longer; play many and you
// score big now but run dry. The hand ends when at most one player has cards.

const RANKS = "23456789TJQKA";
const SUITS = "shdc";
const CATS = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];

const RIVER_DEFAULTS = {
  players: 3,
  handSize: 10,
  riverLen: 4,        // face-up community cards that flow
  lookAhead: 2,       // queued cards visible beyond the river
  temp: true,         // one temporary card each turn
  points: [0, 1, 2, 3, 4, 5, 6, 8, 10],   // by category, to the turn's winner
  lastBonus: 0.5,     // per card left in hand when you're the last one in
  mustUseAll: true,   // your five must include every card you played
  kickers: true,      // false: hands of the same kind tie and share the points
  // Prize mode: the extra card each turn isn't part of the community but the
  // prize. The best hand takes it into a trophy pile worth its rank (2-14);
  // on a tie it stays and the next turn's prize joins it.
  prize: false,
  minPlay: 1          // cards everyone must play each turn (or all they have left)
};
const prizeValue = c => c.r + 2;

function makeDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ r, s, id: s * 13 + r });
  return d;
}
function shuffle(a, rnd = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function cardName(c) { return RANKS[c.r] + SUITS[c.s]; }

// Value of exactly five cards: a number that sorts hands (higher is better).
function eval5(cs) {
  const rs = cs.map(c => c.r).sort((a, b) => b - a);
  const flush = cs.every(c => c.s === cs[0].s);
  let straightHi = -1;
  const uniq = [...new Set(rs)];
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHi = uniq[0];
    else if (uniq[0] === 12 && uniq[1] === 3 && uniq[4] === 0) straightHi = 3;   // A-2-3-4-5
  }
  const cnt = {};
  for (const r of rs) cnt[r] = (cnt[r] || 0) + 1;
  const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map(g => g[1]);
  let cat;
  if (straightHi >= 0 && flush) { cat = 8; kick.length = 0; kick.push(straightHi); }
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHi >= 0) { cat = 4; kick.length = 0; kick.push(straightHi); }
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 13 + (kick[i] != null ? kick[i] : 0);
  return v;
}
const catOf = v => Math.floor(v / Math.pow(13, 5));

function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i <= arr.length - (k - cur.length); i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}

// Best five using all of `played` plus community cards.
function bestWith(played, community, mustUseAll = true) {
  const k = played.length;
  if (k > 5 || k < 1) return -1;
  let best = -1;
  if (mustUseAll) {
    const need = 5 - k;
    if (community.length < need) return -1;
    for (const extra of combos(community, need)) { const v = eval5(played.concat(extra)); if (v > best) best = v; }
  } else {
    const all = played.concat(community);
    for (const five of combos(all, 5)) { const v = eval5(five); if (v > best) best = v; }
  }
  return best;
}

class RiverGame {
  constructor(opts = {}) { this.o = Object.assign({}, RIVER_DEFAULTS, opts); }

  newHand(rnd = Math.random) {
    const o = this.o;
    this.rnd = rnd;
    this.deck = shuffle(makeDeck(), rnd);
    this.discard = [];
    this.hands = Array.from({ length: o.players }, () => this.deck.splice(0, o.handSize));
    this.river = this.deck.splice(0, o.riverLen);
    this.queue = this.deck.splice(0, o.lookAhead);
    this.tempCard = null;
    this.pot = [];
    this.trophies = Array.from({ length: o.players }, () => []);
    this.scores = new Array(o.players).fill(0);
    this.turnNo = 0;
    this.over = false;
    this.history = [];
    this.beginTurn();
  }

  draw() {
    if (!this.deck.length) { this.deck = shuffle(this.discard, this.rnd); this.discard = []; }
    return this.deck.pop();
  }

  // The temporary card for this turn (the river has already flowed).
  beginTurn() {
    if (this.o.prize) { this.pot.push(this.draw()); this.tempCard = null; return; }
    this.tempCard = this.o.temp ? this.draw() : null;
  }

  community() { return this.tempCard ? this.river.concat([this.tempCard]) : this.river.slice(); }
  potValue() { return this.pot.reduce((a, c) => a + prizeValue(c), 0); }
  minFor(p) { return Math.min(this.o.minPlay, this.hands[p].length); }
  active() { return this.hands.map((h, p) => (h.length ? p : -1)).filter(p => p >= 0); }

  // plays[p] = array of card ids (empty for players with no cards).
  playTurn(plays) {
    const o = this.o, com = this.community();
    const vals = this.hands.map((h, p) => {
      const ids = plays[p] || [];
      if (!h.length) return -1;
      const cs = ids.map(id => h.find(c => c.id === id));
      if (cs.length < Math.max(1, this.minFor(p)) || cs.length > 5 || cs.some(c => !c)) throw new Error("bad play by " + p);
      return bestWith(cs, com, o.mustUseAll);
    });
    const top = Math.max(...vals);
    const same = o.kickers ? (v => v === top) : (v => v >= 0 && catOf(v) === catOf(top));
    const winners = vals.map((v, p) => (same(v) && v >= 0 ? p : -1)).filter(p => p >= 0);
    let pts;
    if (o.prize) {
      pts = this.potValue();
      if (winners.length === 1) {
        this.scores[winners[0]] += pts;
        this.trophies[winners[0]].push(...this.pot);
        this.pot = [];
      }
    } else {
      pts = o.points[catOf(top)];
      for (const p of winners) this.scores[p] += pts / winners.length;
    }
    const sorted = vals.filter(v => v >= 0).sort((a, b) => b - a);
    this.history.push({ vals, winners, cat: catOf(top), pts, kicker: sorted.length > 1 && catOf(sorted[0]) === catOf(sorted[1]), used: plays.map(x => (x || []).length) });
    // spend the cards
    this.hands.forEach((h, p) => {
      for (const id of plays[p] || []) { const i = h.findIndex(c => c.id === id); this.discard.push(h.splice(i, 1)[0]); }
    });
    if (this.tempCard) { this.discard.push(this.tempCard); this.tempCard = null; }
    this.turnNo++;
    // end of the hand?
    const left = this.active();
    if (left.length <= 1) {
      if (left.length === 1) this.scores[left[0]] += o.lastBonus * this.hands[left[0]].length;
      this.discard.push(...this.pot);
      this.pot = [];
      this.over = true;
      return;
    }
    // the river flows
    this.discard.push(this.river.shift());
    this.river.push(this.queue.length ? this.queue.shift() : this.draw());
    if (o.lookAhead) this.queue.push(this.draw());
    this.beginTurn();
  }

  clone() {
    const g = Object.create(RiverGame.prototype);
    g.o = this.o; g.rnd = this.rnd;
    g.deck = this.deck.slice(); g.discard = this.discard.slice();
    g.hands = this.hands.map(h => h.slice()); g.river = this.river.slice(); g.queue = this.queue.slice();
    g.tempCard = this.tempCard; g.pot = this.pot.slice(); g.trophies = this.trophies.map(t => t.slice()); g.scores = this.scores.slice(); g.turnNo = this.turnNo; g.over = this.over; g.history = [];
    return g;
  }
}

if (typeof module !== "undefined") module.exports = { prizeValue, RiverGame, RIVER_DEFAULTS, eval5, bestWith, catOf, combos, cardName, CATS, makeDeck, shuffle };
