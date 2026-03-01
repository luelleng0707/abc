let socket = io();

let formeElm = document.querySelector("#chatForm");
console.log(formeElm);
let msgInput = document.querySelector("#newMessage");
console.log(msgInput)
let messageInput = msgInput;

let myName = "";
let lastSentMessage = "";

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
