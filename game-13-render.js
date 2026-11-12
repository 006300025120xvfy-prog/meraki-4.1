// DRAW LINE RUN [13/17] game-13-render.js — 描画（重力反転オーバーレイ・本体・背景）
// ※全ファイルは同じグローバルスコープを共有します。index.html の読み込み順を変えないでください。
function drawGravityReverseOverlay() {
  if (gravityReverseState !== "warning" && gravityReverseState !== "active") return;

  const now = Date.now();
  const isWarn = gravityReverseState === "warning";
  // 警告中の進み具合（0→1）
  const prog = (isWarn && gravityHud)
    ? Math.max(0, Math.min(1, 1 - gravityHud.remain / gravityHud.total))
    : 1;
  const pulse = 0.5 + 0.5 * Math.sin(now / (isWarn ? 170 - 90 * prog : 220));
  const alpha = isWarn ? (0.03 + prog * 0.07 + pulse * 0.02) : (0.12 + pulse * 0.04);

  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `rgba(150, 90, 255, ${alpha * 0.7})`);
  gradient.addColorStop(0.5, `rgba(90, 170, 255, ${alpha})`);
  gradient.addColorStop(1, `rgba(150, 90, 255, ${alpha * 0.7})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 警告中：天井側が光る（ここが次の「床」になる）
  if (isWarn) {
    const bandH = 40 + 90 * prog;
    const g2 = ctx.createLinearGradient(0, 0, 0, bandH);
    g2.addColorStop(0, `rgba(200, 130, 255, ${0.18 + 0.42 * prog * (0.6 + 0.4 * pulse)})`);
    g2.addColorStop(1, "rgba(200, 130, 255, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, canvas.width, bandH);
  }

  // 画面の左右に「上向きの矢印」が流れ、上に引っ張られることを知らせる
  ctx.fillStyle = `rgba(215, 175, 255, ${isWarn ? 0.15 + 0.35 * prog : 0.16})`;
  for (let side = 0; side < 2; side++) {
    const cx = side === 0 ? 16 : canvas.width - 16;
    for (let i = 0; i < 5; i++) {
      const y = canvas.height - (((now / 5) + i * (canvas.height / 5)) % canvas.height);
      ctx.beginPath();
      ctx.moveTo(cx, y - 9);
      ctx.lineTo(cx + 9, y + 5);
      ctx.lineTo(cx - 9, y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (!isWarn) {
    ctx.strokeStyle = `rgba(190, 120, 255, ${0.28 + pulse * 0.12})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// 重力反転アニメ：世界がくるっと回って切り替わる（scaleYが -1 → 1）。通常時は 1 を返す
function getGravityFlipScaleY() {
  if (!gravityFlipStart) return 1;
  const t = (Date.now() - gravityFlipStart) / GFLIP_MS;
  if (t >= 1) return 1;
  const e = 0.5 - 0.5 * Math.cos(Math.PI * t);      // イーズイン・アウト
  let sy = -Math.cos(Math.PI * e);                  // -1 → 1
  if (Math.abs(sy) < 0.03) sy = sy < 0 ? -0.03 : 0.03;
  return sy;
}

// 反転した瞬間のフラッシュ・文字・猶予リング
function drawGravityFlipFx() {
  if (!gravityFlipLast) return;
  const now = Date.now();
  const el = now - gravityFlipLast;
  if (el > 1100) return;
  const toA = gravityFlipToActive;
  const rgb = toA ? "190,120,255" : "110,190,255";

  if (el < GFLIP_MS) {
    const t = el / GFLIP_MS;
    ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - t) * (1 - t)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(${rgb},${0.25 * (1 - t)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 世界が回る軸（中央の光の線）
    const line = 1 - Math.abs(getGravityFlipScaleY());
    ctx.fillStyle = `rgba(255,255,255,${0.75 * line})`;
    ctx.fillRect(0, canvas.height / 2 - 2, canvas.width, 4);
  }

  if (el < 1000) {
    const t = el / 1000;
    const pop = t < 0.15 ? t / 0.15 : 1;
    const fade = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.30);
    const sc = 0.6 + 0.4 * pop;
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.max(0, fade);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 30px 'Helvetica Neue', Arial, sans-serif";
    ctx.shadowColor = `rgba(${rgb},0.95)`;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(toA ? "GRAVITY REVERSE!" : "GRAVITY NORMAL", 0, 0);
    ctx.shadowBlur = 0;
    ctx.font = "bold 14px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = `rgba(${rgb},1)`;
    ctx.fillText(toA ? "天井が新しい床になった！" : "床が元に戻った！", 0, 28);
    ctx.restore();
  }

  // 猶予（無敵）の間はプレイヤーのまわりにリング
  if (el < GFLIP_GRACE_FRAMES * (1000 / 60) && player) {
    const t = el / (GFLIP_GRACE_FRAMES * (1000 / 60));
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - t)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.position.x - cameraX, player.position.y, 34 + 3 * Math.sin(now / 60), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ギミック封印を発動した瞬間の演出（衝撃波＋文字）
function drawSealFx() {
  if (sealFxPending) { sealFxPending = false; sealFxStart = Date.now(); }
  if (!sealFxStart) return;
  const el = Date.now() - sealFxStart;
  if (el > 1400) { sealFxStart = 0; return; }
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.42;

  if (el < 800) {
    const t = el / 800;
    const r = 30 + 320 * (1 - (1 - t) * (1 - t));
    ctx.save();
    ctx.strokeStyle = `rgba(120,230,255,${0.85 * (1 - t)})`;
    ctx.lineWidth = 7 * (1 - t) + 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - t)})`;
    ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(120,230,255,${0.18 * (1 - t)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  const t = el / 1400;
  const pop = t < 0.12 ? t / 0.12 : 1;
  const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
  ctx.save();
  ctx.translate(cx, cy);
  const sc = 0.6 + 0.4 * pop;
  ctx.scale(sc, sc);
  ctx.globalAlpha = Math.max(0, fade);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 28px 'Helvetica Neue', Arial, sans-serif";
  ctx.shadowColor = "rgba(60,200,255,0.95)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("🚫 ギミック封印！", 0, 0);
  ctx.shadowBlur = 0;
  ctx.font = "bold 14px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillStyle = "#bff3ff";
  ctx.fillText(Math.round(SEAL_DURATION_FRAMES / 60) + "秒間、レーザー・トゲ・風が出ません", 0, 28);
  ctx.restore();
}

// ===== 警告バナー（右上に積み重ねて表示） =====
let __bannerY = 10;
const __bannerBorn = {};
const __bannerSeen = {};

function __rrPath(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// o: {key, title, sub, c1, c2, progress(0-1), urgent, h}
function drawWarningBanner(o) {
  const now = Date.now();
  const x = 170, w = 222, h = o.h || 52;
  const y = __bannerY;
  __bannerY += h + 6;
  __bannerSeen[o.key] = true;
  if (!__bannerBorn[o.key]) __bannerBorn[o.key] = now;
  const k = Math.min(1, (now - __bannerBorn[o.key]) / 220);
  const slide = (1 - k) * (1 - k) * 46;
  const pulse = 0.5 + 0.5 * Math.sin(now / (o.urgent ? 70 : 170));

  ctx.save();
  ctx.translate(slide, 0);
  ctx.globalAlpha = k;

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  __rrPath(x + 2, y + 3, w, h, 12); ctx.fill();

  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, o.c1);
  g.addColorStop(1, o.c2);
  ctx.fillStyle = g;
  __rrPath(x, y, w, h, 12); ctx.fill();

  // 流れる警告ストライプ
  ctx.save();
  __rrPath(x, y, w, h, 12); ctx.clip();
  ctx.strokeStyle = `rgba(255,255,255,${0.10 + (o.urgent ? 0.10 * pulse : 0)})`;
  ctx.lineWidth = 7;
  const off = (now / 30) % 24;
  for (let sx = x - h + off; sx < x + w + h; sx += 24) {
    ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + h, y); ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = o.urgent ? `rgba(255,255,255,${0.7 + 0.3 * pulse})` : "rgba(255,255,255,0.9)";
  ctx.lineWidth = o.urgent ? 3 : 2.5;
  __rrPath(x, y, w, h, 12); ctx.stroke();

  // 文字（長ければ縮める）
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#fff";
  let fs = 15;
  const maxW = w - 24;
  ctx.font = `900 ${fs}px 'Helvetica Neue', Arial, sans-serif`;
  while (ctx.measureText(o.title).width > maxW && fs > 10) {
    fs--;
    ctx.font = `900 ${fs}px 'Helvetica Neue', Arial, sans-serif`;
  }
  const hasBar = o.progress != null;
  const titleY = o.sub ? y + 17 : y + (hasBar ? h * 0.4 : h / 2);
  ctx.fillText(o.title, x + 12, titleY);
  if (o.sub) {
    ctx.shadowBlur = 0;
    ctx.font = "bold 11px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    let sub = o.sub;
    while (ctx.measureText(sub).width > maxW && sub.length > 4) sub = sub.slice(0, -2);
    ctx.fillText(sub, x + 12, y + 33);
  }

  // 進行バー
  if (hasBar) {
    const bx = x + 12, bw = w - 24, bh = 5, by = y + h - 11;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    __rrPath(bx, by, bw, bh, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const pw = Math.max(0, Math.min(1, o.progress)) * bw;
    if (pw > 1) { __rrPath(bx, by, pw, bh, 3); ctx.fill(); }
  }
  ctx.restore();
}

function drawGimmickBanners() {
  __bannerY = 10;
  for (const key in __bannerSeen) delete __bannerSeen[key];

  if (gameStarted && !gameOver && !gameCleared) {
    // ギミック封印中
    if (gimmickSuppressFrames > 0) {
      drawWarningBanner({
        key: "seal",
        title: "🚫 ギミック封印中 " + (gimmickSuppressFrames / 60).toFixed(1) + "s",
        c1: "#18b6d8", c2: "#3a7bff",
        progress: gimmickSuppressFrames / SEAL_DURATION_FRAMES,
        h: 40
      });
    }

    // 重力反転
    if (gravityHud && (gravityReverseState === "warning" || gravityReverseState === "active")) {
      const rm = Math.ceil(gravityHud.remain);
      if (gravityHud.mode === "warn") {
        const prog = 1 - gravityHud.remain / gravityHud.total;
        drawWarningBanner({
          key: "grav-warn",
          title: "⚠ 重力反転まで あと " + rm + "m",
          sub: "↑ 天井が床になる！着地に備えて",
          c1: "#8a3dff", c2: "#e0409a",
          progress: prog, urgent: prog > 0.7
        });
      } else if (gravityHud.mode === "return") {
        drawWarningBanner({
          key: "grav-return",
          title: "↩ まもなく元の重力に戻る",
          sub: "あと " + rm + "m",
          c1: "#2a7bff", c2: "#8a3dff",
          progress: gravityHud.remain / 15, urgent: true
        });
      } else {
        drawWarningBanner({
          key: "grav-active",
          title: "🔄 重力反転中",
          sub: "あと " + rm + "m で元に戻る",
          c1: "#6a4dff", c2: "#2aa0ff",
          progress: gravityHud.remain / gravityHud.total
        });
      }
    }

    // レーザー
    if (laserState === "warning" || laserState === "active") {
      const safeLane = isGravityVisualFlipped() ? (LANE_COUNT - 1 - laserSafeLane) : laserSafeLane;
      const playerLane = Math.min(LANE_COUNT - 1, Math.max(0, Math.floor(player.position.y / LANE_H)));
      if (laserState === "warning") {
        const prog = Math.min(1, laserTimer / getLaserWarnNeed());
        drawWarningBanner({
          key: "laser-warn",
          title: "⚠ レーザー接近！",
          sub: playerLane === safeLane ? "そのまま緑のレーンで待機！" : "緑のレーンへ移動！",
          c1: "#ff3355", c2: "#ff8a1f",
          progress: prog, urgent: prog > 0.7
        });
      } else {
        drawWarningBanner({
          key: "laser-fire",
          title: "🔥 レーザー発射中！",
          sub: "緑のレーンから出ないで！",
          c1: "#d4002e", c2: "#ff3355",
          progress: 1 - laserTimer / LASER_ACTIVE_FRAMES, urgent: true
        });
      }
    }
  }

  for (const key in __bannerBorn) {
    if (!__bannerSeen[key]) delete __bannerBorn[key];
  }
}

function drawBody(body, color) {
  ctx.save();
  ctx.translate(body.position.x - cameraX, body.position.y);

  if (body !== player && !body.isSensor) {
    ctx.rotate(body.angle);
  }

  if (body.circleRadius) {
    if (body === player) {
      const size = 50;
      const currentSkinImg = playerImages[currentSkinIndex];
      
      if (currentSkinImg && currentSkinImg.naturalWidth > 0) {
        const imgWidth = currentSkinImg.width;
        const imgHeight = currentSkinImg.height;
        const drawHeight = size * (imgHeight / imgWidth);

        ctx.save();
        if (isGravityVisualFlipped()) {
          ctx.scale(1, -1);
        }

        // 歩行・空中の見た目
        const grounded = !!isTouchingGroundOrLine;
        const spd = Math.abs(player.velocity.x) + Math.abs(player.velocity.y) * 0.3;
        const phase = (typeof score === "number" ? score : 0) * 0.55 + (player.position.x || 0) * 0.08;
        let bobY = 0;
        let tilt = 0;
        let scaleX = 1;
        let scaleY = 1;
        if (grounded && gameStarted && !gameOver && !isReviving) {
          // 歩く：上下に小さく、少し前後に傾ける
          bobY = Math.sin(phase * 2.2) * 3.2;
          tilt = Math.sin(phase * 2.2) * 0.10;
          scaleX = 1 + Math.sin(phase * 2.2) * 0.04;
          scaleY = 1 - Math.sin(phase * 2.2) * 0.04;
        } else if (gameStarted && !gameOver) {
          // 空中：少し前傾＋落下で伸び
          tilt = 0.12;
          const vy = player.velocity.y || 0;
          scaleY = 1 + Math.min(0.12, Math.abs(vy) * 0.01);
          scaleX = 1 / scaleY;
          bobY = Math.sin(Date.now() / 120) * 1.2;
        }
        ctx.translate(0, bobY);
        ctx.rotate(tilt);
        ctx.scale(scaleX, scaleY);

        // 細い半透明の縁取り
        const ox = [-1, 1, 0, 0];
        const oy = [0, 0, -1, 1];
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < ox.length; i++) {
          ctx.drawImage(
            currentSkinImg,
            -size / 2 + ox[i],
            -drawHeight / 2 + oy[i],
            size,
            drawHeight
          );
        }
        ctx.globalAlpha = 1;
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.drawImage(
          currentSkinImg,
          -size / 2,
          -drawHeight / 2,
          size,
          drawHeight
        );
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    if (body.parts && body.parts.length > 1) {
      for (let i = 1; i < body.parts.length; i++) {
        const part = body.parts[i];
        ctx.save();
        ctx.translate(part.position.x - body.position.x, part.position.y - body.position.y);
        ctx.rotate(part.angle - body.angle);

        const pWidth = part.bounds.max.x - part.bounds.min.x;
        const pHeight = part.bounds.max.y - part.bounds.min.y;

        ctx.fillStyle = color;
        ctx.fillRect(-pWidth / 2, -pHeight / 2, pWidth, pHeight);

        ctx.restore();
      }
    } else {
      const width = body.bounds.max.x - body.bounds.min.x;
      const height = body.bounds.max.y - body.bounds.min.y;

      if (grounds.includes(body)) {
        if (isGravityVisualFlipped()) {
          ctx.scale(1, -1);
        }
        ctx.drawImage(groundImage, -width / 2, -height / 2, width, height);
      } else if (walls.includes(body) || body.label === "wall") {
        if (isGravityVisualFlipped()) {
          ctx.scale(1, -1);
        }
        const x = -width / 2, y = -height / 2;
        if (typeof wallImage !== "undefined" && wallImage.complete && wallImage.naturalWidth > 0) {
          ctx.drawImage(wallImage, x, y, width, height);
        } else {
          // フォールバック：ポップな壁
          const g = ctx.createLinearGradient(0, y, 0, y + height);
          g.addColorStop(0, "#7ec8ff");
          g.addColorStop(1, "#3b82f6");
          ctx.fillStyle = g;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill(); }
          else ctx.fillRect(x, y, width, height);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.stroke(); }
        }
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(-width / 2, -height / 2, width, height);
      }
    }
  }
  ctx.restore();
}

function getActiveBackground() {
  if (!currentConfig) return bgAozora;

  if (currentConfig.bgFixed) {
    switch (currentConfig.bgFixed) {
      case "aozora":  return bgAozora;
      case "yuugure": return bgYuugure;
      case "yozora":  return bgYozora;
      case "cyber":   return bgCyber;
      case "volcano":
        if (bgVolcano.complete && bgVolcano.naturalWidth > 0) return bgVolcano;
        return { procedural: "volcano" };
      case "void":    return { procedural: "void" };
      default:        return bgAozora;
    }
  }

  if (score >= 300) return bgCyber;
  if (score >= 200) return bgYozora;
  if (score >= 100) return bgYuugure;
  return bgAozora;
}

