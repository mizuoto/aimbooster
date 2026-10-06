"use strict";
const $ = (id) => document.getElementById(id);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const defaults = {
  rate: 3.1,
  increase: 0,
  lifetime: 3.5,
  radius: 35,
  lives: 3,
  duration: 0,
  width: 600,
  height: 420,
  speed: 0,
  group: 1,
  hp: 1,
  constant: false,
  random: false,
  instant: false,
  center: false,
  hover: false,
  missLife: true,
  clickLife: false,
  nearest: true,
  clear: false,
  overlap: true,
  maxDistance: 0,
  absolute: false,
  variation: 0.3,
  horizontal: 0.5,
  invisible: false,
  showMs: false,
  ghosts: true,
  fade: true,
  seed: 0,
  balance: "none",
  accuracy: 0.92,
};
const presets = {
  Challenge: { rate: 2.2, nearest: false },
  Speed: {},
  Precision: {
    rate: 0.625,
    lifetime: 0.85,
    radius: 4,
    constant: true,
    missLife: false,
    showMs: true,
  },
  "Twitch shots": {
    rate: 0.5,
    lifetime: 0.5,
    radius: 20,
    constant: true,
    random: true,
    missLife: false,
    showMs: true,
  },
  "Double shot": {
    rate: 1.25,
    lifetime: 0.8,
    radius: 20,
    constant: true,
    group: 2,
    missLife: false,
    nearest: false,
  },
  Sniping: {
    rate: 0.9,
    lifetime: 2.8,
    radius: 8,
    speed: 7,
    random: true,
    nearest: false,
  },
  Reaction: {
    rate: 0.28,
    lifetime: 0,
    radius: 25,
    constant: true,
    random: true,
    center: true,
    missLife: false,
    nearest: false,
    showMs: true,
  },
  "Auto speed": { rate: 2, balance: "rate", clickLife: true },
  "Auto size": { rate: 2, balance: "radius", clickLife: true },
  "Auto time": {
    rate: 0.5,
    lifetime: 0.5,
    radius: 20,
    constant: true,
    random: true,
    showMs: true,
    balance: "lifetime",
    accuracy: 0.75,
    clickLife: true,
  },
  "Old challenge": {
    rate: 2.3,
    increase: 1.3,
    duration: 60,
    lives: 1,
    nearest: false,
  },
  "Whack-a-target": {
    rate: 1,
    lifetime: 0,
    radius: 25,
    group: 5,
    constant: true,
    duration: 40,
    instant: true,
    nearest: false,
    missLife: false,
  },
  "Clicks per minute": {
    rate: 1,
    lifetime: 0,
    constant: true,
    duration: 30,
    instant: true,
    center: true,
    nearest: false,
    missLife: false,
  },
  Tracking: {
    rate: 0.4,
    lifetime: 3,
    radius: 20,
    speed: 7,
    constant: true,
    hp: -1,
    duration: 60,
    nearest: false,
    missLife: false,
  },
  "Can't touch this": {
    rate: 1,
    lifetime: 0,
    radius: 20,
    constant: true,
    duration: 30,
    instant: true,
    hover: true,
    nearest: false,
    missLife: false,
    showMs: true,
  },
  "Tile frenzy": {
    rate: 1,
    increase: 0,
    lifetime: 0,
    radius: 42.5,
    speed: 0,
    constant: true,
    nearest: false,
    instant: true,
    group: 3,
    center: false,
    random: false,
    maxDistance: 0,
    lives: 3,
    clickLife: false,
    missLife: false,
    clear: false,
    duration: 30,
    width: 600,
    height: 420,
    balance: "none",
    accuracy: 0.95,
    invisible: false,
    hover: false,
    hp: 1,
    overlap: true,
    showMs: false,
    fade: true,
    absolute: false,
    variation: 0.3,
    horizontal: 0.5,
    seed: 0,
  },
  Custom: {},
};
const fieldSpecs = [
  ["rate", "targets / second", 0.001, 99, 0.001],
  ["radius", "radius · px", 1, 150, 0.5],
  ["lifetime", "lifetime · s (0 = ∞)", 0, 60, 0.05],
  ["duration", "time limit · s (0 = ∞)", 0, 3600, 1],
  ["lives", "lives (0 = ∞)", 0, 99, 1],
  ["speed", "speed · diameters / s", 0, 100, 0.1],
  ["width", "field width · px", 100, 1600, 10],
  ["height", "field height · px", 100, 1200, 10],
  ["increase", "rate increase / minute", 0, 30, 0.1],
  ["group", "targets per group", 1, 20, 1],
  ["hp", "hits to clear (-1 = ∞)", -1, 100, 1],
  ["maxDistance", "max spawn distance (0 = off)", 0, 2000, 1],
  ["variation", "speed randomness", 0, 1, 0.05],
  ["horizontal", "horizontal bias", 0, 1, 0.05],
  ["seed", "random seed (0 = random)", 0, 2147483646, 1],
  ["accuracy", "adaptive success goal", 0.5, 0.99, 0.01],
  ["balance", "adaptive difficulty", ["none", "rate", "radius", "lifetime"]],
  ["constant", "constant target size"],
  ["random", "random spawn timing"],
  ["instant", "instant replacement"],
  ["center", "spawn in center"],
  ["hover", "hover to hit"],
  ["nearest", "misclick removes nearest"],
  ["missLife", "expired target costs a life"],
  ["clickLife", "misclick costs a life"],
  ["clear", "life loss clears field"],
  ["overlap", "allow partial overlap"],
  ["absolute", "speed in pixels / s"],
  ["invisible", "hide cursor"],
  ["showMs", "show response time"],
  ["ghosts", "target ghosts"],
  ["fade", "fade constant targets"],
];
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("aimbooster-minimal") || "{}") || {};
} catch {}
if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
let mode = "Challenge",
  config,
  state = "menu",
  run,
  lastConfig,
  lastMode,
  frame = 0,
  lastStamp = 0;
let sound = saved.sound === true,
  audioContext;
const ctx = $("canvas").getContext("2d", { alpha: false });
const pointer = { x: -999, y: -999 };
function save() {
  try {
    localStorage.setItem("aimbooster-minimal", JSON.stringify(saved));
  } catch {}
}
function soundLabel() {
  $("sound").textContent = `sound ${sound ? "on" : "off"}`;
  $("sound").setAttribute("aria-pressed", sound);
}
function tone(hit) {
  if (!sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const o = audioContext.createOscillator(),
      g = audioContext.createGain(),
      t = audioContext.currentTime;
    o.frequency.setValueAtTime(hit ? 700 : 150, t);
    o.frequency.exponentialRampToValueAtTime(hit ? 350 : 80, t + 0.045);
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    o.connect(g);
    g.connect(audioContext.destination);
    o.start(t);
    o.stop(t + 0.06);
  } catch {}
}
function selectMode(name) {
  mode = name;
  config = { ...defaults, ...presets[name] };
  if (name === "Custom" && saved.custom && typeof saved.custom === "object") {
    for (const [key] of fieldSpecs)
      if (typeof saved.custom[key] === typeof defaults[key])
        config[key] = saved.custom[key];
  }
  $("modes")
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.textContent === name.toLowerCase()),
    );
  $("selectedMode").textContent = name.toLowerCase();
  $("start").textContent =
    name === "Challenge" ? "play challenge" : "start training";
  $("trainingSettings").hidden = name === "Challenge";
  $("trainingModes").open = name !== "Challenge";
  $("advancedSettings").open = false;
  $("shareSettings").hidden = name === "Challenge" && !$("trainingModes").open;
  $("fields").replaceChildren();
  $("advanced").replaceChildren();
  fieldSpecs.forEach(([key, label, min, max, step], i) => {
    const row = document.createElement("label"),
      input = document.createElement(Array.isArray(min) ? "select" : "input");
    row.append(document.createTextNode(label));
    input.id = `setting-${key}`;
    input.name = key;
    if (Array.isArray(min)) min.forEach((v) => input.add(new Option(v, v)));
    else if (typeof defaults[key] === "boolean") {
      input.type = "checkbox";
      input.checked = config[key];
    } else {
      input.type = "number";
      input.min = min;
      input.max = max;
      input.step = step;
      input.required = true;
    }
    if (input.type !== "checkbox") input.value = config[key];
    input.disabled = name === "Challenge";
    row.append(input);
    $(i < 6 ? "fields" : "advanced").append(row);
  });
  const best = saved.best?.[name];
  $("best").textContent = best
    ? `best ${best.toFixed(2)} ${name.includes("challenge") || name === "Challenge" || name === "Speed" || name === "Sniping" ? "s" : "hits"}`
    : "";
}
for (const name of Object.keys(presets)) {
  const button = document.createElement("button");
  button.textContent = name.toLowerCase();
  button.type = "button";
  button.onclick = () => selectMode(name);
  $("modes").append(button);
}
function readConfig() {
  const c = { ...config };
  if (mode === "Challenge") return c;
  for (const [key, , min, max] of fieldSpecs) {
    const el = $(`setting-${key}`);
    c[key] =
      el.type === "checkbox"
        ? el.checked
        : el.tagName === "SELECT"
          ? el.value
          : clamp(Number(el.value), min, max);
  }
  c.hp = c.hp === 0 ? 1 : c.hp;
  c.radius = Math.min(c.radius, c.width / 2, c.height / 2);
  if (!c.lifetime) c.constant = true;
  return c;
}
function setScreen(next) {
  state = next;
  $("menu").hidden = next !== "menu";
  $("game").hidden = !["running", "paused"].includes(next);
  $("results").hidden = next !== "results";
  $("resume").hidden = next !== "paused";
  $("pause").textContent = next === "paused" ? "resume" : "pause";
}
function start(c = readConfig(), name = mode) {
  cancelAnimationFrame(frame);
  lastConfig = { ...c };
  lastMode = name;
  run = {
    c: { ...c },
    name,
    t: 0,
    targets: [],
    effects: [],
    ghosts: [],
    shots: [],
    hits: 0,
    clicks: 0,
    expired: 0,
    removed: 0,
    lives: c.lives,
    next: 0,
    seed: c.seed || Math.floor(Math.random() * 2147483646) + 1,
    lastX: c.width / 2,
    lastY: c.height / 2,
    adaptive: c[c.balance],
    lastMiss: -100,
    grace: 0,
    lockMiss: 0,
    locked: 0,
  };
  if (c.random) run.next = (c.group / c.rate) * (0.5 + random());
  if (name === "Custom") saved.custom = { ...c };
  save();
  const canvas = $("canvas");
  canvas.style.aspectRatio = `${c.width}/${c.height}`;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(c.width * dpr);
  canvas.height = Math.round(c.height * dpr);
  canvas.style.width = "";
  canvas.style.maxWidth = "";
  canvas.style.cursor = c.invisible ? "none" : "";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pointer.x = pointer.y = -999;
  setScreen("running");
  canvas.focus();
  lastStamp = performance.now();
  draw();
  frame = requestAnimationFrame(tick);
}
function random() {
  run.seed = (run.seed * 16807) % 2147483647;
  return (run.seed & 0x3fffffff) / 1073741823;
}
function rate() {
  if (run.name === "Challenge")
    return (
      2.2 + Math.sqrt((run.t + 6.5369) * 0.035) - Math.sqrt(6.5369 * 0.035)
    );
  return run.c.balance === "rate"
    ? run.adaptive
    : run.c.rate + (run.c.increase * run.t) / 60;
}
function value(key) {
  return run.c.balance === key ? run.adaptive : run.c[key];
}
function radius(target) {
  return (
    target.r *
    (run.c.constant
      ? 1
      : target.life > 0
        ? Math.max(
            0,
            1 - Math.abs(1 - (2 * (run.t - target.born)) / target.life),
          )
        : 0)
  );
}
function adapt(hit) {
  const c = run.c;
  if (c.balance === "none") return;
  const decay = 1.35 ** -Math.max(0, run.t - run.lastMiss);
  const grace = Math.max(1 - decay * run.grace, (1 - c.accuracy) * 2);
  if (!hit) {
    if (run.t - run.lockMiss > 10) run.locked += run.t - run.lockMiss - 10;
    run.lockMiss = run.t;
  }
  const effectiveTime = Math.min(run.t, run.lockMiss + 10) - run.locked;
  let change =
    (((c.balance === "rate" ? 0.02 : -0.02) * grace) / rate()) *
    Math.max(0.3, 1 / (1 + effectiveTime / 90));
  if (!hit) change *= -c.accuracy / (1 - c.accuracy);
  const bounds = { rate: [0.75, 99], radius: [5, 75], lifetime: [0.1, 2] }[
    c.balance
  ];
  run.adaptive = clamp(run.adaptive * 2 ** change, ...bounds);
  if (!hit) {
    run.grace = decay;
    run.lastMiss = run.t;
  }
}
function spawn() {
  const c = run.c,
    r = Math.min(value("radius"), c.width / 2, c.height / 2);
  let x = c.width / 2,
    y = c.height / 2;
  for (let i = 0; i < 30; i++) {
    if (!c.center) {
      let left = r,
        right = c.width - r,
        top = r,
        bottom = c.height - r;
      if (c.maxDistance > 0) {
        left = Math.max(left, run.lastX - c.maxDistance);
        right = Math.min(right, run.lastX + c.maxDistance);
        top = Math.max(top, run.lastY - c.maxDistance);
        bottom = Math.min(bottom, run.lastY + c.maxDistance);
      }
      x = left + random() * (right - left);
      y = top + random() * (bottom - top);
    }
    if (
      c.maxDistance > 0 &&
      Math.hypot(x - run.lastX, y - run.lastY) > c.maxDistance
    )
      continue;
    const bad = run.targets.some((t) => {
      const d = Math.hypot(x - t.x, y - t.y),
        tr = radius(t),
        overlap = c.overlap ? r : 0;
      return (
        d < tr ||
        (c.constant
          ? d + overlap < r + tr
          : run.t - t.born < t.life / 2
            ? d + overlap < 2 * r - tr
            : d + overlap < tr)
      );
    });
    if (!bad) break;
  }
  let angle = random() * 2 * Math.PI;
  if (c.horizontal > 0.5) {
    const spread = (1 - c.horizontal) * 2 * Math.PI;
    angle = -spread / 2 + random() * spread;
  } else if (c.horizontal < 0.5) {
    const spread = c.horizontal * 2 * Math.PI;
    angle = Math.PI / 2 - spread / 2 + random() * spread;
  }
  if (random() < 0.5) angle += Math.PI;
  const speed = c.speed * (1 - c.variation + random() * c.variation * 2);
  run.targets.push({
    x,
    y,
    r,
    life: value("lifetime"),
    born: run.t,
    hp: c.hp,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  });
  run.lastX = x;
  run.lastY = y;
}
function remove(t) {
  const i = run.targets.indexOf(t);
  if (i >= 0) run.targets.splice(i, 1);
}
// Original Target.clickAway / TargetGhost: only final clicks leave ghosts
// Meta-stepper lifetime continues while gameplay is paused
function ghost(target, hit, x, y) {
  if (
    !run.c.ghosts ||
    !(hit ? appearance.showHitGhosts : appearance.showMissGhosts)
  )
    return;
  run.ghosts.push({
    x: target.x,
    y: target.y,
    r: radius(target),
    hit,
    shotX: x,
    shotY: y,
    until: performance.now() + (hit ? 500 : 1500),
  });
}
function effect(x, y, hit, text = "") {
  run.effects.push({ x, y, hit, text, at: run.t });
  if (run.effects.length > 60) run.effects.shift();
}
function loseLife() {
  adapt(false);
  if (run.c.balance === "none" && run.c.lives > 0) {
    run.lives--;
    if (run.lives <= 0) {
      finish("game over");
      return;
    }
  }
  if (run.c.clear) run.targets.length = 0;
}
function shoot(x, y, hover = false) {
  if (state !== "running") return;
  const c = run.c;
  if (x < 0 || y < 0 || x > c.width || y > c.height) return;
  const target = [...run.targets]
    .reverse()
    .find((t) => Math.hypot(x - t.x, y - t.y) <= radius(t));
  if (hover && !target) return;
  run.clicks++;
  if (target) {
    run.hits++;
    const ms = (run.t - target.born) * 1000;
    run.shots.push({ time: run.t, hit: true, ms, x, y });
    adapt(true);
    tone(true);
    if (c.showMs) effect(target.x, target.y, true, `${Math.round(ms)} ms`);
    if (target.hp > 0 && --target.hp === 0) {
      ghost(target, true, x, y);
      remove(target);
    }
  } else {
    run.shots.push({ time: run.t, hit: false, x, y });
    effect(x, y, false);
    tone(false);
    const empty = run.targets.length === 0;
    if (c.nearest && !empty) {
      const nearest = run.targets.reduce((a, b) =>
        Math.hypot(x - a.x, y - a.y) / Math.max(radius(a), 0.001) <
        Math.hypot(x - b.x, y - b.y) / Math.max(radius(b), 0.001)
          ? a
          : b,
      );
      if (nearest.hp > 0 && --nearest.hp === 0) {
        ghost(nearest, false, x, y);
        remove(nearest);
      }
      run.removed++;
      if (!c.clickLife && c.missLife) loseLife();
    }
    if (c.clickLife && !(c.constant && empty)) loseLife();
  }
  if (state === "running") draw();
}
function update(dt) {
  const c = run.c;
  run.t += dt;
  if (c.duration > 0 && run.t >= c.duration) {
    run.t = c.duration;
    finish("session complete");
    return;
  }
  for (const target of [...run.targets]) {
    if (!run.targets.includes(target)) continue;
    if (target.life > 0 && run.t - target.born >= target.life) {
      remove(target);
      run.expired++;
      effect(target.x, target.y, false);
      tone(false);
      if (c.missLife) loseLife();
      if (state !== "running") return;
      continue;
    }
    const r = radius(target),
      factor = 2 * (c.absolute ? 1 : r);
    target.x += target.vx * dt * factor;
    target.y += target.vy * dt * factor;
    if (target.x < r || target.x > c.width - r) {
      target.x = clamp(target.x, r, c.width - r);
      target.vx *= -1;
    }
    if (target.y < r || target.y > c.height - r) {
      target.y = clamp(target.y, r, c.height - r);
      target.vy *= -1;
    }
  }
  if (c.instant) {
    while (run.targets.length < c.group) spawn();
  } else {
    run.next -= dt;
    while (run.next <= 0) {
      for (let i = 0; i < c.group && run.targets.length < 1000; i++) spawn();
      run.next += (c.group / rate()) * (c.random ? 0.5 + random() : 1);
    }
  }
  if (c.hover) shoot(pointer.x, pointer.y, true);
  run.effects = run.effects.filter((e) => run.t - e.at < 0.6);
}
function draw() {
  const c = run.c;
  ctx.fillStyle = appearance.field;
  ctx.fillRect(0, 0, c.width, c.height);
  run.ghosts = run.ghosts.filter(
    (g) =>
      performance.now() < g.until &&
      (g.hit ? appearance.showHitGhosts : appearance.showMissGhosts),
  );
  if (state !== "paused") {
    for (const g of run.ghosts) {
      if (g.hit) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(g.shotX, g.shotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = g.hit ? 0.1 : 0.2;
      ctx.fillStyle = g.hit ? appearance.hitGhost : appearance.missGhost;
      const width = Math.min(appearance.borderWidth, g.r);
      ctx.beginPath();
      ctx.arc(g.x, g.y, Math.max(0, g.r + 1 - width / 2), 0, Math.PI * 2);
      ctx.fill();
      if (width > 0) {
        ctx.strokeStyle = g.hit ? "#ffffff" : "#ff0000";
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    for (const t of run.targets) {
      const r = radius(t);
      if (r <= 0) continue;
      ctx.globalAlpha =
        c.constant && c.fade && t.life > 0
          ? clamp(1 - (run.t - t.born) / t.life, 0, 1)
          : 1;
      ctx.fillStyle = appearance.target;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
      const width = Math.min(appearance.borderWidth, r);
      if (width > 0) {
        ctx.strokeStyle = appearance.border;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(
          t.x,
          t.y,
          Math.max(0, ((r - width / 2) * appearance.borderRadius) / 100),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    for (const e of run.effects) {
      ctx.globalAlpha = 1 - (run.t - e.at) / 0.6;
      ctx.fillStyle = ctx.strokeStyle = e.hit
        ? appearance.accent
        : appearance.text;
      if (e.text) {
        ctx.font = `${appearance.fontWeight} 13px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(e.text, e.x, e.y - 10);
      } else {
        ctx.beginPath();
        ctx.moveTo(e.x - 4, e.y - 4);
        ctx.lineTo(e.x + 4, e.y + 4);
        ctx.moveTo(e.x + 4, e.y - 4);
        ctx.lineTo(e.x - 4, e.y + 4);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  $("modeLabel").textContent = run.name.toLowerCase();
  $("time").textContent =
    `${(c.duration ? Math.max(0, c.duration - run.t) : run.t).toFixed(2)} s`;
  $("accuracy").textContent = run.clicks
    ? `${((100 * run.hits) / run.clicks).toFixed(1)}%`
    : "—";
  $("lives").textContent =
    c.balance !== "none" || !c.lives || (!c.missLife && !c.clickLife)
      ? `${run.hits} hits`
      : `${run.lives} lives`;
  $("rate").textContent =
    c.balance === "radius"
      ? `${value("radius").toFixed(1)} px`
      : c.balance === "lifetime"
        ? `${value("lifetime").toFixed(3)} s / target`
        : `${rate().toFixed(2)} targets / s`;
}
function tick(stamp) {
  if (state !== "running") return;
  const elapsed = Math.max(0, (stamp - lastStamp) / 1000);
  lastStamp = stamp;
  if (elapsed > 1) {
    pause();
    return;
  }
  let remaining = elapsed;
  while (remaining > 0 && state === "running") {
    const dt = Math.min(remaining, 1 / 120);
    update(dt);
    remaining -= dt;
  }
  if (state === "running") {
    draw();
    frame = requestAnimationFrame(tick);
  }
}
function pause() {
  if (!["running", "paused"].includes(state)) return;
  cancelAnimationFrame(frame);
  if (state === "running") {
    setScreen("paused");
    draw();
    $("resume").focus();
  } else {
    setScreen("running");
    lastStamp = performance.now();
    $("canvas").focus();
    frame = requestAnimationFrame(tick);
  }
}
function finish(title = "session ended") {
  if (!["running", "paused"].includes(state)) return;
  cancelAnimationFrame(frame);
  setScreen("results");
  $("resultTitle").textContent = title.toLowerCase();
  const hitShots = run.shots.filter((s) => s.hit),
    mean = hitShots.length
      ? hitShots.reduce((a, s) => a + s.ms, 0) / hitShots.length
      : 0;
  const survive = ["Challenge", "Old challenge", "Speed", "Sniping"].includes(
    run.name,
  );
  const score = survive ? run.t : run.hits;
  saved.best ||= {};
  saved.best[run.name] = Math.max(Number(saved.best[run.name]) || 0, score);
  save();
  const stats = [
    ["time", `${run.t.toFixed(2)} s`],
    ["hits", run.hits],
    [
      "accuracy",
      run.clicks ? `${((run.hits / run.clicks) * 100).toFixed(1)}%` : "—",
    ],
    ["average response", hitShots.length ? `${Math.round(mean)} ms` : "—"],
    ["misclicks", run.clicks - run.hits],
    ["expired targets", run.expired],
    ["hits / second", run.t ? (run.hits / run.t).toFixed(2) : "0.00"],
    ["clicks / minute", run.t ? Math.round((run.clicks / run.t) * 60) : 0],
    [
      "personal best",
      `${saved.best[run.name].toFixed(survive ? 2 : 0)} ${survive ? "s" : "hits"}`,
    ],
  ];
  $("resultStats").replaceChildren();
  for (const [label, v] of stats) {
    const item = document.createElement("div"),
      strong = document.createElement("strong"),
      span = document.createElement("span");
    strong.textContent = v;
    span.textContent = label;
    item.append(strong, span);
    $("resultStats").append(item);
  }
  drawGraph(hitShots);
  $("again").focus();
}
function drawGraph(hitShots) {
  const g = $("graph").getContext("2d");
  g.clearRect(0, 0, 600, 120);
  if (hitShots.length) {
    const max = hitShots.reduce((max, s) => Math.max(max, s.ms), 1);
    g.strokeStyle = appearance.target;
    g.fillStyle = appearance.accent;
    g.font = `${appearance.fontWeight} 12px sans-serif`;
    g.fillText(`${Math.round(max)} ms`, 0, 12);
    g.beginPath();
    hitShots.forEach((s, i) => {
      const x =
          hitShots.length === 1 ? 300 : 5 + (i / (hitShots.length - 1)) * 590,
        y = 115 - (s.ms / max) * 90;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    if (hitShots.length === 1) {
      g.fillRect(298, 23, 4, 4);
    }
  }
}
function position(e) {
  const r = $("canvas").getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * run.c.width;
  pointer.y = ((e.clientY - r.top) / r.height) * run.c.height;
}
$("canvas").addEventListener("pointermove", (e) => {
  if (run) position(e);
});
$("canvas").addEventListener("pointerleave", () => {
  pointer.x = pointer.y = -999;
});
$("canvas").addEventListener("pointerdown", (e) => {
  if (state === "running" && (e.button === 0 || e.button === 2)) {
    e.preventDefault();
    position(e);
    shoot(pointer.x, pointer.y);
  }
});
$("canvas").addEventListener("contextmenu", (e) => e.preventDefault());
$("settings").onsubmit = (e) => {
  e.preventDefault();
  start();
};
$("reset").onclick = () => {
  if (mode === "Custom") {
    delete saved.custom;
    save();
  }
  selectMode(mode);
};
$("trainingModes").ontoggle = () => {
  $("shareSettings").hidden = mode === "Challenge" && !$("trainingModes").open;
};
$("exportSettings").onclick = async () => {
  if (!$("settings").reportValidity()) return;
  const payload = { v: 1, mode, settings: readConfig() };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const code =
    "AB1." +
    btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const box = $("settingsCode");
  box.value = code;
  box.focus();
  box.select();
  try {
    if (navigator.clipboard?.writeText)
      await navigator.clipboard.writeText(code);
    else if (!document.execCommand("copy")) throw new Error("copy unavailable");
    $("settingsMessage").textContent = "code copied";
  } catch {
    $("settingsMessage").textContent = "select and copy code";
  }
};
$("importSettings").onclick = () => {
  const say = (message) => {
    $("settingsMessage").textContent = message;
  };
  try {
    const code = $("settingsCode").value.trim();
    if (code.length > 4096 || !code.startsWith("AB1."))
      throw new Error("unrecognized settings code");
    const encoded = code.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(encoded + "=".repeat((4 - (encoded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const payload = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (
      !payload ||
      payload.v !== 1 ||
      !Object.hasOwn(presets, payload.mode) ||
      !payload.settings ||
      typeof payload.settings !== "object" ||
      Array.isArray(payload.settings)
    )
      throw new Error("invalid settings data");
    const imported = { ...defaults, ...presets[payload.mode] };
    for (const [key, , min, max] of fieldSpecs) {
      if (!Object.hasOwn(payload.settings, key)) continue;
      const value = payload.settings[key];
      if (typeof defaults[key] === "boolean") {
        if (typeof value !== "boolean")
          throw new Error(`invalid ${key} setting`);
      } else if (Array.isArray(min)) {
        if (typeof value !== "string" || !min.includes(value))
          throw new Error(`invalid ${key} setting`);
      } else if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max
      ) {
        throw new Error(`invalid ${key} setting`);
      }
      imported[key] = value;
    }
    imported.radius = Math.min(
      imported.radius,
      imported.width / 2,
      imported.height / 2,
    );
    if (!imported.lifetime) imported.constant = true;
    if (payload.mode === "Custom") saved.custom = { ...imported };
    save();
    selectMode(payload.mode);
    for (const [key] of fieldSpecs) {
      const input = $(`setting-${key}`);
      if (!Object.hasOwn(payload.settings, key)) continue;
      if (input.type === "checkbox") input.checked = imported[key];
      else input.value = imported[key];
    }
    say(`${payload.mode.toLowerCase()} settings imported`);
  } catch (error) {
    say("invalid settings code");
  }
};
$("sound").onclick = () => {
  sound = !sound;
  saved.sound = sound;
  save();
  soundLabel();
};
$("pause").onclick = $("resume").onclick = pause;
$("retry").onclick = $("again").onclick = () => start(lastConfig, lastMode);
$("end").onclick = () => finish();
$("back").onclick = () => {
  setScreen("menu");
  selectMode(mode);
};
$("download").onclick = () => {
  const csv =
    "time_s,hit,response_ms,x,y\n" +
    run.shots
      .map(
        (s) =>
          `${s.time.toFixed(4)},${s.hit ? 1 : 0},${s.ms === undefined ? "" : s.ms.toFixed(2)},${s.x.toFixed(2)},${s.y.toFixed(2)}`,
      )
      .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    a = document.createElement("a");
  a.href = url;
  a.download = "aimbooster-results.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.addEventListener("keydown", (e) => {
  if ($("appearanceDialog").open) return;
  if (
    e.repeat ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
  )
    return;
  const k = e.key.toLowerCase();
  if (k === "m") {
    $("sound").click();
    return;
  }
  if (k === "r" && lastConfig && state !== "menu") {
    e.preventDefault();
    start(lastConfig, lastMode);
  }
  if (k === "p") {
    e.preventDefault();
    pause();
  }
  if (k === "escape") finish();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "running") pause();
});
window.addEventListener("blur", () => {
  if (state === "running") pause();
});
window.addEventListener("appearanceopen", () => {
  if (state === "running") pause();
});
window.addEventListener("appearancechange", () => {
  if (run && ["running", "paused"].includes(state)) draw();
  else if (run && state === "results")
    drawGraph(run.shots.filter((s) => s.hit));
});
soundLabel();
selectMode("Challenge");
setScreen("menu");
