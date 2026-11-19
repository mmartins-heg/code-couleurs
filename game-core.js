// Référence : API commune de test, contrat 0.2, règles code-couleurs-1.0.
// Script classique : compatible avec GitHub Pages et l'ouverture locale.
(() => {
  'use strict';
  const PALETTE = Object.freeze(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
  const CODE_LENGTH = 4;
  const MAX_ATTEMPTS = 10;
  const messages = {
    'invalid-options': 'Les options doivent être un objet contenant uniquement la clé secret, facultative.',
    'invalid-type': 'Choisissez une couleur pour chaque position : un tableau complet de chaînes est attendu.',
    'invalid-length': 'La proposition doit contenir exactement quatre couleurs.',
    'invalid-color': 'Utilisez uniquement rouge, bleu, vert, jaune, orange ou violet, en minuscules.',
    'game-not-started': 'Démarrez une nouvelle partie avant de proposer des couleurs.',
    'game-finished': 'Cette partie est terminée. Lancez une nouvelle partie.',
  };
  const refusal = code => ({ code, message: messages[code] });

  function validate(code) {
    if (!Array.isArray(code)) return 'invalid-type';
    for (let i = 0; i < code.length; i++) {
      if (!Object.hasOwn(code, i) || typeof code[i] !== 'string') return 'invalid-type';
    }
    if (code.length !== CODE_LENGTH) return 'invalid-length';
    if (code.some(color => !PALETTE.includes(color))) return 'invalid-color';
    return null;
  }

  function scoreGuess(secret, guess) {
    const error = validate(secret) || validate(guess);
    if (error) throw Object.assign(new TypeError(messages[error]), { code: error });
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
    return { wellPlaced, misplaced };
  }

  function getConfig() {
    return {
      apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0',
      secretLength: CODE_LENGTH, maxAttempts: MAX_ATTEMPTS, allowDuplicates: true,
      colors: [...PALETTE],
    };
  }

  // Un seul état métier ; l'interface et l'API utilisent cette même instance.
  function createGame(random = Math.random) {
    let secret = null;
    let history = [];
    let status = 'not-started';
    let lastError = null;

    function getState() {
      const last = history.at(-1);
      return {
        status, attempts: history.length,
        history: history.map(entry => ({ guess: [...entry.guess], result: { ...entry.result } })),
        lastGuess: last ? [...last.guess] : null,
        lastResult: last ? { ...last.result } : null,
        lastError: lastError ? { ...lastError } : null,
      };
    }

    function startGame(options = {}) {
      // Accepte les objets ordinaires provenant d'un autre contexte de navigateur.
      const proto = options && typeof options === 'object' ? Object.getPrototypeOf(options) : undefined;
      if (!options || typeof options !== 'object' || Array.isArray(options) ||
          (proto !== null && Object.getPrototypeOf(proto) !== null) ||
          Reflect.ownKeys(options).some(key => key !== 'secret')) {
        throw Object.assign(new Error(messages['invalid-options']), { code: 'invalid-options' });
      }
      const imposed = Object.hasOwn(options, 'secret');
      const error = imposed ? validate(options.secret) : null;
      if (error) throw Object.assign(new Error(messages[error]), { code: error });
      // Construire le prochain secret avant de toucher à la partie précédente.
      const nextSecret = imposed ? [...options.secret] : Array.from({ length: CODE_LENGTH }, () => {
        const value = random();
        if (!(value >= 0 && value < 1)) throw new RangeError('Tirage aléatoire invalide.');
        return PALETTE[Math.floor(value * PALETTE.length)];
      });
      secret = nextSecret;
      history = [];
      status = 'playing';
      lastError = null;
      return getState();
    }

    function submitGuess(guess) {
      const error = status === 'not-started' ? 'game-not-started' :
        status !== 'playing' ? 'game-finished' : validate(guess);
      if (error) {
        lastError = refusal(error);
        return getState();
      }
      const result = scoreGuess(secret, guess);
      history.push({ guess: [...guess], result });
      lastError = null;
      if (result.wellPlaced === CODE_LENGTH) status = 'won';
      else if (history.length === MAX_ATTEMPTS) status = 'lost';
      return getState();
    }

    return Object.freeze({ getConfig, getState, startGame, submitGuess });
  }

  globalThis.CodeCouleurs = Object.freeze({ PALETTE, CODE_LENGTH, MAX_ATTEMPTS, scoreGuess, createGame });
})();
