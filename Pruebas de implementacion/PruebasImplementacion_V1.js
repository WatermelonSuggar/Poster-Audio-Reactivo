let video;

const camW = 640;
const camH = 480;

let prevFrame;
let bgFrame;
let processedFrame;

let thresholdSlider;
let adaptSlider;
let calibrateBtn;
let modeBtn;

let initialized = false;

// 0 = frame difference
// 1 = background subtraction
// 2 = híbrido
let detectionMode = 2;
const modeNames = ["Frame Diff", "Background", "Híbrido"];

const panel = {
  x: 280,
  y: 28,
  w: 360,
  h: 530
};

const preview = {
  x: 670,
  y: 160,
  w: 210,
  h: 210
};

let tiles = [];

function setup() {
  createCanvas(920, 620);
  pixelDensity(1);
  textFont("Arial");

  const constraints = {
    video: {
      width: { ideal: camW },
      height: { ideal: camH },
      facingMode: "user"
    },
    audio: false
  };

  video = createCapture(constraints);
  video.size(camW, camH);
  video.hide();

  prevFrame = createImage(camW, camH);
  bgFrame = createImage(camW, camH);
  processedFrame = createImage(camW, camH);

  initTiles();
  createUI();

  // intenta capturar un fondo inicial cuando la cámara ya tenga imagen
  setTimeout(captureBackground, 1000);
}

function draw() {
  background(225);

  drawInterface();

  if (video.elt.readyState >= 2) {
    if (!initialized && frameCount % 30 === 0) {
      captureBackground();
    }

    if (initialized) {
      processDetection();
      drawFragmentedView();
      drawPreview();
      prevFrame.copy(video, 0, 0, camW, camH, 0, 0, camW, camH);
    } else {
      drawLoadingMessage();
    }
  } else {
    drawLoadingMessage();
  }

  drawInfoText();
}

function initTiles() {
  tiles = [
    // fila superior
    { x: panel.x + 34,  y: panel.y + 110, w: 88,  h: 80,  sx: 0,   sy: 0,   sw: 213, sh: 160 },
    { x: panel.x + 130, y: panel.y + 110, w: 88,  h: 80,  sx: 213, sy: 0,   sw: 213, sh: 160 },
    { x: panel.x + 226, y: panel.y + 110, w: 88,  h: 80,  sx: 426, sy: 0,   sw: 214, sh: 160 },

    // bloque medio ancho
    { x: panel.x + 130, y: panel.y + 202, w: 184, h: 80,  sx: 213, sy: 160, sw: 427, sh: 160 },

    // fila inferior
    { x: panel.x + 34,  y: panel.y + 294, w: 88,  h: 80,  sx: 0,   sy: 320, sw: 213, sh: 160 },
    { x: panel.x + 130, y: panel.y + 294, w: 88,  h: 80,  sx: 213, sy: 320, sw: 213, sh: 160 }
  ];
}

function createUI() {
  thresholdSlider = createSlider(5, 120, 30, 1);
  thresholdSlider.position(panel.x + 36, panel.y + 388);
  thresholdSlider.size(85);

  adaptSlider = createSlider(1, 30, 6, 1);
  adaptSlider.position(panel.x + 36, panel.y + 438);
  adaptSlider.size(85);

  calibrateBtn = createButton("Calibrar fondo");
  calibrateBtn.position(panel.x + 135, panel.y + 392);
  calibrateBtn.mousePressed(captureBackground);

  modeBtn = createButton("Modo: Híbrido");
  modeBtn.position(panel.x + 243, panel.y + 392);
  modeBtn.mousePressed(() => {
    detectionMode = (detectionMode + 1) % 3;
    modeBtn.html("Modo: " + modeNames[detectionMode]);
  });
}

function captureBackground() {
  if (video.elt.readyState < 2) return;

  video.loadPixels();
  if (video.pixels.length > 0) {
    bgFrame.copy(video, 0, 0, camW, camH, 0, 0, camW, camH);
    prevFrame.copy(video, 0, 0, camW, camH, 0, 0, camW, camH);
    initialized = true;
  }
}

function processDetection() {
  video.loadPixels();
  prevFrame.loadPixels();
  bgFrame.loadPixels();
  processedFrame.loadPixels();

  const threshold = thresholdSlider.value();
  const adapt = adaptSlider.value() / 1000.0;

  for (let i = 0; i < video.pixels.length; i += 4) {
    const r = video.pixels[i];
    const g = video.pixels[i + 1];
    const b = video.pixels[i + 2];

    const pr = prevFrame.pixels[i];
    const pg = prevFrame.pixels[i + 1];
    const pb = prevFrame.pixels[i + 2];

    const br = bgFrame.pixels[i];
    const bg = bgFrame.pixels[i + 1];
    const bb = bgFrame.pixels[i + 2];

    const lum  = 0.299 * r  + 0.587 * g  + 0.114 * b;
    const plum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
    const blum = 0.299 * br + 0.587 * bg + 0.114 * bb;

    const frameDiff = abs(lum - plum);
    const bgDiff = abs(lum - blum);

    let diffValue = 0;

    if (detectionMode === 0) {
      diffValue = frameDiff;
    } else if (detectionMode === 1) {
      diffValue = bgDiff;
    } else {
      diffValue = max(bgDiff, frameDiff * 0.85);
    }

    // visualización del resultado
    if (diffValue > threshold) {
      // sujeto detectado
      processedFrame.pixels[i]     = r;
      processedFrame.pixels[i + 1] = g;
      processedFrame.pixels[i + 2] = b;
      processedFrame.pixels[i + 3] = 255;
    } else {
      // fondo oscuro para estética gráfica
      processedFrame.pixels[i]     = 18;
      processedFrame.pixels[i + 1] = 18;
      processedFrame.pixels[i + 2] = 18;
      processedFrame.pixels[i + 3] = 255;
    }

    // actualización adaptativa del fondo:
    // si el cambio es pequeño, el fondo aprende más rápido;
    // si el cambio es grande, aprende mucho más lento.
    const localAdapt = bgDiff < threshold * 0.6 ? adapt : adapt * 0.03;

    bgFrame.pixels[i]     = lerp(br, r, localAdapt);
    bgFrame.pixels[i + 1] = lerp(bg, g, localAdapt);
    bgFrame.pixels[i + 2] = lerp(bb, b, localAdapt);
    bgFrame.pixels[i + 3] = 255;
  }

  processedFrame.updatePixels();
  bgFrame.updatePixels();
}

function drawFragmentedView() {
  for (let t of tiles) {
    // marco
    fill(180);
    stroke(130);
    strokeWeight(1.5);
    rect(t.x, t.y, t.w, t.h, 6);

    // fragmento de cámara procesada
    image(
      processedFrame,
      t.x, t.y, t.w, t.h,
      t.sx, t.sy, t.sw, t.sh
    );
  }
}

function drawPreview() {
  fill(245);
  stroke(190);
  strokeWeight(1.5);
  rect(preview.x, preview.y, preview.w, preview.h, 10);

  image(processedFrame, preview.x + 8, preview.y + 8, preview.w - 16, preview.h - 16);

  noStroke();
  fill(40);
  textAlign(CENTER);
  textSize(13);
  text("Preview detección", preview.x + preview.w / 2, preview.y + preview.h + 24);
}

function drawInterface() {
  // panel principal
  fill(248);
  stroke(120);
  strokeWeight(2);
  rect(panel.x, panel.y, panel.w, panel.h, 4);

  // título y subtítulo
  noStroke();
  fill(25);
  textAlign(CENTER);
  textStyle(BOLD);
  textSize(20);
  text("POSTER INTERACTIVO", panel.x + panel.w / 2, panel.y + 66);

  textStyle(NORMAL);
  textSize(15);
  text("Subtítulo / nombre del estilo gráfico", panel.x + panel.w / 2, panel.y + 92);

  // espacio visual para los bloques
  for (let t of tiles) {
    fill(185);
    stroke(135);
    strokeWeight(1.5);
    rect(t.x, t.y, t.w, t.h, 6);
  }

  // etiquetas de controles
  noStroke();
  fill(40);
  textAlign(LEFT);
  textSize(13);
  text("Threshold", panel.x + 34, panel.y + 382);
  text("Adaptación fondo", panel.x + 34, panel.y + 432);
}

function drawInfoText() {
  noStroke();
  fill(45);
  textAlign(LEFT);
  textSize(14);

  text(
    "Threshold actual: " + thresholdSlider.value(),
    panel.x + 135,
    panel.y + 448
  );

  text(
    "Usa “Calibrar fondo” cuando la escena esté quieta.\n" +
    "Sube el threshold si hay mucho ruido.\n" +
    "Bájalo si no detecta suficiente movimiento.",
    24,
    70
  );
}

function drawLoadingMessage() {
  fill(50);
  noStroke();
  textAlign(CENTER);
  textSize(16);
  text("Inicializando cámara...", panel.x + panel.w / 2, panel.y + panel.h - 18);
}
