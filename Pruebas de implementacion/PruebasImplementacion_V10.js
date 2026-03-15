let video;
let thresholdImg;
let averageFrame;
let binaryPixelImg;
let duotoneDiffImg;

let thresholdSlider;

let frameBuffer = [];
let lastMovementPercentage = 0;
let bufferWriteIndex = 0;
let bufferFillCount = 0;
let hasProcessedFrame = false;

const W = 480;
const H = 360;
const PIXEL_COUNT = W * H;
const BUFFER_SIZE = 6;

const TITLE_TEXT = "TÍTULO";
const SUBTITLE_TEXT = "Subtítulo / nombre del estilo gráfico";

const panel = {
  x: 220,
  y: 20,
  w: 420,
  h: 700
};

const MOVEMENT_THRESHOLD = 15;

let movementState = "leve";
let previousMovementState = "leve";

let tiles = [];

let compositionBounds = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

const mosaicArea = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

const styles = [
  { name: "Frame promedio", key: "average" },
  { name: "Máscara binaria", key: "binary" },
  { name: "Binaria pixelada roja", key: "binaryPixelRed" },
  { name: "Duotone diferencias", key: "duotoneDiff" }
];

let currentStyleIndex = 0;

let sumR, sumG, sumB;

// zoom general de cámara para los tiles
// 1.0 = normal
// 1.35 = zoom más cerrado
const CAMERA_ZOOM = 1.38;

function getPixelBrightnessFromRGB(r, g, b) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function setup() {
  createCanvas(900, 760);
  pixelDensity(1);
  textFont("Arial");

  video = createCapture({
    video: {
      width: { ideal: W },
      height: { ideal: H },
      facingMode: "user"
    },
    audio: false
  });

  video.size(W, H);
  video.hide();

  for (let i = 0; i < BUFFER_SIZE; i++) {
    let img = createImage(W, H);
    img.loadPixels();
    frameBuffer.push(img);
  }

  thresholdImg = createImage(W, H);
  averageFrame = createImage(W, H);
  binaryPixelImg = createImage(W, H);
  duotoneDiffImg = createImage(W, H);

  sumR = new Float32Array(PIXEL_COUNT);
  sumG = new Float32Array(PIXEL_COUNT);
  sumB = new Float32Array(PIXEL_COUNT);

  initMosaicArea();
  applyTileLayout("leve");
  createUI();
}

function draw() {
  background(220);

  drawPanelBase();

  video.loadPixels();

  if (video.pixels.length > 0) {
    processNewFrameOptimized();
    updateMovementState();
    drawFragmentedCanvases();
  } else {
    drawLoadingState();
  }

  drawInterfaceText();
}

function initMosaicArea() {
  mosaicArea.x = panel.x + 25;
  mosaicArea.y = panel.y + 120;
  mosaicArea.w = panel.w - 50;
  mosaicArea.h = 420;
}

function createUI() {
  thresholdSlider = createSlider(0, 100, 30, 1);
  thresholdSlider.position(panel.x + 30, panel.y + 615);
  thresholdSlider.size(100);
}

function nextStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % styles.length;
}

function applyTileLayout(state) {
  if (state === "leve") {
    tiles = createDefaultSixTileLayout();
  } else {
    tiles = generateTileGroup(
      { x: mosaicArea.x, y: mosaicArea.y, w: mosaicArea.w, h: mosaicArea.h },
      6, 8, 0.12, 0.18, 0.06, 1.0, 10
    );
  }

  computeCompositionBounds();
}

function createDefaultSixTileLayout() {
  const a = mosaicArea;

  const boxW = 96;
  const boxH = 86;
  const centerW = 96;
  const centerH = 86;
  const centerTallH = 88;

  const cx = a.x + a.w * 0.5;
  const topY = a.y + 5;
  const row2Y = a.y + 115;
  const row3Y = a.y + 225;

  const leftX = cx - 108 - boxW;
  const centerX = cx - centerW / 2;
  const rightX = cx + 108;
  const topCenterX = cx - boxW / 2;
  const bottomCenterX = cx - boxW / 2;

  return [
    { x: topCenterX, y: topY,    w: boxW,   h: boxH },
    { x: leftX,      y: row2Y,   w: boxW,   h: boxH },
    { x: centerX,    y: row2Y + 34, w: centerW, h: centerTallH },
    { x: rightX,     y: row2Y,   w: boxW,   h: boxH },
    { x: leftX,      y: row3Y,   w: boxW,   h: boxH },
    { x: bottomCenterX, y: row3Y + 34, w: boxW, h: boxH },
    { x: rightX,     y: row3Y,   w: boxW,   h: boxH }
  ];
}

function generateTileGroup(area, cols, rows, holeProb, wideProb, tallProb, jitterAmount, gap) {
  const generatedTiles = [];
  const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));

  const cellW = area.w / cols;
  const cellH = area.h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied[r][c]) continue;
      if (random() < holeProb) continue;

      let spanC = 1;
      let spanR = 1;

      if (random() < wideProb && c < cols - 1 && !occupied[r][c + 1]) spanC = 2;
      if (random() < tallProb && r < rows - 1 && !occupied[r + 1][c]) spanR = 2;
      if (spanC === 2 && spanR === 2) spanR = 1;

      let canPlace = true;
      for (let rr = 0; rr < spanR; rr++) {
        for (let cc = 0; cc < spanC; cc++) {
          if (r + rr >= rows || c + cc >= cols || occupied[r + rr][c + cc]) {
            canPlace = false;
          }
        }
      }

      if (!canPlace) {
        spanC = 1;
        spanR = 1;
      }

      for (let rr = 0; rr < spanR; rr++) {
        for (let cc = 0; cc < spanC; cc++) {
          occupied[r + rr][c + cc] = true;
        }
      }

      const baseX = area.x + c * cellW + gap * 0.5;
      const baseY = area.y + r * cellH + gap * 0.5;
      const baseW = cellW * spanC - gap;
      const baseH = cellH * spanR - gap;

      generatedTiles.push({
        x: baseX + random(-jitterAmount, jitterAmount),
        y: baseY + random(-jitterAmount, jitterAmount),
        w: max(70, baseW + random(-jitterAmount, jitterAmount)),
        h: max(70, baseH + random(-jitterAmount, jitterAmount))
      });
    }
  }

  generatedTiles.sort((a, b) => {
    if (abs(a.y - b.y) < 10) return a.x - b.x;
    return a.y - b.y;
  });

  return generatedTiles;
}

function computeCompositionBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const t of tiles) {
    if (t.x < minX) minX = t.x;
    if (t.y < minY) minY = t.y;
    if (t.x + t.w > maxX) maxX = t.x + t.w;
    if (t.y + t.h > maxY) maxY = t.y + t.h;
  }

  compositionBounds.x = minX;
  compositionBounds.y = minY;
  compositionBounds.w = maxX - minX;
  compositionBounds.h = maxY - minY;
}

function processNewFrameOptimized() {
  const slot = frameBuffer[bufferWriteIndex];
  slot.loadPixels();

  for (let i = 0; i < video.pixels.length; i++) {
    slot.pixels[i] = video.pixels[i];
  }
  slot.updatePixels();

  bufferWriteIndex = (bufferWriteIndex + 1) % BUFFER_SIZE;
  if (bufferFillCount < BUFFER_SIZE) bufferFillCount++;

  if (bufferFillCount < BUFFER_SIZE) {
    hasProcessedFrame = false;
    return;
  }

  for (let f = 0; f < BUFFER_SIZE; f++) {
    frameBuffer[f].loadPixels();
  }

  averageFrame.loadPixels();
  thresholdImg.loadPixels();
  duotoneDiffImg.loadPixels();

  sumR.fill(0);
  sumG.fill(0);
  sumB.fill(0);

  for (let f = 0; f < BUFFER_SIZE; f++) {
    const px = frameBuffer[f].pixels;
    let p = 0;
    for (let idx = 0; idx < PIXEL_COUNT; idx++, p += 4) {
      sumR[idx] += px[p];
      sumG[idx] += px[p + 1];
      sumB[idx] += px[p + 2];
    }
  }

  const threshold = thresholdSlider.value();
  let movementPixels = 0;

  let p = 0;
  for (let idx = 0; idx < PIXEL_COUNT; idx++, p += 4) {
    const avgR = sumR[idx] / BUFFER_SIZE;
    const avgG = sumG[idx] / BUFFER_SIZE;
    const avgB = sumB[idx] / BUFFER_SIZE;

    averageFrame.pixels[p] = avgR;
    averageFrame.pixels[p + 1] = avgG;
    averageFrame.pixels[p + 2] = avgB;
    averageFrame.pixels[p + 3] = 255;

    const r = video.pixels[p];
    const g = video.pixels[p + 1];
    const b = video.pixels[p + 2];

    const currentBrightness = getPixelBrightnessFromRGB(r, g, b);
    const avgBrightness = getPixelBrightnessFromRGB(avgR, avgG, avgB);
    const difference = abs(currentBrightness - avgBrightness);

    if (difference >= threshold) movementPixels++;

    const bw = difference >= threshold ? 255 : 0;
    thresholdImg.pixels[p] = bw;
    thresholdImg.pixels[p + 1] = bw;
    thresholdImg.pixels[p + 2] = bw;
    thresholdImg.pixels[p + 3] = 255;

    const amt = difference / 255.0;
    duotoneDiffImg.pixels[p] = lerp(10, 255, amt);
    duotoneDiffImg.pixels[p + 1] = lerp(20, 40, amt);
    duotoneDiffImg.pixels[p + 2] = lerp(60, 60, amt);
    duotoneDiffImg.pixels[p + 3] = 255;
  }

  averageFrame.updatePixels();
  thresholdImg.updatePixels();
  duotoneDiffImg.updatePixels();

  buildBinaryPixelRedFast();

  lastMovementPercentage = (movementPixels / PIXEL_COUNT) * 100;
  hasProcessedFrame = true;
}

function buildBinaryPixelRedFast() {
  const blockSize = 8;

  binaryPixelImg.loadPixels();
  thresholdImg.loadPixels();

  for (let y = 0; y < H; y += blockSize) {
    for (let x = 0; x < W; x += blockSize) {
      let activeCount = 0;
      let count = 0;

      for (let yy = 0; yy < blockSize; yy++) {
        const py = y + yy;
        if (py >= H) continue;

        for (let xx = 0; xx < blockSize; xx++) {
          const px = x + xx;
          if (px >= W) continue;

          const idx = (py * W + px) * 4;
          if (thresholdImg.pixels[idx] > 127) activeCount++;
          count++;
        }
      }

      const active = activeCount > count * 0.35;

      for (let yy = 0; yy < blockSize; yy++) {
        const py = y + yy;
        if (py >= H) continue;

        for (let xx = 0; xx < blockSize; xx++) {
          const px = x + xx;
          if (px >= W) continue;

          const idx = (py * W + px) * 4;

          if (active) {
            const stripe = (xx % 2 === 0) ? 255 : 180;
            binaryPixelImg.pixels[idx] = stripe;
            binaryPixelImg.pixels[idx + 1] = 20;
            binaryPixelImg.pixels[idx + 2] = 20;
            binaryPixelImg.pixels[idx + 3] = 255;
          } else {
            binaryPixelImg.pixels[idx] = 8;
            binaryPixelImg.pixels[idx + 1] = 0;
            binaryPixelImg.pixels[idx + 2] = 0;
            binaryPixelImg.pixels[idx + 3] = 255;
          }
        }
      }
    }
  }

  binaryPixelImg.updatePixels();
}

function updateMovementState() {
  if (!hasProcessedFrame) return;

  previousMovementState = movementState;
  movementState = lastMovementPercentage < MOVEMENT_THRESHOLD ? "leve" : "moderado";

  if (movementState !== previousMovementState) {
    nextStyle();
    applyTileLayout(movementState);
  }
}

function getActiveSource() {
  const styleKey = styles[currentStyleIndex].key;

  if (styleKey === "average") return averageFrame;
  if (styleKey === "binary") return thresholdImg;
  if (styleKey === "binaryPixelRed") return binaryPixelImg;
  if (styleKey === "duotoneDiff") return duotoneDiffImg;

  return averageFrame;
}

function drawTileImage(src, t) {
  // posición normalizada dentro de la composición
  const relX = (t.x - compositionBounds.x) / compositionBounds.w;
  const relY = (t.y - compositionBounds.y) / compositionBounds.h;
  const relW = t.w / compositionBounds.w;
  const relH = t.h / compositionBounds.h;

  // centro del recorte
  const centerX = relX + relW * 0.5;
  const centerY = relY + relH * 0.5;

  // zoom
  const zoomedW = relW / CAMERA_ZOOM;
  const zoomedH = relH / CAMERA_ZOOM;

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

  fill(180);
  stroke(130);
  strokeWeight(1.5);
  rect(t.x, t.y, t.w, t.h, 4);

  image(src, t.x, t.y, t.w, t.h, sx, sy, sw, sh);
}

function drawFragmentedCanvases() {
  if (!hasProcessedFrame) {
    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(`Cargando buffer: ${bufferFillCount}/${BUFFER_SIZE}`, panel.x + panel.w / 2, panel.y + 510);
    return;
  }

  const src = getActiveSource();

  for (const t of tiles) {
    drawTileImage(src, t);
  }
}

function drawPanelBase() {
  fill(248);
  stroke(120);
  strokeWeight(2);
  rect(panel.x, panel.y, panel.w, panel.h, 6);

  noStroke();
  fill(25);
  textAlign(CENTER);

  textStyle(BOLD);
  textSize(54);
  text(TITLE_TEXT, panel.x + panel.w / 2, panel.y + 60);

  textStyle(NORMAL);
  textSize(15);
  text(SUBTITLE_TEXT, panel.x + panel.w / 2, panel.y + 88);
}

function drawInterfaceText() {
  noStroke();
  fill(35);
  textAlign(LEFT);

  textSize(13);
  text("Threshold", panel.x + 30, panel.y + 605);

  textSize(12);
  text(`Umbral actual: ${thresholdSlider.value()}`, panel.x + 30, panel.y + 650);
  text(`Movimiento detectado: ${lastMovementPercentage.toFixed(1)}%`, panel.x + 30, panel.y + 672);
  text(`Buffer: ${bufferFillCount}/${BUFFER_SIZE}`, panel.x + 30, panel.y + 694);
  text(`Estado: ${movementState}`, panel.x + 200, panel.y + 650);
  text(`Estilo actual: ${styles[currentStyleIndex].name}`, panel.x + 200, panel.y + 672);
  text(`Recuadros: ${tiles.length}`, panel.x + 200, panel.y + 694);
}

function drawLoadingState() {
  fill(50);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 18);
}
