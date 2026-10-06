// tools/ap.js - how action points flow, turn by turn, under different rules.
//   node tools/ap.js            compare the presets below (greedy players, 3 a game)
//   node tools/ap.js skill      also check that the look-ahead player still wins more than its share
const { RiverGame } = require("../river-core.js");
const AI = require("../river-ai.js");

const PRESETS = {
  "global: first 2 purchases in a turn 1 AP, then 2, 3... (now)": { perVendor: false, riseAfter: 2 },
  "per vendor: first 2 at each 1 AP, then 2, 3...": { perVendor: true, riseAfter: 2 },
  "per vendor: 1, 2, 3... at each": { perVendor: true, riseAfter: 1 },
  "per vendor: 1, 2, 3... at each, target 60": { perVendor: true, riseAfter: 1, target: 60 }
};

// Play n games and follow every turn: AP gained and from where, resources bought, AP left unspent.
function run(opts, n, makers) {
  const S = { games: 0, rounds: 0, quests: 0, offType: 0, turns: 0, ap: {}, town: {}, wasted: 0, buys: 0, fromWork: 0, fromRent: 0, fromOwner: 0,
    big: { turns: 0, meld: 0, shape: 0, layoff: 0, writ: 0 }, wins: 0, townAll: 0, townBig: 0, buyTurns: 0, vendors: 0, steps: 0 };
  for (let k = 0; k < n; k++) {
    const g = new RiverGame(Object.assign({ players: makers.length }, opts));
    g.setup();
    const seats = makers.map(m => m());
    const rot = k % seats.length;   // the first maker takes each seat in turn
    const ais = seats.map((_, i) => seats[(i + rot) % seats.length]);
    let cur = { meld: 0, shape: 0, layoff: 0, writ: 0, town: 0, places: new Set(), steps: 0 };
    const wrap = (fn, f) => { const o = RiverGame.prototype[fn]; g[fn] = function (...a) { const before = g.t.ap; const r = o.apply(g, a); f(g.t.ap - before, a, r); return r; }; };
    wrap("found", (d, a, r) => { cur.meld += r.ch.cards.length * g.o.meldAP; cur.shape += r.shapeHit ? g.o.shapeAP : 0; });
    wrap("layoff", d => { cur.layoff += d; });
    wrap("work", (d, a) => { const sp = g.pl(g.turn).pos; if ([0, 1, 3, 4].includes(sp)) { cur.town++; cur.places.add(sp); } });
    wrap("move", () => { cur.steps++; });
    wrap("discardCard", () => {});
    const oDiscard = g.discardCard;
    g.discardCard = function (...a) { S.wasted += g.t.ap; return oDiscard.apply(g, a); };
    const oEnd = RiverGame.prototype.endTurn;
    g.endTurn = function (...a) {
      const ap = g.o.freeAP + cur.meld + cur.shape + cur.layoff + cur.writ;
      S.ap[ap] = (S.ap[ap] || 0) + 1;
      S.town[cur.town] = (S.town[cur.town] || 0) + 1;
      S.townAll += cur.town;
      if (cur.town >= 5) S.townBig += cur.town;
      if (ap >= 8) { S.big.turns++; for (const key of ["meld", "shape", "layoff", "writ"]) S.big[key] += cur[key]; }
      S.turns++;
      if (cur.town) { S.buyTurns++; S.vendors += cur.places.size; }
      S.steps += cur.steps;
      cur = { meld: 0, shape: 0, layoff: 0, writ: 0, town: 0, places: new Set(), steps: 0 };
      return oEnd.apply(g, a);
    };
    let guard = 0;
    while (!g.over && guard++ < 4000) ais[g.turn](g, g.turn);
    S.games++;
    S.rounds += g.round;
    S.quests += g.stats.quests;
    S.offType += g.stats.offType;
    S.buys += g.stats.buys;
    S.fromWork += g.stats.fromWork; S.fromRent += g.stats.fromRent; S.fromOwner += g.stats.fromOwner;
    const fin = g.players.map((_, p) => g.final(p)), top = Math.max(...fin), winners = fin.map((v, p) => (v === top ? p : -1)).filter(p => p >= 0);
    const mine = (seats.length - rot) % seats.length;   // the seat the first maker sat in
    if (winners.includes(mine)) S.wins += 1 / winners.length;
  }
  return S;
}

function report(name, S) {
  const pc = x => (100 * x / S.turns).toFixed(0).padStart(3) + "%";
  const sum = (o, f) => Object.entries(o).reduce((a, [k, v]) => a + (f(+k) ? v : 0), 0);
  const res = S.fromWork + S.fromRent + S.fromOwner;
  const ap = Object.entries(S.ap).reduce((a, [k, v]) => a + k * v, 0) / S.turns;
  console.log(`${name}`);
  console.log(`  ${(S.rounds / S.games).toFixed(1)} rounds, ${(S.quests / S.games).toFixed(1)} quests a game (${(100 * S.offType / S.quests).toFixed(0)}% off-type) | AP a turn ${ap.toFixed(2)}, unspent ${(S.wasted / S.turns).toFixed(2)} | cards bought a turn ${(S.buys / S.turns).toFixed(2)}`);
  console.log(`  AP a turn:        2 or less ${pc(sum(S.ap, k => k <= 2))}   3-5 ${pc(sum(S.ap, k => k >= 3 && k <= 5))}   6-7 ${pc(sum(S.ap, k => k >= 6 && k <= 7))}   8+ ${pc(sum(S.ap, k => k >= 8))}`);
  console.log(`  bought in town:   none ${pc(sum(S.town, k => k === 0))}   1-2 ${pc(sum(S.town, k => k >= 1 && k <= 2))}   3-4 ${pc(sum(S.town, k => k >= 3 && k <= 4))}   5+ ${pc(sum(S.town, k => k >= 5))}   (${(100 * S.townBig / S.townAll).toFixed(0)}% of town resources come in turns of 5+)`);
  console.log(`  walking:          ${(S.steps / S.turns).toFixed(2)} steps a turn; turns that buy resources use ${(S.vendors / Math.max(1, S.buyTurns)).toFixed(2)} vendors`);
  console.log(`  resources from:   town ${(100 * S.fromWork / res).toFixed(0)}%, rent ${(100 * S.fromRent / res).toFixed(0)}%, owner bonus ${(100 * S.fromOwner / res).toFixed(0)}%`);
  if (S.big.turns) console.log(`  turns of 8+ AP got, on average: meld ${(S.big.meld / S.big.turns).toFixed(1)}, shape ${(S.big.shape / S.big.turns).toFixed(1)}, lay-offs ${(S.big.layoff / S.big.turns).toFixed(1)}, Writ ${(S.big.writ / S.big.turns).toFixed(1)} (+2 free)`);
}

const skill = process.argv.includes("skill");
const N = +(process.argv.find(a => /^\d+$/.test(a)) || 400);
for (const [name, opts] of Object.entries(PRESETS)) {
  const S = run(opts, N, [() => AI.greedy(), () => AI.greedy(), () => AI.greedy()]);
  report(name, S);
  if (skill) {
    const P = run(opts, Math.round(N * 0.75), [() => AI.planner({ worlds: 8 }), () => AI.greedy(), () => AI.greedy()]);
    console.log(`  look-ahead player against two greedy ones wins ${(100 * P.wins / P.games).toFixed(1)}% (a fair share is 33%)`);
  }
  console.log("");
}
