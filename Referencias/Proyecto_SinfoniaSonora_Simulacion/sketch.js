const smoothing = 0.5;
const bins = 512;

let song, amp, fft;
let waveform = [];
let spectrum = [];
let volLow, volMid, volHigh;

let flowField, roots, ps;
let glyphs = [];

/* ─── Paletas de color personalizadas ─── */
const palettes = [
  // Paleta 0 – tonos púrpura y cian apagados
  { bg: [15, 10, 25], fg: [ 90,  20, 140] },

  // Paleta 1 – rojos profundos y dorados oscuros
  { bg: [20,  5,  5], fg: [200, 90,  40] },

  // Paleta 2 – verdes sombríos (si quieres agregar más)
  { bg: [ 5, 15, 10], fg: [ 30,120, 60] }
];
let palIndex = 0;   // arrancar con la primera


function preload() {
  song = loadSound('TheEmptinessMachine.mp3');   // 
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor();

  amp = new p5.Amplitude();
  fft = new p5.FFT(smoothing, bins);

  flowField = new FlowField(25);
  roots     = new Roots();
  ps        = new ParticleSystem(flowField);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  /* ───── 1. ANÁLISIS DE AUDIO ───── */
  fft.analyze();
  waveform = fft.waveform();
  spectrum = fft.analyze();            // 512-bins

  volLow  = fft.getEnergy(20, 250);    // graves ampliados
  volMid  = fft.getEnergy(250, 2000);  // medios
  volHigh = fft.getEnergy(2000, 8000); // agudos

  const ampLvl = amp.getLevel();

  /* ───── 2. FONDO (siempre en BLEND) ───── */
  blendMode(BLEND);                   
  const alpha = map(ampLvl, 0, 1, 200, 20);   
  const bg    = palettes[palIndex].bg;
  background(bg[0], bg[1], bg[2], alpha);

  /* (Opcional) reactiva modo aditivo para brillos */
  blendMode(ADD);

  /* ───── 3. SISTEMAS VISUALES ───── */
  flowField.update(max(volLow, 10), max(volMid, 10));   // nunca 0

  roots.update(max(volLow, 10), spectrum);
  roots.display(palettes[palIndex].fg);

  const peakHit = volHigh > 180;
  ps.update(ampLvl, max(volMid, 20), volHigh, peakHit, waveform);
  ps.display(palettes[palIndex].fg);

  /* ───── 4. GLIFOS (clic) ───── */
  for (let g of glyphs) {
    g.update();
    g.display(palettes[palIndex].fg);
  }
  glyphs = glyphs.filter(g => g.life > 0);
}

/* ──────────── INTERACCIONES ──────────── */
function mousePressed() {
  /* 1. Autoplay seguro */
  if (!song.isPlaying()) {
    userStartAudio();   // desbloquea el AudioContext
    song.play();
  }

  /* 2. Revelar símbolo */
  glyphs.push(new Glyph(mouseX, mouseY));
}

function keyPressed() {
  palIndex = (palIndex + 1) % palettes.length;
}
