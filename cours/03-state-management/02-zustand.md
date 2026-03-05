# Cours 15 — Zustand : state management simple et performant

> **Objectif** : Découvrir Zustand, la librairie de state management la plus populaire de l'écosystème React pour sa simplicité et ses performances. Apprendre à créer des stores, utiliser des selectors, et configurer les middlewares essentiels. Comparer avec Pinia (Vue) et comprendre quand choisir Zustand plutôt que Context.

---

## Rappel du cours précédent

<details>
<summary>1. Pourquoi le Context API n'est-il pas adapté aux mises à jour fréquentes ?</summary>

Parce que chaque changement de valeur dans un Context provoque le re-render de **tous** les composants qui consomment ce Context, même s'ils n'utilisent qu'une partie de la valeur.
</details>

<details>
<summary>2. Quel pattern permet de limiter les re-renders inutiles avec Context ?</summary>

Séparer les Contexts par domaine (un Context pour le thème, un pour l'auth, un pour la locale) plutôt que de tout regrouper dans un seul Context.
</details>

<details>
<summary>3. Pourquoi est-il recommandé de créer un hook personnalisé pour chaque Context ?</summary>

Pour encapsuler la vérification du Provider (`if (!context) throw new Error(...)`) et offrir une API typée et claire aux consommateurs. Cela évite aussi de répéter `useContext(MonContext)` partout.
</details>

---

## Analogie

Si le Context est un **réseau Wi-Fi d'immeuble** (tout le monde capte le même signal), Zustand est une **boîte aux lettres intelligente** : chaque résident peut s'abonner uniquement aux courriers qui l'intéressent. Quand une lettre arrive pour le 3e étage, seul le 3e est notifié. C'est exactement ce que font les **selectors** de Zustand : un composant ne re-rend que si la donnée qu'il sélectionne a réellement changé.

---

## Théorie

### Pourquoi Zustand ?

| Critère | Context API | Zustand |
|---------|-------------|---------|
| Boilerplate | Moyen (Provider, Context, hook) | Minimal (1 fichier) |
| Provider requis | ✅ Oui | ❌ Non |
| Re-renders sélectifs | ❌ Non (tout re-rend) | ✅ Oui (via selectors) |
| Devtools | ❌ Non | ✅ Oui (middleware) |
| Persistance | Manuel | ✅ Middleware intégré |
| Taille | 0 Ko (natif) | ~1.1 Ko gzippé |
| Courbe d'apprentissage | Faible | Faible |

### Installation

```bash
npm install zustand
```

### Créer un store basique

```tsx
import { create } from 'zustand';

// ✅ Le store contient state ET actions au même endroit
interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### Consommer le store avec des selectors

```tsx
// ❌ Sans selector : le composant re-rend pour TOUT changement du store
function Counter() {
  const store = useCounterStore();
  return <span>{store.count}</span>;
}

// ✅ Avec selector : re-rend UNIQUEMENT quand count change
function Counter() {
  const count = useCounterStore((state) => state.count);
  return <span>{count}</span>;
}

// ✅ Sélectionner une action (les fonctions ne changent jamais, pas de re-render)
function IncrementButton() {
  const increment = useCounterStore((state) => state.increment);
  return <button onClick={increment}>+1</button>;
}
```

> **Règle d'or** : toujours utiliser un selector pour extraire uniquement ce dont le composant a besoin.

### Store plus réaliste : gestion de tâches

```tsx
interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskStore {
  tasks: Task[];
  filter: 'all' | 'active' | 'completed';
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setFilter: (filter: TaskStore['filter']) => void;
}

const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  filter: 'all',

  addTask: (title) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        { id: crypto.randomUUID(), title, completed: false },
      ],
    })),

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

  setFilter: (filter) => set({ filter }),
}));
```

### Selectors dérivés (computed values)

```tsx
// ✅ Selector dérivé — équivalent d'un computed/getter
function TaskCounter() {
  const activeCount = useTaskStore(
    (state) => state.tasks.filter((t) => !t.completed).length
  );

  return <span>{activeCount} tâches restantes</span>;
}

// ✅ Selector qui combine plusieurs valeurs
function FilteredTaskList() {
  const filteredTasks = useTaskStore((state) => {
    switch (state.filter) {
      case 'active':
        return state.tasks.filter((t) => !t.completed);
      case 'completed':
        return state.tasks.filter((t) => t.completed);
      default:
        return state.tasks;
    }
  });

  return (
    <ul>
      {filteredTasks.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### Middlewares essentiels

#### `persist` — Sauvegarder dans le localStorage

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light' as const,
      fontSize: 16,
      setTheme: (theme: 'light' | 'dark') => set({ theme }),
      setFontSize: (fontSize: number) => set({ fontSize }),
    }),
    {
      name: 'settings-storage', // Clé dans le localStorage
    }
  )
);
```

#### `devtools` — Intégration Redux DevTools

```tsx
import { devtools } from 'zustand/middleware';

const useTaskStore = create<TaskStore>()(
  devtools(
    (set) => ({
      tasks: [],
      addTask: (title) =>
        set(
          (state) => ({ tasks: [...state.tasks, /* ... */] }),
          false,
          'addTask'  // Nom de l'action dans les DevTools
        ),
    }),
    { name: 'TaskStore' }
  )
);
```

#### `immer` — Mutations immutables simplifiées

```tsx
import { immer } from 'zustand/middleware/immer';

const useTaskStore = create<TaskStore>()(
  immer((set) => ({
    tasks: [],
    toggleTask: (id) =>
      // ✅ On peut "muter" directement grâce à Immer
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) task.completed = !task.completed;
      }),
  }))
);
```

#### Combiner plusieurs middlewares

```tsx
const useTaskStore = create<TaskStore>()(
  devtools(
    persist(
      immer((set) => ({
        // ... state et actions
      })),
      { name: 'task-storage' }
    ),
    { name: 'TaskStore' }
  )
);
```

### Accéder au store en dehors de React

```tsx
// ✅ Utile pour des fonctions utilitaires, des intercepteurs API, etc.
const currentTasks = useTaskStore.getState().tasks;
useTaskStore.getState().addTask('Nouvelle tâche');

// S'abonner aux changements
const unsubscribe = useTaskStore.subscribe((state) => {
  console.log('Tasks changed:', state.tasks);
});
```

### Comparaison avec Pinia (Vue 3)

| Concept | Zustand (React) | Pinia (Vue 3) |
|---------|-----------------|---------------|
| Définition | `create<T>((set) => ({...}))` | `defineStore('id', () => ({...}))` |
| State | Propriétés de l'objet | `ref()` / `reactive()` |
| Actions | Fonctions dans l'objet | Fonctions retournées |
| Getters/Computed | Selectors dans le composant | `computed()` |
| Persistance | Middleware `persist` | Plugin `pinia-plugin-persistedstate` |
| DevTools | Middleware `devtools` | Intégré nativement |
| Provider | ❌ Aucun requis | ❌ Aucun requis (plugin Pinia) |

```typescript
// Pinia — équivalent du TaskStore
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const filter = ref<'all' | 'active' | 'completed'>('all');

  function addTask(title: string) {
    tasks.value.push({ id: crypto.randomUUID(), title, completed: false });
  }

  const activeTasks = computed(() => tasks.value.filter(t => !t.completed));

  return { tasks, filter, addTask, activeTasks };
});
```

### Quand choisir Zustand vs Context ?

| Critère | Context API | Zustand |
|---------|-------------|---------|
| Données qui changent rarement | ✅ Thème, auth, locale | Surdimensionné |
| État applicatif fréquent | ❌ Re-renders excessifs | ✅ Selectors performants |
| Plusieurs composants consomment | Acceptable si peu fréquent | ✅ Optimal |
| Besoin de persistance | Manuel | ✅ Middleware intégré |
| Debugging | Limité | ✅ DevTools |
| Pas de dépendance externe | ✅ Natif React | ❌ Librairie tierce |

---

## Pratique

Créez un store Zustand pour un panier d'achat :

1. Interface `CartItem` avec `id`, `name`, `price`, `quantity`
2. Actions : `addItem`, `removeItem`, `updateQuantity`, `clearCart`
3. Selector dérivé : total du panier
4. Middleware `persist` pour sauvegarder dans le localStorage
5. Un composant `CartSummary` qui affiche le nombre d'articles et le total

<details>
<summary>Solution</summary>

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i
          ).filter((i) => i.quantity > 0),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
);

// Composant
function CartSummary() {
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const total = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const clearCart = useCartStore((state) => state.clearCart);

  return (
    <div>
      <p>{itemCount} article(s) — {total.toFixed(2)} EUR</p>
      <button onClick={clearCart}>Vider le panier</button>
    </div>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| `create<T>()` | Crée un store avec state et actions en une seule fonction |
| Selectors | `useStore(s => s.value)` pour ne re-rendre que si `value` change |
| Pas de Provider | Le store est global, accessible partout sans wrapper |
| `persist` | Sauvegarde automatique dans le localStorage |
| `devtools` | Intégration Redux DevTools pour le debugging |
| `immer` | Permet des mutations « directes » avec immutabilité sous le capot |
| vs Pinia | API très similaire, Zustand est le « Pinia de React » |
| vs Context | Zustand pour l'état fréquent, Context pour les données stables |

---

> **Prochain cours** : [Cours 16 — Redux Toolkit : state management structuré pour les grandes équipes](./03-redux-toolkit.md)
