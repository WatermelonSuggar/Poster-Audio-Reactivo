let video;
let differenceImg;
let thresholdImg;
let averageFrame;

let thresholdSlider;
let styleBtn;
let resetBufferBtn;

let frameBuffer = [];
let lastMovementPercentage = 0;
let bufferWriteIndex = 0;
let bufferFillCount = 0;
let hasProcessedFrame = false;

const W = 320;
const H = 240;
const PIXEL_COUNT = W * H;
const BUFFER_SIZE = 10;

// 0 = promedio
// 1 = frame actual
// 2 = diferencias
// 3 = máscara binaria
let styleMode = 3;
const styleNames = [
  "Promedio",
  "Frame actual",
  "Diferencias",
  "Máscara binaria"
];

const TITLE_TEXT = "TÍTULO";
const SUBTITLE_TEXT = "Subtítulo / nombre del estilo gráfico";

const panel = {
  x: 280,
  y: 28,
  w: 360,
  h: 530
};

let tiles = [];

// Área global donde "vive" la imagen fragmentada.
// Todos los recortes se calculan respecto a este espacio.
let compositionBounds = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

function getPixelBrightness(idx, sourcePixels) {
  return (
    sourcePixels[idx] * 0.299 +
    sourcePixels[idx + 1] * 0.587 +
    sourcePixels[idx + 2] * 0.114
  );
}

function setup() {
  createCanvas(920, 620);
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

  initTiles();
  computeCompositionBounds();
  createUI();
}

function draw() {
  background(220);

  drawPanelBase();

  video.loadPixels();

  if (video.pixels.length > 0) {
    processNewFrame();
    drawFragmentedCanvases();
  } else {
    drawLoadingState();
  }

  drawInterfaceText();
}

function initTiles() {
  tiles = [
    { x: panel.x + 34,  y: panel.y + 110, w: 88,  h: 80 },
    { x: panel.x + 130, y: panel.y + 110, w: 88,  h: 80 },
    { x: panel.x + 226, y: panel.y + 110, w: 88,  h: 80 },

    { x: panel.x + 130, y: panel.y + 202, w: 184, h: 80 },

    { x: panel.x + 34,  y: panel.y + 294, w: 88,  h: 80 },
    { x: panel.x + 130, y: panel.y + 294, w: 88,  h: 80 }
  ];
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

function createUI() {
  thresholdSlider = createSlider(0, 100, 30, 1);
  thresholdSlider.position(panel.x + 34, panel.y + 392);
  thresholdSlider.size(90);

  styleBtn = createButton("Cambiar estilo");
  styleBtn.position(panel.x + 136, panel.y + 392);
  styleBtn.mousePressed(() => {
    styleMode = (styleMode + 1) % styleNames.length;
  });

  resetBufferBtn = createButton("Reiniciar buffer");
  resetBufferBtn.position(panel.x + 250, panel.y + 392);
  resetBufferBtn.mousePressed(resetBufferSystem);
}

function resetBufferSystem() {
  bufferWriteIndex = 0;
  bufferFillCount = 0;
  hasProcessedFrame = false;
  lastMovementPercentage = 0;

  for (let i = 0; i < BUFFER_SIZE; i++) {
    frameBuffer[i] = createImage(W, H);
    frameBuffer[i].loadPixels();
    frameBuffer[i].updatePixels();
  }
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

    averageFrame.pixels[i]     = avgR;
    averageFrame.pixels[i + 1] = avgG;
    averageFrame.pixels[i + 2] = avgB;
    averageFrame.pixels[i + 3] = 255;

    let currentBrightness = getPixelBrightness(i, video.pixels);
    let avgBrightness = avgR * 0.299 + avgG * 0.587 + avgB * 0.114;
    let difference = abs(currentBrightness - avgBrightness);

    if (difference >= threshold) movementPixels++;

    differenceImg.pixels[i]     = difference;
    differenceImg.pixels[i + 1] = difference;
    differenceImg.pixels[i + 2] = difference;
    differenceImg.pixels[i + 3] = 255;

    let bw = difference >= threshold ? 255 : 0;
    thresholdImg.pixels[i]     = bw;
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

function getActiveSource() {
  if (styleMode === 0) return averageFrame;
  if (styleMode === 1) return video;
  if (styleMode === 2) return differenceImg;
  return thresholdImg;
}

function drawFragmentedCanvases() {
  for (let t of tiles) {
    fill(180);
    stroke(130);
    strokeWeight(1.5);
    rect(t.x, t.y, t.w, t.h, 6);
  }

  if (!hasProcessedFrame) {
    fill(255);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(
      `Cargando buffer: ${bufferFillCount}/${BUFFER_SIZE}`,
      panel.x + panel.w / 2,
      panel.y + 470
    );
    return;
  }

  let src = getActiveSource();

  for (let t of tiles) {
    // Posición relativa del tile dentro de la composición global
    let relX = (t.x - compositionBounds.x) / compositionBounds.w;
    let relY = (t.y - compositionBounds.y) / compositionBounds.h;
    let relW = t.w / compositionBounds.w;
    let relH = t.h / compositionBounds.h;

    // Recorte correspondiente dentro de la imagen fuente
    let sx = relX * W;
    let sy = relY * H;
    let sw = relW * W;
    let sh = relH * H;

    image(src, t.x, t.y, t.w, t.h, sx, sy, sw, sh);
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
  text("Threshold", panel.x + 34, panel.y + 382);

  textSize(12);
  text(`Umbral actual: ${thresholdSlider.value()}`, panel.x + 34, panel.y + 430);
  text(`Estilo actual: ${styleNames[styleMode]}`, panel.x + 34, panel.y + 450);
  text(`Movimiento detectado: ${lastMovementPercentage.toFixed(1)}%`, panel.x + 34, panel.y + 470);
  text(`Buffer: ${bufferFillCount}/${BUFFER_SIZE}`, panel.x + 34, panel.y + 490);
}

function drawLoadingState() {
  fill(50);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 18);
}
