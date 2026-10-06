// river-ai.js - computer players for River (node and browser).
//   greedy(params): a sensible rule-based player; params vary its habits
//   planner():      tries several greedy variants for this turn in sampled
//                   futures and plays the one that does best
const RC = typeof module !== "undefined" && typeof window === "undefined" ? require("./river-core.js")
  : { RiverGame, ADJ, DIST, PRODUCES, TAVERN, HARBOUR, SHAPES, CHARACTERS, isSet, isRun, isMeld, isWild, shapeHit, fits, shuffle };
const AI_NPL = RC.ADJ.length;

// ---------------------------------------------------------------- reading the position

const questValue = (g, pl, q) => q.pts + (q.type === pl.character.favour ? g.o.favourBonus : 0) + (q.saga != null ? [2, 1, 0][q.part] : 0);

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
const SPELL_KEEP = { glamour: 6, blink: 3, scry: 3, recall: 3, haggle: 2.5, renew: 2.5 };
function keepValue(card, hand, g, p) {
  if (card.spell) return card.spell === "renew" && !g.charters.some(ch => ch.owner === p) ? 0.8 : SPELL_KEEP[card.spell];
  let v = 0;
  for (const c of hand) {
    if (c === card || c.spell) continue;
    if (c.r === card.r) v += 1.2;
    if (c.s === card.s) { const d = Math.abs(c.r - card.r); if (d === 1) v += 0.8; else if (d === 2) v += 0.4; }
  }
  for (const ch of g.charters) if (RC.fits(card, ch)) { v += ch.owner === p ? 0.8 : 1.0; break; }
  return v;
}

// Would this card help right now (a meld with the hand, or a lay-off)?
function useful(card, hand, g) {
  if (!card) return false;
  if (card.spell) return card.spell === "glamour" || !hand.some(c => c.spell);
  let same = 0;
  const ranks = new Set();
  for (const c of hand) { if (c.spell) continue; if (c.r === card.r) same++; if (c.s === card.s) ranks.add(c.r); }
  if (same >= 2 && g.display.length) return true;
  const r = card.r;
  if (g.display.length && ((ranks.has(r - 1) && ranks.has(r - 2)) || (ranks.has(r + 1) && ranks.has(r + 2)) || (ranks.has(r - 1) && ranks.has(r + 1)))) return true;
  return g.charters.some(ch => RC.fits(card, ch));
}

// Every meld in a hand: sets (all 3- and 4-card ones) and runs (all lengths).
function meldOptions(hand) {
  const out = [];
  const byRank = {}, bySuit = [[], [], [], []];
  for (const c of hand) { if (c.spell) continue; (byRank[c.r] = byRank[c.r] || []).push(c); bySuit[c.s].push(c); }
  for (const r in byRank) {
    const grp = byRank[r];
    if (grp.length >= 3) { out.push(grp.slice()); if (grp.length >= 4) for (let i = 0; i < grp.length; i++) out.push(grp.filter((_, j) => j !== i)); }
  }
  for (const all of bySuit) {
    // one card of each rank: a second copy can't be in the same run
    all.sort((a, b) => a.r - b.r);
    const cs = all.filter((c, i) => !i || c.r !== all[i - 1].r);
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

// Melds a Glamour would complete: a pair (or three) of a rank, or a run with one card missing.
function wildMelds(hand) {
  const w = hand.find(c => c.spell === "glamour");
  if (!w) return [];
  const out = [], byRank = {}, bySuit = [[], [], [], []];
  for (const c of hand) { if (c.spell) continue; (byRank[c.r] = byRank[c.r] || []).push(c); bySuit[c.s].push(c); }
  for (const r in byRank) if (byRank[r].length >= 2 && RC.isSet(byRank[r].concat([w]))) out.push(byRank[r].concat([w]));
  for (const all of bySuit) {
    all.sort((a, b) => a.r - b.r);
    const cs = all.filter((c, i) => !i || c.r !== all[i - 1].r);
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const win = cs.slice(i, j + 1), span = win[win.length - 1].r - win[0].r + 1;
      if (span - win.length <= 1 && RC.isMeld(win.concat([w]))) out.push(win.concat([w]));
    }
  }
  return out;
}

// The disjoint melds that use the most cards (at most maxCards); with a Glamour, also those it completes.
function bestMelds(hand, maxCards, wild = false) {
  const opts = meldOptions(hand).concat(wild ? wildMelds(hand) : []).sort((a, b) => b.length - a.length).slice(0, 28);
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
    let v = RC.shapeHit(def, meld) ? g.o.shapeAP * 0.9 : 0;
    v += missing[def.res] > 0 ? 1.4 : 0.5;
    // favoured quests lean on one resource (Exploration on all of them)
    if (fav < 4 && def.res === [1, 0, 2, 3][fav]) v += 0.4;
    return { i, v };
  }).sort((a, b) => b.v - a.v);
  return scored.length ? scored[Math.min(pick, scored.length - 1)].i : -1;
}

// ---------------------------------------------------------------- the greedy player

const DEFAULT_PARAMS = { drawDiscard: true, feedOthers: true, apTarget: 0, meld: true, keepPairs: false, charterPick: 0, buyLeft: true };

function pickQuest(g, pl, scoreOnly = false) {
  const { pool } = needsOf(g, pl);
  let best = -1, bv = -Infinity;
  g.qrow.forEach((q, i) => {
    let short = 0;
    for (let r = 0; r < 4; r++) short += Math.max(0, q.need[r] - pool[r]);
    const v = questValue(g, pl, q) - 1.6 * short;
    if (v > bv) { bv = v; best = i; }
  });
  // a sealed commission: its reward is known, its needs are not (about one resource for every 2.6 renown)
  const sealed = g.sealedDeck[0];
  if (sealed) {
    const spare = pool.reduce((a, b) => a + b, 0);
    const v = sealed.pts + 0.8 - 1.6 * Math.max(0, sealed.pts / 2.6 - 0.4 * spare);
    if (v > bv) { bv = v; best = "sealed"; }
  }
  return scoreOnly ? bv : best;
}

// Cast a spell of this kind from your hand, if you can.
function cast(g, p, kind, arg) {
  const c = g.players[p].hand.find(x => x.spell === kind);
  if (!c || !g.castable(p, c)) return false;
  g.cast(p, c.id, arg);
  return true;
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
    const blink = !g.t.spellUsed && pl.hand.some(c => c.spell === "blink") && pl.hand.length >= 2;
    if (target < 0) {
      const cands = [];
      for (let s = 0; s < AI_NPL; s++) {
        const walk = g.travel(pl.pos, s), d = blink && walk >= 2 ? 0 : walk, left = g.t.ap - d;
        if (left < 1) continue;
        let val = 0, acts = 0;
        const r = RC.PRODUCES[s];
        // what working here costs: 1 AP, more where another piece stands, and rising with each purchase if prices escalate
        const crowd = o.crowdAP && g.players.some((q, i) => i !== p && q.pos === s) ? o.crowdAP : 0;
        if (r >= 0) {
          let n = 0, cost = 0;
          for (;;) { const c = 1 + crowd + g.priceRise(g.bought(s) + n); if (cost + c > left) break; cost += c; n++; }
          const units = n * g.yieldAt(s), u = Math.min(units, missing[r]); val = u + (units - u) * spare; acts = cost;
        }
        else if (s === RC.TAVERN) { if (left >= 1 + crowd && pl.quests.length < o.questLimit && g.tavernHas()) { val = [2.6, 1.8, 0.9][pl.quests.length]; acts = 1 + crowd; } }
        else if (s === RC.HARBOUR) { let sur = 0, mis = 0; for (let k = 0; k < 4; k++) { sur += pool[k]; mis += missing[k]; } const two = g.ev("harbour"); const n = Math.min(Math.floor(left / (1 + crowd)), sur, two ? Math.ceil(mis / 2) : mis); val = n * (two ? 1.7 : 0.85); acts = n * (1 + crowd); }
        if (val > 0) cands.push({ s, rate: val / (d + acts) });
      }
      cands.sort((a, b) => b.rate - a.rate);
      if (!cands.length) break;
      target = cands[Math.min(pick, cands.length - 1)].s;
      pick = 0;
    }
    if (pl.pos !== target) {
      if (blink && g.travel(pl.pos, target) >= 2 && cast(g, p, "blink", target)) continue;
      // a step along the ring road, or through the Square when that's shorter
      const step = g.neighbours(pl.pos).find(n => g.travel(n, target) < g.travel(pl.pos, target));
      g.move(p, step);
      continue;
    }
    const r = RC.PRODUCES[target];
    if (r >= 0 && missing[r] > 0 && g.rise(target) > 0 && g.t.ap >= 2) cast(g, p, "haggle");
    if (r >= 0) { if ((missing[r] > 0 || spare > 0) && g.canWork(p)) { g.work(p); continue; } }
    else if (target === RC.TAVERN) {
      // nothing worth taking, and AP to spare: pay 1 AP for fresh quests, once
      if (pl.quests.length < o.questLimit && !g.t.refreshedQ && g.t.ap >= 2 && pickQuest(g, pl, true) < 2.5 && g.canRefreshQuests(p)) { g.refreshQuests(p); g.t.refreshedQ = true; continue; }
      if (pl.quests.length < o.questLimit && g.canWork(p)) { g.work(p, pickQuest(g, pl)); continue; }
    }
    else if (target === RC.HARBOUR) {
      let give = -1, get = -1;
      for (let k = 0; k < 4; k++) { if (pool[k] > 0 && (give < 0 || pool[k] > pool[give])) give = k; if (missing[k] > 0 && (get < 0 || missing[k] > missing[get])) get = k; }
      if (give >= 0 && get >= 0 && g.canWork(p)) { g.work(p, [give, get]); continue; }
    }
    target = -1;
  }
}

// Found every meld you can, then lay off what fits.
function playCards(g, p, P, keep) {
  const pl = g.players[p];
  if (P.meld && g.display.length) {
    const playable = pl.hand.filter(c => c !== keep && (!c.spell || c.spell === "glamour"));
    const plain = bestMelds(playable, pl.hand.length - 1);
    const wild = g.t.spellUsed ? plain : bestMelds(playable, pl.hand.length - 1, true);
    const count = ms => ms.reduce((a, m) => a + m.length, 0);
    for (const m of count(wild) > count(plain) ? wild : plain) {
      if (!g.display.length) break;
      if (P.keepPairs && m.length === 3 && RC.isSet(m)) continue;
      const di = chooseCharter(g, p, m, P.charterPick);
      if (di >= 0 && g.canPlay(p, m.length) && !(m.some(RC.isWild) && g.t.spellUsed)) g.found(p, m.map(c => c.id), di);
    }
  }
  for (let more = true; more;) {
    more = false;
    for (const c of pl.hand.slice()) {
      if (c === keep || c.spell || pl.hand.length <= 1) continue;
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
  // 2. a spell: unless a Glamour would complete a meld, Recall a card that plays now, or Scry when short of cards
  const glamourPlays = pl.hand.some(c => c.spell === "glamour") && wildMelds(pl.hand).length > 0 && g.display.length > 0;
  if (!glamourPlays) {
    const hand = pl.hand.filter(c => !c.spell);
    const i = g.discard.map((c, k) => (useful(c, hand, g) && !c.spell ? k : -1)).filter(k => k >= 0).pop();
    if (i != null && i >= 0 && cast(g, p, "recall", i)) keep = worst();
    else if (hand.length <= 4 && cast(g, p, "scry")) keep = worst();
  }
  // 3. melds and lay-offs
  playCards(g, p, P, keep);
  // a Charter of yours that will fade at the start of your next turn unless someone lays off on it: Renew it
  const fading = g.charters.find(ch => ch.owner === p && g.roundsLeft(ch) <= 1);
  if (fading) cast(g, p, "renew", fading.id);
  // 4. buy the top of the discard pile if it plays at once
  for (let k = 0; k < 2; k++) {
    const top = g.discard[g.discard.length - 1];
    if (!g.canBuy(p) || !top || top.spell || !useful(top, pl.hand, g)) break;
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
  if (x.eventDeck) RC.shuffle(x.eventDeck);
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

const RiverAI = { greedy, planner, playTurn, evaluate, needsOf, meldOptions, wildMelds, bestMelds, keepValue, useful, chooseCharter, questValue, pickQuest, VARIANTS };
if (typeof module !== "undefined" && typeof window === "undefined") module.exports = RiverAI;
