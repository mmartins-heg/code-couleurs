(() => {
'use strict';
const { createGame, PALETTE, MAX_ATTEMPTS } = globalThis.CodeCouleurs;

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
  const ended = game.getState().status !== 'playing';
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
    if (game.getState().status !== 'playing') return;
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
  const state = game.getState();
  const ended = state.status === 'won' || state.status === 'lost';
  const inactive = state.status !== 'playing';
  const attemptsLeft = MAX_ATTEMPTS - state.attempts;
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
      score.setAttribute('aria-label', `${entry.result.wellPlaced} bien placées, ${entry.result.misplaced} mal placées`);
      for (const [value, type] of [[entry.result.wellPlaced, 'exact'], [entry.result.misplaced, 'partial']]) {
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
    const hidden = document.createElement('span');
    hidden.className = 'hidden-peg';
    hidden.textContent = '?';
    hidden.setAttribute('aria-hidden', 'true');
    return hidden;
  }));
  $('secret').setAttribute('aria-label', 'Code secret : quatre couleurs cachées');
  $('turn-label').textContent = state.status === 'not-started' ? 'PARTIE NON DÉMARRÉE' : ended ? 'PARTIE TERMINÉE' : `ESSAI ${String(state.attempts + 1).padStart(2, '0')} / 10`;
  $('attempts-left').textContent = `${attemptsLeft} essai${attemptsLeft > 1 ? 's' : ''} restant${attemptsLeft > 1 ? 's' : ''}`;
  $('status-badge').textContent = state.status === 'not-started' ? 'À démarrer' : state.status === 'won' ? 'Code découvert !' : state.status === 'lost' ? 'Partie terminée' : 'À vous de jouer';
  $('status-badge').classList.toggle('won', state.status === 'won');
  $('guess-title').textContent = state.status === 'won' ? 'Bien joué !' : state.status === 'lost' ? 'On retente ?' : 'Votre intuition ?';
  $('secret-caption').textContent = state.status === 'won' ? 'Votre proposition gagnante a percé le code !' : 'Le code reste bien gardé.';
  $('submit').disabled = inactive;
  for (const button of $('palette').children) button.disabled = inactive;
  $('board-summary').textContent = state.status === 'won' ? `Code découvert en ${state.history.length} essai${state.history.length > 1 ? 's' : ''}.` : state.status === 'lost' ? 'Dix essais joués. Une nouvelle énigme vous attend.' : 'Chaque indice vous rapproche de la solution.';
  renderGuess();
}

// Les promesses sont résolues après le rendu, sans créer de partie parallèle.
async function startGame(options) {
  const state = game.startGame(options); // Peut rejeter sans toucher à l'interface.
  guess = Array(4).fill(null);
  selected = 0;
  render();
  $('feedback').classList.remove('error');
  $('feedback').textContent = 'Nouvelle partie : un nouveau code vous attend.';
  return state;
}

async function submitGuess(proposal) {
  const state = game.submitGuess(proposal);
  if (state.lastError) {
    $('feedback').classList.add('error');
    $('feedback').textContent = state.lastError.message;
    return state;
  }
  guess = Array(4).fill(null);
  selected = 0;
  render();
  $('feedback').classList.remove('error');
  const { wellPlaced, misplaced } = state.lastResult;
  $('feedback').textContent = state.status === 'won' ? 'Victoire ! Vous avez trouvé les quatre couleurs dans le bon ordre.' : state.status === 'lost' ? 'Partie perdue : les dix essais sont utilisés. Lancez une nouvelle partie pour retenter votre chance.' : `${wellPlaced} bien placée${wellPlaced > 1 ? 's' : ''}, ${misplaced} mal placée${misplaced > 1 ? 's' : ''}. À vous de continuer !`;
  return state;
}

$('submit').addEventListener('click', async () => {
  const state = await submitGuess(guess);
  if (!state.lastError) {
    if (state.status !== 'playing') $('new-game').focus();
    else $('guess').children[0].focus();
  }
});
$('new-game').addEventListener('click', async () => {
  await startGame();
  $('guess').children[0].focus();
});
$('rules-open').addEventListener('click', () => $('rules').showModal());
$('rules-close').addEventListener('click', () => $('rules').close());
if (new URLSearchParams(location.search).get('test') === '1') {
  render();
  $('feedback').textContent = 'Partie non démarrée. Lancez une nouvelle partie pour jouer.';
  window.codeSecretTest = Object.freeze({
    version: '0.2', getConfig: game.getConfig, getState: game.getState,
    startGame, submitGuess,
  });
} else {
  // Le mode normal démarre immédiatement ; aucune API de test n'est exposée.
  startGame();
}
})();
