let video;
let differenceImg;
let thresholdImg;
let averageFrame;
let thresholdSlider;
let lastVideoTime = -1;
let frameBuffer = [];
let hasPreviousFrame = false;
let lastMovementPercentage = 0;
let bufferWriteIndex = 0;
let bufferFillCount  = 0;

// ── Constantes fijas ──
const W = 320;
const H = 240;
const PIXEL_COUNT  = W * H;
const BUFFER_SIZE  = 10; 

function getPixelBrightness(idx, sourcePixels) {
  return (
    sourcePixels[idx]     * 0.299 +
    sourcePixels[idx + 1] * 0.587 +
    sourcePixels[idx + 2] * 0.114
  );
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(W, H);
  video.hide();

  for (let i = 0; i < BUFFER_SIZE; i++) {
    let img = createImage(W, H);
    img.loadPixels();
    frameBuffer.push(img);
  }

  differenceImg = createImage(W, H);
  thresholdImg  = createImage(W, H);
  averageFrame  = createImage(W, H);

  thresholdSlider = createSlider(0, 100, 30);
  thresholdSlider.position(330, 455);
  thresholdSlider.style('width', '290px');

  // Info inicial en consola
  console.log(`%c[CONFIG] Buffer iniciado`, 'color: cyan');
  console.log(`Buffer size: ${BUFFER_SIZE} frames`);
  console.log(`Resolución: ${W}x${H}`);
  console.log(`Píxeles totales: ${PIXEL_COUNT}`);
}

function draw() {
  background(0);
  video.loadPixels();

  if (video.pixels.length > 0) {
    let currentTime = video.time();
    if (currentTime !== lastVideoTime) {
      processNewFrame();
      lastVideoTime = currentTime;
    }
    drawQuadrants();
  }

  drawLabelsAndGrid();
}

function processNewFrame() {
  // ── Copiar frame al slot del buffer ──
  let slot = frameBuffer[bufferWriteIndex];
  slot.loadPixels();
  for (let i = 0; i < video.pixels.length; i++) {
    slot.pixels[i] = video.pixels[i];
  }
  slot.updatePixels();

  bufferWriteIndex = (bufferWriteIndex + 1) % BUFFER_SIZE;
  if (bufferFillCount < BUFFER_SIZE) bufferFillCount++;

  // Log de progreso mientras carga
  if (bufferFillCount < BUFFER_SIZE) {
    console.log(`%c[BUFFER] Cargando: ${bufferFillCount}/${BUFFER_SIZE}`, 'color: orange');
    return;
  }

  // ── Calcular promedio y diferencias en un solo loop ──
  averageFrame.loadPixels();
  differenceImg.loadPixels();
  thresholdImg.loadPixels();

  for (let f = 0; f < BUFFER_SIZE; f++) {
    frameBuffer[f].loadPixels();
  }

  const threshold = thresholdSlider.value();
  let movementPixels = 0;

  for (let i = 0; i < PIXEL_COUNT * 4; i += 4) {
    let totalR = 0, totalG = 0, totalB = 0;
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
    let avgBrightness     = avgR * 0.299 + avgG * 0.587 + avgB * 0.114;
    let difference = Math.abs(currentBrightness - avgBrightness);

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

  // ── Log de estado en consola ──
  let status = lastMovementPercentage > 15 ? "MUCHO" :
               lastMovementPercentage > 2  ? "MODERADO" : "POCO";
  let color  = lastMovementPercentage > 15 ? "red" :
               lastMovementPercentage > 2  ? "orange" : "green";
  console.log(
    `%c[MOVIMIENTO] ${status} — ${lastMovementPercentage.toFixed(1)}% | Umbral: ${threshold} | Frame: ${lastVideoTime.toFixed(3)}s`,
    `color: ${color}`
  );

  hasPreviousFrame = true;
}

function drawQuadrants() {
  if (!hasPreviousFrame) {
    fill(40); noStroke();
    rect(0, 0, W, H);
    rect(W, 0, W, H);
    rect(0, H, W, H);
    rect(W, H, W, H);
    fill(255); textSize(13);
    text(`Cargando buffer: ${bufferFillCount}/${BUFFER_SIZE}`, 10, 260);
    return;
  }

  image(averageFrame,   0, 0, W, H); // Cuadrante 1
  image(video,          W, 0, W, H); // Cuadrante 2
  image(differenceImg,  0, H, W, H); // Cuadrante 3
  image(thresholdImg,   W, H, W, H); // Cuadrante 4

  // ── Alertas cuadrante 3 ──
  let statusColor, statusText;
  if (lastMovementPercentage > 15) {
    statusColor = color(255, 0, 0);
    statusText  = "MUCHO MOVIMIENTO";
  } else if (lastMovementPercentage > 2) {
    statusColor = color(255, 255, 0);
    statusText  = "MOVIMIENTO MODERADO";
  } else {
    statusColor = color(0, 255, 0);
    statusText  = "POCO MOVIMIENTO";
  }

  fill(statusColor); noStroke(); textSize(13);
  text(statusText, 10, height - 35);
  fill(255);
  text(`Movimiento: ${lastMovementPercentage.toFixed(1)}%`, 10, height - 18);

  // ── Info cuadrante 4 ──
  fill(255); noStroke(); textSize(13);
  text(`Umbral: ${thresholdSlider.value()}`,     W + 10, height - 35);
  text(`Buffer: ${BUFFER_SIZE} frames (fijo)`,   W + 10, height - 18);
  text(`Frame: ${lastVideoTime.toFixed(3)}s`,    W + 10, height - 52);
}

function drawLabelsAndGrid() {
  stroke(255); strokeWeight(2);
  line(W, 0, W, height);
  line(0, H, width, H);

  noStroke(); fill(255); textSize(12);
  text("FRAME PROMEDIO",        10,  15);
  text("FRAME ACTUAL",         330,  15);
  text("DIFERENCIAS (grises)",  10, 255);
  text("MÁSCARA BINARIA",      330, 255);

  textSize(11);
  //text("UMBRAL", 330, 450);
}