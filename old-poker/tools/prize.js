// node tools/prize.js hands - quick prize-mode baselines
const { match } = require("./sim.js");
const P = require("./players.js");
const N = +process.argv[2] || 300;
for (const minPlay of [1, 2]) for (const n of [2, 3, 4]) {
  const opts = { prize: true, minPlay, lookAhead: 4, temp: false, lastBonus: 0 };
  const mk = [() => P.efficient(1.2), P.greedy, P.thrifty, P.random].slice(0, n);
  match(`min${minPlay} ${n}p efficient/greedy/thrifty/random`, mk, N, opts);
}
