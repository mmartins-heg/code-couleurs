# Code Couleurs

Code Couleurs est un jeu de déduction en français, utilisable sur ordinateur et smartphone. Retrouvez quatre couleurs cachées en dix essais maximum, à l’aide des nombres de couleurs bien placées et présentes mais mal placées.

## État actuel

- Disponible : six couleurs avec libellés et symboles, quatre positions modifiables, dix essais, indices tenant compte des doublons, historique, victoire, défaite et nouvelle partie.
- Disponible : API commune de test **0.2**, utilisant exactement la même partie et le même moteur que l’interface, accessible uniquement avec `?test=1`.
- Disponible : tests Node.js sans dépendances et page de vérification de l’intégration dans le navigateur.
- Dépôt public : [mmartins-heg/code-couleurs](https://github.com/mmartins-heg/code-couleurs). `test` conserve la première version ; `jalon-1` identifie la version API 0.2 vérifiée. Ces tags remplacent respectivement les anciens noms `jalon-1` et `jalon-2`.
- Limites connues : partie en mémoire, réinitialisée en quittant ou actualisant la page ; aucun compte ni sauvegarde. Le secret n’est jamais révélé séparément, même en fin de partie. Le jeu s’exécute dans le navigateur et ne prétend pas résister à une inspection technique.
- Disponible : [jeu publié sur GitHub Pages](https://mmartins-heg.github.io/code-couleurs/), vérifié le 19 novembre 2026. Pas de test sur téléphone physique, Safari, Firefox ou lecteur d’écran ; aucun audit complet d’accessibilité.

## Commencer

Adresses GitHub Pages :

- [Jouer](https://mmartins-heg.github.io/code-couleurs/).
- [Ouvrir le mode test](https://mmartins-heg.github.io/code-couleurs/?test=1).
- [Vérifier l’intégration de l’API](https://mmartins-heg.github.io/code-couleurs/docs/verification.html).

En mode normal, une partie aléatoire démarre immédiatement. Sélectionner une position, choisir une couleur puis valider après avoir rempli les quatre positions. Les couleurs peuvent se répéter ; les propositions restent modifiables avant validation.

En mode test, l’état initial est `not-started` : appeler `startGame()` ou cliquer sur **Nouvelle partie** avant de jouer.

Pour jouer localement sans installation, télécharger et extraire tout le projet, puis ouvrir `index.html` en conservant les fichiers voisins. JavaScript doit être activé. Une page de fichier sur `github.com` affiche le code source, pas le jeu.

Pour utiliser aussi la page de vérification, lancer le serveur local depuis le dossier du projet. Node.js **24.22.1** est l’environnement vérifié ; npm et les paquets externes ne sont pas nécessaires.

```sh
node server.mjs
```

Ouvrir [http://localhost:4173](http://localhost:4173), puis au besoin [la page de contrôle locale](http://localhost:4173/docs/verification.html). Arrêter le serveur avec `Ctrl+C`. Il écoute uniquement sur l’ordinateur local.

Pour publier ou reprendre la configuration GitHub Pages : dans **Settings → Pages**, sélectionner **Deploy from a branch**, la branche `main` et **/(root)**, puis enregistrer. Il n’y a aucune compilation. Les chemins relatifs et `.nojekyll` permettent l’hébergement sous `/code-couleurs/`. Voir la [documentation officielle GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Exemple d’utilisation

- Entrée ou action : avec le secret d’exemple `rouge, rouge, bleu, vert`, proposer `rouge, bleu, rouge, rouge`.
- Résultat attendu : **1 bien placée**, **2 mal placées**, un seul essai consommé et la proposition conservée dans l’historique. Les indices n’indiquent aucune position.
- Entrée ou action : valider une proposition incomplète.
- Résultat attendu : un message explique le refus, sans consommer d’essai ni modifier l’historique.

Pour reproduire l’exemple via la console du navigateur, ouvrir le jeu avec `?test=1`, attendre que `window.codeSecretTest` soit disponible, puis exécuter :

```js
const api = window.codeSecretTest;
api.version; // "0.2"
api.getConfig();
await api.startGame({ secret: ["rouge", "rouge", "bleu", "vert"] });
const state = await api.submitGuess(["rouge", "bleu", "rouge", "rouge"]);
console.assert(state.attempts === 1);
console.assert(state.lastResult.wellPlaced === 1);
console.assert(state.lastResult.misplaced === 2);
api.getState();
```

La configuration renvoyée est :

```json
{
  "apiVersion": "0.2",
  "rulesVersion": "code-couleurs-1.0",
  "secretLength": 4,
  "maxAttempts": 10,
  "allowDuplicates": true,
  "colors": ["rouge", "bleu", "vert", "jaune", "orange", "violet"]
}
```

`getConfig()` et `getState()` sont synchrones. `startGame(options?)` et `submitGuess(guess)` renvoient des promesses, résolues après la mise à jour de l’écran. Attendre chaque appel avant le suivant.

L’état contient `status` (`not-started`, `playing`, `won` ou `lost`), `attempts`, `history: [{ guess, result: { wellPlaced, misplaced } }]`, `lastGuess`, `lastResult` et `lastError`. Les trois derniers champs valent initialement `null`. Les résultats sont sérialisables en JSON et indépendants de l’état interne. Aucun champ `secret` ou `solution` n’est renvoyé.

`startGame()` et `startGame({})` effectuent un tirage aléatoire. `{ secret: [...] }` impose un code pour un test. Toute autre clé ou forme d’options est refusée. Un démarrage invalide rejette la promesse avec une `Error` portant `code` et `message`, sans modifier l’état ni l’écran, y compris `lastError`.

Un refus de `submitGuess` résout la promesse vers l’état courant avec `lastError: { code, message }`, sans changer les données de jeu. Priorités : `game-not-started`, `game-finished`, `invalid-type`, `invalid-length`, `invalid-color`. Un tableau doit être dense et composé de chaînes ; leur type est contrôlé avant la longueur, puis les couleurs autorisées. Un démarrage réussi ou une proposition valide efface `lastError`.

Sans `?test=1`, `window.codeSecretTest` n’est pas exposé. Aucun appel à un serveur applicatif ou service d’IA, aucune clé et aucune donnée personnelle ne sont nécessaires.

## Vérifier

Depuis le dossier du projet :

```sh
node --test
```

Résultat local le **19 novembre 2026**, sous Windows avec Node.js 24.22.1 : **19 tests réussis, aucun échec**. Ils couvrent configuration, état initial, T01 à T09, priorités des refus, options invalides, indépendance des données, nouveau tirage, victoire au dixième essai, défaite, blocage et redémarrage. Un contrôle exhaustif compare les **1 679 616 couples** de codes à un calcul indépendant par fréquences. Un autre contrôle vérifie que les scripts de la page se compilent sans chargeur de modules.

Dans [la page de vérification](https://mmartins-heg.github.io/code-couleurs/docs/verification.html), cliquer sur **Exécuter les contrôles**. Elle charge le véritable jeu dans un cadre et compare l’API avec l’écran. Résultat local via HTTP, puis confirmé sur **l’adresse GitHub Pages publiée** dans le navigateur intégré de Codex le **19 novembre 2026** : **20 contrôles réussis, aucun échec**. Cela couvre notamment l’absence de l’API en mode normal, les promesses, T01 à T09, les refus, la victoire au dixième essai, la défaite, l’absence de révélation, les copies indépendantes, les actions de l’interface et le rechargement propre du mode test. Cette page ne remplace pas l’outil de test de l’enseignant, non fourni.

Le workflow GitHub des tests et le premier déploiement Pages ont réussi pour le commit applicatif `0412675`. L’interface publiée a aussi été examinée à **375 × 812** et **1280 × 1050** : sélection, validation d’une proposition, historique, indices et nouvelle partie fonctionnels ; aucun débordement horizontal observé. Le tag `jalon-1` (anciennement `jalon-2`) ajoute à ce même code la documentation des résultats.

Contrôles manuels utiles : modifier une position avant validation ; jouer au clavier (`Tab`, `Entrée` ou `Espace`) ; ouvrir et fermer les règles ; examiner les propositions et indices ; relancer une partie ; vérifier sur un smartphone physique. L’ouverture directe `file://` n’est pas contrôlable par l’outil de navigateur utilisé ici ; le chargement sans modules est testé séparément.

Les résultats historiques du 17 novembre concernaient la première version, désormais repérée par `test`, et ne constituent pas la vérification de l’API 0.2. [La capture initiale](docs/apercu-ordinateur.jpg) illustre uniquement la présentation de cette première version.

## Se repérer

| Fichier ou dossier | Rôle |
| --- | --- |
| `index.html` | Page, règles et chargement des scripts. |
| `style.css` | Présentation ordinateur/mobile et focus clavier. |
| `game-core.js` | Moteur unique : état, validation, indices, démarrage et propositions. |
| `game.js` | Adaptateur en module pour les tests et intégrations. |
| `app.js` | Interface et API commune, branchées sur la même instance du moteur. |
| `tests/game.test.js` | Tests des règles et du contrat 0.2. |
| `tests/classic-loading.test.js` | Contrôle du chargement sans modules. |
| `docs/verification.html` et `docs/verification.js` | Contrôles API/interface reproductibles dans le navigateur. |
| `server.mjs` | Serveur local statique de développement, sans API HTTP. |
| `.github/workflows/checks.yml` | Exécution des tests Node.js sur GitHub. |
| `AGENTS.md` | Consignes de travail. |

Sources de référence : les sept règles fournies pour le projet (`code-couleurs-1.0`) et le document pédagogique **API commune de test — Code secret en couleurs, contrat 0.2, édition Google 1.5, mise à jour du 28/10/2026**. Le contrat 0.2 précise l’interface attendue et interdit une révélation séparée du secret, y compris après la fin. Le document pédagogique n’est pas redistribué dans ce dépôt.

Les règles communes restent : quatre couleurs parmi les six identifiants exacts, répétitions possibles, secret fixe, dix essais maximum, contrôle des occurrences restantes après les bien placées, victoire prioritaire au dixième essai, historique conservé jusqu’au redémarrage et refus sans consommation d’essai. Un nouveau tirage peut donner le même code par hasard.

Décisions : site statique sans dépendances ni stockage, mode normal démarré automatiquement, mode test initialement arrêté, aucune révélation séparée de la solution.

## Aide et reprise

Signaler un problème dans les [Issues du dépôt](https://github.com/mmartins-heg/code-couleurs/issues) avec les étapes, le navigateur, le résultat attendu et observé, sans données privées. Responsable : propriétaire du dépôt, `mmartins-heg`.

Pour contribuer : lire `AGENTS.md`, limiter les modifications au sujet traité, exécuter `node --test` et les contrôles d’intégration pertinents, puis décrire les résultats dans une pull request. La licence de diffusion reste à choisir par le propriétaire ; aucun texte de licence n’a été attribué sans décision de sa part.
