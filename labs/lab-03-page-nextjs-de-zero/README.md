# Lab 03 — Zéro : page App Router, Server Component + Route Handler devant l'API NestJS

> **Outcome :** à la fin, tu sais écrire une page App Router qui charge ses données côté
> **serveur** sans `useEffect`, isoler l'unique bout interactif dans un Client Component, et
> construire un **Route Handler** qui joue le rôle de BFF (backend-for-frontend) devant une
> vraie API NestJS — sans jamais avaler ses erreurs.
> **Vrai outil :** Next.js 15 (App Router) — les conventions de fichiers (`page.tsx`,
> `route.ts`), sans avoir besoin d'un serveur Next réel pour les tests : un Server Component
> est juste une fonction async, un Route Handler juste une fonction qui reçoit un `Request`
> Web standard et renvoie un `Response`. MSW intercepte les vrais appels vers NestJS.
> **Feedback :** `npm run lab:03` — RED tant que `src/page.tsx` et `src/route.ts` ne
> satisfont pas l'énoncé. `npm run solution:03` prouve l'oracle.

## Prérequis technique

`npm install` depuis `04-react/labs`. Aucun serveur NestJS réel : `NESTJS_API_URL` pointe
vers une URL de test, MSW y intercepte les requêtes.

## Lire avant (une lecture bornée)

- Module [`25-server-components.md`](../../modules/25-server-components.md) — ce qu'un
  Server Component peut faire (fetch direct, pas de `useState`/`useEffect`) et pourquoi
  isoler la frontière `"use client"` au plus bas.
- Module [`27-api-routes-et-server-actions.md`](../../modules/27-api-routes-et-server-actions.md)
  — Route Handlers, `Request`/`Response` Web, `params` en `Promise` depuis Next 15.

## Énoncé

Deux fichiers à écrire, lis leurs commentaires en tête :

- `src/page.tsx` — la page `/families/[id]` : Server Component qui charge la famille
  **directement** depuis NestJS (`GET ${NESTJS_API_URL}/families/:id`), affiche son nom, son
  nombre de membres, et `<MarquerLuButton familyId={id} />` (composant CLIENT **donné** dans
  `MarquerLuButton.tsx`, à ne pas modifier). Une famille absente (404) affiche un message
  clair, pas une erreur qui plante la page.
- `src/route.ts` — le Route Handler `POST /api/families/[id]/ack`, appelé par le bouton
  client (jamais NestJS directement depuis le navigateur). Il relaie vers NestJS et renvoie
  **exactement** le statut et le corps que NestJS a renvoyés.

**Le piège à éviter.** Un Route Handler qui catch toute erreur et renvoie toujours `200` en
cas de problème "pour ne pas casser le front" transforme un vrai 401 (session expirée) en
faux succès — le bouton affichera "Marqué comme lu" alors que rien n'a été fait côté serveur.
Le test le vérifie explicitement : un 401 NestJS doit ressortir en 401, pas en 200.

## Étapes (en friction)

1. `npm run lab:03` : RED, les deux fichiers lèvent une erreur explicite.
2. Écris `page.tsx` : `await params`, fetch direct vers NestJS, gère le cas 404 en premier
   (retour anticipé), rends le reste normalement.
3. Écris `route.ts` : `await params`, relaie vers NestJS avec la bonne méthode, relaie le
   statut ET le corps sans réinterprétation.
4. Relance : les 4 tests (page trouvée, page absente, relais succès, relais erreur)
   s'allument.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:03
npm run solution:03
```

**Ce que l'oracle vérifie**

`page.tsx` est appelée directement comme une fonction async (`await FamillePage({ params
})`) — pas besoin d'un serveur Next réel — et l'élément React obtenu est rendu avec RTL : nom
en `<h1>`, nombre de membres, bouton client présent quand la famille existe ; message clair
et aucun bouton quand elle n'existe pas (404). `route.ts` est appelé directement avec un vrai
`Request` : un succès NestJS (200) est relayé tel quel, statut ET corps ; une erreur NestJS
(401) ressort en 401, jamais transformée en faux succès.

## Variante J+30 (fading)

Le produit ajoute un rate-limit côté NestJS (429 sur trop de "ack" rapprochés). Le Route
Handler doit-il traiter ce cas différemment d'un 401, côté `MarquerLuButton` ? Qu'est-ce que
l'utilisateur doit voir dans chaque cas ?

## Application TribuZen

Même pattern sur `tribuzen-admin` (Next.js) devant `tribuzen-api` (NestJS, cours 09) : pages
en Server Components pour l'affichage, Route Handlers en BFF pour les actions déclenchées
côté client. Commit :
`feat(families): page App Router SSR + Route Handler BFF, statuts NestJS relayés tels quels`.
