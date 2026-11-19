import { createGame, PALETTE, MAX_ATTEMPTS } from './game.js';

const symbols = { rouge: '●', bleu: '◆', vert: '▲', jaune: '✦', orange: '■', violet: '✚' };
const labels = { rouge: 'Rouge', bleu: 'Bleu', vert: 'Vert', jaune: 'Jaune', orange: 'Orange', violet: 'Violet' };
const $ = id => document.getElementById(id);
const game = createGame();
let guess = Array(4).fill(null);
let selected = 0;

function peg(color, extraClass = '') {
  const element = document.createElement('span');
  element.className = `peg ${color || 'empty'} ${extraClass}`;
  element.textContent = color ? symbols[color] : '';
  if (color) element.setAttribute('aria-label', labels[color]);
  else element.setAttribute('aria-hidden', 'true');
  return element;
}

function renderGuess() {
  const ended = game.snapshot().status !== 'playing';
  $('guess').replaceChildren(...guess.map((color, index) => {
    const button = document.createElement('button');
    button.className = `slot${index === selected ? ' selected' : ''}`;
    button.disabled = ended;
    button.setAttribute('aria-pressed', String(index === selected));
    button.setAttribute('aria-label', `Position ${index + 1} : ${color ? labels[color] : 'à choisir'}`);
    button.append(peg(color));
    const number = document.createElement('span');
    number.className = 'slot-number';
    number.textContent = index + 1;
    button.append(number);
    button.addEventListener('click', () => {
      selected = index;
      renderGuess();
      $('guess').children[index].focus();
    });
    return button;
  }));
}

for (const color of PALETTE) {
  const button = document.createElement('button');
  button.className = 'color-choice';
  button.setAttribute('aria-label', `Choisir ${color} pour la position sélectionnée`);
  button.append(peg(color), document.createTextNode(labels[color]));
  button.addEventListener('click', () => {
    if (game.snapshot().status !== 'playing') return;
    guess[selected] = color;
    const nextEmpty = guess.findIndex((value, index) => index > selected && !value);
    if (nextEmpty !== -1) selected = nextEmpty;
    else if (guess.includes(null)) selected = guess.indexOf(null);
    else selected = (selected + 1) % 4;
    renderGuess();
    $('feedback').classList.remove('error');
    $('feedback').textContent = guess.every(Boolean) ? 'Votre proposition est prête. À vous de valider !' : `Position ${selected + 1} sélectionnée. Choisissez sa couleur.`;
  });
  $('palette').append(button);
}

function render() {
  const state = game.snapshot();
  const ended = state.status !== 'playing';
  $('history').replaceChildren(...Array.from({ length: MAX_ATTEMPTS }, (_, index) => {
    const entry = state.history[index];
    const row = document.createElement('li');
    row.className = `history-row${entry ? ' filled' : ''}${!ended && index === state.history.length ? ' current' : ''}`;
    const number = document.createElement('span');
    number.className = 'row-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const pegs = document.createElement('div');
    pegs.className = 'row-pegs';
    pegs.setAttribute('aria-label', entry ? `Proposition ${index + 1} : ${entry.guess.join(', ')}` : `Essai ${index + 1}, non joué`);
    pegs.append(...Array.from({ length: 4 }, (_, i) => peg(entry?.guess[i])));
    const score = document.createElement('div');
    score.className = 'row-score';
    if (entry) {
      score.setAttribute('aria-label', `${entry.wellPlaced} bien placées, ${entry.misplaced} mal placées`);
      for (const [value, type] of [[entry.wellPlaced, 'exact'], [entry.misplaced, 'partial']]) {
        const group = document.createElement('span');
        group.className = 'score-group';
        group.setAttribute('aria-hidden', 'true');
        const dot = document.createElement('i');
        dot.className = `indicator ${type}`;
        group.append(dot, document.createTextNode(value));
        score.append(group);
      }
    } else {
      score.textContent = '—';
      score.setAttribute('aria-label', 'Aucun indice');
    }
    row.append(number, pegs, score);
    return row;
  }));
  $('secret').replaceChildren(...Array.from({ length: 4 }, (_, index) => {
    if (state.secret) return peg(state.secret[index]);
    const hidden = document.createElement('span');
    hidden.className = 'hidden-peg';
    hidden.textContent = '?';
    hidden.setAttribute('aria-hidden', 'true');
    return hidden;
  }));
  $('secret').setAttribute('aria-label', state.secret ? `Code secret : ${state.secret.join(', ')}` : 'Code secret : quatre couleurs cachées');
  $('turn-label').textContent = ended ? 'PARTIE TERMINÉE' : `ESSAI ${String(state.history.length + 1).padStart(2, '0')} / 10`;
  $('attempts-left').textContent = `${state.attemptsLeft} essai${state.attemptsLeft > 1 ? 's' : ''} restant${state.attemptsLeft > 1 ? 's' : ''}`;
  $('status-badge').textContent = state.status === 'won' ? 'Code découvert !' : state.status === 'lost' ? 'Code révélé' : 'À vous de jouer';
  $('status-badge').classList.toggle('won', state.status === 'won');
  $('guess-title').textContent = state.status === 'won' ? 'Bien joué !' : state.status === 'lost' ? 'On retente ?' : 'Votre intuition ?';
  $('secret-caption').textContent = ended ? 'Le code a livré tous ses secrets.' : 'Le code reste bien gardé… pour l’instant.';
  $('submit').disabled = ended;
  for (const button of $('palette').children) button.disabled = ended;
  $('board-summary').textContent = state.status === 'won' ? `Code découvert en ${state.history.length} essai${state.history.length > 1 ? 's' : ''}.` : state.status === 'lost' ? 'Dix essais joués. Une nouvelle énigme vous attend.' : 'Chaque indice vous rapproche de la solution.';
  renderGuess();
}

$('submit').addEventListener('click', () => {
  const result = game.submit(guess);
  $('feedback').classList.toggle('error', !result.ok);
  if (!result.ok) {
    $('feedback').textContent = result.error;
    return;
  }
  const latest = result.state.history.at(-1);
  guess = Array(4).fill(null);
  selected = 0;
  render();
  $('feedback').textContent = result.state.status === 'won' ? 'Victoire ! Vous avez trouvé les quatre couleurs dans le bon ordre.' : result.state.status === 'lost' ? 'Partie perdue : les dix essais sont utilisés. Le code est révélé sur le plateau.' : `${latest.wellPlaced} bien placée${latest.wellPlaced > 1 ? 's' : ''}, ${latest.misplaced} mal placée${latest.misplaced > 1 ? 's' : ''}. À vous de continuer !`;
  if (result.state.status !== 'playing') $('new-game').focus();
  else $('guess').children[0].focus();
});

$('new-game').addEventListener('click', () => {
  game.reset();
  guess = Array(4).fill(null);
  selected = 0;
  render();
  $('feedback').classList.remove('error');
  $('feedback').textContent = 'Nouvelle partie : un nouveau code vous attend.';
  $('guess').children[0].focus();
});
$('rules-open').addEventListener('click', () => $('rules').showModal());
$('rules-close').addEventListener('click', () => $('rules').close());
render();
