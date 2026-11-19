import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, createGame, scoreGuess } from '../game.js';

const red = Array(4).fill('rouge');
const blue = Array(4).fill('bleu');
const initial = { status: 'not-started', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
const data = ({ lastError, ...rest }) => rest;
const started = () => { const game = createGame(() => 0); game.startGame(); return game; };

test('configuration exacte, état initial, refus avant démarrage', () => {
  const game = createGame();
  assert.deepEqual(game.getState(), initial);
  assert.deepEqual(game.getConfig(), { apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0', secretLength: 4, maxAttempts: 10, allowDuplicates: true, colors: ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'] });
  assert.equal(game.submitGuess(null).lastError.code, 'game-not-started');
  assert.deepEqual(data(game.getState()), data(initial));
});

const cases = [
  ['T01', ['rouge','bleu','vert','jaune'], ['rouge','vert','bleu','orange'], 1, 2],
  ['T02', ['rouge','bleu','vert','jaune'], ['orange','violet','rouge','bleu'], 0, 2],
  ['T03', ['rouge','bleu','vert','jaune'], ['bleu','rouge','jaune','vert'], 0, 4],
  ['T04', ['rouge','bleu','vert','jaune'], ['rouge','bleu','jaune','vert'], 2, 2],
  ['T05', ['rouge','bleu','vert','jaune'], ['rouge','bleu','vert','jaune'], 4, 0],
  ['T06', ['rouge','rouge','bleu','vert'], red, 2, 0],
  ['T07', ['rouge','rouge','bleu','vert'], ['rouge','bleu','rouge','vert'], 2, 2],
  ['T08', ['rouge','rouge','bleu','vert'], ['rouge','rouge','bleu','vert'], 4, 0],
  ['T09', ['rouge','rouge','bleu','vert'], ['rouge','bleu','rouge','rouge'], 1, 2],
];
for (const [name, secret, guess, wellPlaced, misplaced] of cases) test(`Contrat 0.2 : ${name}`, () => {
  const game = createGame();
  game.startGame({ secret });
  const state = game.submitGuess(guess);
  assert.deepEqual(state, {
    status: wellPlaced === 4 ? 'won' : 'playing', attempts: 1,
    history: [{ guess, result: { wellPlaced, misplaced } }],
    lastGuess: guess, lastResult: { wellPlaced, misplaced }, lastError: null,
  });
});

test('priorité type, longueur et couleur ; aucun essai perdu sur refus', () => {
  const game = started();
  game.submitGuess(blue);
  const before = data(game.getState());
  for (const [guess, code] of [
    [null,'invalid-type'], ['rouge','invalid-type'], [42,'invalid-type'],
    [Array(4),'invalid-type'], [['rouge',null],'invalid-type'],
    [['rouge',undefined,'bleu','vert'],'invalid-type'],
    [[], 'invalid-length'], [['rouge'],'invalid-length'], [['rose'],'invalid-length'],
    [[...red, 'bleu'],'invalid-length'],
    [['rouge','','bleu','vert'],'invalid-color'],
    [['Violet','bleu','vert','jaune'],'invalid-color'],
    [['violet ','bleu','vert','jaune'],'invalid-color'],
    [['purple','bleu','vert','jaune'],'invalid-color'],
  ]) {
    const state = game.submitGuess(guess);
    assert.equal(state.lastError.code, code);
    assert.ok(state.lastError.message.length);
    assert.deepEqual(data(state), before);
  }
  assert.equal(game.submitGuess(blue).lastError, null);
});

test('démarrage invalide : erreur normalisée et état intégralement conservé', () => {
  const game = started();
  game.submitGuess([]);
  const before = game.getState();
  for (const [options, code] of [
    [null,'invalid-options'], [[], 'invalid-options'], [new Date(),'invalid-options'],
    [new (class Options {})(),'invalid-options'], [true,'invalid-options'],
    [{ secret: red, other: 1 },'invalid-options'], [{ [Symbol('x')]: 1 },'invalid-options'],
    [{ secret: null },'invalid-type'], [{ secret: undefined },'invalid-type'],
    [{ secret: ['rouge',null] },'invalid-type'], [{ secret: Array(4) },'invalid-type'],
    [{ secret: ['rouge'] },'invalid-length'], [{ secret: ['rouge','bleu','vert','rose'] },'invalid-color'],
  ]) {
    assert.throws(() => game.startGame(options), error => error instanceof Error && error.code === code && error.message.length > 0);
    assert.deepEqual(game.getState(), before);
  }
});

test('démarrage sans options, undefined, objet vide et objet sans prototype', () => {
  for (const options of [undefined, {}, Object.create(null)]) {
    const game = createGame(() => 0);
    assert.deepEqual(game.startGame(options), { ...initial, status: 'playing' });
    assert.equal(game.submitGuess(red).status, 'won');
  }
});

test('victoire au dixième essai, refus au neuvième, blocage après victoire', () => {
  const game = started();
  for (let i = 0; i < 9; i++) assert.equal(game.submitGuess(blue).status, 'playing');
  assert.equal(game.submitGuess(['rouge']).attempts, 9);
  const won = game.submitGuess(red);
  assert.equal(won.status, 'won');
  assert.equal(won.attempts, 10);
  assert.equal(won.history.length, 10);
  assert.equal(won.lastError, null);
  assert.equal(game.submitGuess(null).lastError.code, 'game-finished');
  assert.deepEqual(data(game.getState()), data(won));
});

test('défaite, blocage après fin et redémarrage depuis won ou lost', () => {
  for (const win of [false, true]) {
    const game = started();
    if (win) game.submitGuess(red);
    else for (let i = 0; i < 10; i++) game.submitGuess(blue);
    const before = game.getState();
    assert.equal(before.status, win ? 'won' : 'lost');
    for (const guess of [red, null]) {
      assert.equal(game.submitGuess(guess).lastError.code, 'game-finished');
      assert.deepEqual(data(game.getState()), data(before));
    }
    assert.deepEqual(game.startGame(), { ...initial, status: 'playing' });
  }
});

test('copies indépendantes des entrées, getters et résultats, aucune révélation', () => {
  const game = createGame();
  const secret = [...red];
  game.startGame({ secret });
  secret.fill('bleu');
  const guess = [...blue];
  const state = game.submitGuess(guess);
  const before = game.getState();
  guess.fill('vert');
  state.history[0].guess[0] = 'vert';
  state.history[0].result.wellPlaced = 4;
  state.lastGuess[0] = 'vert';
  state.lastResult.misplaced = 4;
  game.getConfig().colors.fill('rose');
  assert.deepEqual(game.getState(), before);
  assert.deepEqual(game.getConfig().colors, PALETTE);
  const won = game.submitGuess(red);
  assert.equal(won.status, 'won');
  assert.ok(!('secret' in won) && !('solution' in won));
  game.submitGuess(null);
  const errorState = game.getState();
  errorState.lastError.code = 'modifié';
  assert.equal(game.getState().lastError.code, 'game-finished');
  assert.equal(game.getState().status, 'won');
  assert.doesNotThrow(() => JSON.stringify(game.getState()));
});

test('nouveau tirage après un secret imposé', () => {
  const game = createGame(() => 0.99);
  game.startGame({ secret: red });
  game.startGame();
  assert.equal(game.submitGuess(Array(4).fill('violet')).status, 'won');
});

test('1 679 616 couples : indices comparés à un comptage indépendant des fréquences', () => {
  const codes = [];
  for (const a of PALETTE) for (const b of PALETTE) for (const c of PALETTE) for (const d of PALETTE) codes.push([a,b,c,d]);
  for (const secret of codes) for (const guess of codes) {
    const exact = secret.reduce((sum, color, i) => sum + Number(color === guess[i]), 0);
    const total = PALETTE.reduce((sum, color) => sum + Math.min(secret.filter(c => c === color).length, guess.filter(c => c === color).length), 0);
    const actual = scoreGuess(secret, guess);
    if (actual.wellPlaced !== exact || actual.misplaced !== total - exact) assert.fail(`Indices incorrects : ${secret} / ${guess}`);
  }
});
