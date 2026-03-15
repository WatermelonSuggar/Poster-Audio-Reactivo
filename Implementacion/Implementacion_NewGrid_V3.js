let video;
let thresholdImg;
let opticalInterlaceImg;
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

const panel = {
  x: 30,
  y: 20,
  w: 520,
  h: 760
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
  { name: "NORMAL", key: "normal" },
  { name: "INTERLACE DUALIDAD", key: "opticalInterlace" },
  { name: "MÁSCARA BINARIA", key: "binary" },
  { name: "BINARIA PIXELADA ROJA", key: "binaryPixelRed" },
  { name: "DUOTONE DIFERENCIAS", key: "duotoneDiff" }
];

let currentStyleIndex = 0;
let fragmentLayoutIndex = 0;

let sumR, sumG, sumB;

const FRAGMENT_ZOOM = 1.45;
const FRAG_W = 96;
const FRAG_H = 96;
const FRAGMENT_MARGIN_X = 22;
const FRAGMENT_MARGIN_TOP = 18;
const FRAGMENT_MARGIN_BOTTOM = 22;
const FRAGMENT_GAP = 10;

// Flowfield
const FLOW_SPACING = 22;
const FLOW_NOISE_SCALE = 0.012;
const FLOW_SPEED = 0.0035;
let flowTime = 0;

function getPixelBrightnessFromRGB(r, g, b) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function setup() {
  createCanvas(580, 800);
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
  opticalInterlaceImg = createImage(W, H);
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
  background(8);

  drawPanelBase();
  drawFlowFieldBackground();

  video.loadPixels();

  if (video.pixels.length > 0) {
    processNewFrameOptimized();
    updateMovementState();
    drawFragmentedCanvases();
  } else {
    drawLoadingState();
  }

  drawInterfaceText();
  flowTime += FLOW_SPEED;
}

function initMosaicArea() {
  mosaicArea.x = panel.x + 40;
  mosaicArea.y = panel.y + 150;
  mosaicArea.w = panel.w - 80;
  mosaicArea.h = 470;
}

function createUI() {
  thresholdSlider = createSlider(0, 100, 30, 1);
  thresholdSlider.position(panel.x + 40, panel.y + 710);
  thresholdSlider.size(120);
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
    x: mosaicArea.x,
    y: mosaicArea.y,
    w: mosaicArea.w,
    h: 255,
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

  const totalRowW = FRAG_W * 4 + FRAGMENT_GAP * 3;
  const startX = innerLeft + (usableW - totalRowW) / 2;
  const baseY = innerTop + (usableH - FRAG_H) / 2;

  const upSmall = 8;
  const downSmall = 8;
  const sideSmall = 8;

  return [
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY }
    ],
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY + downSmall },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY - upSmall },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY + downSmall },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY - 4 }
    ],
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP) - sideSmall, y: baseY - 6 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP),             y: baseY + 8 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP),             y: baseY - 4 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP) + sideSmall, y: baseY + 6 }
    ],
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY + 4 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY - 10 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY - 10 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY + 4 }
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

  thresholdImg.updatePixels();
  duotoneDiffImg.updatePixels();

  buildOpticalInterlace();
  buildBinaryPixelRedFast();

  lastMovementPercentage = (movementPixels / PIXEL_COUNT) * 100;
  hasProcessedFrame = true;
}

function buildOpticalInterlace() {
  opticalInterlaceImg.loadPixels();
  video.loadPixels();

  const stripeW = 12;
  const offsetX = 34;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      const r1 = video.pixels[idx];
      const g1 = video.pixels[idx + 1];
      const b1 = video.pixels[idx + 2];
      const lum1 = getPixelBrightnessFromRGB(r1, g1, b1);

      const sx = constrain(W - 1 - x + offsetX, 0, W - 1);
      const idx2 = (y * W + sx) * 4;
      const r2 = video.pixels[idx2];
      const g2 = video.pixels[idx2 + 1];
      const b2 = video.pixels[idx2 + 2];
      const lum2 = getPixelBrightnessFromRGB(r2, g2, b2);

      const monoA = lum1 > 122 ? 238 : 28;
      const monoB = lum2 > 122 ? 230 : 18;

      const stripeIndex = floor(x / stripeW);
      const useA = stripeIndex % 2 === 0;

      let value = useA ? monoA : monoB;

      if (x % stripeW === 0 || x % stripeW === stripeW - 1) {
        value = max(0, value - 22);
      }

      opticalInterlaceImg.pixels[idx] = value;
      opticalInterlaceImg.pixels[idx + 1] = value;
      opticalInterlaceImg.pixels[idx + 2] = value;
      opticalInterlaceImg.pixels[idx + 3] = 255;
    }
  }

  opticalInterlaceImg.updatePixels();
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

  if (styleKey === "normal") return video;
  if (styleKey === "opticalInterlace") return opticalInterlaceImg;
  if (styleKey === "binary") return thresholdImg;
  if (styleKey === "binaryPixelRed") return binaryPixelImg;
  if (styleKey === "duotoneDiff") return duotoneDiffImg;

  return video;
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

function drawFragmentedCanvases() {
  if (!hasProcessedFrame) {
    fill(180);
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
  noStroke();
  fill(14);
  rect(panel.x, panel.y, panel.w, panel.h, 10);

  stroke(36);
  strokeWeight(1.5);
  noFill();
  rect(panel.x, panel.y, panel.w, panel.h, 10);

  noStroke();
  fill(240);
  textAlign(CENTER);

  textStyle(BOLD);
  textSize(72);
  text(TITLE_TEXT, panel.x + panel.w / 2, panel.y + 88);

  textStyle(NORMAL);
  textSize(24);
  fill(150);
  text(styles[currentStyleIndex].name, panel.x + panel.w / 2, panel.y + 130);
}

function drawInterfaceText() {
  noStroke();
  fill(120);
  textAlign(LEFT);

  textSize(12);
  text("Threshold", panel.x + 40, panel.y + 704);
  text(`Movimiento: ${lastMovementPercentage.toFixed(1)}%`, panel.x + 180, panel.y + 704);
  text(`Estilo: ${styles[currentStyleIndex].name}`, panel.x + 340, panel.y + 704);
}

function drawLoadingState() {
  fill(180);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 24);
}

function drawFlowFieldBackground() {
  push();

  // recorta el dibujo al panel
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  drawingContext.clip();

  noFill();
  strokeWeight(1.2);

  for (let y = panel.y; y < panel.y + panel.h; y += FLOW_SPACING) {
    beginShape();
    for (let x = panel.x; x < panel.x + panel.w; x += FLOW_SPACING) {
      const n = noise(
        (x - panel.x) * FLOW_NOISE_SCALE,
        (y - panel.y) * FLOW_NOISE_SCALE,
        flowTime
      );

      const angle = n * TWO_PI * 2.0;
      const px = x + cos(angle) * 10;
      const py = y + sin(angle) * 10;

      const alpha = map(n, 0, 1, 28, 70);
      stroke(255, alpha);
      curveVertex(px, py);
    }
    endShape();
  }

  drawingContext.restore();
  pop();
}
