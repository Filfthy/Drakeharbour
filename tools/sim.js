// tools/sim.js - River experiments. node tools/sim.js [games]
const { RiverGame, PLACES } = require("../river-core.js");
const AI = require("../river-ai.js");

// makers[0] is the challenger; seats rotate every game.
function match(label, makers, N, opts = {}) {
  const n = makers.length;
  const win = new Array(n).fill(0), pts = new Array(n).fill(0);
  const keys = ["founds", "shapeHits", "layoffs", "ownLayoffs", "faded", "writs", "buys", "moves", "quests", "offType", "fromWork", "fromRent", "fromOwner", "swaps", "apSpent", "apWasted", "discardDraws", "capped", "charterLife"];
  const T = { rounds: 0, margin: 0, close: 0, hitMax: 0, works: new Array(PLACES.length).fill(0), seat: new Array(n).fill(0) };
  keys.forEach(k => (T[k] = 0));
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const rot = k % n;
    const g = new RiverGame(Object.assign({ players: n }, opts));
    g.setup();
    const ais = [];
    for (let s = 0; s < n; s++) ais[s] = makers[(s + rot) % n]();
    let guard = 0;
    while (!g.over && guard++ < 3000) ais[g.turn](g, g.turn);
    const fin = g.players.map((_, p) => g.final(p));
    const top = Math.max(...fin), ws = fin.map((s, p) => (s === top ? p : -1)).filter(p => p >= 0);
    const sorted = fin.slice().sort((a, b) => b - a);
    T.margin += sorted[0] - sorted[1];
    if (sorted[0] - sorted[1] <= 4) T.close++;
    for (let s = 0; s < n; s++) {
      const who = (s + rot) % n;
      pts[who] += fin[s];
      if (ws.includes(s)) { win[who] += 1 / ws.length; T.seat[s] += 1 / ws.length; }
    }
    T.rounds += g.round;
    if (!g.endTriggered) T.hitMax++;
    keys.forEach(key => (T[key] += g.stats[key]));
    g.stats.works.forEach((w, i) => (T.works[i] += w));
  }
  const pc = x => (x / N * 100).toFixed(1) + "%", per = x => (x / N).toFixed(1);
  const res = T.fromWork + T.fromRent + T.fromOwner;
  console.log(`${label}: wins ${win.map(pc).join(" / ")} | pts ${pts.map(x => (x / N).toFixed(1)).join(" / ")} | ${((Date.now() - t0) / N).toFixed(0)}ms/game`);
  console.log(`   rounds ${per(T.rounds)} (hit max ${T.hitMax}) | quests ${per(T.quests)}, off-type ${(T.offType / Math.max(1, T.quests) * 100).toFixed(0)}% | resources: town ${(T.fromWork / res * 100).toFixed(0)}%, rent ${(T.fromRent / res * 100).toFixed(0)}%, owner ${(T.fromOwner / res * 100).toFixed(0)}% | swaps ${per(T.swaps)}`);
  console.log(`   founds ${per(T.founds)} (shape ${(T.shapeHits / Math.max(1, T.founds) * 100).toFixed(0)}%) | lay-offs others ${per(T.layoffs)}, own ${per(T.ownLayoffs)} | faded ${per(T.faded)}, life ${(T.charterLife / Math.max(1, T.faded) / n).toFixed(1)} rounds | buys ${per(T.buys)} | writs ${per(T.writs)} | AP/turn ${(T.apSpent / (T.rounds * n)).toFixed(2)} wasted ${(T.apWasted / (T.rounds * n)).toFixed(2)} | margin ${(T.margin / N).toFixed(1)}, within 4 ${pc(T.close)}`);
  console.log(`   seat wins ${T.seat.map(pc).join(" / ")} | work ${T.works.map((w, i) => PLACES[i] + " " + per(w)).join(", ")}`);
  return { win: win.map(x => x / N) };
}
module.exports = { match };

if (require.main === module) {
  const N = +process.argv[2] || 200;
  const opts = JSON.parse(process.env.OPTS || "{}");
  const G = () => AI.greedy();
  match("3p greedy x3 " + JSON.stringify(opts), [G, G, G], N, opts);
}
