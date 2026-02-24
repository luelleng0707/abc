

const canvas = document.getElementById('viewportCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('videoSource');

// 3x3 grid (9 cells total)
const GRID_COLS = 3;
const GRID_ROWS = 3;

let currentGridX = 1;  // middle
let currentGridY = 1;  // middle
let videoReady = false;

// Smoothing for orientation so movement feels less jumpy
let targetBeta = 0;
let targetGamma = 0;
let smoothBeta = 0;
let smoothGamma = 0;
const ORIENTATION_SMOOTHING = 0.15; // 0–1, higher = faster but less smooth

console.log("Script loaded. Video element:", video);

// Resize canvas to match viewport
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log("Canvas resized to", canvas.width, "x", canvas.height);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Draw the viewport from the video
function drawViewport() {
    if (!videoReady || video.readyState < 2) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f0';
        ctx.font = '20px monospace';
        ctx.fillText('Loading video...', 20, canvas.height / 2);
        return;
    }
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Calculate cell dimensions
    const cellWidth = videoWidth / GRID_COLS;
    const cellHeight = videoHeight / GRID_ROWS;
    
    // Calculate source rectangle based on grid position
    const srcX = currentGridX * cellWidth;
    const srcY = currentGridY * cellHeight;
    
    // Draw the cell to canvas
    ctx.drawImage(
        video,
        srcX, srcY, cellWidth, cellHeight,
        0, 0, canvas.width, canvas.height
    );
}

// Map smoothed orientation values to our 3x3 grid with clamping
function gammaToGridX(gamma) {
    // Limit to a comfortable range to avoid extreme tilts causing jumps
    const clamped = Math.max(-60, Math.min(60, gamma)); // -60..60
    const normalized = (clamped + 60) / 120;            // 0..1
    const idx = Math.floor(normalized * GRID_COLS);     // 0..3
    return Math.max(0, Math.min(GRID_COLS - 1, idx));   // 0..2
}

function betaToGridY(beta) {
    // Same idea as gamma: -60 (up) .. 60 (down)
    const clamped = Math.max(-60, Math.min(60, beta));
    const normalized = (clamped + 60) / 120;
    const idx = Math.floor(normalized * GRID_ROWS);
    return Math.max(0, Math.min(GRID_ROWS - 1, idx));
}

// Animation loop
function animate() {
    // Smoothly approach the latest orientation (low‑pass filter)
    smoothBeta += (targetBeta - smoothBeta) * ORIENTATION_SMOOTHING;
    smoothGamma += (targetGamma - smoothGamma) * ORIENTATION_SMOOTHING;

    currentGridX = gammaToGridX(smoothGamma);
    currentGridY = betaToGridY(smoothBeta);

    drawViewport();
    requestAnimationFrame(animate);
}

// Start animation when video is ready
video.addEventListener('loadedmetadata', function() {
    console.log("Video metadata loaded. Dimensions:", video.videoWidth, "x", video.videoHeight);
    videoReady = true;
    // Don't autoplay on iOS - wait for user interaction
});

video.addEventListener('error', function(e) {
    console.error("Video error:", e);
});

console.log("Attempting to load video...");
video.load();

// Start button handler
document.getElementById('startBtn').addEventListener('click', function() {
    console.log("Start button clicked");
    video.play().catch(err => console.error("Play error:", err));
    this.style.display = 'none';
    animate();
});

function handleOrientation(eventData) {
    const alpha = eventData.alpha || 0;
    const beta = eventData.beta || 0;     // forward/backward tilt
    const gamma = eventData.gamma || 0;   // left/right tilt
    
    // Update debug display
    document.getElementById('betaVal').textContent = Math.round(beta);
    document.getElementById('gammaVal').textContent = Math.round(gamma);
    
    // Store latest orientation; actual grid mapping happens in the animation loop
    targetBeta = beta;
    targetGamma = gamma;
}







