// DRAW LINE RUN [17/17] game-17-menu.js — ステージ名・マップ選択・設定UI・起動処理
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
const STAGE_AREA_NAMES = {
  1: "草原エリア",
  2: "夕暮れエリア",
  3: "夜空エリア",
  4: "サイバーエリア",
  5: "溶岩エリア"
};

const STAGE_ORDER = [
  "stage1-1", "stage1-2", "stage1-3",
  "stage2-1", "stage2-2", "stage2-3",
  "stage3-1", "stage3-2", "stage3-3",
  "stage4-1", "stage4-2", "stage4-3",
  "stage5-1", "stage5-2", "stage5-3"
];


const STAGE_DISPLAY_NAMES = {
  "stage1-1": "草原の砦",
  "stage1-2": "草原の道",
  "stage1-3": "草原の塔",
  "stage2-1": "夕暮れの村",
  "stage2-2": "夕暮れの丘",
  "stage2-3": "夕暮れの城",
  "stage3-1": "星降る道",
  "stage3-2": "月夜の遺跡",
  "stage3-3": "夜空の塔",
  "stage4-1": "電脳入口",
  "stage4-2": "回路街区",
  "stage4-3": "コア塔",
  "stage5-1": "溶岩の道",
  "stage5-2": "火口の橋",
  "stage5-3": "火山の城",
};

// 名所画像（あれば使用） landmark_1.png / landmark_2.png / landmark_3.png
// または landmark_w{world}_{sub}.png
function loadSpotLandmark(imgEl, world, sub) {
  if (!imgEl) return;
  const w = String(world);
  const s = String(sub);
  const namedBySub = { "1": "fort", "2": "ruins", "3": "tower" };
  const namedByWorld = {
    "1": { "1": "fort", "2": "ruins", "3": "tower" },
    "2": { "1": "lantern", "2": "bridge", "3": "sunset_castle" },
    "3": { "1": "starpath", "2": "moon_ruins", "3": "night_tower" },
    "4": { "1": "cyber_gate", "2": "circuit_block", "3": "core_tower" },
    "5": { "1": "lava_path", "2": "crater_bridge", "3": "volcano_castle" }
  };
  const wkey = (namedByWorld[w] || {})[s];
  const skey = namedBySub[s] || s;

  // 読み込み世代（ワールド切替の取り違え防止）
  const gen = (imgEl._lmGen = (imgEl._lmGen || 0) + 1);

  const baseNames = [
    "landmark_w" + w + "_" + s + ".png",
    "landmark_" + w + "-" + s + ".png",
    "landmark_" + w + "_" + s + ".png",
    wkey ? ("landmark_" + wkey + ".png") : null,
    wkey ? (wkey + ".png") : null,
    "landmark_" + skey + ".png",
    "landmark_" + s + ".png",
    // よくある別名
    s === "1" ? "landmark_fort.png" : null,
    s === "2" ? "landmark_ruins.png" : null,
    s === "3" ? "landmark_tower.png" : null
  ].filter(Boolean);

  const candidates = [];
  const seen = {};
  baseNames.forEach((n) => {
    assetDirCandidates(n).forEach((u) => {
      if (!seen[u]) { seen[u] = 1; candidates.push(u); }
    });
  });

  imgEl.style.display = "none";
  if (imgEl.parentElement) imgEl.parentElement.classList.remove("has-landmark");

  let i = 0;
  const tryNext = () => {
    if (gen !== imgEl._lmGen) return; // 古いリクエストは破棄
    if (i >= candidates.length) {
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
      if (imgEl.parentElement) imgEl.parentElement.classList.remove("has-landmark");
      return;
    }
    const url = candidates[i++];
    const probe = new Image();
    probe.onload = () => {
      if (gen !== imgEl._lmGen) return;
      imgEl.onload = null;
      imgEl.onerror = null;
      imgEl.src = url;
      imgEl.style.display = "block";
      imgEl.style.opacity = "1";
      imgEl.style.visibility = "visible";
      if (imgEl.parentElement) {
        imgEl.parentElement.classList.add("has-landmark");
      }
    };
    probe.onerror = tryNext;
    probe.src = url;
  };
  tryNext();
}

function setupImgButtonFallback(btn) {
  if (!btn) return;
  const img = btn.querySelector("img");
  if (!img) return;
  img.addEventListener("error", () => {
    btn.classList.add("no-img");
  });
  // すでに壊れている場合
  if (img.complete && img.naturalWidth === 0) {
    btn.classList.add("no-img");
  }
}

const WORLD_COUNT = 5;
let currentWorldPage = 1; // 1..5

function getClearedStages() {
  try {
    return JSON.parse(localStorage.getItem("drawRunStageClears")) || {};
  } catch (e) {
    return {};
  }
}

function isStageUnlocked(modeKey) {
  if (modeKey === "score") return true;
  const idx = STAGE_ORDER.indexOf(modeKey);
  if (idx < 0) return false;
  if (idx === 0) return true;
  const prev = STAGE_ORDER[idx - 1];
  return !!getClearedStages()[prev];
}

function isMainStageUnlocked(mainNum) {
  return isStageUnlocked("stage" + mainNum + "-1");
}

function applyNodeLockState(btn, unlocked, cleared) {
  if (!btn) return;
  btn.classList.toggle("locked", !unlocked);
  btn.classList.toggle("cleared", !!cleared);
  btn.setAttribute("aria-disabled", unlocked ? "false" : "true");
}



// 木などの画像装飾（CSSの家・土管は使わない）
// 使えるファイル: tree.png / tree2.png / tree3.png / bush.png / rock.png
const WORLD_DECO_LAYOUT = {
  1: [
    { src: ["tree1.png", "tree.png", "tree1.png"], left: 8, top: 48, w: 48 },
    { src: ["tree2.png", "tree1.png", "tree.png"], left: 28, top: 55, w: 42 },
    { src: ["bush.png", "tree1.png", "tree.png"], left: 55, top: 70, w: 36 },
    { src: ["tree3.png", "tree1.png", "tree.png"], left: 68, top: 50, w: 50 },
    { src: ["tree1.png", "tree.png"], left: 88, top: 58, w: 44 }
  ],
  2: [
    { src: ["tree1.png", "tree.png", "tree2.png"], left: 10, top: 50, w: 46 },
    { src: ["tree2.png", "tree1.png", "tree.png"], left: 40, top: 58, w: 42 },
    { src: ["bush.png", "tree1.png", "tree.png"], left: 62, top: 68, w: 36 },
    { src: ["tree3.png", "tree1.png", "tree.png"], left: 85, top: 48, w: 48 }
  ],
  3: [
    { src: ["tree1.png", "tree.png"], left: 12, top: 55, w: 40 },
    { src: ["tree2.png", "tree1.png", "tree.png"], left: 50, top: 60, w: 44 },
    { src: ["tree3.png", "tree1.png", "tree.png"], left: 80, top: 52, w: 46 }
  ],
  4: [
    // サイバー／砂漠：木なし
  ],
  5: [
    // 溶岩：岩のみ（木なし）
    { src: ["rock.png"], left: 18, top: 62, w: 40 },
    { src: ["rock.png"], left: 55, top: 68, w: 36 }
  ],
};

function setImageWithFallback(img, candidates, onFail) {
  whenAssets(candidates || [], (url) => {
    if (url) { img.src = url; img.style.display = ""; }
    else if (onFail) onFail();
  });
}

function buildWorldDecorations(mainNum) {
  const layer = document.getElementById("map-deco-layer");
  if (!layer) return;
  layer.innerHTML = "";
  const list = WORLD_DECO_LAYOUT[mainNum] || WORLD_DECO_LAYOUT[1];
  list.forEach((d) => {
    const img = document.createElement("img");
    img.className = "deco deco-img";
    img.alt = "";
    img.style.left = d.left + "%";
    img.style.top = d.top + "%";
    img.style.width = (d.w || 44) + "px";
    img.style.height = "auto";
    img.style.position = "absolute";
    img.style.pointerEvents = "none";
    img.style.display = "none";
    img.style.filter = "drop-shadow(0 2px 3px rgba(0,0,0,0.35))";
    layer.appendChild(img);
    setImageWithFallback(img, d.src, () => { img.remove(); });
  });
}

function getSelectedSkinSrc() {
  let idx = 0;
  try { idx = parseInt(localStorage.getItem("drawRunSkinIndex"), 10) || 0; } catch (e) {}
  if (typeof characterList !== "undefined" && characterList.length) {
    if (idx < 0 || idx >= characterList.length) idx = 0;
    if (typeof isCharacterUnlocked === "function" && !isCharacterUnlocked(idx)) idx = 0;
    return characterList[idx].src;
  }
  const fallbacks = ["player.png", "player2.png", "player3.png", "player4.png", "player5.png", "player6.png", "player7.png", "player8.png"];
  return fallbacks[idx] || "player.png";
}

let __mapCharToken = 0;
let __worldPageToken = 0;
function updateMapCharToSpot(spotBtn) {
  const charEl = document.getElementById("map-char");
  const canvas = document.getElementById("world-map-canvas");
  if (!charEl || !canvas || !spotBtn) return;

  const skinName = getSelectedSkinSrc();
  charEl.style.left = spotBtn.style.left || "50%";
  charEl.style.top = spotBtn.style.top || "50%";
  charEl.classList.remove("visible");
  void charEl.offsetWidth;
  const charToken = ++__mapCharToken;
  whenAssets([skinName], (url) => {
    if (charToken !== __mapCharToken) return;
    if (url) charEl.src = url;
    charEl.style.display = "block";
    charEl.style.opacity = "1";
    charEl.classList.add("visible");
  });
}

function hideMapChar() {
  const charEl = document.getElementById("map-char");
  if (charEl) charEl.classList.remove("visible");
}

// 起動直後に全ワールドのマップ素材を順番に先読みする
function preloadMapAssets() {
  const jobs = [];
  for (let w = 1; w <= WORLD_COUNT; w++) jobs.push(["map_world" + w + ".png"]);
  for (let w = 1; w <= WORLD_COUNT; w++) {
    jobs.push(["map_world_banner_" + w + ".png", "world_banner_" + w + ".png", "map_world_banner.png"]);
  }
  try { jobs.push([getSelectedSkinSrc()]); } catch (e) {}
  const seen = {};
  Object.keys(WORLD_DECO_LAYOUT).forEach((w) => WORLD_DECO_LAYOUT[w].forEach((d) => {
    const k = d.src.join("|");
    if (!seen[k]) { seen[k] = 1; jobs.push(d.src); }
  }));
  let p = Promise.resolve();
  jobs.forEach((names) => { p = p.then(() => resolveFirstAsset(names)).catch(() => {}); });
}

function updateWorldPage(mainNum) {
  currentWorldPage = Math.max(1, Math.min(WORLD_COUNT, mainNum));
  const cleared = getClearedStages();

  const tag = document.getElementById("world-tag");
  const name = document.getElementById("world-name");
  const hint = document.getElementById("world-hint");
  const canvas = document.getElementById("world-map-canvas");
  const prevBtn = document.getElementById("world-prev");
  const nextBtn = document.getElementById("world-next");
  const selectedEl = document.getElementById("world-selected");
  const challengeBtn = document.getElementById("challenge-btn");

  if (tag) tag.textContent = "WORLD " + currentWorldPage;
  if (name) name.textContent = STAGE_AREA_NAMES[currentWorldPage] || "";

  // ワールドごとのバナー画像
  const bannerEl = document.getElementById("world-banner");
  const bannerImg = document.getElementById("world-banner-img");
  const pageToken = ++__worldPageToken; // 連続操作時に古い読み込み結果で上書きしない
  if (bannerImg) {
    const bannerNames = [
      "map_world_banner_" + currentWorldPage + ".png",
      "world_banner_" + currentWorldPage + ".png",
      "map_world_banner.png"
    ];
    const bannerSync = whenAssets(bannerNames, (url) => {
      if (pageToken !== __worldPageToken) return;
      if (url) {
        bannerImg.src = url;
        bannerImg.style.display = "block";
        if (bannerEl) bannerEl.classList.add("has-img");
      } else if (bannerEl) {
        bannerEl.classList.remove("has-img");
      }
    });
    if (!bannerSync && bannerEl) bannerEl.classList.remove("has-img"); // 読込中は前ワールドの画像を残さない
  }

  // 背景画像（無ければCSSグラデ）＋装飾
  if (canvas) {
    canvas.setAttribute("data-main", String(currentWorldPage));
    const mapSync = whenAssets(["map_world" + currentWorldPage + ".png"], (url) => {
      if (pageToken !== __worldPageToken) return;
      canvas.style.backgroundImage = url ? "url('" + url + "')" : "";
    });
    if (!mapSync) canvas.style.backgroundImage = ""; // 読込中は前ワールドの背景を残さない
  }
  buildWorldDecorations(currentWorldPage);

  const worldUnlocked = isMainStageUnlocked(currentWorldPage);
  if (hint) {
    if (!worldUnlocked) {
      hint.textContent = "前のワールドをクリアすると解放されます";
    } else {
      const allClear = [1, 2, 3].every((s) => cleared["stage" + currentWorldPage + "-" + s]);
      hint.textContent = allClear ? "このワールドはコンプリート！" : "地点を選んで「挑戦する」";
    }
  }

  selectedModeKey = null;
  if (selectedEl) {
    selectedEl.textContent = worldUnlocked ? "地点を選んでください" : "ロック中";
  }
  if (challengeBtn) challengeBtn.disabled = true;
  hideMapChar();

  const spots = Array.from(document.querySelectorAll(".map-spot")).sort((a, b) => {
    return (parseInt(a.dataset.sub, 10) || 0) - (parseInt(b.dataset.sub, 10) || 0);
  });
  spots.forEach((btn, idx) => {
    const sub = String(parseInt(btn.dataset.sub, 10) || (idx + 1));
    btn.dataset.sub = sub;
    const modeKey = "stage" + currentWorldPage + "-" + sub;
    btn.dataset.mode = modeKey;
    const numEl = btn.querySelector(".spot-label") || btn.querySelector(".node-num");
    if (numEl) numEl.textContent = currentWorldPage + "-" + sub;
    const plateTitle = btn.querySelector(".plate-title");
    if (plateTitle) {
      const stars = getStageDifficultyStars(modeKey);
      const starStr = "★".repeat(stars) + "☆".repeat(5 - stars);
      plateTitle.textContent = (STAGE_DISPLAY_NAMES[modeKey] || (currentWorldPage + "-" + sub)) + " " + starStr;
    }
    const landmark = btn.querySelector(".spot-landmark");
    loadSpotLandmark(landmark, currentWorldPage, sub);
    const unlocked = isStageUnlocked(modeKey);
    btn.classList.toggle("locked", !unlocked);
    btn.classList.toggle("cleared", !!cleared[modeKey]);
    btn.classList.remove("selected");
    btn.setAttribute("aria-disabled", unlocked ? "false" : "true");
  });

  if (prevBtn) prevBtn.disabled = currentWorldPage <= 1;
  if (nextBtn) nextBtn.disabled = currentWorldPage >= WORLD_COUNT;

  const dots = document.getElementById("world-dots");
  if (dots) {
    dots.innerHTML = "";
    for (let i = 1; i <= WORLD_COUNT; i++) {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "world-dot" + (i === currentWorldPage ? " active" : "");
      d.setAttribute("aria-label", "WORLD " + i);
      d.addEventListener("click", () => {
        playButtonSfx();
        updateWorldPage(i);
      });
      dots.appendChild(d);
    }
  }

  // スクロール位置を左端へ
  const vp = document.getElementById("world-map-viewport");
  if (vp) vp.scrollLeft = 0;
}

let selectedModeKey = null;

function refreshMainMapLocks() {
  updateWorldPage(currentWorldPage);
}

function refreshSubMapLocks() {
  // 互換（サブ画面は使わない）
}

function openSubSelect(mainNum) {
  // ワールドページへ直接移動
  updateWorldPage(Number(mainNum) || 1);
}

function initWarpButton() {
  const btn = document.getElementById("warp-button");
  if (!btn) return;
  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (warpCount > 0) playButtonSfx();
    useWarp();
  };
  btn.addEventListener("click", handler);
  btn.addEventListener("touchstart", handler, { passive: false });
  updateWarpButtonUI();
}


function initMapSwipeScroll() {
  const vp = document.getElementById("world-map-viewport");
  if (!vp || vp.dataset.swipeInit === "1") return;
  vp.dataset.swipeInit = "1";

  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  const onDown = (clientX) => {
    dragging = true;
    moved = false;
    startX = clientX;
    startScroll = vp.scrollLeft;
  };
  const onMove = (clientX, e) => {
    if (!dragging) return;
    const dx = clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    vp.scrollLeft = startScroll - dx;
    if (e && e.cancelable && moved) e.preventDefault();
  };
  const onUp = () => { dragging = false; };

  vp.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    onDown(e.clientX);
  });
  window.addEventListener("mousemove", (e) => onMove(e.clientX, e));
  window.addEventListener("mouseup", onUp);

  vp.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    onDown(e.touches[0].clientX);
  }, { passive: true });
  vp.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    onMove(e.touches[0].clientX, e);
  }, { passive: false });
  vp.addEventListener("touchend", onUp);
  vp.addEventListener("touchcancel", onUp);

  // 地点クリックとドラッグを区別
  vp.addEventListener("click", (e) => {
    if (moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // ワールド間スワイプ（端で大きく横に払う）
  let worldSwipeX = 0;
  let worldSwipeOn = false;
  const shell = document.querySelector(".world-shell");
  if (shell) {
    shell.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      worldSwipeOn = true;
      worldSwipeX = e.touches[0].clientX;
    }, { passive: true });
    shell.addEventListener("touchend", (e) => {
      if (!worldSwipeOn) return;
      worldSwipeOn = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - worldSwipeX;
      if (Math.abs(dx) < 70) return;
      // マップを大きくスクロール中ならワールド切替しない
      if (vp.scrollWidth > vp.clientWidth + 20) {
        const atLeft = vp.scrollLeft <= 8;
        const atRight = vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 8;
        if (dx > 0 && !atLeft) return;
        if (dx < 0 && !atRight) return;
      }
      if (dx < 0 && currentWorldPage < WORLD_COUNT) {
        playButtonSfx();
        updateWorldPage(currentWorldPage + 1);
      } else if (dx > 0 && currentWorldPage > 1) {
        playButtonSfx();
        updateWorldPage(currentWorldPage - 1);
      }
    }, { passive: true });
  }
}


function refreshSettingsPanel() {
  const s = loadPlayStats();
  const plays = document.getElementById("stat-plays");
  const dist = document.getElementById("stat-dist");
  const clears = document.getElementById("stat-clears");
  const deaths = document.getElementById("stat-deaths");
  const best = document.getElementById("stat-best");
  const abil = document.getElementById("stat-abil");
  if (plays) plays.textContent = String(s.playCount);
  if (dist) dist.textContent = Math.floor(s.totalDistance) + " m";
  if (clears) clears.textContent = String(s.clears);
  if (deaths) deaths.textContent = String(s.deaths);
  if (best) best.textContent = Math.floor(s.bestScore) + " m";
  if (abil) {
    const a = s.abilities || {};
    abil.textContent = "W" + (a.warp || 0) + " / R" + (a.revive || 0) + " / F" + (a.freeze || 0);
  }
  const seEn = document.getElementById("set-se-enabled");
  const seVol = document.getElementById("set-se-volume");
  if (seEn) seEn.checked = isSeEnabled();
  if (seVol) {
    const v = Number(getSavedSeValue("drawRunSeVolume"));
    seVol.value = Number.isFinite(v) ? v : 28;
  }
}

function initSettingsUI() {
  const btn = document.getElementById("settings-button");
  const overlay = document.getElementById("settings-overlay");
  const closeBtn = document.getElementById("settings-close");
  const seEn = document.getElementById("set-se-enabled");
  const seVol = document.getElementById("set-se-volume");
  function open() {
    if (overlay) overlay.classList.add("visible");
    refreshSettingsPanel();
  }
  function close() {
    if (overlay) overlay.classList.remove("visible");
  }
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { playButtonSfx(); } catch (err) {}
      open();
    });
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", () => {
      try { playButtonSfx(); } catch (err) {}
      close();
    });
  }
  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }
  if (seEn && !seEn.dataset.bound) {
    seEn.dataset.bound = "1";
    seEn.addEventListener("change", () => {
      saveSeValue("drawRunSeEnabled", seEn.checked ? "true" : "false");
    });
  }
  if (seVol && !seVol.dataset.bound) {
    seVol.dataset.bound = "1";
    seVol.addEventListener("input", () => {
      saveSeValue("drawRunSeVolume", String(seVol.value));
    });
  }
}

function initModeSelectUI() {
  initWarpButton();
  initAbilityChoiceUI();
  initSettingsUI();
  initResultMenuUI();
  initMapSwipeScroll();
  setupImgButtonFallback(document.getElementById("challenge-btn"));
  setupImgButtonFallback(document.getElementById("mode-back-btn"));
  const startBtn = document.getElementById("start-button");
  const startScreen = document.getElementById("start-screen");
  const modeSelectScreen = document.getElementById("mode-select-screen");
  const subSelectScreen = document.getElementById("sub-select-screen");
  const modeBackBtn = document.getElementById("mode-back-btn");
  const subBackBtn = document.getElementById("sub-back-btn");
  const worldPrev = document.getElementById("world-prev");
  const worldNext = document.getElementById("world-next");

  // サブ画面は非表示固定
  if (subSelectScreen) {
    subSelectScreen.style.display = "none";
  }

  const scoreAttackBtn = document.getElementById("score-attack-button");

  function hideTitleButtons() {
    if (startBtn) startBtn.style.display = "none";
    if (scoreAttackBtn) scoreAttackBtn.style.display = "none";
    const setBtn = document.getElementById("settings-button");
    if (setBtn) setBtn.style.display = "none";
    const surveyBtn = document.getElementById("survey-button");
    if (surveyBtn) surveyBtn.style.display = "none";
    if (startScreen) {
      startScreen.querySelectorAll("a").forEach(btn => {
        if (btn.id === "survey-button") return;
        btn.style.display = "none";
      });
    }
  }

  function showTitleButtons() {
    if (startBtn) startBtn.style.display = "block";
    if (scoreAttackBtn) scoreAttackBtn.style.display = "block";
    const setBtn = document.getElementById("settings-button");
    if (setBtn) setBtn.style.display = "block";
    const surveyBtn = document.getElementById("survey-button");
    if (surveyBtn) surveyBtn.style.display = "block";
    if (startScreen) {
      startScreen.querySelectorAll("a").forEach(btn => {
        if (btn.id === "survey-button") return;
        btn.style.display = "block";
      });
    }
  }

  if (scoreAttackBtn) {
    scoreAttackBtn.addEventListener("click", () => {
      playButtonSfx();
      hideTitleButtons();
      const fade = document.getElementById("fade-overlay");
      if (fade) {
        fade.classList.remove("fade-in", "circle-expand");
        void fade.offsetWidth;
        fade.classList.add("circle-expand");
      }
      setTimeout(() => {
        if (startScreen) startScreen.classList.add("hidden");
        currentMode = "score";
        currentConfig = MODE_CONFIG.score;
        beginPlayWithRogue();
        if (fade) setTimeout(() => fade.classList.remove("circle-expand"), 600);
      }, 280);
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      playButtonSfx();
      hideTitleButtons();

      const fade = document.getElementById("fade-overlay");
      // 円形ワイプでマップへ
      if (fade) {
        fade.classList.remove("fade-in", "circle-expand");
        void fade.offsetWidth;
        fade.classList.add("circle-expand");
      }

      setTimeout(() => {
        if (startScreen) startScreen.classList.add("hidden");
        if (modeSelectScreen) {
          modeSelectScreen.classList.add("visible", "map-enter");
          // 常に WORLD1 から表示（順番が飛んで見えるのを防ぐ）
          updateWorldPage(1);
          // アニメ再発火用
          setTimeout(() => modeSelectScreen.classList.remove("map-enter"), 900);
        }
        if (fade) {
          setTimeout(() => fade.classList.remove("circle-expand"), 700);
        }
      }, 280);
    });
  }

  if (modeBackBtn) {
    modeBackBtn.addEventListener("click", () => {
      playButtonSfx();
      modeSelectScreen.classList.remove("visible");
      startScreen.classList.remove("hidden");
      showTitleButtons();
    });
  }

  if (subBackBtn) {
    subBackBtn.addEventListener("click", () => {
      playButtonSfx();
      if (subSelectScreen) subSelectScreen.classList.remove("visible");
      if (modeSelectScreen) {
        modeSelectScreen.classList.add("visible");
        updateWorldPage(currentWorldPage);
      }
    });
  }

  if (worldPrev) {
    worldPrev.addEventListener("click", () => {
      if (currentWorldPage <= 1) return;
      playButtonSfx();
      updateWorldPage(currentWorldPage - 1);
    });
  }
  if (worldNext) {
    worldNext.addEventListener("click", () => {
      if (currentWorldPage >= WORLD_COUNT) return;
      playButtonSfx();
      updateWorldPage(currentWorldPage + 1);
    });
  }

  if (modeSelectScreen) {
    modeSelectScreen.addEventListener("click", (e) => {
      const spot = e.target.closest(".map-spot");
      if (spot) {
        if (spot.classList.contains("locked")) return;
        const modeKey = spot.dataset.mode;
        if (!MODE_CONFIG[modeKey] || !isStageUnlocked(modeKey)) return;
        playButtonSfx();
        selectedModeKey = modeKey;
        document.querySelectorAll(".map-spot").forEach((b) => b.classList.remove("selected"));
        spot.classList.add("selected");
        updateMapCharToSpot(spot);
        const sel = document.getElementById("world-selected");
        if (sel) {
          const nice = STAGE_DISPLAY_NAMES[modeKey] || (MODE_CONFIG[modeKey].name || modeKey);
          sel.textContent = "選択中: " + nice;
        }
        const challengeBtn = document.getElementById("challenge-btn");
        if (challengeBtn) challengeBtn.disabled = false;
        return;
      }
    });
  }

  const challengeBtn = document.getElementById("challenge-btn");
  if (challengeBtn) {
    challengeBtn.addEventListener("click", () => {
      if (!selectedModeKey || !MODE_CONFIG[selectedModeKey]) return;
      if (!isStageUnlocked(selectedModeKey)) return;
      playButtonSfx();
      currentMode = selectedModeKey;
      currentConfig = MODE_CONFIG[selectedModeKey];

      const fade = document.getElementById("fade-overlay");
      if (fade) {
        fade.classList.remove("fade-in", "circle-expand");
        void fade.offsetWidth;
        fade.classList.add("circle-expand");
      }
      setTimeout(() => {
        beginPlayWithRogue();
        if (fade) {
          setTimeout(() => fade.classList.remove("circle-expand"), 600);
        }
      }, 320);
    });
  }

  setTimeout(preloadMapAssets, 0);
  updateWorldPage(1);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initModeSelectUI);
} else {
  initModeSelectUI();
}

gameLoop();

window.DRAW_RUN = {
  invincible: false,   
  speedMul: 1,         
  get engine() { return engine; },
  get world() { return world; },
  get player() { return player; },
  get canvas() { return canvas; },
  get ctx() { return ctx; },
  get score() { return score; },
  get cameraX() { return cameraX; },
  get gameStarted() { return gameStarted; },
  get gameOver() { return gameOver; },
  get gameCleared() { return gameCleared; },
  get currentMode() { return currentMode; },
  get currentConfig() { return currentConfig; },
  get playerSpeed() { return playerSpeed; },
  get airborneFrames() { return airborneFrames; },
  get upperZoneFrames() { return upperZoneFrames; },
  get isTouchingGroundOrLine() { return isTouchingGroundOrLine; },
  get drawing() { return drawing; },
  get grounds() { return grounds; },
  get walls() { return walls; },
  get currentLines() { return currentLines; },
  get gravityY() { return engine.world.gravity.y; },
  get gravityWorldFlipped() { return gravityWorldFlipped; },
  triggerGameOver,
  triggerGameClear,
  MODE_CONFIG,
  warpTo(worldX, worldY) {
    if (!player) return;
    const y = (worldY != null) ? worldY : player.position.y;
    Body.setPosition(player, { x: worldX, y: y });
    Body.setVelocity(player, { x: playerSpeed || 4, y: 0 });
    cameraX = player.position.x - canvas.width * 0.1;
    while (currentX < cameraX + canvas.width + 800) {
      generateSegment();
    }
  }
};
