// tools/characters.js - how each character fares: win rates, average renown, and how often (and when)
// they complete their personal quest. Greedy AIs in every seat, characters dealt at random.
//   node tools/characters.js [games] [players] ['{"target":150}']
const { RiverGame } = require("../river-core.js");
const AI = require("../river-ai.js");

const N = +(process.argv[2] || 4000), NP = +(process.argv[3] || 3), OPTS = JSON.parse(process.argv[4] || "{}");
const T = {}, rounds = [];
const t0 = Date.now();
for (let k = 0; k < N; k++) {
  const g = new RiverGame(Object.assign({ players: NP }, OPTS));
  g.setup();
  const ai = AI.greedy(), when = g.players.map(() => 0);
  for (let guard = 0; !g.over && guard < 5000; guard++) {
    const p = g.turn, r = g.round;
    ai(g, p);
    if (g.players[p].empowered && !when[p]) when[p] = r;
  }
  rounds.push(g.round);
  const fin = g.players.map((_, p) => g.final(p)), top = Math.max(...fin), winners = fin.filter(v => v === top).length;
  g.players.forEach((pl, p) => {
    const t = T[pl.character.name] = T[pl.character.name] || { games: 0, wins: 0, score: 0, done: 0, when: 0 };
    t.games++; t.score += fin[p];
    if (fin[p] === top) t.wins += 1 / winners;
    if (when[p]) { t.done++; t.when += when[p]; }
  });
}
const pct = (a, b) => (100 * a / b).toFixed(1) + "%";
console.log(`${NP} players, ${N} games ${process.argv[4] || ""}: ${(rounds.reduce((a, b) => a + b, 0) / N).toFixed(1)} rounds on average, ${((Date.now() - t0) / 1000).toFixed(0)}s (fair share ${pct(1, NP)})`);
for (const [name, t] of Object.entries(T).sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games))
  console.log(`  ${name.padEnd(16)} wins ${pct(t.wins, t.games).padStart(6)}  renown ${(t.score / t.games).toFixed(1).padStart(6)}  personal quest done ${pct(t.done, t.games).padStart(6)}${t.done ? `, in round ${(t.when / t.done).toFixed(1)}` : ""}`);
