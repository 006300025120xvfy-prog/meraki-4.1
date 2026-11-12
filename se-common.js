// DRAW LINE RUN 共通ボタンSE
// 音量の計算式は game.js の playSfx と同じ：基準音量(0.12) × マスター音量、上限0.35
(function () {
  "use strict";
  if (window.DrawRunSE) return;

  var BASE_VOLUME = 0.12;
  var MAX_VOLUME = 0.35;
  var COOLDOWN_MS = 150;
  var NAV_DELAY_MS = 250;
  var DIRS = ["", "sound/", "audio/", "assets/", "assets/sound/", "UI/", "ui/", "img/", "images/", "map/", "skin/"];

  function getSaved(key) {
    try { var v = localStorage.getItem(key); if (v !== null) return v; } catch (e) {}
    try { var s = sessionStorage.getItem(key); if (s !== null) return s; } catch (e) {}
    return null;
  }
  function isEnabled() { return getSaved("drawRunSeEnabled") !== "false"; }
  function masterVolume() {
    var raw = Number(getSaved("drawRunSeVolume"));
    if (getSaved("drawRunSeVolume") === null || !isFinite(raw)) return 0.28;
    var v = Math.max(0, Math.min(100, raw)) / 100;
    if (v > 0 && v <= 0.01 && raw > 0 && raw <= 1) v = raw; // 0〜1で保存されていた場合
    return v;
  }

  var audio = new Audio();
  audio.preload = "auto";
  (function load() {
    var i = 0;
    function next() {
      if (i >= DIRS.length) return;
      var onErr = function () { audio.removeEventListener("error", onErr); next(); };
      audio.addEventListener("error", onErr);
      audio.src = DIRS[i++] + "sfx_button.mp3";
      try { audio.load(); } catch (e) {}
    }
    next();
  })();

  function playButton() {
    try {
      var now = Date.now();
      if (now - (window.__drawRunSfxAt || 0) < COOLDOWN_MS) return; // game.js・他ページと共有
      window.__drawRunSfxAt = now;
      if (!isEnabled()) return;
      var m = masterVolume();
      if (m <= 0) return;
      audio.volume = Math.max(0, Math.min(MAX_VOLUME, BASE_VOLUME * m));
      audio.currentTime = 0;
      audio.play().catch(function () {});
    } catch (e) {}
  }

  window.DrawRunSE = { playButton: playButton, getVolume: masterVolume, isEnabled: isEnabled };

  // リンク・ボタンのクリックで鳴らす（画面遷移するリンクは音が切れないよう少し待つ）
  document.addEventListener("click", function (e) {
    if (document.getElementById("gameCanvas")) return; // ゲーム本体ページは index.html / game.js 側で処理
    var el = e.target && e.target.closest ? e.target.closest("a, button") : null;
    if (!el || el.disabled) return;
    playButton();
    var href = el.tagName === "A" ? el.getAttribute("href") : null;
    if (href && href.charAt(0) !== "#" && el.target !== "_blank" && !e.defaultPrevented &&
        !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      var url = el.href;
      setTimeout(function () { window.location.href = url; }, NAV_DELAY_MS);
    }
  }, true);
})();
