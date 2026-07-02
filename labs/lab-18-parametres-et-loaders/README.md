# Lab 18 — Paramètres de route et loaders

> **Outcome :** à la fin, tu sais câbler une route de détail `/familles/:id` avec un **loader** React Router v7, filtrer une liste via la **query string** (`?statut=active`), et gérer une famille introuvable avec un **errorElement**.
> **Vrai outil :** React 19 + React Router v7 (`react-router-dom@^7`) sur un projet Vite, testé en direct dans le navigateur (HMR).
> **Feedback :** le coach valide visuellement en session (navigation + URL + cas d'erreur). Pas de test-runner auto-correcteur.

---

## Énoncé

Tu montes la section **Familles** de l'admin TribuZen. Cahier des charges **exact** :

1. **`/familles`** — liste des familles, avec un `<select>` de filtre `statut` (`toutes` | `active` | `pending`) **persisté dans la query string** (`/familles?statut=active`). Le loader lit la query string et renvoie la liste filtrée.
2. **`/familles/:id`** — fiche d'une famille chargée par un **loader** (pas de `useEffect`). Le composant est du rendu pur via `useLoaderData`.
3. **`errorElement`** — si l'`id` n'existe pas, le loader `throw new Response(..., { status: 404 })` et un composant `FamilyError` affiche « Famille introuvable » + lien retour.
4. **Deep-link** — coller `/familles/999` (id inexistant) dans le navigateur doit afficher l'erreur, pas un écran blanc.

**Données de départ (fausse API en mémoire, à copier dans `api/families.ts`) :**

```ts
export interface Family {
  id: string;
  nom: string;
  statut: 'active' | 'pending';
  membres: { id: string; nom: string }[];
}

const DB: Family[] = [
  { id: '1', nom: 'Les Dupont', statut: 'active', membres: [{ id: 'a', nom: 'Alice' }, { id: 'b', nom: 'Bruno' }] },
  { id: '2', nom: 'Les Martin', statut: 'pending', membres: [{ id: 'c', nom: 'Chloé' }] },
  { id: '3', nom: 'Les Nguyen', statut: 'active', membres: [{ id: 'd', nom: 'Dan' }] },
];

// Simule un fetch réseau avec latence
export function fetchFamilies(statut: string): Promise<Family[]> {
  const list = statut === 'toutes' ? DB : DB.filter((f) => f.statut === statut);
  return new Promise((resolve) => setTimeout(() => resolve(list), 200));
}

export function fetchFamily(id: string): Promise<Family | undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(DB.find((f) => f.id === id)), 200));
}
```

**Contraintes :**
- **Aucun `useEffect`** pour charger les données — tout passe par les loaders.
- Le filtre `statut` vit **dans l'URL** (query string), pas dans un `useState`.
- Le loader de détail **`throw`** une `Response` 404 quand la famille n'existe pas (il ne `return` pas d'objet d'erreur).
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

```
pnpm create vite@latest tribuzen-lab-18 --template react-ts
cd tribuzen-lab-18
pnpm add react-router-dom
```

```
src/
  api/
    families.ts        ← copier les données de départ ci-dessus
  routes/
    familyList.tsx     ← à écrire : FamilyList + familyListLoader
    family.tsx         ← à écrire : FamilyPage + FamilyError + familyLoader
  router.tsx           ← à écrire : createBrowserRouter
  App.tsx              ← <RouterProvider router={router} />
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **`api/families.ts`** — colle les données de départ. Vérifie qu'elles compilent.
2. **`routes/familyList.tsx`** — écris `familyListLoader({ request })` : lis `?statut=` via `new URL(request.url)`, appelle `fetchFamilies`, renvoie la liste. Écris `FamilyList` : `useLoaderData` pour la liste, `useSearchParams` pour le `<select>`. Chaque famille est un `<Link to={/familles/${f.id}}>`.
3. **`routes/family.tsx`** — écris `familyLoader({ params })` : `fetchFamily(params.id)`, `throw new Response('Famille introuvable', { status: 404 })` si `undefined`. Écris `FamilyPage` (rendu pur) et `FamilyError` (`useRouteError` + `isRouteErrorResponse`).
4. **`router.tsx`** — `createBrowserRouter` avec un layout racine (`<Outlet />`), la route liste, et la route `familles/:id` portant `loader` + `errorElement`.
5. **`App.tsx`** — branche `<RouterProvider router={router} />`.
6. **Vérifie les cas** : change le filtre → l'URL passe à `?statut=active` **et** la liste se refiltre ; recharge la page (F5) → le filtre tient ; clique une famille → fiche chargée ; va sur `/familles/999` → « Famille introuvable ».

---

## Corrigé complet commenté

```tsx
// ─── src/api/families.ts ─────────────────────────────────────────
export interface Family {
  id: string;
  nom: string;
  statut: 'active' | 'pending';
  membres: { id: string; nom: string }[];
}

const DB: Family[] = [
  { id: '1', nom: 'Les Dupont', statut: 'active', membres: [{ id: 'a', nom: 'Alice' }, { id: 'b', nom: 'Bruno' }] },
  { id: '2', nom: 'Les Martin', statut: 'pending', membres: [{ id: 'c', nom: 'Chloé' }] },
  { id: '3', nom: 'Les Nguyen', statut: 'active', membres: [{ id: 'd', nom: 'Dan' }] },
];

export function fetchFamilies(statut: string): Promise<Family[]> {
  const list = statut === 'toutes' ? DB : DB.filter((f) => f.statut === statut);
  return new Promise((resolve) => setTimeout(() => resolve(list), 200));
}

export function fetchFamily(id: string): Promise<Family | undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(DB.find((f) => f.id === id)), 200));
}

// ─── src/routes/familyList.tsx ───────────────────────────────────
import {
  useLoaderData,
  useSearchParams,
  Link,
  type LoaderFunctionArgs,
} from 'react-router-dom';
import { fetchFamilies, type Family } from '../api/families';

// Loader : lit la query string via request.url (PAS useSearchParams — on est hors composant)
export async function familyListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const statut = url.searchParams.get('statut') ?? 'toutes';
  return fetchFamilies(statut); // devient la valeur de useLoaderData()
}

export function FamilyList() {
  const familles = useLoaderData() as Family[];
  const [searchParams, setSearchParams] = useSearchParams();
  const statut = searchParams.get('statut') ?? 'toutes';

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Familles</h1>

      <label>
        Filtrer :{' '}
        <select
          value={statut}
          // setSearchParams change l'URL → React Router relance familyListLoader
          onChange={(e) => setSearchParams({ statut: e.target.value })}
        >
          <option value="toutes">Toutes</option>
          <option value="active">Actives</option>
          <option value="pending">En attente</option>
        </select>
      </label>

      <ul>
        {familles.map((f) => (
          <li key={f.id}>
            <Link to={`/familles/${f.id}`}>{f.nom}</Link> — {f.statut}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── src/routes/family.tsx ───────────────────────────────────────
import {
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  Link,
  type LoaderFunctionArgs,
} from 'react-router-dom';
import { fetchFamily, type Family } from '../api/families';

// Loader de détail : params typé par React Router
export async function familyLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response('Identifiant manquant', { status: 400 });

  const family = await fetchFamily(id);
  // throw (pas return) → route vers l'errorElement de la route
  if (!family) throw new Response('Famille introuvable', { status: 404 });

  return family;
}

export function FamilyPage() {
  // Données déjà prêtes : aucun état loading/error ici
  const family = useLoaderData() as Family;

  return (
    <article style={{ padding: '1rem' }}>
      <h1>{family.nom}</h1>
      <p>Statut : {family.statut}</p>
      <h2>Membres</h2>
      <ul>
        {family.membres.map((m) => (
          <li key={m.id}>{m.nom}</li>
        ))}
      </ul>
      <Link to="/familles">Retour à la liste</Link>
    </article>
  );
}

// errorElement dédié : capte le throw du loader
export function FamilyError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div role="alert" style={{ padding: '1rem' }}>
        <h2>Famille introuvable</h2>
        <p>Cette famille n'existe pas ou a été supprimée.</p>
        <Link to="/familles">Retour à la liste</Link>
      </div>
    );
  }

  return (
    <div role="alert" style={{ padding: '1rem' }}>
      <h2>Erreur de chargement</h2>
      <Link to="/familles">Retour à la liste</Link>
    </div>
  );
}

// ─── src/router.tsx ──────────────────────────────────────────────
import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { FamilyList, familyListLoader } from './routes/familyList';
import { FamilyPage, FamilyError, familyLoader } from './routes/family';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      // Redirige la racine vers /familles pour l'ergonomie
      { index: true, element: <Navigate to="/familles" replace /> },
      {
        path: 'familles',
        element: <FamilyList />,
        loader: familyListLoader,
      },
      {
        path: 'familles/:id',
        element: <FamilyPage />,
        loader: familyLoader,
        errorElement: <FamilyError />, // ← isole l'erreur sur la fiche
      },
    ],
  },
]);

// ─── src/App.tsx ─────────────────────────────────────────────────
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- **Zéro `useEffect`** : les deux loaders portent tout le chargement, y compris au premier hit d'URL (deep-link `/familles/1` marche directement).
- Le **filtre vit dans l'URL** : `setSearchParams({ statut })` change l'URL, ce qui relance `familyListLoader` (React Router revalide sur changement de query string). L'état est donc partageable et survit à F5.
- Le loader de détail **`throw`** une `Response` 404 (il ne `return` pas un objet d'erreur) — c'est ce throw qui route vers `FamilyError` via l'`errorElement` de la route.
- `FamilyError` **discrimine** l'erreur avec `isRouteErrorResponse` avant de lire `error.status`, sans quoi TypeScript refuserait l'accès (type `unknown`).
- L'`errorElement` est posé **sur la route `familles/:id`** : une erreur de fiche n'écrase pas le reste de l'app, seulement la zone de la fiche.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module 18 :**

1. Ajoute un second filtre **`q`** (recherche par nom) dans la query string, combiné à `statut` : l'URL cible est `/familles?statut=active&q=dup`. Le loader lit les deux, le composant garde les deux `<select>`/`<input>` synchronisés.
2. **Contrainte clé** : quand tu changes un filtre, l'autre **doit être préservé** dans l'URL (utilise la forme `setSearchParams(prev => …)`, pas l'objet qui écrase).
3. Ajoute une route d'édition `/familles/:id/edit` avec une **action** + `<Form method="post">` qui renomme la famille, puis `redirect(/familles/:id)`. Après soumission, la fiche doit refléter le nouveau nom **sans refetch manuel** (revalidation auto).

**Critère de réussite :** filtrer par statut puis taper une recherche conserve les deux params dans l'URL ; l'édition d'un nom se reflète immédiatement sur la fiche après redirection.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, la section Familles vit ici :

```
tribuzen/src/
  types/
    family.ts            ← Family partagé (import depuis routes/ et api/)
  api/
    families.ts          ← vrais appels fetch vers l'API (remplace le DB en mémoire)
  routes/
    familyList.tsx       ← FamilyList + familyListLoader (filtre query string)
    family.tsx           ← FamilyPage + FamilyError (errorElement 404)
    familyEdit.tsx       ← action + Form (mutation) — voir variante J+30
  router.tsx             ← arbre de routes (loaders/actions/errorElement branchés)
```

**Différences par rapport au lab :**
- Le `DB` en mémoire est remplacé par de vrais `fetch('/api/familles…')` — le loader `throw new Response` relaie directement le `status` HTTP renvoyé par le backend (404, 403…).
- Le filtre query string alimente aussi la **pagination** (`?statut=active&page=2`) et sert de source de vérité partageable entre opérateurs.
- L'`errorElement` racine (`router.tsx`) sert de fallback global ; l'`errorElement` sur `familles/:id` reste dédié au cas « famille introuvable ».

**Commit cible :**
```
feat(familles): loader /familles/:id + errorElement famille introuvable
feat(familles): filtre statut persisté en query string sur /familles
```
