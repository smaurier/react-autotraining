# Lab 07 — Intervention : migrer une page client existante vers un Server Component

> **Outcome :** à la fin, tu sais reconnaître qu'une page n'a pas besoin de tout son JS
> client, la migrer en Server Component, et isoler le SEUL bout réellement interactif dans
> un Client Component séparé — sans rien casser de l'interactivité qui, elle, a une vraie
> raison d'être côté client.
> **Vrai outil :** React 19 + Next.js 15. La preuve est structurelle, pas stylistique :
> `FamilySummaryPage` est appelée DIRECTEMENT comme une fonction (ce que Next.js fait pour un
> Server Component) — tant qu'elle contient `useState`/`useEffect`, cet appel plante avec une
> vraie erreur "Invalid hook call", pas une supposition.
> **Feedback :** `npm run lab:07` — RED : l'appel plante sur les hooks. `npm run solution:07`
> prouve l'oracle.

## Prérequis technique

`npm install` depuis `04-react/labs`.

## Lire avant (une lecture bornée)

- Module [`25-server-components.md`](../../modules/25-server-components.md) — un Server
  Component ne PEUT PAS avoir de hooks : ce n'est pas une convention, React lève une erreur
  s'il essaie d'en appeler un, parce qu'il n'y a pas de "rendu" React côté client à
  suspendre/re-déclencher pour lui.
- Module [`26-data-fetching.md`](../../modules/26-data-fetching.md) — fetch direct côté
  serveur vs `useEffect`+`fetch` côté client : ce que ça change pour l'utilisateur (pas
  d'écran de chargement, moins de JS envoyé).

## Énoncé

`src/FamilySummaryPage.tsx` est **en production**, en `"use client"`, avec
`useEffect`+`useState` pour charger le nom de la famille et un compteur "en ligne". Ticket :
*« cette page n'a quasiment aucune interactivité qui justifie tout ce JS client — migre-la
en Server Component, ne garde en client que ce qui en a vraiment besoin. »*

`LiveOnlineCount.tsx` est **donné** : c'est le SEUL bout légitimement interactif (un bouton
"Actualiser" qui refait un appel à la demande). Après ta migration, c'est le seul `"use
client"` qui doit rester dans l'arbre.

**Le piège à éviter.** Retirer `"use client"` sans retirer `useState`/`useEffect` ne "marche"
même pas : React refuse d'appeler un hook hors d'un rendu client actif, et lève une vraie
erreur au premier appel. Ce n'est pas une préférence stylistique de l'équipe — c'est
structurellement impossible de garder les deux.

## Étapes (en friction)

1. `npm run lab:07` : RED — l'appel plante sur `useEffect`.
2. Retire `"use client"`, `useEffect`, `useState` de `FamilySummaryPage`. Rends la fonction
   `async`, `await` `params`, fetch DIRECT (pas de useEffect).
3. Retire l'écran "Chargement…" — un Server Component n'a pas d'état de chargement à gérer
   lui-même, il ne se rend qu'une fois les données là.
4. Relance : les 3 tests (rendu direct, bouton "Actualiser" toujours fonctionnel, plus de
   hooks côté serveur) doivent passer.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:07
npm run solution:07
```

**Ce que l'oracle vérifie**

`FamilySummaryPage` s'appelle directement comme une fonction async et se rend sans écran de
chargement ; le bouton "Actualiser" de `LiveOnlineCount` (le composant client isolé)
fonctionne toujours après la migration ; relecture du code source : plus de `"use client"`,
plus de `useState`/`useEffect` dans ce fichier.

## Variante J+30 (fading)

Le produit ajoute un graphique d'activité de la famille sur les 7 derniers jours,
recalculé côté serveur mais avec un sélecteur de plage de dates interactif. Comment
découper ça entre Server et Client Components ?

## Application TribuZen

Même migration sur une vraie page de `tribuzen-admin`, avec mesure du JS envoyé au
navigateur avant/après (`next build` + analyse du bundle, cours 40). Commit :
`refactor(families): page migrée en Server Component, seul le compteur reste côté client`.
