function preload() {
  audioPreload();
}

function setup() {
  createCanvas(580, 700);
  pixelDensity(1);
  textFont("Times New Roman");

  audioInit();
  vpInit();
  lmInit();
  flowAudioInit();
  uiInit();
  recorderInit();

  if (APP_CONFIG.audio.autoplay) {
    userStartAudio().then(() => {
      audioStart();
    });
  }
}

function draw() {
  background(8);

  audioUpdate();
  flowAudioUpdate();

  drawPanelBase();
  flowAudioDraw();

  vpUpdate();
  lmUpdateMovement();
  drawFragmentedCanvases();
  drawInterfaceText();
}

function mousePressed() {
  const d = dist(mouseX, mouseY, audioButtonBounds.x, audioButtonBounds.y);

  if (d <= audioButtonBounds.r) {
    userStartAudio().then(() => {
      audioToggle();
    });
  }
}

function keyPressed() {
  if (key === "r" || key === "R") {
    toggleCanvasRecording();
  }
}