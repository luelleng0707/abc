const express = require('express');
// const http = require("http"); // we try to make HTTPS work 

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour

const portHTTPS = 3000; // port for https
// const portHTTP = 3001; // port for http

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));

app.get("/favicon.ico", function (req, res) { res.status(204).end(); });


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

let currentRound = { askerName: "", question: "", responses: [] };
let currentAskerSocketId = null;

io.on('connection', function(socket){
    console.log("someone has connected to via socket protocol");
    io.emit("messageFromServer", { sender: "system", message: "Someone joined the chat" });

    socket.on("nameChanged", function (data) {
        let oldName = (data && data.oldName) || "someone";
        let newName = (data && data.newName) || "someone";
        io.emit("messageFromServer", { sender: "system", message: oldName + " is now called " + newName });
    });

    socket.on("messageFromClient",function(data){
        console.log(data);

        let text = (data && data.message) || "";
        let senderName = (data && data.name) || "unknown";

        let messageForAllClients = {
            sender: "unknown",
            message: IncomingMessage
        }
        socket.emit("messageFromServer", messageForAllClients);
        io.emit("messageFromServer", { sender: senderName, message: text });

        // only start question round if message ends with "?"
        if (!text.trim().endsWith("?")) {
            currentRound = { askerName: "", question: "", responses: [] };
            currentAskerSocketId = null;
            io.emit("roundFinished");
            return;
        }

        currentRound = { askerName: senderName, question: text, responses: [] };
        currentAskerSocketId = socket.id;
        io.emit("questionFromServer", { askerName: currentRound.askerName, question: currentRound.question });
    });

    socket.on("cardResponseFromClient", function (data) {
        currentRound.responses.push({ sender: (data && data.name) || "unknown", cardText: (data && data.cardText) || "" });
        if (currentAskerSocketId) {
            io.to(currentAskerSocketId).emit("responsesForAsker", { responses: currentRound.responses, askerName: currentRound.askerName });
        }
    });

    socket.on("askerPickedFavorite", function (data) {
        var idx = (data && data.chosenIndex) >= 0 ? data.chosenIndex : 0;
        var r = currentRound.responses[idx];
        if (r) {
            io.emit("messageFromServer", { sender: currentRound.askerName, message: "🏆 Winner: " + r.sender + " — \"" + r.cardText + "\"" });
            io.emit("winnerRevealed", { winner: r.sender, cardText: r.cardText });
        }
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





