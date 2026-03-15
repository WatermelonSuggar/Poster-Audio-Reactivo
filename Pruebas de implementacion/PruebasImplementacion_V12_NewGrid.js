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

const FRAG_W = 104;
const FRAG_H = 104;
const FRAGMENT_MARGIN_X = 18;
const FRAGMENT_MARGIN_TOP = 14;
const FRAGMENT_MARGIN_BOTTOM = 18;
const FRAGMENT_GAP = 12;

const TITLE_TEXT = "TÍTULO";
const SUBTITLE_TEXT = "Subtítulo / nombre del estilo gráfico";

const panel = {
  x: 0,
  y: 20,
  w: 500,
  h: 720
};

const MOVEMENT_THRESHOLD = 15;

let movementState = "leve";
let previousMovementState = "leve";

let mainTile = null;
let fragmentTiles = [];

let compositionBounds = {
  x: 0,
  y: 0,
  w: 1,
  h: 1
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

// layouts personalizados para los 4 fragmentos
let fragmentLayoutIndex = 0;

let sumR, sumG, sumB;

const FRAGMENT_ZOOM = 1.5;

function getPixelBrightnessFromRGB(r, g, b) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function setup() {
  createCanvas(900, 780);
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
  mainTile = createMainTile();
  fragmentTiles = getFragmentTilesFromLayout(fragmentLayoutIndex);
  computeCompositionBounds();
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
  mosaicArea.h = 500;
}

function createUI() {
  thresholdSlider = createSlider(0, 100, 30, 1);
  thresholdSlider.position(panel.x + 28, panel.y + 650);
  thresholdSlider.size(110);
}

function nextStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % styles.length;
}

function nextFragmentLayout() {
  fragmentLayoutIndex = (fragmentLayoutIndex + 1) % getFragmentLayouts().length;
  fragmentTiles = getFragmentTilesFromLayout(fragmentLayoutIndex);
  computeCompositionBounds();
}

function createMainTile() {
  return {
    x: mosaicArea.x + 18,
    y: mosaicArea.y + 10,
    w: mosaicArea.w - 36,
    h: 260,
    type: "main"
  };
}

function getFragmentLayouts() {
  const innerLeft = mosaicArea.x + FRAGMENT_MARGIN_X;
  const innerRight = mosaicArea.x + mosaicArea.w - FRAGMENT_MARGIN_X;
  const innerTop = mainTile.y + mainTile.h + FRAGMENT_MARGIN_TOP;
  const innerBottom = mosaicArea.y + mosaicArea.h - FRAGMENT_MARGIN_BOTTOM;

  const usableW = innerRight - innerLeft;
  const usableH = innerBottom - innerTop;

  // como son 4 fragmentos horizontales, calculamos posiciones base
  const totalRowW = FRAG_W * 4 + FRAGMENT_GAP * 3;
  const startX = innerLeft + (usableW - totalRowW) / 2;

  // fila base vertical
  const baseY = innerTop + (usableH - FRAG_H) / 2;

  // offsets permitidos sin salirse del área
  const upSmall = 10;
  const downSmall = 10;
  const sideSmall = 10;

  return [
    // layout 1: recto
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY }
    ],

    // layout 2: alternado suave
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY + downSmall },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY - upSmall },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY + downSmall },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY - 6 }
    ],

    // layout 3: zigzag
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP) - sideSmall, y: baseY - 8 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP),             y: baseY + 10 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP),             y: baseY - 6 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP) + sideSmall, y: baseY + 8 }
    ],

    // layout 4: centro alto
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY + 6 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY - 12 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY - 12 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY + 6 }
    ],

    // layout 5: extremos altos
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY - 10 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY + 8 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY + 8 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY - 10 }
    ]
  ];
}

function getFragmentTilesFromLayout(layoutIndex) {
  const layouts = getFragmentLayouts();
  const selected = layouts[layoutIndex % layouts.length];

  const minX = mosaicArea.x + FRAGMENT_MARGIN_X;
  const maxX = mosaicArea.x + mosaicArea.w - FRAGMENT_MARGIN_X - FRAG_W;
  const minY = mainTile.y + mainTile.h + FRAGMENT_MARGIN_TOP;
  const maxY = mosaicArea.y + mosaicArea.h - FRAGMENT_MARGIN_BOTTOM - FRAG_H;

  return selected.map(pos => ({
    x: constrain(pos.x, minX, maxX),
    y: constrain(pos.y, minY, maxY),
    w: FRAG_W,
    h: FRAG_H,
    type: "fragment"
  }));
}

function computeCompositionBounds() {
  compositionBounds.x = mosaicArea.x;
  compositionBounds.y = mosaicArea.y;
  compositionBounds.w = mosaicArea.w;
  compositionBounds.h = mosaicArea.h;
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
    nextFragmentLayout();
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

function drawMainTile(src, t) {
  fill(180);
  stroke(130);
  strokeWeight(1.8);
  rect(t.x, t.y, t.w, t.h, 6);

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

  drawMainTile(src, mainTile);

  for (const t of fragmentTiles) {
    drawFragmentTile(src, t);
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
  text("Threshold", panel.x + 28, panel.y + 640);

  textSize(12);
  text(`Umbral actual: ${thresholdSlider.value()}`, panel.x + 28, panel.y + 684);
  text(`Movimiento detectado: ${lastMovementPercentage.toFixed(1)}%`, panel.x + 28, panel.y + 706);
  text(`Buffer: ${bufferFillCount}/${BUFFER_SIZE}`, panel.x + 28, panel.y + 728);
  text(`Estado: ${movementState}`, panel.x + 260, panel.y + 684);
  text(`Estilo actual: ${styles[currentStyleIndex].name}`, panel.x + 260, panel.y + 706);
  text(`Layout fragmentos: ${fragmentLayoutIndex + 1}`, panel.x + 260, panel.y + 728);
}

function drawLoadingState() {
  fill(50);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 18);
}
