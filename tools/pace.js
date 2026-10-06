// node tools/pace.js games - pace under different settings (greedy x3)
const { match } = require("./sim.js");
const AI = require("../river-ai.js");
const N = +process.argv[2] || 150;
const G = () => AI.greedy();
const sets = JSON.parse(process.env.SETS || "null") || [
  {}, { freeAP: 1 }, { freeAP: 2 }, { meldAP: 2, layoffAP: 2 }, { draws: 3 }, { freeAP: 1, life: 2 }, { freeAP: 2, life: 2 }, { freeAP: 1, meldAP: 2, layoffAP: 2, life: 2 }, { freeAP: 2, life: 2, target: 30 }
];
for (const o of sets) match("3p greedy x3 " + JSON.stringify(o), [G, G, G], N, o);
