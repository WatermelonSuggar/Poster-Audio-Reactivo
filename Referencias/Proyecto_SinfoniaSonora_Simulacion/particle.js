class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.acc = createVector();
    this.lifespan = 255;
    this.baseSize = random(4, 8);
    this.size     = this.baseSize;
    this.deform   = 0;
    this.type = 0;          // 0=círculo, 1=triángulo, 2=blob
  }

  applyForce(f) { this.acc.add(f); }

  // recibe waveform
  update(ampLvl, midEnergy, waveArr) {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.lifespan -= 2;

    // pulsación global
  let targetSize = map(ampLvl, 0, 1, this.baseSize * 0.5, this.baseSize * 3);
this.size = lerp(this.size, targetSize, 0.1); // suaviza la transición de tamaño


    // deformación geométrica
    this.deform = map(midEnergy, 0, 255, 0, 0.6) * map(mouseY, 0, height, 0, 1);

    // ondulación local con waveform
    const idx = floor(map(this.pos.x, 0, width, 0, waveArr.length - 1));
    const waveBoost = map(waveArr[idx], -1, 1, -0.3, 0.3);
    this.size *= 1 + waveBoost;
  }

  display(fgColor) {
    noFill();
    stroke(fgColor[0], fgColor[1], fgColor[2], max(this.lifespan, 60));
    strokeWeight(map(this.lifespan, 255, 0, 0.5, 2));

    push();
    translate(this.pos.x, this.pos.y);
    rotate(frameCount * 0.01);

    switch (this.type) {
      case 0:
        ellipse(0, 0, this.size * (1 + this.deform));
        break;
      case 1:
        polygon(0, 0, this.size, 3, this.deform);
        break;
      case 2:
        fractalBlob(this.size, this.deform);
        break;
    }
    pop();
  }

  isDead() { return this.lifespan < 0; }

  edges() {
    if (this.pos.x > width)  this.pos.x = 0;
    if (this.pos.x < 0)      this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0)      this.pos.y = height;
  }
}

/* === helpers === */
function polygon(x, y, radius, npoints, deform = 0) {
  const angle = TWO_PI / npoints;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    const r = radius * (1 + deform * noise(a));
    vertex(x + cos(a) * r, y + sin(a) * r);
  }
  endShape(CLOSE);
}

function fractalBlob(radius, deform) {
  beginShape();
  for (let a = 0; a < TWO_PI; a += 0.2) {
    const offset = map(noise(cos(a) + 1, sin(a) + 1), 0, 1, -deform, deform);
    const r = radius * (1 + offset);
    vertex(cos(a) * r, sin(a) * r);
  }
  endShape(CLOSE);
}
