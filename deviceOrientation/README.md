# Globe to 360° City Viewer

A web app that lets you explore the world from a 3D globe. Tap city pins for info, double-tap to enter immersive 360° views. Move your phone to look around and step forward/back to zoom—no taps needed once you're in.

## What it does

- **Globe view** – 3D Earth with city pins. Drag to rotate, pinch or scroll to zoom.
- **City info** – Single tap a pin to see city name, continent, and fun facts.
- **360° view** – Double-tap a pin to enter. Use phone orientation to look around, step forward/back to zoom. Pinch and scroll work as backup.
- **Credits** – 10 city visits per user per day (resets at midnight).

## Run it

```bash
npm install
npm start
```

Open `https://localhost:3000` (accept the self-signed cert). Use ngrok to test on your phone.

## Tech

- Plain JavaScript, Three.js, Node.js (Express + HTTPS)
- Device orientation and motion for phone controls
