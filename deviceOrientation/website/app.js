// app.js - Globe -> 360 city viewer (ES modules + three.js)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- City data: lat, lon, continent, fun facts (Street View provides 360 imagery) ---
const CITIES = [
  {
    name: "New York",
    lat: 40.7128,
    lon: -74.0060,
    continent: "North America",
    funFacts: "The Big Apple has over 8 million people and more than 800 languages spoken. Times Square sees about 330,000 pedestrians daily.",
  },
  {
    name: "Paris",
    lat: 48.8566,
    lon: 2.3522,
    continent: "Europe",
    funFacts: "The Eiffel Tower was meant to be temporary. Paris is known as the City of Light—it was one of the first cities to use gas street lighting.",
  },
  {
    name: "Tokyo",
    lat: 35.6895,
    lon: 139.6917,
    continent: "Asia",
    funFacts: "Tokyo is the world's most populous metro area with ~37 million people. The city has more Michelin-starred restaurants than Paris.",
  },
];

let mode = "globe"; // "globe" | "city360"
let currentCity = null;

// Globe mode
let scene, camera, renderer, controls, globeMesh;
let cityPins = [];

// Tap / double-tap on pin
let previewHideTimer = null;
let pendingCity = null;
let pointerDownPos = { x: 0, y: 0 };
let lastTapTime = 0;
let lastTappedCity = null;
let globePointerListenersAdded = false;
const DOUBLE_TAP_MS = 400;
const MOVE_THRESHOLD = 10;

// City 360 mode (Street View only)
let streetViewPanorama = null;

// Chat
let chatSocket = null;
let chatActiveTab = "group"; // "group" | "ai"

// Zoom (FOV) - step forward = zoom in, step back = zoom out
let deviceFov = 75;
const FOV_MIN = 35;
const FOV_MAX = 110;

// Step detection for forward/back zoom
let stepVelocity = 0; // accumulated from accelerometer
const STEP_SENSITIVITY = 0.4;
const STEP_DECAY = 0.92; // decay when still

// UI
const sceneContainer = document.getElementById("sceneContainer");
const modeValue = document.getElementById("modeValue");
const cityValue = document.getElementById("cityValue");
const creditsValue = document.getElementById("creditsValue");
const backToGlobeBtn = document.getElementById("backToGlobeBtn");
const hintText = document.getElementById("hintText");

function updateCreditsDisplay() {
  if (creditsValue) {
    const data = getCreditsUsed();
    const left = Math.max(0, CREDIT_LIMIT - data.count);
    creditsValue.textContent = left;
  }
}

// --- Helpers ---
const STARFIELD_TEXTURE_URL = "https://upload.wikimedia.org/wikipedia/commons/8/85/Solarsystemscope_texture_8k_stars_milky_way.jpg";

// Credit limit: 10 city visits per user per day (stored in localStorage)
const CREDIT_LIMIT = 10;
const CREDIT_STORAGE_KEY = "globeCityCredits";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getCreditsUsed() {
  try {
    const raw = localStorage.getItem(CREDIT_STORAGE_KEY);
    if (!raw) return { date: getTodayKey(), count: 0 };
    const data = JSON.parse(raw);
    if (data.date !== getTodayKey()) return { date: getTodayKey(), count: 0 };
    return data;
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

function incrementCredits() {
  const data = getCreditsUsed();
  data.count = Math.min(CREDIT_LIMIT, data.count + 1);
  localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(data));
}

function canEnterCity() {
  const data = getCreditsUsed();
  return data.count < CREDIT_LIMIT;
}

function showCreditLimitReached() {
  hideCityPreview();
  const msg = document.createElement("div");
  msg.id = "creditLimitMsg";
  msg.innerHTML = `
    <p class="credit-limit-title">Daily limit reached</p>
    <p class="credit-limit-text">You've explored 3 cities today. Come back tomorrow!</p>
  `;
  msg.className = "credit-limit-overlay";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

function latLonToVector3(latDeg, lonDeg, radius) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const x = radius * Math.cos(lat) * Math.cos(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

// Called by requestOrientation.js - phone orientation = look around (smooth, immediate)
function handleOrientation(event) {
  if (mode !== "city360") return;
  const alpha = event.alpha ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;
  // Street View: update POV from device orientation
  if (useStreetView && streetViewPanorama) {
    const heading = (360 - alpha) % 360; // alpha 0=N, increases CW; Street View heading 0=N, increases CW
    const pitch = Math.max(-90, Math.min(90, beta - 40));
    streetViewPanorama.setPov({ heading, pitch });
  }
}

// Step forward/back = zoom in/out. Uses accelerometer to detect movement.
function handleMotion(event) {
  if (mode !== "city360") return;
  const acc = event.acceleration ?? event.accelerationIncludingGravity;
  if (!acc) return;
  // Use Z (forward/back when holding phone) + Y (vertical bounce when walking)
  const forward = -(acc.z ?? 0) * 0.5;
  const vertical = (acc.y ?? 0) * 0.3; // walking = vertical bounce
  stepVelocity = stepVelocity * STEP_DECAY + (forward + vertical) * STEP_SENSITIVITY;
  stepVelocity = Math.max(-3, Math.min(3, stepVelocity));
  deviceFov = Math.max(FOV_MIN, Math.min(FOV_MAX, deviceFov + stepVelocity));

  // Street View: map FOV to zoom (0-5). Lower FOV = more zoomed in
  if (useStreetView && streetViewPanorama) {
    const zoom = Math.round(5 - ((deviceFov - FOV_MIN) / (FOV_MAX - FOV_MIN)) * 5);
    streetViewPanorama.setZoom(Math.max(0, Math.min(5, zoom)));
  }
}

// Make global for requestOrientation.js
window.handleOrientation = handleOrientation;
window.handleMotion = handleMotion;

// --- Globe mode ---
function initGlobe() {
  mode = "globe";
  currentCity = null;
  streetViewPanorama = null;
  useStreetView = false;
  leaveChat();
  hideCityPreview();
  pendingCity = null;
  modeValue.textContent = "Globe";
  cityValue.textContent = "None";
  backToGlobeBtn.style.display = "none";
  updateCreditsDisplay();
  hintText.textContent = "Tap pin for info. Double-tap to enter. Enable Motion for full experience.";

  sceneContainer.innerHTML = "";
  cityPins = [];

  scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  sceneContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 10;

  // Stars background - real space image (Milky Way / starfield)
  const starGeometry = new THREE.SphereGeometry(100, 32, 32);
  const starTexLoader = new THREE.TextureLoader();
  starTexLoader.crossOrigin = "anonymous";
  const starMaterial = new THREE.MeshBasicMaterial({ 
    map: starTexLoader.load(
      STARFIELD_TEXTURE_URL,
      () => renderer.render(scene, camera),
      undefined,
      () => {
        // Fallback if texture fails (CORS etc): dark space color
        starMaterial.color.setHex(0x0a0a1a);
        starMaterial.map = null;
      }
    ), 
    side: THREE.BackSide 
  });
  const starField = new THREE.Mesh(starGeometry, starMaterial);
  scene.add(starField);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);

  const radius = 1.5;
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const texLoader = new THREE.TextureLoader();
  
  // Use a public Earth texture from CDN (NASA Blue Marble)
  // Alternative URLs if this one doesn't work:
  // "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
  const earthTextureUrl = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg";
  const earthTexture = texLoader.load(
    earthTextureUrl,
    () => {
      // Texture loaded successfully
      renderer.render(scene, camera);
    },
    undefined,
    (err) => {
      console.error("Failed to load Earth texture:", err);
      // Fallback: use a simple color if texture fails
      const fallbackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a90e2,
        roughness: 0.8,
        metalness: 0.2
      });
      globeMesh.material = fallbackMaterial;
    }
  );
  
  const material = new THREE.MeshStandardMaterial({ 
    map: earthTexture,
    roughness: 0.8,
    metalness: 0.1
  });
  globeMesh = new THREE.Mesh(geometry, material);
  scene.add(globeMesh);

  const pinGeo = new THREE.SphereGeometry(0.035, 12, 12);
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xff4b81 });

  CITIES.forEach((c) => {
    const pos = latLonToVector3(c.lat, c.lon, radius + 0.06);
    const pin = new THREE.Mesh(pinGeo, pinMat.clone());
    pin.position.copy(pos);
    pin.userData.city = c;
    scene.add(pin);
    cityPins.push(pin);
  });

  const el = renderer.domElement;
  el.addEventListener("pointerdown", onGlobePointerDown);
  el.addEventListener("pointermove", onGlobePointerMove);
  if (!globePointerListenersAdded) {
    window.addEventListener("pointerup", onGlobePointerUp);
    window.addEventListener("pointercancel", onGlobePointerCancel);
    globePointerListenersAdded = true;
  }
  initGlobePinchZoom();

  requestAnimationFrame(animateGlobe);
}

function getGlobeHitCity(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  const mouse = new THREE.Vector2(x, y);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(cityPins);
  return hits.length > 0 ? hits[0].object.userData.city : null;
}

function onGlobePointerDown(event) {
  if (!event.isPrimary) return;
  const city = getGlobeHitCity(event.clientX, event.clientY);
  if (city) {
    event.preventDefault();
    event.stopPropagation();
    pendingCity = city;
    pointerDownPos = { x: event.clientX, y: event.clientY };
  }
}

function onGlobePointerUp(event) {
  if (pendingCity) {
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    const moved = Math.hypot(dx, dy) > MOVE_THRESHOLD;
    const city = pendingCity;
    pendingCity = null;

    if (!moved) {
      const now = Date.now();
      const isDoubleTap = city === lastTappedCity && (now - lastTapTime) < DOUBLE_TAP_MS;
      lastTapTime = now;
      lastTappedCity = city;

      if (isDoubleTap) {
        enterCity360(city);
      } else {
        showCityPreview(city);
      }
    }
  }
}

function onGlobePointerCancel(event) {
  pendingCity = null;
  hideCityPreview();
}

function onGlobePointerMove(event) {
  if (pendingCity) {
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
      pendingCity = null;
    }
  }
}

function showCityPreview(city) {
  hideCityPreview();
  const card = document.createElement("div");
  card.id = "cityPreviewCard";
  const continent = city.continent || "—";
  const funFacts = city.funFacts || "Double-tap to explore 360°.";
  card.innerHTML = `
    <div class="city-preview-name">${city.name}</div>
    <div class="city-preview-continent">${continent}</div>
    <div class="city-preview-facts">${funFacts}</div>
    <div class="city-preview-hint">Double-tap to enter 360° view</div>
  `;
  card.className = "city-preview-card";
  document.body.appendChild(card);
  previewHideTimer = setTimeout(() => {
    previewHideTimer = null;
    hideCityPreview();
  }, 5000);
}

function hideCityPreview() {
  if (previewHideTimer) {
    clearTimeout(previewHideTimer);
    previewHideTimer = null;
  }
  document.getElementById("cityPreviewCard")?.remove();
}

function initGlobePinchZoom() {
  const canvas = renderer.domElement;
  let lastPinchDist = 0;
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) lastPinchDist = getTouchDistance(e.touches);
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && lastPinchDist > 0 && controls) {
      const dist = getTouchDistance(e.touches);
      const delta = (lastPinchDist - dist) * 0.01;
      const target = controls.target;
      const dir = camera.position.clone().sub(target).normalize();
      let d = camera.position.distanceTo(target);
      d = Math.max(controls.minDistance, Math.min(controls.maxDistance, d + delta * d));
      camera.position.copy(target).add(dir.multiplyScalar(d));
      lastPinchDist = dist;
    }
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) lastPinchDist = 0;
  }, { passive: true });
}

function animateGlobe() {
  if (mode !== "globe") return;
  requestAnimationFrame(animateGlobe);
  controls.update();
  renderer.render(scene, camera);
}

// --- City 360 mode (Street View only) ---
let useStreetView = false;

function enterCity360(city) {
  const apiKey = typeof window !== "undefined" && window.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    showNoApiKeyMessage();
    return;
  }
  if (!canEnterCity()) {
    showCreditLimitReached();
    return;
  }
  incrementCredits();
  mode = "city360";
  currentCity = city;
  modeValue.textContent = "City 360";
  cityValue.textContent = city.name;
  backToGlobeBtn.style.display = "block";
  updateCreditsDisplay();
  hintText.textContent = "Move your phone to look around. Pinch or scroll to zoom.";
  hideCityPreview();

  enterCity360StreetView(city, apiKey);
}

function showNoApiKeyMessage() {
  const msg = document.createElement("div");
  msg.id = "noApiKeyMsg";
  msg.innerHTML = "<p>Add a Google Maps API key to config.js to explore cities in 360°</p>";
  msg.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);color:#fff;font-size:18px;z-index:20;text-align:center;padding:20px;";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    const cbName = `__gmapsLoaded${Date.now()}`;
    window[cbName] = () => {
      delete window[cbName];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[cbName];
      resolve();
    };
    document.head.appendChild(script);
  });
}

function enterCity360StreetView(city, apiKey) {
  useStreetView = true;
  const container = document.createElement("div");
  container.id = "streetViewContainer";
  container.style.cssText = "position:absolute;inset:0;";
  sceneContainer.appendChild(container);

  loadGoogleMapsScript(apiKey).then(() => {
    if (!window.google || !window.google.maps) {
      useStreetView = false;
      showMapsLoadError();
      initGlobe();
      return;
    }
    const position = { lat: city.lat, lng: city.lon };
    streetViewPanorama = new google.maps.StreetViewPanorama(container, {
      position,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      fullscreenControl: false,
      linksControl: true,
      enableCloseButton: false,
      streetViewControl: false,
    });
    streetViewPanorama.addListener("position_changed", () => {});
    streetViewPanorama.addListener("status_changed", () => {
      const status = streetViewPanorama?.getStatus?.();
      if (status === "ZERO_RESULTS" || status === "UNKNOWN_ERROR") {
        useStreetView = false;
        document.getElementById("streetViewContainer")?.remove();
        streetViewPanorama = null;
        showNoStreetViewMessage();
        initGlobe();
      }
    });
    initStreetViewOrientation();
    initChat(city);
  });
}

function initStreetViewOrientation() {
  // Orientation updates happen in handleOrientation; this runs when Street View loads
}

function showMapsLoadError() {
  const msg = document.createElement("div");
  msg.innerHTML = "<p>Could not load Google Maps. Check your API key and network.</p>";
  msg.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);color:#fff;font-size:18px;z-index:20;text-align:center;padding:20px;";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

function showNoStreetViewMessage() {
  const msg = document.createElement("div");
  msg.innerHTML = "<p>No Street View available at this location</p>";
  msg.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);color:#fff;font-size:18px;z-index:20;text-align:center;padding:20px;";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// --- Chat + AI tour guide ---
function initChat(city) {
  const panel = document.getElementById("chatPanel");
  const messagesEl = document.getElementById("chatMessages");
  const inputEl = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const countEl = document.getElementById("chatCount");
  const tabGroup = document.getElementById("tabGroup");
  const tabAI = document.getElementById("tabAI");
  const toggleBtn = document.getElementById("chatToggleBtn");

  if (!panel || !messagesEl) return;

  panel.classList.remove("hidden");
  panel.classList.remove("collapsed");
  messagesEl.innerHTML = "";
  chatActiveTab = "group";

  const userName = localStorage.getItem("globeChatName") || "Explorer";
  const roomId = `city_${(city?.name || "").replace(/\s+/g, "_")}`;

  function appendMsg(text, user, isAI = false) {
    const div = document.createElement("div");
    div.className = `chat-msg ${isAI ? "ai" : "user"}`;
    const span = user ? `<span class="chat-msg-user">${escapeHtml(user)}:</span>` : "";
    div.innerHTML = span + escapeHtml(text);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // Socket.io
  if (typeof io !== "undefined") {
    chatSocket = io({ path: "/socket.io" });
    chatSocket.emit("join_location", { cityName: city?.name, userName });
    chatSocket.on("joined", ({ count }) => {
      if (countEl) countEl.textContent = `${count} here`;
    });
    chatSocket.on("user_joined", ({ count, userName: u }) => {
      if (countEl) countEl.textContent = `${count} here`;
      appendMsg(`${u} joined the chat`, "System");
    });
    chatSocket.on("user_left", ({ count }) => {
      if (countEl) countEl.textContent = `${count} here`;
    });
    chatSocket.on("chat", (msg) => {
      appendMsg(msg.text, msg.user);
    });
  }

  // AI greeting
  fetch("/api/ai/greet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cityName: city?.name }),
  })
    .then((r) => r.json())
    .then(({ text }) => appendMsg(text, "🤖 AI Guide", true))
    .catch(() => appendMsg("Welcome! Ask me anything about what you see.", "🤖 AI Guide", true));

  function sendMessage() {
    const text = inputEl?.value?.trim();
    if (!text) return;
    inputEl.value = "";

    if (chatActiveTab === "ai") {
      appendMsg(text, "You");
      const loc = streetViewPanorama?.getLocation?.();
      const pov = streetViewPanorama?.getPov?.();
      fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          cityName: city?.name,
          locationDesc: loc?.description || loc?.shortDescription,
          heading: pov?.heading,
          pitch: pov?.pitch,
        }),
      })
        .then((r) => r.json())
        .then(({ text: reply }) => appendMsg(reply, "🤖 AI Guide", true))
        .catch(() => appendMsg("Sorry, I couldn't reach the AI. Try again!", "🤖 AI Guide", true));
    } else if (chatSocket) {
      chatSocket.emit("chat", { text });
      appendMsg(text, "You");
    }
  }

  sendBtn?.addEventListener("click", sendMessage);
  inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  tabGroup?.addEventListener("click", () => {
    chatActiveTab = "group";
    tabGroup.classList.add("active");
    tabAI?.classList.remove("active");
    inputEl.placeholder = "Chat with others here...";
  });
  tabAI?.addEventListener("click", () => {
    chatActiveTab = "ai";
    tabAI.classList.add("active");
    tabGroup?.classList.remove("active");
    inputEl.placeholder = "Ask the AI about what you're looking at...";
  });

  toggleBtn?.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    toggleBtn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  });
}

function leaveChat() {
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
  }
  const panel = document.getElementById("chatPanel");
  if (panel) panel.classList.add("hidden");
}

function getTouchDistance(touches) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// --- Common UI wiring ---
backToGlobeBtn.addEventListener("click", () => {
  initGlobe();
});

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (mode === "globe" && camera && renderer) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  } else if (mode === "city360" && useStreetView && streetViewPanorama && window.google?.maps?.event) {
    window.google.maps.event.trigger(streetViewPanorama, "resize");
  }
});

// Kick off
initGlobe();

