# Lab 02 — Zéro : état client (Zustand) + état serveur (TanStack Query) sur une vraie feature

> **Outcome :** à la fin, tu sais séparer clairement **état client** (un filtre d'onglet —
> Zustand, jamais un aller-retour réseau) et **état serveur** (la liste des posts — TanStack
> Query, avec un vrai cache et une vraie invalidation après mutation).
> **Vrai outil :** React 19 + `zustand` + `@tanstack/react-query` v5 + MSW. Le cache n'est
> pas simulé : le test compte les VRAIES requêtes réseau interceptées pour prouver qu'un
> changement de filtre n'en déclenche aucune, et qu'un remount ne re-fetch pas des données
> fraîches.
> **Feedback :** `npm run lab:02` — RED tant que `src/PostsFeed.tsx` ne satisfait pas
> l'énoncé. `npm run solution:02` prouve l'oracle.

## Prérequis technique

`npm install` depuis `04-react/labs` (zustand et `@tanstack/react-query` sont déjà dans les
devDependencies du dossier). Aucun backend réel : `api.ts` fait de vrais `fetch`, MSW les
intercepte dans les tests.

## Lire avant (une lecture bornée)

- Module [`15-zustand.md`](../../modules/15-zustand.md) — un store Zustand est un état
  **client**, pas une couche de cache réseau : pas de `fetch` dedans.
- Module [`23-tanstack-query.md`](../../modules/23-tanstack-query.md) — `useQuery`,
  `queryKey`, `useMutation` + `invalidateQueries`, pourquoi ça remplace
  `useEffect`+`fetch`+state manuel.

## Énoncé

Lis les commentaires en tête de `src/PostsFeed.tsx`. Le composant `PostsFeed` affiche les
posts d'une famille avec un onglet "Tous"/"Épinglés" (Zustand — état 100 % client) et permet
d'épingler/désépingler un post (TanStack Query — `useMutation` + invalidation de la query
`["posts", familyId]`). `api.ts` est DONNÉ, tu ne le modifies pas.

**Le piège à éviter.** Un filtre "Épinglés" naïf qui refait un `fetch` avec un paramètre de
requête différent marche, mais rate tout l'intérêt du cache : les données sont déjà là,
côté client, il suffit de les filtrer en mémoire. Le test le vérifie littéralement : le
compteur d'appels réseau ne doit **pas bouger** quand tu changes d'onglet.

## Étapes (en friction)

1. `npm run lab:02` : RED, `useFilterStore` n'est pas un vrai store Zustand.
2. Écris le store Zustand (`filter`, `setFilter`), câble `useQuery` pour charger les posts,
   affiche la liste et les deux boutons d'onglet — filtre en mémoire, pas de nouvel appel.
3. Ajoute `useMutation` pour `togglePin`, avec `onSuccess` qui invalide la query — relance et
   vérifie que le test "mutation + invalidation" passe, y compris quand l'onglet actif est
   "Épinglés".
4. Le dernier test (remount sans re-fetch) valide que ton `staleTime` par défaut du
   `QueryClient` de test suffit — tu n'as rien à faire de spécial dans le composant pour
   celui-là, c'est TanStack Query qui le fait pour toi SI tu utilises bien `useQuery`.

## Vérifier

```bash
cd 04-react/labs
npm install
npm run lab:02
npm run solution:02
```

**Ce que l'oracle vérifie**

Les posts se chargent et s'affichent (1 seul appel GET) ; basculer sur l'onglet "Épinglés"
filtre la liste affichée SANS appel réseau supplémentaire (compteur GET inchangé) ; épingler
un post appelle l'API (PATCH), invalide le cache, et le post apparaît bien dans l'onglet
"Épinglés" ensuite (preuve que l'invalidation a vraiment rafraîchi les données, pas juste mis
à jour un état local isolé) ; démonter puis remonter le composant avec le MÊME `QueryClient`
ne déclenche pas de nouvel appel réseau tant que les données sont fraîches (cache réellement
réutilisé).

## Variante J+30 (fading)

Le produit veut un troisième onglet "Récents" (posts des dernières 24h). Ce filtre doit-il
rester client (comme "Épinglés") ou justifie-t-il un nouveau paramètre de requête serveur ?
Justifie ta réponse par la taille réaliste des données en jeu.

## Application TribuZen

Même pattern sur `tribuzen-api` : filtre d'onglet client + mutation avec invalidation, sur
le fil des posts d'une vraie famille. Commit :
`feat(posts): filtre client Zustand + cache TanStack Query, invalidation sur mutation`.
