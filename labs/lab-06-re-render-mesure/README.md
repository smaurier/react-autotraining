# Lab 06 — Intervention : profiler, trouver, corriger, prouver un re-render inutile

> **Outcome :** à la fin, tu sais diagnostiquer un re-render inutile avec une VRAIE mesure
> (pas une intuition), identifier les DEUX causes qui doivent être corrigées ensemble
> (`memo()` sur l'enfant, identité stable des props passées par le parent), et prouver la
> correction avec un chiffre, pas une impression de fluidité.
> **Vrai outil :** React 19 (`memo`, `useCallback`). Le "profiler" est un compteur de rendus
> réel injecté dans les tests — `onRender` ne s'exécute QUE si le corps de la fonction
> `MemberRow` s'exécute vraiment, ce qui reflète exactement ce que React DevTools Profiler
> mesurerait.
> **Feedback :** `npm run lab:06` — RED : le compteur de rendus explose à chaque frappe.
> `npm run solution:06` prouve l'oracle : GREEN, un seul rendu par ligne.

## Prérequis technique

`npm install` depuis `04-react/labs`.

## Lire avant (une lecture bornée)

- Module [`11-usecallback-usememo.md`](../../modules/11-usecallback-usememo.md) — pourquoi
  `React.memo` seul ne suffit pas si les props (notamment les callbacks) changent d'identité
  à chaque rendu du parent.
- Module [`31-performance-react.md`](../../modules/31-performance-react.md) — profiler avant
  de corriger : un re-render "senti" saccadé n'est pas toujours dû à la cause qu'on imagine.

## Énoncé

`FamilyMembersList` (`src/FamilyMembersList.tsx`) est **en production**. Ticket : *« taper
dans le champ de recherche est saccadé sur les grosses familles — on dirait que toute la
liste se redessine à chaque frappe. »* Le fichier compile et marche déjà — le bug n'est pas
une erreur, c'est une perte de performance invisible sans mesure.

Lis les commentaires en tête du fichier. Corrige `MemberRow` et `FamilyMembersList` pour que
chaque ligne ne se re-rende QUE si ce qu'elle affiche a vraiment changé.

**Le piège à éviter.** Envelopper `MemberRow` dans `React.memo()` sans toucher au parent ne
suffit pas : `FamilyMembersList` crée une NOUVELLE fonction `onSelect` à chaque rendu
(`(id) => onSelectMember(id)`), ce qui change l'identité de cette prop à chaque frappe — et
un `memo()` compare les props par référence. Les deux corrections vont ensemble : `memo()`
sur l'enfant, ET une closure stable (`useCallback`) côté parent.

## Étapes (en friction)

1. `npm run lab:06` : RED — le compteur de rendus (`onRowRender`) tourne à chaque frappe
   pour CHAQUE ligne visible, même celles dont l'email n'a pas changé.
2. Enveloppe `MemberRow` dans `memo()`.
3. Relance : ça ne change encore rien — `onSelect` casse toujours la mémoïsation.
4. Stabilise `onSelect` avec `useCallback` dans `FamilyMembersList`, transmets `onRowRender`
   TEL QUEL à chaque `MemberRow` (jamais ré-enveloppé dans une closure inline — même piège).
5. Relance : le compteur doit tomber à 1 rendu par ligne, quel que soit le nombre de frappes.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:06
npm run solution:06
```

**Ce que l'oracle vérifie**

Comportement de base : la liste s'affiche, le filtre par email fonctionne. Mesure de
re-render : après 5 frappes qui ne changent pas la liste visible, chaque `MemberRow` doit
s'être rendu **exactement une fois** (le rendu initial), pas une fois par frappe — mesuré via
un compteur réel, pas supposé. Un membre qui sort puis revient dans le filtre continue de
s'afficher correctement (le `memo()` ne casse pas l'affichage, seulement les rendus inutiles).

## Variante J+30 (fading)

Le produit ajoute un badge "en ligne maintenant" sur `MemberRow`, dérivé d'un `Set<string>`
d'ids connectés recalculé toutes les 5 secondes côté parent. Ce `Set` casse-t-il la
mémoïsation même quand le membre affiché, lui, n'a pas changé de statut ? Comment le
corriger sans perdre la fraîcheur de l'info ?

## Application TribuZen

Même diagnostic sur `tribuzen-admin`, avec React DevTools Profiler en vrai (cours 31) pour
confirmer visuellement ce que ce lab mesure par le code. Commit :
`perf(members): memo + useCallback, re-renders mesurés 6→1 par frappe sur la recherche`.
