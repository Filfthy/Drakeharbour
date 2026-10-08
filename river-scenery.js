// river-scenery.js - the town map, alive. Townsfolk walk the streets and quays (Folk, on a canvas of their
// own), and one WebGL shader draws the painted map with, over it:
//   water that sways, glints and glitters in the sun, surf rolling in to every shore, rings where a
//   fish rose, boats rocking at their moorings, waterfalls that pour, smoke from the Forge and the
//   Tavern, firelight flickering in the Forge and the Tavern's windows, flags fluttering in the Square,
//   mist on the mountains, gulls with their shadows below them, and the shadows of passing clouds.
// It runs on a canvas inside #map, so the plain painting is there whenever it isn't. The water is
// found in advance (img/water.png, from tools/make-water.py). Everything here is in the painting's
// own pixels (1672 x 941).

const SCENE = {
  // boats: box (centre x, y, half width, height), the keel they rock about (x, y), bob (px), rock (radians), period (s)
  boats: [
    [396, 572, 32, 36, 396, 597, 1.1, 0.022, 3.4],
    [464, 541, 22, 14, 464, 547, 0.9, 0.035, 2.7],
    [514, 535, 19, 15, 514, 542, 0.9, 0.035, 3.0],
    [356, 672, 37, 43, 356, 703, 1.1, 0.02, 3.8],
    [541, 659, 22, 17, 541, 666, 0.9, 0.035, 2.9],
    [575, 698, 35, 40, 575, 727, 1.1, 0.02, 3.6]
  ],
  // waterfalls: the white water's box (left, top, right, bottom)
  falls: [[1558, 208, 1574, 242], [1440, 267, 1452, 292], [1515, 515, 1545, 565], [1173, 650, 1197, 677]],
  // the four banners round the fountain (left, top, right, bottom)
  flags: [[790, 455, 799, 480], [804, 462, 813, 487], [878, 459, 888, 484], [893, 464, 903, 487]],
  // chimneys: top (x, y), how high the smoke rises, how thick it is
  chimneys: [[864, 318, 145, 1.05], [1034, 343, 120, 0.85]],
  // firelight: the Forge's fire and the Tavern's windows (x, y, radius, strength)
  lights: [[833, 367, 9, 0.34], [948, 387, 7, 0.24], [1037, 408, 10, 0.28], [1073, 396, 6, 0.22]],
  // Grazing sheep: body bounds, then head centre/radius and an individual phase.
  sheep: [
    { body: [1180, 837, 14, 12], head: [1173, 837, 4, 0.4] },
    { body: [1207, 830, 14, 12], head: [1200, 829, 4, 2.7] }
  ],
  // gulls: start (x, y), heading (x, y), speed (px a second), loop length (px), start along it, size
  gulls: [
    [-60, 395, 1, -0.06, 34, 2600, 0, 6.2],
    [-60, 455, 1, 0.04, 29, 2400, 900, 5.4],
    [1760, 540, -1, -0.08, 38, 2700, 400, 6.6],
    [1760, 330, -1, 0.05, 31, 2500, 1600, 5.8],
    [-60, 300, 1, 0.12, 40, 2900, 2000, 5.2],
    [-80, 312, 1, 0.12, 40, 2900, 1988, 4.8]
  ]
};

// Townsfolk walking the open ground: the coast path, the quay and the pier, the market yard, the top of the
// Square and the road out of the east gate. The painting is flat, so nothing can hide them: the paths keep
// to open ground, and the place banners pass over them. Each walks to and fro along a path (map pixels),
// stopping at the ends, and the browsers stop now and then along the way as if at a stall.
const FOLK = {
  paths: {
    coast: [[258, 463], [300, 461], [340, 464], [372, 470], [388, 481], [400, 494], [425, 503], [455, 506], [478, 505]],
    quay: [[476, 613], [520, 613], [560, 612], [585, 610], [615, 604], [640, 600]],
    pier: [[503, 582], [540, 582], [575, 580], [600, 563], [628, 552], [650, 542], [640, 520], [628, 500]],
    market: [[658, 382], [670, 378], [684, 379], [692, 386]],
    square: [[794, 421], [830, 420], [868, 419], [900, 418]],
    road: [[1118, 612], [1150, 606], [1182, 600], [1205, 588], [1222, 575], [1250, 551]]
  },
  // path, kind (a row of the sprite sheet), speed (map pixels a second), where along the path they start
  people: [
    { path: "coast", kind: "traveller", speed: 6.5, at: 0.15 },
    { path: "coast", kind: "monk", speed: 5, at: 0.7 },
    { path: "quay", kind: "porter", speed: 6, at: 0.2 },
    { path: "quay", kind: "lady", speed: 5.5, at: 0.85 },
    { path: "pier", kind: "porter", speed: 5.5, at: 0.5 },
    { path: "market", kind: "lady", speed: 4.5, at: 0.3, browse: true },
    { path: "market", kind: "traveller", speed: 5, at: 0.8, browse: true },
    { path: "square", kind: "monk", speed: 4.5, at: 0.4, browse: true },
    { path: "square", kind: "guard", speed: 5.5, at: 0.9 },
    { path: "road", kind: "cart", speed: 9, at: 0.3 },
    { path: "road", kind: "guard", speed: 6, at: 0.75 }
  ]
};

// Draws the townsfolk on their own canvas over the map, at twice the map's size so they stay crisp when the
// table is scaled up. Their frames come from img/folk.png (tools/make-folk.py cuts it from the sprite sheet);
// until that exists, simple drawn figures in the same colours walk in their place.
const Folk = {
  RES: 2,
  STRIDE: 2.6,       // map pixels walked for each frame of a step
  canvas: null, ctx: null, atlas: null, walkers: [], last: -1, dirty: [],
  init(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    canvas.width = Scenery.MAP[0] * this.RES;
    canvas.height = Scenery.MAP[1] * this.RES;
    this.ctx = canvas.getContext("2d");
    if (typeof FOLK_SHEET !== "undefined") {
      const img = new Image();
      img.onload = () => { this.atlas = img; };
      img.src = "img/folk.png";
    }
    let seed = 20261006;
    this.rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    this.walkers = FOLK.people.map((p, i) => {
      const pts = FOLK.paths[p.path], cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      const len = cum[cum.length - 1];
      return Object.assign({}, p, { pts, cum, len, s: p.at * len, dir: i % 2 ? -1 : 1, wait: 0, walked: 0, group: 2, stopAt: null });
    });
  },
  show(on) {
    if (!this.canvas) return;
    this.canvas.style.display = on ? "block" : "none";
    if (!on) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.dirty = []; this.last = -1; }
  },
  // where a walker is along its path, and which way it is heading there
  where(w) {
    const { pts, cum } = w;
    let k = 1;
    while (k < pts.length - 1 && cum[k] < w.s) k++;
    const a = pts[k - 1], b = pts[k], f = (w.s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]);
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dx: (b[0] - a[0]) * w.dir, dy: (b[1] - a[1]) * w.dir };
  },
  step(dt) {
    for (const w of this.walkers) {
      if (w.wait > 0) { w.wait -= dt; continue; }
      let s = w.s + w.dir * w.speed * dt;
      if (s <= 0 || s >= w.len) {
        s = Math.max(0, Math.min(w.len, s));
        w.dir = -w.dir;
        w.wait = 1.5 + 3.5 * this.rnd();
        w.stopAt = null;
      } else if (w.browse) {
        if (w.stopAt == null) w.stopAt = s + w.dir * (12 + 30 * this.rnd());
        if ((w.dir > 0 && s >= w.stopAt) || (w.dir < 0 && s <= w.stopAt)) { w.wait = 1.2 + 3 * this.rnd(); w.stopAt = null; }
      }
      w.walked += Math.abs(s - w.s);
      w.s = s;
    }
  },
  draw(t) {
    if (!this.ctx) return;
    const dt = this.last < 0 ? 0 : Math.min(0.1, Math.max(0, t - this.last));
    this.last = t;
    this.step(dt);
    const c = this.ctx, R = this.RES;
    for (const d of this.dirty) c.clearRect(d[0], d[1], d[2], d[3]);
    this.dirty = [];
    const list = this.walkers.map(w => Object.assign(this.where(w), { w })).sort((a, b) => a.y - b.y);
    for (const { x, y, dx, dy, w } of list) {
      // which way they face: the sheet's groups run towards you, left, right, away
      if (w.wait <= 0 && (dx || dy)) w.group = Math.abs(dx) >= Math.abs(dy) * 0.8 ? (dx < 0 ? 1 : 2) : dy > 0 ? 0 : 3;
      const frame = w.wait > 0 ? 0 : Math.floor(w.walked / (w.kind === "cart" ? this.STRIDE * 1.4 : this.STRIDE)) % 4;
      const cart = w.kind === "cart", X = x * R, Y = y * R;
      // a soft shadow under the feet (or the wheels)
      c.fillStyle = "rgba(24, 14, 4, 0.3)";
      c.beginPath();
      c.ellipse(X + 2, Y + 1, cart ? 17 : 7, cart ? 4 : 2.6, 0, 0, Math.PI * 2);
      c.fill();
      if (this.atlas) {
        const r = FOLK_SHEET.rows[w.kind], col = w.group * 4 + frame;
        c.drawImage(this.atlas, col * r.w, r.y, r.w, r.h, Math.round(X - r.w / 2), Math.round(Y - r.h + FOLK_SHEET.pad), r.w, r.h);
        this.dirty.push([X - r.w / 2 - 3, Y - r.h - 3, r.w + 8, r.h + 10]);
      } else {
        c.save();
        c.setTransform(R, 0, 0, R, 0, 0);
        this.figure(c, x, y, w, frame);
        c.restore();
        this.dirty.push([X - (cart ? 44 : 18), Y - (cart ? 40 : 32), cart ? 88 : 36, cart ? 48 : 40]);
      }
    }
  },
  // The stand-in figures: about 12 map pixels tall, in the sheet's colours, each with a dark outline.
  figure(c, x, y, w, frame) {
    const k = w.kind, g = w.group, side = g === 1 || g === 2, f = g === 1 ? -1 : 1, swing = [0, 1, 0, -1][frame];
    const ink = "#24170e", skin = "#e2b48c";
    c.translate(x, y);
    c.lineJoin = "round"; c.lineCap = "round";
    const shape = (path, fill) => { c.beginPath(); path(); c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 0.7; c.stroke(); };
    const stroke = (path, col, wd) => { c.beginPath(); path(); c.strokeStyle = ink; c.lineWidth = wd + 0.9; c.stroke(); c.strokeStyle = col; c.lineWidth = wd; c.stroke(); };
    if (k === "cart") {
      c.scale(side ? f : 1, 1);
      const W = side ? 1 : 0.6;
      shape(() => c.rect(-9 * W, -8, 10 * W, 5), "#7a5230");                     // the cart
      shape(() => c.ellipse(-4 * W, -9, 3.5 * W, 1.6, 0, 0, Math.PI * 2), "#d9c189"); // its load
      shape(() => c.arc(-6 * W, -2.2, 2.2, 0, Math.PI * 2), "#5a3b20");          // a wheel
      shape(() => c.ellipse(4.5 * W, -6, 4 * W, 2.2, 0, 0, Math.PI * 2), "#6b4226"); // the horse
      shape(() => c.ellipse(8.4 * W, -8.6, 1.6 * W, 1.2, -0.6, 0, Math.PI * 2), "#6b4226");
      for (const lx of [2.2, 6.6]) stroke(() => { c.moveTo(lx * W, -4.5); c.lineTo(lx * W + swing * 0.8, -0.3); }, "#5a361e", 0.9);
      return;
    }
    c.scale(side ? f : 1, 1);
    const robe = k === "monk" || k === "lady";
    const cloth = { traveller: "#4d6b2f", guard: "#2f5d8a", porter: "#c9b07a", monk: "#cdb58a", lady: "#a8485e" }[k];
    const legs = { traveller: "#3a2a1e", guard: "#3a3530", porter: "#4d5b2f" }[k];
    if (k === "guard") stroke(() => { c.moveTo(2.6, 0); c.lineTo(2.6, -13); }, "#6b4a2b", 0.7);
    if (!robe) for (const s of [-1, 1]) stroke(() => { c.moveTo(0.7 * s, -3.6); c.lineTo(0.7 * s + (side ? 1.2 * swing * s : 0), -0.3); }, legs, 1.1);
    if (robe) shape(() => { c.moveTo(-1.7, -7.4); c.lineTo(1.7, -7.4); c.lineTo(2.6 + 0.3 * swing, -0.2); c.lineTo(-2.6 + 0.3 * swing, -0.2); c.closePath(); }, cloth);
    else shape(() => { c.moveTo(-1.8, -7.4); c.lineTo(1.8, -7.4); c.lineTo(2.1, -3.1); c.lineTo(-2.1, -3.1); c.closePath(); }, cloth);
    if (k === "porter") shape(() => c.ellipse(side ? -1.4 : 0, -9.6, 2.4, 1.8, 0, 0, Math.PI * 2), "#d9c189");
    if (k === "monk") shape(() => c.arc(0, -8.8, 1.8, 0, Math.PI * 2), cloth);
    else shape(() => c.arc(0, -8.8, 1.45, 0, Math.PI * 2), g === 3 ? "#6b4a2b" : skin);
    if (k === "monk" && g !== 3) shape(() => c.arc(side ? 0.6 : 0, -8.5, 0.8, 0, Math.PI * 2), skin);
    if (k === "traveller") shape(() => c.ellipse(0, -9.9, 2.6, 0.9, 0, 0, Math.PI * 2), "#6b4a2b");
    if (k === "porter") shape(() => c.ellipse(0.2, -10, 1.6, 0.8, 0, Math.PI, Math.PI * 2), "#6b4a2b");
    if (k === "guard") shape(() => c.arc(0, -9.1, 1.6, Math.PI, Math.PI * 2), "#9aa1a8");
    if (k === "lady") shape(() => c.arc(0, -9.5, 1.3, Math.PI * 0.95, Math.PI * 2.05), "#b07a3a");
  }
};

const Scenery = {
  MAP: [1672, 941],
  FPS: 30,
  canvas: null, gl: null, prog: null, u: {}, ready: false, on: false, raf: 0, last: 0, t0: 0,
  visible: () => true,
  bufs: null,

  init(canvas, visible, folk) {
    this.canvas = canvas;
    if (visible) this.visible = visible;
    Folk.init(folk);
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" };
    const gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    if (!gl) return false;
    canvas.width = this.MAP[0];
    canvas.height = this.MAP[1];
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.ready = false; this.stop(); });
    this.gl = gl;
    const prog = this.program(SCENERY_VERT, SCENERY_FRAG);
    if (!prog) { this.gl = null; return false; }
    this.prog = prog;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    for (const k of ["uMap", "uWater", "uForgePatch", "uMillPatch", "uTime", "uRes", "uChim", "uBoatBox", "uBoatPiv", "uFall", "uLight", "uFlag", "uGull", "uGullDir", "uSheepBox", "uSheepHead"]) this.u[k] = gl.getUniformLocation(prog, k);
    gl.uniform2f(this.u.uRes, this.MAP[0], this.MAP[1]);
    gl.uniform1i(this.u.uMap, 0);
    gl.uniform1i(this.u.uWater, 1);
    gl.uniform1i(this.u.uForgePatch, 2);
    gl.uniform1i(this.u.uMillPatch, 3);
    const flat = rows => new Float32Array(rows.flat());
    gl.uniform4fv(this.u.uChim, flat(SCENE.chimneys));
    gl.uniform4fv(this.u.uBoatBox, flat(SCENE.boats.map(b => b.slice(0, 4))));
    gl.uniform4fv(this.u.uFall, flat(SCENE.falls));
    gl.uniform4fv(this.u.uFlag, flat(SCENE.flags));
    gl.uniform4fv(this.u.uSheepBox, flat(SCENE.sheep.map(s => s.body)));
    gl.uniform4fv(this.u.uSheepHead, flat(SCENE.sheep.map(s => s.head)));
    this.bufs = { boats: new Float32Array(24), lights: new Float32Array(16), gulls: new Float32Array(24), gullDirs: new Float32Array(12) };
    gl.viewport(0, 0, this.MAP[0], this.MAP[1]);
    let n = 0;
    const done = () => { if (++n === 4) { this.ready = true; if (this.on) this.start(); } };
    const load = (map, water) => {
      this.texture(0, map, done); this.texture(1, water, done);
      const local = location.protocol === "file:";
      this.texture(2, local ? SCENERY_PATCHES.forge : "img/forge-clean-patch.webp", done);
      this.texture(3, local ? SCENERY_PATCHES.mill : "img/mill-clean-patch.webp", done);
    };
    if (location.protocol === "file:") {
      // opened from the disk: the pictures come built into a script, since WebGL may not use the files
      const s = document.createElement("script");
      s.src = "scenery-data.js";
      s.onload = () => { if (window.SCENERY_DATA) load(SCENERY_DATA.map, SCENERY_DATA.water); };
      document.head.appendChild(s);
    } else load("img/map.webp", "img/water.png");
    this.t0 = performance.now();
    return true;
  },
  program(vs, fs) {
    const gl = this.gl, sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (console.warn(gl.getShaderInfoLog(s)), null);
    };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : (console.warn(gl.getProgramInfoLog(p)), null);
  },
  texture(unit, url, done) {
    const gl = this.gl, img = new Image();
    img.onload = () => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); } catch (e) { return; }   // the plain map stays
      done();
    };
    img.src = url;
  },

  // Switch the animation on or off. While it runs, the stage carries "fx-on" (the start screen then shows it).
  set(on) {
    this.on = on;
    if (!this.gl) return;
    if (on && this.ready) this.start(); else this.stop();
  },
  start() {
    if (this.raf) return;
    this.canvas.style.display = "block";
    Folk.show(true);
    const st = this.canvas.closest("#stage");
    if (st) st.classList.add("fx-on");
    const tick = now => {
      this.raf = requestAnimationFrame(tick);
      if (now - this.last < 1000 / this.FPS - 2 || !this.visible()) return;
      // a machine that can't keep up: frames keep coming late (not just the odd long pause while the
      // computer players think), so the map is drawn at half resolution, a quarter of the work
      const gap = now - this.last;
      if (gap < 200) this.late = (this.late || 0) * 0.97 + (gap > 50 ? 0.03 : 0);
      if (this.late > 0.6 && !this.half) this.halve();
      this.last = now;
      this.draw((now - this.t0) / 1000);
    };
    this.raf = requestAnimationFrame(tick);
  },
  halve() {
    this.half = true;
    this.canvas.width = Math.round(this.MAP[0] / 2);
    this.canvas.height = Math.round(this.MAP[1] / 2);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  },
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (!this.canvas) return;
    this.canvas.style.display = "none";
    Folk.show(false);
    const st = this.canvas.closest("#stage");
    if (st) st.classList.remove("fx-on");
  },

  // What moves from frame to frame is worked out here and handed to the shader.
  draw(t) {
    const gl = this.gl, B = this.bufs, TAU = Math.PI * 2;
    SCENE.boats.forEach((b, i) => {
      const w = TAU * t / b[8] + i * 1.9;
      B.boats.set([b[4], b[5], b[6] * Math.sin(w), b[7] * Math.sin(w * 0.83 + 1.1)], i * 4);
    });
    SCENE.lights.forEach((l, i) => {
      const f = 0.75 + 0.15 * Math.sin(t * 7.3 + i) + 0.1 * Math.sin(t * 12.7 + 2.3 * i) + 0.08 * Math.sin(t * 21.1 + 0.7 * i);
      B.lights.set([l[0], l[1], l[2], l[3] * f], i * 4);
    });
    SCENE.gulls.forEach((g, i) => {
      const len = Math.hypot(g[2], g[3]), d = (t * g[4] + g[6]) % g[5];
      const x = g[0] + g[2] / len * d, y = g[1] + g[3] / len * d + 9 * Math.sin(t * 0.45 + i * 1.7);
      // Include the vertical meander's derivative, so the bird faces its actual velocity.
      const vx = g[2] / len * g[4], vy = g[3] / len * g[4] + 4.05 * Math.cos(t * 0.45 + i * 1.7);
      const speed = Math.hypot(vx, vy);
      B.gullDirs.set([vx / speed, vy / speed], i * 2);
      const glide = Math.min(1, Math.max(0, 0.5 + 1.6 * Math.sin(t * 0.7 + i * 1.3)));
      const on = x > -30 && x < this.MAP[0] + 30 && y > -30 && y < this.MAP[1] + 30;
      B.gulls.set([x, y, Math.sin(t * 9 + i * 2.1) * glide, on ? g[7] : 0], i * 4);
    });
    gl.uniform1f(this.u.uTime, t % 3600);
    gl.uniform4fv(this.u.uBoatPiv, B.boats);
    gl.uniform4fv(this.u.uLight, B.lights);
    gl.uniform4fv(this.u.uGull, B.gulls);
    gl.uniform2fv(this.u.uGullDir, B.gullDirs);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    Folk.draw(t);
  }
};

const SCENERY_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const SCENERY_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMap, uWater, uForgePatch, uMillPatch;
uniform float uTime;
uniform vec2 uRes;
uniform vec4 uChim[2], uBoatBox[6], uBoatPiv[6], uFall[4], uLight[4], uFlag[4], uGull[6];
uniform vec2 uGullDir[6];
uniform vec4 uSheepBox[2], uSheepHead[2];
varying vec2 vUv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v / 0.875; }
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
// a gull seen from above: a small body, and two wings each rising to the elbow and sweeping down to a
// fine tip; beat runs from -1 (wings down) to 1 (up). Negative inside the bird.
float gull(vec2 q, float beat, float s) {
  float k = 0.45 + s / 14.0;
  vec2 e = vec2(0.45 * s, -0.3 * s - 0.25 * s * beat), tip = vec2(s, 0.2 * s - 0.45 * s * beat);
  q.x = abs(q.x);
  float h1 = clamp(dot(q, e) / dot(e, e), 0.0, 1.0);
  float d1 = length(q - e * h1) - mix(1.7, 1.2, h1) * k;
  vec2 qe = q - e, te = tip - e;
  float h2 = clamp(dot(qe, te) / dot(te, te), 0.0, 1.0);
  float d2 = length(qe - te * h2) - mix(1.2, 0.25, h2) * k;
  float d3 = length(q * vec2(1.0, 0.62)) - 1.7 * k;
  // The head and beak point towards local negative y.
  float head = length(q - vec2(0.0, -2.2 * k)) - 0.8 * k;
  float beak = seg(q, vec2(0.0, -2.6 * k), vec2(0.0, -3.7 * k)) - 0.22 * k;
  return min(min(min(d1, d2), d3), min(head, beak));
}

void main() {
  vec2 p = vUv * uRes;
  float t = uTime;

  // boats rock about their keels and bob, each fading out at the edge of its box
  vec2 off = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    vec2 q = (p - uBoatBox[i].xy) / uBoatBox[i].zw;
    if (abs(q.x) < 1.0 && abs(q.y) < 1.0) {
      float win = (1.0 - smoothstep(0.7, 1.0, abs(q.x))) * (1.0 - smoothstep(0.7, 1.0, abs(q.y)));
      vec4 b = uBoatPiv[i];
      vec2 r = p - b.xy - vec2(0.0, b.z);
      float c = cos(b.w), s = sin(b.w);
      off += (vec2(c * r.x + s * r.y, -s * r.x + c * r.y) + b.xy - p) * win;
    }
  }
  // the banners round the fountain flutter, more towards their loose ends
  for (int i = 0; i < 4; i++) {
    vec4 f = uFlag[i];
    if (p.x > f.x - 4.0 && p.x < f.z + 4.0 && p.y > f.y && p.y < f.w + 3.0) {
      float k = clamp((p.y - f.y) / (f.w - f.y), 0.0, 1.0);
      float edge = smoothstep(f.x - 4.0, f.x, p.x) * (1.0 - smoothstep(f.z, f.z + 4.0, p.x));
      off.x += k * edge * 1.4 * sin((p.y - f.y) * 0.35 - t * 5.5 + float(i) * 1.7);
    }
  }
  // Gentle grazing: a head dips while planted feet and the surrounding field stay still.
  // Different phases and periods avoid a synchronised flock.
  for (int i = 0; i < 2; i++) {
    vec4 body = uSheepBox[i], head = uSheepHead[i];
    vec2 q = (p - body.xy) / body.zw;
    if (abs(q.x) < 1.0 && abs(q.y) < 1.0) {
      float phase = t * (0.72 + float(i) * 0.13) + head.w;
      float graze = pow(max(0.0, sin(phase)), 2.0);
      float edge = (1.0 - smoothstep(0.6, 1.0, abs(q.x))) * (1.0 - smoothstep(0.6, 1.0, abs(q.y)));
      vec2 h = (p - head.xy) / head.z;
      float headMask = exp(-dot(h, h));
      off.x += edge * (0.28 * sin(phase * 0.63) + 0.25 * headMask * graze);
      off.y += edge * (-1.15 * headMask * graze + 0.12 * sin(phase * 1.7));
    }
  }
  vec2 at = p + off;
  vec3 wt = texture2D(uWater, at / uRes).rgb;
  float w = wt.r, fount = wt.b;

  // water: the picture under it sways a pixel or two, in slow crossing waves
  vec2 d = vec2(0.0);
  if (w > 0.0) {
    vec2 q = p * 0.05;
    d = vec2(noise(q + vec2(t * 0.42, t * 0.17)), noise(q * 1.7 + vec2(-t * 0.33, t * 0.29))) - 0.5;
    d += 0.5 * (vec2(noise(p * 0.11 + vec2(t * 0.8, 0.0)), noise(p * 0.11 + vec2(0.0, t * 0.7))) - 0.5);
    d *= 4.2 * w * (1.0 - 0.7 * fount);
  }
  vec3 col = texture2D(uMap, (at + d) / uRes).rgb;

  // Clean local artwork is used only on this animated canvas. Feathered borders
  // join the untouched map; hiding the canvas restores its original smoke and sails.
  vec2 forgeUv = (p - vec2(820.0, 205.0)) / vec2(160.0, 130.0);
  if (forgeUv.x > 0.0 && forgeUv.x < 1.0 && forgeUv.y > 0.0 && forgeUv.y < 1.0) {
    vec2 edge = min(forgeUv, 1.0 - forgeUv) * vec2(160.0, 130.0);
    col = mix(col, texture2D(uForgePatch, forgeUv).rgb, smoothstep(0.0, 6.0, min(edge.x, edge.y)));
  }
  vec2 millUv = (p - vec2(470.0, 170.0)) / vec2(105.0, 110.0);
  if (millUv.x > 0.0 && millUv.x < 1.0 && millUv.y > 0.0 && millUv.y < 1.0) {
    vec2 edge = min(millUv, 1.0 - millUv) * vec2(105.0, 110.0);
    col = mix(col, texture2D(uMillPatch, millUv).rgb, smoothstep(0.0, 6.0, min(edge.x, edge.y)));
  }

  // Four cream cloth sails on timber frames, rotating in the mill's angled face.
  vec2 mq = (p - vec2(523.0, 227.0)) / vec2(0.78, 1.0);
  if (length(mq) < 30.0) {
    float angle = t * 6.2831853 / 24.0 + 0.2;
    vec2 r = vec2(cos(angle) * mq.x + sin(angle) * mq.y, -sin(angle) * mq.x + cos(angle) * mq.y);
    for (int i = 0; i < 4; i++) {
      float arm = seg(r, vec2(0.0), vec2(0.0, -28.0)) - 0.6;
      col = mix(col, vec3(0.30, 0.23, 0.14), 1.0 - smoothstep(-0.2, 0.65, arm));
      vec2 box = abs(r - vec2(2.5, -17.0)) - vec2(2.5, 10.0);
      float blade = max(box.x, box.y);
      float frame = max(1.0 - smoothstep(0.5, 1.1, -blade), 1.0 - smoothstep(0.25, 0.65, abs(mod(r.y + 27.0, 5.0) - 2.5)));
      vec3 cloth = vec3(0.83, 0.77, 0.60) * (1.0 - 0.08 * mq.y / 28.0);
      vec3 sail = mix(cloth, vec3(0.37, 0.29, 0.18), frame * 0.65);
      col = mix(col, sail, 1.0 - smoothstep(-0.25, 0.6, blade));
      r = vec2(-r.y, r.x);
    }
    float hub = 1.0 - smoothstep(1.4, 2.2, length(mq));
    col = mix(col, vec3(0.36, 0.26, 0.16) + 0.1 * max(0.0, -mq.y) , hub);
  }

  if (w > 0.01) {
    // short glints along the wave crests, where two wave patterns meet
    float g = noise(vec2(p.x * 0.07, p.y * 0.22) + vec2(t * 0.55, t * 0.12)) * noise(vec2(p.x * 0.05, p.y * 0.19) - vec2(t * 0.42, -t * 0.2));
    col += w * smoothstep(0.54, 0.76, g) * vec3(0.28, 0.30, 0.32);
    // a broad, slow swell of light and shade
    col *= 1.0 + w * 0.08 * (noise(p * 0.012 + vec2(t * 0.05, t * 0.03)) - 0.5);
    // sun glitter: tiny points flashing on and off, gathered in drifting patches
    vec2 gc = floor(p / 5.0);
    if (hash(gc) > 0.45) {
      float tw = pow(max(0.0, sin(t * (1.3 + 2.6 * hash(gc + 3.7)) + 6.2831 * hash(gc + 7.1))), 16.0);
      vec2 gp = (gc + 0.25 + 0.5 * vec2(hash(gc + 1.7), hash(gc + 9.2))) * 5.0;
      float pt = 1.0 - smoothstep(0.3, 1.5, length(p - gp));
      float area = min(1.0, smoothstep(0.32, 0.62, noise(p * 0.008 + vec2(t * 0.03, -t * 0.015))) + fount);
      col += w * tw * pt * area * vec3(1.0, 0.97, 0.86);
    }
    // rings spreading where a fish rose
    vec2 rc = floor(p / 80.0);
    if (hash(rc + 4.4) > 0.3 && fount < 0.5) {
      vec2 ctr = (rc + 0.3 + 0.4 * vec2(hash(rc + 1.3), hash(rc + 2.9))) * 80.0;
      float per = 4.0 + 4.0 * hash(rc + 5.1);
      float age = fract(t / per + hash(rc + 6.7)) * per;
      if (age < 2.4) {
        float a = age / 2.4, fade = (1.0 - a) * (1.0 - a);
        float rr = length((p - ctr) * vec2(1.0, 1.75)), rad = 1.5 + 17.0 * a;
        float ring = exp(-pow((rr - rad) / 1.2, 2.0)) + 0.6 * step(0.2, a) * exp(-pow((rr - rad * 0.55) / 1.0, 2.0));
        col += ring * fade * w * texture2D(uWater, ctr / uRes).r * vec3(0.4, 0.43, 0.46);
      }
    }
    // surf: lines of foam rolling in to every shore, and the edge itself breathing
    float nearShore = 1.0 - wt.g;
    if (nearShore > 0.0 && fount < 0.5) {
      float br = noise(p * 0.045 + vec2(t * 0.2, 0.0));
      float ph = fract(wt.g * 2.4 + t * 0.28 + noise(p * 0.018) * 0.7);
      float crest = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.06, 0.32, ph));
      float foam = nearShore * crest * smoothstep(0.32, 0.62, br);
      foam += smoothstep(0.8, 1.0, nearShore) * (0.3 + 0.3 * sin(t * 1.3 + noise(p * 0.03) * 6.28)) * smoothstep(0.3, 0.6, br);
      col = mix(col, vec3(0.96, 0.98, 1.0), clamp(foam * 0.75, 0.0, 0.72) * w);
    }
  }

  // waterfalls pour: bright streaks running down the white water, and spray at the foot
  for (int i = 0; i < 4; i++) {
    vec4 f = uFall[i];
    if (p.x > f.x - 8.0 && p.x < f.z + 8.0 && p.y > f.y - 2.0 && p.y < f.w + 18.0) {
      float lum = dot(col, vec3(0.3, 0.55, 0.15));
      float fall = step(f.x, p.x) * step(p.x, f.z) * step(f.y, p.y) * step(p.y, f.w) * smoothstep(0.46, 0.66, lum);
      float s = noise(vec2(p.x * 0.55, (p.y - t * 70.0) * 0.07));
      col = mix(col, vec3(0.97, 0.99, 1.0), fall * smoothstep(0.55, 0.85, s) * 0.65);
      col *= 1.0 - fall * smoothstep(0.42, 0.12, s) * 0.2;
      vec2 r = (p - vec2((f.x + f.z) * 0.5, f.w)) / vec2((f.z - f.x) * 0.8 + 5.0, 10.0);
      float m = exp(-dot(r, r)) * fbm3(vec2(p.x * 0.09 - t * 0.35, p.y * 0.09 + t * 1.1));
      col = mix(col, vec3(0.95, 0.97, 1.0), clamp(m * 1.1, 0.0, 0.6));
    }
  }

  // firelight flickering in the Forge and the Tavern's windows
  for (int i = 0; i < 4; i++) {
    vec4 L = uLight[i];
    vec2 r = p - L.xy;
    col += exp(-dot(r, r) / (L.z * L.z)) * L.w * vec3(1.0, 0.55, 0.16);
  }

  // the shadows of clouds drifting over the land
  float c = fbm3(p * 0.0024 + vec2(t * 0.034, t * 0.012));
  col *= 1.0 - 0.2 * smoothstep(0.48, 0.7, c);

  // mist drifting across the mountains
  if (p.y < 200.0) {
    float m = fbm3(p * vec2(0.0045, 0.014) + vec2(t * 0.02, 0.0));
    col = mix(col, vec3(0.88, 0.91, 0.95), smoothstep(0.5, 0.8, m) * (1.0 - smoothstep(70.0, 190.0, p.y)) * 0.45);
  }

  // Smoke rises over the clean forge patch, without a stationary plume underneath.
  for (int i = 0; i < 2; i++) {
    vec4 ch = uChim[i];
    vec2 s = p - ch.xy;
    float h = -s.y;
    if (h > -8.0 && h < ch.z && abs(s.x) < ch.z) {
      float x = s.x - h * 0.7 - 3.0 * smoothstep(0.0, 24.0, h) * sin(h * 0.05 - t * 1.3 + float(i) * 2.0);
      float wd = i == 0 ? 6.0 + h * 0.20 : 4.0 + h * 0.22;
      float core = exp(-x * x / (wd * wd));
      float fade = smoothstep(-1.0, 3.0, h) * (1.0 - smoothstep(ch.z * 0.42, ch.z, h));
      float puff = fbm(vec2(x * 0.07 + float(i) * 7.0, (h - t * 16.0) * 0.06));
      float density = mix(0.72, smoothstep(0.28, 0.66, puff), smoothstep(0.0, 30.0, h));
      if (i == 0) density = 0.25 + 0.75 * density; // fuller forge plume; pub density stays unchanged
      col = mix(col, vec3(0.93, 0.92, 0.9), clamp(core * fade * density * ch.w, 0.0, 0.85));
    }
  }

  // gulls, with their shadows on the ground below
  for (int i = 0; i < 6; i++) {
    vec4 g = uGull[i];
    if (g.w > 0.0) {
      vec2 q = p - g.xy, qs = q - vec2(9.0, 24.0);
      vec2 forward = uGullDir[i], side = vec2(-forward.y, forward.x);
      vec2 bird = vec2(dot(q, side), -dot(q, forward));
      vec2 shadow = vec2(dot(qs, side), -dot(qs, forward));
      if (abs(qs.x) < g.w + 4.0 && abs(qs.y) < g.w + 4.0) col *= 1.0 - 0.28 * (1.0 - smoothstep(-0.5, 1.5, gull(shadow, g.z, g.w)));
      if (abs(q.x) < g.w + 3.0 && abs(q.y) < g.w + 3.0) {
        float dg = gull(bird, g.z, g.w);
        col = mix(col, vec3(0.2, 0.18, 0.17), (1.0 - smoothstep(0.2, 1.0, dg)) * 0.7);
        // white above, a touch of grey towards the wing tips
        vec3 plume = mix(vec3(0.99, 0.99, 0.97), vec3(0.72, 0.74, 0.78), smoothstep(0.55, 1.0, abs(bird.x) / g.w));
        col = mix(col, plume, 1.0 - smoothstep(-0.45, 0.3, dg));
      }
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;
