// DRAW LINE RUN [15/17] game-15-loop.js — 固定ステップ更新・メインループ
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function fixedUpdate() {
  if (gameOver || gameCleared) {
    try {
      Body.setVelocity(player, { x: 0, y: 0 });
      Body.setAngularVelocity(player, 0);
    } catch (e) {}
    // シェイクだけ減衰（画面が揺れ続けるのを防ぐ）
    try {
      if (shakeMag > 0.05) {
        shakeX = (Math.random() - 0.5) * shakeMag * 2;
        shakeY = (Math.random() - 0.5) * shakeMag * 2;
        shakeMag *= 0.75;
      } else {
        shakeX = shakeY = shakeMag = 0;
      }
    } catch (e) {}
    return;
  }
  if (abilityChoiceOpen || isReviving || isCountingDown) {
    try { Body.setVelocity(player, { x: 0, y: 0 }); } catch (e) {}
    return;
  }

  const baseGrav = normalGravityY;
  const cfg = currentConfig;
  if (!cfg) return;

  // 時間停止：プレイヤーはその場固定＋無敵、障害物・ギミックは動かす
  if (reviveInvulnFrames > 0) reviveInvulnFrames--;
  if (gimmickSuppressFrames > 0) gimmickSuppressFrames--;
  if (invulnActiveFrames > 0) invulnActiveFrames--;
  try { updateJuice(); } catch (e) {}
  try { updateRunFx(); } catch (e) {}
  if (!gameOver && !gameCleared && !isReviving && !isCountingDown) {
    try { checkNearMissJuice(); } catch (e) {}
  }

  if (freezeFrames > 0) {
    freezeFrames--;
    try {
      Body.setPosition(player, { x: freezeHoldX, y: freezeHoldY });
      Body.setVelocity(player, { x: 0, y: 0 });
      Body.setAngle(player, 0);
    } catch (e) {}
    cameraX = freezeHoldX - canvas.width * 0.1;
    stoppedTime = 0;
    airborneFrames = 0;
    upperZoneFrames = 0;
    engine.world.gravity.y = normalGravityY;

    // ギミックは通常通り進行
    updateLaserGimmick();
    updateGravityReverseGimmick();
    updateSpikeGimmick();
    updateGroundSpikeGimmick();
    updateRings();
    updateWarpPickups();
    updateBlinkPlatforms();
    updateWindGimmick();

    Engine.update(engine, FIXED_DT_MS);

    // 物理後もプレイヤーを固定（無敵は triggerGameOver 側）
    try {
      Body.setPosition(player, { x: freezeHoldX, y: freezeHoldY });
      Body.setVelocity(player, { x: 0, y: 0 });
      Body.setAngle(player, 0);
    } catch (e) {}
    updateInvulnButtonUI();
    return;
  }

  let speedMul = 1;
  if (isTouchingBoostLine) { speedMul = 1.75; speedLines = 18; }
  else if (isTouchingLine) { speedMul = 1.28; speedLines = Math.max(speedLines, 8); if (__juiceTick % 2 === 0) spawnTrailSpark(player.position.x, player.position.y + 11); }
  const debugSpeed = (window.DRAW_RUN && window.DRAW_RUN.speedMul != null) ? window.DRAW_RUN.speedMul : 1;
  playerSpeed = cfg.baseSpeed * speedMul * debugSpeed;
  if (hasRelic("sprint")) playerSpeed *= 1.14;
  let vyOut = player.velocity.y;
  // 氷ステージ：接地中は横滑り（制御しにくい）
  if (cfg.iceSlip && isTouchingGroundOrLine && !isTouchingLine) {
    vyOut = player.velocity.y * 0.98;
  }
  Body.setVelocity(player, { x: playerSpeed, y: vyOut });
  {
    const camTarget = player.position.x - canvas.width * 0.22;
    if (!smoothCameraX) smoothCameraX = camTarget;
    smoothCameraX += (camTarget - smoothCameraX) * 0.14;
    cameraX = smoothCameraX;
  }

  // 通常重力中だけ上半分に長時間いる判定を行う。
  // 重力反転中は上側が通常の「床」になるため、この判定を無効化する。
  if (gravityReverseState !== "active" && gravityReverseState !== "warning") {
    if (player.position.y < canvas.height / 2) {
      upperZoneFrames++;
      if (upperZoneFrames >= 300) {
        triggerGameOver();
      }
    } else {
      upperZoneFrames = 0;
    }
  } else {
    upperZoneFrames = 0;
  }

  if (gravityReverseState !== "active" && gravityReverseState !== "warning") {
    if (isTouchingGroundOrLine) {
      airborneFrames = 0;
    } else {
      airborneFrames++;
    }

    if (airborneFrames > cfg.airborneGravityStart) {
      let gi = cfg.gravityIncrease;
      if (hasRelic("light_body")) gi *= 0.45;
      const extraWeight = Math.min(airborneFrames - cfg.airborneGravityStart, 100) * gi;
      engine.world.gravity.y = baseGrav + extraWeight;
    } else {
      engine.world.gravity.y = baseGrav;
    }
  }

  updateLaserGimmick();
  updateGravityReverseGimmick();
  updateSpikeGimmick();
  updateGroundSpikeGimmick();
  updateRings();
  updateWarpPickups();
  updateBlinkPlatforms();
  updateWindGimmick();

  Engine.update(engine, FIXED_DT_MS);

  Body.setAngle(player, 0);

  cameraX = player.position.x - canvas.width * 0.1;
  score = Math.max(0, Math.floor((player.position.x - 200) / 100));

  checkAbilityChoiceTriggers();

  if (!cfg.isInfinite && score >= cfg.targetScore) {
    triggerGameClear();
  }

  if (currentX < cameraX + canvas.width + 800) {
    generateSegment();
  }

  for (let i = grounds.length - 1; i >= 0; i--) {
    if (grounds[i].position.x < cameraX - 600) {
      World.remove(world, grounds[i]);
      grounds.splice(i, 1);
    }
  }
  for (let i = walls.length - 1; i >= 0; i--) {
    if (walls[i].position.x < cameraX - 600) {
      World.remove(world, walls[i]);
      walls.splice(i, 1);
    }
  }
  for (let i = spikes.length - 1; i >= 0; i--) {
    if (spikes[i].position.y > canvas.height + 300 || spikes[i].position.x < cameraX - 600) {
      World.remove(world, spikes[i]);
      spikes.splice(i, 1);
    }
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    if (rings[i].x < cameraX - 600) rings.splice(i, 1);
  }
  for (let i = warpPickups.length - 1; i >= 0; i--) {
    if (warpPickups[i].x < cameraX - 600 || warpPickups[i].taken) warpPickups.splice(i, 1);
  }
  for (let i = fakeFloors.length - 1; i >= 0; i--) {
    if (fakeFloors[i].x < cameraX - 600) fakeFloors.splice(i, 1);
  }

  if (player.position.y > canvas.height + 200) {
    triggerGameOver();
  }

  if (freezeFrames > 0 || abilityChoiceOpen || isReviving) {
    stoppedTime = 0;
  } else if (Math.abs(player.velocity.x) < 0.5) {
    stoppedTime += FIXED_DT_SEC;
  } else {
    stoppedTime = 0;
  }
  if (stoppedTime >= 3) {
    triggerGameOver();
  }
}

function gameLoop(now) {
  if (now == null) now = performance.now();
  let frameDelta = now - lastFrameTime;
  lastFrameTime = now;
  if (frameDelta > MAX_FRAME_MS) frameDelta = MAX_FRAME_MS;
  if (frameDelta < 0) frameDelta = 0;

  if (gameStarted) {
    if (!gameOver && !gameCleared) {
      timeAccumulator += frameDelta * (typeof slowMoFactor === "number" ? slowMoFactor : 1);
      while (timeAccumulator >= FIXED_DT_MS) {
        fixedUpdate();
        timeAccumulator -= FIXED_DT_MS;
      }
    } else {
      // 死亡・クリア後は物理・進行を止め、プレイヤーを固定
      timeAccumulator = 0;
      try {
        Body.setVelocity(player, { x: 0, y: 0 });
        Body.setAngularVelocity(player, 0);
        Body.setAngle(player, 0);
      } catch (e) {}
      try {
        if (shakeMag > 0.05) {
          shakeX = (Math.random() - 0.5) * shakeMag * 2;
          shakeY = (Math.random() - 0.5) * shakeMag * 2;
          shakeMag *= 0.75;
        } else {
          shakeX = shakeY = shakeMag = 0;
        }
      } catch (e) {}
    }
  }

  if (drawing) {
    const elapsedTime = Date.now() - drawStartTime;
    if (elapsedTime >= getEffectiveMaxDrawTime()) releaseLines();
  }

  if (!gameStarted) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(shakeX || 0, shakeY || 0);

  const activeBg = getActiveBackground();
  if (gameStarted && activeBg && activeBg.procedural === "volcano") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#1a0508");
    g.addColorStop(0.45, "#4a1208");
    g.addColorStop(0.75, "#8B2500");
    g.addColorStop(1, "#2a0800");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.15 + 0.05 * Math.sin(Date.now() / 400);
    ctx.fillStyle = "#ff4400";
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    ctx.globalAlpha = 1;
  } else if (gameStarted && currentConfig && currentConfig.bgFixed === "ice") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#d8f0ff");
    g.addColorStop(0.4, "#b8e0f8");
    g.addColorStop(0.75, "#e8f6ff");
    g.addColorStop(1, "#f5fcff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 73 + cameraX * 0.2) % canvas.width + canvas.width) % canvas.width;
      const sy = (i * 41 + Date.now() / 40) % canvas.height;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (gameStarted && activeBg && activeBg.procedural === "void") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#020208");
    g.addColorStop(0.5, "#0a1028");
    g.addColorStop(1, "#120818");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(200,220,255,0.7)";
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 97 + cameraX * 0.05) % canvas.width + canvas.width) % canvas.width;
      const sy = (i * 53) % canvas.height;
      ctx.fillRect(sx, sy, 2, 2);
    }
  } else if (gameStarted && activeBg && activeBg.complete && activeBg.width > 0) {
    const bgSpeed = 0.3;
    const bgHeight = canvas.height;
    const bgWidth = activeBg.width * (canvas.height / activeBg.height);
    let bgX = -((cameraX * bgSpeed) % bgWidth);
    if (bgX > 0) bgX -= bgWidth;

    ctx.drawImage(activeBg, bgX, 0, bgWidth, bgHeight);
    ctx.drawImage(activeBg, bgX + bgWidth - 1, 0, bgWidth, bgHeight);
    ctx.drawImage(activeBg, bgX + bgWidth * 2 - 2, 0, bgWidth, bgHeight);
  } else if (gameStarted) {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ===== ゲーム世界の描画 =====
  // 物理座標そのものを反転済みなので、ここでは通常の描画を行う。
  // 重力反転の瞬間は、世界（地形・障害物）だけを上下に回転させて切り替える。プレイヤーは回さない。
  const __flipS = getGravityFlipScaleY();
  const __flipping = __flipS !== 1;
  const __beginFlip = () => {
    ctx.save();
    ctx.translate(0, canvas.height / 2);
    ctx.scale(1, __flipS);
    ctx.translate(0, -canvas.height / 2);
  };
  if (__flipping) __beginFlip();
  grounds.forEach((ground) => { drawBody(ground, "black"); });
  walls.forEach((wall) => { drawBody(wall, "gray"); });

  world.bodies.forEach((body) => {
    if (body !== player && !grounds.includes(body) && !walls.includes(body) && body.label !== "spike") {
      drawBody(body, body._boosted ? "#00e5ff" : "black");
    }
  });

  if (__flipping) ctx.restore();
  drawBody(player, "red");
  if (__flipping) __beginFlip();

  if (!gameOver && !gameCleared) {
    drawGoal();
  }

  if (!gameOver && !gameCleared) {
    drawFakeFloors();
    drawBlinkPlatforms();
    drawWarpPickups();
    drawRings();
    drawSpikes();
    drawGroundSpikeWarning();
    drawWindGimmick();
  }
  if (__flipping) ctx.restore();

  if (!gameOver && !gameCleared) {
    drawLaserGimmick();
  }

  // 重力反転中の画面全体を薄く着色して状態を分かりやすくする
  drawGravityReverseOverlay();
  drawGravityFlipFx();
  drawGimmickBanners();
  drawSealFx();

  updateWarpButtonUI();

  if (gameOver || gameCleared) {
    ctx.save();
    // 画面揺れの移動量を打ち消して、暗幕と文字は常に画面に固定する
    ctx.translate(-(shakeX || 0), -(shakeY || 0));

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 48px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (gameCleared) {
      ctx.shadowColor = "rgba(0, 255, 150, 0.8)";
      ctx.shadowBlur = 20;
      const gradient = ctx.createLinearGradient(
        canvas.width / 2, canvas.height / 2 - 60,
        canvas.width / 2, canvas.height / 2 + 20
      );
      gradient.addColorStop(0, "#33ff99");
      gradient.addColorStop(1, "#00aa55");
      ctx.fillStyle = gradient;
      ctx.fillText("STAGE CLEAR!", canvas.width / 2, canvas.height / 2 - 48);
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#b8ffd8";
      if (stylePoints > 0) ctx.fillText("STYLE " + stylePoints + " pts", canvas.width / 2, canvas.height / 2 - 12);

      ctx.shadowBlur = 0;
      ctx.font = "bold 20px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${currentConfig.name}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText(`SCORE : ${score}m`, canvas.width / 2, canvas.height / 2 + 40);
    } else {
      ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
      ctx.shadowBlur = 20;
      const gradient = ctx.createLinearGradient(
        canvas.width / 2, canvas.height / 2 - 60,
        canvas.width / 2, canvas.height / 2 + 20
      );
      gradient.addColorStop(0, "#ff3333");
      gradient.addColorStop(1, "#990000");
      ctx.fillStyle = gradient;
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);

      ctx.shadowBlur = 0;
      ctx.font = "bold 22px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`SCORE : ${score}m`, canvas.width / 2, canvas.height / 2 + 25);
    }

    // ボタンは HTML #result-menu（ポップUI）

    // 演出パーティクル
    updateAndDrawResultFx();

    ctx.restore();
    ctx.textAlign = "left";
  } else if (resultFx.length) {
    updateAndDrawResultFx();
  }

  ctx.save();

  ctx.save();

  // 左上：距離パネルのみ（コンパクト）
  const panelX = 10;
  const panelY = 10;
  const panelW = 150;
  const panelH = 64;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+2, panelY+3, panelW, panelH, 14); ctx.fill(); }
  const pg = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  pg.addColorStop(0, "rgba(255,255,255,0.95)");
  pg.addColorStop(1, "rgba(235,248,255,0.95)");
  ctx.fillStyle = pg;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 14); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(panelX, panelY, panelW, panelH); }

  ctx.fillStyle = "#3b9eff";
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+8, panelY+8, 48, 18, 7); ctx.fill(); }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DISTANCE", panelX+32, panelY+20);

  // ライフは右端に小さく
  // 「一度復活」の残り回数 + レリック「保険」(未使用なら+1)
  const lives = Math.max(0, Number(reviveCharges) || 0) + (insuranceAvailable ? 1 : 0);
  ctx.textAlign = "right";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = lives > 0 ? "#ff4d6d" : "rgba(255,120,140,0.5)";
  ctx.fillText(lives > 0 ? ("♥"+lives) : "♥0", panelX + panelW - 10, panelY + 21);

  ctx.textAlign = "left";
  ctx.fillStyle = "#1a3a6a";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(score + "m", panelX+12, panelY+48);

  if (currentConfig && !currentConfig.isInfinite && currentConfig.targetScore) {
    ctx.fillStyle = "#6a8aaa";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("/ " + currentConfig.targetScore + "m", panelX+78, panelY+46);
    const ratio = Math.max(0, Math.min(1, score / currentConfig.targetScore));
    ctx.fillStyle = "rgba(59,158,255,0.18)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+10, panelY+54, panelW-20, 5, 3); ctx.fill(); }
    ctx.fillStyle = "#3b9eff";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX+10, panelY+54, (panelW-20)*ratio, 5, 3); ctx.fill(); }
  }

  // レリック表示
  if (ROGUE_ENABLED && currentRelic && RELIC_DEFS[currentRelic]) {
    ctx.save();
    ctx.textAlign = "left";
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(RELIC_DEFS[currentRelic].name, 12, canvas.height - 18);
    ctx.restore();
  }

  // スタイルコンボ
  if (styleCombo > 1) {
    ctx.save();
    ctx.textAlign = "right";
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#ffe566";
    ctx.shadowColor = "#ff9900";
    ctx.shadowBlur = 10;
    ctx.fillText("STYLE x" + styleCombo, canvas.width - 16, 38);
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#fff0a8";
    ctx.fillText(stylePoints + " pts", canvas.width - 16, 56);
    ctx.restore();
  }
  // 無敵リング
  if (invulnActiveFrames > 0 && player) {
    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 70);
    ctx.save();
    ctx.strokeStyle = "rgba(255,210,50," + pulse + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.position.x - cameraX, player.position.y, 26 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  try { drawJuice(); } catch (e) {}

  ctx.restore(); // shake

  requestAnimationFrame(gameLoop);
}

