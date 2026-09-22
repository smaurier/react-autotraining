# Lab 04 — Zéro : une recette de mission ESN, livrer dans une codebase inconnue

> **Outcome :** à la fin, tu sais ce que "jour 1 en mission" veut vraiment dire côté code :
> lire les conventions déjà en place AVANT d'écrire, puis livrer une feature qui s'y range
> plutôt qu'une qui "marche" mais détonne. L'oracle vérifie les DEUX : le comportement, ET la
> conformité du code source aux conventions (comme une vraie relecture de PR).
> **Vrai outil :** React 19 + Testing Library + MSW, plus une relecture **statique** du
> fichier source (le test lit littéralement ton code, comme le ferait un tech lead).
> **Feedback :** `npm run lab:04` — RED tant que `src/FamilyCardList.tsx` ne satisfait pas
> l'énoncé, comportement ET conventions. `npm run solution:04` prouve l'oracle.

## Prérequis technique

`npm install` depuis `04-react/labs`. Aucun backend réel : MSW intercepte les appels.

## Lire avant (une lecture bornée)

- Module [`41-patterns-esn.md`](../../modules/41-patterns-esn.md) — structurer une feature
  dans une codebase inconnue sans tout casser : la conformité aux conventions n'est pas un
  détail de style, c'est ce qui rend ton code maintenable par l'équipe qui reste après toi.
- **`ExampleWidget.tsx` dans ce dossier** (donné, référence seulement) — LIS-LE avant de
  commencer : il montre exactement le pattern attendu (Card + useApiResource + textes d'état
  exacts).

## Énoncé

Simule un vrai jour 1 de mission : `Card.tsx` et `useApiResource.ts` sont des fichiers
**déjà là**, utilisés ailleurs dans la codebase (voir `ExampleWidget.tsx`). Ta mission :
livrer `FamilyCardList` — la liste des membres d'une famille — en respectant ce qui existe
déjà, pas en réinventant ta propre façon de faire.

Lis les commentaires en tête de `src/FamilyCardList.tsx` pour le détail exact.

**Le piège à éviter.** Un composant qui "marche" (affiche la bonne liste) mais qui
réimplémente son propre `useEffect`+`fetch` au lieu de `useApiResource`, ou son propre `<div
className="card">` au lieu de `<Card>`, ou qui utilise `export default` alors que toute la
codebase utilise des exports nommés — c'est exactement le genre de PR qui se fait recaler en
mission, même si la démo "marche". L'oracle relit littéralement ton fichier source pour
vérifier ça, pas juste ce qui s'affiche à l'écran.

## Étapes (en friction)

1. Lis `ExampleWidget.tsx` en entier — c'est ta seule doc.
2. `npm run lab:04` : RED sur le comportement ET les checks de conformité.
3. Écris `FamilyCardList` en réutilisant `useApiResource` et `Card`, avec les mêmes textes
   d'état ("Chargement…", "Erreur.") que `ExampleWidget`, en export nommé.
4. Relance : les 5 tests (2 comportement, 3 conformité) doivent passer.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:04
npm run solution:04
```

**Ce que l'oracle vérifie**

Comportement : "Chargement…" puis la liste des membres dans une vraie `Card` (détectée par
son attribut `data-slot="card"` — preuve de réutilisation, pas de réinvention), "Erreur."
avec le texte exact en cas d'échec réseau. Conformité (relecture du code source, commentaires
ignorés) : le fichier importe et utilise `useApiResource` (pas de `useEffect` réimplémenté à
la main), utilise `Card`, et n'a jamais d'`export default`.

## Variante J+30 (fading)

Le tech lead de la mission te demande d'ajouter un bouton "Retirer" par membre. Où
regarderais-tu D'ABORD pour savoir comment ce genre d'action est déjà géré ailleurs dans
cette codebase (même fictive) avant d'écrire une ligne ?

## Application TribuZen

Même geste sur une VRAIE codebase avec des conventions déjà installées (`tribuzen-admin`) :
lire les composants existants avant d'ajouter une feature. Commit :
`feat(members): liste des membres, Card + useApiResource réutilisés (convention équipe)`.
