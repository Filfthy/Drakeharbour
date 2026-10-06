// tools/sim.js - River experiments. node tools/sim.js [hands] [players]
const { RiverGame } = require("../river-core.js");
const P = require("./players.js");

function match(label, makers, N, opts = {}) {
  const n = makers.length;
  const win = new Array(n).fill(0), pts = new Array(n).fill(0);
  let turns = 0, kick = 0, tt = 0, cards = new Array(6).fill(0), catHist = new Array(9).fill(0);
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const rot = k % n;                        // rotate seats
    const g = new RiverGame(Object.assign({ players: n }, opts));
    g.newHand();
    const ais = [];
    for (let s = 0; s < n; s++) ais[s] = makers[(s + rot) % n]();
    let guard = 0;
    while (!g.over && guard++ < 80) g.playTurn(g.hands.map((h, p) => (h.length ? ais[p](g, p) : [])));
    for (const t of g.history) { turns++; if (t.kicker) kick++; catHist[t.cat]++; t.used.forEach(u => (cards[u]++)); tt++; }
    const top = Math.max(...g.scores);
    const ws = g.scores.map((s, p) => (s === top ? p : -1)).filter(p => p >= 0);
    for (let s = 0; s < n; s++) {
      const who = (s + rot) % n;
      pts[who] += g.scores[s];
      if (ws.includes(s)) win[who] += 1 / ws.length;
    }
  }
  const pc = x => (x / N * 100).toFixed(1) + "%";
  console.log(`${label}: wins ${win.map(pc).join(" / ")} | pts/hand ${pts.map(x => (x / N).toFixed(1)).join(" / ")} | turns/hand ${(turns / N).toFixed(1)} | decided on kickers ${(kick / tt * 100).toFixed(0)}% | ${((Date.now() - t0) / N).toFixed(0)}ms/hand`);
  return { win: win.map(x => x / N), cards, catHist, turns: turns / N };
}
module.exports = { match };

if (require.main === module) {
  const N = +process.argv[2] || 400;
  match("3p random/greedy/thrifty", [P.random, P.greedy, P.thrifty], N);
  match("3p efficient/greedy/thrifty", [() => P.efficient(1.2), P.greedy, P.thrifty], N);
  const r = match("3p efficient x3", [() => P.efficient(1.2), () => P.efficient(1.2), () => P.efficient(1.2)], N);
  console.log("  cards played per turn (1-5):", r.cards.slice(1).join(" "), "| winning categories:", r.catHist.join(" "));
}
