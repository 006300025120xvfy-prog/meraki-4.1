// DRAW LINE RUN [1/17] game-01-core.js — エンジン・素材読み込み・効果音・スキン
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// --- DRAW RUN - メインゲームスクリプト（モード追加版） ---

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 700;

const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

const engine = Engine.create();
const world = engine.world;

const normalGravityY = 0.7;
engine.world.gravity.y = normalGravityY;

// --- 画像の読み込み ---



// 素材パス：ルートでも map/skin/UI/sound/assets でも、バラバラ配置でも動く
const ASSET_SEARCH_DIRS = DrawRunCommon.ASSET_DIRS;
function assetDirCandidates(name) {
  // 渡されたパス・各フォルダ+ファイル名の順に探索。前回見つかったURLがあれば最優先（common.js）
  return DrawRunCommon.assetCandidates(name, ASSET_SEARCH_DIRS);
}
// ===== アセット解決キャッシュ =====
// ページ切替のたびに全フォルダを順番に探索していたのが遅延の原因。
// 一度見つけたURLを覚え、探索は数件ずつ並列で行う。
const __assetUrlCache = {};    // ファイル名 -> URL（見つからなければ null）
const __assetUrlPending = {};  // ファイル名 -> 探索中Promise
const __assetImgKeep = {};     // 読み込み済みImageを保持（ブラウザのキャッシュ落ち防止）
function __assetKey(name) { return String(name || "").split("/").pop(); }
function resolveAssetUrl(name) {
  const key = __assetKey(name);
  if (!key) return Promise.resolve(null);
  if (key in __assetUrlCache) return Promise.resolve(__assetUrlCache[key]);
  if (__assetUrlPending[key]) return __assetUrlPending[key];
  const list = assetDirCandidates(name);
  const BATCH = 6;
  const probeBatch = (start) => {
    if (start >= list.length) return Promise.resolve(null);
    return Promise.all(list.slice(start, start + BATCH).map((url) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res({ url, im });
      im.onerror = () => res(null);
      im.src = url;
    }))).then((rs) => rs.find((r) => r) || probeBatch(start + BATCH)); // 候補順の優先度を維持
  };
  __assetUrlPending[key] = probeBatch(0).then((hit) => {
    if (hit) DrawRunCommon.rememberAsset(name, hit.url);
    __assetUrlCache[key] = hit ? hit.url : null;
    if (hit) __assetImgKeep[key] = hit.im;
    delete __assetUrlPending[key];
    return __assetUrlCache[key];
  });
  return __assetUrlPending[key];
}
function resolveFirstAsset(names) {
  let p = Promise.resolve(null);
  (names || []).forEach((n) => { p = p.then((u) => u || resolveAssetUrl(n)); });
  return p;
}
// 解決済みなら同期でcbを呼び true を返す。未解決なら非同期で呼び false を返す。
function whenAssets(names, cb) {
  names = names || [];
  for (let i = 0; i < names.length; i++) {
    const k = __assetKey(names[i]);
    if (!(k in __assetUrlCache)) { resolveFirstAsset(names).then(cb); return false; }
    if (__assetUrlCache[k]) { cb(__assetUrlCache[k]); return true; }
  }
  cb(null);
  return true;
}
function loadAssetImage(img, name) {
  const list = assetDirCandidates(name);
  let i = 0;
  let cur = null;
  img.addEventListener("load", () => {
    if (cur && img.naturalWidth) DrawRunCommon.rememberAsset(name, cur);
  });
  const tryNext = () => {
    if (i >= list.length) return;
    const url = list[i++];
    cur = url;
    img.onload = null;
    img.onerror = function () { tryNext(); };
    img.src = url;
  };
  tryNext();
}
function loadAssetAudio(audio, name) {
  const list = assetDirCandidates(name);
  let i = 0;
  let cur = null;
  audio.addEventListener("loadedmetadata", () => {
    if (cur) DrawRunCommon.rememberAsset(name, cur);
  });
  const tryNext = () => {
    if (i >= list.length) return;
    const url = list[i++];
    cur = url;
    const onErr = function () {
      audio.removeEventListener("error", onErr);
      tryNext();
    };
    audio.addEventListener("error", onErr);
    try { audio.src = url; audio.load(); } catch (e) { tryNext(); }
  };
  tryNext();
}
// HTML用：複数パスを順に試す
function bindFlexibleAsset(el, name) {
  if (!el || !name) return;
  const list = assetDirCandidates(name);
  let i = 0;
  const tryNext = () => {
    if (i >= list.length) return;
    const url = list[i++];
    if (el.tagName === "AUDIO" || el.tagName === "VIDEO") {
      const onErr = function () {
        el.removeEventListener("error", onErr);
        tryNext();
      };
      el.addEventListener("error", onErr);
      el.src = url;
      try { el.load(); } catch (e) {}
    } else {
      el.onerror = function () { tryNext(); };
      el.onload = function () {
        if (el.naturalWidth) DrawRunCommon.rememberAsset(name, url);
      };
      el.src = url;
    }
  };
  tryNext();
}
window.bindFlexibleAsset = bindFlexibleAsset;
window.assetDirCandidates = assetDirCandidates;


const groundImage = new Image();
loadAssetImage(groundImage, "ground.jpg");

const bgAozora = new Image();
loadAssetImage(bgAozora, "sougen.png");

const bgYuugure = new Image();
loadAssetImage(bgYuugure, "yuugure.jpeg");

const bgYozora = new Image();
loadAssetImage(bgYozora, "yozora.png");

const bgCyber = new Image();
loadAssetImage(bgCyber, "syber.jpg");

const bgVolcano = new Image();
loadAssetImage(bgVolcano, "volcano.png");

const spikeImage = new Image();
loadAssetImage(spikeImage, "spike.png");

const ringImage = new Image();
loadAssetImage(ringImage, "ring.png");

const normalRingImage = new Image();
loadAssetImage(normalRingImage, "normal_ring.png");

const warpItemImage = new Image();
loadAssetImage(warpItemImage, "warp_item.png");

const wallImage = new Image();
loadAssetImage(wallImage, "wall.png");

// --- 音声ファイルの読み込みと音量設定 ---
const deathSound = (function(){ const a = new Audio(); loadAssetAudio(a, "death.mp3"); return a; })();
deathSound.volume = 0.03;
const playBGM = (function(){ const a = new Audio(); loadAssetAudio(a, "play.mp3"); return a; })();
playBGM.loop = true; 
playBGM.volume = 0.03;

// ===== 効果音（HOW TO画面の設定を全ページ共通で使用） =====
const SFX_BASE_VOLUME = {
  death: 0.03,
  countdown: 0.12,
  clear: 0.08,
  button: 0.12
};

const sfxCountdown = new Audio();
loadAssetAudio(sfxCountdown, "sfx_countdown.mp3");
sfxCountdown.preload = "auto";

const sfxClear = new Audio();
loadAssetAudio(sfxClear, "sfx_clear.mp3");
sfxClear.preload = "auto";

const sfxButton = new Audio();
loadAssetAudio(sfxButton, "sfx_button.mp3");
sfxButton.preload = "auto";

// ===== 効果音設定（ページを移動・ゲームオーバーしても維持） =====
function getSavedSeValue(key) {
  try {
    const localValue = localStorage.getItem(key);
    if (localValue !== null) return localValue;
  } catch (e) {}

  try {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null) return sessionValue;
  } catch (e) {}

  return null;
}

function saveSeValue(key, value) {
  const stringValue = String(value);

  try {
    localStorage.setItem(key, stringValue);
  } catch (e) {}

  try {
    sessionStorage.setItem(key, stringValue);
  } catch (e) {}
}

// 設定が一度も保存されていない場合だけ初期値を作る。
// 既存の設定値は絶対に上書きしない。
if (getSavedSeValue("drawRunSeEnabled") === null) {
  saveSeValue("drawRunSeEnabled", "true");
}
if (getSavedSeValue("drawRunSeVolume") === null) {
  saveSeValue("drawRunSeVolume", "28");
}

function isSeEnabled() {
  return getSavedSeValue("drawRunSeEnabled") !== "false";
}

function getSeMasterVolume() {
  const value = Number(getSavedSeValue("drawRunSeVolume"));
  if (!Number.isFinite(value)) return 0.28;
  return Math.max(0, Math.min(100, value)) / 100;
}

function playSfx(audio, baseVolume = 0.12) {
  try {
    if (!audio || !isSeEnabled()) return;

    let masterVolume = getSeMasterVolume();
    // 0〜1 で誤保存されていた場合
    if (masterVolume > 0 && masterVolume <= 0.01) {
      const raw = Number(getSavedSeValue("drawRunSeVolume"));
      if (Number.isFinite(raw) && raw > 0 && raw <= 1) masterVolume = raw;
    }
    if (masterVolume <= 0) return;

    // ボタン等は最大でも控えめに
    const vol = Math.max(0, Math.min(0.35, baseVolume * masterVolume));
    audio.volume = vol;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {}
}

function playCountdownSfx() {
  playSfx(sfxCountdown, SFX_BASE_VOLUME.countdown);
}

let __btnSfxAt = 0;
function playButtonSfx() {
  const now = Date.now();
  // se-common と共有クールダウン（二重再生防止）
  const shared = window.__drawRunSfxAt || 0;
  if (now - __btnSfxAt < 150 || now - shared < 150) return;
  __btnSfxAt = now;
  window.__drawRunSfxAt = now;
  playSfx(sfxButton, SFX_BASE_VOLUME.button);
}

function playClearSfx() {
  playSfx(sfxClear, SFX_BASE_VOLUME.clear);
}

function playDeathSfx() {
  playSfx(deathSound, SFX_BASE_VOLUME.death);
}

// スキン一覧・解放判定は common.js（custom.html と共通）
const characterList = DrawRunCommon.characterList;
const getBestScoreAttack = DrawRunCommon.getBestScoreAttack;
const isStageRangeFullyCleared = DrawRunCommon.isStageRangeFullyCleared;
const isCharacterUnlocked = DrawRunCommon.isCharacterUnlocked;

const playerImages = characterList.map((char) => {
  const img = new Image();
  loadAssetImage(img, char.src);
  return img;
});

let currentSkinIndex = 0;
try { currentSkinIndex = parseInt(localStorage.getItem('drawRunSkinIndex'), 10) || 0; } catch (e) {}
if (currentSkinIndex < 0 || currentSkinIndex >= characterList.length) {
  currentSkinIndex = 0;
}
if (!isCharacterUnlocked(currentSkinIndex)) {
  currentSkinIndex = 0;
  try { localStorage.setItem("drawRunSkinIndex", "0"); } catch (e) {}
}

