# TanStack Query : gérer l'état serveur

> **Module** : 05b — Async State (Server State) · **Durée** : ~60 min
>
> **Prérequis** : module 03 (State Management) et module 05 (Formulaires)
>
> ⚠️ **Pourquoi ce module est séparé du State Management (module 03)**
>
> TanStack Query ne gère **pas** le même type d'état que Zustand, Redux ou Context. Ces trois gèrent du **client state** (état local à ton application, qui n'existe pas sur un serveur). TanStack Query gère du **server state** : des données qui **vivent sur un serveur**, qui sont potentiellement périmées, et qui doivent être synchronisées.
>
> | | Client State | Server State |
> |---|---|---|
> | **Exemples** | `isMenuOpen`, sélection UI, panier local | Liste d'utilisateurs, posts, produits |
> | **Où vit la source de vérité ?** | Dans l'app | Sur le serveur |
> | **Outil adapté** | `useState`, Zustand, Redux | **TanStack Query**, SWR |
> | **Périme-t-il ?** | Non | Oui (un autre user peut modifier les données) |
>
> Mettre des données serveur dans Zustand/Redux, c'est gérer manuellement des problèmes (loading, erreur, cache, revalidation, stale-time) que TanStack Query résout automatiquement.
>
> **Objectif** : Comprendre la distinction fondamentale entre état client et état serveur. Maîtriser `useQuery` et `useMutation` de TanStack Query pour le fetching, le cache et l'invalidation des données serveur. Comparer avec `resource()` et `HttpClient` d'Angular, et savoir quand utiliser TanStack Query plutôt que Zustand.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre createSlice et createAsyncThunk dans Redux Toolkit ?</summary>

`createSlice` définit les reducers synchrones et génère automatiquement les action creators. `createAsyncThunk` crée une action asynchrone qui gère les états pending/fulfilled/rejected automatiquement, utilisable dans `extraReducers`.
</details>

<details>
<summary>2. Pourquoi Redux Toolkit intègre-t-il Immer ?</summary>

Pour permettre d'écrire des mutations « directes » dans les reducers (comme `state.items.push(...)`) tout en garantissant l'immutabilité sous le capot. Sans Immer, il faudrait toujours retourner un nouvel objet avec le spread operator.
</details>

<details>
<summary>3. Dans quel cas choisir RTK plutôt que Zustand ?</summary>

RTK est préférable pour les grandes équipes (5+ devs) qui bénéficient de conventions strictes, du time-travel debugging, et de RTK Query intégré. Zustand convient mieux aux projets plus petits qui veulent un minimum de boilerplate.
</details>

---

## Analogie

Imaginez un **restaurant**. L'état client (Zustand/Redux), c'est ce que le restaurant contrôle : la disposition des tables, la musique, la décoration. L'état serveur (TanStack Query), c'est ce qui vient de la **cuisine** (le serveur backend) : les plats disponibles, les commandes en cours, les stocks. Vous ne contrôlez pas la cuisine, vous ne faites que **demander** des informations et **envoyer** des commandes. TanStack Query est le serveur (la personne) qui fait l'aller-retour entre votre table et la cuisine, en se rappelant votre dernière commande pour ne pas retourner en cuisine inutilement (cache).

---

## Théorie

### État client vs état serveur

| Caractéristique | État client | État serveur |
|-----------------|-------------|--------------|
| Propriétaire | L'application frontend | Le backend / la base de données |
| Exemples | Thème, sidebar ouverte, formulaire en cours | Utilisateurs, produits, commandes |
| Synchronisation | Locale | Doit rester en sync avec le serveur |
| Péremption | Jamais | Peut devenir obsolète (`stale`) |
| Gestion idéale | Zustand, Context, Redux | TanStack Query |

> **Erreur fréquente** : stocker les données serveur dans Redux/Zustand et gérer manuellement le loading, l'erreur, le cache et le refetch. TanStack Query fait tout cela automatiquement.

### Installation

```bash
npm install @tanstack/react-query
# Optionnel mais recommandé : devtools
npm install @tanstack/react-query-devtools
```

### Configuration de base

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes avant que les données soient "stale"
      retry: 2,                  // 2 tentatives en cas d'échec
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

### useQuery — lire des données

```tsx
import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  name: string;
  email: string;
}

// Fonction de fetching pure (pas de hook, pas de React)
async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error('Erreur lors du chargement');
  return response.json();
}

function UserList() {
  const {
    data: users,       // Les données (undefined pendant le chargement)
    isLoading,         // Premier chargement
    isFetching,        // Re-fetch en arrière-plan
    isError,           // En erreur
    error,             // L'objet erreur
    isSuccess,         // Données disponibles
  } = useQuery({
    queryKey: ['users'],            // Identifiant unique du cache
    queryFn: fetchUsers,            // La fonction de fetching
  });

  if (isLoading) return <p>Chargement...</p>;
  if (isError) return <p>Erreur : {error.message}</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name} — {user.email}</li>
      ))}
    </ul>
  );
}
```

### queryKey — la clé du système de cache

```tsx
// ✅ Les queryKeys sont des tableaux — elles servent d'identifiant unique au cache
useQuery({ queryKey: ['users'], queryFn: fetchUsers });
useQuery({ queryKey: ['users', userId], queryFn: () => fetchUser(userId) });
useQuery({ queryKey: ['users', { role: 'admin' }], queryFn: () => fetchUsersByRole('admin') });
useQuery({ queryKey: ['posts', postId, 'comments'], queryFn: () => fetchComments(postId) });
```

**Conventions de nommage recommandées** :

```tsx
// Hiérarchie logique
['users']                     // Tous les utilisateurs
['users', 42]                 // Un utilisateur par ID
['users', { role: 'admin' }]  // Filtre
['users', 42, 'posts']        // Les posts d'un utilisateur
```

### staleTime et gcTime (garbage collection)

```tsx
// staleTime = durée pendant laquelle les données sont "fraîches"
// Tant que fraîches, React Query ne refetch PAS, même au refocus
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 1000 * 60 * 5,  // 5 min : les données sont fraîches pendant 5 min
});

// gcTime (anciennement cacheTime) = durée de conservation en cache après démontage
// Par défaut : 5 minutes. Après, les données sont supprimées du cache.
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  gcTime: 1000 * 60 * 30,  // 30 min en cache même après démontage
});
```

| Comportement | staleTime = 0 (défaut) | staleTime = 5 min |
|-------------|------------------------|-------------------|
| Au montage | Refetch immédiat | Utilise le cache si < 5 min |
| Au refocus fenêtre | Refetch | Pas de refetch si < 5 min |
| Navigation retour | Refetch | Cache instantané + refetch en fond si > 5 min |

### useQuery avec paramètres dynamiques

```tsx
function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['users', userId],   // La clé change quand userId change
    queryFn: () => fetchUser(userId),
    enabled: userId > 0,           // Ne fetch que si userId est valide
  });

  if (isLoading) return <p>Chargement...</p>;

  return <h1>{user?.name}</h1>;
}
```

### useMutation — créer, modifier, supprimer

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateUserForm() {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (newUser: { name: string; email: string }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) throw new Error('Erreur lors de la création');
      return response.json();
    },
    onSuccess: () => {
      // ✅ Invalide le cache : force le refetch de la liste des utilisateurs
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Erreur :', error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUser.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Nom" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Création...' : 'Créer'}
      </button>
      {createUser.isError && <p>Erreur : {createUser.error.message}</p>}
      {createUser.isSuccess && <p>Utilisateur créé avec succès !</p>}
    </form>
  );
}
```

### Pattern complet : CRUD avec invalidation

```tsx
// ✅ Suppression avec invalidation
const deleteUser = useMutation({
  mutationFn: (userId: number) =>
    fetch(`/api/users/${userId}`, { method: 'DELETE' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});

// ✅ Mise à jour optimiste (UX fluide)
const updateUser = useMutation({
  mutationFn: (user: User) =>
    fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    }).then((res) => res.json()),
  onMutate: async (updatedUser) => {
    await queryClient.cancelQueries({ queryKey: ['users', updatedUser.id] });
    const previous = queryClient.getQueryData<User>(['users', updatedUser.id]);
    queryClient.setQueryData(['users', updatedUser.id], updatedUser);
    return { previous };
  },
  onError: (_err, _user, context) => {
    // Rollback en cas d'erreur
    if (context?.previous) {
      queryClient.setQueryData(['users', context.previous.id], context.previous);
    }
  },
  onSettled: (_data, _error, user) => {
    queryClient.invalidateQueries({ queryKey: ['users', user.id] });
  },
});
```

### Comparaison avec Angular

| Concept | TanStack Query (React) | Angular |
|---------|------------------------|---------|
| Fetch | `useQuery({ queryFn })` | `HttpClient.get()` |
| Cache | Automatique par queryKey | Manuel (où `resource()` Angular 19+) |
| Loading state | `isLoading`, `isFetching` | `resource().isLoading()` ou manuel |
| Erreur | `isError`, `error` | `resource().error()` ou `catchError` |
| Invalidation | `invalidateQueries()` | Manuel (`resource().reload()`) |
| Mutation | `useMutation()` | `HttpClient.post/put/delete` |
| DevTools | ✅ React Query Devtools | ❌ (Angular DevTools basique) |

```typescript
// Angular 19+ — resource() API (le plus proche de TanStack Query)
@Component({ /* ... */ })
export class UserListComponent {
  private http = inject(HttpClient);

  users = resource({
    loader: () => firstValueFrom(this.http.get<User[]>('/api/users')),
  });
  // users.value(), users.isLoading(), users.error()
}
```

### Quand utiliser quoi : TanStack Query vs Zustand

| Type de donnée | Outil recommandé | Pourquoi |
|---------------|------------------|----------|
| Liste de produits (API) | TanStack Query | État serveur, cache, refetch |
| Utilisateur connecté | TanStack Query ou Context | Vient du serveur, change rarement |
| Thème light/dark | Zustand ou Context | État client pur |
| Sidebar ouverte/fermée | useState local | État UI local |
| Formulaire en cours | useState ou React Hook Form | État local temporaire |
| Panier d'achat | Zustand + persist | État client persisté |
| Résultats de recherche | TanStack Query | État serveur paginé |

> **Règle d'or** : si la donnée existe dans une base de données quelque part, c'est de l'état serveur, donc TanStack Query. Si c'est purement frontend, c'est Zustand/Context.

---

## Pratique

Créez une page de gestion de tâches avec TanStack Query :

1. Un `useQuery` pour charger les tâches depuis une API simulée
2. Un `useMutation` pour ajouter une tâche avec invalidation du cache
3. Un `useMutation` pour supprimer une tâche
4. Affichez les états loading, error et success

<details>
<summary>Solution</summary>

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

// API simulée
let fakeTasks: Task[] = [
  { id: 1, title: 'Apprendre TanStack Query', completed: false },
  { id: 2, title: 'Comprendre le cache', completed: true },
];

const api = {
  getTasks: async (): Promise<Task[]> => {
    await new Promise((r) => setTimeout(r, 500));
    return [...fakeTasks];
  },
  addTask: async (title: string): Promise<Task> => {
    await new Promise((r) => setTimeout(r, 300));
    const task = { id: Date.now(), title, completed: false };
    fakeTasks.push(task);
    return task;
  },
  deleteTask: async (id: number): Promise<void> => {
    await new Promise((r) => setTimeout(r, 300));
    fakeTasks = fakeTasks.filter((t) => t.id !== id);
  },
};

function TaskManager() {
  const [newTitle, setNewTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
  });

  const addMutation = useMutation({
    mutationFn: api.addTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) return <p>Chargement des tâches...</p>;
  if (isError) return <p>Erreur : {(error as Error).message}</p>;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newTitle.trim()) addMutation.mutate(newTitle);
        }}
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nouvelle tâche"
        />
        <button type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>

      <ul>
        {tasks?.map((task) => (
          <li key={task.id}>
            {task.title}
            <button
              onClick={() => deleteMutation.mutate(task.id)}
              disabled={deleteMutation.isPending}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| État serveur | Données qui vivent sur le backend — TanStack Query les gère |
| `useQuery` | Fetch + cache + refetch automatique |
| `queryKey` | Identifiant unique du cache (tableau hiérarchique) |
| `staleTime` | Durée de « fraîcheur » des données (0 par défaut) |
| `useMutation` | Pour les opérations d'écriture (POST, PUT, DELETE) |
| `invalidateQueries` | Force le refetch après une mutation |
| Mise à jour optimiste | `onMutate` pour un UX instantané avec rollback |
| vs Zustand | TanStack Query = état serveur, Zustand = état client |

---

> **Prochain cours** : [Cours 18 — React Router : navigation basique](../04-routing/01-react-router-basique.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [08-context-theme](../../exercices/08-context-theme/ENONCE)
2. **Exercice** : [09-zustand-store](../../exercices/09-zustand-store/ENONCE)
3. **Exercice** : [10-react-query](../../exercices/10-react-query/ENONCE)
:::
