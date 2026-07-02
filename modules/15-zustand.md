---
titre: Zustand — state global simple et performant
cours: 04-react
notions: [store global sans Provider, create curried avec TypeScript, sélecteurs pour cibler les re-renders, useShallow pour sélections multiples, actions colocalisées dans le store, middleware persist, middleware devtools, accès au store hors React, Zustand vs Context]
outcomes: [créer un store Zustand v5 typé avec create curried, cibler les re-renders avec des sélecteurs et useShallow, brancher les middlewares persist et devtools, choisir entre Zustand et Context selon la fréquence de mise à jour]
prerequis: [14-context-api]
next: 16-redux-toolkit
libs: [{ name: react, version: "^19" }, { name: zustand, version: "^5" }]
tribuzen: store global de la session admin TribuZen (familles sélectionnées, filtres, notifications) + persistance du thème
last-reviewed: 2026-07
---

# Zustand — state global simple et performant

> **Outcomes — tu sauras FAIRE :** créer un store Zustand v5 typé avec `create` curried, cibler les re-renders avec des sélecteurs et `useShallow`, brancher les middlewares `persist` et `devtools`, choisir entre Zustand et Context.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu reprends l'admin TribuZen. Le tableau de bord affiche la liste des familles, une barre de filtres, un compteur de notifications et un thème clair/sombre. Tout ça était géré par un seul Context :

```tsx
// AdminContext.tsx — AVANT Zustand
interface AdminState {
  selectedFamilyIds: string[];
  filters: { search: string; status: 'all' | 'active' | 'pending' };
  notifications: Notification[];
  theme: 'light' | 'dark';
  toggleFamily: (id: string) => void;
  setSearch: (q: string) => void;
  markAllRead: () => void;
  toggleTheme: () => void;
}

const AdminContext = createContext<AdminState | null>(null);

function AdminProvider({ children }: { children: React.ReactNode }) {
  const [selectedFamilyIds, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({ search: '', status: 'all' as const });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // ... 4 fonctions + un objet value recréé à chaque render
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
```

**Trois problèmes concrets, mesurés dans le profiler :**
1. Taper une lettre dans la recherche (`setSearch`) re-rend **toute** la liste de familles, la top-bar, la cloche de notifications — alors que seule la barre de filtres a changé.
2. Le `value` est un objet recréé à chaque render : tout consommateur re-rend même si sa part de state est inchangée.
3. Le thème n'est pas persisté — recharger la page repasse en clair. Il faut câbler `localStorage` à la main dans un `useEffect`.

Zustand résout les trois d'un coup : sélecteurs granulaires, pas de Provider qui recrée un objet, et persistance en une ligne de middleware. Ce module te montre comment.

---

## 2. Théorie complète, concise

### 2.1 Un store sans Provider

Un store Zustand est un **hook** créé une fois, importable partout. Pas de `<Provider>` à monter, pas d'arbre de contexte.

```tsx
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
}

// useCounterStore est un hook prêt à l'emploi, global
const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

Le store vit hors de l'arbre React. N'importe quel composant l'importe et le lit — aucune configuration de Provider. C'est la différence structurelle majeure avec Context, qui exige un Provider ancêtre.

### 2.2 `create` curried avec TypeScript

En TypeScript, Zustand v5 impose la forme **curried** : `create<T>()(initializer)` — `create<T>()` puis un second appel avec la fonction d'initialisation.

```tsx
// ✅ Forme curried : create<T>()(...) — les () vides après <T> sont OBLIGATOIRES
const useStore = create<CounterStore>()((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// ❌ Forme non-curried avec type explicite : l'inférence des middlewares casse
const useStore2 = create<CounterStore>((set) => ({ /* ... */ }));
```

**Pourquoi ce `()` vide ?** C'est un contournement d'une limite de TypeScript (inférence partielle des génériques). Sans lui, dès qu'on ajoute un middleware, les types se cassent. Règle simple : **avec TypeScript, toujours `create<T>()(...)`**. Sans middleware ni type explicite, la forme courte `create((set) => ...)` reste tolérée, mais on prend l'habitude du curried.

### 2.3 Sélecteurs — cibler les re-renders

Appeler le hook sans argument abonne le composant à **tout** le store. Un sélecteur n'abonne qu'à la tranche retournée : le composant ne re-rend que si cette tranche change (comparaison `Object.is`).

```tsx
// ❌ Sans sélecteur : re-rend à CHAQUE changement du store (même count inchangé)
function BadCounter() {
  const store = useCounterStore();
  return <span>{store.count}</span>;
}

// ✅ Avec sélecteur : re-rend UNIQUEMENT quand count change
function Counter() {
  const count = useCounterStore((s) => s.count);
  return <span>{count}</span>;
}

// ✅ Sélectionner une action : les fonctions sont stables → zéro re-render induit
function IncrementButton() {
  const increment = useCounterStore((s) => s.increment);
  return <button onClick={increment}>+1</button>;
}
```

> **Règle d'or :** toujours sélectionner la plus petite tranche utile. Un composant qui ne lit que `count` ne doit jamais s'abonner à `tasks`.

### 2.4 `useShallow` pour les sélections multiples

Quand un sélecteur retourne un **nouvel objet ou tableau** (plusieurs valeurs d'un coup), `Object.is` le voit comme différent à chaque render → re-render permanent. En Zustand v5, la solution est `useShallow` (import depuis `zustand/react/shallow`), qui compare le résultat champ par champ.

```tsx
import { useShallow } from 'zustand/react/shallow';

// ❌ Nouvel objet à chaque render → re-render en boucle
function BadFilters() {
  const { search, status } = useTaskStore((s) => ({
    search: s.filter.search,
    status: s.filter.status,
  }));
  // { ... } est recréé à chaque appel → référence toujours nouvelle
}

// ✅ useShallow compare superficiellement les champs → re-rend si l'un change
function Filters() {
  const { search, status } = useTaskStore(
    useShallow((s) => ({ search: s.filter.search, status: s.filter.status })),
  );
  return <input value={search} /* ... */ />;
}
```

> En v5, l'ancien deuxième argument `useStore(selector, equalityFn)` de la v4 a été retiré. `useShallow` (ou `useStoreWithEqualityFn` pour un cas custom) est la voie officielle. Alternative simple : faire **un sélecteur par valeur** (`const search = useStore(s => s.filter.search)`), qui évite le problème sans `useShallow`.

### 2.5 Actions colocalisées dans le store

Contrairement à `useReducer`, il n'y a pas d'objet `dispatch` séparé : les actions sont des fonctions **définies dans le store**, à côté du state. Elles appellent `set` (fusion superficielle du state) et peuvent lire l'état courant via `get`.

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
  setFilter: (f: TaskStore['filter']) => void;
  activeCount: () => number; // action de lecture (dérivée)
}

const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  filter: 'all',

  // set((state) => partiel) : Zustand fusionne le partiel dans le state
  addTask: (title) =>
    set((state) => ({
      tasks: [...state.tasks, { id: crypto.randomUUID(), title, completed: false }],
    })),

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    })),

  setFilter: (filter) => set({ filter }), // set(objet) direct quand pas besoin de l'ancien state

  // get() lit le state courant hors d'un composant
  activeCount: () => get().tasks.filter((t) => !t.completed).length,
}));
```

`set` fait un **merge de premier niveau** : `set({ filter })` ne touche pas `tasks`. Attention, ce n'est *pas* profond — pour muter du state imbriqué, on étale (`...`) ou on branche le middleware `immer`.

### 2.6 Sélecteurs dérivés (computed)

Zustand n'a pas de `computed` intégré comme Pinia. On dérive **dans le sélecteur** : c'est recalculé au render, et le composant ne re-rend que si le résultat change.

```tsx
// Dérivation dans le sélecteur — équivalent d'un getter
function TaskCounter() {
  const activeCount = useTaskStore((s) => s.tasks.filter((t) => !t.completed).length);
  return <span>{activeCount} tâches restantes</span>;
}

// Sélecteur qui filtre selon un autre morceau du state
function FilteredList() {
  const visible = useTaskStore((s) => {
    switch (s.filter) {
      case 'active': return s.tasks.filter((t) => !t.completed);
      case 'completed': return s.tasks.filter((t) => t.completed);
      default: return s.tasks;
    }
  });
  return (
    <ul>
      {visible.map((t) => <li key={t.id}>{t.title}</li>)}
    </ul>
  );
}
```

> Un sélecteur qui retourne un **nouveau tableau** (comme `filter(...)`) recrée une référence à chaque render. Si la perf compte, enveloppe avec `useShallow` ou mémorise, sinon le coût reste négligeable pour des listes courtes.

### 2.7 Middleware `persist` — sauvegarde automatique

`persist` sérialise le state (par défaut dans `localStorage`) et le réhydrate au chargement. Une ligne remplace le `useEffect` manuel du cas concret.

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'tribuzen-theme', // clé dans localStorage
      // partialize : ne persister QUE le thème, jamais les actions ni le volatile
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
```

`partialize` évite de sérialiser ce qui n'a pas à survivre (données volatiles, gros tableaux). Sans lui, tout le state persistable est écrit.

### 2.8 Middleware `devtools` — Redux DevTools

`devtools` connecte le store à l'extension Redux DevTools : historique des actions, time-travel, inspection du state.

```tsx
import { devtools } from 'zustand/middleware';

const useTaskStore = create<TaskStore>()(
  devtools(
    (set) => ({
      tasks: [],
      // 3e arg de set : nom lisible de l'action dans les DevTools
      addTask: (title) =>
        set(
          (s) => ({ tasks: [...s.tasks, { id: crypto.randomUUID(), title, completed: false }] }),
          undefined,
          'tasks/add',
        ),
    }),
    { name: 'TaskStore' },
  ),
);
```

**Ordre de composition avec plusieurs middlewares** — `devtools` à l'extérieur, `persist` au milieu, `immer` au plus près de l'initializer :

```tsx
import { immer } from 'zustand/middleware/immer';

const useTaskStore = create<TaskStore>()(
  devtools(
    persist(
      immer((set) => ({
        tasks: [],
        toggleTask: (id) =>
          set((state) => {
            // immer : on "mute" directement, l'immutabilité est gérée sous le capot
            const t = state.tasks.find((x) => x.id === id);
            if (t) t.completed = !t.completed;
          }),
      })),
      { name: 'tribuzen-tasks' },
    ),
    { name: 'TaskStore' },
  ),
);
```

### 2.9 Accéder au store hors de React

Le hook expose des méthodes statiques : `getState`, `setState`, `subscribe`. Utile dans un intercepteur API, un utilitaire, un test — partout où il n'y a pas de composant.

```tsx
// Lire / agir hors composant (ex. intercepteur axios, fonction utilitaire)
const currentTasks = useTaskStore.getState().tasks;
useTaskStore.getState().addTask('Relancer la famille Martin');

// S'abonner aux changements (retourne une fonction de désabonnement)
const unsubscribe = useTaskStore.subscribe((state) => {
  console.log('tasks changed:', state.tasks.length);
});
```

### 2.10 Zustand vs Context — quand choisir quoi

| Critère | Context API | Zustand |
|---|---|---|
| Provider requis | Oui (ancêtre obligatoire) | Non (store global) |
| Re-renders sélectifs | Non — tous les consommateurs re-rendent | Oui — via sélecteurs |
| Données stables (thème, locale, user) | Idéal | OK mais surdimensionné |
| État qui change souvent (filtres, listes) | Re-renders excessifs | Optimal |
| Persistance | `useEffect` manuel | Middleware `persist` |
| Devtools / time-travel | Non | Middleware `devtools` |
| Dépendance externe | Aucune (natif) | ~1 Ko gzip |

**Heuristique :** Context pour l'état **stable et peu fréquent** (thème, utilisateur connecté, langue) ; Zustand dès que l'état **change souvent** et que plusieurs composants en lisent des tranches différentes.

> **Rapprochement Vue :** Zustand est le « Pinia de React ». `create<T>()(...)` ≈ `defineStore`, les actions dans le store ≈ actions Pinia, les sélecteurs ≈ `computed` (mais côté composant, pas dans le store), `persist` ≈ `pinia-plugin-persistedstate`. Aucun des deux n'exige de Provider fonctionnel autour de l'app.

---

## 3. Worked examples

### Exemple 1 — Le store de session admin TribuZen

On remplace l'`AdminContext` du cas concret par un store Zustand découpé : state + actions colocalisées, `persist` limité au thème via `partialize`, `devtools` pour tracer.

```tsx
// ─── src/stores/adminStore.ts ───────────────────────────────────
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface Notification {
  id: string;
  message: string;
  read: boolean;
}

interface AdminStore {
  // --- state ---
  selectedFamilyIds: string[];
  filters: { search: string; status: 'all' | 'active' | 'pending' };
  notifications: Notification[];
  theme: 'light' | 'dark';
  // --- actions ---
  toggleFamily: (id: string) => void;
  setSearch: (search: string) => void;
  setStatus: (status: AdminStore['filters']['status']) => void;
  pushNotification: (message: string) => void;
  markAllRead: () => void;
  toggleTheme: () => void;
}

export const useAdminStore = create<AdminStore>()(
  devtools(
    persist(
      (set) => ({
        selectedFamilyIds: [],
        filters: { search: '', status: 'all' },
        notifications: [],
        theme: 'light',

        // Ajoute ou retire l'id du tableau de sélection
        toggleFamily: (id) =>
          set(
            (state) => ({
              selectedFamilyIds: state.selectedFamilyIds.includes(id)
                ? state.selectedFamilyIds.filter((x) => x !== id)
                : [...state.selectedFamilyIds, id],
            }),
            undefined,
            'admin/toggleFamily',
          ),

        // set imbriqué : on étale filters pour ne pas écraser status
        setSearch: (search) =>
          set(
            (state) => ({ filters: { ...state.filters, search } }),
            undefined,
            'admin/setSearch',
          ),

        setStatus: (status) =>
          set(
            (state) => ({ filters: { ...state.filters, status } }),
            undefined,
            'admin/setStatus',
          ),

        pushNotification: (message) =>
          set(
            (state) => ({
              notifications: [
                ...state.notifications,
                { id: crypto.randomUUID(), message, read: false },
              ],
            }),
            undefined,
            'admin/pushNotification',
          ),

        markAllRead: () =>
          set(
            (state) => ({
              notifications: state.notifications.map((n) => ({ ...n, read: true })),
            }),
            undefined,
            'admin/markAllRead',
          ),

        toggleTheme: () =>
          set(
            (state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }),
            undefined,
            'admin/toggleTheme',
          ),
      }),
      {
        name: 'tribuzen-admin',
        // On ne persiste QUE le thème : filtres et notifs repartent à neuf à chaque session
        partialize: (state) => ({ theme: state.theme }),
      },
    ),
    { name: 'AdminStore' },
  ),
);
```

Consommation ciblée dans les composants — chacun ne s'abonne qu'à sa tranche :

```tsx
// ─── SearchBar.tsx — ne re-rend que si filters.search change ─────
import { useAdminStore } from '@/stores/adminStore';

function SearchBar() {
  const search = useAdminStore((s) => s.filters.search);
  const setSearch = useAdminStore((s) => s.setSearch);
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Rechercher une famille…"
    />
  );
}

// ─── NotificationBell.tsx — ne re-rend que si le compte non-lu change ─
function NotificationBell() {
  const unreadCount = useAdminStore(
    (s) => s.notifications.filter((n) => !n.read).length,
  );
  const markAllRead = useAdminStore((s) => s.markAllRead);
  return (
    <button onClick={markAllRead}>
      Notifications ({unreadCount})
    </button>
  );
}
```

**Ce que ce store apporte vs l'`AdminContext` :** taper dans `SearchBar` ne re-rend plus `NotificationBell` ni la liste des familles — chacun est abonné à sa propre tranche. Le thème survit au rechargement via `persist`. Et l'onglet Redux DevTools montre `admin/setSearch`, `admin/toggleFamily`… en clair.

### Exemple 2 — Sélection multiple avec `useShallow`

La barre de filtres a besoin de `search` **et** `status` ensemble. Retourner `{ search, status }` sans précaution boucle. Deux solutions correctes, côte à côte.

```tsx
import { useShallow } from 'zustand/react/shallow';
import { useAdminStore } from '@/stores/adminStore';

// ── Solution A : useShallow (une seule souscription, comparaison superficielle) ──
function FilterBar() {
  const { search, status } = useAdminStore(
    useShallow((s) => ({ search: s.filters.search, status: s.filters.status })),
  );
  const setSearch = useAdminStore((s) => s.setSearch);
  const setStatus = useAdminStore((s) => s.setStatus);

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
        <option value="all">Toutes</option>
        <option value="active">Actives</option>
        <option value="pending">En attente</option>
      </select>
    </div>
  );
}

// ── Solution B : un sélecteur par valeur (pas de useShallow nécessaire) ──
function FilterBarBis() {
  const search = useAdminStore((s) => s.filters.search);
  const status = useAdminStore((s) => s.filters.status);
  // Chaque valeur est un scalaire → Object.is suffit, aucun re-render parasite
  // ...
}
```

**Quand préférer A ou B ?** Deux ou trois valeurs → B (le plus lisible, zéro import). Beaucoup de valeurs ou un objet dérivé → A (`useShallow`), pour ne pas empiler dix appels de hook.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Consommer le store sans sélecteur

```tsx
// ❌ Abonne à TOUT le store : re-rend à chaque action, même sans rapport
function Header() {
  const store = useAdminStore();
  return <h1>Notifications : {store.notifications.length}</h1>;
}

// ✅ Sélecteur ciblé : re-rend seulement quand le nombre de notifs change
function Header() {
  const count = useAdminStore((s) => s.notifications.length);
  return <h1>Notifications : {count}</h1>;
}
```

**Pourquoi c'est faux :** sans sélecteur, la valeur suivie est l'objet store entier, qui « change » à chaque `set`. On perd tout l'avantage de Zustand sur Context.

### PIÈGE #2 — Sélecteur qui retourne un nouvel objet sans `useShallow`

```tsx
// ❌ { ... } est une nouvelle référence à chaque render → boucle de re-render
const { search, status } = useAdminStore((s) => ({
  search: s.filters.search,
  status: s.filters.status,
}));

// ✅ useShallow compare champ par champ
const { search, status } = useAdminStore(
  useShallow((s) => ({ search: s.filters.search, status: s.filters.status })),
);
```

**Signal d'alarme :** un composant qui se re-rend en continu alors que rien ne bouge. Presque toujours un sélecteur qui fabrique un objet/tableau littéral sans `useShallow`.

### PIÈGE #3 — Oublier le `()` curried en TypeScript

```tsx
// ❌ Type explicite SANS curried → l'inférence des middlewares casse
const useStore = create<AdminStore>(persist((set) => ({ /* ... */ }), { name: 'x' }));
//                              ^ TS ne parvient plus à typer persist

// ✅ Forme curried : create<T>()(...) — obligatoire dès qu'il y a un middleware
const useStore = create<AdminStore>()(persist((set) => ({ /* ... */ }), { name: 'x' }));
```

**Pourquoi :** l'inférence partielle de génériques de TypeScript. Le `()` vide après `<AdminStore>` est le contournement officiel documenté par Zustand.

### PIÈGE #4 — Croire que `set` fait un merge profond

```tsx
// ❌ Écrase filters entier : status est perdu !
setSearch: (search) => set({ filters: { search } }),

// ✅ set ne fusionne qu'au premier niveau — on étale filters
setSearch: (search) => set((state) => ({ filters: { ...state.filters, search } })),
```

**Pourquoi c'est faux :** `set` fait un `Object.assign` de **premier niveau** seulement. Remplacer `filters` par `{ search }` supprime `status`. Pour du state imbriqué : étaler à la main, ou brancher le middleware `immer`.

### PIÈGE #5 — Mettre dans Zustand ce qui appartient à un serveur

```tsx
// ❌ Recopier des données serveur dans un store global à la main
const useUsersStore = create<{ users: User[]; fetch: () => Promise<void> }>()((set) => ({
  users: [],
  fetch: async () => set({ users: await api.getUsers() }), // pas de cache, pas de revalidation
}));

// ✅ L'état SERVEUR (fetch, cache, revalidation) → TanStack Query, pas Zustand
//    Zustand reste pour l'état CLIENT : sélection, filtres, thème, UI.
```

**Discrimination clé :** Zustand gère l'état **client** (ce que l'UI possède). L'état **serveur** (données distantes, cache, invalidation) relève de TanStack Query. Les empiler dans Zustand recrée un cache maison fragile.

---

## 5. Ancrage TribuZen

Dans l'admin web TribuZen, Zustand porte l'**état de session de l'administrateur** — tout ce qui vit le temps d'une session de travail et qui est lu par plusieurs vues.

**`useAdminStore`** (`src/stores/adminStore.ts`) — le store central du dashboard, écrit intégralement en Exemple 1 :
- `selectedFamilyIds` : les familles cochées dans la liste, lues par la barre d'actions groupées (envoyer un message, exporter) et par le compteur de sélection.
- `filters` (`search`, `status`) : pilote la liste des familles ; la `SearchBar` et le `StatusSelect` écrivent, la `FamilyList` lit — chacun via son sélecteur.
- `notifications` : la cloche affiche le nombre de non-lus (sélecteur dérivé `filter(!read).length`), `markAllRead` vide le badge.
- `theme` : seul champ **persisté** (`partialize`), pour que le clair/sombre survive au rechargement — c'est le point 6 du prompt fil-rouge.

**Découpage des stores :** on ne met **pas** tout dans un store géant. `useAdminStore` pour la session admin ; l'état serveur (familles, membres réels) passe par TanStack Query (module 05b) ; le thème pourrait même vivre dans son propre `useThemeStore` si on veut le réutiliser hors admin.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  stores/
    adminStore.ts        # session admin : sélection, filtres, notifs, thème
  components/
    admin/
      SearchBar.tsx       # lit filters.search
      StatusSelect.tsx    # lit filters.status
      NotificationBell.tsx# lit notifications (compte non-lu)
      FamilyList.tsx      # lit filters + selectedFamilyIds
```

---

## 6. Points clés

1. Un store Zustand est un **hook global** créé une fois — aucun Provider à monter, contrairement à Context.
2. En TypeScript, toujours la forme **curried** `create<T>()(...)` — le `()` vide est obligatoire dès qu'un middleware est présent.
3. Un **sélecteur** `useStore(s => s.x)` n'abonne le composant qu'à sa tranche : re-render seulement si `x` change (`Object.is`).
4. Un sélecteur qui retourne un **objet/tableau littéral** doit passer par `useShallow` (import `zustand/react/shallow`) ou être éclaté en un sélecteur par valeur.
5. Les **actions vivent dans le store**, à côté du state ; elles appellent `set` (merge de **premier niveau**) et lisent via `get`.
6. `persist` sauvegarde/réhydrate automatiquement (souvent `localStorage`) ; `partialize` limite ce qui est écrit ; `devtools` branche Redux DevTools.
7. **Zustand pour l'état client fréquent** (filtres, sélection, UI), **Context pour l'état stable** (thème, user, locale), **TanStack Query pour l'état serveur**.

---

## 7. Seeds Anki

```
En quoi un store Zustand diffère-t-il structurellement d'un Context React ?|Le store Zustand est un hook global créé une fois, importable partout sans Provider. Context exige un Provider ancêtre qui englobe les consommateurs et recrée souvent l'objet value.
Pourquoi écrit-on create<T>()(...) et pas create<T>(...) en TypeScript ?|La forme curried (le () vide après <T>) contourne la limite d'inférence partielle de génériques de TypeScript. Sans elle, dès qu'on ajoute un middleware (persist, devtools), les types se cassent.
À quoi sert un sélecteur dans Zustand et que se passe-t-il sans lui ?|Un sélecteur useStore(s => s.x) n'abonne le composant qu'à la tranche retournée : re-render seulement si elle change (Object.is). Sans sélecteur, le composant suit tout le store et re-rend à chaque action.
Quand faut-il utiliser useShallow en Zustand v5 ?|Quand un sélecteur retourne un nouvel objet ou tableau (plusieurs valeurs d'un coup). Sans useShallow, la référence est neuve à chaque render → re-render en boucle. Alternative : un sélecteur par valeur scalaire.
Le set de Zustand fait-il un merge profond ? Conséquence ?|Non : merge de premier niveau seulement (Object.assign superficiel). set({ filters: { search } }) écrase status. Il faut étaler l'objet imbriqué ({ ...state.filters, search }) ou utiliser le middleware immer.
À quoi servent les middlewares persist et devtools, et dans quel ordre les composer ?|persist sérialise/réhydrate le state (localStorage), partialize limite ce qui est écrit ; devtools branche Redux DevTools. Ordre courant : devtools(persist(immer(init))) — devtools à l'extérieur, immer au plus près de l'initializer.
Zustand, Context ou TanStack Query : lequel pour quoi ?|Zustand : état client qui change souvent (filtres, sélection, UI). Context : état client stable et peu fréquent (thème, user, locale). TanStack Query : état serveur (fetch, cache, revalidation).
Comment lire ou modifier un store Zustand hors d'un composant React ?|Via les méthodes statiques du hook : useStore.getState() pour lire/appeler une action, useStore.setState(...) pour écrire, useStore.subscribe(cb) pour réagir aux changements (retourne un unsubscribe).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-15-zustand/README.md`. Construire le `useAdminStore` de session TribuZen (familles sélectionnées, filtres, notifications) avec `create` curried, sélecteurs ciblés, `persist` sur le thème et `devtools`, puis brancher trois composants qui ne re-rendent que sur leur tranche.
