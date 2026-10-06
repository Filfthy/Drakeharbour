// tools/layoffs.js - how often lay-offs happen, and how often you could make one, under different rules.
//   node tools/layoffs.js [games] [skill]
const { RiverGame, fits } = require("../river-core.js");
const AI = require("../river-ai.js");

const PRESETS = process.argv.includes("grid") ? {
  "now (1 copy, 12 ranks, last 2, hand 7, target 65)": { copies: 1, life: 2 },
  "2 copies, 10 ranks, last 3, hand 8, target 80": { copies: 2, ranks: 10, life: 3, handStart: 8, handLimit: 9, target: 80 },
  "2 copies, 8 ranks, last 3, hand 8, target 80": { copies: 2, ranks: 8, life: 3, handStart: 8, handLimit: 9, target: 80 },
  "2 copies, 8 ranks, last 3, hand 8, target 90": { copies: 2, ranks: 8, life: 3, handStart: 8, handLimit: 9, target: 90 }
} : {
  "one copy, Charters last 2 rounds (now)": { copies: 1, life: 2 },
  "one copy, Charters last 3 rounds": { copies: 1, life: 3 },
  "two copies, last 2 rounds": { copies: 2, life: 2 },
  "two copies, last 3 rounds": { copies: 2, life: 3 },
  "two copies, last 3 rounds, 10 ranks": { copies: 2, life: 3, ranks: 10 }
};

function run(opts, n, makers) {
  const S = { games: 0, rounds: 0, turns: 0, oppOthers: 0, oppAny: 0, layOthers: 0, layOwn: 0, founds: 0, faded: 0, onTable: 0, noOffer: 0, ap: 0, quests: 0, wins: 0 };
  for (let k = 0; k < n; k++) {
    const g = new RiverGame(Object.assign({ players: makers.length, perVendor: true }, BASE, opts));
    g.setup();
    const seats = makers.map(m => m()), rot = k % seats.length;
    const ais = seats.map((_, i) => seats[(i + rot) % seats.length]);
    // after a player's draws: could they lay off a card right now?
    const oDraw = RiverGame.prototype.draw;
    g.draw = function (...a) {
      const r = oDraw.apply(g, a), p = g.turn, pl = g.pl(p);
      if (g.t.drawsLeft === 0) {
        S.turns++;
        S.onTable += g.charters.length;
        if (!g.display.length) S.noOffer++;
        const cards = pl.hand.filter(c => !c.spell);
        if (cards.some(c => g.charters.some(ch => ch.owner !== p && fits(c, ch)))) S.oppOthers++;
        if (cards.some(c => g.charters.some(ch => fits(c, ch)))) S.oppAny++;
      }
      return r;
    };
    let guard = 0;
    while (!g.over && guard++ < 4000) ais[g.turn](g, g.turn);
    const st = g.stats;
    S.games++; S.rounds += g.round; S.layOthers += st.layoffs; S.layOwn += st.ownLayoffs; S.founds += st.founds; S.faded += st.faded; S.ap += st.apSpent; S.quests += st.quests;
    const fin = g.players.map((_, p) => g.final(p)), top = Math.max(...fin), w = fin.map((v, p) => (v === top ? p : -1)).filter(p => p >= 0);
    if (w.includes((seats.length - rot) % seats.length)) S.wins += 1 / w.length;
  }
  return S;
}

const N = +(process.argv.find(a => /^\d+$/.test(a)) || 300), NP = 3;
const BASE = JSON.parse(process.argv.find(a => a.startsWith("{")) || "{}");
if (Object.keys(BASE).length) console.log("all with", JSON.stringify(BASE));
for (const [name, opts] of Object.entries(PRESETS)) {
  const S = run(opts, N, Array.from({ length: NP }, () => () => AI.greedy()));
  const per = x => (x / S.games).toFixed(1), pc = x => (100 * x / S.turns).toFixed(0) + "%";
  console.log(name);
  console.log(`  ${per(S.rounds)} rounds, ${per(S.quests)} quests | each player lays off ${(S.layOthers / S.games / NP).toFixed(1)} on others' Charters and ${(S.layOwn / S.games / NP).toFixed(1)} on their own a game`);
  console.log(`  turns with a lay-off you could make: onto someone else's Charter ${pc(S.oppOthers)}, onto any ${pc(S.oppAny)}`);
  console.log(`  Charters: ${per(S.founds)} founded and ${per(S.faded)} faded a game, ${(S.onTable / S.turns).toFixed(1)} on the table on average, none on offer ${pc(S.noOffer)} of turns | AP spent a turn ${(S.ap / S.turns).toFixed(2)}`);
  if (process.argv.includes("skill")) {
    const P = run(opts, Math.round(N * 0.6), [() => AI.planner({ worlds: 8 })].concat(Array.from({ length: NP - 1 }, () => () => AI.greedy())));
    console.log(`  look-ahead player wins ${(100 * P.wins / P.games).toFixed(1)}% (fair 33%)`);
  }
}
