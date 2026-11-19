import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, createGame, scoreGuess } from '../game.js';

const redCode = ['rouge', 'rouge', 'rouge', 'rouge'];
const blueCode = ['bleu', 'bleu', 'bleu', 'bleu'];
test('palette exacte et ordonnée', () => {
  assert.deepEqual(PALETTE, ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
});
test('code caché, tirage de quatre couleurs avec répétitions', () => {
  const game = createGame(() => 0);
  assert.deepEqual(game.snapshot(), { status: 'playing', attemptsLeft: 10, history: [], secret: null });
  assert.equal(game.submit(redCode).state.status, 'won');
});
test('indices : cas connus et occurrences comptées une seule fois', () => {
  for (const [secret, guess, expected] of [
    [redCode, redCode, [4, 0]],
    [redCode, blueCode, [0, 0]],
    [['rouge', 'rouge', 'bleu', 'vert'], ['rouge', 'bleu', 'rouge', 'rouge'], [1, 2]],
    [['rouge', 'bleu', 'vert', 'jaune'], redCode, [1, 0]],
    [['rouge', 'rouge', 'bleu', 'bleu'], ['bleu', 'bleu', 'rouge', 'rouge'], [0, 4]],
    [['rouge', 'bleu', 'bleu', 'vert'], ['bleu', 'bleu', 'bleu', 'bleu'], [2, 0]],
  ]) assert.deepEqual(scoreGuess(secret, guess), { wellPlaced: expected[0], misplaced: expected[1] });
});
test('propositions invalides : ni essai consommé ni historique modifié', () => {
  const game = createGame(() => 0);
  game.submit(blueCode);
  const before = game.snapshot();
  for (const invalid of [null, [], ['rouge'], ['rouge', '', 'rouge', 'rouge'], ['rouge', null, 'rouge', 'rouge'], ['rouge', 'rose', 'rouge', 'rouge'], ['Rouge', 'bleu', 'vert', 'jaune'], Array(4), [...redCode, 'bleu']]) {
    const result = game.submit(invalid);
    assert.equal(result.ok, false);
    assert.ok(result.error.length > 0);
    assert.deepEqual(game.snapshot(), before);
  }
});
test('victoire au dixième essai prioritaire sur la défaite', () => {
  const game = createGame(() => 0);
  for (let i = 0; i < 9; i++) assert.equal(game.submit(blueCode).state.status, 'playing');
  const state = game.submit(redCode).state;
  assert.equal(state.status, 'won');
  assert.equal(state.attemptsLeft, 0);
  assert.equal(state.history.length, 10);
  assert.deepEqual(state.secret, redCode);
});
test('défaite après dix propositions et blocage de la partie terminée', () => {
  for (const win of [false, true]) {
    const game = createGame(() => 0);
    if (win) game.submit(redCode);
    else for (let i = 0; i < 10; i++) game.submit(blueCode);
    const before = game.snapshot();
    assert.equal(before.status, win ? 'won' : 'lost');
    assert.equal(game.submit(redCode).ok, false);
    assert.equal(game.submit([]).ok, false);
    assert.deepEqual(game.snapshot(), before);
  }
});
test('nouvelle partie : nouveau tirage, historique et indices réinitialisés', () => {
  let value = 0;
  const game = createGame(() => value);
  game.submit(redCode);
  value = 0.99;
  assert.deepEqual(game.reset(), { status: 'playing', attemptsLeft: 10, history: [], secret: null });
  assert.equal(game.submit(Array(4).fill('violet')).state.status, 'won');
  game.reset();
  game.submit(redCode);
  assert.equal(game.reset().history.length, 0);
});
test('propositions et instantanés ne permettent pas de modifier le moteur', () => {
  const game = createGame(() => 0);
  const input = [...blueCode];
  game.submit(input);
  input[0] = 'rouge';
  const state = game.snapshot();
  state.history[0].guess[0] = 'vert';
  state.history[0].wellPlaced = 4;
  state.history.push({});
  assert.deepEqual(game.snapshot().history, [{ guess: blueCode, wellPlaced: 0, misplaced: 0 }]);
});
test('tous les couples possibles : cohérence avec un comptage indépendant des fréquences', () => {
  const codes = [];
  for (const a of PALETTE) for (const b of PALETTE) for (const c of PALETTE) for (const d of PALETTE) codes.push([a, b, c, d]);
  for (const secret of codes) for (const guess of codes) {
    const exact = secret.reduce((sum, color, i) => sum + Number(color === guess[i]), 0);
    const total = PALETTE.reduce((sum, color) => sum + Math.min(secret.filter(c => c === color).length, guess.filter(c => c === color).length), 0);
    const actual = scoreGuess(secret, guess);
    if (actual.wellPlaced !== exact || actual.misplaced !== total - exact) assert.fail(`Indices incorrects : ${secret} / ${guess}`);
  }
});
