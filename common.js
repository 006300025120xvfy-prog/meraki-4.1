// DRAW LINE RUN - 共通スクリプト（全ページで game.js より先に読み込む）
// ・画面スケール調整
// ・素材パス探索（見つかったURLを記憶して2回目以降の404探索を省略）
// ・スキン一覧と解放判定（custom.html / game.js で共通）
(function () {
  "use strict";

  // ===== 素材パス =====
  var ASSET_DIRS = [
    "", "map/", "map/landmark/", "landmark/", "landmarks/", "skin/", "UI/", "ui/",
    "sound/", "assets/", "assets/map/", "assets/landmark/", "assets/skin/",
    "assets/UI/", "assets/ui/", "assets/sound/", "img/", "images/", "audio/"
  ];
  var CACHE_KEY = "drawRunAssetUrlMap";
  var urlMap = {};
  try { urlMap = JSON.parse(sessionStorage.getItem(CACHE_KEY)) || {}; } catch (e) {}

  function baseName(name) { return String(name || "").split("/").pop(); }

  function rememberAsset(name, url) {
    var base = baseName(name);
    if (!base || !url || urlMap[base] === url) return;
    urlMap[base] = url;
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(urlMap)); } catch (e) {}
  }

  // 前回見つかったURLを先頭にして、残りの候補を従来どおりの順で並べる
  function assetCandidates(name, extraDirs) {
    var n = String(name || "").replace(/^\.?\//, "");
    var base = baseName(n);
    var seen = {}, list = [];
    function add(p) { if (p && !seen[p]) { seen[p] = true; list.push(p); } }
    if (urlMap[base]) add(urlMap[base]);
    add(n);
    (extraDirs || ASSET_DIRS).forEach(function (d) { add(d + base); });
    return list;
  }

  // HTMLの<img data-asset>用。onLoaded(el) は読み込み成功時に呼ばれる
  function bindAsset(el, name, onLoaded, onAllFailed) {
    if (!el || !name) return;
    var list = assetCandidates(name);
    var i = 0;
    function tryNext() {
      if (i >= list.length) { if (onAllFailed) onAllFailed(el); return; }
      var url = list[i++];
      el.onerror = tryNext;
      el.onload = function () {
        if (!el.naturalWidth) return;
        rememberAsset(name, url);
        if (onLoaded) onLoaded(el);
      };
      el.src = url;
    }
    tryNext();
  }

  // ===== 画面スケール（400x700 を画面に収める） =====
  function adjustScale(containerId) {
    var c = document.getElementById(containerId || "game-container");
    if (!c) return;
    var scale = Math.min(window.innerWidth / 400, window.innerHeight / 700);
    if (scale > 1) scale = 1;
    c.style.left = "50%";
    c.style.top = "50%";
    c.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
  }
  function initScale(containerId) {
    var run = function () { adjustScale(containerId); };
    window.addEventListener("load", run);
    window.addEventListener("resize", run);
  }

  // ===== 記録の読み出し =====
  function getBestScoreAttack() {
    var best = 0;
    try {
      (JSON.parse(localStorage.getItem("drawRunScores")) || []).forEach(function (s) {
        var v = typeof s === "object" && s ? Number(s.score) : Number(s);
        if (isFinite(v) && v > best) best = v;
      });
    } catch (e) {}
    try {
      var last = JSON.parse(localStorage.getItem("drawRunLastScore"));
      if (last && isFinite(Number(last.score)) && Number(last.score) > best) best = Number(last.score);
    } catch (e) {}
    try {
      var hi = Number(localStorage.getItem("drawRunBestScore"));
      if (isFinite(hi) && hi > best) best = hi;
    } catch (e) {}
    return best;
  }

  function isStageRangeFullyCleared(maxMain) {
    var cleared = {};
    try { cleared = JSON.parse(localStorage.getItem("drawRunStageClears")) || {}; } catch (e) {}
    for (var m = 1; m <= maxMain; m++) {
      for (var s = 1; s <= 3; s++) {
        if (!cleared["stage" + m + "-" + s]) return false;
      }
    }
    return true;
  }

  // ===== スキン =====
  var characterList = [
    { src: "player.png",  name: "クロカゲ", unlock: null },
    { src: "player2.png", name: "ハムゾウ", unlock: null },
    { src: "player3.png", name: "マフィン", unlock: null },
    { src: "player4.png", name: "ロビン・ドングリ", unlock: null },
    { src: "player5.png", name: "サー・ロデリック", unlock: null },
    { src: "player6.png", name: "ダスティ・アイアンヒゲ", unlock: null },
    { src: "player7.png", name: "キャプテン・バーナビー", unlock: "score200", unlockText: "スコアアタックで200m達成" },
    { src: "player8.png", name: "ネオン・サイファー", unlock: "stage4all", unlockText: "STAGE1〜4をすべてクリア" }
  ];

  function isCharacterUnlocked(index) {
    var c = characterList[index];
    if (!c || !c.unlock) return true;
    if (c.unlock === "score200") return getBestScoreAttack() >= 200;
    if (c.unlock === "stage4all") return isStageRangeFullyCleared(4);
    return true;
  }

  window.DrawRunCommon = {
    ASSET_DIRS: ASSET_DIRS,
    assetCandidates: assetCandidates,
    rememberAsset: rememberAsset,
    bindAsset: bindAsset,
    adjustScale: adjustScale,
    initScale: initScale,
    getBestScoreAttack: getBestScoreAttack,
    isStageRangeFullyCleared: isStageRangeFullyCleared,
    characterList: characterList,
    isCharacterUnlocked: isCharacterUnlocked
  };
})();
