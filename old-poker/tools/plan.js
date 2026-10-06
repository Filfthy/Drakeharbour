// node tools/plan.js hands worlds cands  -> planner v efficient players (PL=players, OPTS=json)
const { match } = require("./sim.js");
const P = require("./players.js");
const N = +process.argv[2] || 6, W = +process.argv[3] || 12, C = +process.argv[4] || 8, PL = +(process.env.PL || 3);
const used = [0, 0, 0, 0, 0, 0];
const pl = () => { const f = P.planner({ worlds: W, cands: C }); return (g, p) => { const ids = f(g, p); used[ids.length]++; return ids; }; };
process.on("exit", () => console.log("planner cards " + used.slice(1).join(" ")));
const field = Array.from({ length: PL - 1 }, () => () => P.efficient(1.2));
match(`planner(${W}w,${C}c) v efficient x${PL - 1}`, [pl, ...field], N, JSON.parse(process.env.OPTS || "{}"));
