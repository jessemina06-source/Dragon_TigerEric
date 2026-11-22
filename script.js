/* Dragon Tiger — virtual credits only. All logic runs in the browser. */
'use strict';

const STARTING_BALANCE = 1000;
const BET_AMOUNTS = [10, 50, 100, 250, 500];
const PAYOUT = { dragon: 1, tiger: 1, tie: 8 };      // profit multiplier on a winning bet
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const HISTORY_LIMIT = 120;
const STORE_KEY = 'dragonTiger.v1';

const state = {
  balance: STARTING_BALANCE,
  history: [],
  side: null,                                   // side that chips are added to
  bets: { dragon: 0, tie: 0, tiger: 0 },        // credits placed on each side this round
  roundActive: false,
  roundDone: false,
  tab: 'bigroad',
  sound: true
};

const $ = (id) => document.getElementById(id);
const el = {
  balance: $('balance'), result: $('result'), summary: $('summary'), chips: $('chips'),
  betBtn: $('btn-bet'), newBtn: $('btn-new'), resetBtn: $('btn-reset'), clearBtn: $('btn-clear'), board: $('board'), soundBtn: $('btn-sound'),
  sides: document.querySelectorAll('.side'),
  cards: { dragon: $('card-dragon'), tiger: $('card-tiger') },
  seats: { dragon: $('seat-dragon'), tiger: $('seat-tiger') }
};

/* ---------- Storage ---------- */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && Number.isFinite(saved.balance)) {
      state.balance = saved.balance;
      state.history = Array.isArray(saved.history) ? saved.history.slice(0, HISTORY_LIMIT) : [];
      state.sound = saved.sound !== false;
    }
  } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
}
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ balance: state.balance, history: state.history, sound: state.sound }));
  } catch (e) { /* ignore */ }
}

/* ---------- Game logic ---------- */

/** Fresh 52-card deck, shuffled with Fisher-Yates so no card repeats within a round. */
function createShuffledDeck() {
  const deck = [];
  for (const suit of SUITS) RANKS.forEach((rank, i) => deck.push({ rank, suit, value: i + 1 }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Returns 'dragon', 'tiger' or 'tie' by comparing card values (A=1 ... K=13). */
function determineWinner(dragonCard, tigerCard) {
  if (dragonCard.value > tigerCard.value) return 'dragon';
  if (tigerCard.value > dragonCard.value) return 'tiger';
  return 'tie';
}

/** Credits returned to the player: stake + profit on a win, 0 on a loss. A tie loses Dragon/Tiger bets. */
function calculatePayout(bet, winner, amount) {
  return bet === winner ? amount * (1 + PAYOUT[bet]) : 0;
}

/** Console self-test: run runSelfTests() in dev tools. */
function runSelfTests() {
  const c = (v) => ({ value: v });
  const checks = [
    determineWinner(c(13), c(2)) === 'dragon',
    determineWinner(c(1), c(9)) === 'tiger',
    determineWinner(c(7), c(7)) === 'tie',
    calculatePayout('dragon', 'dragon', 100) === 200,
    calculatePayout('tie', 'tie', 100) === 900,
    calculatePayout('dragon', 'tie', 100) === 0,
    new Set(createShuffledDeck().map((x) => x.rank + x.suit)).size === 52
  ];
  console.log(checks.every(Boolean) ? 'All tests passed' : 'Tests failed', checks);
  return checks.every(Boolean);
}
window.runSelfTests = runSelfTests;

/* ---------- Rendering ---------- */
const fmt = (n) => n.toLocaleString('en-US');
const label = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SIDES = ['dragon', 'tie', 'tiger'];
const totalBet = () => SIDES.reduce((sum, s) => sum + state.bets[s], 0);
const clearBets = () => { state.bets = { dragon: 0, tie: 0, tiger: 0 }; };

function showResult(text, kind = '') {
  el.result.textContent = text;
  el.result.className = 'result ' + kind;
}

function renderBalance(animate) {
  el.balance.textContent = fmt(state.balance);
  if (animate) {
    el.balance.parentElement.classList.remove('bump');
    void el.balance.offsetWidth;
    el.balance.parentElement.classList.add('bump');
  }
}

/** Chips add their value to the selected side. Click as often as you like, up to your balance. */
function addChip(amount) {
  if (state.roundActive || state.roundDone) return;
  if (!state.side) return showResult('Choose Dragon, Tie or Tiger first, then tap chips.');
  if (totalBet() + amount > state.balance) return showResult('Not enough credits for that chip.', 'lose');
  state.bets[state.side] += amount;
  render();
}

function renderChips() {
  el.chips.innerHTML = '';
  BET_AMOUNTS.forEach((amt) => {
    const b = document.createElement('button');
    b.className = 'chip chip-' + amt;
    b.textContent = amt;
    b.setAttribute('aria-label', `Add ${amt} credits`);
    b.disabled = state.roundActive || state.roundDone || totalBet() + amt > state.balance;
    b.addEventListener('click', () => addChip(amt));
    el.chips.appendChild(b);
  });
}

function renderSummary() {
  const parts = SIDES.filter((s) => state.bets[s] > 0)
    .map((s) => `${label(s)} <b>${fmt(state.bets[s])}</b> (win +${fmt(state.bets[s] * PAYOUT[s])})`);
  el.summary.innerHTML = parts.length
    ? `Total bet <b>${fmt(totalBet())}</b> · ${parts.join(' · ')}`
    : 'No bets yet. Choose a side, then tap chips to add to it.';
}

/** Draws the scoreboard tab that is currently selected (Big Road, Bead Plate or Stats). */
function renderHistory() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === state.tab));
  const rounds = state.history.slice().reverse();            // oldest first
  if (state.tab === 'stats') { el.board.innerHTML = buildStats(rounds); return; }

  const items = state.tab === 'bead' ? buildBeadPlate(rounds) : buildBigRoad(rounds);
  const cols = Math.max(28, ...items.map((i) => i.col + 2));
  el.board.innerHTML = `<div class="grid" style="min-width:calc(var(--cell) * ${cols})">${items.map((i) => i.html).join('')}</div>`;
  el.board.scrollLeft = el.board.scrollWidth;                 // keep the newest results in view
}

/** Big Road: a streak of the same winner goes down a column (max 6), then turns right. Ties mark the last circle. */
function buildBigRoad(rounds) {
  const items = [], used = new Set();
  let startCol = -1, col = -1, row = 0, last = null;
  rounds.forEach((r) => {
    if (r.winner === 'tie') { if (items.length) items[items.length - 1].ties = true; return; }
    if (r.winner === last) {
      if (row < 5 && !used.has(`${col},${row + 1}`)) row++; else col++;
    } else { startCol = Math.max(startCol, col) + 1; col = startCol; row = 0; }
    last = r.winner;
    used.add(`${col},${row}`);
    items.push({ col, row, winner: r.winner, ties: false });
  });
  items.forEach((i) => { i.html = `<div class="cell" style="grid-column:${i.col + 1};grid-row:${i.row + 1}"><span class="ring ${i.winner}${i.ties ? ' ties' : ''}"></span></div>`; });
  return items;
}

/** Bead Plate: every round in order, filled top to bottom, 6 per column. */
function buildBeadPlate(rounds) {
  return rounds.map((r, n) => {
    const col = Math.floor(n / 6), row = n % 6, letter = r.winner === 'tie' ? 'T' : r.winner === 'dragon' ? 'D' : 'T';
    const text = r.winner === 'tie' ? 'Ti' : letter;
    return { col, html: `<div class="cell" style="grid-column:${col + 1};grid-row:${row + 1}"><span class="bead ${r.winner}" title="${label(r.winner)}">${text}</span></div>` };
  });
}

function buildStats(rounds) {
  const count = (w) => rounds.filter((r) => r.winner === w).length;
  const wins = rounds.filter((r) => r.payout > r.amount).length;
  const losses = rounds.filter((r) => r.payout < r.amount).length;
  const net = rounds.reduce((sum, r) => sum + r.payout - r.amount, 0);
  const cell = (cls, v, t) => `<div class="${cls}"><b>${v}</b><span>${t}</span></div>`;
  return `<div class="stats">${cell('dragon', count('dragon'), 'Dragon')}${cell('tiger', count('tiger'), 'Tiger')}${cell('tie', count('tie'), 'Ties')}` +
    `${cell('', rounds.length, 'Rounds')}${cell('', `${wins} / ${losses}`, 'Your wins / losses')}${cell('', (net > 0 ? '+' : '') + fmt(net), 'Net credits')}</div>`;
}

/* ---------- Sound (generated with the Web Audio API, no audio files needed) ---------- */
let audioCtx = null;
function initAudio() {                                       // called from a click so browsers allow audio
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { audioCtx = null; }
}
function playNote(freq, start, length, type, volume) {
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), t = audioCtx.currentTime + start;
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t); osc.stop(t + length + 0.05);
}
/** Bright rising fanfare for a win, slow falling tones for a loss. */
function playResultSound(won) {
  if (!state.sound || !audioCtx) return;
  if (won) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playNote(f, i * 0.12, 0.35, 'triangle', 0.3));
    [523.25, 659.25, 783.99].forEach((f) => playNote(f, 0.55, 0.9, 'triangle', 0.18));
  } else {
    [392, 370, 349.23].forEach((f, i) => playNote(f, i * 0.28, 0.4, 'sawtooth', 0.12));
    playNote(311.13, 0.84, 1.1, 'sawtooth', 0.12);
  }
}

function render() {
  el.sides.forEach((b) => {
    const side = b.dataset.side;
    b.classList.toggle('selected', side === state.side);
    b.disabled = state.roundActive;                         // no betting during a round
    b.querySelector('.stake').textContent = state.bets[side] ? fmt(state.bets[side]) : '';
  });
  renderChips();
  renderSummary();
  const idle = !state.roundActive && !state.roundDone;
  el.betBtn.disabled = !(idle && totalBet() > 0 && totalBet() <= state.balance);
  el.clearBtn.disabled = !idle || totalBet() === 0;
  el.newBtn.disabled = state.roundActive || !state.roundDone;
  el.resetBtn.disabled = state.roundActive;
}

/* ---------- Win animation ---------- */
let winAnimId = 0;                                           // changes whenever an animation is cancelled or replaced

/** Stops any running win animation and hides the big amount. */
function cancelWinAnimation() {
  winAnimId++;
  const pop = $('win-pop');
  if (pop.getAnimations) pop.getAnimations().forEach((a) => a.cancel());
  pop.classList.remove('show');
}

/** A huge "+amount" pops up mid-screen, flies into the balance, then the balance counts up to its new value. */
function playWinAnimation(payout, net) {
  cancelWinAnimation();
  const id = winAnimId, pop = $('win-pop');
  const alive = () => id === winAnimId;
  const finalBalance = state.balance, startBalance = finalBalance - payout;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  pop.querySelector('.win-amount').textContent = '+' + fmt(payout);
  pop.querySelector('.win-caption').textContent = `Net win +${fmt(net)}`;
  el.balance.textContent = fmt(startBalance);               // keep the old balance on screen until the win lands
  pop.classList.add('show');

  if (reduceMotion || !pop.animate) {
    setTimeout(() => { if (alive()) { pop.classList.remove('show'); renderBalance(true); } }, 1500);
    return;
  }

  const countUp = () => {
    const t0 = performance.now();
    const step = (now) => {
      if (!alive()) return;
      const p = Math.min(1, (now - t0) / 700);
      el.balance.textContent = fmt(Math.round(startBalance + payout * p));
      if (p < 1) requestAnimationFrame(step); else renderBalance(true);
    };
    requestAnimationFrame(step);
  };

  const centered = 'translate(-50%, -50%)';
  pop.animate([
    { transform: `${centered} scale(.2)`, opacity: 0 },
    { transform: `${centered} scale(1.3)`, opacity: 1, offset: 0.6 },
    { transform: `${centered} scale(1)`, opacity: 1 }
  ], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' }).onfinish = () => {
    setTimeout(() => {                                       // hold so the amount can be read, then fly it to the balance
      if (!alive()) return;
      const from = pop.getBoundingClientRect(), to = el.balance.getBoundingClientRect();
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      const scale = Math.max(0.08, to.width / from.width);
      pop.animate([
        { transform: `${centered} translate(0, 0) scale(1)`, opacity: 1 },
        { transform: `${centered} translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.85 }
      ], { duration: 650, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' }).onfinish = () => {
        if (!alive()) return;
        cancelWinAnimation();
        winAnimId = id;                                      // keep this run alive for the count-up
        countUp();
      };
    }, 1100);
  };
}

/* ---------- Round flow ---------- */
function setCardFace(side, card) {
  const front = el.cards[side].querySelector('.front');
  front.querySelector('.rank').textContent = card.rank;
  front.querySelector('.suit').textContent = card.suit;
  front.classList.toggle('red', card.suit === '♥' || card.suit === '♦');
}

/** Validates the bets, takes the total stake, draws two cards and reveals them one after another. */
function placeBet() {
  if (state.roundActive || state.roundDone) return;
  const total = totalBet();
  if (total <= 0) return showResult('Add chips to Dragon, Tie or Tiger first.');
  if (total > state.balance) return showResult('Not enough credits for those bets.', 'lose');

  initAudio();
  state.roundActive = true;
  state.balance -= total;                                   // stakes leave the balance up front
  saveState();
  renderBalance(true);
  showResult('Cards are being drawn…');
  render();

  const [dragon, tiger] = createShuffledDeck();             // top two cards of a fresh deck
  setCardFace('dragon', dragon);
  setCardFace('tiger', tiger);
  setTimeout(() => el.cards.dragon.classList.add('flipped'), 400);
  setTimeout(() => el.cards.tiger.classList.add('flipped'), 1400);
  setTimeout(() => finishRound(dragon, tiger), 2300);
}

/** Settles every bet, updates balance and history, plays the sound and announces the result. */
function finishRound(dragon, tiger) {
  const winner = determineWinner(dragon, tiger);
  const total = totalBet();
  const payout = SIDES.reduce((sum, s) => sum + calculatePayout(s, winner, state.bets[s]), 0);
  const net = payout - total;
  state.balance += payout;

  state.history.unshift({
    dragon: dragon.rank + dragon.suit, tiger: tiger.rank + tiger.suit,
    winner, bets: { ...state.bets }, amount: total, payout
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);

  if (winner !== 'tie') el.seats[winner].classList.add('winner');
  const winnerText = winner === 'tie' ? 'Tie!' : `${label(winner)} wins!`;
  if (net > 0) showResult(`${winnerText} You won ${fmt(net)} credits.`, 'win');
  else if (net < 0) showResult(`${winnerText} You lost ${fmt(-net)} credits.`, 'lose');
  else showResult(`${winnerText} You broke even.`);
  if (net !== 0) playResultSound(net > 0);

  state.roundActive = false;
  state.roundDone = true;
  saveState();
  if (net > 0) playWinAnimation(payout, net); else renderBalance(true);
  renderHistory();
  render();
  if (state.balance < BET_AMOUNTS[0]) showResult(`${el.result.textContent} Out of credits — use Reset Balance.`, 'lose');
}

/** Clears the table and all bets for the next round. */
function newRound() {
  if (state.roundActive) return;
  cancelWinAnimation();
  renderBalance(false);
  Object.values(el.cards).forEach((c) => c.classList.remove('flipped'));
  Object.values(el.seats).forEach((s) => s.classList.remove('winner'));
  state.roundDone = false;
  clearBets();
  showResult('Place your bets for the next round.');
  render();
}

function resetBalance() {
  if (state.roundActive) return;
  state.balance = STARTING_BALANCE;
  state.history = [];
  state.side = null;
  saveState();
  renderBalance(true);
  renderHistory();
  newRound();
  showResult(`Balance reset to ${fmt(STARTING_BALANCE)} credits.`);
}

/* ---------- Events ---------- */
el.sides.forEach((b) => b.addEventListener('click', () => {
  if (state.roundActive) return;
  state.side = b.dataset.side;
  render();
}));
el.betBtn.addEventListener('click', placeBet);
el.newBtn.addEventListener('click', newRound);
el.resetBtn.addEventListener('click', resetBalance);
el.clearBtn.addEventListener('click', () => { clearBets(); render(); });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { state.tab = t.dataset.tab; renderHistory(); }));
el.soundBtn.addEventListener('click', () => {
  state.sound = !state.sound;
  el.soundBtn.textContent = 'Sound: ' + (state.sound ? 'On' : 'Off');
  el.soundBtn.setAttribute('aria-pressed', state.sound);
  saveState();
  initAudio();
});

loadState();
el.soundBtn.textContent = 'Sound: ' + (state.sound ? 'On' : 'Off');
renderBalance(false);
renderHistory();
render();
