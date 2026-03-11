var socket = (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www'))
  ? io({ path: '/YOUR-NAME/YOUR-PORT/socket.io' })
  : io();

var mainWrapper = document.querySelector('.main-wrapper');
var playersList = document.querySelector('#playersList');
var diceRow = document.querySelector('#diceRow');
var turnPointsElm = document.querySelector('#turnPoints');
var statusText = document.querySelector('#statusText');
var logList = document.querySelector('#logList');
var rollBtn = document.querySelector('#rollBtn');
var bankBtn = document.querySelector('#bankBtn');
var newGameBtn = document.querySelector('#newGameBtn');
var myId = null;

socket.on('connect', function () {
  myId = socket.id;
  socket.emit('joinGame');
});

socket.on('stateUpdate', renderState);
socket.on('log', addLog);
rollBtn.addEventListener('click', function () { socket.emit('roll'); });
bankBtn.addEventListener('click', function () { socket.emit('bank'); });
newGameBtn.addEventListener('click', function () { socket.emit('newGame'); });

function renderState(state) {
  mainWrapper.innerHTML = '';
  state.players.forEach(function (p) {
    var wrap = document.createElement('div');
    wrap.className = 'img-wrap';
    var img = document.createElement('img');
    img.src = 'imgs/frog' + p.avatarIdx + '.png';
    wrap.append(img);
    mainWrapper.append(wrap);
  });

  playersList.innerHTML = '';
  state.players.forEach(function (p) {
    var li = document.createElement('li');
    li.className = 'player-item';
    if (p.id === state.currentPlayerId && !state.gameOver) li.classList.add('player-current');
    if (state.winnerId && p.id === state.winnerId) li.classList.add('player-winner');
    if (p.id === myId) li.classList.add('player-me');

    var main = document.createElement('div');
    main.className = 'player-main';
    var av = document.createElement('div');
    av.className = 'player-avatar';
    var avImg = document.createElement('img');
    avImg.src = 'imgs/frog' + p.avatarIdx + '.png';
    av.append(avImg);
    var name = document.createElement('div');
    name.className = 'player-name';
    name.textContent = p.id === myId ? 'You (Player ' + p.avatarIdx + ')' : 'Player ' + p.avatarIdx;
    main.append(av, name);

    var score = document.createElement('div');
    score.className = 'player-score';
    score.textContent = p.score;

    li.append(main, score);
    playersList.append(li);
  });

  diceRow.innerHTML = '';
  state.dice.forEach(function (v) {
    var d = document.createElement('div');
    d.className = 'die';
    var im = document.createElement('img');
    im.src = 'imgs/dice' + v + '.png';
    im.alt = '' + v;
    d.append(im);
    diceRow.append(d);
  });

  turnPointsElm.textContent = state.turnPoints;

  if (state.gameOver && state.winnerId) {
    var w = state.players.find(function (p) { return p.id === state.winnerId; });
    statusText.textContent = w ? 'Winner: Player ' + w.avatarIdx + ' with ' + w.score + ' points!' : '';
  } else if (!state.players.length) {
    statusText.textContent = 'Waiting for players…';
  } else if (!state.currentPlayerId) {
    statusText.textContent = 'Game will start when someone joins.';
  } else {
    var cur = state.players.find(function (p) { return p.id === state.currentPlayerId; });
    statusText.textContent = cur ? (cur.id === myId ? 'Your turn – roll or bank.' : 'Player ' + cur.avatarIdx + "'s turn.") : '';
  }

  var myTurn = state.currentPlayerId === myId && !state.gameOver;
  rollBtn.disabled = !myTurn;
  bankBtn.disabled = !myTurn || state.turnPoints === 0;
}

function addLog(msg) {
  var li = document.createElement('li');
  li.className = 'log-item';
  li.textContent = msg;
  logList.append(li);
  logList.scrollTop = logList.scrollHeight;
}
