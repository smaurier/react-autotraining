# Correction — Exercice 10 : React Query CRUD

## Resultat attendu

Une application de gestion de taches connectee a une API REST (json-server). Les taches se chargent au montage, on peut en creer, en basculer et en supprimer. Le cache se met a jour automatiquement apres chaque mutation. Les etats de chargement et d'erreur sont geres.

---

## Code corrige

### `src/exercises/ex10/db.json`

```json
{
  "tasks": [
    { "id": "1", "title": "Apprendre React Query", "completed": false },
    { "id": "2", "title": "Configurer json-server", "completed": true },
    { "id": "3", "title": "Implementer le CRUD", "completed": false }
  ]
}
```

### `src/exercises/ex10/api.ts`

```ts
// --- Types ---
export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export type CreateTaskPayload = Omit<Task, "id">;

const BASE_URL = "http://localhost:3001";

// --- Fonctions API ---

/** Recuperer toutes les taches */
export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${BASE_URL}/tasks`);
  if (!response.ok) {
    throw new Error(`Erreur HTTP : ${response.status}`);
  }
  return response.json() as Promise<Task[]>;
}

/** Creer une nouvelle tache */
export async function createTask(task: CreateTaskPayload): Promise<Task> {
  const response = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) {
    throw new Error(`Erreur creation : ${response.status}`);
  }
  return response.json() as Promise<Task>;
}

/** Mettre a jour une tache existante */
export async function updateTask(task: Task): Promise<Task> {
  const response = await fetch(`${BASE_URL}/tasks/${task.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) {
    throw new Error(`Erreur mise a jour : ${response.status}`);
  }
  return response.json() as Promise<Task>;
}

/** Supprimer une tache */
export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Erreur suppression : ${response.status}`);
  }
}
```

### `src/exercises/ex10/TaskManager.tsx`

```tsx
import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
} from "./api";

/**
 * Composant TaskManager
 * CRUD complet avec TanStack Query.
 */
export default function TaskManager() {
  const [newTitle, setNewTitle] = useState<string>("");
  const queryClient = useQueryClient();

  // --- useQuery : lecture des taches ---
  const {
    data: tasks,
    isLoading,
    isError,
    error,
  } = useQuery<Task[], Error>({
    queryKey: ["tasks"] as const,
    queryFn: fetchTasks,
  });

  // --- useMutation : creation ---
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      // Invalider le cache pour declencher un refetch
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // --- useMutation : mise a jour (avec mise a jour optimiste) ---
  const updateMutation = useMutation({
    mutationFn: updateTask,
    // Mise a jour optimiste
    onMutate: async (updatedTask: Task) => {
      // 1. Annuler les requetes en cours pour eviter les conflits
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // 2. Sauvegarder l'etat precedent pour un eventuel rollback
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

      // 3. Mettre a jour le cache de maniere optimiste
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) => (t.id === updatedTask.id ? updatedTask : t)) ?? []
      );

      // 4. Retourner le contexte pour le rollback
      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      // Refetch pour s'assurer de la synchronisation
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // --- useMutation : suppression ---
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // --- Handlers ---

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() === "") return;
    createMutation.mutate({ title: newTitle.trim(), completed: false });
    setNewTitle("");
  };

  const handleToggle = (task: Task) => {
    updateMutation.mutate({ ...task, completed: !task.completed });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // --- Rendu ---

  if (isLoading) {
    return <p>Chargement des taches...</p>;
  }

  if (isError) {
    return (
      <p style={{ color: "red" }}>
        Erreur : {error.message}. Verifie que json-server tourne sur le port 3001.
      </p>
    );
  }

  return (
    <div className="task-manager">
      {/* Formulaire d'ajout */}
      <form onSubmit={handleCreate} className="task-manager__form">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nouvelle tache..."
          aria-label="Titre de la nouvelle tache"
        />
        <button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      {/* Liste des taches */}
      {tasks && tasks.length === 0 ? (
        <p>Aucune tache pour le moment.</p>
      ) : (
        <ul className="task-manager__list">
          {tasks?.map((task) => (
            <li key={task.id} className="task-manager__item">
              <label>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggle(task)}
                />
                <span
                  style={{
                    textDecoration: task.completed ? "line-through" : "none",
                    opacity: task.completed ? 0.5 : 1,
                  }}
                >
                  {task.title}
                </span>
              </label>
              <button
                onClick={() => handleDelete(task.id)}
                type="button"
                disabled={deleteMutation.isPending}
                aria-label={`Supprimer ${task.title}`}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### `src/exercises/ex10/App.tsx`

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TaskManager from "./TaskManager";

// Creer une instance de QueryClient en dehors du composant
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch automatique quand la fenetre reprend le focus
      refetchOnWindowFocus: false,
      // Nombre de tentatives en cas d'erreur
      retry: 1,
    },
  },
});

/**
 * Composant racine de l'exercice 10.
 * Le QueryClientProvider fournit le client a tous les composants enfants.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <h1>Exercice 10 — React Query CRUD</h1>
        <p>
          Lance json-server : <code>npx json-server --watch db.json --port 3001</code>
        </p>
        <TaskManager />
      </main>
    </QueryClientProvider>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Ne pas invalider le cache apres une mutation

- ❌ Creer/supprimer une tache sans appeler `queryClient.invalidateQueries`.
  La liste affichee n'est plus synchronisee avec le serveur.
- ✅ `onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })`
  Force un refetch de la liste apres chaque mutation.

### 2. Creer le `QueryClient` dans le composant

- ❌ `function App() { const queryClient = new QueryClient(); ... }`
  Un nouveau client est cree a chaque render, le cache est perdu.
- ✅ `const queryClient = new QueryClient();` en dehors du composant, une seule instance.

### 3. Oublier de gerer les etats loading/error

- ❌ Ne pas afficher d'indicateur de chargement ou de message d'erreur.
  L'utilisateur ne sait pas si les donnees chargent ou si quelque chose a echoue.
- ✅ Verifier `isLoading` et `isError` avant d'afficher les donnees.

### 4. Mauvais rollback dans la mise a jour optimiste

- ❌ Oublier de sauvegarder `previousTasks` dans `onMutate`.
  En cas d'erreur, impossible de revenir a l'etat precedent.
- ✅ Sauvegarder dans le contexte et restaurer dans `onError`.

### 5. Ne pas typer les generiques de `useMutation`

- ❌ `useMutation({ mutationFn: createTask })` sans generiques.
  TypeScript peut inferer, mais les types de `onMutate` / `onError` / `context` sont imprecis.
- ✅ Laisser l'inference fonctionner a partir de `mutationFn` bien type.

---

## Concepts cles utilises

| Concept                   | Description                                                         | Documentation                              |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `useQuery`                | Hook pour lire des donnees avec cache et refetch automatique        | [TanStack](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery) |
| `useMutation`             | Hook pour les operations d'ecriture (create, update, delete)        | [TanStack](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation) |
| `queryClient.invalidateQueries` | Forcer le refetch d'une query apres une mutation             | [TanStack](https://tanstack.com/query/latest/docs/reference/QueryClient#queryclientinvalidatequeries) |
| Mise a jour optimiste     | Mettre a jour l'UI avant la reponse serveur avec rollback possible  | [TanStack](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) |
| `QueryClientProvider`     | Provider qui fournit le client a l'arbre de composants              | [TanStack](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider) |

---

## Pour aller plus loin

- Ajoute un filtre par statut avec des `queryKey` differentes (`["tasks", { status: "active" }]`).
- Utilise `useSuspenseQuery` avec un composant `<Suspense>` pour le chargement.
- Ajoute de la pagination avec `keepPreviousData` et des boutons Precedent/Suivant.
