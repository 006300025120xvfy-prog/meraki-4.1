// DRAW LINE RUN [9/17] game-09-ui.js — ステージ移動・アンケート・リザルトメニュー・タッチ入力
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function getStageDifficultyStars(modeKey) {
  const c = MODE_CONFIG[modeKey];
  if (!c) return 1;
  if (modeKey === "score") return 5;
  // 1〜5
  const v = (c.mainStage - 1) + Math.ceil(c.subStage * 0.7);
  return Math.max(1, Math.min(5, v));
}
function getNextStageKey(modeKey) {
  const idx = STAGE_ORDER.indexOf(modeKey);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
function getPrevStageKey(modeKey) {
  const idx = STAGE_ORDER.indexOf(modeKey);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}
function goToStageKey(modeKey) {
  // will call beginPlay below
  if (!modeKey || !MODE_CONFIG[modeKey]) return;
  if (typeof isStageUnlocked === "function" && !isStageUnlocked(modeKey)) return;
  currentMode = modeKey;
  currentConfig = MODE_CONFIG[modeKey];
  gameOver = false;
  gameCleared = false;
  isReviving = false;
  abilityChoiceOpen = false;
  freezeFrames = 0;
  gameStarted = false;
  hideCountdownUI();
  clearFadeOverlay();
  startCountdownAndGame();
}



const SURVEY_URL = "https://docs.google.com/forms/d/e/1FAIpQLSesk-IyggxuCbUH_54STbgYozLTFdK__kJhHk88U_pZ952nPw/viewform?usp=publish-editor";
function showSurveyNudge() {
  let el = document.getElementById("survey-nudge");
  if (!el) {
    el = document.createElement("div");
    el.id = "survey-nudge";
    el.innerHTML =
      '<a class="survey-nudge-link" href="' + SURVEY_URL + '" target="_blank" rel="noopener noreferrer">' +
        '<img class="survey-nudge-img" alt="アンケート回答はこちら">' +
        '<span class="survey-nudge-text">📝 アンケート回答はこちら</span>' +
      '</a>';
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(el);
    const img = el.querySelector(".survey-nudge-img");
    if (img) {
      const names = ["btn-survey.png", "survey.png", "btn_survey.png"];
      whenAssets(names, (url) => {
        if (url) {
          img.src = url;
          img.style.display = "block";
          el.classList.add("has-img");
        } else {
          img.style.display = "none";
        }
      });
    }
  }
  el.classList.add("visible");
}
function hideSurveyNudge() {
  const el = document.getElementById("survey-nudge");
  if (el) el.classList.remove("visible");
}

function hideResultMenu() {
  const menu = document.getElementById("result-menu");
  if (menu) menu.classList.remove("visible");
}
function showResultMenu() {
  const menu = document.getElementById("result-menu");
  if (!menu) return;
  const nextBtn = menu.querySelector('[data-action="next"]');
  const isStage = currentMode && currentMode.startsWith("stage");
  if (nextBtn) {
    const nextKey = isStage ? getNextStageKey(currentMode) : null;
    const show = !!(nextKey && isStageUnlocked(nextKey));
    nextBtn.classList.toggle("hidden", !show);
  }
  const prevBtn = menu.querySelector('[data-action="prev"]');
  if (prevBtn) prevBtn.classList.add("hidden");
  menu.classList.add("visible");
  // 結果ボタン画像
  try {
    menu.querySelectorAll(".result-btn img[data-asset]").forEach((img) => {
      const name = img.getAttribute("data-asset");
      if (!name || img.dataset.boundAsset) return;
      img.dataset.boundAsset = "1";
      const list = assetDirCandidates(name);
      let i = 0;
      const tryNext = () => {
        if (i >= list.length) return;
        const url = list[i++];
        const probe = new Image();
        probe.onload = () => {
          img.src = url;
          if (img.parentElement) img.parentElement.classList.add("has-img");
        };
        probe.onerror = tryNext;
        probe.src = url;
      };
      tryNext();
    });
  } catch (e) {}
}
function initResultMenuUI() {
  const menu = document.getElementById("result-menu");
  if (!menu || menu.dataset.bound) return;
  menu.dataset.bound = "1";
  menu.addEventListener("click", (e) => {
    const btn = e.target.closest(".result-btn");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    try { playButtonSfx(); } catch (err) {}
    if (action === "retry") {
      hideResultMenu();
      restartSameStage();
    } else if (action === "next") {
      const nextKey = getNextStageKey(currentMode);
      if (nextKey) {
        hideResultMenu();
        goToStageKey(nextKey);
      }
    } else if (action === "title") {
      try { playBGM.pause(); } catch (err) {}
      location.reload();
    }
  });
}

function restartSameStage() {
  hideResultMenu();
  hideSurveyNudge();
  try { playBGM.pause(); } catch (e) {}
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
  gameOver = false;
  gameCleared = false;
  isReviving = false;
  abilityChoiceOpen = false;
  isCountingDown = false;
  freezeFrames = 0;
  gameStarted = false;
  hideCountdownUI();
  clearFadeOverlay();
  // currentMode / currentConfig はそのまま
  if (!currentConfig) {
    location.reload();
    return;
  }
  beginPlayWithRogue();
}

function handleScreenClick(clientX, clientY) {
  // 結果メニューは HTML ボタンで処理
  if (gameOver || gameCleared) return true;
  return false;
}

canvas.addEventListener("mousedown", (e) => {
  if (handleScreenClick(e.clientX, e.clientY)) return;
  if (gameOver || gameCleared) return;
  startDrawing(e.clientX, e.clientY);
});
canvas.addEventListener("mousemove", (e) => moveDrawing(e.clientX, e.clientY));
canvas.addEventListener("mouseup", () => releaseLines());

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (handleScreenClick(touch.clientX, touch.clientY)) return;
  if (gameOver || gameCleared) return;
  startDrawing(touch.clientX, touch.clientY);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  moveDrawing(touch.clientX, touch.clientY);
});
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  releaseLines();
});

