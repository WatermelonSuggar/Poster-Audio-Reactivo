class ParticleSystem {
  constructor(flowField) {
    this.flowField = flowField;
    this.particles = [];
  }

  // recibe waveform
  update(ampLvl, mid, treble, peakHit, waveArr) {
    /* spawn controlado por agudos */
    const spawnCount = int(map(treble, 0, 255, 0, 30));
    for (let i = 0; i < spawnCount; i++) {
      this.particles.push(new Particle(random(width), random(height)));
    }

    /* destello extra en picos */
    if (peakHit) {
      for (let i = 0; i < 20; i++) {
        this.particles.push(new Particle(random(width), random(height)));
      }
    }

    /* actualizar y dibujar */
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.type = floor(map(mouseX, 0, width, 0, 2.99));

      const force = this.flowField.lookup(p.pos).mult(0.2);
      p.applyForce(force);
      p.update(ampLvl, mid, waveArr);
      p.edges();

      if (p.isDead()) this.particles.splice(i, 1);
    }
  }

  display(fgColor) {
    for (let p of this.particles) p.display(fgColor);
  }
}
