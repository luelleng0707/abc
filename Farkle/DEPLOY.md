# Deploy Farkle to HK server

Follow this so your project is (1) on GitHub and (2) running on the HK server by class time.

---

## 1. Push to GitHub

From your project folder (e.g. `Farkle` or wherever the code lives):

```bash
cd path/to/your/Farkle
git add .
git commit -m "Farkle ready for presentation"
git push origin main
```

(Use your real branch name if it’s not `main`.)

---

## 2. Pull and run on the HK server

SSH into the HK server (use the hostname and username your instructor gave you), then:

```bash
cd ~/path/where/you/put/projects    # e.g. ~/projects or what you were told
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git Farkle
cd Farkle
npm install
node server.js
```

Leave `node server.js` running. The server will listen on port **4101** (or whatever port the HK server assigns).

- **Important:** On the HK server you must run **`node server.js`** (not `node frogServer.js`).  
  `server.js` uses plain HTTP so it works behind the school’s proxy; `frogServer.js` uses local HTTPS and is only for your laptop.

---

## 3. Set the Socket.IO path (if needed)

The game page needs to know how to reach the app on the HK server. Often the URL looks like:

`https://hkserver.something.edu/YOUR-NAME/4101/`

Open **`public/script.js`** and find this at the top:

```javascript
if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
  socket = io({path: "/YOUR-NAME/YOUR-PORT/socket.io"});
}else{
  socket = io(); 
}
```

- Replace **`YOUR-NAME`** with your HK server username (the one in the URL).
- Replace **`YOUR-PORT`** with the port your app runs on (e.g. **`4101`**).
- If the HK server hostname is **not** “browsercircus” or “www”, add it so the path is used, for example:

  ```javascript
  if(location.hostname.toLowerCase().startsWith('browsercircus') ||
     location.hostname.toLowerCase().startsWith('hkserver') ||
     location.hostname.toLowerCase().startsWith('www')){
    socket = io({path: "/YOUR-NAME/4101/socket.io"});
  } else {
    socket = io();
  }
  ```

Then commit and push again, and pull on the HK server so the updated `script.js` is what gets served.

---

## 4. Test on the HK server TODAY

1. On the HK server: `cd Farkle && node server.js`.
2. On your phone or laptop, open the **full game URL** (e.g. `https://hkserver.something.edu/YOUR-NAME/4101/`).
3. Open the same URL in another tab or device. You should see two players and be able to roll, bank, and play.

If the page loads but nothing happens when you roll, check the browser console (F12 → Console). Often the fix is setting the correct `path` in `script.js` (step 3).

---

## 5. Right before your presentation

- SSH into the HK server.
- `cd` into your Farkle folder.
- Run: **`node server.js`**.
- Keep that terminal open while you present.
- After the presentation, press `Ctrl+C` in that terminal to stop the server.

---

## 6. QR code for the game URL

- Open the game URL in your browser (e.g. `https://hkserver.something.edu/YOUR-NAME/4101/`).
- Use the browser’s “Share” (or similar) and choose “QR Code”, or use a site like [qr-code-generator.com](https://www.qr-code-generator.com/) and paste the URL.
- Put that QR code on your slide so others can open the game quickly.

---

## Checklist

- [ ] Code pushed to GitHub  
- [ ] Code pulled on HK server  
- [ ] `npm install` run in project folder on HK server  
- [ ] `public/script.js` path set to `/YOUR-NAME/YOUR-PORT/socket.io` (and hostname check updated if needed)  
- [ ] Tested on HK server today (multiple devices/tabs)  
- [ ] Know how to run `node server.js` right before presenting  
- [ ] QR code made from your game URL  

Good luck with the presentation.
