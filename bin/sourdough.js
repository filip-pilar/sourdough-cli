#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const VERSION = "0.1.0";
const HOUR = 60 * 60 * 1000;
const STATE_DIR = path.join(os.homedir(), ".sourdough");
const STATE_FILE = path.join(STATE_DIR, "jar.json");

const NAMES = [
  "Brenda", "Sheila", "Doughy McDoughface", "Yeasty Boi", "Loafy",
  "Boris", "Hefe", "Sir Rises-a-Lot", "Crusty", "Bubbles",
  "Mother", "Sourpatch", "Levainie", "Glutenberg", "Fermenta",
];

const MOOD = {
  snoozing:    { label: "snoozing",                 fill: 0.18, hooch: false },
  warming:     { label: "warming up",               fill: 0.42, hooch: false },
  peak:        { label: "PEAK — bake now",          fill: 0.95, hooch: false },
  falling:     { label: "past peak, falling",       fill: 0.55, hooch: false },
  hungry:      { label: "hungry",                   fill: 0.12, hooch: false },
  starving:    { label: "starving",                 fill: 0.05, hooch: true  },
  introuble:   { label: "in trouble — hooch on top", fill: 0.02, hooch: true  },
  dead:        { label: "RIP",                       fill: 0.00, hooch: true  },
};

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function now() { return Date.now(); }

function hoursSince(ts) { return (now() - ts) / HOUR; }

function moodOf(state) {
  const h = hoursSince(state.lastFed);
  if (h > 72) return "dead";
  if (h > 48) return "introuble";
  if (h > 24) return "starving";
  if (h > 14) return "hungry";
  if (h > 8)  return "falling";
  if (h >= 4) return "peak";
  if (h >= 2) return "warming";
  return "snoozing";
}

function peakWindow(state) {
  return {
    start:  state.lastFed + 4 * HOUR,
    center: state.lastFed + 6 * HOUR,
    end:    state.lastFed + 8 * HOUR,
  };
}

function fmtETA(ts) {
  const ms = ts - now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / (60 * 1000));
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtAgo(ts) {
  const h = hoursSince(ts);
  if (h < 1) return `${Math.floor(h * 60)}m ago`;
  if (h < 48) return `${h.toFixed(1)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function jarArt(state) {
  const m = MOOD[moodOf(state)];
  const W = 10;
  const BUBBLE_ROWS = 4;
  const STARTER_ROWS = 2;
  const filledRows = Math.round(m.fill * BUBBLE_ROWS);
  const lines = [];
  lines.push("    ╭" + "─".repeat(W) + "╮");
  for (let r = 0; r < BUBBLE_ROWS; r++) {
    const fromBottom = BUBBLE_ROWS - r;
    let row = "";
    if (m.hooch && r === BUBBLE_ROWS - 1 && filledRows === 0) {
      row = "~".repeat(W);
    } else if (fromBottom > filledRows) {
      row = " ".repeat(W);
    } else {
      const density = (filledRows - fromBottom + 1) / Math.max(1, filledRows);
      for (let c = 0; c < W; c++) {
        row += Math.random() < density * 0.65 + 0.1 ? "°" : " ";
      }
    }
    lines.push("    │" + row + "│");
  }
  const mass = moodOf(state) === "dead" ? "▓" : "░";
  for (let r = 0; r < STARTER_ROWS; r++) {
    lines.push("    │" + mass.repeat(W) + "│");
  }
  lines.push("    ╰" + "─".repeat(W) + "╯");
  return lines.join("\n");
}

function loafArt(quality, shape) {
  const W = 14;
  const H = 5;
  const lines = [];
  if (shape === "batard") {
    lines.push("    ___________________");
    lines.push("   /                   \\");
  } else {
    lines.push("       _____________");
    lines.push("     /               \\");
  }
  for (let r = 0; r < H; r++) {
    let row = "    |";
    for (let c = 0; c < W; c++) {
      const isHole = Math.random() < (0.10 + quality * 0.40);
      row += isHole ? (Math.random() < 0.3 ? "O" : "o") : " ";
    }
    row += "|";
    lines.push(row);
  }
  lines.push("    \\_______________/");
  return lines.join("\n");
}

function gradeLoaf(q) {
  if (q > 0.85) return ["GORGEOUS", "open crumb, dramatic ear, deep golden crust"];
  if (q > 0.65) return ["great",    "even crumb, decent ear, golden"];
  if (q > 0.40) return ["solid",    "tighter crumb, modest ear"];
  if (q > 0.20) return ["dense",    "edible, but no ear to speak of"];
  return                 ["brick",    "compost it"];
}

function pickName(arg) {
  if (arg) return arg;
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

// ── commands ─────────────────────────────────────────────────────────────────

function cmd_init(args) {
  const name = pickName(args[0]);
  const t = now();
  const state = {
    name,
    born: t,
    lastFed: t,
    feedCount: 1,
    bakeCount: 0,
    history: [{ at: t, kind: "birth" }],
  };
  saveState(state);
  console.log(`✦ ${name} is born.\n`);
  console.log(jarArt(state));
  const peak = peakWindow(state);
  console.log(`\n  ${name} is snoozing. peak in ${fmtETA(peak.start)}.`);
}

function cmd_feed() {
  const state = loadState();
  if (!state) return die("no starter yet. run `sourdough init` first.");
  if (moodOf(state) === "dead") {
    return die(`${state.name} is dead. \`sourdough init\` to start over.`);
  }
  state.lastFed = now();
  state.feedCount++;
  state.history.push({ at: now(), kind: "feed" });
  saveState(state);
  const peak = peakWindow(state);
  console.log(`✦ fed ${state.name}.\n`);
  console.log(jarArt(state));
  console.log(`\n  next peak window: ${fmtETA(peak.start)} – ${fmtETA(peak.end)}.`);
}

function cmd_peek() {
  const state = loadState();
  if (!state) return die("no starter yet. run `sourdough init`.");
  const mood = moodOf(state);
  console.log(`✦ ${state.name} — ${MOOD[mood].label}\n`);
  console.log(jarArt(state));
  if (mood === "dead") {
    console.log(`\n  ${state.name} died. last fed ${fmtAgo(state.lastFed)}.`);
    console.log("  `sourdough init` to start a new one.");
    return;
  }
  const peak = peakWindow(state);
  if (mood === "peak") {
    console.log(`\n  bake window closes in ${fmtETA(peak.end)}.`);
  } else if (now() < peak.start) {
    console.log(`\n  peak in ${fmtETA(peak.start)}. last fed ${fmtAgo(state.lastFed)}.`);
  } else {
    console.log(`\n  feed soon. last fed ${fmtAgo(state.lastFed)}.`);
  }
}

function cmd_bake(args) {
  const state = loadState();
  if (!state) return die("no starter yet. run `sourdough init`.");
  const mood = moodOf(state);
  if (mood === "dead") return die(`${state.name} is dead. cannot bake.`);
  if (mood !== "peak") {
    return die(`${state.name} is ${MOOD[mood].label}. bake only at peak.`);
  }
  const shape = parseFlag(args, "--shape") || "boule";
  if (shape !== "boule" && shape !== "batard") {
    return die("--shape must be boule or batard.");
  }
  const peak = peakWindow(state);
  const distance = Math.abs(now() - peak.center) / HOUR; // 0..2
  const quality = Math.max(0, 1 - distance / 2);
  state.bakeCount++;
  state.history.push({ at: now(), kind: "bake", shape, quality });
  saveState(state);

  const [grade, notes] = gradeLoaf(quality);
  console.log(`✦ baking a ${shape} from ${state.name}...\n`);
  console.log(loafArt(quality, shape));
  console.log(`\n  ${grade} — ${notes}.`);
  console.log(`  oven spring: ${(quality * 4 + 0.5).toFixed(1)}cm`);
  console.log(`  bake #${state.bakeCount}.`);
}

function cmd_status() {
  const state = loadState();
  if (!state) { console.log("no-starter"); process.exit(2); }
  const mood = moodOf(state);
  const h = hoursSince(state.lastFed).toFixed(1);
  // machine-friendly one-liner: name mood hours_since_feed feeds bakes
  console.log(`${state.name} ${mood} ${h}h feeds=${state.feedCount} bakes=${state.bakeCount}`);
}

function cmd_log() {
  const state = loadState();
  if (!state) return die("no starter.");
  for (const entry of state.history.slice(-20)) {
    const when = new Date(entry.at).toISOString().replace("T", " ").slice(0, 16);
    let line = `${when}  ${entry.kind}`;
    if (entry.shape) line += ` (${entry.shape})`;
    if (typeof entry.quality === "number") line += ` quality=${entry.quality.toFixed(2)}`;
    console.log(line);
  }
}

function cmd_compost() {
  const state = loadState();
  if (!state) return die("nothing to compost.");
  fs.unlinkSync(STATE_FILE);
  console.log(`✦ ${state.name} returned to the soil.`);
}

function cmd_simulate(args) {
  const state = loadState();
  if (!state) return die("no starter to simulate. run `sourdough init`.");
  const h = parseFloat(parseFlag(args, "--hours"));
  if (!Number.isFinite(h)) return die("usage: sourdough simulate --hours N");
  state.lastFed -= h * HOUR;
  state.born -= h * HOUR;
  saveState(state);
  console.log(`✦ time-traveled ${h}h forward.\n`);
  cmd_peek();
}

function parseFlag(args, name) {
  const i = args.indexOf(name);
  if (i !== -1 && args[i + 1] !== undefined) return args[i + 1];
  const eq = args.find((a) => a.startsWith(name + "="));
  return eq ? eq.split("=").slice(1).join("=") : undefined;
}

function cmd_help() {
  console.log(`sourdough — a virtual starter for agents who care.

  sourdough init [name]                  birth a starter
  sourdough refeed                       feed it (alias: feed)
  sourdough peek                         check on it
  sourdough bake [--shape boule|batard]  only works at peak
  sourdough status                       one-liner for agents
  sourdough log                          recent activity
  sourdough compost                      end it (alias: kill)
  sourdough simulate --hours N           fast-forward time

state: ~/.sourdough/jar.json
forget to feed it for 72h and it dies. you have been warned.

  v${VERSION}`);
}

// ── dispatch ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);

switch (cmd) {
  case "init":     cmd_init(rest); break;
  case "feed":
  case "refeed":   cmd_feed(); break;
  case "peek":     cmd_peek(); break;
  case "bake":     cmd_bake(rest); break;
  case "status":   cmd_status(); break;
  case "log":      cmd_log(); break;
  case "kill":
  case "compost":  cmd_compost(); break;
  case "simulate": cmd_simulate(rest); break;
  case "-v":
  case "--version": console.log(VERSION); break;
  case undefined:
  case "help":
  case "-h":
  case "--help":   cmd_help(); break;
  default:
    console.error(`unknown command: ${cmd}\n`);
    cmd_help();
    process.exit(1);
}
