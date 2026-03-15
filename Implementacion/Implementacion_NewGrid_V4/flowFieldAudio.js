let flowGraphics;
let flowTime = 0;

function flowAudioInit() {
  flowGraphics = createGraphics(width, height);
  flowGraphics.pixelDensity(1);
  flowGraphics.clear();
}

function flowAudioUpdate() {
  if (!audioState.ready) return;

  flowTime += APP_CONFIG.flow.speedBase + audioState.bass * APP_CONFIG.flow.speedRange;
}

function flowAudioDraw() {
  if (!flowGraphics) return;

  flowGraphics.clear();
  flowGraphics.push();

  // recorta al panel principal
  flowGraphics.drawingContext.save();
  flowGraphics.drawingContext.beginPath();
  flowGraphics.drawingContext.roundRect(panel.x, panel.y, panel.w, panel.h, 10);
  flowGraphics.drawingContext.clip();

  const spacing = APP_CONFIG.flow.spacing;
  const noiseScale =
    APP_CONFIG.flow.noiseScaleBase +
    audioState.bass * APP_CONFIG.flow.noiseScaleRange;

  const twist =
    APP_CONFIG.flow.twistBase +
    audioState.mid * APP_CONFIG.flow.twistRange;

  const lineLength =
    APP_CONFIG.flow.lineLengthBase +
    audioState.mid * APP_CONFIG.flow.lineLengthRange;

  const strokeW =
    APP_CONFIG.flow.strokeWeightBase +
    audioState.bass * APP_CONFIG.flow.strokeWeightRange;

  const c = flowPickColor();

  flowGraphics.stroke(c[0], c[1], c[2], map(audioState.level, 0, 0.3, 25, 110, true));
  flowGraphics.strokeWeight(strokeW);
  flowGraphics.noFill();

  for (let y = panel.y; y < panel.y + panel.h; y += spacing) {
    for (let x = panel.x; x < panel.x + panel.w; x += spacing) {
      const n = noise(
        (x - panel.x) * noiseScale,
        (y - panel.y) * noiseScale,
        flowTime
      );

      const angle = n * TWO_PI * twist;

      const x2 = x + cos(angle) * lineLength;
      const y2 = y + sin(angle) * lineLength;

      flowGraphics.line(x, y, x2, y2);
    }
  }

  flowGraphics.drawingContext.restore();
  flowGraphics.pop();

  image(flowGraphics, 0, 0);
}

function flowPickColor() {
  if (audioState.treble > 0.62) return [120, 255, 120];
  if (audioState.mid > 0.48) return [80, 220, 90];
  return [180, 255, 170];
}
