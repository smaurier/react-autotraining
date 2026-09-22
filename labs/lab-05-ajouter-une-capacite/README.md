# Lab 05 — Intervention : ajouter une capacité à un composant consommé (le cas Elcia)

> **Outcome :** à la fin, tu sais étendre l'API d'un composant partagé consommé par
> plusieurs écrans SANS rien casser — le geste exact qui bloque en mission quand un
> composant central évolue sous plusieurs consommateurs qui ne bougent pas.
> **Vrai outil :** React 19 + Testing Library. Deux oracles : `regression.test.tsx` (doit
> rester vert AVANT et APRÈS ta modification) et `loading.test.tsx` (RED tant que la
> nouvelle capacité n'existe pas — c'est sa spécification).
> **Feedback :** `npm run lab:05` — GREEN seulement si non-régression **et** nouvelle
> capacité passent ensemble. `npm run solution:05` prouve l'oracle.

## Prérequis technique

`npm install` depuis `04-react/labs`.

## Lire avant (une lecture bornée)

- Module [`32-patterns-composition.md`](../../modules/32-patterns-composition.md) — étendre
  une API sans casser les appels existants : prop optionnelle, valeur par défaut qui
  préserve le comportement actuel.
- Module [`35-fondamentaux-wcag-react.md`](../../modules/35-fondamentaux-wcag-react.md) —
  `aria-busy`, ce qu'un état de chargement doit annoncer.

## Énoncé

`IconButton` (`src/IconButton.tsx`) est **en production**, consommé par trois écrans
(`src/screens/`, à NE PAS modifier) : `PinButton`, `DeleteButton`, `RefreshButton`. Ticket
Elcia-style : *« on doit pouvoir désactiver le bouton et montrer qu'une action est en cours
— sans casser les écrans qui l'utilisent déjà. »*

**0. `FINDINGS.md`, avant toute ligne de code.** Remplis-le d'abord (le correcteur le lit
avant ton code) : quels écrans ça touche, pourquoi un double rempart contre le clic, ce que
doit annoncer un lecteur d'écran, quel écran a une particularité à préserver.

**1. Le contrat** : `loading?: boolean` sur `IconButton`. Absent = comportement actuel,
strictement identique (c'est ce que `regression.test.tsx` vérifie).

**Le piège à éviter.** Un `disabled={loading}` seul sur le `<button>` semble suffisant — et
il l'est pour un clic souris normal. Mais un test (ou un lecteur d'écran dans certains cas
limites) peut déclencher un `click` par un autre chemin que l'interaction souris standard,
en contournant l'attribut `disabled`. La garde doit donc être **aussi** dans le gestionnaire
JS, pas seulement dans l'attribut HTML — double rempart, jamais un seul.

## Étapes (en friction)

1. Remplis `FINDINGS.md`.
2. `npm run lab:05` : la non-régression est déjà VERTE (rien n'est cassé au départ), la
   nouvelle capacité est ROUGE.
3. Ajoute `loading` à `IconButton` : `disabled`, `aria-busy`, un indicateur `role="status"`
   visible, et une garde dans le gestionnaire de clic (pas seulement l'attribut `disabled`).
4. Relance : les deux suites doivent être vertes ENSEMBLE.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:05
npm run solution:05
```

**Ce que l'oracle vérifie**

Non-régression : les trois écrans consommateurs gardent leur nom accessible, leur callback
au clic, et — pour `DeleteButton` — sa `className` propre. Nouvelle capacité : `loading`
désactive le bouton, pose `aria-busy="true"`, affiche un `role="status"` ; un clic
**programmatique** (qui contourne l'attribut `disabled`) n'appelle **pas** `onClick` ; sans
`loading`, rien ne change par rapport à l'existant.

## Variante J+30 (fading)

Un quatrième écran veut un `IconButton` avec un badge de compteur (ex. "3" en haut à
droite). Cette capacité doit-elle vivre dans `IconButton` lui-même, ou dans un composant
qui l'enveloppe ? Justifie avec le même raisonnement que pour `loading`.

## Application TribuZen

Même geste sur un composant partagé de `tribuzen-admin` consommé par plusieurs écrans.
Commit : `feat(icon-button): capacité loading (aria-busy, double rempart), non-régression prouvée`.
