class Roots {
  constructor() {
    this.radius  = 0;
    this.strokeW = 1;
    this.spec    = [];
  }

  update(bassEnergy, spec) {
    this.radius  = map(bassEnergy, 0, 255, 20, max(width, height) * 0.6);
    this.strokeW = map(bassEnergy, 0, 255, 0.2, 3);
    this.spec    = spec;   // guarda el espectro de 512 bins
  }

  display(fgColor) {
    push();
    translate(width / 2, height / 2);
    strokeWeight(this.strokeW);
    stroke(fgColor[0], fgColor[1], fgColor[2], 255);   // alpha fijo p/debug

    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const angle = TWO_PI * i / segments;
      const bin   = floor(map(i, 0, segments - 1, 0, this.spec.length - 1));
      const amp   = this.spec[bin];                    // 0-255
      const len   = map(amp, 0, 255, this.radius * 0.2, this.radius);
      line(0, 0, cos(angle) * len, sin(angle) * len);
    }
    pop();
  }
}