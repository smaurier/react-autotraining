---
titre: Paramètres de route et loaders
cours: 04-react
notions: [paramètres dynamiques de route, useParams typé, loaders du data router, useLoaderData, actions et Form, useSearchParams, gestion d'erreurs par route avec errorElement, useRouteError et isRouteErrorResponse, defer et Await en survol]
outcomes: [charger les données d'une route via un loader avant le rendu, lire des paramètres de route typés avec useParams, persister des filtres dans la query string avec useSearchParams, gérer une erreur de chargement par route avec errorElement]
prerequis: [17-react-router-basique]
next: 19-protection-et-lazy
libs: [{ name: react, version: "^19" }, { name: react-router-dom, version: "^7" }]
tribuzen: page admin web /familles/:id qui charge la famille via loader, filtres persistés en query string (?statut=active), errorElement sur famille introuvable
last-reviewed: 2026-07
---

# Paramètres de route et loaders

> **Outcomes — tu sauras FAIRE :** charger les données d'une route via un loader avant le rendu, lire des paramètres de route typés avec `useParams`, persister des filtres dans la query string avec `useSearchParams`, gérer une erreur de chargement par route avec `errorElement`.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, la fiche d'une famille est servie sur `/familles/:id`. Un collègue a écrit cette version, qui charge la famille dans le composant :

```tsx
// FamilyPage.tsx — AVANT loader
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function FamilyPage() {
  const { id } = useParams();               // id: string | undefined
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/familles/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('introuvable');
        return r.json();
      })
      .then(setFamily)
      .catch(() => setError('Famille introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <p>{error}</p>;
  return <h1>{family!.nom}</h1>;
}
```

**Quatre problèmes immédiats :**
1. **Waterfall de rendu** — le composant monte, affiche un spinner, *puis* fetch. L'utilisateur voit toujours un flash de chargement même quand le réseau est rapide.
2. **Trois états manuels** (`loading`, `error`, `family`) recopiés dans chaque page de détail.
3. **`id` non typé** — `useParams()` renvoie `string | undefined`, et le `family!` force un non-null risqué.
4. **Gestion d'erreur locale** — chaque page réinvente son bloc `error`, au lieu d'un traitement d'erreur centralisé par route.

React Router v7 (data router) résout les quatre d'un coup : le **loader** charge les données *avant* le rendu, `useLoaderData` les livre déjà prêtes, et `errorElement` capte les erreurs. Ce module te donne ces outils.

---

## 2. Théorie complète, concise

> **Package & imports.** Ce cours suppose un data router (`createBrowserRouter` + `RouterProvider`, vu au module 17). En v7, tout s'importe depuis `react-router-dom` (qui ré-exporte `react-router`). Les loaders, actions et `errorElement` **ne fonctionnent que** dans un data router — pas avec l'ancien `<BrowserRouter>` à base de `<Routes>`.

### 2.1 Paramètres dynamiques de route

Un segment préfixé par `:` est un paramètre capturé depuis l'URL :

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'familles', element: <FamilyList /> },
      { path: 'familles/:id', element: <FamilyPage /> },
      { path: 'familles/:familyId/membres/:memberId', element: <MemberPage /> },
    ],
  },
]);
```

`familles/:id` matche `/familles/42`, `/familles/abc`… La valeur est toujours une **chaîne**.

### 2.2 `useParams` typé

`useParams` lit les paramètres de la route courante. Le paramètre de type décrit les clés attendues :

```tsx
import { useParams } from 'react-router-dom';

function FamilyPage() {
  // Chaque valeur est string | undefined — jamais un number
  const { id } = useParams<{ id: string }>();

  // Un paramètre déclaré dans le path peut quand même être undefined
  // au typage : valide toujours avant usage.
  if (!id) return <p>Identifiant manquant</p>;

  return <h1>Famille {id}</h1>;
}
```

Points de vigilance :
- Les valeurs sont **toujours** des `string`. Pour un identifiant numérique, `Number(id)` puis vérifier `Number.isNaN`.
- Le typage `useParams<{ id: string }>()` rend chaque clé `string | undefined` (React Router ne peut pas garantir la présence à la compilation).
- Depuis un loader, on lira plutôt `params.id` (voir 2.3) — `useParams` sert surtout aux composants sans loader.

### 2.3 Loaders — charger avant le rendu

Un **loader** est une fonction async attachée à une route. React Router l'exécute *pendant la navigation*, avant de monter l'élément. Le composant ne monte qu'une fois les données prêtes :

```tsx
import { type LoaderFunctionArgs } from 'react-router-dom';

// params est typé par React Router : { id?: string }
async function familyLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/familles/${params.id}`);
  if (!res.ok) {
    // Lancer une Response déclenche l'errorElement de la route (voir 2.6)
    throw new Response('Famille introuvable', { status: res.status });
  }
  return res.json(); // devient la valeur de useLoaderData()
}

const router = createBrowserRouter([
  {
    path: 'familles/:id',
    element: <FamilyPage />,
    loader: familyLoader,          // ← attaché à la route
    errorElement: <FamilyError />, // ← capte les throw du loader
  },
]);
```

Ce que le loader change :
- **Pas de flash de chargement dans le composant** — React Router affiche l'ancienne page jusqu'à résolution (état `navigation.state === 'loading'`, exploitable pour une barre de progression globale).
- **Pas d'état `loading`/`error` manuel** — c'est le framework qui les porte.
- Le loader s'exécute aussi au **premier chargement** de l'URL (SSR-friendly, deep-link direct).

### 2.4 `useLoaderData`

Dans le composant de la route, `useLoaderData` renvoie ce que le loader a retourné :

```tsx
import { useLoaderData } from 'react-router-dom';

function FamilyPage() {
  // Typage explicite : useLoaderData n'infère pas seul le type du loader
  const family = useLoaderData() as Family;

  // Aucune vérification loading/error ici : si on est monté, family existe
  return (
    <article>
      <h1>{family.nom}</h1>
      <p>{family.membres.length} membre(s)</p>
    </article>
  );
}
```

Le composant est réduit à du rendu pur — les 20 lignes d'état du cas concret disparaissent. Pour un typage sans cast, la doc v7 propose des helpers générés (`LoaderFunction` + inférence via `typeof`), hors périmètre ici ; le cast `as Family` est acceptable et courant.

### 2.5 `useSearchParams` — filtres en query string

Les **search params** (`?statut=active&page=2`) portent l'état de filtrage/pagination **dans l'URL**. Avantage : l'état devient partageable, bookmarkable, et survit au rechargement (F5).

```tsx
import { useSearchParams } from 'react-router-dom';

function FamilyList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lecture — get renvoie string | null
  const statut = searchParams.get('statut') ?? 'toutes';
  const page = Number(searchParams.get('page') ?? '1');

  // Écriture qui REMPLACE tous les params
  const filtrer = (nouveauStatut: string) => {
    setSearchParams({ statut: nouveauStatut, page: '1' });
  };

  // Écriture qui PRÉSERVE les params existants (forme fonction)
  const changerPage = (n: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(n));
      return prev;
    });
  };

  return (
    <div>
      <select value={statut} onChange={(e) => filtrer(e.target.value)}>
        <option value="toutes">Toutes</option>
        <option value="active">Actives</option>
        <option value="pending">En attente</option>
      </select>
      <button onClick={() => changerPage(page + 1)}>Page suivante</button>
    </div>
  );
}
```

Un loader peut **lire ces mêmes params** via `request.url` et renvoyer une liste déjà filtrée côté serveur :

```tsx
async function familyListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const statut = url.searchParams.get('statut') ?? 'toutes';
  const res = await fetch(`/api/familles?statut=${statut}`);
  return res.json();
}
```

Comme l'URL change à chaque filtre, React Router **relance le loader** automatiquement — la liste se rafraîchit sans code de synchronisation manuel.

### 2.6 Gestion d'erreurs par route — `errorElement` + `useRouteError`

Quand un loader (ou une action, ou le rendu) `throw`, React Router remonte l'erreur jusqu'à l'`errorElement` le plus proche dans l'arbre de routes :

```tsx
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

function FamilyError() {
  const error = useRouteError();

  // isRouteErrorResponse : true si l'erreur vient d'un throw new Response(...)
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div role="alert">
        <h2>Famille introuvable</h2>
        <p>Cette famille n'existe pas ou a été supprimée.</p>
        <Link to="/familles">Retour à la liste</Link>
      </div>
    );
  }

  // Fallback pour toute autre erreur (500, erreur JS de rendu…)
  return (
    <div role="alert">
      <h2>Erreur de chargement</h2>
      <Link to="/familles">Retour à la liste</Link>
    </div>
  );
}
```

- `throw new Response('...', { status })` dans un loader = façon idiomatique de signaler « ressource absente / interdite ».
- `isRouteErrorResponse(error)` discrimine une `Response` lancée d'une erreur JS quelconque (typage `error: unknown`).
- Un `errorElement` sur la route racine sert de **fallback global** ; un `errorElement` par route offre un message contextuel.

### 2.7 Actions + `Form` (mutations)

Là où le loader **lit**, l'**action** **écrit**. Une action est attachée à une route et déclenchée par la soumission d'un `<Form>` de React Router (pas le `<form>` HTML natif) :

```tsx
import { Form, redirect, type ActionFunctionArgs } from 'react-router-dom';

// Déclenchée par <Form method="post"> sur cette route
async function familyAction({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const nom = formData.get('nom');

  await fetch(`/api/familles/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ nom }),
    headers: { 'Content-Type': 'application/json' },
  });

  // redirect() renvoie une Response de redirection ; le loader se relance
  return redirect(`/familles/${params.id}`);
}

function FamilyEdit() {
  const family = useLoaderData() as Family;
  return (
    <Form method="post">
      <input name="nom" defaultValue={family.nom} />
      <button type="submit">Enregistrer</button>
    </Form>
  );
}

// Route : loader + action sur le même chemin
{ path: 'familles/:id/edit', element: <FamilyEdit />, loader: familyLoader, action: familyAction }
```

Après l'action, React Router **revalide automatiquement** les loaders de la page — pas besoin de re-fetch manuel. Pour lire ce que l'action a retourné (erreurs de validation, par ex.), on utilise `useActionData`.

### 2.8 `defer` / `Await` en survol

Quand une partie des données est lente, on peut **streamer** : renvoyer la donnée rapide tout de suite et la lente sous forme de promesse, résolue côté rendu.

```tsx
import { Await } from 'react-router-dom';
import { Suspense } from 'react';

// En v7, le loader renvoie directement des promesses non attendues
async function familyLoader({ params }: LoaderFunctionArgs) {
  const family = await fetchFamily(params.id);   // rapide, attendu
  const statsPromise = fetchStats(params.id);    // lent, NON attendu
  return { family, statsPromise };
}

function FamilyPage() {
  const { family, statsPromise } = useLoaderData() as {
    family: Family;
    statsPromise: Promise<Stats>;
  };

  return (
    <>
      <h1>{family.nom}</h1>
      <Suspense fallback={<p>Chargement des stats…</p>}>
        <Await resolve={statsPromise}>
          {(stats: Stats) => <p>{stats.evenements} événements</p>}
        </Await>
      </Suspense>
    </>
  );
}
```

> **À jour v7 :** l'utilitaire `defer()` de la v6 est **déprécié** — en v7 on renvoie directement les promesses dans l'objet du loader, `<Await>` + `<Suspense>` s'occupent du reste. À reconnaître en lecture ; usage réservé aux vraies données lentes.

### 2.9 Loader vs `useQuery` (TanStack Query)

| Critère | Loader (React Router) | `useQuery` (TanStack Query) |
|---|---|---|
| Moment du fetch | Avant le rendu (bloque la nav) | Après le montage |
| État loading/error | Porté par le router | Porté dans le composant |
| Cache | Aucun natif | Cache + invalidation |
| Refetch focus / stale | Non | Oui |
| Deep-link / SSR | Naturel | À câbler |

Les deux se combinent en pratique : le loader fournit les données initiales, `useQuery` gère cache et mises à jour. Module dédié plus loin dans le cours.

---

## 3. Worked examples

### Exemple 1 — Réécrire `FamilyPage` du cas concret avec loader (TribuZen)

On reprend `/familles/:id` et on remplace les trois états manuels par un loader + `errorElement`.

```tsx
// ─── types/family.ts ─────────────────────────────────────────────
export interface Family {
  id: string;
  nom: string;
  statut: 'active' | 'pending' | 'archived';
  membres: { id: string; nom: string }[];
}

// ─── api/families.ts ─────────────────────────────────────────────
export async function apiGetFamily(id: string): Promise<Response> {
  return fetch(`/api/familles/${id}`);
}

// ─── routes/family.tsx ───────────────────────────────────────────
import {
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  Link,
  type LoaderFunctionArgs,
} from 'react-router-dom';
import type { Family } from '@/types/family';
import { apiGetFamily } from '@/api/families';

// Loader : s'exécute AVANT le rendu, params typé par React Router
export async function familyLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response('Identifiant manquant', { status: 400 });

  const res = await apiGetFamily(id);
  if (!res.ok) {
    // 404 réseau → on relaie le status pour un message précis dans l'errorElement
    throw new Response('Famille introuvable', { status: res.status });
  }
  return res.json() as Promise<Family>;
}

// Composant : rendu pur, données déjà là
export function FamilyPage() {
  const family = useLoaderData() as Family;

  return (
    <article>
      <h1>{family.nom}</h1>
      <p>Statut : {family.statut}</p>
      <ul>
        {family.membres.map((m) => (
          <li key={m.id}>{m.nom}</li>
        ))}
      </ul>
      <Link to="/familles">Retour à la liste</Link>
    </article>
  );
}

// errorElement dédié à cette route
export function FamilyError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div role="alert">
        <h2>Famille introuvable</h2>
        <Link to="/familles">Retour à la liste</Link>
      </div>
    );
  }
  return (
    <div role="alert">
      <h2>Erreur de chargement de la famille</h2>
      <Link to="/familles">Retour à la liste</Link>
    </div>
  );
}

// ─── router.tsx ──────────────────────────────────────────────────
import { createBrowserRouter } from 'react-router-dom';
import { FamilyPage, FamilyError, familyLoader } from '@/routes/family';

export const router = createBrowserRouter([
  {
    path: 'familles/:id',
    element: <FamilyPage />,
    loader: familyLoader,
    errorElement: <FamilyError />,
  },
]);
```

**Ce que la réécriture gagne :**
- `FamilyPage` passe de ~25 lignes (3 états + effet) à du rendu pur.
- Le deep-link `/familles/42` fonctionne directement — le loader tourne au premier chargement.
- L'erreur 404 est traitée **une fois** dans `FamilyError`, réutilisable par d'autres routes de détail.
- `id` est validé dans le loader, pas de `family!` risqué.

### Exemple 2 — Liste filtrée par query string + loader (fading)

Page `/familles` avec un filtre `statut` persisté dans l'URL et un loader qui lit ce filtre.

```tsx
// ─── routes/familyList.tsx ───────────────────────────────────────
import {
  useLoaderData,
  useSearchParams,
  Link,
  type LoaderFunctionArgs,
} from 'react-router-dom';
import type { Family } from '@/types/family';

// Le loader lit la query string via request.url — pas useSearchParams (hors composant)
export async function familyListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const statut = url.searchParams.get('statut') ?? 'toutes';

  const res = await fetch(`/api/familles?statut=${encodeURIComponent(statut)}`);
  if (!res.ok) throw new Response('Erreur serveur', { status: 500 });
  return res.json() as Promise<Family[]>;
}

export function FamilyList() {
  const familles = useLoaderData() as Family[];
  const [searchParams, setSearchParams] = useSearchParams();
  const statut = searchParams.get('statut') ?? 'toutes';

  return (
    <div>
      <label>
        Filtrer :
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
```

**Chaîne complète :** l'utilisateur choisit « Actives » → `setSearchParams({ statut: 'active' })` → l'URL devient `/familles?statut=active` → React Router détecte le changement d'URL → relance `familyListLoader` → `request.url` contient `?statut=active` → nouvelle liste rendue. **Zéro `useEffect`, zéro état de synchro.** Bonus : l'URL `/familles?statut=active` est partageable et survit à F5.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que `useParams` renvoie des nombres

```tsx
// ❌ id est une string, la comparaison échoue silencieusement
const { id } = useParams<{ id: string }>();
const family = familles.find((f) => f.id === id);   // OK si f.id est string
const other = items.find((i) => i.numericId === id); // ✗ number === string → jamais vrai

// ✅ Convertir explicitement quand la donnée est numérique
const numericId = Number(id);
if (Number.isNaN(numericId)) throw new Response('ID invalide', { status: 400 });
const item = items.find((i) => i.numericId === numericId);
```

**Règle :** un param d'URL est **toujours** une `string`. Convertir + valider avant toute comparaison numérique.

### PIÈGE #2 — Mettre le loader dans un `useEffect`

```tsx
// ❌ Contresens : re-créer un fetch dans le composant alors que la route a un loader
function FamilyPage() {
  const initial = useLoaderData() as Family;
  const [family, setFamily] = useState(initial);
  useEffect(() => {
    fetch(`/api/familles/${family.id}`).then(/* ... */); // double fetch inutile
  }, []);
}

// ✅ Le loader EST le fetch. Le composant consomme, il ne recharge pas.
function FamilyPage() {
  const family = useLoaderData() as Family;
  return <h1>{family.nom}</h1>;
}
```

**Signal d'alarme :** un `useEffect(fetch)` dans un composant qui a déjà un loader = données chargées deux fois.

### PIÈGE #3 — `setSearchParams` qui écrase les autres filtres

```tsx
// ❌ Passer un objet REMPLACE toute la query string
setSearchParams({ page: '2' });
// → ?page=2  (le statut=active a disparu !)

// ✅ Forme fonction pour préserver l'existant
setSearchParams((prev) => {
  prev.set('page', '2');
  return prev;
});
// → ?statut=active&page=2
```

**Règle :** l'objet remplace tout ; la forme `(prev) => …` mute une copie et préserve les autres clés.

### PIÈGE #4 — `return` une erreur au lieu de la `throw`

```tsx
// ❌ Retourner l'erreur : elle devient la donnée du composant, errorElement jamais déclenché
async function familyLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/familles/${params.id}`);
  if (!res.ok) return { error: 'introuvable' }; // useLoaderData() = { error } → rendu cassé
  return res.json();
}

// ✅ throw une Response : React Router route vers l'errorElement
async function familyLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/familles/${params.id}`);
  if (!res.ok) throw new Response('Famille introuvable', { status: res.status });
  return res.json();
}
```

**Règle :** dans un loader/action, on **`throw`** pour signaler une erreur (déclenche `errorElement`), on **`return`** pour livrer la donnée.

### PIÈGE #5 — Utiliser `<form>` natif au lieu de `<Form>`

```tsx
// ❌ form HTML natif : rechargement complet de la page, l'action de route est ignorée
<form method="post" action="/familles/1/edit">
  <input name="nom" />
</form>

// ✅ Form de React Router : soumission client, déclenche l'action + revalide les loaders
<Form method="post">
  <input name="nom" />
</Form>
```

**Règle :** pour déclencher une **action** de route, importer `Form` (majuscule) depuis `react-router-dom`. Le `<form>` minuscule provoque une navigation navigateur classique.

---

## 5. Ancrage TribuZen

Dans l'admin web TribuZen, ce module câble toute la section **Familles** :

**`/familles` (liste filtrée)** — `src/routes/familyList.tsx`. Le filtre `statut` (Toutes / Actives / En attente) est persisté en query string `?statut=active`. Un opérateur peut envoyer à un collègue l'URL `admin.tribuzen.app/familles?statut=pending` pour partager exactement sa vue « familles en attente de validation ». Le `familyListLoader` lit `request.url` et renvoie la liste filtrée côté serveur.

**`/familles/:id` (fiche)** — `src/routes/family.tsx`. `familyLoader` charge la famille + ses membres *avant* le rendu, via `params.id`. Le deep-link fonctionne : coller `/familles/42` dans le navigateur affiche directement la fiche.

**`errorElement` (famille introuvable)** — `FamilyError` capte le `throw new Response(..., { status: 404 })` du loader quand l'id n'existe pas (famille supprimée, lien périmé). Message contextuel + retour liste, plutôt qu'un écran blanc.

**`/familles/:id/edit` (mutation)** — `familyAction` + `<Form method="post">` renomment/archivent une famille. Après soumission, React Router revalide `familyLoader` et la fiche se met à jour sans code de refetch.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  types/
    family.ts
  api/
    families.ts
  routes/
    familyList.tsx       # loader liste + filtre query string
    family.tsx           # loader détail + FamilyError (errorElement)
    familyEdit.tsx       # action + Form
  router.tsx             # arbre de routes (loaders/actions/errorElement branchés)
```

---

## 6. Points clés

1. Un segment `:param` capture une portion d'URL ; `useParams<{ id: string }>()` la lit, toujours en `string | undefined`.
2. Un **loader** charge les données d'une route *avant* le rendu — le composant monte déjà peuplé, sans état `loading` manuel.
3. `useLoaderData()` renvoie la valeur du loader (à caster : `as Family`) ; le composant devient du rendu pur.
4. `useSearchParams` lit/écrit la query string ; l'objet remplace tout, la forme `(prev) => …` préserve les autres clés.
5. Un changement de query string **relance automatiquement** le loader — filtres et pagination se rafraîchissent sans `useEffect`.
6. Dans un loader/action : `throw new Response(msg, { status })` déclenche l'`errorElement` ; `return` livre la donnée.
7. `useRouteError` + `isRouteErrorResponse` lisent l'erreur captée par `errorElement` et discriminent une `Response` d'une erreur JS.
8. Les **actions** (via `<Form method="post">`) écrivent ; React Router revalide les loaders après coup — pas de refetch manuel.
9. Pour des données lentes, renvoyer des promesses non attendues + `<Suspense>` / `<Await>` (v7 : `defer()` déprécié).

---

## 7. Seeds Anki

```
Que renvoie useParams pour un segment :id, et de quel type ?|Un objet dont chaque valeur est string | undefined. Un paramètre d'URL est TOUJOURS une chaîne — il faut Number(id) + validation pour un identifiant numérique.
Qu'est-ce qu'un loader dans React Router v7 et quand s'exécute-t-il ?|Une fonction async attachée à une route, exécutée par le router AVANT le montage du composant (pendant la navigation et au premier chargement). Le composant ne monte qu'une fois les données prêtes, sans état loading manuel.
Comment le composant récupère-t-il les données d'un loader ?|Via useLoaderData(), qui renvoie la valeur retournée par le loader. Le type n'est pas inféré automatiquement, on caste : const family = useLoaderData() as Family.
Comment signaler une erreur depuis un loader pour déclencher l'errorElement ?|En faisant throw new Response(message, { status }). Un return livre une donnée normale ; seul un throw route vers l'errorElement. On lit ensuite l'erreur avec useRouteError() + isRouteErrorResponse().
Quelle est la différence entre setSearchParams(objet) et setSearchParams(prev => ...) ?|Passer un objet REMPLACE toute la query string (les autres params disparaissent). La forme fonction reçoit les params courants, on mute une copie (prev.set) et on la retourne — les autres clés sont préservées.
Pourquoi persister un filtre dans la query string plutôt que dans un useState ?|L'URL devient partageable, bookmarkable et survit au rechargement (F5). De plus, changer la query string relance automatiquement le loader de la route — la liste se refiltre sans code de synchronisation.
Quelle est la différence entre un loader et une action ?|Le loader LIT (charge les données avant rendu, une par navigation). L'action ÉCRIT (mutation), déclenchée par la soumission d'un <Form method="post">. Après une action, React Router revalide automatiquement les loaders de la page.
Pourquoi utiliser <Form> de React Router plutôt que <form> natif ?|<Form> (majuscule) soumet côté client, déclenche l'action de la route et revalide les loaders. <form> natif provoque un rechargement complet de la page et ignore l'action de route.
En v7, comment streamer une donnée lente depuis un loader ?|On retourne la promesse NON attendue dans l'objet du loader, puis on la résout au rendu avec <Suspense fallback> + <Await resolve={promesse}>. L'utilitaire defer() de la v6 est déprécié.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-18-parametres-et-loaders/README.md`. Câbler la section Familles de l'admin TribuZen — loader sur `/familles/:id`, filtre `statut` en query string sur `/familles`, et `errorElement` sur famille introuvable.
