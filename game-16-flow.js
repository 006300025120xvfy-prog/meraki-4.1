// DRAW LINE RUN [16/17] game-16-flow.js — カウントダウン・開始・復活シーケンス
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function clearFadeOverlay() {
  const fade = document.getElementById("fade-overlay");
  if (!fade) return;
  fade.classList.remove("circle-expand", "fade-in");
  fade.style.clipPath = "circle(0% at 50% 50%)";
}

function hideCountdownUI() {
  const countdownDisplay = document.getElementById("countdown-display");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownRing = document.getElementById("countdown-ring");
  if (countdownDisplay) countdownDisplay.classList.remove("visible");
  if (countdownOverlay) {
    countdownOverlay.classList.remove("visible");
    countdownOverlay.style.display = "none";
    countdownOverlay.style.opacity = "0";
    countdownOverlay.style.background = "";
  }
  if (countdownRing) countdownRing.classList.remove("visible");
}

/** 3→2→1→GO を確実に表示してから onComplete */
function runNumberCountdown(options) {
  const opts = options || {};
  const onComplete = typeof opts.onComplete === "function" ? opts.onComplete : function () {};
  const subForGo = opts.goSub || "GO!";
  const tips = opts.tips || { 3: "READY", 2: "SET", 1: "ALMOST" };
  const lightOverlay = !!opts.lightOverlay;

  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
  isCountingDown = true;
  // カウント中は進行させない
  if (!opts.keepGameStarted) {
    gameStarted = false;
  }

  clearFadeOverlay();

  const countdownDisplay = document.getElementById("countdown-display");
  const countdownNumber = document.getElementById("countdown-number");
  const countdownSub = document.getElementById("countdown-sub");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownRing = document.getElementById("countdown-ring");

  function pulseRing() {
    if (!countdownRing) return;
    countdownRing.classList.remove("visible");
    void countdownRing.offsetWidth;
    countdownRing.classList.add("visible");
  }

  function showCount(value) {
    if (!countdownNumber) return;
    // アニメ再発火
    countdownNumber.style.animation = "none";
    countdownNumber.className = "";
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = "";

    if (value === "GO!") {
      countdownNumber.textContent = "GO!";
      countdownNumber.classList.add("cd-go");
      if (countdownSub) countdownSub.textContent = subForGo;
    } else {
      countdownNumber.textContent = String(value);
      countdownNumber.classList.add("cd-" + value);
      if (countdownSub) countdownSub.textContent = tips[value] || "GET READY";
    }
    if (value === 3) {
      try { playCountdownSfx(); } catch (e) {}
    }
    pulseRing();
  }

  if (!countdownDisplay || !countdownNumber) {
    isCountingDown = false;
    onComplete();
    return;
  }

  if (countdownOverlay) {
    countdownOverlay.style.display = "block";
    countdownOverlay.style.opacity = "1";
    if (lightOverlay) {
      // 復活時：ゲーム画面が透けて見える
      countdownOverlay.style.background = "rgba(8, 12, 28, 0.35)";
    } else {
      countdownOverlay.style.background = "";
    }
    countdownOverlay.classList.add("visible");
  }
  countdownDisplay.classList.add("visible");

  // 3 を先に描画してから1秒待つ（setIntervalだと最初の1秒で3が見えない端末がある）
  showCount(3);
  let step = 0;
  const steps = [2, 1, "GO!", null];
  countdownTimerId = setInterval(() => {
    const v = steps[step++];
    if (v === null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
      hideCountdownUI();
      isCountingDown = false;
      onComplete();
    } else {
      showCount(v);
    }
  }, 1000);
}

function beginPlayWithRogue() {
  hideResultMenu();
  hideSurveyNudge();
  const modeSelectScreen = document.getElementById("mode-select-screen");
  const subSelectScreen = document.getElementById("sub-select-screen");
  if (modeSelectScreen) modeSelectScreen.classList.remove("visible");
  if (subSelectScreen) subSelectScreen.classList.remove("visible");
  clearFadeOverlay();
  resetWorldForMode();
  try { recordStat("play"); } catch (e) {}
  if (ROGUE_ENABLED) {
    openRogueSelect("relic");
    return;
  }
  startCountdownAfterSetup();
}

function startCountdownAndGame() {
  if (abilityChoiceOpen) return;
  hideResultMenu();
  hideSurveyNudge();
  const modeSelectScreen = document.getElementById("mode-select-screen");
  const subSelectScreen = document.getElementById("sub-select-screen");
  if (modeSelectScreen) modeSelectScreen.classList.remove("visible");
  if (subSelectScreen) subSelectScreen.classList.remove("visible");
  clearFadeOverlay();
  resetWorldForMode();
  try { recordStat("play"); } catch (e) {}
  startCountdownAfterSetup();
}

function startCountdownAfterSetup() {

  const modeLabel = (currentConfig && currentConfig.name) ? currentConfig.name : "GET READY";

  runNumberCountdown({
    goSub: modeLabel,
    onComplete: () => {
      try {
        // 地面付近の安定位置から開始（ワープ・落下を防ぐ）
        Body.setPosition(player, { x: 200, y: canvas.height - 80 });
        Body.setVelocity(player, { x: (currentConfig && currentConfig.baseSpeed) || 4, y: 0 });
        Body.setAngle(player, 0);
      } catch (e) {}
      cameraX = 200 - canvas.width * 0.1;
      stoppedTime = 0;
      airborneFrames = 0;
      upperZoneFrames = 0;
      freezeFrames = 0;
      isCountingDown = false;
      gameStarted = true;
      try {
        playBGM.currentTime = 0;
        playBGM.play().catch(() => {});
      } catch (e) {}
    }
  });
}

function startReviveSequence() {
  if (isReviving || gameOver || gameCleared) return;
  isReviving = true;
  gameStarted = true;
  reviveHoldX = player.position.x;
  const centerY = canvas.height / 2;

  try { releaseLines(); } catch (e) {}
  try {
    Body.setPosition(player, { x: reviveHoldX, y: centerY });
    Body.setVelocity(player, { x: 0, y: 0 });
    Body.setAngularVelocity(player, 0);
  } catch (e) {}
  cameraX = reviveHoldX - canvas.width * 0.1;
  stoppedTime = 0;
  airborneFrames = 0;
  upperZoneFrames = 0;
  freezeFrames = 0;
  reviveInvulnFrames = 0;

  runNumberCountdown({
    goSub: "復活！",
    tips: { 3: "REVIVE", 2: "READY", 1: "SET" },
    lightOverlay: true,
    keepGameStarted: true,
    onComplete: () => {
      try {
        Body.setPosition(player, { x: reviveHoldX, y: centerY });
        Body.setVelocity(player, {
          x: (currentConfig && currentConfig.baseSpeed) || 4,
          y: 0
        });
        Body.setAngularVelocity(player, 0);
      } catch (e) {}
      cameraX = reviveHoldX - canvas.width * 0.1;
      stoppedTime = 0;
      airborneFrames = 0;
      upperZoneFrames = 0;
      isReviving = false;
      gameStarted = true;
      // 復活直後は短時間無敵（連続死亡防止）
      reviveInvulnFrames = 90;
    }
  });
}

