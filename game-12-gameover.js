// DRAW LINE RUN [12/17] game-12-gameover.js — ゲームオーバー／クリア処理
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function triggerGameOver() {
  if (gameOver || gameCleared) return;
  if (isReviving || isCountingDown) return; // 復活演出中の連続死亡を防ぐ
  if (freezeFrames > 0) return; // 時間停止中は無敵
  if (window.DRAW_RUN && window.DRAW_RUN.invincible) return;
  if (reviveInvulnFrames > 0) return;
  if (invulnActiveFrames > 0) return;
  // 一度復活
  if (reviveCharges > 0) {
    reviveCharges--;
    try { playDeathSfx(); } catch (e) {}
    startReviveSequence();
    return;
  }
  // レリック「保険」
  if (insuranceAvailable) {
    insuranceAvailable = false;
    currentRelic = currentRelic === "insurance" ? null : currentRelic;
    reviveInvulnFrames = 90;
    try {
      spawnJuice(player.position.x, player.position.y, "#88ffcc", 16);
      addShake(5);
    } catch (e) {}
    Body.setVelocity(player, { x: playerSpeed || 4, y: isGravityVisualFlipped() ? 6 : -6 });
    return;
  }
  gameOver = true;
  try {
    Body.setVelocity(player, { x: 0, y: 0 });
    Body.setAngularVelocity(player, 0);
  } catch (e) {}
  try { addShake(8); spawnJuice(player.position.x, player.position.y, "#ff4466", 22); } catch (e) {}
  // カメラ・進行を完全停止
  try {
    if (player) {
      smoothCameraX = player.position.x - canvas.width * 0.22;
      cameraX = smoothCameraX;
    }
  } catch (e) {}
  drawing = false;
  saveScore(score);
  try {
    recordStat("death");
    spawnResultFx(false);
  } catch (e) {}
  try { showResultMenu(); } catch (e) {}

  playBGM.pause();
  playDeathSfx();
}

function triggerGameClear() {
  if (gameOver || gameCleared) return;
  gameCleared = true;
  try {
    Body.setVelocity(player, { x: 0, y: 0 });
    Body.setAngularVelocity(player, 0);
  } catch (e) {}
  try {
    if (player) {
      smoothCameraX = player.position.x - canvas.width * 0.22;
      cameraX = smoothCameraX;
    }
  } catch (e) {}
  drawing = false;
  try { addShake(6); spawnJuice(player.position.x, player.position.y, "#33ff99", 26); stylePoints += 100; } catch (e) {}

  if (currentMode && currentMode.startsWith("stage")) {
    saveStageClear(currentMode);
  }
  try {
    recordStat("clear");
    recordStat("distance", score);
    spawnResultFx(true);
  } catch (e) {}
  try { showResultMenu(); } catch (e) {}
  // ステージクリア時：邪魔にならないアンケート案内
  if (currentMode && currentMode.startsWith("stage")) {
    try { showSurveyNudge(); } catch (e) {}
  }

  playBGM.pause();
  playClearSfx();
}

