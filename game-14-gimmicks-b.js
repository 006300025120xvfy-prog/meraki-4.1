// DRAW LINE RUN [14/17] game-14-gimmicks-b.js — リング・トゲ・ワープ・地面トゲ・点滅床・風
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
const FIXED_DT_MS = 1000 / 60;   
const FIXED_DT_SEC = 1 / 60;
const MAX_FRAME_MS = 80;         
let lastFrameTime = performance.now();
let timeAccumulator = 0;

function updateRings() {
  if (lineBoostFrames > 0) lineBoostFrames--;

  for (const ring of rings) {
    if (ring.used) continue;
    if (ring.type === "normal" && lineBoostFrames <= 0) continue;
    const dx = player.position.x - ring.x;
    const dy = player.position.y - ring.y;
    // リングは触判定のみ（押し出し・跳ねなし）
    if (dx * dx + dy * dy < (ring.r + 18) * (ring.r + 18)) {
      ring.used = true;
      if (ring.type === "normal") {
        lineBoostFrames = 0;
      } else {
        lineBoostFrames = LINE_BOOST_DURATION;
        const nx = player.position.x + 350 + Math.random() * 200;
        const ny = 400 + Math.random() * 120;
        rings.push({ x: nx, y: ny, r: 48, used: false, type: "normal" });
      }
      try { spawnJuice(ring.x, ring.y, ring.type === "normal" ? "#ffcc44" : "#00e5ff", 8); } catch (e) {}
      // 速度は変えない（当たり判定で弾かれない）
    }
  }
}

function isLineBody(body) {
  if (!body) return false;
  if (body.label === "line") return true;
  if (body.parent && body.parent.label === "line") return true;
  return false;
}

function destroyFallingSpike(spikeBody) {
  if (!spikeBody) return;
  try { World.remove(world, spikeBody); } catch (e) {}
  const idx = spikes.indexOf(spikeBody);
  if (idx >= 0) spikes.splice(idx, 1);
  try {
    spawnJuice(spikeBody.position.x, spikeBody.position.y, "#ff8866", 10);
  } catch (e) {}
}

// 落下予定位置に壁・穴など他障害がないか
function canSpawnFallingSpikeAt(sx) {
  const range = 220;
  for (let i = 0; i < walls.length; i++) {
    if (Math.abs(walls[i].position.x - sx) < range) return false;
  }
  // 地面があるか（穴の上には落とさない）
  let hasGround = false;
  for (let i = 0; i < grounds.length; i++) {
    const g = grounds[i];
    const half = (g.bounds.max.x - g.bounds.min.x) / 2;
    if (sx >= g.position.x - half - 20 && sx <= g.position.x + half + 20) {
      hasGround = true;
      break;
    }
  }
  if (!hasGround) return false;
  // 他の落下トゲが近い
  for (let i = 0; i < spikes.length; i++) {
    if (Math.abs(spikes[i].position.x - sx) < range * 0.8) return false;
  }
  return true;
}

function spawnFallingSpikes() {
  const fallTimeSec = 0.85;
  const sx = player.position.x + (playerSpeed || 4) * 60 * fallTimeSec;
  pendingSpikeX = sx;
  if (!canSpawnFallingSpikeAt(sx)) {
    // 障害物があるので今回はスキップ
    spikeState = "cooldown";
    spikeTimer = 0;
    spikeCooldownTarget = SPIKE_COOLDOWN_MIN;
    try { endGimmick("spike"); } catch (e) {}
    return;
  }
  const sy = isGravityVisualFlipped() ? canvas.height + 20 : -20;
  const spikeW = 78; // 横幅を大きめに
  const spikeH = 64;
  const spike = Bodies.rectangle(sx, sy, spikeW, spikeH, {
    isStatic: false,
    friction: 0.01,
    restitution: 0,
    density: 0.008,
    label: "spike",
    inertia: Infinity
  });
  Body.setVelocity(spike, {
    x: playerSpeed * 0.3,
    y: isGravityVisualFlipped() ? -14 : 14
  });
  spikes.push(spike);
  World.add(world, spike);
}

function updateSpikeGimmick() {
  if (!currentConfig || !currentConfig.spikeEnabled) {
    if (spikeState !== "idle") {
      endGimmick("spike");
      spikeState = "idle";
    }
    return;
  }
  const startAt = currentConfig.spikeStartScore != null ? currentConfig.spikeStartScore : 100;
  if (score < startAt) return;

  spikeTimer++;

  if (spikeState === "idle") {
    const previewX = player.position.x + (playerSpeed || 4) * 60 * 0.85;
    if (!canSpawnFallingSpikeAt(previewX)) return; // 他障害物があるときは発生しない
    if (tryStartGimmick("spike")) {
      spikeState = "warning";
      spikeTimer = 0;
      pendingSpikeX = previewX;
    }
  } else if (spikeState === "warning") {
    pendingSpikeX = player.position.x + (playerSpeed || 4) * 60 * 0.85;
    const spikeWarnNeed = hasRelic("omen_eye") ? Math.floor(SPIKE_WARNING_FRAMES * 1.6) : SPIKE_WARNING_FRAMES;
    if (spikeTimer >= spikeWarnNeed) {
      if (!canSpawnFallingSpikeAt(pendingSpikeX)) {
        spikeState = "cooldown";
        spikeTimer = 0;
        spikeCooldownTarget = SPIKE_COOLDOWN_MIN;
        try { endGimmick("spike"); } catch (e) {}
      } else {
        spikeState = "falling";
        spikeTimer = 0;
        spawnFallingSpikes();
      }
    }
  } else if (spikeState === "falling") {
    if (spikeTimer >= SPIKE_FALL_FRAMES) {
      spikeState = "cooldown";
      spikeTimer = 0;
      spikeCooldownTarget = SPIKE_COOLDOWN_MIN + Math.floor(Math.random() * (SPIKE_COOLDOWN_MAX - SPIKE_COOLDOWN_MIN + 1));
    }
  } else if (spikeState === "cooldown") {
    if (spikeTimer >= spikeCooldownTarget) {
      spikeState = "idle";
      spikeTimer = 0;
      endGimmick("spike");
    }
  }
}

function drawRings() {
  const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 150);
  rings.forEach(ring => {
    const sx = ring.x - cameraX;
    if (sx < -80 || sx > canvas.width + 80) return;
    const isNormal = ring.type === "normal";
    if (isNormal && lineBoostFrames <= 0 && !ring.used) return;
    const size = ring.r * 2.2;
    const img = isNormal ? normalRingImage : ringImage;
    ctx.save();
    ctx.translate(sx, ring.y);
    if (ring.used) {
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalAlpha = pulse;
      ctx.shadowColor = isNormal ? "rgba(255, 200, 80, 0.7)" : "rgba(0, 220, 255, 0.7)";
      ctx.shadowBlur = 14;
    }
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = isNormal ? "#ffcc44" : "#00dcff";
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    ctx.restore();
  });

  if (lineBoostFrames > 0) {
    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#00e5ff";
    ctx.textAlign = "center";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 8;
    ctx.fillText("INK BOOST!", canvas.width / 2, 85);
    ctx.restore();
  }
}

function drawSpikes() {
  const drawW = 86;
  const drawH = 72;

  spikes.forEach(sp => {
    const sx = sp.position.x - cameraX;
    const sy = sp.position.y;
    if (sx < -60 || sx > canvas.width + 60) return;
    ctx.save();
    ctx.translate(sx, sy);
    if (spikeImage.complete && spikeImage.naturalWidth > 0) {
      if (isGravityVisualFlipped()) {
        ctx.scale(1, -1);
      }
      ctx.drawImage(spikeImage, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, drawH / 2);
      ctx.lineTo(-drawW / 2, -drawH / 2);
      ctx.lineTo(drawW / 2, -drawH / 2);
      ctx.closePath();
      ctx.fillStyle = "#c0392b";
      ctx.fill();
    }
    ctx.restore();
  });

  if (spikeState === "warning") {
    const flash = Math.sin(Date.now() / 80) > 0;
    const wx = pendingSpikeX - cameraX;
    ctx.save();
    if (flash && wx > -40 && wx < canvas.width + 40) {
      ctx.fillStyle = "rgba(255, 40, 40, 0.35)";
      const warningBaseY = isGravityVisualFlipped() ? 50 : canvas.height - 50;
      const warningEndY = isGravityVisualFlipped() ? canvas.height : canvas.height - 60;
      const warningStartY = isGravityVisualFlipped() ? 60 : 0;
      ctx.beginPath();
      ctx.ellipse(wx, warningBaseY, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 60, 60, 0.7)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, warningStartY);
      ctx.lineTo(wx, warningEndY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = flash ? "#ff3333" : "#ffaaaa";
    ctx.textAlign = "center";
    ctx.fillText("⚠ SPIKE! ⚠", canvas.width / 2, 40);
    ctx.restore();
  }
}

function updateWarpPickups() {
  for (const item of warpPickups) {
    if (item.taken) continue;
    const dx = player.position.x - item.x;
    const dy = player.position.y - item.y;
    if (dx * dx + dy * dy < (item.r + 18) * (item.r + 18)) {
      if (warpCount < WARP_MAX) {
        item.taken = true;
        warpCount++;
        updateWarpButtonUI();
      }
    }
  }
}

function useWarp() {
  if (!gameStarted || gameOver || gameCleared) return;
  if (warpCount <= 0) return;
  warpCount--;
  updateWarpButtonUI();
  const targetX = player.position.x + WARP_DISTANCE;
  const groundY = isGravityVisualFlipped() ? 100 : canvas.height - 100;
  const ty = isGravityVisualFlipped()
    ? Math.max(player.position.y, groundY)
    : Math.min(player.position.y, groundY);
  if (typeof window.DRAW_RUN !== "undefined" && window.DRAW_RUN.warpTo) {
  }
  Body.setPosition(player, { x: targetX, y: ty });
  Body.setVelocity(player, { x: playerSpeed || 4, y: 0 });
  cameraX = player.position.x - canvas.width * 0.22;
  smoothCameraX = cameraX;
  try { addShake(4); spawnJuice(targetX, ty, "#c090ff", 12); speedLines = 22; } catch (e) {}
  while (currentX < cameraX + canvas.width + 800) {
    generateSegment();
  }
}

function updateWarpButtonUI() {
  const btn = document.getElementById("warp-button");
  const countEl = document.getElementById("warp-count");
  if (countEl) countEl.textContent = String(warpCount);
  if (btn) {
    btn.classList.toggle("disabled", warpCount <= 0);
    btn.style.display = gameStarted && !gameOver && !gameCleared && !abilityChoiceOpen ? "flex" : "none";
  }
  updateInvulnButtonUI();
}

function drawWarpPickups() {
  warpPickups.forEach(item => {
    if (item.taken) return;
    const sx = item.x - cameraX;
    if (sx < -50 || sx > canvas.width + 50) return;
    const size = 44;
    ctx.save();
    ctx.translate(sx, item.y);
    const bob = Math.sin(Date.now() / 200) * 4;
    if (warpItemImage.complete && warpItemImage.naturalWidth > 0) {
      if (isGravityVisualFlipped()) {
        ctx.scale(1, -1);
      }
      ctx.drawImage(warpItemImage, -size / 2, -size / 2 + bob, size, size);
    } else {
      ctx.fillStyle = "#9b59b6";
      ctx.beginPath();
      ctx.arc(0, bob, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function updateGroundSpikeGimmick() {
  if (!currentConfig || !currentConfig.groundSpikeEnabled) {
    if (groundSpikeState !== "idle") {
      endGimmick("groundSpike");
      groundSpikeState = "idle";
      slowMoFactor = 1;
      groundSpikeHeight = 0;
      if (groundSpikeBody) {
        World.remove(world, groundSpikeBody);
        groundSpikeBody = null;
      }
    }
    return;
  }
  const startAt = currentConfig.groundSpikeStartScore != null ? currentConfig.groundSpikeStartScore : 80;
  if (score < startAt) return;

  groundSpikeTimer++;
  const groundTop = canvas.height - 80;

  if (groundSpikeState === "idle") {
    if (tryStartGimmick("groundSpike")) {
      groundSpikeState = "warning";
      groundSpikeTimer = 0;
      groundSpikeX = player.position.x + 100 + Math.random() * 80;
      groundSpikeHeight = 0;
      slowMoFactor = 0.35;
    }
  } else if (groundSpikeState === "warning") {
    groundSpikeX = player.position.x + 90 + Math.random() * 40;
    if (groundSpikeTimer >= GS_WARNING_FRAMES) {
      groundSpikeState = "pop";
      groundSpikeTimer = 0;
      slowMoFactor = 1;
      const h = 90;
      groundSpikeHeight = h;
      if (groundSpikeBody) World.remove(world, groundSpikeBody);
      const spikeBodyY = isGravityVisualFlipped()
        ? groundTop + h / 2
        : groundTop - h / 2;
      groundSpikeBody = Bodies.rectangle(groundSpikeX, spikeBodyY, 36, h, {
        isStatic: true,
        label: "spike"
      });
      World.add(world, groundSpikeBody);
    }
  } else if (groundSpikeState === "pop") {
    if (groundSpikeTimer >= GS_POP_FRAMES) {
      groundSpikeState = "cooldown";
      groundSpikeTimer = 0;
      groundSpikeHeight = 0;
      if (groundSpikeBody) {
        World.remove(world, groundSpikeBody);
        groundSpikeBody = null;
      }
      gsCooldownTarget = GS_COOLDOWN_MIN + Math.floor(Math.random() * (GS_COOLDOWN_MAX - GS_COOLDOWN_MIN + 1));
      endGimmick("groundSpike");
    }
  } else if (groundSpikeState === "cooldown") {
    if (groundSpikeTimer >= gsCooldownTarget) {
      groundSpikeState = "idle";
      groundSpikeTimer = 0;
    }
  }
}

function drawFakeFloors() {
  fakeFloors.forEach(ff => {
    const sx = ff.x - cameraX;
    if (sx < -ff.w || sx > canvas.width + ff.w) return;
    ctx.save();
    ctx.globalAlpha = 0.62;
    if (groundImage.complete && groundImage.naturalWidth > 0) {
      if (isGravityVisualFlipped()) {
        ctx.translate(sx, ff.y);
        ctx.scale(1, -1);
        ctx.drawImage(groundImage, -ff.w / 2, -ff.h / 2, ff.w, ff.h);
      } else {
        ctx.drawImage(groundImage, sx - ff.w / 2, ff.y - ff.h / 2, ff.w, ff.h);
      }
    } else {
      ctx.fillStyle = "#555";
      ctx.fillRect(sx - ff.w / 2, ff.y - ff.h / 2, ff.w, ff.h);
    }
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx - ff.w / 2, ff.y - ff.h / 2, ff.w, ff.h);
    ctx.restore();
  });
}

function drawGroundSpikeWarning() {
  if (groundSpikeState !== "warning" && groundSpikeState !== "pop") return;
  const sx = groundSpikeX - cameraX;
  const groundTop = isGravityVisualFlipped() ? 80 : canvas.height - 80;

  ctx.save();
  if (groundSpikeState === "warning") {
    const flash = Math.sin(Date.now() / 60) > 0;
    ctx.fillStyle = flash ? "rgba(255, 40, 40, 0.55)" : "rgba(255, 100, 50, 0.35)";
    ctx.beginPath();
    ctx.ellipse(sx, groundTop + 6, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff2222";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 25, groundTop);
    ctx.lineTo(sx, groundTop - 8);
    ctx.lineTo(sx + 25, groundTop);
    ctx.stroke();
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = flash ? "#ff3333" : "#ffaaaa";
    ctx.textAlign = "center";
    const watchTextY = isGravityVisualFlipped() ? 110 : canvas.height - 100;
    const slowTextY = isGravityVisualFlipped() ? canvas.height - 70 : 70;
    ctx.fillText("⚠ WATCH OUT! ⚠", canvas.width / 2, watchTextY);
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("SLOW MOTION", canvas.width / 2, slowTextY);
  } else if (groundSpikeState === "pop") {
    const h = groundSpikeHeight || 90;
    ctx.beginPath();
    if (isGravityVisualFlipped()) {
      ctx.moveTo(sx, groundTop + h);
      ctx.lineTo(sx - 22, groundTop);
      ctx.lineTo(sx + 22, groundTop);
    } else {
      ctx.moveTo(sx, groundTop - h);
      ctx.lineTo(sx - 22, groundTop);
      ctx.lineTo(sx + 22, groundTop);
    }
    ctx.closePath();
    ctx.fillStyle = "#8B0000";
    ctx.strokeStyle = "#ff6666";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function updateBlinkPlatforms() {
  for (let i = blinkPlatforms.length - 1; i >= 0; i--) {
    const bp = blinkPlatforms[i];
    if (bp.x < cameraX - 600) {
      if (bp.body) World.remove(world, bp.body);
      blinkPlatforms.splice(i, 1);
      continue;
    }
    bp.timer++;
    if (bp.state === "solid" && bp.timer >= bp.solidFrames) {
      bp.state = "warning";
      bp.timer = 0;
    } else if (bp.state === "warning" && bp.timer >= bp.warningFrames) {
      bp.state = "gone";
      if (bp.body) {
        World.remove(world, bp.body);
        bp.body = null;
      }
    }
  }
}

function drawBlinkPlatforms() {
  blinkPlatforms.forEach(bp => {
    if (bp.state === "gone") return;
    const sx = bp.x - cameraX;
    if (sx < -100 || sx > canvas.width + 100) return;
    const flash = bp.state === "warning" && Math.sin(Date.now() / 50) > 0;
    ctx.save();
    ctx.globalAlpha = bp.state === "warning" ? (flash ? 0.9 : 0.25) : 0.85;
    ctx.fillStyle = bp.state === "warning" ? "#ff6633" : "#cc4422";
    ctx.fillRect(sx - bp.w / 2, bp.y - bp.h / 2, bp.w, bp.h);
    ctx.strokeStyle = "#ffaa66";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - bp.w / 2, bp.y - bp.h / 2, bp.w, bp.h);
    if (bp.state === "warning") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", sx, bp.y + 4);
    }
    ctx.restore();
  });
}

function updateWindGimmick() {
  if (!currentConfig || !currentConfig.windEnabled) {
    if (windState !== "idle") {
      endGimmick("wind");
      windState = "idle";
    }
    return;
  }
  const startAt = currentConfig.windStartScore != null ? currentConfig.windStartScore : 20;
  if (score < startAt) return;

  windTimer++;

  if (windState === "idle") {
    if (tryStartGimmick("wind")) {
      windState = "warning";
      windTimer = 0;
      windDir = Math.random() < 0.7 ? -1 : 1; 
    }
  } else if (windState === "warning") {
    if (windTimer >= WIND_WARNING_FRAMES) {
      windState = "active";
      windTimer = 0;
    }
  } else if (windState === "active") {
    Body.setVelocity(player, {
      x: player.velocity.x,
      y: player.velocity.y + windDir * 0.55
    });
    if (windTimer >= WIND_ACTIVE_FRAMES) {
      windState = "cooldown";
      windTimer = 0;
      windCooldownTarget = WIND_COOLDOWN_MIN + Math.floor(Math.random() * (WIND_COOLDOWN_MAX - WIND_COOLDOWN_MIN + 1));
      endGimmick("wind");
    }
  } else if (windState === "cooldown") {
    if (windTimer >= windCooldownTarget) {
      windState = "idle";
      windTimer = 0;
    }
  }
}

function drawWindGimmick() {
  if (windState !== "warning" && windState !== "active") return;
  ctx.save();
  const flash = Math.sin(Date.now() / 80) > 0;
  if (windState === "warning") {
    ctx.fillStyle = flash ? "rgba(180, 220, 255, 0.2)" : "rgba(180, 220, 255, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#aaddff";
    ctx.textAlign = "center";
    ctx.fillText(windDir < 0 ? "↑ WIND ↑" : "↓ WIND ↓", canvas.width / 2, 100);
  } else {
    ctx.strokeStyle = "rgba(180, 220, 255, 0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const x = ((Date.now() / 8 + i * 50) % (canvas.width + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(x, windDir < 0 ? canvas.height : 0);
      ctx.lineTo(x + 20, windDir < 0 ? 0 : canvas.height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

