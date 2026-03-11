const express = require('express');

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 4101; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
    cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSserver = https.createServer(options, app)


const { Server } = require('socket.io'); // include library
const { arrayBuffer } = require('stream/consumers');
const io = new Server(HTTPSserver); // start socket io 

// =====================================================================
// Farkle multiplayer game state (same structure as frog-drums version)
// =====================================================================

const WIN_SCORE = 10000;

// players: { id, avatarIdx, score }
let players = [];
let currentPlayerId = null;
let turnPoints = 0;
let dice = [];
let remainingDice = 6;
let gameOver = false;
let winnerId = null;

function pickAvatarIdx() {
    let used = players.map(function (p) { return p.avatarIdx; });
    let avatarIdx = null;
    for (let i = 1; i <= 6; i++) {
        if (used.indexOf(i) === -1) {
            avatarIdx = i;
            break;
        }
    }
    if (avatarIdx === null) avatarIdx = 1;
    return avatarIdx;
}

function nextPlayerId(afterId) {
    if (players.length === 0) return null;
    if (!afterId) return players[0].id;
    let idx = players.findIndex(function (p) { return p.id === afterId; });
    if (idx === -1) return players[0].id;
    return players[(idx + 1) % players.length].id;
}

function resetTurnState() {
    turnPoints = 0;
    remainingDice = 6;
    dice = [];
}

function broadcastState() {
    io.emit("stateUpdate", {
        players: players,
        currentPlayerId: currentPlayerId,
        turnPoints: turnPoints,
        dice: dice,
        remainingDice: remainingDice,
        gameOver: gameOver,
        winnerId: winnerId
    });
}

function addLog(msg) {
    io.emit("log", msg);
}

function scoreFarkleRoll(roll){
    if (!Array.isArray(roll) || !roll.length) {
        return { points: 0, usedCount: 0, isHot: false, isFarkle: true };
    }

    let counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    roll.forEach(function (v) {
        if (counts[v] !== undefined) counts[v]++;
    });

    // straight 1-6 (each face exactly once)
    let isStraight = [1, 2, 3, 4, 5, 6].every(function (v) {
        return counts[v] === 1;
    });
    if (isStraight) {
        return { points: 1500, usedCount: 6, isHot: true, isFarkle: false };
    }

    let points = 0;
    let used = 0;

    // triples and beyond
    for (let face = 1; face <= 6; face++) {
        let c = counts[face];
        if (c >= 3) {
            let base;
            if (face === 1) {
                base = 1000;
            } else {
                base = face * 100;
            }
            let extraSets = c - 3;
            points += base * (1 + extraSets);
            used += c;
            counts[face] = 0;
        }
    }

    // remaining single 1s and 5s
    if (counts[1] > 0) {
        points += counts[1] * 100;
        used += counts[1];
    }
    if (counts[5] > 0) {
        points += counts[5] * 50;
        used += counts[5];
    }

    let isFarkle = points === 0;
    let isHot = used === roll.length && !isFarkle;
    return { points: points, usedCount: used, isHot: isHot, isFarkle: isFarkle };
}

io.on('connection', (socket) => {

    console.log('a user connected', socket.id);

    socket.on("joinGame", function () {
        if (!players.find(function (p) { return p.id === socket.id; })) {
            let avatarIdx = pickAvatarIdx();
            players.push({ id: socket.id, avatarIdx: avatarIdx, score: 0 });
            addLog("Player " + avatarIdx + " joined.");
            if (!currentPlayerId) {
                currentPlayerId = socket.id;
                resetTurnState();
            }
        }
        broadcastState();
    });

    socket.on("roll", function () {
        if (gameOver) return;
        if (socket.id !== currentPlayerId) return;
        if (remainingDice <= 0) remainingDice = 6;

        dice = [];
        for (let i = 0; i < remainingDice; i++) {
            dice.push(1 + Math.floor(Math.random() * 6));
        }

        let result = scoreFarkleRoll(dice);
        if (result.isFarkle) {
            addLog("Farkle! Player loses " + turnPoints + " turn points.");
            resetTurnState();
            currentPlayerId = nextPlayerId(currentPlayerId);
        } else {
            turnPoints += result.points;
            remainingDice -= result.usedCount;
            addLog("Roll scored " + result.points + " points.");
            if (result.isHot || remainingDice <= 0) {
                remainingDice = 6;
                addLog("Hot dice – roll all six again!");
            }
        }

        broadcastState();
    });

    socket.on("bank", function () {
        if (gameOver) return;
        if (socket.id !== currentPlayerId) return;
        if (turnPoints <= 0) return;

        let player = players.find(function (p) { return p.id === socket.id; });
        if (!player) return;

        player.score += turnPoints;
        addLog("Player " + player.avatarIdx + " banked " + turnPoints + " points (total " + player.score + ").");

        if (player.score >= WIN_SCORE) {
            gameOver = true;
            winnerId = player.id;
            addLog("Player " + player.avatarIdx + " reached " + WIN_SCORE + " points!");
        }

        resetTurnState();
        if (!gameOver) {
            currentPlayerId = nextPlayerId(currentPlayerId);
        }

        broadcastState();
    });

    socket.on("newGame", function () {
        players = players.map(function (p) {
            return { id: p.id, avatarIdx: p.avatarIdx, score: 0 };
        });
        gameOver = false;
        winnerId = null;
        resetTurnState();
        currentPlayerId = players.length ? players[0].id : null;
        addLog("New game started.");
        broadcastState();
    });

    socket.on("disconnect", function () {
        console.log("someone disconnected", socket.id);
        players = players.filter(function (p) { return p.id !== socket.id; });
        if (players.length === 0) {
            currentPlayerId = null;
            resetTurnState();
            gameOver = false;
            winnerId = null;
        } else {
            if (socket.id === currentPlayerId) {
                currentPlayerId = nextPlayerId(currentPlayerId);
                resetTurnState();
            }
        }
        broadcastState();
    });

})


// Creating servers and make them listen at their ports:

HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





