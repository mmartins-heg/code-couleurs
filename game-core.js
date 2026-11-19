// Script classique pour fonctionner aussi lors d'une ouverture directe d'index.html.
// Source des règles : cahier des charges du projet, repris dans le README.
(() => {
'use strict';
const PALETTE = Object.freeze(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 10;

function validate(code) {
  if (!Array.isArray(code) || code.length !== CODE_LENGTH || code.some(color => color == null || color === '')) {
    return 'Choisissez une couleur pour chacune des quatre positions.';
  }
  // Array.from rend aussi visibles les emplacements vides des tableaux creux.
  if (Array.from(code).some(color => !PALETTE.includes(color))) {
    return 'Couleur non autorisée. Utilisez rouge, bleu, vert, jaune, orange ou violet.';
  }
  return null;
}

function scoreGuess(secret, guess) {
  const error = validate(secret) || validate(guess);
  if (error) throw new TypeError(error);
  let wellPlaced = 0;
  const remainingSecret = [];
  const remainingGuess = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i] === guess[i]) wellPlaced++;
    else {
      remainingSecret.push(secret[i]);
      remainingGuess.push(guess[i]);
    }
  }
  let misplaced = 0;
  for (const color of remainingGuess) {
    const index = remainingSecret.indexOf(color);
    if (index !== -1) {
      misplaced++;
      remainingSecret.splice(index, 1);
    }
  }
  return Object.freeze({ wellPlaced, misplaced });
}

function createGame(random = Math.random) {
  let secret;
  let history;
  let status;

  function snapshot() {
    return {
      status,
      attemptsLeft: MAX_ATTEMPTS - history.length,
      history: history.map(entry => ({ guess: [...entry.guess], ...entry.score })),
      secret: status === 'playing' ? null : [...secret],
    };
  }

  function reset() {
    secret = Array.from({ length: CODE_LENGTH }, () => {
      const value = random();
      if (!(value >= 0 && value < 1)) throw new RangeError('Le générateur doit renvoyer un nombre entre 0 inclus et 1 exclu.');
      return PALETTE[Math.floor(value * PALETTE.length)];
    });
    history = [];
    status = 'playing';
    return snapshot();
  }

  function submit(guess) {
    if (status !== 'playing') return { ok: false, error: 'Cette partie est terminée. Lancez une nouvelle partie.', state: snapshot() };
    const error = validate(guess);
    if (error) return { ok: false, error, state: snapshot() };
    const score = scoreGuess(secret, guess);
    history.push({ guess: [...guess], score });
    if (score.wellPlaced === CODE_LENGTH) status = 'won';
    else if (history.length === MAX_ATTEMPTS) status = 'lost';
    return { ok: true, state: snapshot() };
  }

  reset();
  return Object.freeze({ snapshot, submit, reset });
}

globalThis.CodeCouleurs = Object.freeze({ PALETTE, CODE_LENGTH, MAX_ATTEMPTS, scoreGuess, createGame });
})();
