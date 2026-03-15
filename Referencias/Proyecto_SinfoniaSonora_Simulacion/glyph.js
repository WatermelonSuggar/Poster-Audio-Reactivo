class Glyph {
  constructor(x, y) {
    this.pos  = createVector(x, y);
    this.life = 120;
    this.size = random(16, 32);
  }

  update() { this.life--; }

  display(fgColor) {
    push();
    translate(this.pos.x, this.pos.y);
    noFill();
    stroke(fgColor[0], fgColor[1], fgColor[2], this.life * 2);
    rotate(frameCount * 0.02);

    beginShape();
    for (let a = 0; a < TWO_PI * 3; a += 0.1) {
      const r = map(a, 0, TWO_PI * 3, 0, this.size);
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape();
    triangle(-this.size, this.size * 0.3, this.size, this.size * 0.3, 0, -this.size);
    pop();
  }
}
