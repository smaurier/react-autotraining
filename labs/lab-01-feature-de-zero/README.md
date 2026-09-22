# Lab 01 — Zéro : une feature de bout en bout, « Ajouter un membre »

> **Outcome :** à la fin, tu as construit un vrai formulaire React — état, appel API typé,
> validation côté client, gestion loading/succès/erreur, accessibilité — et tu l'as prouvé
> avec des tests qui parlent le DOM comme un utilisateur (labels, rôles), pas des détails
> d'implémentation.
> **Vrai outil :** React 19 + Testing Library + **MSW** (Mock Service Worker) — les tests
> interceptent de VRAIES requêtes `fetch`, jamais un mock manuel de ta fonction d'API.
> **Feedback :** `npm run lab:01` — RED tant que `src/AjouterMembreForm.tsx` ne satisfait
> pas l'énoncé. `npm run solution:01` prouve l'oracle : GREEN sur la référence.

## Prérequis technique

Rien à installer à part les dépendances du dossier `labs/` (`npm install` depuis
`04-react/labs`). Aucun backend réel : `api.ts` fait un vrai `fetch`, MSW l'intercepte dans
les tests avec des réponses scriptées (succès, conflit 409).

## Lire avant (une lecture bornée)

- Module [`08-usestate.md`](../../modules/08-usestate.md) — état de formulaire, pourquoi
  chaque champ contrôlé a besoin de son propre `useState`.
- Module [`07-evenements-et-formulaires-basiques.md`](../../modules/07-evenements-et-formulaires-basiques.md)
  — `onSubmit`, `preventDefault`, validation native vs validation JS.
- Module [`30-tests-api-msw.md`](../../modules/30-tests-api-msw.md) — MSW : pourquoi
  intercepter la vraie requête réseau plutôt que mocker la fonction qui l'émet.
- Module [`35-fondamentaux-wcag-react.md`](../../modules/35-fondamentaux-wcag-react.md) —
  labels associés, `role="alert"` pour une erreur, `role="status"` pour une confirmation.

## Énoncé

Lis les commentaires en tête de `src/AjouterMembreForm.tsx` : ils décrivent le contrat
exact (props, comportement, accessibilité). Implémente le composant. Le fichier `api.ts`
est DONNÉ — tu l'utilises, tu ne le modifies pas.

**Le piège à connaître.** Un `<input type="email">` déclenche la validation **native** du
navigateur : si tu laisses le comportement par défaut, le navigateur bloque le `submit`
*avant même que ton `onSubmit` ne soit appelé* dès que la valeur "a l'air" invalide selon
lui — ta logique de validation JS ne s'exécute alors jamais, et ton `role="alert"` n'apparaît
jamais non plus. Ajoute `noValidate` sur le `<form>` pour garder la main.

## Étapes (en friction)

1. `npm run lab:01` une première fois : RED, le composant lève une erreur explicite.
2. Construis le formulaire champ par champ : d'abord les inputs et labels (le premier test
   ne teste QUE ça), puis la validation, puis l'appel API avec ses trois états
   (en cours / succès / erreur).
3. Relance après chaque étape — les 4 tests s'allument un par un si tu avances dans le bon
   ordre.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:01
npm run solution:01
```

**Ce que l'oracle vérifie**

Les champs Email et Rôle sont atteignables par `getByLabelText` (jamais par un attribut de
test — si un label n'est pas câblé, le test échoue, exactement comme un lecteur d'écran
échouerait) ; un email invalide produit un `role="alert"` et **aucun appel réseau** (MSW
compte les requêtes reçues) ; un envoi valide appelle l'API, affiche "Ajout en cours…"
pendant l'attente, puis un `role="status"` de confirmation, réinitialise le champ email, et
notifie `onSuccess` avec le membre créé ; un conflit serveur (409) affiche le message exact
du serveur dans un `role="alert"`, **garde** la valeur saisie, réactive le bouton.

## Variante J+30 (fading)

Le produit ajoute un champ "prénom" optionnel. Comment l'ajouter sans casser les tests
existants — et quel nouveau test écrirais-tu en premier ?

## Application TribuZen

Même geste sur `tribuzen-api` côté écran famille : `AjouterMembreForm` intégré dans la page
de gestion des membres. Commit :
`feat(members): formulaire d'ajout, validation + MSW-testé + a11y (labels, alert, status)`.
