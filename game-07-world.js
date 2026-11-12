// DRAW LINE RUN [7/17] game-07-world.js — ワールド初期化・地形生成
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function resetWorldForMode() {
  // 前回の重力反転状態を必ず通常状態へ戻してから新しいステージを初期化。
  setGravityWorldFlipped(false);
  engine.world.gravity.y = normalGravityY;

  grounds.forEach(g => World.remove(world, g));
  walls.forEach(w => World.remove(world, w));
  spikes.forEach(s => World.remove(world, s));
  grounds.length = 0;
  walls.length = 0;
  spikes.length = 0;
  rings.length = 0;
  warpPickups.length = 0;
  fakeFloors.length = 0;
  blinkPlatforms.forEach(bp => { if (bp.body) World.remove(world, bp.body); });
  blinkPlatforms.length = 0;
  warpCount = 0;
  reviveCharges = 0;
  reviveInvulnFrames = 0;
  freezeItemCount = 0;
  freezeFrames = 0;
  invulnCharges = 0;
  invulnActiveFrames = 0;
  lineExtendLevel = 0;
  stylePoints = 0; styleCombo = 0; styleComboTimer = 0;
  juiceParticles = []; shakeMag = 0; speedLines = 0; smoothCameraX = 0; milestoneNext = 50; milestoneFx = null;
  abilityChoiceOpen = false;
  abilityChoiceTriggeredStart = false;
  abilityMilestonesDone = {};
  currentRelic = null;
  rogueSelectMode = null;
  insuranceAvailable = false;
  cardMilestonesDone = {};
  isReviving = false;
  isCountingDown = false;
  windState = "idle";
  windTimer = 0;
  lineBoostFrames = 0;
  spikeState = "idle";
  spikeTimer = 0;
  pendingSpikeX = 0;
  groundSpikeState = "idle";
  groundSpikeTimer = 0;
  groundSpikeHeight = 0;
  slowMoFactor = 1;
  if (groundSpikeBody) {
    World.remove(world, groundSpikeBody);
    groundSpikeBody = null;
  }

  currentLines.forEach(l => World.remove(world, l));
  currentLines.length = 0;

  Body.setPosition(player, { x: 200, y: canvas.height / 2 });
  Body.setVelocity(player, { x: 0, y: 0 });

  currentX = 0;
  lastObstacleX = 0;
  cameraX = 0;
  score = 0;
  stoppedTime = 0;
  airborneFrames = 0;
  upperZoneFrames = 0;
  isTouchingGroundOrLine = false;
  gameOver = false;
  gameCleared = false;
  drawing = false;
  lastPoint = null;
  currentDrawLength = 0;
  lastReleaseTime = 0;

  laserState = "idle";
  laserTimer = 0;
  laserSafeLane = 1;
  gravityReverseState = "idle";
  activeGimmick = null;
  gimmickSuppressFrames = 0;
  sealFxStart = 0; sealFxPending = false;
  gravityFlipStart = 0; gravityFlipLast = 0; gravityActiveFrames = 0; gravityHud = null;
  gravityWorldFlipped = false;
  engine.world.gravity.y = normalGravityY;
  const warnEl = document.getElementById("gravity-warning");
  if (warnEl) warnEl.classList.add("hidden");

  timeAccumulator = 0;
  lastFrameTime = performance.now();

  for (let i = 0; i < 15; i++) {
    generateSegment();
  }
}

function generateSegment() {
  if (!currentConfig) return;

  // 通常時は下、重力反転中は上を新しい地面として使う。
  const currentGroundY = gravityWorldFlipped ? 40 : canvas.height - 40;
  const groundHeight = 80;
  const cfg = currentConfig;

  if (!cfg.isInfinite) {
    const targetX = (cfg.targetScore * 100) + 200 + 1200; 
    if (currentX > targetX) {
      const ground = Bodies.rectangle(
        currentX + segmentWidth / 2,
        currentGroundY,
        segmentWidth,
        groundHeight,
        { isStatic: true, label: "ground" }
      );
      grounds.push(ground);
      World.add(world, ground);
      currentX += segmentWidth;
      return;
    }
  }

  if (currentX <= 1200) {
    const ground = Bodies.rectangle(
      currentX + segmentWidth / 2,
      currentGroundY,
      segmentWidth,
      groundHeight,
      { isStatic: true, label: "ground" }
    );
    grounds.push(ground);
    World.add(world, ground);
    currentX += segmentWidth;
    return;
  }

  const distanceSinceLastObstacle = currentX - lastObstacleX;
  const isSafeZoneOver = distanceSinceLastObstacle >= cfg.minSafeDistance;

  if (!isSafeZoneOver) {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    currentX += segmentWidth;
    return;
  }

  const rand = Math.random();
  let boostRingChance = (cfg.ringEnabled && cfg.ringChance) ? cfg.ringChance : 0;
  let normalRingChance = (cfg.ringEnabled && cfg.normalRingChance) ? cfg.normalRingChance : 0;
  if (hasRelic("lucky_ring")) {
    boostRingChance = Math.min(0.55, boostRingChance * 1.7 + 0.06);
    normalRingChance = Math.min(0.4, normalRingChance * 1.7 + 0.04);
  }
  const fakeChance = (cfg.fakeFloorEnabled && cfg.fakeFloorChance) ? cfg.fakeFloorChance : 0;
  const groundEdgeY = gravityWorldFlipped
    ? currentGroundY + groundHeight / 2
    : currentGroundY - groundHeight / 2;

  function placeWarpItem(gx) {
    if (!cfg.warpItemEnabled) return;
    if (Math.random() > (cfg.warpItemChance || 0.35)) return;
    warpPickups.push({
      x: gx,
      y: gravityWorldFlipped
        ? 180 + Math.random() * 100
        : 420 + Math.random() * 100,
      r: 28,
      taken: false
    });
  }

  if (fakeChance > 0 && rand < fakeChance) {
    const fw = segmentWidth;
    fakeFloors.push({
      x: currentX + fw / 2,
      y: currentGroundY,
      w: fw,
      h: groundHeight
    });
    currentX += segmentWidth;
    lastObstacleX = currentX;

  } else if (boostRingChance > 0 && rand < fakeChance + boostRingChance) {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    const ringX = currentX + segmentWidth / 2;
    const ringY = gravityWorldFlipped
      ? 180 + Math.random() * 120
      : 400 + Math.random() * 120;
    rings.push({ x: ringX, y: ringY, r: 48, used: false, type: "boost" });
    placeWarpItem(ringX);
    currentX += segmentWidth;
    lastObstacleX = currentX;

  } else if (normalRingChance > 0 && lineBoostFrames > 0 && rand < fakeChance + boostRingChance + normalRingChance) {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    const ringX = currentX + segmentWidth / 2;
    const ringY = gravityWorldFlipped
      ? 180 + Math.random() * 120
      : 400 + Math.random() * 120;
    rings.push({ x: ringX, y: ringY, r: 48, used: false, type: "normal" });
    placeWarpItem(ringX);
    currentX += segmentWidth;
    lastObstacleX = currentX;

  } else if (rand < fakeChance + cfg.holeChance + boostRingChance + (lineBoostFrames > 0 ? normalRingChance : 0)) {
    let maxSafeHoleSize = maxDrawLength * cfg.maxHoleWidthFactor;
    let holeWidth = cfg.minHoleWidth + Math.random() * (maxSafeHoleSize - cfg.minHoleWidth);
    if (hasRelic("iron_boots")) holeWidth *= 0.72;
    const leftWidth = 100;
    const leftGround = Bodies.rectangle(currentX + leftWidth / 2, currentGroundY, leftWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(leftGround);
    World.add(world, leftGround);
    currentX += leftWidth + holeWidth;
    const rightWidth = 150;
    const rightCenter = currentX + rightWidth / 2;
    const rightGround = Bodies.rectangle(rightCenter, currentGroundY, rightWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(rightGround);
    World.add(world, rightGround);
    placeWarpItem(rightCenter);
    currentX += rightWidth;
    lastObstacleX = currentX;

  } else {
    const ground = Bodies.rectangle(currentX + segmentWidth / 2, currentGroundY, segmentWidth, groundHeight, { isStatic: true, label: "ground" });
    grounds.push(ground);
    World.add(world, ground);
    const targetX = currentX + segmentWidth / 2;
    const maxWallH = Math.min(cfg.wallHeightMax, Math.floor(canvas.height * 0.25));
    const minWallH = Math.min(Math.max(cfg.wallHeightMin, 40), maxWallH);
    const randomWallHeight = minWallH + Math.random() * (maxWallH - minWallH);
    const currentWallY = gravityWorldFlipped
      ? groundEdgeY + randomWallHeight / 2
      : groundEdgeY - randomWallHeight / 2;
    const wall = Bodies.rectangle(targetX, currentWallY, 40, randomWallHeight, { isStatic: true, label: "wall" });
    walls.push(wall);
    World.add(world, wall);
    placeWarpItem(targetX + 70);
    currentX += segmentWidth;
    lastObstacleX = currentX;
  }

  if (cfg.blinkPlatformEnabled && Math.random() < (cfg.blinkPlatformChance || 0.25)) {
    const bx = currentX + 80;
    const by = gravityWorldFlipped
      ? currentGroundY + 120 + Math.random() * 100
      : currentGroundY - 120 - Math.random() * 100;
    const bw = 120 + Math.random() * 60;
    const bh = 22;
    const body = Bodies.rectangle(bx, by, bw, bh, { isStatic: true, label: "ground" });
    World.add(world, body);
    blinkPlatforms.push({
      body: body,
      x: bx, y: by, w: bw, h: bh,
      state: "solid", 
      timer: 0,
      solidFrames: 120 + Math.floor(Math.random() * 90),
      warningFrames: 50
    });
  }

  // 反転中の新しい地形は currentGroundY が上側になるため、
  // ここで既存オブジェクトを移動する必要はない。
}

