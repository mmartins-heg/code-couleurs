import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('les scripts de la page sont compilables sans chargeur de modules', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>\s*<\/script>/g)];
  assert.ok(tags.length > 0, 'La page doit charger le jeu.');
  const scripts = [];
  for (const [, attributes] of tags) {
    assert.doesNotMatch(attributes, /type\s*=\s*["']module["']/);
    assert.match(attributes, /\bdefer\b/, 'Attendre que le document soit disponible.');
    const src = attributes.match(/src=["']([^"']+)["']/)?.[1];
    assert.ok(src);
    scripts.push(new vm.Script(await readFile(new URL(`../${src}`, import.meta.url), 'utf8'), { filename: src }));
  }
  // Le moteur doit être disponible avant le script d'interface, sans import réseau.
  const context = vm.createContext({});
  scripts[0].runInContext(context);
  const result = context.CodeCouleurs.createGame(() => 0).submit(Array(4).fill('rouge'));
  assert.equal(result.state.status, 'won');
});
