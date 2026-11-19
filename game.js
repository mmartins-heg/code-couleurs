// Adaptateur de l'API en module pour les tests et les intégrations JavaScript.
// Le navigateur charge directement game-core.js, y compris avec une URL file://.
import './game-core.js';

export const { PALETTE, CODE_LENGTH, MAX_ATTEMPTS, scoreGuess, createGame } = globalThis.CodeCouleurs;
