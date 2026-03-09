Simple chat with question rounds

I used this folder to build a small chat room where normal talking stays simple and question rounds feel a bit like a card game.

What I see when I run it

1. I start the server
   npm install
   node server.js

2. I open this in a browser
   https://localhost:3000
   The browser might complain about HTTPS, I click through that warning for local testing.

3. I see
   A name box at the top.
   A scroll area with old sample messages.
   A text box and Send button at the bottom.
   A hidden card area under the chat.

Normal chat

If I type something without a question mark at the end, everyone sees it as a normal message.
Example
Hi everyone
This is counted as normal chat.
No cards appear.
Nobody loses the keyboard.

Question rounds

If I end my message with a question mark, the app treats it as a question round.
Example
What is the best snack?
That message still appears as a normal chat line.
At the same time, the server remembers me as the asker of this round.

On my screen, nothing special happens yet, I still see my text box.
On other people’s screens, something changes.
Their text box disappears, and a strip of four small cards appears.
Each card shows one random answer from the list in public/data.json.
They pick exactly one card to answer my question.

How answers move around

When someone clicks a card
Their browser sends two things to the server, their name and the card text.
The server stores that answer in a list for the current round.
The server sends the growing list of answers only to the asker.

On my screen, I see a separate panel called Pick your favorite response.
Each button in that panel shows one person and the card text they picked.
I click the response I like best.

What everyone sees when a winner is picked

When I click a favorite, my browser sends the chosen index to the server.
The server looks up that answer in the current list.
If it finds one, it posts a normal chat line that looks roughly like
myName  winner  somePlayer  their card text here in quotes
It also sends a short winner event to all browsers.

Every browser reacts to this winner event in the same way.
They hide any open card panels.
They clear old answers from the panels.
They turn the normal text box back on for everyone.

Starting another round

At this point, the group is back in normal chat mode.
Anyone can type messages again.
If someone ends a new message with a question mark, the same flow repeats.

Where the answer texts live

All fixed response texts come from public/data.json.
The file structure looks like this

{
  "cards": [
    "A tiny horse.",
    "Vikings.",
    "Your custom response here."
  ]
}

To change the flavor of the game, I edit that cards array.
No code changes are needed for that part.

## Screenshots and Visual States

To document the different states of the chatroom, you can take screenshots during testing. Here are the key states and how to capture them:

### 1. Normal Chat State (Asking Questions)
- **Description**: This is the default state where users can type and send messages normally. Questions are asked by ending messages with a '?'.
- **How to Capture**: Open the chat in multiple browser tabs/windows. In one tab, type a normal message or a question. Screenshot the interface showing the chat log, text input box, and send button.
- **Visual Elements**: Name box at top, scrollable chat area with messages, text input and Send button at bottom.

### 2. Receiver Screen (Card Selection Screen)
- **Description**: When a question is asked (message ends with '?'), other users (receivers) see their text input disappear and a strip of four random Cards Against Humanity response cards appears instead.
- **How to Capture**: In a receiver's browser tab, after someone else asks a question, screenshot the screen showing the hidden text box and the four card options.
- **Visual Elements**: Chat log remains visible, text input is hidden, four small cards displayed below the chat for selection.

### 3. Asker Screen (After Everyone Has Chosen Cards)
- **Description**: The asker sees a separate panel "Pick your favorite response" with buttons showing each participant's name and their chosen card text.
- **How to Capture**: In the asker's browser tab, after all receivers have selected cards, screenshot the panel with the list of responses to choose from.
- **Visual Elements**: Normal chat interface plus an additional panel with response options (person name + card text).

### 4. Winning Announcement in Receivers' Screen
- **Description**: After the asker selects a winner, all users see the winning response posted as a normal chat message, and the interface resets to normal chat mode.
- **How to Capture**: In any receiver's browser tab, after the winner is announced, screenshot the chat log showing the winning message and the interface back to normal (text input visible, no cards).
- **Visual Elements**: Chat log with the winner announcement message, text input box re-enabled, card panels hidden.

### Tips for Screenshots
- Use browser developer tools (F12) to simulate multiple users by opening incognito/private windows or different browsers.
- Ensure HTTPS is working locally to avoid browser warnings.
- Resize browser windows to capture full interface without scrolling if possible.
- Label screenshots clearly (e.g., state1_normal_chat.png, state2_card_selection.png, etc.) and place them in a `screenshots/` folder in this directory.
