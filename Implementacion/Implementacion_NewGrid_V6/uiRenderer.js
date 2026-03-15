const TITLE_TEXT = "Girl so confusing";

const EXTRA_TEXT = "Audioreactive";

let audioButtonBounds = {
  x: 0,
  y: 0,
  r: 28
};

function uiInit() {
}

function drawPanelBase() {
  noStroke();
  fill(14);
  rect(panel.x, panel.y, panel.w, panel.h, 10);

  stroke(36);
  strokeWeight(1.5);
  noFill();
  rect(panel.x, panel.y, panel.w, panel.h, 10);

  noStroke();
  fill(49,163,38);
  textAlign(CENTER);

  textStyle(BOLD);
  textSize(72);
  text(TITLE_TEXT, panel.x + panel.w / 2, panel.y + 88);
  
  textStyle(BOLD);
  textSize(50);
  text(EXTRA_TEXT, panel.x + panel.w / 2, panel.y + 430);

  textStyle(NORMAL);
  textSize(24);
  fill(255);
  text(styles[currentStyleIndex].name, panel.x + panel.w / 2, panel.y + 130);
}

function drawMainTile(src, t) {
  noStroke();
  fill(255, 14);
  rect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, 10);

  stroke(70);
  strokeWeight(2);
  fill(18);
  rect(t.x, t.y, t.w, t.h, 8);

  image(src, t.x, t.y, t.w, t.h, 0, 0, W, H);
}

function drawFragmentTile(src, t) {
  const relX = (t.x - compositionBounds.x) / compositionBounds.w;
  const relY = (t.y - compositionBounds.y) / compositionBounds.h;
  const relW = t.w / compositionBounds.w;
  const relH = t.h / compositionBounds.h;

  const centerX = relX + relW * 0.5;
  const centerY = relY + relH * 0.5;

  const zoomedW = relW / FRAGMENT_ZOOM;
  const zoomedH = relH / FRAGMENT_ZOOM;

  let cropX = centerX - zoomedW * 0.5;
  let cropY = centerY - zoomedH * 0.5;
  let cropW = zoomedW;
  let cropH = zoomedH;

  cropX = constrain(cropX, 0, 1 - cropW);
  cropY = constrain(cropY, 0, 1 - cropH);

  const sx = W - ((cropX + cropW) * W);
  const sy = cropY * H;
  const sw = cropW * W;
  const sh = cropH * H;

  noStroke();
  fill(255, 14);
  rect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, 10);

  stroke(70);
  strokeWeight(2);
  fill(18);
  rect(t.x, t.y, t.w, t.h, 8);

  image(src, t.x, t.y, t.w, t.h, sx, sy, sw, sh);
}

function drawInterfaceText() {
  noStroke();
  fill(120);
  textAlign(LEFT);
  textSize(12);

  //text(`Movimiento: ${lastMovementPercentage.toFixed(1)}%`, panel.x + 40, panel.y + 704);
  //text(`Estilo: ${styles[currentStyleIndex].name}`, panel.x + 220, panel.y + 704);
 text(`REC: ${isRecording ? "ON" : "OFF"}`, panel.x + 40, panel.y + 704);

  // CTA
  textAlign(CENTER);
  textSize(13);
  fill(255);

  let ctaText = audioState.playing
    ? "Haz click en el botón para pausar la canción"
    : "Haz click en el botón para reproducir la canción";

  text(ctaText, panel.x + panel.w / 2, panel.y + 660);

  // Botón
  audioButtonBounds.x = panel.x + panel.w / 2;
  audioButtonBounds.y = panel.y + 610;

  noStroke();
  fill(28);
  circle(audioButtonBounds.x, audioButtonBounds.y, audioButtonBounds.r * 2);

  stroke(90);
  strokeWeight(1.5);
  noFill();
  circle(audioButtonBounds.x, audioButtonBounds.y, audioButtonBounds.r * 2);

  noStroke();
  fill(235);
  textAlign(CENTER, CENTER);
  textSize(20);

  if (audioState.playing) {
    text("❚❚", audioButtonBounds.x, audioButtonBounds.y - 1);
  } else {
    text("▶", audioButtonBounds.x + 2, audioButtonBounds.y - 1);
  }
  
}

function drawFragmentedCanvases() {
  if (!hasProcessedFrame) {
    fill(180);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(`Cargando buffer: ${bufferFillCount}/${BUFFER_SIZE}`, panel.x + panel.w / 2, panel.y + 510);
    return;
  }

  const src = vpGetActiveSource();

  drawMainTile(src, mainTile);

  for (const t of fragmentTiles) {
    drawFragmentTile(src, t);
  }
}

//

function drawLoadingState() {
  fill(180);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 24);
}