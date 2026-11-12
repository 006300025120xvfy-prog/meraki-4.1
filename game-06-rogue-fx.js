// DRAW LINE RUN [6/17] game-06-rogue-fx.js — レリック・カード定義、演出（揺れ・火花）、ギミック用の状態
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
let warpCount = 0;
let reviveCharges = 0;      // 一度復活
let reviveInvulnFrames = 0; // 復活直後の無敵
let freezeItemCount = 0;    // 旧:時間停止（非使用）
let freezeFrames = 0;
let freezeHoldX = 0;
let freezeHoldY = 0;
let invulnCharges = 0;      // 数秒無敵アイテム
let invulnActiveFrames = 0; // 無敵の残りフレーム
let lineExtendLevel = 0;    // 線の長さ強化 (0〜3)
const LINE_EXTEND_MAX = 3;
const ABILITIES_ENABLED = false; // 旧能力システムはオフ
const ROGUE_ENABLED = true; // A+B ローグ（レリック＋カード）

// --- レリック（ラン開始時・パッシブ）速乾インクなし ---
const RELIC_DEFS = {
  long_brush:  { icon: "✏️", name: "長い筆", desc: "線が長くなり、少し長く残る" },
  light_body:  { icon: "🪶", name: "軽身", desc: "落下の加速がゆるやかになる" },
  omen_eye:    { icon: "👁️", name: "予兆の瞳", desc: "レーザー・トゲの警告が長い" },
  lucky_ring:  { icon: "💫", name: "幸運の輪", desc: "リングが出現しやすい" },
  iron_boots:  { icon: "🥾", name: "鉄の靴", desc: "穴がやや狭くなる" },
  sprint:      { icon: "🪽", name: "疾走", desc: "移動速度が少し上がる" },
  insurance:   { icon: "❤️", name: "保険", desc: "致命傷を1回だけ耐える" }
};

// --- カード（途中3択・即時効果） ---
const CARD_DEFS = {
  warp:           { icon: "🌀", name: "ワープ×2", desc: "ワープを2個入手" },
  revive:         { icon: "💖", name: "一度復活", desc: "死んでも1回復活できる" },
  invuln:         { icon: "✨", name: "数秒無敵", desc: "無敵を1回分入手（ボタンで使用）" },
  emergency_line: { icon: "🖌️", name: "緊急の線", desc: "しばらく強化線が描ける" },
  clear_near:     { icon: "💥", name: "整地", desc: "近くの壁を消す" },
  seal_gimmick:   { icon: "🚫", name: "ギミック封じ", desc: "8秒間、レーザー・トゲ・風が出ない（出ているものも消える）" }
};

let currentRelic = null;
let rogueSelectMode = null; // "relic" | "card"
let insuranceAvailable = false;
let cardMilestonesDone = {};
const INVULN_DURATION_FRAMES = 180; // 約3秒

// ===== 演出強化 =====
let shakeX = 0, shakeY = 0, shakeMag = 0;
let stylePoints = 0, styleCombo = 0, styleComboTimer = 0, nearMissCooldown = 0;
let juiceParticles = [];
let smoothCameraX = 0;
let speedLines = 0;

function addShake(mag) { shakeMag = Math.max(shakeMag, mag); }
function spawnJuice(x, y, color, n) {
  for (let i = 0; i < (n || 8); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4;
    juiceParticles.push({ x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:20+Math.random()*14, max:34, size:2+Math.random()*3, color:color||"#fff" });
  }
}
function updateJuice() {
  if (shakeMag > 0.05) {
    shakeX = (Math.random()-0.5)*shakeMag*2;
    shakeY = (Math.random()-0.5)*shakeMag*2;
    shakeMag *= 0.82;
  } else { shakeX = shakeY = shakeMag = 0; }
  if (styleComboTimer > 0) styleComboTimer--; else styleCombo = 0;
  if (nearMissCooldown > 0) nearMissCooldown--;
  if (speedLines > 0) speedLines--;
  for (let i = juiceParticles.length-1; i >= 0; i--) {
    const p = juiceParticles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
    if (p.life <= 0) juiceParticles.splice(i, 1);
  }
}
function drawJuice() {
  try { drawRunFx(); } catch (e) {}
  for (const p of juiceParticles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX + (shakeX||0), p.y + (shakeY||0), p.size, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (speedLines > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255," + (0.07 + 0.1 * (speedLines/20)) + ")";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const yy = (i * 90 + (Date.now()/8) % 90) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(50 + (i%3)*18, yy+5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
// ===== プレイ画面の追加演出（軌跡・火花・マイルストーン・環境光） =====
let __juiceTick = 0, milestoneNext = 50, milestoneFx = null;
function spawnTrailSpark(x, y) {
  juiceParticles.push({ x: x, y: y, vx: -1 - Math.random(), vy: -0.6 - Math.random() * 1.2, life: 14, max: 14, size: 2 + Math.random() * 2, color: "#ffe566" });
}
function updateRunFx() {
  if (!player) return;
  __juiceTick++;
  if (__juiceTick % 3 === 0) {
    juiceParticles.push({ x: player.position.x - 8, y: player.position.y + 4 + (Math.random() - 0.5) * 8, vx: -0.7, vy: (Math.random() - 0.5) * 0.4, life: 16, max: 16, size: 3.5, color: "rgba(255,255,255,0.85)" });
  }
  if (score >= milestoneNext) {
    milestoneFx = { text: milestoneNext + "m", t: 0 };
    spawnJuice(player.position.x, player.position.y, "#ffe566", 16);
    addShake(2);
    milestoneNext += 50;
  }
  if (milestoneFx && ++milestoneFx.t > 70) milestoneFx = null;
}
function drawRunFx() {
  const W = canvas.width, H = canvas.height, now = Date.now();
  ctx.save();
  // 周辺を少し暗くして中央に視線を集める（加速中は強める）
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(20,40,90,0)");
  vg.addColorStop(1, "rgba(20,40,90," + (0.16 + Math.min(speedLines, 20) * 0.006) + ")");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // ふわふわ漂う光の粒
  for (let i = 0; i < 16; i++) {
    const x = (((i * 97 - cameraX * (0.12 + (i % 3) * 0.08)) % W) + W) % W;
    const y = (i * 53 + Math.sin(now / 900 + i) * 14 + H) % H;
    ctx.globalAlpha = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(now / 500 + i * 2));
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // マイルストーン表示
  if (milestoneFx) {
    const t = milestoneFx.t, pop = t < 12 ? 0.4 + 0.8 * (t / 12) : 1.2 - 0.2 * Math.min(1, (t - 12) / 8);
    ctx.globalAlpha = t > 50 ? Math.max(0, 1 - (t - 50) / 20) : 1;
    ctx.translate(W / 2, 170 - Math.min(t, 40) * 0.3); ctx.scale(pop, pop);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "900 46px 'Helvetica Neue', Arial, sans-serif";
    ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = "#1a4a8a";
    ctx.strokeText(milestoneFx.text, 0, 0);
    ctx.fillStyle = "#ffe566"; ctx.fillText(milestoneFx.text, 0, 0);
  }
  ctx.restore();
}
function checkNearMissJuice() {
  if (nearMissCooldown > 0 || !player) return;
  const px = player.position.x, py = player.position.y;
  let hit = false;
  for (const w of walls) {
    const dx = px - w.position.x, dy = py - w.position.y;
    const d = Math.sqrt(dx*dx+dy*dy);
    if (d > 30 && d < 58) { hit = true; break; }
  }
  if (!hit) {
    for (const s of spikes) {
      const dx = px - s.position.x, dy = py - s.position.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d > 22 && d < 50) { hit = true; break; }
    }
  }
  if (hit) {
    nearMissCooldown = 45;
    styleCombo = Math.min(20, styleCombo + 1);
    styleComboTimer = 120;
    stylePoints += 10 + styleCombo * 2;
    spawnJuice(px, py, "#ffe566", 6);
    addShake(2.2);
  }
}
const FREEZE_DURATION_FRAMES = 120; // 約2秒
let abilityChoiceOpen = false;
let abilityChoiceTriggeredStart = false;
let abilityMilestonesDone = {};
let isReviving = false;
let reviveHoldX = 200;
let isCountingDown = false;
let countdownTimerId = null;

let windState = "idle"; 
let windTimer = 0;
let windDir = -1; 
const WIND_WARNING_FRAMES = 70;
const WIND_ACTIVE_FRAMES = 100;
const WIND_COOLDOWN_MIN = 260;
const WIND_COOLDOWN_MAX = 400;
let windCooldownTarget = 300;
const WARP_MAX = 3;
const WARP_DISTANCE = 450; 

let lineBoostFrames = 0;
const LINE_BOOST_DURATION = 300; 
const LINE_BOOST_MAX_LEN = baseHoleSize * 2.2;
const LINE_BOOST_THICKNESS = 32;
const LINE_NORMAL_THICKNESS = 26;
const LINE_BOOST_LIFETIME = 2200; // 強化線が残る時間
const LINE_NORMAL_LIFETIME = 1100;  // 通常線が残る時間

let spikeState = "idle"; 
let spikeTimer = 0;
let pendingSpikeX = 0; 

let groundSpikeState = "idle"; 
let groundSpikeTimer = 0;
let groundSpikeX = 0;
let groundSpikeHeight = 0; 
const GS_WARNING_FRAMES = 50;  
const GS_POP_FRAMES = 40;
const GS_COOLDOWN_MIN = 280;
const GS_COOLDOWN_MAX = 420;
let gsCooldownTarget = 320;
let groundSpikeBody = null;

let slowMoFactor = 1;
const SPIKE_WARNING_FRAMES = 60;  
const SPIKE_FALL_FRAMES = 90;
const SPIKE_COOLDOWN_MIN = 240;
const SPIKE_COOLDOWN_MAX = 420;
let spikeCooldownTarget = 300;

let currentX = 0;
const segmentWidth = 400; 
let lastObstacleX = 0;

