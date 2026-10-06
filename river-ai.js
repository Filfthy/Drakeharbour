// river-ai.js - computer players for River (node and browser).
//   greedy(params): a sensible rule-based player; params vary its habits
//   planner():      tries several greedy variants for this turn in sampled
//                   futures and plays the one that does best
const RC = typeof module !== "undefined" && typeof window === "undefined" ? require("./river-core.js")
  : { RiverGame, ADJ, DIST, PRODUCES, TAVERN, HARBOUR, SHAPES, CHARACTERS, isSet, isRun, isMeld, fits, shuffle };
const AI_NPL = RC.ADJ.length;

// ---------------------------------------------------------------- reading the position

const questValue = (g, pl, q) => q.pts + (q.type === pl.character.favour ? g.o.favourBonus : 0);

// Resources still missing for a player's quests, best quests first.
function needsOf(g, pl) {
  const pool = pl.res.slice(), missing = [0, 0, 0, 0], rows = [];
  const qs = pl.quests.map(q => [q, questValue(g, pl, q)]).sort((a, b) => b[1] - a[1]);
  for (const [q, val] of qs) {
    let miss = 0, need = 0;
    for (let r = 0; r < 4; r++) { const u = Math.min(pool[r], q.need[r]); pool[r] -= u; const m = q.need[r] - u; miss += m; missing[r] += m; need += q.need[r]; }
    rows.push({ q, val, miss, need });
  }
  return { pool, missing, rows };
}

// How much a card is worth keeping in this hand.
function keepValue(card, hand, g, p) {
  if (card.writ) return 5;
  let v = 0;
  for (const c of hand) {
    if (c === card || c.writ) continue;
    if (c.r === card.r) v += 1.2;
    if (c.s === card.s) { const d = Math.abs(c.r - card.r); if (d === 1) v += 0.8; else if (d === 2) v += 0.4; }
  }
  for (const ch of g.charters) if (RC.fits(card, ch)) { v += ch.owner === p ? 0.8 : 1.0; break; }
  return v;
}

// Would this card help right now (a meld with the hand, or a lay-off)?
function useful(card, hand, g) {
  if (!card) return false;
  if (card.writ) return !hand.some(c => c.writ);
  let same = 0;
  const ranks = new Set();
  for (const c of hand) { if (c.writ) continue; if (c.r === card.r) same++; if (c.s === card.s) ranks.add(c.r); }
  if (same >= 2 && g.display.length) return true;
  const r = card.r;
  if (g.display.length && ((ranks.has(r - 1) && ranks.has(r - 2)) || (ranks.has(r + 1) && ranks.has(r + 2)) || (ranks.has(r - 1) && ranks.has(r + 1)))) return true;
  return g.charters.some(ch => RC.fits(card, ch));
}

// Every meld in a hand: sets (all 3- and 4-card ones) and runs (all lengths).
function meldOptions(hand) {
  const out = [];
  const byRank = {}, bySuit = [[], [], [], []];
  for (const c of hand) { if (c.writ) continue; (byRank[c.r] = byRank[c.r] || []).push(c); bySuit[c.s].push(c); }
  for (const r in byRank) {
    const grp = byRank[r];
    if (grp.length >= 3) { out.push(grp.slice()); if (grp.length === 4) for (let i = 0; i < 4; i++) out.push(grp.filter((_, j) => j !== i)); }
  }
  for (const cs of bySuit) {
    cs.sort((a, b) => a.r - b.r);
    let i = 0;
    while (i < cs.length) {
      let j = i;
      while (j + 1 < cs.length && cs[j + 1].r === cs[j].r + 1) j++;
      for (let a = i; a <= j; a++) for (let b = a + 2; b <= j; b++) out.push(cs.slice(a, b + 1));
      i = j + 1;
    }
  }
  return out;
}

// The disjoint melds that use the most cards (at most maxCards).
function bestMelds(hand, maxCards) {
  const opts = meldOptions(hand).sort((a, b) => b.length - a.length).slice(0, 24);
  let best = [], bestN = 0;
  const used = new Set();
  const rec = (i, chosen, n) => {
    if (n > bestN) { bestN = n; best = chosen.slice(); }
    for (let k = i; k < opts.length; k++) {
      const o = opts[k];
      if (n + o.length > maxCards || o.some(c => used.has(c.id))) continue;
      o.forEach(c => used.add(c.id)); chosen.push(o);
      rec(k + 1, chosen, n + o.length);
      chosen.pop(); o.forEach(c => used.delete(c.id));
    }
  };
  rec(0, [], 0);
  return best;
}

// Which Charter on offer to found with this meld (index in the display).
function chooseCharter(g, p, meld, pick = 0) {
  const pl = g.players[p];
  const { missing } = needsOf(g, pl);
  const fav = pl.character.favour;
  const scored = g.display.map((def, i) => {
    let v = RC.SHAPES[def.shape].test(meld) ? g.o.shapeAP * 0.9 : 0;
    v += missing[def.res] > 0 ? 1.4 : 0.5;
    // favoured quests lean on one resource (Exploration on all of them)
    if (fav < 4 && def.res === [1, 0, 2, 3][fav]) v += 0.4;
    return { i, v };
  }).sort((a, b) => b.v - a.v);
  return scored.length ? scored[Math.min(pick, scored.length - 1)].i : -1;
}

// ---------------------------------------------------------------- the greedy player

const DEFAULT_PARAMS = { drawDiscard: true, feedOthers: true, apTarget: 0, meld: true, keepPairs: false, charterPick: 0, buyLeft: true };

function pickQuest(g, pl) {
  const { pool } = needsOf(g, pl);
  let best = -1, bv = -Infinity;
  g.qrow.forEach((q, i) => {
    let short = 0;
    for (let r = 0; r < 4; r++) short += Math.max(0, q.need[r] - pool[r]);
    const v = questValue(g, pl, q) - 1.6 * short;
    if (v > bv) { bv = v; best = i; }
  });
  return best;
}

// Spend AP in town: walk to and work the place that best feeds your quests
// (k-th best first, for variety), then choose again.
function spendAP(g, p, firstPick = 0) {
  const o = g.o;
  let pick = firstPick, target = -1, guard = 0;
  while (g.t.ap > 0 && guard++ < 40) {
    const pl = g.players[p];
    const { missing, pool } = needsOf(g, pl);
    const total = pl.res.reduce((a, b) => a + b, 0);
    const spare = total < o.resCap - 1 ? 0.25 : 0;
    if (target < 0) {
      const cands = [];
      for (let s = 0; s < AI_NPL; s++) {
        const d = RC.DIST[pl.pos][s], left = g.t.ap - d;
        if (left < 1) continue;
        let val = 0, acts = 0;
        const r = RC.PRODUCES[s];
        if (r >= 0) { const u = Math.min(left, missing[r]); val = u + (left - u) * spare; acts = left; }
        else if (s === RC.TAVERN) { if (pl.quests.length < o.questLimit && (g.qrow.length || g.qdeck.length)) { val = [2.6, 1.8, 0.9][pl.quests.length]; acts = 1; } }
        else if (s === RC.HARBOUR) { let sur = 0, mis = 0; for (let k = 0; k < 4; k++) { sur += pool[k]; mis += missing[k]; } const n = Math.min(left, sur, mis); val = n * 0.85; acts = n; }
        if (val > 0) cands.push({ s, rate: val / (d + acts) });
      }
      cands.sort((a, b) => b.rate - a.rate);
      if (!cands.length) break;
      target = cands[Math.min(pick, cands.length - 1)].s;
      pick = 0;
    }
    if (pl.pos !== target) {
      const step = RC.ADJ[pl.pos].find(n => RC.DIST[n][target] < RC.DIST[pl.pos][target]);
      g.move(p, step);
      continue;
    }
    const r = RC.PRODUCES[target];
    if (r >= 0) { if (missing[r] > 0 || spare > 0) { g.work(p); continue; } }
    else if (target === RC.TAVERN) { if (g.canWork(p)) { g.work(p, pickQuest(g, pl)); continue; } }
    else if (target === RC.HARBOUR) {
      let give = -1, get = -1;
      for (let k = 0; k < 4; k++) { if (pool[k] > 0 && (give < 0 || pool[k] > pool[give])) give = k; if (missing[k] > 0 && (get < 0 || missing[k] > missing[get])) get = k; }
      if (give >= 0 && get >= 0) { g.work(p, [give, get]); continue; }
    }
    target = -1;
  }
}

// Found every meld you can, then lay off what fits.
function playCards(g, p, P, keep) {
  const pl = g.players[p];
  if (P.meld && g.display.length) {
    const playable = pl.hand.filter(c => c !== keep && !c.writ);
    for (const m of bestMelds(playable, pl.hand.length - 1)) {
      if (!g.display.length) break;
      if (P.keepPairs && m.length === 3 && RC.isSet(m)) continue;
      const di = chooseCharter(g, p, m, P.charterPick);
      if (di >= 0 && g.canPlay(p, m.length)) g.found(p, m.map(c => c.id), di);
    }
  }
  for (let more = true; more;) {
    more = false;
    for (const c of pl.hand.slice()) {
      if (c === keep || c.writ || pl.hand.length <= 1) continue;
      const own = g.charters.filter(ch => ch.owner === p && RC.fits(c, ch));
      const others = P.feedOthers ? g.charters.filter(ch => ch.owner !== p && RC.fits(c, ch)) : [];
      // keep your own Charter alive if it's about to fade; otherwise take the bigger AP
      const fadingOwn = own.find(ch => g.roundsLeft(ch) <= 1);
      const target = fadingOwn || others[0] || own[0];
      if (target) { g.layoff(p, c.id, target.id); more = true; break; }
    }
  }
}

function playTurn(g, p, params = DEFAULT_PARAMS) {
  const P = Object.assign({}, DEFAULT_PARAMS, params);
  // 1. draw
  while (g.t.drawsLeft > 0) {
    const top = g.discard[g.discard.length - 1], pl = g.players[p];
    g.draw(p, P.drawDiscard && useful(top, pl.hand, g) ? "discard" : "deck");
  }
  let pl = g.players[p];
  const worst = () => pl.hand.slice().sort((a, b) => keepValue(a, pl.hand, g, p) - keepValue(b, pl.hand, g, p))[0];
  let keep = worst();
  // 2. a Writ
  const writ = pl.hand.find(c => c.writ && c !== keep);
  if (writ && !g.t.writUsed && pl.hand.length >= 2) { g.writ(p, writ.id, pl.hand.length <= 3 ? "draw" : "ap"); keep = worst(); }
  // 3. melds and lay-offs
  playCards(g, p, P, keep);
  // 4. buy the top of the discard pile if it plays at once
  for (let k = 0; k < 2; k++) {
    const top = g.discard[g.discard.length - 1];
    if (!g.canBuy(p) || !top || top.writ || !useful(top, pl.hand, g)) break;
    g.buy(p, "discard");
    playCards(g, p, P, keep);
  }
  // 5. town
  spendAP(g, p, P.apTarget);
  // 6. spare AP buys cards for next turn
  while (P.buyLeft && g.canBuy(p) && pl.hand.length < g.o.handLimit) g.buy(p, "deck");
  // 7. discard, hand in, end
  const d = pl.hand.includes(keep) ? keep : worst();
  g.discardCard(p, d.id);
  let best = -1, bv = -1;
  pl.quests.forEach((q, i) => { if (g.canHandIn(p, i)) { const v = questValue(g, pl, q); if (v > bv) { bv = v; best = i; } } });
  if (best >= 0) g.handIn(p, best);
  if (pl.hand.length > g.o.handLimit) pl.hand.sort((a, b) => keepValue(b, pl.hand, g, p) - keepValue(a, pl.hand, g, p));
  g.endTurn(p, needsOf(g, pl).pool);
}

const greedy = (params = {}) => {
  const f = (g, p) => playTurn(g, p, params);
  f.params = params;
  return f;
};

// ---------------------------------------------------------------- the planner

function evaluate(g, p) {
  const pl = g.players[p];
  let v = g.score(p);
  const { pool, rows } = needsOf(g, pl);
  for (const { val, miss, need } of rows) v += miss === 0 ? 0.85 * val : val * (0.15 + 0.6 * (need - miss) / need);
  for (const x of pool) v += 0.3 * x;
  v += 0.35 * pl.hand.length;
  for (const ch of g.charters) if (ch.owner === p) v += 0.5 * Math.max(1, g.roundsLeft(ch));
  return v;
}

function determinize(g, p) {
  const x = g.clone();
  const pool = [];
  x.players.forEach((pl, i) => { if (i !== p) pool.push(...pl.hand); });
  pool.push(...x.deck);
  RC.shuffle(pool);
  x.players.forEach((pl, i) => { if (i !== p) pl.hand = pool.splice(0, pl.hand.length); });
  x.deck = pool;
  RC.shuffle(x.qdeck);
  RC.shuffle(x.charterDeck);
  return x;
}

const VARIANTS = [{}, { drawDiscard: false }, { feedOthers: false }, { apTarget: 1 }, { apTarget: 2 }, { meld: false }, { keepPairs: true }, { charterPick: 1 }, { buyLeft: false }];

const planner = (opts = {}) => {
  const worlds = opts.worlds || 10, rounds = opts.rounds || 2, z = opts.z == null ? 1 : opts.z;
  const choose = (g, p) => {
    const vals = VARIANTS.map(() => []);
    for (let w = 0; w < worlds; w++) {
      const base = determinize(g, p);
      VARIANTS.forEach((v, i) => {
        const x = base.clone();
        playTurn(x, p, v);
        for (let t = 0; t < rounds * x.players.length && !x.over; t++) playTurn(x, x.turn);
        let b = -Infinity, m;
        if (x.over) { for (let q = 0; q < x.players.length; q++) if (q !== p) b = Math.max(b, x.final(q)); m = x.final(p) - b; }
        else { for (let q = 0; q < x.players.length; q++) if (q !== p) b = Math.max(b, evaluate(x, q)); m = evaluate(x, p) - b; }
        vals[i].push(m);
      });
    }
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    let best = 0;
    for (let i = 1; i < VARIANTS.length; i++) if (mean(vals[i]) > mean(vals[best])) best = i;
    if (best !== 0) {
      const d = vals[best].map((v, j) => v - vals[0][j]);
      const m = mean(d), sd = Math.sqrt(d.reduce((a, v) => a + (v - m) * (v - m), 0) / Math.max(1, d.length - 1));
      if (m < z * sd / Math.sqrt(d.length)) best = 0;
    }
    return VARIANTS[best];
  };
  const f = (g, p) => playTurn(g, p, choose(g, p));
  f.choose = choose;
  return f;
};

const RiverAI = { greedy, planner, playTurn, evaluate, needsOf, meldOptions, bestMelds, keepValue, useful, chooseCharter, questValue, VARIANTS };
if (typeof module !== "undefined" && typeof window === "undefined") module.exports = RiverAI;
