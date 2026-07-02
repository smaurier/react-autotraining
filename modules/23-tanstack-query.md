---
titre: TanStack Query — état serveur, cache et mutations
cours: 04-react
notions: [état client vs état serveur, useQuery queryKey queryFn, états isPending isError isSuccess, staleTime et gcTime, cache et invalidation, useMutation et invalidateQueries, optimistic updates avec rollback, QueryClientProvider]
outcomes: [remplacer un useEffect+fetch par useQuery, écrire une mutation qui invalide le cache, implémenter une mise à jour optimiste avec rollback, configurer QueryClientProvider et régler staleTime/gcTime]
prerequis: [22-patterns-formulaires-avances]
next: 24-nextjs-fondamentaux
libs: [{ name: react, version: "^19" }, { name: "@tanstack/react-query", version: "^5" }]
tribuzen: état serveur de l'admin TribuZen — liste des familles via useQuery (remplace le useEffect+fetch du module 09), création/invitation via useMutation + invalidation, toggle de statut en optimistic update
last-reviewed: 2026-07
---

# TanStack Query — état serveur, cache et mutations

> **Outcomes — tu sauras FAIRE :** remplacer un `useEffect`+`fetch` par `useQuery`, écrire une mutation qui invalide le cache, implémenter une mise à jour optimiste avec rollback, configurer `QueryClientProvider` et régler `staleTime`/`gcTime`.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Au module 09, on a écrit la liste des familles de l'admin TribuZen « à la main » avec `useEffect` + `fetch`. Ça marchait, mais au prix de beaucoup de plomberie : un state pour les données, un state pour le statut, un flag `ignore` contre les race conditions, et **aucun cache** — chaque fois qu'on revient sur la page, tout se recharge de zéro.

```tsx
// FamilyListPage.tsx — la version MODULE 09 (useEffect + fetch)
function FamilyListPage({ spaceId }: { spaceId: string }) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let ignore = false;                     // plomberie anti-race
    setStatus('loading');
    fetch(`/api/spaces/${spaceId}/families`)
      .then((r) => r.json())
      .then((data: Family[]) => {
        if (!ignore) { setFamilies(data); setStatus('ok'); }
      })
      .catch(() => { if (!ignore) setStatus('error'); });
    return () => { ignore = true; };         // cleanup manuel
  }, [spaceId]);

  if (status === 'loading') return <p>Chargement…</p>;
  if (status === 'error') return <p>Erreur de chargement.</p>;
  return <ul>{families.map((f) => <li key={f.id}>{f.name}</li>)}</ul>;
}
```

**Ce qui manque, et qu'on refait à chaque page :**
1. **Pas de cache** — revenir sur la page = re-fetch complet, écran de chargement à chaque fois.
2. **Pas de dédoublonnage** — deux composants qui affichent la même liste font deux requêtes.
3. **Pas de revalidation** — si un autre admin crée une famille, la liste reste périmée jusqu'au prochain montage.
4. **Anti-race à la main** — le flag `ignore`, à réécrire dans chaque effet.

Ce module remplace toute cette plomberie par `useQuery`. Voici la même page, réécrite :

```tsx
// FamilyListPage.tsx — la version TANSTACK QUERY (ce module)
function FamilyListPage({ spaceId }: { spaceId: string }) {
  const { data: families, isPending, isError } = useQuery({
    queryKey: ['families', spaceId],
    queryFn: () => fetchFamilies(spaceId),
  });

  if (isPending) return <p>Chargement…</p>;
  if (isError) return <p>Erreur de chargement.</p>;
  return <ul>{families.map((f) => <li key={f.id}>{f.name}</li>)}</ul>;
}
```

Trois lignes de logique au lieu de vingt. Le cache, le dédoublonnage, l'anti-race et la revalidation sont gérés par la lib. Ce module explique **ce qu'elle fait pour toi** et **comment la piloter**.

---

## 2. Théorie complète, concise

### 2.1 État client vs état serveur

C'est la distinction fondatrice. Elle décide de **quel outil** tu utilises.

| | État **client** | État **serveur** |
|---|---|---|
| Source de vérité | Dans l'app (le navigateur) | Sur le backend / la base |
| Exemples TribuZen | sidebar ouverte, thème, brouillon de formulaire | liste des familles, membres, invitations |
| Périme-t-il ? | Non | **Oui** — un autre admin peut le modifier |
| Outil adapté | `useState`, Context, Zustand | **TanStack Query** |

`useState`, Context et Zustand (modules précédents) gèrent l'état **client**. TanStack Query gère l'état **serveur** : des données qui vivent ailleurs, qui peuvent devenir obsolètes, et qu'il faut synchroniser. Mettre des données serveur dans un store client t'oblige à re-gérer à la main le chargement, l'erreur, le cache et la revalidation — exactement ce qu'on faisait au module 09.

> **Règle d'or :** si la donnée existe dans une base quelque part, c'est de l'état serveur → TanStack Query. Si elle est purement frontend → `useState`/Context/Zustand.

### 2.2 QueryClientProvider — le socle

TanStack Query stocke son cache dans un `QueryClient`, exposé à l'arbre via un `QueryClientProvider` (même mécanisme que Context, module 11). On l'instancie **une seule fois**.

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRoot } from 'react-dom/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,  // 1 min de fraîcheur par défaut (voir 2.5)
      retry: 2,              // 2 nouvelles tentatives en cas d'échec
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    {/* DevTools : inspecter le cache en dev, jamais en prod */}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);
```

> Si tu crées le `QueryClient` **dans** un composant, fais-le via `useState(() => new QueryClient())` pour ne pas en recréer un à chaque rendu (ce qui viderait le cache). En dehors d'un composant (comme ci-dessus), un `const` simple suffit.

### 2.3 useQuery — lire des données

`useQuery` prend deux champs obligatoires : `queryKey` (identifiant du cache) et `queryFn` (la fonction qui va chercher les données). La `queryFn` est **pure** : c'est une fonction async normale, pas un hook, sans React dedans.

```tsx
import { useQuery } from '@tanstack/react-query';

interface Family {
  id: string;
  name: string;
}

// queryFn : fonction async pure, lève une erreur si la réponse n'est pas ok
async function fetchFamilies(spaceId: string): Promise<Family[]> {
  const res = await fetch(`/api/spaces/${spaceId}/families`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function FamilyListPage({ spaceId }: { spaceId: string }) {
  const {
    data,        // les données — undefined tant que ce n'est pas chargé
    isPending,   // true au tout premier chargement (aucune donnée encore)
    isError,     // true si la queryFn a levé une erreur
    error,       // l'objet Error
    isFetching,  // true à CHAQUE requête, y compris revalidation en fond
  } = useQuery({
    queryKey: ['families', spaceId],       // clé de cache
    queryFn: () => fetchFamilies(spaceId), // le fetch
  });

  if (isPending) return <p>Chargement…</p>;
  if (isError) return <p>Erreur : {error.message}</p>;

  // Ici TS sait que `data` est Family[] (plus undefined)
  return (
    <ul>
      {data.map((f) => <li key={f.id}>{f.name}</li>)}
    </ul>
  );
}
```

Remarque : `queryFn` **doit lever** en cas d'échec (`throw`) pour que `isError` passe à `true`. Un `fetch` qui reçoit un 500 ne rejette **pas** tout seul — d'où le `if (!res.ok) throw`.

### 2.4 Les états : isPending, isError, isSuccess (v5)

Une query est toujours dans **un** de ces trois `status`. TanStack Query expose des booléens dérivés :

| `status` | booléen | Signification |
|---|---|---|
| `'pending'` | `isPending` | Pas encore de données en cache (premier chargement) |
| `'error'` | `isError` | La `queryFn` a levé — `error` contient l'objet |
| `'success'` | `isSuccess` | `data` est disponible |

> **⚠️ Changement v5 :** l'état de premier chargement s'appelle désormais **`isPending`** (avant v5 : `isLoading`). En v5, `isLoading` existe encore mais vaut `isPending && isFetching` — utilise **`isPending`** pour « aucune donnée encore ».

À distinguer de **`isFetching`**, orthogonal au `status` : il est `true` à chaque requête réseau, y compris une **revalidation en arrière-plan** alors que `data` est déjà affiché. C'est lui qui sert à montrer un petit spinner discret « mise à jour… » sans masquer la liste existante.

```tsx
if (isPending) return <p>Chargement…</p>;        // aucune donnée : écran plein
if (isError) return <p>Erreur : {error.message}</p>;
return (
  <>
    {isFetching && <span className="badge">Mise à jour…</span>}  {/* revalidation en fond */}
    <ul>{data.map((f) => <li key={f.id}>{f.name}</li>)}</ul>
  </>
);
```

### 2.5 queryKey, staleTime et gcTime — le cœur du cache

**`queryKey`** est un **tableau** qui identifie l'entrée de cache. Deux composants avec la même clé lisent la même donnée (dédoublonnage automatique). La clé se construit du général au particulier :

```tsx
['families']                          // toutes les familles
['families', spaceId]                 // les familles d'un espace
['families', spaceId, { status: 'active' }]  // + un filtre
['family', familyId]                  // une famille précise
```

Toute valeur réactive utilisée dans la `queryFn` (ici `spaceId`) **doit** figurer dans la `queryKey`. Quand elle change, la clé change, et TanStack Query refetch automatiquement — c'est ce qui remplace le `useEffect(..., [spaceId])` du module 09.

**`staleTime`** = durée pendant laquelle une donnée est considérée **fraîche**. Tant qu'elle est fraîche, aucun refetch (ni au remontage, ni au refocus de l'onglet). Par défaut `0` : tout est stale immédiatement, donc revalidé au moindre montage.

**`gcTime`** (garbage collection, ex-`cacheTime`) = durée de conservation en cache **après** que plus aucun composant n'utilise la query. Par défaut 5 min. Passé ce délai, l'entrée est supprimée.

| | `staleTime` | `gcTime` |
|---|---|---|
| Répond à | « quand refetch ? » | « quand oublier ? » |
| Query **montée** (utilisée) | fraîche → pas de refetch | jamais collectée |
| Query **démontée** (inactive) | — | supprimée après `gcTime` |

```tsx
useQuery({
  queryKey: ['families', spaceId],
  queryFn: () => fetchFamilies(spaceId),
  staleTime: 1000 * 60 * 5,  // fraîche 5 min : revenir sur la page = cache instantané
  gcTime: 1000 * 60 * 30,    // gardée 30 min après démontage
});
```

Résultat concret vs module 09 : avec `staleTime` à 5 min, revenir sur la liste des familles affiche le cache **instantanément**, sans écran de chargement — le manque n°1 du cas concret.

### 2.6 useMutation — écrire (créer, modifier, supprimer)

`useQuery` lit ; `useMutation` écrit. Une mutation n'a pas de clé de cache : on la déclenche explicitement via `.mutate(variables)`.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateFamilyForm({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient();

  const createFamily = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/spaces/${spaceId}/families`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then((r) => {
        if (!r.ok) throw new Error('Création impossible');
        return r.json();
      }),
    onSuccess: () => {
      // ✅ invalide la liste : TanStack Query la refetch pour la resynchroniser
      queryClient.invalidateQueries({ queryKey: ['families', spaceId] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = new FormData(e.currentTarget).get('name') as string;
        createFamily.mutate(name);
      }}
    >
      <input name="name" required />
      <button type="submit" disabled={createFamily.isPending}>
        {createFamily.isPending ? 'Création…' : 'Créer'}
      </button>
      {createFamily.isError && <p>{createFamily.error.message}</p>}
    </form>
  );
}
```

Une mutation expose les mêmes booléens (`isPending`, `isError`, `isSuccess`) que le formulaire consomme pour désactiver le bouton et afficher l'erreur.

### 2.7 invalidateQueries — synchroniser après écriture

Après une écriture réussie, la liste en cache est **périmée**. `invalidateQueries` la marque stale et déclenche un refetch des queries **actives** qui matchent la clé. C'est le pattern par défaut : écrire → invalider → la lib resynchronise.

```tsx
// invalide TOUT ce qui commence par ['families'] (préfixe partiel)
queryClient.invalidateQueries({ queryKey: ['families'] });

// invalide seulement la liste d'un espace précis
queryClient.invalidateQueries({ queryKey: ['families', spaceId] });
```

Le match est **par préfixe** : `['families']` invalide `['families', spaceId]`, `['families', spaceId, filtre]`, etc. C'est là que la hiérarchie des `queryKey` (2.5) devient utile.

### 2.8 Optimistic updates — mettre à jour avant la réponse

Pour une action à ressenti « instantané » (cocher/décocher un statut), on ne veut pas attendre le round-trip serveur. On met le cache à jour **immédiatement**, puis on **rollback** si le serveur refuse. Le cycle a trois hooks :

- **`onMutate`** — avant l'envoi : on annule les refetch en cours, on **snapshot** la valeur actuelle (pour le rollback), et on écrit la valeur optimiste dans le cache. Ce qu'on `return` devient le `context` des hooks suivants.
- **`onError`** — si l'écriture échoue : on **restaure** le snapshot (rollback).
- **`onSettled`** — succès ou échec : on invalide pour resynchroniser avec la vérité serveur.

```tsx
const toggleStatus = useMutation({
  mutationFn: (family: Family) =>
    fetch(`/api/families/${family.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: family.status }),
    }).then((r) => { if (!r.ok) throw new Error('MAJ impossible'); return r.json(); }),

  onMutate: async (updated) => {
    // 1. annuler les refetch en vol pour qu'ils n'écrasent pas notre update
    await queryClient.cancelQueries({ queryKey: ['families', spaceId] });
    // 2. snapshot pour rollback
    const previous = queryClient.getQueryData<Family[]>(['families', spaceId]);
    // 3. écrire la valeur optimiste dans le cache
    queryClient.setQueryData<Family[]>(['families', spaceId], (old) =>
      old?.map((f) => (f.id === updated.id ? updated : f)),
    );
    return { previous };  // devient le `context` de onError / onSettled
  },

  onError: (_err, _updated, context) => {
    // rollback : on remet le snapshot
    if (context?.previous) {
      queryClient.setQueryData(['families', spaceId], context.previous);
    }
  },

  onSettled: () => {
    // resynchroniser avec le serveur, succès comme échec
    queryClient.invalidateQueries({ queryKey: ['families', spaceId] });
  },
});
```

`invalidateQueries` seul (2.7) suffit pour la plupart des écritures. L'optimistic update est réservé aux actions **fréquentes et rapides** où attendre la réponse casserait le ressenti (toggle, like, réordonnancement).

---

## 3. Worked examples

### Exemple 1 — Migrer FamilyListPage : useEffect+fetch → useQuery

On reprend la page du module 09 et on la réécrit complètement. Objectif : montrer ligne à ligne ce que `useQuery` fait disparaître.

```tsx
// ─── api/families.ts — queryFn pures, aucune dépendance à React ─────
export interface Family {
  id: string;
  name: string;
  status: 'active' | 'pending';
}

export async function fetchFamilies(spaceId: string): Promise<Family[]> {
  const res = await fetch(`/api/spaces/${spaceId}/families`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);  // impératif pour isError
  return res.json();
}

// ─── features/family/FamilyListPage.tsx ─────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { fetchFamilies } from '@/api/families';

function FamilyListPage({ spaceId }: { spaceId: string }) {
  const {
    data: families,
    isPending,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['families', spaceId],        // ← remplace le tableau de deps [spaceId]
    queryFn: () => fetchFamilies(spaceId),  // ← remplace le fetch dans l'effet
    staleTime: 1000 * 60 * 5,               // ← 5 min : cache instantané au retour
  });

  // isPending remplace le state `status === 'loading'`
  if (isPending) return <p>Chargement…</p>;
  // isError remplace le state `status === 'error'` + le .catch
  if (isError) return <p>Erreur : {error.message}</p>;

  // Ici plus besoin de useState pour `families` : c'est `data`
  return (
    <div>
      <div className="header">
        <h1>{families.length} familles</h1>
        {/* revalidation en fond visible sans masquer la liste */}
        {isFetching && <span className="badge">Mise à jour…</span>}
      </div>
      <ul>
        {families.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default FamilyListPage;
```

**Ce que la migration supprime :**
- `useState(families)` + `useState(status)` → tout est dans le retour de `useQuery`.
- `useEffect(..., [spaceId])` → la `queryKey` `['families', spaceId]` déclenche le refetch au changement.
- Le flag `let ignore = false` + le cleanup → géré en interne (la lib jette les réponses obsolètes).
- Un cache + du dédoublonnage + une revalidation **gratuits**, qu'on n'avait pas du tout au module 09.

### Exemple 2 — Créer une famille avec invalidation

La liste ci-dessus, plus un formulaire de création. Après un POST réussi, la liste se resynchronise seule.

```tsx
// ─── api/families.ts (suite) ────────────────────────────────────────
export async function createFamily(spaceId: string, name: string): Promise<Family> {
  const res = await fetch(`/api/spaces/${spaceId}/families`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Création de la famille impossible');
  return res.json();
}

// ─── features/family/CreateFamilyForm.tsx ───────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFamily } from '@/api/families';

function CreateFamilyForm({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // variables = le name saisi ; la mutationFn ferme sur spaceId
    mutationFn: (name: string) => createFamily(spaceId, name),
    onSuccess: () => {
      // la liste ['families', spaceId] devient stale → refetch automatique
      queryClient.invalidateQueries({ queryKey: ['families', spaceId] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (new FormData(form).get('name') as string).trim();
    if (!name) return;
    // reset() du form au succès, via le 2e argument de mutate
    mutation.mutate(name, { onSuccess: () => form.reset() });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Nom de la famille" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Création…' : 'Créer'}
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.isSuccess && <p>Famille créée.</p>}
    </form>
  );
}

export default CreateFamilyForm;
```

**Points clés de l'exemple :**
- La `mutationFn` reçoit les `variables` passées à `.mutate(name)` — ici le nom saisi.
- `onSuccess` **au niveau du hook** invalide le cache (logique métier, toujours exécutée).
- `onSuccess` **au niveau de `.mutate()`** (2e argument) gère le côté UI ponctuel (`form.reset()`) — pratique pour ce qui dépend du composant appelant.
- `disabled={mutation.isPending}` empêche le double-submit pendant l'écriture.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Chercher `isLoading` comme avant v5

```tsx
// ❌ réflexe pré-v5 : isLoading pour le premier chargement
const { data, isLoading } = useQuery({ queryKey: ['families'], queryFn });
if (isLoading) return <Spinner />;  // sémantique changée en v5

// ✅ v5 : isPending = « aucune donnée en cache encore »
const { data, isPending } = useQuery({ queryKey: ['families'], queryFn });
if (isPending) return <Spinner />;
```

**Pourquoi :** en v5, `isLoading` a été redéfini comme `isPending && isFetching`. Pour « premier chargement, rien en cache », c'est **`isPending`**. `isLoading` reste utile pour « chargement ET pas de cache », mais `isPending` est le réflexe par défaut.

### PIÈGE #2 — Une queryFn qui ne lève pas en cas d'erreur

```tsx
// ❌ fetch ne rejette pas sur 4xx/5xx → isError reste false, data = undefined
queryFn: () => fetch('/api/families').then((r) => r.json()),

// ✅ lever explicitement pour que isError se déclenche
queryFn: async () => {
  const r = await fetch('/api/families');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
},
```

**Pourquoi :** `fetch` ne rejette que sur erreur **réseau**, pas sur un statut HTTP d'erreur. Sans `throw`, TanStack Query croit la requête réussie et tente de parser une réponse d'erreur — bug silencieux. (Les clients type `axios` lèvent d'eux-mêmes.)

### PIÈGE #3 — Oublier une variable réactive dans la queryKey

```tsx
// ❌ spaceId absent de la clé : changer d'espace n'entraîne PAS de refetch
useQuery({ queryKey: ['families'], queryFn: () => fetchFamilies(spaceId) });

// ✅ toute valeur lue dans queryFn figure dans queryKey
useQuery({ queryKey: ['families', spaceId], queryFn: () => fetchFamilies(spaceId) });
```

**Pourquoi :** la `queryKey` est l'identité du cache **et** le déclencheur de refetch (comme le tableau de deps de `useEffect`). Clé incomplète = deux espaces différents partagent la même entrée de cache, et le changement de `spaceId` passe inaperçu.

### PIÈGE #4 — Mettre l'état serveur dans Zustand/Context

```tsx
// ❌ données serveur dans un store client : on re-gère tout à la main
const useStore = create((set) => ({
  families: [],
  fetchFamilies: async (id) => set({ families: await fetchFamilies(id) }),
}));
// … puis loading, error, cache, revalidation, dédoublonnage à écrire soi-même

// ✅ état serveur → useQuery, qui fournit tout ça
const { data } = useQuery({ queryKey: ['families', id], queryFn: () => fetchFamilies(id) });
```

**Pourquoi :** un store client ne connaît ni la péremption, ni le cache, ni la revalidation. Tu réimplémentes exactement la plomberie du module 09. Zustand reste pour l'état **client** (sidebar, thème, panier).

### PIÈGE #5 — Optimistic update sans rollback

```tsx
// ❌ on écrit optimiste mais on ne restaure jamais si le serveur refuse
onMutate: (updated) => {
  queryClient.setQueryData(['families', spaceId], /* valeur optimiste */);
  // pas de snapshot, pas de onError → l'UI reste sur une valeur fausse en cas d'échec
},

// ✅ snapshot dans onMutate, restauration dans onError
onMutate: async (updated) => {
  await queryClient.cancelQueries({ queryKey: ['families', spaceId] });
  const previous = queryClient.getQueryData(['families', spaceId]);
  queryClient.setQueryData(['families', spaceId], /* optimiste */);
  return { previous };
},
onError: (_e, _v, ctx) => queryClient.setQueryData(['families', spaceId], ctx?.previous),
```

**Pourquoi :** un update optimiste **parie** sur le succès. Sans snapshot + rollback, un échec réseau laisse l'UI afficher une valeur que le serveur n'a jamais acceptée. Le `cancelQueries` est indispensable : sinon un refetch en vol peut écraser ta valeur optimiste.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, TanStack Query devient la couche standard d'accès aux données serveur — elle **remplace** les `useEffect`+`fetch` écrits au module 09.

**Liste des familles — `useQuery`** (`src/features/family/FamilyListPage.tsx`) : la page du module 09 est réécrite avec `queryKey: ['families', spaceId]` (Exemple 1). Le cache donne un retour instantané quand l'admin navigue entre espaces, l'anti-race est géré par la lib, et un badge « Mise à jour… » (`isFetching`) signale la revalidation en fond.

**Création & invitation — `useMutation` + invalidation** (`src/features/family/CreateFamilyForm.tsx`, `src/features/member/InviteMemberForm.tsx`) : créer une famille ou inviter un membre déclenche une mutation dont le `onSuccess` invalide `['families', spaceId]` (ou `['members', familyId]`). La liste se resynchronise sans code de rechargement manuel (Exemple 2).

**Toggle de statut — optimistic update** (`src/features/family/FamilyStatusToggle.tsx`) : basculer une famille `pending` ↔ `active` doit être instantané. La mutation écrit la nouvelle valeur dans le cache dès le clic (`onMutate`), rollback si le serveur refuse (`onError`), et resynchronise dans tous les cas (`onSettled`). C'est le cas TribuZen qui justifie l'optimistic update plutôt qu'une simple invalidation.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  main.tsx                              # QueryClientProvider + DevTools
  api/
    families.ts                         # fetchFamilies, createFamily, updateFamilyStatus (queryFn/mutationFn pures)
  features/
    family/
      FamilyListPage.tsx                # useQuery — remplace le useEffect+fetch du module 09
      CreateFamilyForm.tsx              # useMutation + invalidateQueries
      FamilyStatusToggle.tsx            # useMutation optimistic (onMutate/onError/onSettled)
    member/
      InviteMemberForm.tsx              # useMutation + invalidation ['members', familyId]
```

---

## 6. Points clés

1. **État client vs serveur :** `useState`/Context/Zustand pour l'état local ; **TanStack Query** pour tout ce qui vit sur le backend et peut se périmer.
2. `useQuery` prend `queryKey` (identité du cache + déclencheur de refetch) et `queryFn` (fonction async pure qui **doit lever** en cas d'erreur).
3. **v5 :** l'état de premier chargement est **`isPending`** (ex-`isLoading`) ; `isError`/`error` pour l'échec ; `isFetching` pour toute requête, y compris revalidation en fond.
4. `staleTime` décide **quand refetch** (durée de fraîcheur) ; `gcTime` décide **quand oublier** une query inactive (défaut 5 min).
5. `useMutation` écrit ; son `onSuccess` appelle `invalidateQueries({ queryKey })` pour resynchroniser (match par **préfixe** de clé).
6. **Optimistic update :** `onMutate` (cancel + snapshot + écriture optimiste) → `onError` (rollback du snapshot) → `onSettled` (invalidation). Réservé aux actions rapides et fréquentes.
7. `QueryClientProvider` fournit le cache à l'arbre ; instancier le `QueryClient` **une seule fois** (jamais recréé à chaque rendu).
8. Cette couche **remplace** le `useEffect`+`fetch`+flag `ignore` du module 09 : cache, dédoublonnage, anti-race et revalidation sont fournis.

---

## 7. Seeds Anki

```
Quelle est la différence entre état client et état serveur, et quel outil pour chacun ?|État client = données locales à l'app (sidebar, thème, brouillon) → useState/Context/Zustand. État serveur = données qui vivent sur le backend et peuvent se périmer (familles, membres) → TanStack Query, qui gère cache, loading, erreur et revalidation.
Quels sont les deux champs obligatoires de useQuery et à quoi servent-ils ?|queryKey (un tableau) = identité de l'entrée de cache ET déclencheur de refetch quand elle change. queryFn = fonction async pure qui va chercher les données ; elle DOIT throw en cas d'erreur pour que isError se déclenche.
En TanStack Query v5, quel booléen indique le premier chargement, et qu'est devenu isLoading ?|isPending indique « aucune donnée en cache encore » (premier chargement). En v5, isLoading a été redéfini comme isPending && isFetching ; le réflexe par défaut est isPending.
Quelle est la différence entre staleTime et gcTime ?|staleTime = durée de fraîcheur : tant qu'elle dure, pas de refetch (ni au remontage ni au refocus). gcTime = durée de conservation en cache APRÈS que plus aucun composant n'utilise la query (défaut 5 min), après quoi l'entrée est supprimée.
Comment resynchroniser une liste après une mutation qui l'a modifiée ?|Dans le onSuccess de useMutation, appeler queryClient.invalidateQueries({ queryKey: ['families', spaceId] }). La query active correspondante est marquée stale et refetch. Le match est par préfixe : ['families'] invalide aussi ['families', spaceId, filtre].
Quels sont les trois hooks d'un optimistic update et leur rôle ?|onMutate : cancelQueries + snapshot de la valeur actuelle + écriture optimiste dans le cache (return le snapshot comme context). onError : rollback en restaurant le snapshot. onSettled : invalidateQueries pour resynchroniser avec le serveur (succès ou échec).
Pourquoi ne pas stocker des données serveur dans Zustand ou Context ?|Parce qu'un store client ne connaît ni péremption, ni cache, ni revalidation, ni dédoublonnage. On réimplémente à la main toute la plomberie (loading, erreur, anti-race du module 09) que useQuery fournit gratuitement.
Qu'apporte TanStack Query par rapport au useEffect+fetch du module 09 ?|Cache (retour instantané), dédoublonnage (une requête pour plusieurs composants même clé), revalidation en fond, et gestion interne des race conditions — sans le flag ignore ni le cleanup manuel. La queryKey remplace le tableau de dépendances de useEffect.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-23-tanstack-query/README.md`. Reprendre `FamilyListPage` du module 09 et la migrer vers `useQuery`, ajouter un `CreateFamilyForm` avec `useMutation` + invalidation, puis un toggle de statut en optimistic update — avec un vrai `QueryClient` et une API simulée en mémoire.
