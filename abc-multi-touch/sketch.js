function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
}

function draw() {
  background(90, 200, 190);
  
  // Draw circles at each touch point
  fill(0);
  for (let i = 0; i < touches.length; i++) {
    circle(touches[i].x, touches[i].y, 100);
  }
}

// P5 touch events: https://p5js.org/reference/#Touch

function touchStarted() {
  console.log(touches);
}

function touchMoved() {
}

function touchEnded() {
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

