let video;
let thresholdImg;
let opticalInterlaceImg;
let binaryPixelImg;
let duotoneDiffImg;
let posterGreenImg;

let frameBuffer = [];
let lastMovementPercentage = 0;
let bufferWriteIndex = 0;
let bufferFillCount = 0;
let hasProcessedFrame = false;

const W = 480;
const H = 360;
const PIXEL_COUNT = W * H;
const BUFFER_SIZE = 6;

// threshold fijo
const FIXED_THRESHOLD = 35;

let sumR, sumG, sumB;

const styles = [
  { name: "DUALIDAD", key: "opticalInterlace" },
  { name: "MÁSCARA BINARIA",    key: "binary" },
  { name: "PIXELART",           key: "binaryPixel" },
  { name: "DUOTONE",            key: "duotoneDiff" },
  { name: "POSTER VERDE",       key: "posterGreen" }
];
let currentStyleIndex = 0;

function vpInit() {
  video = createCapture({
    video: {
      width:  { ideal: W },
      height: { ideal: H },
      facingMode: "user"
    },
    audio: false
  });

  video.size(W, H);
  video.hide();

  for (let i = 0; i < BUFFER_SIZE; i++) {
    const img = createImage(W, H);
    img.loadPixels();
    frameBuffer.push(img);
  }

  thresholdImg      = createImage(W, H);
  opticalInterlaceImg = createImage(W, H);
  binaryPixelImg    = createImage(W, H);
  duotoneDiffImg    = createImage(W, H);
  posterGreenImg    = createImage(W, H);   // ← nuevo

  sumR = new Float32Array(PIXEL_COUNT);
  sumG = new Float32Array(PIXEL_COUNT);
  sumB = new Float32Array(PIXEL_COUNT);
}

function vpUpdate() {
  video.loadPixels();

  if (video.pixels.length === 0) {
    hasProcessedFrame = false;
    return;
  }

  const slot = frameBuffer[bufferWriteIndex];
  slot.loadPixels();

  // copiar frame en espejo al buffer
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcX   = W - 1 - x;
      const srcIdx = (y * W + srcX) * 4;
      const dstIdx = (y * W + x)    * 4;

      slot.pixels[dstIdx]     = video.pixels[srcIdx];
      slot.pixels[dstIdx + 1] = video.pixels[srcIdx + 1];
      slot.pixels[dstIdx + 2] = video.pixels[srcIdx + 2];
      slot.pixels[dstIdx + 3] = 255;
    }
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

  let movementPixels = 0;
  const threshold = FIXED_THRESHOLD;

  let p = 0;
  for (let idx = 0; idx < PIXEL_COUNT; idx++, p += 4) {
    const avgR = sumR[idx] / BUFFER_SIZE;
    const avgG = sumG[idx] / BUFFER_SIZE;
    const avgB = sumB[idx] / BUFFER_SIZE;

    const latestIdx = (bufferWriteIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE;
    const r = frameBuffer[latestIdx].pixels[p];
    const g = frameBuffer[latestIdx].pixels[p + 1];
    const b = frameBuffer[latestIdx].pixels[p + 2];

    const currentBrightness = vpBrightness(r, g, b);
    const avgBrightness     = vpBrightness(avgR, avgG, avgB);
    const difference        = abs(currentBrightness - avgBrightness);

    if (difference >= threshold) movementPixels++;

    const bw = difference >= threshold ? 255 : 0;
    thresholdImg.pixels[p]     = bw;
    thresholdImg.pixels[p + 1] = bw;
    thresholdImg.pixels[p + 2] = bw;
    thresholdImg.pixels[p + 3] = 255;

    // colores duotone
    const amt   = constrain(map(difference, 0, 120, 0, 1), 0, 1);
    const darkR = 8,  darkG = 20,  darkB = 60;
    const lightR = 80, lightG = 255, lightB = 140;

    duotoneDiffImg.pixels[p]     = lerp(darkR,  lightR,  amt);
    duotoneDiffImg.pixels[p + 1] = lerp(darkG,  lightG,  amt);
    duotoneDiffImg.pixels[p + 2] = lerp(darkB,  lightB,  amt);
    duotoneDiffImg.pixels[p + 3] = 255;
  }

  thresholdImg.updatePixels();
  duotoneDiffImg.updatePixels();

  buildOpticalInterlace();
  buildBinaryPixelFast();
  buildPosterGreen();        // ← nuevo

  lastMovementPercentage = (movementPixels / PIXEL_COUNT) * 100;
  hasProcessedFrame = true;
}

function vpBrightness(r, g, b) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

// ---------------------------------------------------------------------------
//  POSTER VERDE — posterización en 4 niveles + mapa de color verde / negro
//  Inspirado en estética cámara de seguridad / terminal ANSI.
//
//  Pipeline:
//    1. Luma del frame espejado más reciente
//    2. Boost de contraste (curva sigmoide suave)
//    3. Cuantización en LEVELS escalones uniformes
//    4. Mapeo a paleta verde monocromática
// ---------------------------------------------------------------------------
function buildPosterGreen() {
  posterGreenImg.loadPixels();

  const latestFrame = frameBuffer[(bufferWriteIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE];
  latestFrame.loadPixels();

  // Número de niveles de posterización (4 = muy duro, 6 = algo más suave)
  const LEVELS = 4;

  // Paleta verde: de negro absoluto hasta verde saturado brillante
  // Índice 0 = más oscuro, LEVELS-1 = más claro
  const palette = [
    [  0,   0,   0],   // negro
    [ 10,  60,  15],   // verde muy oscuro
    [ 30, 160,  40],   // verde medio
    [ 80, 255, 100],   // verde neón
  ];

  // Si LEVELS != 4 generamos la paleta interpolada automáticamente
  const colorMap = buildGreenPalette(LEVELS);

  let p = 0;
  for (let idx = 0; idx < PIXEL_COUNT; idx++, p += 4) {
    const r = latestFrame.pixels[p];
    const g = latestFrame.pixels[p + 1];
    const b = latestFrame.pixels[p + 2];

    // 1. Luma normalizada [0,1]
    let luma = vpBrightness(r, g, b) / 255;

    // 2. Boost de contraste: S-curve suave centrada en 0.45
    //    Empuja sombras hacia negro y luces hacia blanco
    luma = sigmoidContrast(luma, 0.45, 7.0);

    // 3. Cuantización: mapear a uno de los LEVELS niveles
    const levelIdx = constrain(floor(luma * LEVELS), 0, LEVELS - 1);

    // 4. Color de la paleta
    posterGreenImg.pixels[p]     = colorMap[levelIdx][0];
    posterGreenImg.pixels[p + 1] = colorMap[levelIdx][1];
    posterGreenImg.pixels[p + 2] = colorMap[levelIdx][2];
    posterGreenImg.pixels[p + 3] = 255;
  }

  posterGreenImg.updatePixels();
}

/**
 * Curva sigmoide para boost de contraste.
 * @param {number} x      valor de entrada [0,1]
 * @param {number} center punto de inflexión (0.45 empuja sombras)
 * @param {number} slope  pendiente — mayor = más contraste duro
 * @returns {number} valor ajustado [0,1]
 */
function sigmoidContrast(x, center, slope) {
  return 1 / (1 + exp(-slope * (x - center)));
}

/**
 * Genera una paleta de LEVELS colores interpolando
 * entre negro (#000) y verde neón (#50FF64).
 * Permite cambiar LEVELS libremente sin tocar la paleta manualmente.
 */
function buildGreenPalette(levels) {
  const darkR = 0,   darkG = 0,   darkB = 0;
  const midR  = 10,  midG  = 90,  midB  = 20;   // verde oscuro intermedio
  const brightR = 80, brightG = 255, brightB = 100;

  const out = [];
  for (let i = 0; i < levels; i++) {
    const t = levels === 1 ? 0 : i / (levels - 1);

    let cr, cg, cb;
    if (t < 0.5) {
      // negro → verde oscuro
      const u = t * 2;
      cr = lerp(darkR, midR, u);
      cg = lerp(darkG, midG, u);
      cb = lerp(darkB, midB, u);
    } else {
      // verde oscuro → verde neón
      const u = (t - 0.5) * 2;
      cr = lerp(midR,    brightR, u);
      cg = lerp(midG,    brightG, u);
      cb = lerp(midB,    brightB, u);
    }
    out.push([round(cr), round(cg), round(cb)]);
  }
  return out;
}

// ---------------------------------------------------------------------------

function buildOpticalInterlace() {
  opticalInterlaceImg.loadPixels();

  const latestFrame = frameBuffer[(bufferWriteIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE];
  latestFrame.loadPixels();

  const stripeW = 12;
  const offsetX = 34;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      const r1   = latestFrame.pixels[idx];
      const g1   = latestFrame.pixels[idx + 1];
      const b1   = latestFrame.pixels[idx + 2];
      const lum1 = vpBrightness(r1, g1, b1);

      const sx   = constrain(W - 1 - x + offsetX, 0, W - 1);
      const idx2 = (y * W + sx) * 4;
      const r2   = latestFrame.pixels[idx2];
      const g2   = latestFrame.pixels[idx2 + 1];
      const b2   = latestFrame.pixels[idx2 + 2];
      const lum2 = vpBrightness(r2, g2, b2);

      const monoA = lum1 > 122 ? 238 : 28;
      const monoB = lum2 > 122 ? 230 : 18;

      const stripeIndex = floor(x / stripeW);
      const useA = stripeIndex % 2 === 0;

      let value = useA ? monoA : monoB;

      if (x % stripeW === 0 || x % stripeW === stripeW - 1) {
        value = max(0, value - 22);
      }

      opticalInterlaceImg.pixels[idx]     = value;
      opticalInterlaceImg.pixels[idx + 1] = value;
      opticalInterlaceImg.pixels[idx + 2] = value;
      opticalInterlaceImg.pixels[idx + 3] = 255;
    }
  }

  opticalInterlaceImg.updatePixels();
}

function buildBinaryPixelFast() {
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
            const stripe = (xx % 2 === 0) ? 220 : 160;
            binaryPixelImg.pixels[idx]     = 40;
            binaryPixelImg.pixels[idx + 1] = stripe;
            binaryPixelImg.pixels[idx + 2] = 60;
            binaryPixelImg.pixels[idx + 3] = 255;
          } else {
            binaryPixelImg.pixels[idx]     = 5;
            binaryPixelImg.pixels[idx + 1] = 20;
            binaryPixelImg.pixels[idx + 2] = 8;
            binaryPixelImg.pixels[idx + 3] = 255;
          }
        }
      }
    }
  }

  binaryPixelImg.updatePixels();
}

function vpGetActiveSource() {
  const styleKey = styles[currentStyleIndex].key;

  if (styleKey === "opticalInterlace") return opticalInterlaceImg;
  if (styleKey === "binary")           return thresholdImg;
  if (styleKey === "binaryPixel")      return binaryPixelImg;
  if (styleKey === "duotoneDiff")      return duotoneDiffImg;
  if (styleKey === "posterGreen")      return posterGreenImg;   // ← nuevo

  return opticalInterlaceImg;
}