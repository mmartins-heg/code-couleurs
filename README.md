# Code Couleurs

Code Couleurs est un jeu de déduction en français, pour les personnes qui souhaitent jouer sur ordinateur ou smartphone. Retrouvez un code secret de quatre couleurs en dix essais maximum, à l'aide de deux nombres d'indices après chaque proposition.

## État actuel

- Disponible : application responsive, sélection et modification des quatre positions, six couleurs avec symboles et libellés, validation, historique des dix essais, indices tenant compte des doublons, victoire, défaite, révélation du code en fin de partie et nouvelle partie.
- Disponible : règles intégrées, navigation au clavier, tests du moteur sans dépendances et configuration de contrôle GitHub Actions.
- Limites connues : la partie est conservée en mémoire uniquement ; actualiser ou quitter la page la réinitialise. Aucun compte, classement, stockage ou service distant. Le secret est caché dans l'interface, mais ce jeu exécuté dans le navigateur ne constitue pas une protection contre l'inspection technique.
- Dépôt source : [mmartins-heg/code-couleurs](https://github.com/mmartins-heg/code-couleurs), privé. Le tag `jalon-1` identifie la première version du projet.
- Limites connues : application non déployée sur GitHub Pages ; aucune adresse de jeu publique à ce stade. Pas de vérification sur téléphone physique, Safari, Firefox ou lecteur d'écran.

## Commencer

Pour jouer localement, un navigateur récent et Node.js sont nécessaires au serveur fourni. Environnement vérifié : Windows, PowerShell, Node.js **24.22.1**. Aucun paquet à installer ; npm n'est pas nécessaire.

1. Ouvrir un terminal dans le dossier du projet.
2. Lancer le serveur :

   ```sh
   node server.mjs
   ```

3. Ouvrir [http://localhost:4173](http://localhost:4173).
4. Choisir les quatre couleurs, puis cliquer sur **Valider la proposition**.
5. Arrêter le serveur avec `Ctrl+C` lorsque vous avez terminé.

Ne pas ouvrir simplement `index.html` avec une URL `file://` : l'application utilise des modules JavaScript. Le serveur de développement écoute uniquement sur l'ordinateur local.

Pour la future publication sur GitHub Pages, une fois la publication autorisée et les fichiers envoyés dans un dépôt :

1. Ouvrir les paramètres du dépôt, **Settings → Pages**.
2. Choisir **Deploy from a branch** comme source.
3. Sélectionner la branche contenant les fichiers et le dossier **/(root)**, puis enregistrer.
4. Attendre la fin du déploiement et ouvrir l'URL fournie par GitHub Pages.

L'application ne nécessite aucune compilation. Les chemins relatifs permettent son utilisation sous l'adresse d'un dépôt. Voir la [documentation officielle de la source de publication GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Le fichier `.nojekyll` permet de servir les fichiers statiques directement.

## Exemple d'utilisation

- Entrée ou action : dans une partie d'exemple dont le secret serait `rouge, rouge, bleu, vert`, proposer `rouge, bleu, rouge, rouge`.
- Résultat attendu : **1 bien placée**, **2 mal placées**, un essai consommé et la proposition conservée dans l'historique. Les indices ne désignent aucune position.
- Entrée ou action : valider avec une position vide.
- Résultat attendu : une explication s'affiche, sans changement des essais ni de l'historique.

Le code de chaque véritable partie est tiré au hasard ; le secret de cet exemple n'est pas imposé dans l'application.

## Vérifier

Exécuter tous les tests du moteur :

```sh
node --test
```

Résultat observé le **17 novembre 2026**, puis confirmé le **19 novembre 2026**, sous Windows avec Node.js 24.22.1 : **9 tests réussis, aucun échec**. Ils couvrent la palette, les doublons, les propositions refusées, la victoire au dixième essai, la défaite, le blocage après la fin, la réinitialisation et l'isolation des données. Un test compare les **1 679 616 couples** de codes possibles à un calcul indépendant par fréquences.

Contrôles réalisés dans le navigateur intégré de Codex le **17 novembre 2026** : chargement, refus d'une proposition vide avec dix essais conservés, choix des couleurs, validation avec ajout de l'historique et des indices, nouvelle partie et ouverture/fermeture des règles. Affichage examiné à **1280 × 1050** et **375 × 812**, sans débordement horizontal observé. Aperçu : [capture ordinateur](docs/apercu-ordinateur.jpg).

Pour une reprise manuelle :

1. Valider une proposition vide : vérifier le message et les dix essais restants.
2. Choisir quatre couleurs, modifier une position avant validation, puis valider : vérifier un seul essai consommé et la proposition finale dans l'historique.
3. Jouer jusqu'à la fin : vérifier le message, la révélation du secret et les commandes de proposition désactivées.
4. Cliquer sur **Nouvelle partie** : vérifier les dix essais, le code caché, l'historique vide et les quatre positions réinitialisées.
5. Naviguer avec `Tab`, activer les boutons avec `Entrée` ou `Espace`, ouvrir les règles et les fermer avec `Échap`.

Les contrôles d'interface sont manuels, sans suite automatisée de navigateur. La victoire au dixième essai est testée dans le moteur ; elle n'a pas été reproduite dans l'interface. L'accessibilité n'a pas fait l'objet d'un audit complet. Le workflow GitHub Actions et l'hébergement public ne sont pas encore exécutés sur GitHub.

## Se repérer

| Fichier ou dossier | Rôle |
| --- | --- |
| `index.html` | Structure de la page et règles affichées. |
| `style.css` | Présentation, variantes ordinateur/mobile, focus clavier. |
| `app.js` | Interactions, rendu du plateau, annonces des résultats. |
| `game.js` | Moteur indépendant : palette, tirage, validation, indices et état de partie. |
| `tests/game.test.js` | Tests des règles, dont le contrôle exhaustif des indices. |
| `server.mjs` | Serveur de développement local, réservé aux fichiers de l'application. |
| `favicon.svg` | Icône du projet. |
| `docs/` | Aperçu de l'interface vérifiée. |
| `.github/workflows/checks.yml` | Exécution des tests à chaque push ou pull request. |
| `AGENTS.md` | Consignes de travail pour les interventions futures. |

Source de référence : les sept règles fournies pour ce projet, retranscrites ci-dessous. Elles priment sur les variantes commerciales du Mastermind.

1. La palette commune est `rouge`, `bleu`, `vert`, `jaune`, `orange`, `violet`, dans cet ordre. Ce sont les identifiants exacts de l'API JavaScript. Quatre couleurs sont tirées avec répétitions possibles ; le secret reste fixe et caché pendant la partie.
2. Dix essais sont disponibles. Chaque proposition contient quatre couleurs ordonnées de gauche à droite et modifiables avant validation.
3. Une proposition incomplète ou contenant une couleur non autorisée est refusée avec une explication, sans consommer d'essai ni changer l'historique.
4. Chaque proposition valide consomme un essai. Propositions et indices restent consultables jusqu'à la nouvelle partie.
5. Les indices comptent d'abord les couleurs bien placées, puis les présentes mais mal placées parmi les occurrences restantes. Chaque occurrence compte au maximum une fois. Les indices ne désignent pas les positions.
6. Quatre couleurs bien placées donnent la victoire, même au dixième essai. Dix propositions sans victoire donnent la défaite.
7. Après la fin, les propositions ne changent plus la partie. **Nouvelle partie** effectue un nouveau tirage et réinitialise essais, historique et indices. Un nouveau tirage peut, par hasard, produire le même code.

L'API est locale au module `game.js`, sans API HTTP :

```js
import { createGame, PALETTE, scoreGuess } from './game.js';

const game = createGame();
const result = game.submit(['rouge', 'bleu', 'vert', 'jaune']);
// result : { ok, state, error? }
// state : { status: 'playing' | 'won' | 'lost', attemptsLeft, history, secret }
// history : [{ guess, wellPlaced, misplaced }]
// secret vaut null pendant la partie, puis contient les quatre couleurs.
game.snapshot();
game.reset();
```

Décisions de conception : site statique, sans dépendance, partie non sauvegardée, code révélé après victoire ou défaite. Ces choix ne changent pas les sept règles.

## Aide et reprise

Après publication du dépôt, signaler un problème dans son onglet **Issues**, s'il est activé. Préciser le navigateur, la taille d'écran, les étapes suivies, le résultat attendu et le résultat observé, sans données privées.

Responsable : propriétaire du dépôt GitHub ; aucune autre équipe n'est désignée. Pour contribuer, lire `AGENTS.md`, limiter les changements au sujet traité, exécuter `node --test` et décrire les contrôles réalisés dans une pull request. La licence de diffusion reste à choisir par le propriétaire ; aucun texte de licence n'a été attribué sans décision de sa part.
