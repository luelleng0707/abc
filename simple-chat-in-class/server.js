const express = require('express');
// const http = require("http"); // we try to make HTTPS work 

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour

const portHTTPS = 3000; // port for https
// const portHTTP = 3001; // port for http

// inside the public folder
app.use(express.static('public'));

app.get("/favicon.ico", function (req, res) { res.status(204).end(); });

// API: fetch response cards from Google Sheet (published as CSV)
app.get("/api/cards", function (req, res) {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (csv) {
            const lines = csv.split(/\r?\n/).filter(function (line) { return line.trim(); });
            const cards = [];
            for (let i = 0; i < lines.length; i++) {
                const row = lines[i];
                const text = (row.split(",")[0] || row).trim().replace(/^"|"$/g, "");
                if (text) cards.push(text);
            }
            res.json({ cards: cards });
        })
        .catch(function (err) {
            console.error("Cards fetch error:", err);
            res.json({ cards: ["No cards loaded—check GOOGLE_SHEET_ID"] });
        });
});


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
    cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);


const { Server } = require('socket.io'); // include library
const { IncomingMessage } = require('http');
const io = new Server(HTTPSserver); // start socket io 

let currentAskerSocketId = null;

io.on('connection', function(socket){
    console.log("someone has connected to via socket protocol");
    io.emit("messageFromServer", { sender: "system", message: "Someone joined the chat" });

    socket.on("messageFromClient",function(data){
        console.log(data);
        currentAskerSocketId = socket.id;

        let messageForAllClients = {
            sender: "unknown",
            message: IncomingMessage
        }
        socket.emit("messageFromServer", messageForAllClients);
        io.emit("messageFromServer", { sender: (data && data.name) || "unknown", message: (data && data.message) || "" });
        io.emit("questionFromServer", { askerName: (data && data.name) || "unknown", question: (data && data.message) || "" });
    });

    socket.on("cardResponseFromClient", function (data) {
        var payload = { sender: (data && data.name) || "unknown", cardText: (data && data.cardText) || "" };
        if (currentAskerSocketId) io.to(currentAskerSocketId).emit("responseForAsker", payload);
    });

    socket.on("askerPicksFavoriteFromClient", function (data) {
        io.emit("winnerFromServer", { sender: (data && data.chosenSender) || "?", cardText: (data && data.chosenCardText) || "" });
    });

    socket.on('disconnect', function(){
        console.log("user disconnected");
    });
});

// Creating servers and make them listen at their ports:
HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});

// if we ALSO serve on http we can incommend this, but right now we don't 
// http.createServer(app).listen(portHTTP, function (req, res) {
//     console.log("HTTP Server started at port", portHTTP);
// });





