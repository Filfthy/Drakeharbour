// river-app.js - a playable prototype of River against computer players.

const SUIT_SYM = ["♠", "♥", "♦", "♣"];
const RANK_TXT = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_NAME = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
const RANK_PLURAL = ["Twos", "Threes", "Fours", "Fives", "Sixes", "Sevens", "Eights", "Nines", "Tens", "Jacks", "Queens", "Kings", "Aces"];
const NAMES = ["Vega", "Orion", "Lyra"];
const TARGET = 100;

const load = (k, d) => { try { const v = localStorage.getItem("rv_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem("rv_" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));

// The kickers packed into a hand value, best first.
function kicks(v) { const out = []; for (let i = 0; i < 5; i++) { out.unshift(v % 13); v = Math.floor(v / 13); } return out; }
function describe(v) {
  const c = catOf(v), k = kicks(v);
  switch (c) {
    case 8: return k[0] === 12 ? "Royal flush" : `Straight flush, ${RANK_NAME[k[0]]} high`;
    case 7: return `Four ${RANK_PLURAL[k[0]]}`;
    case 6: return `Full house, ${RANK_PLURAL[k[0]]} over ${RANK_PLURAL[k[1]]}`;
    case 5: return `Flush, ${RANK_NAME[k[0]]} high`;
    case 4: return `Straight, ${RANK_NAME[k[0]]} high`;
    case 3: return `Three ${RANK_PLURAL[k[0]]}`;
    case 2: return `Two pair, ${RANK_PLURAL[k[0]]} and ${RANK_PLURAL[k[1]]}`;
    case 1: return `Pair of ${RANK_PLURAL[k[0]]}`;
    default: return `${RANK_NAME[k[0]]} high`;
  }
}
// The best five and which community cards it uses.
function bestDetail(played, com) {
  const need = 5 - played.length;
  let best = { v: -1, extra: [] };
  if (need < 0 || com.length < need) return best;
  for (const extra of combos(com, need)) { const v = eval5(played.concat(extra)); if (v > best.v) best = { v, extra }; }
  return best;
}

function cardEl(c, small = false) {
  const el = document.createElement("div");
  el.className = "card" + (c.s === 1 || c.s === 2 ? " red" : "") + (small ? " small" : "");
  const r = RANK_TXT[c.r], s = SUIT_SYM[c.s];
  el.innerHTML = `<div class="c">${r}<span>${s}</span></div><div class="pip">${s}</div><div class="c br">${r}<span>${s}</span></div>`;
  el.dataset.id = c.id;
  return el;
}

class App {
  constructor() {
    this.players = load("players", 3);
    this.level = load("level", "hard");
    this.minPlay = load("minPlay", 1);
    this.sel = new Set();
    this.busy = false;
    $("btn-play").onclick = () => this.play();
    $("btn-clear").onclick = () => { this.sel.clear(); this.render(); };
    this.showStart();
  }

  name(p) { return p === 0 ? "You" : NAMES[p - 1]; }

  // ---------------------------------------------------------- panels
  panel(html) { $("panel").innerHTML = html; $("overlay").classList.remove("hidden"); }
  closePanel() { $("overlay").classList.add("hidden"); }

  showStart() {
    const seg = (key, vals, labels) => `<span class="seg" data-k="${key}">${vals.map((v, i) => `<button data-v='${JSON.stringify(v)}' class="${this[key] === v ? "on" : ""}">${labels[i]}</button>`).join(" ")}</span>`;
    this.panel(`<h1>RIVER</h1>
      <p>Everyone sees the river coming. Pick your moment.</p>
      <div class="opt"><span>Players</span>${seg("players", [2, 3, 4], ["2", "3", "4"])}</div>
      <div class="opt"><span>Opponents</span>${seg("level", ["easy", "hard"], ["Easy", "Hard"])}</div>
      <div class="opt"><span>Cards a turn</span>${seg("minPlay", [1, 2], ["At least 1", "At least 2"])}</div>
      <div class="btns"><button id="b-rules">How to play</button><button class="go" id="b-go">Play</button></div>`);
    $("panel").querySelectorAll(".seg button").forEach(b => b.onclick = () => {
      const k = b.parentElement.dataset.k; this[k] = JSON.parse(b.dataset.v); save(k, this[k]);
      b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    });
    $("b-rules").onclick = () => this.showRules(() => this.showStart());
    $("b-go").onclick = () => { this.closePanel(); this.newGame(); };
  }

  showRules(back) {
    this.panel(`<h2>How to play</h2>
      <p>A normal deck of 52 cards. Everyone is dealt 10.</p>
      <p>In the middle is the <b>river</b>, four cards face up. Next to it you can see the next four cards <b>coming</b>. Every turn the oldest river card leaves and the next one joins, so you always know what the river will look like for the next few turns.</p>
      <p>Each turn a <b>prize</b> card is turned up. Its value is its rank, from 2 for a Two up to 14 for an Ace.</p>
      <p>Everyone secretly chooses cards from their hand, at least ${this.minPlay} and at most 5. Your hand is the best poker hand of five cards that uses every card you played plus cards from the river. The best hand takes the prize. If the best hands tie exactly, the prize stays and the next prize joins it.</p>
      <p>Cards you play are gone. Play few and you stay in the hand for longer. Play many and you might win now but run out early. When only one player has cards left, the hand ends.</p>
      <p>First to ${TARGET} points over several hands wins.</p>
      <div class="btns"><button class="go" id="b-back">Got it</button></div>`);
    $("b-back").onclick = back;
  }

  // ---------------------------------------------------------- game
  newGame() {
    this.totals = new Array(this.players).fill(0);
    this.handNo = 0;
    const easy = () => RiverAI.efficient(1.2), hard = () => RiverAI.planner({ worlds: 16, cands: 8 });
    this.ai = [null];
    for (let p = 1; p < this.players; p++) this.ai.push(this.level === "hard" ? hard() : easy());
    this.newHand();
  }

  newHand() {
    this.handNo++;
    this.g = new RiverGame({ players: this.players, handSize: 10, riverLen: 4, lookAhead: 4, temp: false, prize: true, minPlay: this.minPlay, lastBonus: 0 });
    this.g.newHand();
    this.view = this.g;
    this.reveal = null;
    this.sel.clear();
    this.render();
    this.maybeAuto();
  }

  // You're out but others play on: run their turns.
  async maybeAuto() {
    const g = this.g;
    if (g.over || g.hands[0].length) return;
    await wait(900);
    this.play(true);
  }

  async play(auto = false) {
    const g = this.g;
    if (this.busy || g.over) return;
    if (!auto) {
      const n = this.sel.size, lo = g.minFor(0);
      if (n < Math.max(1, lo) || n > 5) return;
    }
    this.busy = true;
    $("status").innerHTML = "The others are choosing…";
    $("btn-play").disabled = true;
    await wait(30);
    const plays = g.hands.map((h, p) => {
      if (!h.length) return [];
      if (p === 0) return [...this.sel];
      return this.ai[p](g, p);
    });
    // what happened, for showing
    const before = g.clone(), com = g.community();
    const rows = plays.map((ids, p) => {
      if (!ids.length) return null;
      const cs = ids.map(id => g.hands[p].find(c => c.id === id));
      const d = bestDetail(cs, com);
      return { p, cs, v: d.v, extra: d.extra };
    });
    const potCards = g.pot.slice(), potVal = g.potValue();
    g.playTurn(plays);
    const last = g.history[g.history.length - 1];
    this.reveal = { rows, winners: last.winners, potCards, potVal, tie: last.winners.length > 1 };
    this.view = before;
    this.sel.clear();
    this.render();
    await wait(auto ? 1600 : 2600);
    this.reveal = null;
    this.view = g;
    this.busy = false;
    if (g.over) return this.handOver();
    this.render();
    this.maybeAuto();
  }

  handOver() {
    const g = this.g;
    g.scores.forEach((s, p) => (this.totals[p] += s));
    const top = Math.max(...this.totals);
    const done = top >= TARGET && this.totals.filter(t => t === top).length === 1;
    const order = this.totals.map((t, p) => p).sort((a, b) => this.totals[b] - this.totals[a]);
    const rows = order.map(p => `<tr><td>${this.name(p)}</td><td>${g.trophies[p].map(c => RANK_TXT[c.r] + SUIT_SYM[c.s]).join(" ") || "nothing"}</td><td class="n">+${g.scores[p]}</td><td class="n">${this.totals[p]}</td></tr>`).join("");
    const winner = order[0];
    this.panel(`<h2>${done ? (winner === 0 ? "You win the game!" : `${this.name(winner)} wins the game`) : `Hand ${this.handNo} over`}</h2>
      <table><tr><td></td><td>Prizes won</td><td class="n">Hand</td><td class="n">Total</td></tr>${rows}</table>
      <p>${done ? "" : `First to ${TARGET} wins.`}</p>
      <div class="btns">${done ? `<button id="b-menu">Menu</button><button class="go" id="b-again">Play again</button>` : `<button class="go" id="b-next">Next hand</button>`}</div>`);
    if (done) { $("b-menu").onclick = () => this.showStart(); $("b-again").onclick = () => { this.closePanel(); this.newGame(); }; }
    else $("b-next").onclick = () => { this.closePanel(); this.newHand(); };
  }

  // ---------------------------------------------------------- drawing
  render() {
    const g = this.view, live = this.g, rv = this.reveal;
    // opponents
    const opps = $("opps"); opps.innerHTML = "";
    for (let p = 1; p < live.o.players; p++) {
      const s = document.createElement("div");
      s.className = "seat" + (rv && !rv.tie && rv.winners.includes(p) ? " win" : "");
      const n = live.hands[p].length;
      s.innerHTML = `<div class="nm">${this.name(p)}</div><div class="info">${n ? n + " cards" : "out"} · ${live.scores[p]} this hand</div><div class="backs">${"<div class='cb'></div>".repeat(n)}</div>`;
      opps.appendChild(s);
    }
    // river, queue, prize
    const used = new Set();
    const mine = this.sel.size ? bestDetail([...this.sel].map(id => g.hands[0].find(c => c.id === id)).filter(Boolean), g.community()) : null;
    if (mine && mine.v >= 0 && !rv) mine.extra.forEach(c => used.add(c.id));
    const fill = (id, cards, small = false) => { const el = $(id); el.innerHTML = ""; cards.forEach(c => { const e = cardEl(c, small); if (used.has(c.id)) e.classList.add("used"); el.appendChild(e); }); };
    fill("river", g.river);
    fill("queue", g.queue);
    fill("pot", rv ? rv.potCards : g.pot);
    const pv = rv ? rv.potVal : g.potValue();
    $("pot-value").textContent = (rv ? rv.potCards : g.pot).length > 1 ? `worth ${pv} (rolled over)` : `worth ${pv}`;
    // reveal
    const R = $("reveal"); R.innerHTML = "";
    if (rv) {
      for (const row of rv.rows) {
        if (!row) continue;
        const d = document.createElement("div");
        const win = rv.winners.includes(row.p);
        d.className = "rv" + (win && !rv.tie ? " win" : "");
        d.innerHTML = `<div class="who">${this.name(row.p)}</div><div class="what">${describe(row.v)}</div>`;
        const r = document.createElement("div"); r.className = "row";
        row.cs.forEach(c => r.appendChild(cardEl(c, true)));
        d.appendChild(r);
        R.appendChild(d);
      }
    }
    // your hand
    const H = $("hand"); H.innerHTML = "";
    const hand = live.hands[0].slice().sort((a, b) => a.r - b.r || a.s - b.s);
    hand.forEach(c => {
      const e = cardEl(c);
      if (this.sel.has(c.id)) e.classList.add("sel");
      e.onclick = () => { if (this.busy) return; this.sel.has(c.id) ? this.sel.delete(c.id) : (this.sel.size < 5 && this.sel.add(c.id)); this.render(); };
      H.appendChild(e);
    });
    // status
    const lo = Math.max(1, live.minFor(0)), n = this.sel.size;
    let st;
    if (rv) {
      if (rv.tie) st = `A tie. The prize rolls over to the next turn.`;
      else { const w = rv.winners[0]; st = `${w === 0 ? "You take" : this.name(w) + " takes"} the prize, <b>${rv.potVal} points</b>.`; }
    } else if (!live.hands[0].length) st = "You're out of cards. The others play on.";
    else if (!n) st = `Choose ${lo === 1 ? "1 to 5 cards" : lo + " to 5 cards"} to play for the prize.`;
    else if (n < lo) st = `Choose at least ${lo} cards.`;
    else st = `Your hand would be <b>${describe(mine.v)}</b> using ${n} card${n > 1 ? "s" : ""}.`;
    $("status").innerHTML = st;
    $("btn-play").disabled = this.busy || n < lo || n > 5 || !!rv;
    $("btn-play").textContent = n ? `Play ${n} card${n > 1 ? "s" : ""}` : "Play";
    $("btn-clear").disabled = !n || this.busy;
    // scores
    $("scores").innerHTML = this.totals.map((t, p) => `<span>${this.name(p)} <b>${t + live.scores[p]}</b></span>`).join("") + `<span>Hand ${this.handNo} · first to ${TARGET}</span>`;
  }
}

const app = new App();
