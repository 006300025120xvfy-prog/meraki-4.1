// DRAW LINE RUN [3/17] game-03-state.js — ゲーム状態・プレイヤー・描線の上限
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
let currentMode = null;          
let currentConfig = null;        
let gameStarted = false;
let gameOver = false;
let gameCleared = false;

const player = Bodies.circle(200, canvas.height / 2, 20, {
  friction: 0.1,
  frictionStatic: 0.2,
  restitution: 0,
  inertia: Infinity
});
World.add(world, player);

let score = 0; 
let cameraX = 0;

let playerSpeed = 4;
let stoppedTime = 0;

const baseHoleSize = 400;
const maxDrawLength = baseHoleSize * 1.5;
function getEffectiveMaxDrawLength() {
  const lv = Math.max(0, Math.min(LINE_EXTEND_MAX, lineExtendLevel || 0));
  let len = maxDrawLength * (1 + 0.35 * lv);
  if (currentRelic === "long_brush") len *= 1.45;
  return len;
}
function getEffectiveMaxDrawTime() {
  const lv = Math.max(0, Math.min(LINE_EXTEND_MAX, lineExtendLevel || 0));
  let t = maxDrawTime * (1 + 0.25 * lv);
  if (currentRelic === "long_brush") t *= 1.3;
  return t;
}
function hasRelic(id) {
  return ROGUE_ENABLED && currentRelic === id;
}

const cooldownDuration = 160; 
let lastReleaseTime = 0;      

let airborneFrames = 0;
let isTouchingGroundOrLine = false;
let upperZoneFrames = 0;

let activeGimmick = null;
let gimmickSuppressFrames = 0; // ギミック封印の残りフレーム（0なら通常）
const SEAL_DURATION_FRAMES = 480; // 封印の長さ（約8秒）
let sealFxStart = 0;              // 封印発動演出の開始時刻
let sealFxPending = false;        // 次の描画で演出を開始する

function tryStartGimmick(name) {
  if (gimmickSuppressFrames > 0) return false; // ギミック封印中は新しいギミックを始めない
  if (activeGimmick !== null) return false;
  activeGimmick = name;
  return true;
}
function endGimmick(name) {
  if (activeGimmick === name) activeGimmick = null;
}

