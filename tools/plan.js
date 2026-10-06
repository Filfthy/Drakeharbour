// node tools/plan.js games -> planner v greedy players (PL=players, OPTS=json, W=worlds)
const { match } = require("./sim.js");
const AI = require("../river-ai.js");
const N = +process.argv[2] || 4, PL = +(process.env.PL || 3), W = +(process.env.W || 10);
const opts = JSON.parse(process.env.OPTS || "{}");
const picks = {};
const mk = () => { const f = AI.planner({ worlds: W }); return (g, p) => { const v = f.choose(g, p); const k = JSON.stringify(v); picks[k] = (picks[k] || 0) + 1; AI.playTurn(g, p, v); }; };
process.on("exit", () => console.log("PICKS " + JSON.stringify(picks)));
const field = Array.from({ length: PL - 1 }, () => () => AI.greedy());
match(`planner(${W}w) v greedy x${PL - 1}`, [mk, ...field], N, opts);
