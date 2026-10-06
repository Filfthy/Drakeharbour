// tools/players.js - computer players for River experiments.
const { bestWith, catOf, combos } = require("../river-core.js");

// Every possible play (1-5 cards) and its value against the current community.
function allPlays(g, p) {
  const h = g.hands[p], com = g.community(), out = [];
  for (let k = Math.max(1, g.minFor(p)); k <= Math.min(5, h.length); k++) {
    for (const cs of combos(h, k)) {
      const v = bestWith(cs, com, g.o.mustUseAll);
      if (v >= 0) out.push({ ids: cs.map(c => c.id), k, v, cat: catOf(v) });
    }
  }
  return out;
}

// Random: a random number of random cards.
const random = () => (g, p) => {
  const h = g.hands[p].slice();
  const lo = Math.max(1, g.minFor(p)), k = lo + Math.floor(Math.random() * (Math.min(5, h.length) - lo + 1));
  for (let i = h.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [h[i], h[j]] = [h[j], h[i]]; }
  return h.slice(0, k).map(c => c.id);
};

// Greedy: the strongest hand available right now, whatever it costs.
const greedy = () => (g, p) => {
  let best = null;
  for (const pl of allPlays(g, p)) if (!best || pl.v > best.v || (pl.v === best.v && pl.k < best.k)) best = pl;
  return best.ids;
};

// Thrifty: one card, the best single.
const thrifty = () => (g, p) => {
  let best = null;
  const lo = Math.max(1, g.minFor(p));
  for (const pl of allPlays(g, p)) if (pl.k === lo && (!best || pl.v > best.v)) best = pl;
  return best.ids;
};

// Efficient: weighs category points against cards spent (lambda per card),
// and dumps one weak card on turns it can't win anything worth having.
const efficient = (lambda = 1.2) => (g, p) => {
  const pts = g.o.points;
  // In prize mode a hand's worth is roughly its chance of winning times the
  // pot; stronger kinds of hand win more often.
  const winP = [0.03, 0.15, 0.35, 0.55, 0.7, 0.8, 0.9, 0.97, 1];
  const pot = g.o.prize ? g.potValue() : 0, lo = Math.max(1, g.minFor(p));
  let best = null, bs = -Infinity;
  for (const pl of allPlays(g, p)) {
    const gain = g.o.prize ? winP[pl.cat] * pot / 2.5 : pts[pl.cat];
    // when not fighting, dump the weakest cards
    const s = gain - lambda * (pl.k - lo) + (g.o.prize && gain < 1 ? -pl.v * 1e-9 : pl.v * 1e-9);
    if (s > bs) { bs = s; best = pl; }
  }
  return best.ids;
};

// Planner: tries its best candidate plays in many sampled futures (hidden
// cards dealt out at random, the visible queue kept) and plays the hand out
// with efficient players; picks the play with the best average margin.
const planner = (opts = {}) => {
  const worlds = opts.worlds || 40, cands = opts.cands || 14, rollout = opts.rollout || efficient(1.2);
  return (g, p) => {
    const plays = allPlays(g, p);
    // candidates: the best few at each size, and the cheapest
    const bySize = {};
    for (const pl of plays) (bySize[pl.k] = bySize[pl.k] || []).push(pl);
    let pool = [];
    for (const k in bySize) pool = pool.concat(bySize[k].sort((a, b) => b.v - a.v).slice(0, Math.ceil(cands / 5)));
    const weakest = plays.filter(x => x.k === 1).sort((a, b) => a.v - b.v)[0];
    if (weakest && !pool.includes(weakest)) pool.push(weakest);
    if (pool.length === 1) return pool[0].ids;
    const n = g.o.players, sums = pool.map(() => 0);
    for (let w = 0; w < worlds; w++) {
      const base = determinize(g, p);
      // opponents' plays this turn (same in every candidate's world)
      const opp = [];
      for (let q = 0; q < n; q++) if (q !== p && base.hands[q].length) opp[q] = rollout(base, q);
      pool.forEach((pl, i) => {
        const x = base.clone();
        const plays2 = opp.slice(); plays2[p] = pl.ids;
        x.playTurn(plays2);
        let guard = 0;
        while (!x.over && guard++ < 60) x.playTurn(x.hands.map((h, q) => (h.length ? rollout(x, q) : [])));
        let best = -Infinity;
        for (let q = 0; q < n; q++) if (q !== p) best = Math.max(best, x.scores[q]);
        sums[i] += x.scores[p] - best;
      });
    }
    let bi = 0;
    for (let i = 1; i < pool.length; i++) if (sums[i] > sums[bi]) bi = i;
    return pool[bi].ids;
  };
};

// A possible world as player p sees it: own hand, river, queue and the
// temporary card are known; other hands and the deck are not.
function determinize(g, p) {
  const x = g.clone();
  const unknown = [];
  x.hands.forEach((h, q) => { if (q !== p) unknown.push(...h); });
  unknown.push(...x.deck);
  for (let i = unknown.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [unknown[i], unknown[j]] = [unknown[j], unknown[i]]; }
  x.hands = x.hands.map((h, q) => (q === p ? h.slice() : unknown.splice(0, h.length)));
  x.deck = unknown;
  return x;
}

module.exports = { random, greedy, thrifty, efficient, planner, allPlays };
