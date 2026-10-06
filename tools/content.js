// tools/content.js - how the newer content gets used: spells, sealed commissions, sagas, the Tavern.
//   node tools/content.js [games] [skill]
const { RiverGame, SPELLS } = require("../river-core.js");
const AI = require("../river-ai.js");

function run(opts, n, makers) {
  const T = { games: 0, rounds: 0, quests: 0, offType: 0, casts: 0, spells: {}, sealedTaken: 0, sealedDone: 0, sagaDone: [0, 0, 0], torn: 0, expired: 0,
    founds: 0, wildFounds: 0, apSpent: 0, apWasted: 0, turns: 0, wins: 0, margin: 0, close: 0, hitMax: 0 };
  for (const k in SPELLS) T.spells[k] = 0;
  for (let k = 0; k < n; k++) {
    const g = new RiverGame(Object.assign({ players: makers.length }, opts));
    g.setup();
    const seats = makers.map(m => m()), rot = k % seats.length;
    const ais = seats.map((_, i) => seats[(i + rot) % seats.length]);
    let guard = 0;
    while (!g.over && guard++ < 4000) ais[g.turn](g, g.turn);
    const s = g.stats;
    T.games++; T.rounds += g.round; T.quests += s.quests; T.offType += s.offType; T.casts += s.casts;
    for (const key in s.spells) T.spells[key] += s.spells[key];
    T.sealedTaken += s.sealedTaken; T.sealedDone += s.sealedDone; s.sagaDone.forEach((v, i) => (T.sagaDone[i] += v));
    T.torn += s.torn; T.expired += s.expired; T.founds += s.founds; T.apSpent += s.apSpent; T.apWasted += s.apWasted; T.turns += g.turnCount;
    if (!g.endTriggered) T.hitMax++;
    const fin = g.players.map((_, p) => g.final(p)), sorted = fin.slice().sort((a, b) => b - a);
    T.margin += sorted[0] - sorted[1];
    if (sorted[0] - sorted[1] <= 4) T.close++;
    const top = sorted[0], winners = fin.map((v, p) => (v === top ? p : -1)).filter(p => p >= 0), mine = (seats.length - rot) % seats.length;
    if (winners.includes(mine)) T.wins += 1 / winners.length;
  }
  return T;
}

const N = +(process.argv.find(a => /^\d+$/.test(a)) || 300);
const OPTS = JSON.parse((process.argv.find(a => a.startsWith("{")) || "{}"));
const per = (T, x) => (x / T.games).toFixed(1);
const NP = +((process.argv.find(a => /^p\d$/.test(a)) || "p3").slice(1));
const T = run(OPTS, N, Array.from({ length: NP }, () => () => AI.greedy()));
console.log(`${NP} greedy players, ${N} games ${JSON.stringify(OPTS)}: ${per(T, T.rounds)} rounds (${T.hitMax} hit the round limit), ${per(T, T.quests)} quests a game (${(100 * T.offType / T.quests).toFixed(0)}% off-type), winning margin ${per(T, T.margin)}, within 4: ${(100 * T.close / T.games).toFixed(0)}%`);
console.log(`  AP spent a turn ${(T.apSpent / T.turns).toFixed(2)}, left unspent ${(T.apWasted / T.turns).toFixed(2)}`);
console.log(`  spells cast a game ${per(T, T.casts)}: ` + Object.entries(T.spells).map(([k, v]) => `${k} ${per(T, v)}`).join(", "));
console.log(`  sealed commissions taken ${per(T, T.sealedTaken)}, completed ${per(T, T.sealedDone)} a game`);
console.log(`  saga parts completed a game: I ${per(T, T.sagaDone[0])}, II ${per(T, T.sagaDone[1])}, III ${per(T, T.sagaDone[2])}`);
console.log(`  Tavern: ${per(T, T.expired)} quests left the row a game; Charters founded ${per(T, T.founds)}`);
if (process.argv.includes("skill")) {
  const P = run(OPTS, Math.round(N * 0.8), [() => AI.planner({ worlds: 8 })].concat(Array.from({ length: NP - 1 }, () => () => AI.greedy())));
  console.log(`  look-ahead player against two greedy ones wins ${(100 * P.wins / P.games).toFixed(1)}% (a fair share is ${(100 / NP).toFixed(0)}%), ${per(P, P.rounds)} rounds`);
}
