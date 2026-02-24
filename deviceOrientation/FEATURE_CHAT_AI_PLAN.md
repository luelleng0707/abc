# Location-Based Group Chat + AI Tour Guide

## Overview

- **Group chat**: Users at the same Street View location share a chat room
- **AI tour guide**: Greets users on arrival; answers questions about what they're looking at
- **Context-aware**: AI receives location + heading so it can answer "what's that building?"

---

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│   Client    │◄──────────────────►│  Node + Socket.io │
│  (browser)  │     REST /api/ai   │  + Express        │
└─────────────┘                    └────────┬─────────┘
       │                                    │
       │                                    ▼
       │                            ┌──────────────┐
       │                            │  OpenAI API  │
       │                            │  (or similar)│
       └───────────────────────────┴──────────────┘
```

---

## Components

### 1. Chat rooms (location-based)

- **Room ID**: `city_${cityName}` (e.g. `city_New York`) – one room per city
- **Alternative**: `pano_${panoId}` – one room per Street View panorama (more granular)
- When user enters Street View → join room
- When user leaves (Back to Globe) → leave room

### 2. Group chat

- Real-time messages via Socket.io
- Messages: `{ user, text, room, timestamp }`
- Broadcast to all users in same room

### 3. AI tour guide

- **Greeting**: When user joins room, server sends AI-generated welcome (e.g. "Welcome to Paris! I'm your AI guide. Ask me anything about what you see.")
- **Q&A**: User asks "what's that tower?" → server calls LLM with context:
  - City name
  - Street View location description (from `panorama.getLocation()`)
  - Heading/pitch (what they're looking at)
  - User's question

### 4. API keys needed

- **Google Maps** (already have) – Street View, Places for context
- **OpenAI** (or Anthropic, etc.) – for AI tour guide

---

## Implementation order

1. Socket.io server + room join/leave
2. Chat UI overlay (messages + input)
3. Wire Street View enter/exit → join/leave room
4. AI greeting on join
5. AI Q&A endpoint + context from Street View
6. Chat UI: toggle between "Group" and "Ask AI"

---

## UI sketch

```
┌─────────────────────────────────────┐
│  [Street View 360°]                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 💬 Chat (3 here)    [Ask AI] │   │
│  │ ─────────────────────────── │   │
│  │ 🤖 Welcome to Paris! Ask me  │   │
│  │    anything about the city.  │   │
│  │ User1: Beautiful view!       │   │
│  │ You: what's that building?   │   │
│  │ 🤖 That's the Eiffel Tower...│   │
│  │ ─────────────────────────── │   │
│  │ [Type a message...] [Send]   │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```
