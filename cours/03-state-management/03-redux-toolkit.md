# Cours 16 — Redux Toolkit : state management structuré pour les grandes équipes

> **Objectif** : Comprendre pourquoi Redux Toolkit (RTK) reste pertinent pour les projets à grande échelle. Maîtriser `configureStore`, `createSlice`, `createAsyncThunk`, et découvrir RTK Query pour les appels API. Comparer avec NgRx SignalStore (Angular) et savoir quand choisir RTK plutôt que Zustand.

---

## Rappel du cours précédent

<details>
<summary>1. Quel est l'avantage principal des selectors Zustand par rapport au Context API ?</summary>

Les selectors permettent un re-render sélectif : seul le composant qui lit une valeur spécifique du store re-rend quand cette valeur change. Avec Context, tous les consommateurs re-rendent à chaque changement.
</details>

<details>
<summary>2. Comment persister un store Zustand dans le localStorage ?</summary>

En utilisant le middleware `persist` : `create<T>()(persist((set) => ({...}), { name: 'storage-key' }))`.
</details>

<details>
<summary>3. Zustand nécessite-t-il un Provider pour fonctionner ?</summary>

Non. Contrairement au Context API, un store Zustand est accessible directement n'importe ou dans l'application sans aucun Provider.
</details>

---

## Analogie

Si Zustand est un **carnet de notes personnel** (simple, rapide, pas de formalisme), Redux Toolkit est un **système de gestion documentaire d'entreprise** : chaque modification passe par un processus défini (action → reducer → nouvel état), tout est tracé dans un historique (DevTools), et les rôles sont clairement séparés. C'est plus lourd, mais pour une équipe de 20 développeurs qui travaillent sur le même codebase, cette rigueur évite le chaos.

---

## Théorie

### Pourquoi Redux Toolkit en 2025 ?

Redux "classique" était verbeux et pénible. RTK a été créé pour éliminer ce boilerplate :

```tsx
// ❌ Redux classique — verbeux et répétitif
const ADD_TODO = 'ADD_TODO';

interface AddTodoAction {
  type: typeof ADD_TODO;
  payload: string;
}

function addTodo(title: string): AddTodoAction {
  return { type: ADD_TODO, payload: title };
}

function todosReducer(state: Todo[] = [], action: AddTodoAction) {
  switch (action.type) {
    case ADD_TODO:
      return [...state, { id: Date.now(), title: action.payload, done: false }];
    default:
      return state;
  }
}
```

```tsx
// ✅ Redux Toolkit — tout en un seul endroit
const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      state.push({ id: Date.now(), title: action.payload, done: false });
      // Immer est intégré — on peut "muter" directement !
    },
  },
});
```

### Installation

```bash
npm install @reduxjs/toolkit react-redux
```

### Anatomie d'un projet RTK

```
src/
├── app/
│   └── store.ts          # configureStore
├── features/
│   ├── todos/
│   │   └── todosSlice.ts  # createSlice
│   └── auth/
│       └── authSlice.ts
└── main.tsx               # <Provider store={store}>
```

### createSlice — le coeur de RTK

```tsx
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

interface TodosState {
  items: Todo[];
  filter: 'all' | 'active' | 'completed';
}

const initialState: TodosState = {
  items: [],
  filter: 'all',
};

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    addTodo: (state, action: PayloadAction<string>) => {
      // ✅ Immer intégré : on peut "muter" l'état directement
      state.items.push({
        id: Date.now(),
        title: action.payload,
        completed: false,
      });
    },
    toggleTodo: (state, action: PayloadAction<number>) => {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.completed = !todo.completed;
    },
    removeTodo: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    setFilter: (state, action: PayloadAction<TodosState['filter']>) => {
      state.filter = action.payload;
    },
  },
});

// Les action creators sont générés automatiquement
export const { addTodo, toggleTodo, removeTodo, setFilter } = todosSlice.actions;
export default todosSlice.reducer;
```

### configureStore — assembler les slices

```tsx
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import todosReducer from '../features/todos/todosSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    todos: todosReducer,
    auth: authReducer,
  },
});

// Types pour TypeScript strict
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Hooks typés — indispensable en TypeScript

```tsx
// app/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// ✅ Hooks pré-typés — à utiliser PARTOUT à la place des originaux
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

### Fournir le store et consommer

```tsx
// main.tsx
import { Provider } from 'react-redux';
import { store } from './app/store';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

```tsx
// features/todos/TodoList.tsx
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { addTodo, toggleTodo, removeTodo, setFilter } from './todosSlice';

function TodoList() {
  const dispatch = useAppDispatch();
  const todos = useAppSelector((state) => state.todos.items);
  const filter = useAppSelector((state) => state.todos.filter);

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  return (
    <div>
      <button onClick={() => dispatch(addTodo('Nouvelle tâche'))}>
        Ajouter
      </button>
      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id}>
            <span
              onClick={() => dispatch(toggleTodo(todo.id))}
              style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
            >
              {todo.title}
            </span>
            <button onClick={() => dispatch(removeTodo(todo.id))}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### createAsyncThunk — actions asynchrones

```tsx
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ✅ Thunk : gère automatiquement pending / fulfilled / rejected
export const loginUser = createAsyncThunk<User, { email: string; password: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) throw new Error('Identifiants invalides');
      return await response.json();
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'idle', error: null } as AuthState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});
```

### RTK Query — API calls intégrées

RTK Query est la solution de data fetching intégrée à RTK. Elle gère le cache, le refetch, et les états de chargement automatiquement.

```tsx
// features/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface Post {
  id: number;
  title: string;
  body: string;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Post'],
  endpoints: (builder) => ({
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
      providesTags: ['Post'],
    }),
    getPost: builder.query<Post, number>({
      query: (id) => `/posts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Post', id }],
    }),
    addPost: builder.mutation<Post, Omit<Post, 'id'>>({
      query: (newPost) => ({
        url: '/posts',
        method: 'POST',
        body: newPost,
      }),
      invalidatesTags: ['Post'],  // Invalide le cache automatiquement
    }),
  }),
});

export const { useGetPostsQuery, useGetPostQuery, useAddPostMutation } = apiSlice;
```

```tsx
// Utilisation — extrêmement concis
function PostList() {
  const { data: posts, isLoading, error } = useGetPostsQuery();

  if (isLoading) return <p>Chargement...</p>;
  if (error) return <p>Erreur de chargement</p>;

  return (
    <ul>
      {posts?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Comparaison avec NgRx SignalStore (Angular)

| Concept | Redux Toolkit | NgRx SignalStore |
|---------|---------------|------------------|
| Philosophie | Flux unidirectionnel (action → reducer → state) | Store réactif avec Signals |
| Boilerplate | Modéré (createSlice simplifie) | Minimal (withState, withMethods) |
| DevTools | ✅ Redux DevTools | ✅ NgRx DevTools |
| Async | `createAsyncThunk` | `rxMethod` ou `tapResponse` |
| API calls | RTK Query intégré | HttpClient + interceptors |
| Immutabilité | Immer intégré | Signal updates (`patchState`) |
| Courbe | Moyenne | Moyenne |

```typescript
// NgRx SignalStore — équivalent du todosSlice
export const TodosStore = signalStore(
  withState<TodosState>({ items: [], filter: 'all' }),
  withMethods((store) => ({
    addTodo(title: string) {
      patchState(store, (s) => ({
        items: [...s.items, { id: Date.now(), title, completed: false }],
      }));
    },
    toggleTodo(id: number) {
      patchState(store, (s) => ({
        items: s.items.map(t => t.id === id ? { ...t, completed: !t.completed } : t),
      }));
    },
  }))
);
```

### Matrice de décision : RTK vs Zustand

| Critère | Zustand | Redux Toolkit |
|---------|---------|---------------|
| Taille de l'équipe | 1-5 devs | 5+ devs |
| Taille du projet | Petit/moyen | Moyen/grand |
| Boilerplate toléré | Minimal | Acceptable si structuré |
| DevTools avancés | Basique | ✅ Time-travel debugging |
| Middleware/effets | Basique | ✅ createAsyncThunk, listeners |
| API data fetching | Manuel ou TanStack Query | ✅ RTK Query intégré |
| Convention stricte | Libre | ✅ Patterns imposés |
| Écosystème | Léger | ✅ Large (RTK Query, listeners) |

> **Règle simple** : si vous travaillez seul ou en petite équipe, prenez Zustand. Si vous êtes dans une grande ESN avec 10+ devs sur le même projet, RTK impose des conventions qui évitent le chaos.

---

## Pratique

Créez un mini système de gestion de produits avec RTK :

1. Un `productsSlice` avec `items: Product[]`, `status`, `error`
2. Un `createAsyncThunk` `fetchProducts` qui simule un appel API
3. Affichez les produits avec les états loading/error/success
4. Une action `removeProduct` synchrone

<details>
<summary>Solution</summary>

```tsx
// features/products/productsSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface ProductsState {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Simule un appel API
export const fetchProducts = createAsyncThunk<Product[]>(
  'products/fetch',
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return [
      { id: 1, name: 'Clavier mécanique', price: 89.99 },
      { id: 2, name: 'Souris ergonomique', price: 59.99 },
      { id: 3, name: 'Écran 27 pouces', price: 349.99 },
    ];
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle', error: null } as ProductsState,
  reducers: {
    removeProduct: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((p) => p.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Erreur inconnue';
      });
  },
});

export const { removeProduct } = productsSlice.actions;
export default productsSlice.reducer;
```

```tsx
// features/products/ProductList.tsx
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchProducts, removeProduct } from './productsSlice';

function ProductList() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.products);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProducts());
    }
  }, [status, dispatch]);

  if (status === 'loading') return <p>Chargement des produits...</p>;
  if (status === 'failed') return <p>Erreur : {error}</p>;

  return (
    <ul>
      {items.map((product) => (
        <li key={product.id}>
          {product.name} — {product.price} EUR
          <button onClick={() => dispatch(removeProduct(product.id))}>
            Supprimer
          </button>
        </li>
      ))}
    </ul>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| `createSlice` | Combine reducers, actions et types en un seul endroit |
| `configureStore` | Assemble tous les slices + configure les middlewares |
| Immer intégré | On peut « muter » l'état dans les reducers (c'est sûr) |
| `createAsyncThunk` | Gère pending/fulfilled/rejected automatiquement |
| RTK Query | Data fetching avec cache, refetch et invalidation |
| Hooks typés | `useAppSelector` et `useAppDispatch` pour TypeScript strict |
| vs Zustand | RTK pour les grandes équipes, Zustand pour la simplicité |
| vs NgRx | Philosophie similaire (flux unidirectionnel), API différente |

---

> **Prochain cours** : [Cours 17 — TanStack Query : gérer l'état serveur](./04-tanstack-query.md)
