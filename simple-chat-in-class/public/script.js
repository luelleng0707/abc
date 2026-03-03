let socket = io();

let formeElm = document.querySelector("#chatForm");
let msgInput = document.querySelector("#newMessage");
let messageInput = msgInput;

let myName = "";
let lastSentMessage = "";
let responseCards = [];
let responseMode = false;
let currentAskerName = "";
let hasPlayedThisRound = false;

// OPTIONAL: LISTEN FOR NEW NAME
// WHEN NAME INPUT CHANGES, UPDATE myName AND TELL SERVER
let nameInputElm = document.querySelector("#nameWrapper input");
if (nameInputElm) {
    nameInputElm.addEventListener("change", function () {
        let newName = nameInputElm.value.trim() || "anonymous";
        let oldName = myName || "anonymous";
        myName = newName;
        socket.emit("nameChanged", { oldName: oldName, newName: newName });
    });
}

fetch("/data.json").then(function (r) { return r.json(); }).then(function (data) {
    responseCards = data.cards || [];
});

function setInputMode() {
    var form = document.querySelector("#chatForm");
    var panel = document.querySelector("#cardPanel");
    var askerPanel = document.querySelector("#askerPanel");
    var canType = !responseMode || (myName && myName === currentAskerName);
    if (form) form.style.display = canType ? "flex" : "none";
    if (panel) panel.style.display = !canType ? "block" : "none";
    if (askerPanel) askerPanel.style.display = "none";
    if (!canType && panel) fillCardHand();
}

function fillCardHand() {
    var hand = document.querySelector("#cardHand");
    if (!hand || !responseCards.length) return;
    hand.innerHTML = "";
    var n = Math.min(4, responseCards.length);
    var shuffled = responseCards.slice().sort(function () { return Math.random() - 0.5; });
    for (var i = 0; i < n; i++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card-btn checker-card";
        btn.textContent = shuffled[i];
        btn.addEventListener("click", function () {
            if (hasPlayedThisRound) return;
            var cardText = this.textContent;
            myName = (document.querySelector("#nameWrapper input") && document.querySelector("#nameWrapper input").value.trim()) || "anonymous";
            socket.emit("cardResponseFromClient", { name: myName, cardText: cardText });
            hasPlayedThisRound = true;
            setInputMode();
        });
        hand.appendChild(btn);
    }
}

function showAskerResponses(responses) {
    var panel = document.querySelector("#askerPanel");
    var list = document.querySelector("#askerResponses");
    if (!panel || !list) return;
    list.innerHTML = "";
    for (var i = 0; i < responses.length; i++) {
        var r = responses[i];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card-btn checker-card asker-pick";
        btn.textContent = r.sender + ": " + r.cardText;
        btn.dataset.index = String(i);
        btn.addEventListener("click", function () {
            socket.emit("askerPickedFavorite", { chosenIndex: parseInt(this.dataset.index, 10) });
            document.querySelector("#askerPanel").style.display = "none";
        });
        list.appendChild(btn);
    }
    panel.style.display = "block";
}

// LISTEN FOR NEWLY TYPES MESSAGES, 
formeElm.addEventListener("submit", newMessageSubmitted);

function newMessageSubmitted(event) {
    console.log("type a message", event);
    event.preventDefault();

    let newMessage = messageInput.value;
    if (!newMessage.trim()) return;
    myName = (document.querySelector("#nameWrapper input") && document.querySelector("#nameWrapper input").value.trim()) || "anonymous";
    lastSentMessage = newMessage;
    appendMessage(newMessage);
    let payload = { name: myName, message: newMessage };
    socket.emit("messageFromClient", payload);
    messageInput.value = "";
}

// SEND THEM TO THE SERVER


// LISTEN FOR NEW MESSAGES FROM SERVER
socket.on("messageFromServer", function (data) {
    if (data.sender === myName && data.message === lastSentMessage) {
        lastSentMessage = "";
        return;
    }
    appendMessageFromServer(data.sender || "unknown", data.message || "");
});

socket.on("questionFromServer", function (data) {
    responseMode = true;
    currentAskerName = (data && data.askerName) || "";
    hasPlayedThisRound = false;
    setInputMode();
});

socket.on("responsesForAsker", function (data) {
    if (data && data.responses && data.responses.length) {
        showAskerResponses(data.responses);
    }
});

socket.on("roundFinished", function () {
    responseMode = false;
    hasPlayedThisRound = false;
    currentAskerName = "";
    let hand = document.querySelector("#cardHand");
    let askerList = document.querySelector("#askerResponses");
    let askerPanel = document.querySelector("#askerPanel");
    if (hand) hand.innerHTML = "";
    if (askerList) askerList.innerHTML = "";
    if (askerPanel) askerPanel.style.display = "none";
    setInputMode();
});

// when winner is announced, also end the round
socket.on("winnerRevealed", function () {
    responseMode = false;
    hasPlayedThisRound = false;
    currentAskerName = "";
    let hand = document.querySelector("#cardHand");
    let askerList = document.querySelector("#askerResponses");
    let askerPanel = document.querySelector("#askerPanel");
    if (hand) hand.innerHTML = "";
    if (askerList) askerList.innerHTML = "";
    if (askerPanel) askerPanel.style.display = "none";
    setInputMode();
});
// APPEND THEM TO THE MESSAGE BOX
// AUTO SCROLL TO BOTTOM

// APPEND MESSAGES TO BOX
function appendMessage(txt){
    console.log(txt)
    // select list (ul) first
    let chatThreadList = document.querySelector("#threadWrapper ul");
    console.log(chatThreadList)

    // create new list item (li)
    let newListItem = document.createElement("li");
    newListItem.innerText = txt;

    // append new li to the list 
    chatThreadList.append(newListItem);

    // scroll to bottom of textbox:
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}

function appendMessageFromServer(sender, words) {
    let chatThreadList = document.querySelector("#threadWrapper ul");
    let newListItem = document.createElement("li");
    let whoSpan = document.createElement("span");
    whoSpan.className = "who";
    whoSpan.textContent = sender + ": ";
    let wordsSpan = document.createElement("span");
    wordsSpan.className = "words";
    wordsSpan.textContent = words;
    newListItem.appendChild(whoSpan);
    newListItem.appendChild(wordsSpan);
    chatThreadList.appendChild(newListItem);
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}

// OPTIONAL: LISTEN FOR NEW NAME
// SEND IT TO SERVER
