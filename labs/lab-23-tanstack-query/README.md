# Lab 23 — TanStack Query : migrer FamilyListPage (admin TribuZen)

> **Outcome :** à la fin, tu sais remplacer un `useEffect`+`fetch` par `useQuery`, écrire une `useMutation` qui invalide le cache, et faire un toggle de statut en optimistic update avec rollback — dans une vraie app React 19 + TanStack Query v5.
> **Vrai outil :** React 19 + Vite + `@tanstack/react-query` v5. API simulée en mémoire (aucun backend à écrire), mais un vrai `QueryClient` et un vrai cache.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur). La preuve passe par les **React Query DevTools** (état des queries, cache, invalidations).

## Pré-requis

Une app React 19 + TypeScript + Vite. Si tu pars de zéro :

```bash
npm create vite@latest tribuzen-admin -- --template react-ts
cd tribuzen-admin
npm install @tanstack/react-query @tanstack/react-query-devtools
npm run dev
```

Comme source de données, une **API simulée en mémoire** (pas de backend). Crée `src/api/families.ts` :

```ts
// src/api/families.ts — fausse API en mémoire, avec latence réaliste
export interface Family {
  id: string;
  name: string;
  status: 'active' | 'pending';
}

// "base de données" en mémoire (mutée par les writes)
let DB: Family[] = [
  { id: 'f1', name: 'Famille Martin', status: 'active' },
  { id: 'f2', name: 'Famille Nguyen', status: 'pending' },
  { id: 'f3', name: 'Famille Diallo', status: 'active' },
];

const latency = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export async function fetchFamilies(spaceId: string): Promise<Family[]> {
  await latency();
  // spaceId ignoré ici (une seule "base") mais gardé pour la queryKey
  return structuredClone(DB);
}

export async function createFamily(spaceId: string, name: string): Promise<Family> {
  await latency();
  if (!name.trim()) throw new Error('Nom requis');
  const family: Family = { id: crypto.randomUUID(), name, status: 'pending' };
  DB = [...DB, family];
  return family;
}

export async function updateFamilyStatus(family: Family): Promise<Family> {
  await latency(900); // volontairement lent pour VOIR l'optimistic update
  // 1 chance sur 3 d'échouer → pour observer le rollback
  if (Math.random() < 0.33) throw new Error('Le serveur a refusé la mise à jour');
  DB = DB.map((f) => (f.id === family.id ? family : f));
  return family;
}
```

## Énoncé

Construis l'admin TribuZen en **trois incréments** :

1. **Lecture** — `FamilyListPage` avec `useQuery` (`queryKey: ['families', spaceId]`, `staleTime` 5 min). Un badge « Mise à jour… » quand `isFetching`.
2. **Écriture** — `CreateFamilyForm` avec `useMutation` dont le `onSuccess` invalide `['families', spaceId]`.
3. **Optimistic** — un bouton qui bascule `pending ↔ active` immédiatement (`onMutate`/`onError`/`onSettled`), avec rollback visible quand le serveur refuse.

**Contrainte (le cœur du lab) :** tu dois pouvoir montrer dans les DevTools **pourquoi** une query refetch (invalidation) et **quand** le rollback se déclenche. Pas de « ça marche » — tu expliques le cache.

## Étapes (en friction)

1. `src/main.tsx` : instancie **un seul** `QueryClient`, enveloppe `<App />` dans `<QueryClientProvider>`, ajoute `<ReactQueryDevtools />`.
2. Écris `FamilyListPage` avec `useQuery`. Ouvre les DevTools : observe l'entrée `['families', 'space-1']` passer `fetching → fresh → stale`.
3. Navigue ailleurs puis reviens sur la liste **avant** 5 min : la liste s'affiche **instantanément** (cache). Baisse `staleTime` à `0` et recompare : refetch à chaque montage.
4. Ajoute `CreateFamilyForm`. Après un `mutate`, vérifie dans les DevTools que la liste est **invalidée** puis refetch (la nouvelle famille apparaît sans reload).
5. Ajoute le toggle de statut en optimistic. Clique et regarde la valeur changer **avant** la fin du fetch (900 ms). Comme la fausse API échoue 1 fois sur 3, tu **verras** le rollback remettre l'ancien statut.
6. Explique au coach : à quoi sert `cancelQueries` dans `onMutate` ? Que se passe-t-il si tu l'oublies et qu'un refetch en vol se termine après ton écriture optimiste ?

## Corrigé complet commenté

```tsx
// src/main.tsx — socle
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App } from './App';

// instancié UNE fois hors composant : jamais recréé (sinon le cache serait vidé)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
```

```tsx
// src/features/family/FamilyListPage.tsx — LECTURE (useQuery)
import { useQuery } from '@tanstack/react-query';
import { fetchFamilies } from '../../api/families';
import { CreateFamilyForm } from './CreateFamilyForm';
import { FamilyStatusToggle } from './FamilyStatusToggle';

export function FamilyListPage({ spaceId }: { spaceId: string }) {
  const {
    data: families,
    isPending,   // premier chargement (aucune donnée en cache) — v5
    isError,
    error,
    isFetching,  // true aussi pendant une revalidation en fond
  } = useQuery({
    queryKey: ['families', spaceId],
    queryFn: () => fetchFamilies(spaceId),
    staleTime: 1000 * 60 * 5, // 5 min : retour instantané depuis le cache
  });

  if (isPending) return <p>Chargement…</p>;
  if (isError) return <p role="alert">Erreur : {error.message}</p>;

  return (
    <section>
      <header>
        <h1>{families.length} familles</h1>
        {isFetching && <span className="badge">Mise à jour…</span>}
      </header>
      <CreateFamilyForm spaceId={spaceId} />
      <ul>
        {families.map((f) => (
          <li key={f.id}>
            {f.name} — {f.status}
            <FamilyStatusToggle spaceId={spaceId} family={f} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// src/features/family/CreateFamilyForm.tsx — ÉCRITURE (useMutation + invalidation)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFamily } from '../../api/families';

export function CreateFamilyForm({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (name: string) => createFamily(spaceId, name),
    onSuccess: () => {
      // la liste devient stale → TanStack Query la refetch pour resynchroniser
      queryClient.invalidateQueries({ queryKey: ['families', spaceId] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (new FormData(form).get('name') as string).trim();
        if (!name) return;
        mutation.mutate(name, { onSuccess: () => form.reset() });
      }}
    >
      <input name="name" placeholder="Nom de la famille" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Création…' : 'Créer'}
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
```

```tsx
// src/features/family/FamilyStatusToggle.tsx — OPTIMISTIC UPDATE (rollback)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateFamilyStatus, type Family } from '../../api/families';

export function FamilyStatusToggle({
  spaceId,
  family,
}: {
  spaceId: string;
  family: Family;
}) {
  const queryClient = useQueryClient();
  const key = ['families', spaceId];

  const toggle = useMutation({
    mutationFn: (next: Family) => updateFamilyStatus(next),

    onMutate: async (next) => {
      // 1. annuler les refetch en vol : ils écraseraient notre valeur optimiste
      await queryClient.cancelQueries({ queryKey: key });
      // 2. snapshot pour le rollback
      const previous = queryClient.getQueryData<Family[]>(key);
      // 3. écrire la valeur optimiste immédiatement
      queryClient.setQueryData<Family[]>(key, (old) =>
        old?.map((f) => (f.id === next.id ? next : f)),
      );
      return { previous };
    },

    onError: (_err, _next, context) => {
      // rollback : le serveur a refusé → on remet le snapshot
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },

    onSettled: () => {
      // resynchroniser avec la vérité serveur, succès comme échec
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <button
      onClick={() =>
        toggle.mutate({
          ...family,
          status: family.status === 'active' ? 'pending' : 'active',
        })
      }
      disabled={toggle.isPending}
    >
      Basculer
    </button>
  );
}
```

**Ce que tu dois pouvoir expliquer au coach :**
- Pourquoi `queryFn` doit `throw` si `!res.ok` (ici la fausse API lève déjà) : sinon `isError` reste `false`.
- Pourquoi la nouvelle famille apparaît après `createFamily` **sans** reload : `invalidateQueries` marque la liste stale et la refetch.
- Pourquoi `cancelQueries` est indispensable dans `onMutate` : un refetch en vol peut se terminer **après** ton écriture optimiste et écraser ta valeur.

## Variante J+30 (fading)

Reprends le lab **sans regarder le corrigé**, en 30 minutes, avec deux contraintes :
1. Ajoute un `InviteMemberForm` : une `useMutation` sur `['members', familyId]` qui invalide sa propre liste. Réutilise le pattern de `CreateFamilyForm`.
2. Sur le toggle, ajoute un indicateur visuel « en attente serveur » (`toggle.isPending`) **sans** masquer la ligne — l'utilisateur voit la valeur optimiste + un petit spinner, et si rollback, la valeur revient. Explique pourquoi c'est un meilleur ressenti qu'un simple `invalidateQueries`.

## Application TribuZen

Porte le pattern dans le vrai `smaurier/tribuzen` :
- Remplace les `useEffect`+`fetch` de `FamilyListPage` (écrits au module 09) par `useQuery`.
- `QueryClientProvider` + DevTools dans `src/main.tsx`.
- `api/families.ts` : `fetchFamilies`, `createFamily`, `updateFamilyStatus` en `queryFn`/`mutationFn` pures, branchées sur les vrais endpoints.
- Optimistic update réservé au toggle de statut (action rapide/fréquente) ; simple `invalidateQueries` pour la création.
- Commit : `feat(families): etat serveur via TanStack Query (useQuery + mutation + optimistic)`.
```
