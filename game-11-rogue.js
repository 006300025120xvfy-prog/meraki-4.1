// DRAW LINE RUN [11/17] game-11-rogue.js — クリア／失敗演出・レリック／カード選択
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// ===== クリア／失敗演出 =====
let resultFx = [];
function spawnResultFx(isClear) {
  resultFx = [];
  const colors = isClear
    ? ["#33ff99", "#ffe566", "#7ee0ff", "#ffffff", "#ff9fd0"]
    : ["#ff5555", "#ff8844", "#aaaaaa", "#ff3333"];
  for (let i = 0; i < 48; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 6;
    resultFx.push({
      x: canvas.width / 2,
      y: canvas.height / 2 - 20,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 2,
      life: 50 + Math.floor(Math.random() * 30),
      color: colors[i % colors.length],
      size: 3 + Math.random() * 5
    });
  }
}
function updateAndDrawResultFx() {
  if (!resultFx.length) return;
  for (let i = resultFx.length - 1; i >= 0; i--) {
    const p = resultFx[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    if (p.life <= 0) {
      resultFx.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function isNightSkyStage() {
  return currentConfig && currentConfig.mainStage === 3;
}
function canUseAbilityChoice() {
  // 旧システム
  if (ABILITIES_ENABLED) {
    if (!currentConfig) return false;
    if (currentMode === "score") return true;
    return currentConfig.mainStage >= 3;
  }
  return false;
}
function canUseRogueCards() {
  return ROGUE_ENABLED && !!currentConfig;
}

function updateInvulnButtonUI() {
  const btn = document.getElementById("invuln-button");
  const countEl = document.getElementById("invuln-count");
  if (countEl) countEl.textContent = String(invulnCharges);
  if (btn) {
    btn.classList.toggle("disabled", invulnCharges <= 0 && invulnActiveFrames <= 0);
    const show = gameStarted && !gameOver && !gameCleared && !abilityChoiceOpen;
    btn.style.display = ((ROGUE_ENABLED || ABILITIES_ENABLED) && show && (invulnCharges > 0 || invulnActiveFrames > 0)) ? "flex" : "none";
    if (invulnActiveFrames > 0) {
      btn.style.borderColor = "rgba(255, 220, 80, 0.95)";
      btn.style.boxShadow = "0 0 16px rgba(255, 200, 60, 0.55)";
    } else {
      btn.style.borderColor = "rgba(255, 180, 60, 0.85)";
      btn.style.boxShadow = "0 0 12px rgba(255, 160, 40, 0.35)";
    }
  }
}

function useInvulnItem() {
  if (!ROGUE_ENABLED && !ABILITIES_ENABLED) return;
  if (!gameStarted || gameOver || gameCleared || abilityChoiceOpen || isReviving) return;
  if (invulnActiveFrames > 0) return;
  if (invulnCharges <= 0) return;
  invulnCharges--;
  invulnActiveFrames = INVULN_DURATION_FRAMES;
  updateInvulnButtonUI();
  try { addShake(3); spawnJuice(player.position.x, player.position.y, "#ffd24d", 14); } catch (e) {}
  try { playButtonSfx(); } catch (e) {}
}


// ギミック封じ：一定時間、新しいギミックが出なくなり、出ている警告・攻撃も消える
function activateGimmickSeal() {
  gimmickSuppressFrames = SEAL_DURATION_FRAMES;
  // いま出ているギミックを止める（activeGimmick も解放する）
  try {
    laserState = "idle"; laserTimer = 0; endGimmick("laser");
    if (spikeState === "warning") { spikeState = "idle"; spikeTimer = 0; endGimmick("spike"); }
    if (groundSpikeState === "warning") { groundSpikeState = "idle"; groundSpikeTimer = 0; endGimmick("groundSpike"); }
    if (windState === "warning" || windState === "active") { windState = "idle"; windTimer = 0; endGimmick("wind"); }
  } catch (e) {}
  sealFxPending = true; // 次の描画フレームから発動演出を開始
  try {
    spawnJuice(player.position.x, player.position.y, "#66e0ff", 24);
    addShake(3);
  } catch (e) {}
}

function applyAbilityChoice(kind) {
  if (!ABILITIES_ENABLED) return;
  if (kind === "warp") {
    warpCount = Math.min(WARP_MAX, warpCount + 2);
    updateWarpButtonUI();
  } else if (kind === "revive") {
    reviveCharges += 1;
  } else if (kind === "invuln") {
    invulnCharges += 1;
    updateInvulnButtonUI();
  } else if (kind === "line_extend") {
    lineExtendLevel = Math.min(LINE_EXTEND_MAX, (lineExtendLevel || 0) + 1);
  }
  try { recordStat("ability", kind); } catch (e) {}
}

function applyRelic(kind) {
  if (!RELIC_DEFS[kind]) return;
  currentRelic = kind;
  insuranceAvailable = (kind === "insurance");
  try { recordStat("ability", "relic_" + kind); } catch (e) {}
}

function applyCard(kind) {
  if (!CARD_DEFS[kind]) return;
  if (kind === "warp") {
    warpCount = Math.min(WARP_MAX, warpCount + 2);
    updateWarpButtonUI();
  } else if (kind === "revive") {
    reviveCharges += 1;
  } else if (kind === "invuln") {
    invulnCharges += 1;
    updateInvulnButtonUI();
  } else if (kind === "emergency_line") {
    lineBoostFrames = LINE_BOOST_DURATION * 2;
  } else if (kind === "clear_near") {
    const px = player ? player.position.x : 0;
    for (let i = walls.length - 1; i >= 0; i--) {
      if (Math.abs(walls[i].position.x - px) < 420) {
        try { World.remove(world, walls[i]); } catch (e) {}
        walls.splice(i, 1);
      }
    }
    try { spawnJuice(px, player.position.y, "#ffcc66", 14); } catch (e) {}
  } else if (kind === "seal_gimmick") {
    activateGimmickSeal();
  }
  try { recordStat("ability", "card_" + kind); } catch (e) {}
}

function closeAbilityChoice() {
  abilityChoiceOpen = false;
  rogueSelectMode = null;
  const overlay = document.getElementById("ability-choice-overlay");
  if (overlay) {
    overlay.classList.remove("visible");
    overlay.style.display = "none";
  }
  updateWarpButtonUI();
  updateInvulnButtonUI();
}

const ABILITY_META = {
  warp: { name: "🚀 ワープアイテム ×2", desc: "ワープを2個入手（最大3まで）" },
  revive: { name: "💖 一度復活", desc: "次に死んだとき、1回だけその場で復活" },
  invuln: { name: "🛡 数秒間無敵", desc: "使ったとき、数秒間ダメージを受けない" },
  line_extend: { name: "✏️ 線が長くなる", desc: "描ける線の長さがアップ（最大3回まで）" }
};

function pickAbilityOffer() {
  const pool = ["warp", "revive", "invuln"];
  if ((lineExtendLevel || 0) < LINE_EXTEND_MAX) pool.push("line_extend");
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return pool.slice(0, 3);
}

function pickRandomKeys(poolObj, n, exclude) {
  const keys = Object.keys(poolObj).filter((k) => !(exclude || []).includes(k));
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = keys[i]; keys[i] = keys[j]; keys[j] = t;
  }
  return keys.slice(0, Math.min(n, keys.length));
}

function openAbilityChoice(reason) {
  if (ABILITIES_ENABLED) {
    // legacy path unused
  }
}

function openRogueSelect(mode) {
  if (!ROGUE_ENABLED) return;
  if (gameOver || gameCleared) return;
  if (abilityChoiceOpen) return;
  rogueSelectMode = mode; // "relic" | "card"
  abilityChoiceOpen = true;
  gameStarted = false; // 選択中は進行停止

  const overlay = document.getElementById("ability-choice-overlay");
  const title = overlay ? overlay.querySelector(".ability-title") : null;
  const sub = document.getElementById("ability-choice-sub");
  const opts = overlay ? overlay.querySelector(".ability-options") : null;
  if (title) title.textContent = mode === "relic" ? "RELIC SELECT" : "CARD SELECT";
  if (overlay) { overlay.dataset.mode = mode; overlay.dataset.picking = ""; }
  if (sub) sub.textContent = mode === "relic"
    ? "このランのレリックを1つ選んでください"
    : Math.floor(score) + "m 到達！カードを1つ選ぼう";

  const pool = mode === "relic" ? RELIC_DEFS : CARD_DEFS;
  const picks = pickRandomKeys(pool, 3, mode === "relic" && currentRelic ? [currentRelic] : []);
  if (opts) {
    opts.innerHTML = "";
    opts.classList.remove("locked");
    picks.forEach((key, idx) => {
      const meta = pool[key];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ability-opt";
      btn.setAttribute("data-ability", key);
      const icon = meta.icon || "⭐";
      btn.style.setProperty("--i", idx);
      btn.innerHTML =
        '<span class="ability-opt-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="ability-opt-text">' +
          '<span class="ability-opt-tag">' + (mode === "relic" ? "パッシブ" : "即時効果") + '</span>' +
          '<span class="ability-opt-name">' + meta.name + '</span>' +
          '<span class="ability-opt-desc">' + meta.desc + '</span>' +
        '</span>';
      opts.appendChild(btn);
      // 任意素材：ability_<キー名>.png があればアイコンを画像に差し替え
      whenAssets(["ability_" + key + ".png"], (url) => {
        const ic = btn.querySelector(".ability-opt-icon");
        if (url && ic) ic.innerHTML = '<img alt="" src="' + url + '">';
      });
    });
  }
  if (overlay) {
    overlay.style.display = "flex";
    overlay.classList.add("visible");
  }
}

function checkAbilityChoiceTriggers() {
  if (!ROGUE_ENABLED) return;
  if (gameOver || gameCleared || abilityChoiceOpen) return;
  if (!gameStarted || isCountingDown || isReviving) return;
  if (!canUseRogueCards()) return;

  // カード：50m と 100m ごと
  const marks = [];
  if (score >= 50) marks.push(50);
  if (score >= 100) {
    const mile = Math.floor(score / 100) * 100;
    marks.push(mile);
  }
  for (const m of marks) {
    if (!cardMilestonesDone[m]) {
      cardMilestonesDone[m] = true;
      openRogueSelect("card");
      return;
    }
  }
}


function initAbilityChoiceUI() {
  const overlay = document.getElementById("ability-choice-overlay");
  if (!ROGUE_ENABLED && !ABILITIES_ENABLED) {
    if (overlay) { overlay.classList.remove("visible"); overlay.style.display = "none"; }
    const inv = document.getElementById("invuln-button");
    if (inv) inv.style.display = "none";
    return;
  }
  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", (e) => {
      const btn = e.target.closest(".ability-opt");
      if (!btn || !abilityChoiceOpen) return;
      const kind = btn.getAttribute("data-ability");
      if (!kind) return;
      try { playButtonSfx(); } catch (err) {}
      if (overlay.dataset.picking === "1") return;
      overlay.dataset.picking = "1";
      btn.classList.add("picked");
      const optsEl = overlay.querySelector(".ability-options");
      if (optsEl) optsEl.classList.add("locked");
      setTimeout(() => {
      overlay.dataset.picking = "";
      if (ROGUE_ENABLED && rogueSelectMode === "relic") {
        applyRelic(kind);
        closeAbilityChoice();
        if (!gameStarted && !isCountingDown) {
          startCountdownAfterSetup();
        }
      } else if (ROGUE_ENABLED && rogueSelectMode === "card") {
        applyCard(kind);
        closeAbilityChoice();
        gameStarted = true;
      } else {
        applyAbilityChoice(kind);
        closeAbilityChoice();
      }
      }, 260);
    });
  }
  const invulnBtn = document.getElementById("invuln-button");
  if (invulnBtn && !invulnBtn.dataset.bound) {
    invulnBtn.dataset.bound = "1";
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      useInvulnItem();
    };
    invulnBtn.addEventListener("click", handler);
    invulnBtn.addEventListener("touchstart", handler, { passive: false });
  }
}

