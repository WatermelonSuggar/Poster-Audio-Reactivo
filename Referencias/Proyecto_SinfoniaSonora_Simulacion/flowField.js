class FlowField {
  constructor(resolution) {
    this.resolution = resolution;
    this.cols = floor(width  / resolution);
    this.rows = floor(height / resolution);
    this.field = new Array(this.cols * this.rows);
    this.zoff  = 0;
  }

  // bassEnergy y midEnergy afectan escala y torsión
  update(bassEnergy, midEnergy) {
    const scaleBass = map(bassEnergy, 0, 255, 0.01, 0.08);
    const twistMid  = map(midEnergy, 0, 255, 0, 3);

    let xoff = 0;
    for (let x = 0; x < this.cols; x++) {
      let yoff = 0;
      for (let y = 0; y < this.rows; y++) {
        const angle = noise(xoff, yoff, this.zoff) * TWO_PI * (2 + twistMid);
        this.field[x + y * this.cols] = p5.Vector.fromAngle(angle);
        yoff += scaleBass;
      }
      xoff += scaleBass;
    }
    this.zoff += 0.001;
  }

  lookup(pos) {
    const col = floor(constrain(pos.x / this.resolution, 0, this.cols - 1));
    const row = floor(constrain(pos.y / this.resolution, 0, this.rows - 1));
    return this.field[col + row * this.cols].copy();
  }
}
