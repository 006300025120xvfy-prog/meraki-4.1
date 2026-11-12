// DRAW LINE RUN [5/17] game-05-save.js — プレイ統計・スコア／クリア保存
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// ===== プレイ統計（ローカル） =====
function loadPlayStats() {
  try {
    const s = JSON.parse(localStorage.getItem("drawRunPlayStats"));
    if (s && typeof s === "object") {
      return {
        totalDistance: Number(s.totalDistance) || 0,
        clears: Number(s.clears) || 0,
        deaths: Number(s.deaths) || 0,
        playCount: Number(s.playCount) || 0,
        abilities: s.abilities || { warp: 0, revive: 0, freeze: 0 },
        bestScore: Number(s.bestScore) || 0
      };
    }
  } catch (e) {}
  return { totalDistance: 0, clears: 0, deaths: 0, playCount: 0, abilities: { warp: 0, revive: 0, freeze: 0 }, bestScore: 0 };
}
function savePlayStats(s) {
  try { localStorage.setItem("drawRunPlayStats", JSON.stringify(s)); } catch (e) {}
}
function recordStat(type, value) {
  const s = loadPlayStats();
  if (type === "distance") s.totalDistance += Math.max(0, Number(value) || 0);
  else if (type === "clear") s.clears += 1;
  else if (type === "death") s.deaths += 1;
  else if (type === "play") s.playCount += 1;
  else if (type === "ability") {
    if (!s.abilities) s.abilities = { warp: 0, revive: 0, freeze: 0 };
    s.abilities[value] = (s.abilities[value] || 0) + 1;
  } else if (type === "best") {
    if (Number(value) > s.bestScore) s.bestScore = Number(value);
  }
  savePlayStats(s);
}

function saveScore(newScore) {
  if (currentMode !== "score") return;

  const now = new Date();
  const dateString = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 保存失敗（容量超過・プライベートモード・データ破損）でもゲームオーバー処理を止めない
  try {
    let scores = [];
    try { scores = JSON.parse(localStorage.getItem('drawRunScores')) || []; } catch (e) {}
    if (!Array.isArray(scores)) scores = [];
    scores.push({ score: newScore, date: dateString });
    scores.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    scores = scores.slice(0, 10); // ランキング画面は10位まで表示
    localStorage.setItem('drawRunScores', JSON.stringify(scores));

    const lastRecord = { score: newScore, date: dateString };
    localStorage.setItem('drawRunLastScore', JSON.stringify(lastRecord));
  } catch (e) {}

  try {
    const prevBest = Number(localStorage.getItem("drawRunBestScore")) || 0;
    if (newScore > prevBest) {
      localStorage.setItem("drawRunBestScore", String(newScore));
    }
  } catch (e) {}
}

function saveStageClear(modeKey) {
  try {
    let cleared = {};
    try { cleared = JSON.parse(localStorage.getItem('drawRunStageClears')) || {}; } catch (e) {}
    cleared[modeKey] = true;
    localStorage.setItem('drawRunStageClears', JSON.stringify(cleared));
  } catch (e) {}
}

const grounds = [];
const walls = [];
const rings = [];   
const spikes = [];  
const warpPickups = []; 
const fakeFloors = []; 
const blinkPlatforms = []; 
