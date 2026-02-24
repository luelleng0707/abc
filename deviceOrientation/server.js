require("dotenv").config();
const express = require("express");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const { OpenAI } = require("openai");

const app = express();
app.use(express.json());
app.use(express.static("website"));

const portHTTPS = 3000;
const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

const httpsServer = https.createServer(options, app);
const io = new Server(httpsServer, {
  cors: { origin: "*" },
  path: "/socket.io",
});

// --- Chat rooms: roomId -> Set of socket ids
const rooms = new Map();
const socketToRoom = new Map();
const socketToUser = new Map();

function getRoomId(cityName) {
  return `city_${(cityName || "").replace(/\s+/g, "_")}`;
}

function joinRoom(socket, roomId, userName) {
  leaveRoom(socket);
  socket.join(roomId);
  socketToRoom.set(socket.id, roomId);
  socketToUser.set(socket.id, userName || "Anonymous");
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(socket.id);
  return roomId;
}

function leaveRoom(socket) {
  const roomId = socketToRoom.get(socket.id);
  if (roomId) {
    socket.leave(roomId);
    const set = rooms.get(roomId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) rooms.delete(roomId);
    }
    socketToRoom.delete(socket.id);
  }
  socketToUser.delete(socket.id);
}

io.on("connection", (socket) => {
  socket.on("join_location", ({ cityName, userName }) => {
    const roomId = getRoomId(cityName);
    joinRoom(socket, roomId, userName);
    const count = rooms.get(roomId)?.size ?? 0;
    socket.emit("joined", { roomId, count });
    socket.to(roomId).emit("user_joined", { count, userName: userName || "Someone" });
  });

  socket.on("chat", ({ text }) => {
    const roomId = socketToRoom.get(socket.id);
    const userName = socketToUser.get(socket.id) || "Anonymous";
    if (roomId && text?.trim()) {
      const msg = { user: userName, text: text.trim(), ts: Date.now() };
      io.to(roomId).emit("chat", msg);
    }
  });

  socket.on("disconnect", () => {
    const roomId = socketToRoom.get(socket.id);
    leaveRoom(socket);
    if (roomId) {
      const count = rooms.get(roomId)?.size ?? 0;
      socket.to(roomId).emit("user_left", { count });
    }
  });
});

// --- AI tour guide
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.post("/api/ai/greet", async (req, res) => {
  const { cityName } = req.body || {};
  if (!openai) {
    return res.json({
      text: `Welcome to ${cityName || "this city"}! I'm your AI guide. Ask me anything about what you see. (Add OPENAI_API_KEY to .env to enable full AI.)`,
    });
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a friendly AI tour guide. Greet the visitor in 1-2 short sentences. Be warm and invite them to ask questions about what they're seeing. City: ${cityName || "unknown"}.`,
        },
        { role: "user", content: "I just arrived. Greet me!" },
      ],
      max_tokens: 80,
    });
    const text = completion.choices[0]?.message?.content?.trim() || `Welcome to ${cityName}! Ask me anything.`;
    res.json({ text });
  } catch (err) {
    console.error("AI greet error:", err);
    res.status(500).json({ text: `Welcome to ${cityName}! Ask me anything about what you see.` });
  }
});

app.post("/api/ai/ask", async (req, res) => {
  const { question, cityName, locationDesc, heading, pitch } = req.body || {};
  if (!openai) {
    return res.json({
      text: "AI guide is not configured. Add OPENAI_API_KEY to your .env file.",
    });
  }
  const context = [
    cityName && `Location: ${cityName}`,
    locationDesc && `Street View: ${locationDesc}`,
    heading != null && `User is looking at heading ${Math.round(heading)}°`,
    pitch != null && `pitch ${Math.round(pitch)}°`,
  ]
    .filter(Boolean)
    .join(". ");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI tour guide. Answer briefly (2-4 sentences) based on the visitor's location and what they might be looking at. ${context ? `Context: ${context}` : ""}`,
        },
        { role: "user", content: question || "What am I looking at?" },
      ],
      max_tokens: 150,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "I'm not sure. Try asking something more specific!";
    res.json({ text });
  } catch (err) {
    console.error("AI ask error:", err);
    res.status(500).json({ text: "Sorry, I couldn't process that. Try again!" });
  }
});

httpsServer.listen(portHTTPS, () => {
  console.log("HTTPS Server + Socket.io at port", portHTTPS);
});
