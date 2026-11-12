// DRAW LINE RUN [4/17] game-04-gimmicks-a.js — レーザー／重力反転／ゴール
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
// ===== レーザーギミック（3レーン） =====
const LANE_COUNT = 3;
const LANE_H = canvas.height / LANE_COUNT;
let laserState = "idle";
let laserSafeLane = 1;          
let laserTimer = 0;             
const LASER_WARNING_FRAMES = 150;  
const LASER_ACTIVE_FRAMES = 120;   
const LASER_COOLDOWN_MIN = 200;    
const LASER_COOLDOWN_MAX = 320;    
let laserCooldownTarget = 240;

function isLaserModeActive() {
  if (!currentMode || !currentConfig) return false;
  if (!currentConfig.laserEnabled) return false;
  const startAt = currentConfig.laserStartScore != null ? currentConfig.laserStartScore : 400;
  return score >= startAt;
}

function startLaserWarning() {
  if (!tryStartGimmick("laser")) return;
  laserSafeLane = Math.floor(Math.random() * LANE_COUNT);
  laserState = "warning";
  laserTimer = 0;
}

function getLaserWarnNeed() {
  return hasRelic("omen_eye") ? Math.floor(LASER_WARNING_FRAMES * 1.6) : LASER_WARNING_FRAMES;
}

function updateLaserGimmick() {
  if (!isLaserModeActive()) {
    if (laserState !== "idle") {
      endGimmick("laser");
    }
    laserState = "idle";
    laserTimer = 0;
    return;
  }

  laserTimer++;

  if (laserState === "idle") {
    startLaserWarning();
  } else if (laserState === "warning") {
    const laserWarnNeed = getLaserWarnNeed();
    if (laserTimer >= laserWarnNeed) {
      laserState = "active";
      laserTimer = 0;
      try { addShake(4); } catch (e) {}
    }
  } else if (laserState === "active") {
    const py = player.position.y;
    const playerLane = Math.min(LANE_COUNT - 1, Math.max(0, Math.floor(py / LANE_H)));
    const safeLane = isGravityVisualFlipped() ? (LANE_COUNT - 1 - laserSafeLane) : laserSafeLane;
    if (playerLane !== safeLane) {
      triggerGameOver();
    }
    if (laserTimer >= LASER_ACTIVE_FRAMES) {
      laserState = "cooldown";
      laserTimer = 0;
      const cMin = (currentConfig && currentConfig.laserCooldownMin != null) ? currentConfig.laserCooldownMin : LASER_COOLDOWN_MIN;
      const cMax = (currentConfig && currentConfig.laserCooldownMax != null) ? currentConfig.laserCooldownMax : LASER_COOLDOWN_MAX;
      laserCooldownTarget = cMin + Math.floor(Math.random() * (cMax - cMin + 1));
    }
  } else if (laserState === "cooldown") {
    if (laserTimer >= laserCooldownTarget) {
      laserState = "idle";
      laserTimer = 0;
      endGimmick("laser");
    }
  }
}

function drawLaserGimmick() {
  if (laserState !== "warning" && laserState !== "active") return;

  const now = Date.now();
  const W = canvas.width;
  const need = getLaserWarnNeed();
  // 警告の進み具合（0→1）。発射中は1
  const prog = laserState === "warning" ? Math.min(1, laserTimer / need) : 1;
  const safeLane = isGravityVisualFlipped() ? (LANE_COUNT - 1 - laserSafeLane) : laserSafeLane;
  const playerLane = Math.min(LANE_COUNT - 1, Math.max(0, Math.floor(player.position.y / LANE_H)));

  for (let i = 0; i < LANE_COUNT; i++) {
    if (i === safeLane) continue;
    const y = i * LANE_H;
    const h = LANE_H;
    const cy = y + h / 2;

    if (laserState === "warning") {
      // チカチカ点滅ではなく、ゆっくり脈打ちながら徐々に濃くなる
      const beat = Math.sin(now / (230 - 150 * prog));
      const a = 0.08 + 0.24 * prog + 0.05 * beat;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y, W, h); ctx.clip();
      ctx.fillStyle = `rgba(255, 40, 70, ${a})`;
      ctx.fillRect(0, y, W, h);

      // 流れる警告ストライプ
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.07 + 0.16 * prog})`;
      ctx.lineWidth = 10;
      const off = (now / 25) % 40;
      for (let sx = -h - 40 + off; sx < W + h; sx += 40) {
        ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + h, y); ctx.stroke();
      }

      // 照準ライン（だんだん太く明るく）
      ctx.strokeStyle = `rgba(255, 90, 110, ${0.15 + 0.7 * prog * prog})`;
      ctx.lineWidth = 1 + 3 * prog;
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = -now / 40;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
      ctx.setLineDash([]);

      // 左右のレーザー発射口がチャージされていく
      const er = 8 + 9 * prog + 2 * beat;
      for (let side = 0; side < 2; side++) {
        const ex = side === 0 ? 6 : W - 6;
        const eg = ctx.createRadialGradient(ex, cy, 1, ex, cy, er * 2);
        eg.addColorStop(0, `rgba(255,255,255,${0.5 + 0.5 * prog})`);
        eg.addColorStop(0.35, `rgba(255,70,100,${0.7})`);
        eg.addColorStop(1, "rgba(255,40,70,0)");
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(ex, cy, er * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // レーンのラベル（長文はやめて短く）
      ctx.save();
      ctx.font = "900 16px 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.35 * (0.5 + 0.5 * beat)})`;
      ctx.shadowColor = "rgba(255,0,40,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillText("⚠ DANGER", W / 2, cy);
      ctx.restore();
    } else {
      const pulse = 0.55 + 0.25 * Math.sin(now / 40);
      // 発射直後のフラッシュ
      const fl = Math.max(0, 1 - laserTimer / 12);
      if (fl > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.45 * fl})`;
        ctx.fillRect(0, y, W, h);
      }

      ctx.fillStyle = `rgba(255, 20, 60, ${0.15 * pulse})`;
      ctx.fillRect(0, y, W, h);

      const beamH = 18 * Math.min(1, 0.35 + laserTimer / 8);
      const beamY = cy - beamH / 2;
      const grad = ctx.createLinearGradient(0, beamY, 0, beamY + beamH);
      grad.addColorStop(0, "rgba(255, 100, 150, 0)");
      grad.addColorStop(0.3, `rgba(255, 40, 80, ${0.9 * pulse})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${pulse})`);
      grad.addColorStop(0.7, `rgba(255, 40, 80, ${0.9 * pulse})`);
      grad.addColorStop(1, "rgba(255, 100, 150, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, beamY, W, beamH);

      ctx.strokeStyle = `rgba(255, 80, 120, ${0.8 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, beamY);
      ctx.lineTo(W, beamY);
      ctx.moveTo(0, beamY + beamH);
      ctx.lineTo(W, beamY + beamH);
      ctx.stroke();
    }
  }

  // 安全レーン：緑に光らせ、「SAFE」と向かう方向の矢印を出す
  {
    const sy = safeLane * LANE_H;
    const scy = sy + LANE_H / 2;
    const gp = 0.5 + 0.5 * Math.sin(now / 200);
    ctx.save();
    ctx.fillStyle = `rgba(0, 255, 140, ${0.09 + 0.07 * gp})`;
    ctx.fillRect(0, sy, W, LANE_H);
    ctx.strokeStyle = `rgba(60, 255, 160, ${0.55 + 0.3 * gp})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -now / 50;
    ctx.strokeRect(2, sy + 2, W - 4, LANE_H - 4);
    ctx.setLineDash([]);

    ctx.font = "900 20px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,255,140,0.9)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#eafff4";
    if (playerLane === safeLane) {
      ctx.fillText("✓ SAFE", W / 2, scy);
    } else {
      const dir = safeLane < playerLane ? -1 : 1; // -1:上へ / 1:下へ
      const bob = Math.sin(now / 110) * 5 * dir;
      ctx.fillText("SAFE", W / 2, scy);
      // 矢印（安全レーンの方向）
      ctx.fillStyle = "#7dffc0";
      for (const ax of [W / 2 - 62, W / 2 + 62]) {
        ctx.beginPath();
        const ay = scy + bob;
        if (dir < 0) { ctx.moveTo(ax, ay - 9); ctx.lineTo(ax + 11, ay + 7); ctx.lineTo(ax - 11, ay + 7); }
        else { ctx.moveTo(ax, ay + 9); ctx.lineTo(ax + 11, ay - 7); ctx.lineTo(ax - 11, ay - 7); }
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ===== 重力反転ギミック =====
// 時間ではなく「スコア（=進行距離）」で区間を管理する。
// 1つの重力反転区間は100m、区間と区間の間は300m。
const GR_ZONE_LENGTH = 100;
const GR_ZONE_INTERVAL = 300;
const GR_WARNING_DISTANCE = 20;

let gravityReverseState = "idle";
// --- 重力反転の演出用 ---
const GFLIP_MS = 520;            // 反転アニメーションの長さ
const GFLIP_GRACE_FRAMES = 45;   // 反転直後の猶予（無敵）フレーム
let gravityFlipStart = 0;        // 反転アニメ開始時刻
let gravityFlipLast = 0;         // 直近の反転時刻（演出の表示用）
let gravityFlipToActive = true;  // true: 反転した / false: 元に戻った
let gravityActiveFrames = 0;     // 反転区間に入ってからのフレーム（重力のなめらかな切替用）
let gravityHud = null;           // {mode:"warn"|"active"|"return", remain, total}

// ===== 重力反転のワールド状態 =====
// 重力反転の瞬間に既存オブジェクトを上下移動させない。
// 既存の地面・壁・障害物はその場に残し、重力だけを反転する。
// 反転中に新しく生成する地形は上側を基準に生成する。
let gravityWorldFlipped = false;

function isGravityVisualFlipped() {
  return gravityReverseState === "active";
}

function setGravityWorldFlipped(flipped) {
  if (gravityWorldFlipped === flipped) return;
  gravityWorldFlipped = flipped;

  // 反転演出：世界がくるっと回って切り替わる（描画側で使用）＋直後は少しだけ猶予
  gravityFlipStart = Date.now();
  gravityFlipLast = gravityFlipStart;
  gravityFlipToActive = flipped;
  reviveInvulnFrames = Math.max(reviveInvulnFrames, GFLIP_GRACE_FRAMES);

  // 既存の地面・壁・足場を上下反転して「天井側の床」を作る
  // （これをしないと上に地面がなく無限に飛んでいく）
  const flipY = (y) => canvas.height - y;
  function flipBody(body) {
    if (!body) return;
    try {
      Body.setPosition(body, { x: body.position.x, y: flipY(body.position.y) });
      // 速度は反転重力に任せる（位置だけ合わせる）
    } catch (e) {}
  }

  grounds.forEach(flipBody);
  walls.forEach(flipBody);
  try {
    currentLines.forEach(flipBody);
  } catch (e) {}
  try {
    spikes.forEach(flipBody);
  } catch (e) {}
  try {
    blinkPlatforms.forEach((bp) => {
      if (bp.body) flipBody(bp.body);
      bp.y = flipY(bp.y);
    });
  } catch (e) {}
  try {
    fakeFloors.forEach((ff) => { ff.y = flipY(ff.y); });
  } catch (e) {}
  try {
    rings.forEach((r) => { r.y = flipY(r.y); });
  } catch (e) {}
  try {
    warpPickups.forEach((w) => { w.y = flipY(w.y); });
  } catch (e) {}

  // プレイヤーは位置を維持（重力方向だけ変わる）
  // ただし画面外に出ている場合は中央付近へ軽く戻す
  try {
    if (player) {
      const py = player.position.y;
      if (py < 20 || py > canvas.height - 20) {
        Body.setPosition(player, { x: player.position.x, y: canvas.height / 2 });
        Body.setVelocity(player, { x: player.velocity.x, y: 0 });
      }
    }
  } catch (e) {}
}

function getGravityZoneInfo() {
  if (!currentConfig || !currentConfig.gravityReverseEnabled) return null;

  const firstStart = currentConfig.gravityReverseStartScore != null
    ? currentConfig.gravityReverseStartScore
    : 200;

  // 最初の区間より前なら何も起こさない。
  if (score < firstStart - GR_WARNING_DISTANCE) return null;

  // 進行距離に応じて現在の重力反転区間を決める。
  // 例: firstStart=200 の場合
  //  180〜199m: WARNING
  //  200〜299m: ACTIVE
  //  300〜479m: 通常
  //  480〜499m: WARNING
  //  500〜599m: ACTIVE という形で繰り返す。
  let zoneIndex = 0;
  if (score >= firstStart) {
    zoneIndex = Math.floor((score - firstStart) / GR_ZONE_INTERVAL);
  }

  const zoneStart = firstStart + zoneIndex * GR_ZONE_INTERVAL;
  const zoneEnd = zoneStart + GR_ZONE_LENGTH;
  const warningStart = zoneStart - GR_WARNING_DISTANCE;

  return {
    zoneIndex,
    zoneStart,
    zoneEnd,
    warningStart,
    isWarning: score >= warningStart && score < zoneStart,
    isActive: score >= zoneStart && score < zoneEnd
  };
}

function updateGravityReverseGimmick() {
  // 旧DOMの警告表示は廃止（キャンバス上の警告バナーに統一）
  const warnEl = document.getElementById("gravity-warning");
  if (warnEl) warnEl.classList.add("hidden");
  const zone = getGravityZoneInfo();

  if (!zone) {
    gravityReverseState = "idle";
    engine.world.gravity.y = normalGravityY;
    setGravityWorldFlipped(false);
    activeGimmick = activeGimmick === "gravityReverse" ? null : activeGimmick;
    gravityActiveFrames = 0;
    gravityHud = null;
    return;
  }

  if (zone.isWarning) {
    gravityReverseState = "warning";
    engine.world.gravity.y = Math.abs(normalGravityY);
    gravityActiveFrames = 0;
    gravityHud = { mode: "warn", remain: Math.max(0, zone.zoneStart - score), total: GR_WARNING_DISTANCE };

    // WARNING中はまだ反転しない。
    setGravityWorldFlipped(false);
    if (activeGimmick === "gravityReverse") activeGimmick = null;
    return;
  }

  if (zone.isActive) {
    gravityReverseState = "active";
    gravityActiveFrames++;
    // 重力を一瞬で逆向きにせず、約0.4秒かけてなめらかに切り替える（ふわっと浮く感じ）
    const g = Math.abs(normalGravityY);
    const k = Math.min(1, gravityActiveFrames / 24);
    const e = k * k * (3 - 2 * k);
    engine.world.gravity.y = g * (1 - e) + (-g * 1.2) * e;
    setGravityWorldFlipped(true);
    activeGimmick = "gravityReverse";
    const remain = Math.max(0, zone.zoneEnd - score);
    gravityHud = { mode: remain <= 15 ? "return" : "active", remain, total: GR_ZONE_LENGTH };
    return;
  }

  // 区間終了後は通常重力に戻る。
  gravityReverseState = "idle";
  engine.world.gravity.y = normalGravityY;
  setGravityWorldFlipped(false);
  if (activeGimmick === "gravityReverse") activeGimmick = null;
  gravityActiveFrames = 0;
  gravityHud = null;
}

function getGoalWorldX() {
  if (!currentConfig || currentConfig.isInfinite || currentConfig.targetScore == null) return null;
  return currentConfig.targetScore * 100 + 200;
}

function drawGoal() {
  const gx = getGoalWorldX();
  if (gx == null) return;
  const sx = gx - cameraX;
  if (sx < -80 || sx > canvas.width + 80) return;

  const groundY = isGravityVisualFlipped() ? 80 : canvas.height - 80;
  const poleH = 220;
  const poleW = 10;
  const archW = 70;

  ctx.save();

  ctx.fillStyle = "#f5d76e";
  ctx.fillRect(sx - archW / 2 - poleW, groundY - poleH, poleW, poleH);
  ctx.fillRect(sx + archW / 2, groundY - poleH, poleW, poleH);

  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(sx - archW / 2 - poleW, groundY - poleH, archW + poleW * 2, 28);

  ctx.font = "bold 18px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillText("GOAL", sx, groundY - poleH + 14);

  const bandY = groundY - 8;
  const bandH = 12;
  const cell = 12;
  for (let i = -4; i <= 4; i++) {
    ctx.fillStyle = (i % 2 === 0) ? "#111" : "#fff";
    ctx.fillRect(sx + i * cell - cell / 2, bandY, cell, bandH);
  }

  const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 200);
  ctx.strokeStyle = `rgba(255, 220, 50, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(sx - archW / 2 - poleW - 2, groundY - poleH - 2, archW + poleW * 2 + 4, poleH + 4);

  ctx.restore();
}


