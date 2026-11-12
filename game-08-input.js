// DRAW LINE RUN [8/17] game-08-input.js — 線を描く入力処理
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
let drawing = false;
let lastPoint = null;
const currentLines = [];
let currentDrawLength = 0;
const maxDrawTime = 3000;
let drawStartTime = 0;

function releaseLines() {
  if (!drawing) return;
  drawing = false;
  lastPoint = null;
  lastReleaseTime = Date.now();

  if (currentLines.length > 0) {
    const combinedLine = Body.create({
      parts: [...currentLines],
      isStatic: false, 
      friction: 1.2,
      frictionStatic: 1.5,
      restitution: 0,
      density: 0.003,
      label: "line"
    });

    currentLines.forEach((line) => {
      World.remove(world, line);
    });
    currentLines.length = 0;

    if (lineBoostFrames > 0) combinedLine._boosted = true;
    currentLines.push(combinedLine);
    World.add(world, combinedLine);

    let life = (lineBoostFrames > 0) ? LINE_BOOST_LIFETIME : LINE_NORMAL_LIFETIME;
    if (hasRelic("long_brush")) life = Math.floor(life * 1.35);
    setTimeout(() => {
      World.remove(world, combinedLine);
      const index = currentLines.indexOf(combinedLine);
      if (index !== -1) {
        currentLines.splice(index, 1);
      }
    }, life);
  }
}

function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrawing(clientX, clientY) {
  if (!gameStarted) return;
  if (gameOver || gameCleared) return;

  const timeSinceLastRelease = Date.now() - lastReleaseTime;
  if (timeSinceLastRelease < cooldownDuration) return; 

  const pt = getCanvasPoint(clientX, clientY);

  drawing = true;
  currentDrawLength = 0;
  drawStartTime = Date.now();
  lastPoint = { x: pt.x + cameraX, y: pt.y };
}

function moveDrawing(clientX, clientY) {
  if (!drawing) return;

  const elapsedTime = Date.now() - drawStartTime;
  if (elapsedTime >= getEffectiveMaxDrawTime()) {
    releaseLines();
    return;
  }

  const pt = getCanvasPoint(clientX, clientY);
  const currentPoint = { x: pt.x + cameraX, y: pt.y };
  const dx = currentPoint.x - lastPoint.x;
  const dy = currentPoint.y - lastPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 1.5) return;

  const maxLen = lineBoostFrames > 0
    ? LINE_BOOST_MAX_LEN * (1 + 0.2 * Math.min(LINE_EXTEND_MAX, lineExtendLevel || 0))
    : getEffectiveMaxDrawLength();
  if (currentDrawLength + length > maxLen) return;

  const thickness = lineBoostFrames > 0 ? LINE_BOOST_THICKNESS : LINE_NORMAL_THICKNESS;
  const boosted = lineBoostFrames > 0;

  const stepLen = 4;
  const steps = Math.max(1, Math.ceil(length / stepLen));
  let fromX = lastPoint.x;
  let fromY = lastPoint.y;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const toX = lastPoint.x + dx * t;
    const toY = lastPoint.y + dy * t;
    const segDx = toX - fromX;
    const segDy = toY - fromY;
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
    if (segLen < 1) continue;
    if (currentDrawLength + segLen > maxLen) break;
    currentDrawLength += segLen;

    const angle = Math.atan2(segDy, segDx);
    const line = Bodies.rectangle(
      (fromX + toX) / 2,
      (fromY + toY) / 2,
      segLen,
      thickness,
      { isStatic: true, angle: angle, friction: 1.5, density: 0.004, frictionStatic: 2.0, label: "line" }
    );
    if (boosted) line._boosted = true;
    currentLines.push(line);
    World.add(world, line);
    fromX = toX;
    fromY = toY;
  }

  lastPoint = currentPoint;
}


