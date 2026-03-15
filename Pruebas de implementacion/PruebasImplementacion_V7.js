let video;
let differenceImg;
let thresholdImg;
let averageFrame;

let thresholdSlider;

let frameBuffer = [];
let lastMovementPercentage = 0;
let bufferWriteIndex = 0;
let bufferFillCount = 0;
let hasProcessedFrame = false;

const W = 320;
const H = 240;
const PIXEL_COUNT = W * H;
const BUFFER_SIZE = 10;

const TITLE_TEXT = "TÍTULO";
const SUBTITLE_TEXT = "Subtítulo / nombre del estilo gráfico";

const panel = {
  x: 280,
  y: 28,
  w: 360,
  h: 640
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

// 0 = promedio
// 1 = diferencias
// 2 = máscara binaria
let globalStyleMode = 0;
const styleNames = ["Promedio", "Diferencias", "Máscara binaria"];

function getPixelBrightness(idx, sourcePixels) {
  return (
    sourcePixels[idx] * 0.299 +
    sourcePixels[idx + 1] * 0.587 +
    sourcePixels[idx + 2] * 0.114
  );
}

function setup() {
  createCanvas(920, 760);
  pixelDensity(1);
  textFont("Arial");

  video = createCapture(VIDEO);
  video.size(W, H);
  video.hide();

  for (let i = 0; i < BUFFER_SIZE; i++) {
    let img = createImage(W, H);
    img.loadPixels();
    frameBuffer.push(img);
  }

  differenceImg = createImage(W, H);
  thresholdImg = createImage(W, H);
  averageFrame = createImage(W, H);

  initMosaicArea();
  applyVisualState("leve");
  createUI();
}

function draw() {
  background(220);

  drawPanelBase();

  video.loadPixels();

  if (video.pixels.length > 0) {
    processNewFrame();
    updateMovementState();
    drawFragmentedCanvases();
  } else {
    drawLoadingState();
  }

  drawInterfaceText();
}

function initMosaicArea() {
  mosaicArea.x = panel.x + 34;
  mosaicArea.y = panel.y + 140;
  mosaicArea.w = panel.w - 68;
  mosaicArea.h = 360;
}

function createUI() {
  thresholdSlider = createSlider(0, 100, 30, 1);
  thresholdSlider.position(panel.x + 34, panel.y + 530);
  thresholdSlider.size(90);
}

function applyVisualState(state) {
  if (state === "leve") {
    globalStyleMode = 0; // Promedio
    tiles = generateTileGroup(
      {
        x: mosaicArea.x,
        y: mosaicArea.y,
        w: mosaicArea.w,
        h: mosaicArea.h
      },
      8,     // cols
      9,     // rows
      0.08,  // huecos
      0.10,  // piezas anchas
      0.03,  // piezas altas
      0.6,   // jitter
      5      // gap
    );
  } else {
    globalStyleMode = 2; // Máscara binaria
    tiles = generateTileGroup(
      {
        x: mosaicArea.x,
        y: mosaicArea.y,
        w: mosaicArea.w,
        h: mosaicArea.h
      },
      8,     // cols
      9,     // rows
      0.16,  // huecos
      0.18,  // piezas anchas
      0.06,  // piezas altas
      1.4,   // jitter
      4      // gap
    );
  }

  computeCompositionBounds();
}

function generateTileGroup(area, cols, rows, holeProb, wideProb, tallProb, jitterAmount, gap) {
  let generatedTiles = [];
  let occupied = Array.from({ length: rows }, () => Array(cols).fill(false));

  const cellW = area.w / cols;
  const cellH = area.h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied[r][c]) continue;
      if (random() < holeProb) continue;

      let spanC = 1;
      let spanR = 1;

      if (random() < wideProb && c < cols - 1 && !occupied[r][c + 1]) {
        spanC = 2;
      }

      if (random() < tallProb && r < rows - 1 && !occupied[r + 1][c]) {
        spanR = 2;
      }

      if (spanC === 2 && spanR === 2) {
        spanR = 1;
      }

      let canPlace = true;
      for (let rr = 0; rr < spanR; rr++) {
        for (let cc = 0; cc < spanC; cc++) {
          if (
            r + rr >= rows ||
            c + cc >= cols ||
            occupied[r + rr][c + cc]
          ) {
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

      let baseX = area.x + c * cellW + gap * 0.5;
      let baseY = area.y + r * cellH + gap * 0.5;
      let baseW = cellW * spanC - gap;
      let baseH = cellH * spanR - gap;

      let jitterX = random(-jitterAmount, jitterAmount);
      let jitterY = random(-jitterAmount, jitterAmount);
      let sizeJitterW = random(-jitterAmount, jitterAmount);
      let sizeJitterH = random(-jitterAmount, jitterAmount);

      generatedTiles.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
        w: max(16, baseW + sizeJitterW),
        h: max(16, baseH + sizeJitterH)
      });
    }
  }

  generatedTiles.sort((a, b) => {
    if (abs(a.y - b.y) < 8) return a.x - b.x;
    return a.y - b.y;
  });

  return generatedTiles;
}

function computeCompositionBounds() {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let t of tiles) {
    minX = min(minX, t.x);
    minY = min(minY, t.y);
    maxX = max(maxX, t.x + t.w);
    maxY = max(maxY, t.y + t.h);
  }

  compositionBounds.x = minX;
  compositionBounds.y = minY;
  compositionBounds.w = maxX - minX;
  compositionBounds.h = maxY - minY;
}

function processNewFrame() {
  let slot = frameBuffer[bufferWriteIndex];
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

  averageFrame.loadPixels();
  differenceImg.loadPixels();
  thresholdImg.loadPixels();

  for (let f = 0; f < BUFFER_SIZE; f++) {
    frameBuffer[f].loadPixels();
  }

  const threshold = thresholdSlider.value();
  let movementPixels = 0;

  for (let i = 0; i < PIXEL_COUNT * 4; i += 4) {
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    for (let f = 0; f < BUFFER_SIZE; f++) {
      totalR += frameBuffer[f].pixels[i];
      totalG += frameBuffer[f].pixels[i + 1];
      totalB += frameBuffer[f].pixels[i + 2];
    }

    let avgR = totalR / BUFFER_SIZE;
    let avgG = totalG / BUFFER_SIZE;
    let avgB = totalB / BUFFER_SIZE;

    averageFrame.pixels[i] = avgR;
    averageFrame.pixels[i + 1] = avgG;
    averageFrame.pixels[i + 2] = avgB;
    averageFrame.pixels[i + 3] = 255;

    let currentBrightness = getPixelBrightness(i, video.pixels);
    let avgBrightness = avgR * 0.299 + avgG * 0.587 + avgB * 0.114;
    let difference = abs(currentBrightness - avgBrightness);

    if (difference >= threshold) movementPixels++;

    differenceImg.pixels[i] = difference;
    differenceImg.pixels[i + 1] = difference;
    differenceImg.pixels[i + 2] = difference;
    differenceImg.pixels[i + 3] = 255;

    let bw = difference >= threshold ? 255 : 0;
    thresholdImg.pixels[i] = bw;
    thresholdImg.pixels[i + 1] = bw;
    thresholdImg.pixels[i + 2] = bw;
    thresholdImg.pixels[i + 3] = 255;
  }

  averageFrame.updatePixels();
  differenceImg.updatePixels();
  thresholdImg.updatePixels();

  lastMovementPercentage = (movementPixels / PIXEL_COUNT) * 100;
  hasProcessedFrame = true;
}

function updateMovementState() {
  if (!hasProcessedFrame) return;

  previousMovementState = movementState;
  movementState = lastMovementPercentage < MOVEMENT_THRESHOLD ? "leve" : "moderado";

  if (movementState !== previousMovementState) {
    applyVisualState(movementState);
  }
}

function getActiveSource() {
  if (globalStyleMode === 0) return averageFrame;
  if (globalStyleMode === 1) return differenceImg;
  return thresholdImg;
}

function drawTileImage(src, t) {
  let relX = (t.x - compositionBounds.x) / compositionBounds.w;
  let relY = (t.y - compositionBounds.y) / compositionBounds.h;
  let relW = t.w / compositionBounds.w;
  let relH = t.h / compositionBounds.h;

  let sx = W - ((relX + relW) * W);
  let sy = relY * H;
  let sw = relW * W;
  let sh = relH * H;

  noStroke();
  fill(150, 70);
  rect(t.x + 2, t.y + 2, t.w, t.h, 2);

  stroke(235, 180);
  strokeWeight(1);
  fill(255);
  rect(t.x, t.y, t.w, t.h, 2);

  image(src, t.x, t.y, t.w, t.h, sx, sy, sw, sh);
}

function drawFragmentedCanvases() {
  if (!hasProcessedFrame) {
    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(
      `Cargando buffer: ${bufferFillCount}/${BUFFER_SIZE}`,
      panel.x + panel.w / 2,
      panel.y + 510
    );
    return;
  }

  let src = getActiveSource();

  for (let t of tiles) {
    drawTileImage(src, t);
  }
}

function drawPanelBase() {
  fill(248);
  stroke(120);
  strokeWeight(2);
  rect(panel.x, panel.y, panel.w, panel.h, 4);

  noStroke();
  fill(25);
  textAlign(CENTER);

  textStyle(BOLD);
  textSize(56);
  text(TITLE_TEXT, panel.x + panel.w / 2, panel.y + 66);

  textStyle(NORMAL);
  textSize(15);
  text(SUBTITLE_TEXT, panel.x + panel.w / 2, panel.y + 92);
}

function drawInterfaceText() {
  noStroke();
  fill(35);
  textAlign(LEFT);

  textSize(13);
  text("Threshold", panel.x + 34, panel.y + 520);

  textSize(12);
  text(`Umbral actual: ${thresholdSlider.value()}`, panel.x + 34, panel.y + 575);
  text(`Movimiento detectado: ${lastMovementPercentage.toFixed(1)}%`, panel.x + 34, panel.y + 597);
  text(`Buffer: ${bufferFillCount}/${BUFFER_SIZE}`, panel.x + 34, panel.y + 619);
  text(`Estado: ${movementState}`, panel.x + 34, panel.y + 641);
  text(`Estilo global: ${styleNames[globalStyleMode]}`, panel.x + 34, panel.y + 663);
  text(`Tiles totales: ${tiles.length}`, panel.x + 34, panel.y + 685);
}

function drawLoadingState() {
  fill(50);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 18);
}
