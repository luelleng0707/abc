# Globe 360 – City Viewer

A progressive web app that lets you explore cities in 360° using device orientation. Spin an interactive globe, tap cities to enter Google Street View, and use your phone’s motion sensors to look around. Includes real-time group chat and an AI tour guide.

**Note:** This app will **not** work via GitHub Pages because it needs a Node.js server. Run it locally or deploy to a Node.js host (e.g. Render, Railway).

---

## Installation Guide

### 1. Download the repo

Clone or download this repository. If cloning:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd deviceOrientation
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root (optional, for AI features):

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Set up Google Maps API (required for Street View)

Create `website/config.js` with your Google Maps API key:

```javascript
const GOOGLE_MAPS_API_KEY = "your_google_maps_api_key_here";
```

Get a key at [Google Cloud Console](https://console.cloud.google.com/) and enable the Maps JavaScript API and Street View API.

### 5. Generate HTTPS certificates (required)

The app uses HTTPS because device orientation and geolocation require a secure context. Generate local certificates with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
# Install mkcert (see https://github.com/FiloSottile/mkcert)
mkcert -install
mkcert localhost
```

This creates `localhost.pem` and `localhost-key.pem`. Place them in the project root (same folder as `server.js`).

### 6. Start the server

```bash
npm start
```

### 7. Open the app

Visit **https://localhost:3000** in your browser. On a phone, use your computer’s local IP (e.g. `https://192.168.1.x:3000`) and ensure both devices are on the same network.

---

## Features

- **Interactive globe** – Drag to rotate, scroll to zoom, tap pins for city info
- **360° Street View** – Double-tap a city to enter immersive Street View
- **Device orientation** – On mobile, tilt your phone to look around in 360 mode
- **Motion-based zoom** – Step forward/back to zoom in/out in Street View
- **Real-time chat** – Group chat with others in the same city
- **AI tour guide** – Ask questions about what you’re seeing (requires `OPENAI_API_KEY`)
- **Daily credits** – 10 city visits per day (stored in `localStorage`)

---

## Tech Stack

- Node.js, Express, Socket.io
- Three.js (globe + 3D)
- Google Maps Street View API
- Device Orientation & Motion APIs
- OpenAI API (optional)
