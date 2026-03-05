# Correction — Exercice 09 : Zustand store

## Resultat attendu

Une application de gestion de taches avec un champ d'ajout, une liste filtrable (Toutes/Actives/Completees), un compteur de taches restantes, et persistance dans le localStorage. L'etat survit au rechargement de la page.

---

## Code corrige

### `src/exercises/ex09/types.ts`

```ts
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export type FilterStatus = "all" | "active" | "completed";
```

### `src/exercises/ex09/useTaskStore.ts`

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, FilterStatus } from "./types";

// --- Interface du store : etat + actions ---
interface TaskState {
  // Etat
  tasks: Task[];
  filter: FilterStatus;

  // Actions
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  setFilter: (filter: FilterStatus) => void;
  clearCompleted: () => void;

  // Selecteurs (fonctions derivees)
  getFilteredTasks: () => Task[];
  getRemainingCount: () => number;
}

/**
 * Store Zustand pour la gestion des taches.
 * Utilise le middleware `persist` pour sauvegarder dans localStorage.
 */
export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      // --- Etat initial ---
      tasks: [],
      filter: "all",

      // --- Actions ---

      addTask: (title: string) => {
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: title.trim(),
          completed: false,
          createdAt: new Date(),
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
      },

      toggleTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, completed: !task.completed } : task
          ),
        }));
      },

      deleteTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },

      setFilter: (filter: FilterStatus) => {
        set({ filter });
      },

      clearCompleted: () => {
        set((state) => ({
          tasks: state.tasks.filter((task) => !task.completed),
        }));
      },

      // --- Selecteurs ---
      // Utilisent get() pour acceder a l'etat courant

      getFilteredTasks: (): Task[] => {
        const { tasks, filter } = get();

        switch (filter) {
          case "active":
            return tasks.filter((t) => !t.completed);
          case "completed":
            return tasks.filter((t) => t.completed);
          case "all":
          default:
            return tasks;
        }
      },

      getRemainingCount: (): number => {
        return get().tasks.filter((t) => !t.completed).length;
      },
    }),
    {
      // Configuration du middleware persist
      name: "task-store", // cle dans localStorage
    }
  )
);
```

### `src/exercises/ex09/TaskInput.tsx`

```tsx
import { useState } from "react";
import { useTaskStore } from "./useTaskStore";

/**
 * Composant TaskInput
 * Champ de saisie pour ajouter une nouvelle tache.
 */
export default function TaskInput() {
  const [title, setTitle] = useState<string>("");

  // Selecteur precis : on ne souscrit qu'a l'action addTask
  const addTask = useTaskStore((s) => s.addTask);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() === "") return;
    addTask(title);
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="task-input">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nouvelle tache..."
        aria-label="Titre de la tache"
      />
      <button type="submit">Ajouter</button>
    </form>
  );
}
```

### `src/exercises/ex09/TaskList.tsx`

```tsx
import { useTaskStore } from "./useTaskStore";

/**
 * Composant TaskList
 * Affiche les taches filtrees avec bascule et suppression.
 */
export default function TaskList() {
  // Selecteurs pour les actions
  const getFilteredTasks = useTaskStore((s) => s.getFilteredTasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  // Appeler le selecteur pour obtenir les taches filtrees
  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    return <p className="task-list__empty">Aucune tache a afficher.</p>;
  }

  return (
    <ul className="task-list">
      {filteredTasks.map((task) => (
        <li key={task.id} className="task-list__item">
          <label>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
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
            onClick={() => deleteTask(task.id)}
            type="button"
            aria-label={`Supprimer ${task.title}`}
          >
            Supprimer
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### `src/exercises/ex09/TaskFilters.tsx`

```tsx
import { useTaskStore } from "./useTaskStore";
import type { FilterStatus } from "./types";

/**
 * Composant TaskFilters
 * Boutons de filtre et compteur de taches restantes.
 */
export default function TaskFilters() {
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const getRemainingCount = useTaskStore((s) => s.getRemainingCount);
  const clearCompleted = useTaskStore((s) => s.clearCompleted);

  const remainingCount = getRemainingCount();

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "Toutes", value: "all" },
    { label: "Actives", value: "active" },
    { label: "Completees", value: "completed" },
  ];

  return (
    <div className="task-filters">
      <div className="task-filters__buttons">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            type="button"
            style={{ fontWeight: filter === value ? "bold" : "normal" }}
            aria-pressed={filter === value}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="task-filters__count">
        {remainingCount} tache{remainingCount > 1 ? "s" : ""} restante
        {remainingCount > 1 ? "s" : ""}
      </p>

      <button onClick={clearCompleted} type="button">
        Supprimer les completees
      </button>
    </div>
  );
}
```

### `src/exercises/ex09/App.tsx`

```tsx
import TaskInput from "./TaskInput";
import TaskList from "./TaskList";
import TaskFilters from "./TaskFilters";

/**
 * Composant racine de l'exercice 09.
 * Pas besoin de Provider avec Zustand : le store est global.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 09 — Zustand store</h1>
      <TaskInput />
      <TaskFilters />
      <TaskList />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Souscrire a tout le store sans selecteur

- ❌ `const store = useTaskStore();`
  Le composant se re-rend a chaque changement dans le store, meme si seul `filter` a change.
- ✅ `const addTask = useTaskStore((s) => s.addTask);`
  Le composant ne se re-rend que si `addTask` change (ce qui n'arrive jamais pour une fonction).

### 2. Oublier le middleware `persist`

- ❌ `create<TaskState>()((set, get) => ({ ... }))`
  L'etat est perdu au rechargement de la page.
- ✅ `create<TaskState>()(persist((set, get) => ({ ... }), { name: "task-store" }))`
  L'etat est automatiquement sauvegarde et restaure depuis `localStorage`.

### 3. Muter l'etat dans les actions

- ❌ `state.tasks.push(newTask)` a l'interieur de `set`.
  Zustand utilise l'immutabilite par defaut, la mutation ne declenche pas de re-render.
- ✅ `set((state) => ({ tasks: [...state.tasks, newTask] }))`
  Nouveau tableau = nouvelle reference.

### 4. Ne pas typer l'interface du store

- ❌ `const useTaskStore = create((set) => ({ ... }))` sans interface.
  TypeScript infere les types, mais ils peuvent etre implicites et imprecis.
- ✅ `create<TaskState>()(...)` avec une interface explicite garantit le typage strict.

---

## Concepts cles utilises

| Concept             | Description                                                          | Documentation                              |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `create`            | Creer un store Zustand avec etat et actions                          | [Zustand docs](https://docs.pmnd.rs/zustand/getting-started/introduction) |
| Selecteurs          | Fonctions qui extraient une partie du store pour eviter les re-renders | [Zustand docs](https://docs.pmnd.rs/zustand/guides/auto-generating-selectors) |
| `persist` middleware | Sauvegarder l'etat dans localStorage automatiquement                | [Zustand docs](https://docs.pmnd.rs/zustand/integrations/persisting-store-data) |
| `set` / `get`       | Fonctions Zustand pour modifier et lire l'etat                      | API Zustand |
| Immutabilite        | Creer de nouvelles references dans les actions                       | Bonne pratique |

---

## Pour aller plus loin

- Ajoute le middleware `devtools` pour debugger avec les Redux DevTools.
- Cree un hook `useFilteredTasks` qui utilise `useShallow` pour une souscription optimisee.
- Ajoute des categories aux taches et un filtre supplementaire.
