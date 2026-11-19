(() => {
  'use strict';
  const frame = document.getElementById('game');
  const button = document.getElementById('run');
  const results = document.getElementById('results');
  const summary = document.getElementById('summary');
  const red = Array(4).fill('rouge');
  const blue = Array(4).fill('bleu');
  const initial = { status: 'not-started', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
  let api;
  const equal = (actual, expected, message = 'Valeur inattendue') => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} : ${JSON.stringify(actual)}`);
  };
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const doc = () => frame.contentDocument;
  const data = ({ lastError, ...rest }) => rest;
  function load(query) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chargement du jeu trop long.')), 15000);
      frame.onload = () => { clearTimeout(timeout); resolve(); };
      frame.src = `../index.html${query}`;
    });
  }
  function screen(state) {
    equal(doc().querySelectorAll('#history .filled').length, state.attempts, 'Historique visible');
    equal(doc().getElementById('attempts-left').textContent.split(' ')[0], String(10 - state.attempts), 'Essais visibles');
    for (let i = 0; i < state.attempts; i++) {
      const row = doc().querySelectorAll('#history .filled')[i];
      const entry = state.history[i];
      assert(row.querySelector('.row-pegs').getAttribute('aria-label').endsWith(entry.guess.join(', ')), 'Proposition visible différente');
      equal([...row.querySelectorAll('.score-group')].map(el => Number(el.textContent)), [entry.result.wellPlaced, entry.result.misplaced], 'Indices visibles');
    }
    assert(!('secret' in state) && !('solution' in state), 'Le secret est exposé dans l’état');
    equal(doc().querySelectorAll('#secret .peg').length, 0, 'Révélation séparée interdite');
    equal(doc().getElementById('submit').disabled, state.status !== 'playing', 'Disponibilité de la validation');
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    results.replaceChildren();
    let passed = 0;
    let failed = 0;
    async function check(name, action) {
      const li = document.createElement('li');
      try { await action(); passed++; li.className = 'pass'; li.textContent = `Réussi — ${name}`; }
      catch (error) { failed++; li.className = 'fail'; li.textContent = `Échec — ${name} : ${error.message}`; }
      results.append(li);
      summary.textContent = `${passed} réussis, ${failed} échec(s) — contrôles en cours…`;
    }
    await check('Mode normal : API absente et partie jouable', async () => {
      await load('');
      assert(!('codeSecretTest' in frame.contentWindow), 'API exposée sans test=1');
      equal(doc().querySelectorAll('.color-choice').length, 6);
      assert(!doc().getElementById('submit').disabled, 'Partie normale non démarrée');
    });
    await check('Paramètre test=0 : API absente', async () => {
      await load('?test=0');
      assert(!('codeSecretTest' in frame.contentWindow), 'API exposée avec test=0');
    });
    await check('Mode test avec autre paramètre : état initial et version', async () => {
      await load('?exemple=1&test=1');
      api = frame.contentWindow.codeSecretTest;
      assert(api, 'API absente en mode test');
      equal(api.version, '0.2');
      equal(api.getState(), initial);
      equal(api.getConfig(), { apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0', secretLength: 4, maxAttempts: 10, allowDuplicates: true, colors: ['rouge','bleu','vert','jaune','orange','violet'] });
      screen(api.getState());
    });
    await check('Avant démarrage : priorité game-not-started', async () => {
      const promise = api.submitGuess(null);
      assert(typeof promise.then === 'function', 'submitGuess doit renvoyer une promesse');
      const state = await promise;
      equal(state.lastError.code, 'game-not-started');
      equal(data(state), data(initial));
      screen(state);
    });
    const cases = [
      ['T01', ['rouge','bleu','vert','jaune'], ['rouge','vert','bleu','orange'],1,2],
      ['T02', ['rouge','bleu','vert','jaune'], ['orange','violet','rouge','bleu'],0,2],
      ['T03', ['rouge','bleu','vert','jaune'], ['bleu','rouge','jaune','vert'],0,4],
      ['T04', ['rouge','bleu','vert','jaune'], ['rouge','bleu','jaune','vert'],2,2],
      ['T05', ['rouge','bleu','vert','jaune'], ['rouge','bleu','vert','jaune'],4,0],
      ['T06', ['rouge','rouge','bleu','vert'], red,2,0],
      ['T07', ['rouge','rouge','bleu','vert'], ['rouge','bleu','rouge','vert'],2,2],
      ['T08', ['rouge','rouge','bleu','vert'], ['rouge','rouge','bleu','vert'],4,0],
      ['T09', ['rouge','rouge','bleu','vert'], ['rouge','bleu','rouge','rouge'],1,2],
    ];
    for (const [name, secret, guess, wellPlaced, misplaced] of cases) await check(`${name} : résultat et écran`, async () => {
      const promise = api.startGame({ secret });
      assert(typeof promise.then === 'function', 'startGame doit renvoyer une promesse');
      screen(await promise);
      const state = await api.submitGuess(guess);
      equal(state.attempts, 1);
      equal(state.lastResult, { wellPlaced, misplaced });
      equal(state.status, wellPlaced === 4 ? 'won' : 'playing');
      equal(state.lastError, null);
      equal(state.lastGuess, guess);
      equal(api.getState(), state);
      screen(state);
    });
    await check('Refus de saisie, priorités et effacement de lastError', async () => {
      await api.startGame({ secret: red });
      const before = data(api.getState());
      for (const [guess, code] of [[null,'invalid-type'],[Array(4),'invalid-type'],[['rouge',null],'invalid-type'],[['rouge'],'invalid-length'],[['Violet','rouge','bleu','vert'],'invalid-color']]) {
        const state = await api.submitGuess(guess);
        equal(state.lastError.code, code);
        equal(data(state), before);
        assert(doc().getElementById('feedback').textContent.length > 0, 'Refus non expliqué');
        screen(state);
      }
      equal((await api.submitGuess(blue)).lastError, null);
    });
    await check('Démarrage invalide : promesse rejetée, état et écran inchangés', async () => {
      await api.submitGuess([]);
      const before = api.getState();
      const html = doc().body.innerHTML;
      for (const [options, code] of [[null,'invalid-options'],[{ autre: 1 },'invalid-options'],[{ secret: null },'invalid-type'],[{ secret: ['rouge'] },'invalid-length'],[{ secret: ['rose','rouge','bleu','vert'] },'invalid-color']]) {
        let caught = false;
        try { await api.startGame(options); }
        catch (error) { caught = true; equal(error.code, code); assert(!!error.message, 'Message vide'); }
        assert(caught, 'Démarrage invalide accepté');
        equal(api.getState(), before);
        equal(doc().body.innerHTML, html, 'Écran modifié après démarrage invalide');
      }
    });
    await check('Victoire au dixième, refus au neuvième et blocage après fin', async () => {
      await api.startGame({ secret: red });
      for (let i = 0; i < 9; i++) screen(await api.submitGuess(blue));
      equal((await api.submitGuess(['rouge'])).attempts, 9);
      const won = await api.submitGuess(red);
      equal(won.status, 'won');
      equal(won.attempts, 10);
      screen(won);
      const refused = await api.submitGuess(null);
      equal(refused.lastError.code, 'game-finished');
      equal(data(refused), data(won));
      screen(refused);
    });
    await check('Défaite sans révélation et redémarrage', async () => {
      await api.startGame({ secret: red });
      for (let i = 0; i < 10; i++) screen(await api.submitGuess(blue));
      equal(api.getState().status, 'lost');
      equal((await api.submitGuess(red)).lastError.code, 'game-finished');
      equal(await api.startGame({}), { ...initial, status: 'playing' });
      screen(api.getState());
    });
    await check('Entrées et sorties indépendantes, getters sans effet', async () => {
      const secret = [...red];
      await api.startGame({ secret });
      secret.fill('bleu');
      const guess = [...blue];
      const state = await api.submitGuess(guess);
      const before = api.getState();
      const html = doc().body.innerHTML;
      guess.fill('vert');
      state.history[0].guess.fill('vert');
      state.lastGuess.fill('jaune');
      state.lastResult.wellPlaced = 4;
      api.getConfig().colors.fill('rose');
      equal(api.getState(), before);
      equal(doc().body.innerHTML, html);
      equal((await api.submitGuess(red)).status, 'won');
    });
    await check('Action du joueur reflétée dans getState()', async () => {
      await api.startGame({ secret: red });
      const choice = doc().querySelector('.color-choice');
      for (let i = 0; i < 4; i++) choice.click();
      doc().getElementById('submit').click();
      await Promise.resolve();
      equal(api.getState().status, 'won');
      equal(api.getState().lastGuess, red);
      screen(api.getState());
      doc().getElementById('new-game').click();
      await Promise.resolve();
      equal(api.getState(), { ...initial, status: 'playing' });
      screen(api.getState());
    });
    await check('Rechargement du mode test : état initial propre', async () => {
      await load('?test=1&reprise=1');
      api = frame.contentWindow.codeSecretTest;
      equal(api.getState(), initial);
      screen(api.getState());
    });
    summary.textContent = `Terminé : ${passed} réussis, ${failed} échec(s).`;
    button.disabled = false;
  });
})();
