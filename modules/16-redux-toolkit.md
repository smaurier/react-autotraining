---
titre: Redux Toolkit
cours: 04-react
notions: [configureStore, createSlice, immer et mutation apparente, PayloadAction, hooks typés useAppSelector useAppDispatch, createAsyncThunk et extraReducers, RTK Query en survol, RTK vs Zustand vs Context]
outcomes: [structurer un store Redux Toolkit avec configureStore et des slices, écrire un slice typé avec createSlice et des reducers immer, câbler des hooks useSelector/useDispatch pré-typés, gérer un fetch asynchrone avec createAsyncThunk, choisir RTK plutôt que Zustand ou Context selon l'échelle]
prerequis: [15-zustand]
next: 17-react-router-basique
libs: [{ name: react, version: "^19" }, { name: "@reduxjs/toolkit", version: "^2" }, { name: react-redux, version: "^9" }]
tribuzen: store de l'admin web TribuZen — slice families (liste, statut, sélection), slice auth, thunk de fetch des familles
last-reviewed: 2026-07
---

# Redux Toolkit

> **Outcomes — tu sauras FAIRE :** structurer un store avec `configureStore` et des slices, écrire un slice typé avec `createSlice` (reducers immer), câbler des hooks `useSelector`/`useDispatch` pré-typés, gérer un fetch async avec `createAsyncThunk`, et arbitrer RTK vs Zustand vs Context.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

L'admin TribuZen grossit. La page « Familles » liste toutes les familles, permet d'en sélectionner une pour ouvrir un panneau latéral, d'en changer le statut (`active` / `pending` / `suspended`), et l'utilisateur connecté (auth) est lu dans la top-bar, la sidebar, et la page. Trois équipes touchent ce code en parallèle.

Avec un `useState` remonté dans un composant parent, on arrive vite à ça :

```tsx
// FamiliesPage.tsx — AVANT, tout l'état dans un seul composant
function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // fetch familles + fetch user + toute la logique de statut, ici...
  // ...puis on drille families, selectedId, currentUser dans 6 niveaux d'enfants
  return <>{/* prop drilling massif */}</>;
}
```

**Trois problèmes immédiats :**
1. **Prop drilling** — `families`, `selectedId`, `currentUser` traversent 6 niveaux de composants qui ne les utilisent pas.
2. **Logique éclatée** — changer le statut d'une famille mêle `setFamilies`, un `.map`, une copie d'objet. Chaque dev réécrit sa version, avec des bugs d'immutabilité différents.
3. **Zéro traçabilité** — impossible de savoir *qui* a changé quoi. À 3 équipes, on veut un historique (Redux DevTools, time-travel).

Redux Toolkit répond à ces trois points : un **store centralisé**, des **mutations décrites comme des actions nommées** (traçables), et de l'**immutabilité garantie** par immer. Ce module te donne le câblage complet.

---

## 2. Théorie complète, concise

### 2.1 Le flux Redux en une image

Redux impose un flux **unidirectionnel** : un composant *dispatche* une action, un *reducer* pur calcule le nouvel état à partir de l'ancien, le store notifie les composants abonnés qui re-rendent.

```
composant ──dispatch(action)──▶ reducer(state, action) ──▶ nouveau state ──▶ re-render
```

La discipline vient de là : **on ne mute jamais le state à la main**, on décrit une intention (l'action) et un reducer déterministe applique le changement. Redux « classique » demandait d'écrire à la main les constantes d'action, les action creators, et des reducers avec `switch`. **Redux Toolkit (RTK)** est la façon officielle et moderne d'écrire Redux : il génère tout ça à partir d'une déclaration compacte.

### 2.2 `createSlice` — le cœur de RTK

Un *slice* regroupe, pour un domaine, son état initial + ses reducers + les action creators générés automatiquement.

```tsx
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type FamilyStatus = 'active' | 'pending' | 'suspended';

export interface Family {
  id: string;
  name: string;
  status: FamilyStatus;
  memberCount: number;
}

interface FamiliesState {
  items: Family[];
  selectedId: string | null;
}

const initialState: FamiliesState = {
  items: [],
  selectedId: null,
};

const familiesSlice = createSlice({
  name: 'families',
  initialState,
  reducers: {
    selectFamily: (state, action: PayloadAction<string>) => {
      state.selectedId = action.payload; // mutation APPARENTE — voir 2.3
    },
    setStatus: (state, action: PayloadAction<{ id: string; status: FamilyStatus }>) => {
      const family = state.items.find((f) => f.id === action.payload.id);
      if (family) family.status = action.payload.status;
    },
  },
});

// Action creators générés automatiquement depuis les clés de `reducers`
export const { selectFamily, setStatus } = familiesSlice.actions;
export default familiesSlice.reducer;
```

- `name: 'families'` préfixe le `type` des actions (`families/selectFamily`) — visible dans DevTools.
- Chaque fonction dans `reducers` devient **à la fois** un reducer et un action creator du même nom.
- `PayloadAction<T>` type le `action.payload`. Pour plusieurs valeurs, on passe un objet (`{ id, status }`).

### 2.3 Immer : la « mutation apparente »

Dans un reducer classique il faut retourner une copie immuable :

```tsx
// ❌ Redux classique — copie manuelle, verbeux et source de bugs
setStatus: (state, action) => ({
  ...state,
  items: state.items.map((f) =>
    f.id === action.payload.id ? { ...f, status: action.payload.status } : f
  ),
});
```

RTK intègre **immer**. Dans un reducer de `createSlice`, tu écris `family.status = ...` ou `state.items.push(...)` **comme si** tu mutais. En réalité immer enregistre tes modifications sur un *brouillon* (draft proxy) et produit un nouvel état immuable. Tu obtiens la lisibilité de la mutation avec la sûreté de l'immutabilité.

```tsx
addFamily: (state, action: PayloadAction<Family>) => {
  state.items.push(action.payload); // OK : immer gère la copie
},
```

**Une seule règle immer :** soit tu **mutes le draft sans rien retourner**, soit tu **retournes une nouvelle valeur** — jamais les deux dans le même reducer.

### 2.4 `configureStore` — assembler les slices

```tsx
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import familiesReducer from '../features/families/familiesSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    families: familiesReducer, // state.families
    auth: authReducer,         // state.auth
  },
});

// Types dérivés du store réel — jamais écrits à la main
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

`configureStore` remplace `createStore` : il branche automatiquement Redux DevTools, `redux-thunk` (nécessaire pour `createAsyncThunk`), et un middleware qui **détecte en dev les mutations accidentelles et les valeurs non sérialisables**.

`RootState` et `AppDispatch` sont **inférés** du store : ajouter un slice met les types à jour tout seul.

### 2.5 Provider + hooks pré-typés

React-redux v9 expose le store à l'arbre via `<Provider>` :

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

Puis on crée **une fois** des hooks typés avec `.withTypes` (API RTK v2 / react-redux v9) et on **n'utilise plus jamais** `useSelector`/`useDispatch` bruts :

```tsx
// app/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

Consommation dans un composant :

```tsx
// features/families/FamiliesList.tsx
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectFamily, setStatus } from './familiesSlice';

function FamiliesList() {
  const dispatch = useAppDispatch();
  // selector : re-render UNIQUEMENT si families.items change de référence
  const families = useAppSelector((state) => state.families.items);
  const selectedId = useAppSelector((state) => state.families.selectedId);

  return (
    <ul>
      {families.map((family) => (
        <li key={family.id} aria-current={family.id === selectedId}>
          <button onClick={() => dispatch(selectFamily(family.id))}>
            {family.name} — {family.status}
          </button>
          <button
            onClick={() => dispatch(setStatus({ id: family.id, status: 'suspended' }))}
          >
            Suspendre
          </button>
        </li>
      ))}
    </ul>
  );
}
```

Le **selector** est central : chaque composant s'abonne à *une tranche* de l'état. Il ne re-rend que si cette tranche change — même principe que les selectors Zustand vus au module 15.

### 2.6 `createAsyncThunk` — le fetch asynchrone

Un reducer est **synchrone et pur** : pas d'`await`, pas de `fetch` dedans. Pour le réseau, RTK fournit `createAsyncThunk`, qui dispatche automatiquement trois actions : `pending`, `fulfilled`, `rejected`.

```tsx
// features/families/familiesSlice.ts (suite)
import { createAsyncThunk } from '@reduxjs/toolkit';

// <ReturnType, ArgType>
export const fetchFamilies = createAsyncThunk<Family[], void>(
  'families/fetch',
  async (_arg, { rejectWithValue }) => {
    const res = await fetch('/api/families');
    if (!res.ok) return rejectWithValue('Chargement des familles impossible');
    return (await res.json()) as Family[];
  }
);
```

On enrichit l'état d'un `status` et d'une `error`, puis on réagit aux trois actions dans `extraReducers` (reducers pour des actions définies *ailleurs* que dans `reducers`) :

```tsx
interface FamiliesState {
  items: Family[];
  selectedId: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const familiesSlice = createSlice({
  name: 'families',
  initialState: { items: [], selectedId: null, status: 'idle', error: null } as FamiliesState,
  reducers: {
    /* selectFamily, setStatus... */
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFamilies.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFamilies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // action.payload typé Family[]
      })
      .addCase(fetchFamilies.rejected, (state, action) => {
        state.status = 'failed';
        // payload de rejectWithValue, sinon message d'erreur brut
        state.error = (action.payload as string) ?? action.error.message ?? 'Erreur';
      });
  },
});
```

Dans le composant, on dispatche le thunk (le middleware thunk l'exécute) :

```tsx
useEffect(() => {
  if (status === 'idle') dispatch(fetchFamilies());
}, [status, dispatch]);
```

### 2.7 RTK Query — data fetching intégré (survol)

`createAsyncThunk` + `extraReducers` est le pattern à connaître. Pour du CRUD serveur avec **cache, refetch et invalidation automatiques**, RTK propose une couche de plus haut niveau : **RTK Query**. Tu déclares des endpoints, elle génère des hooks.

```tsx
// features/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Family } from '../families/familiesSlice';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Family'],
  endpoints: (builder) => ({
    getFamilies: builder.query<Family[], void>({
      query: () => '/families',
      providesTags: ['Family'],
    }),
    updateStatus: builder.mutation<Family, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/families/${id}`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Family'], // refetch auto de getFamilies
    }),
  }),
});

export const { useGetFamiliesQuery, useUpdateStatusMutation } = apiSlice;
```

```tsx
function FamiliesList() {
  const { data: families, isLoading, error } = useGetFamiliesQuery();
  if (isLoading) return <p>Chargement…</p>;
  if (error) return <p>Erreur de chargement</p>;
  return <ul>{families?.map((f) => <li key={f.id}>{f.name}</li>)}</ul>;
}
```

> **Positionnement :** RTK Query recouvre le même besoin que TanStack Query (module suivant côté data). On la mentionne car elle vit dans le même paquet ; en détail, elle sort du périmètre de ce module. Retiens : *thunk pour de la logique async custom, RTK Query pour du CRUD serveur standard.*

### 2.8 RTK vs Zustand vs Context — quand choisir quoi

| Besoin | Context API | Zustand | Redux Toolkit |
|---|---|---|---|
| Cible | valeur stable partagée (thème, locale, user) | état client app petite/moyenne | état client app grande/équipe |
| Boilerplate | faible mais prop-of-provider | minimal | modéré, mais structuré |
| Re-render sélectif | ❌ tous les consumers | ✅ selectors | ✅ selectors |
| DevTools / time-travel | ❌ | basique | ✅ complet |
| Async intégré | à la main | à la main | ✅ thunk + RTK Query |
| Conventions imposées | aucune | libres | ✅ slices, actions nommées |
| Équipe | petite | 1-5 devs | 5+ devs, multi-équipes |

> **Règle simple :** Context pour une valeur qui change rarement et n'a pas besoin de re-render fin. Zustand pour aller vite en solo/petite équipe. **RTK dès qu'on veut des conventions strictes, un historique traçable et de l'async structuré à plusieurs équipes** — exactement le cas de l'admin TribuZen.

---

## 3. Worked examples

### Exemple 1 — Slice `families` complet (liste + statut + sélection + fetch)

Le slice central de l'admin TribuZen, de bout en bout.

```tsx
// ─── features/families/familiesSlice.ts ─────────────────────────
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export type FamilyStatus = 'active' | 'pending' | 'suspended';

export interface Family {
  id: string;
  name: string;
  status: FamilyStatus;
  memberCount: number;
}

interface FamiliesState {
  items: Family[];
  selectedId: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: FamiliesState = {
  items: [],
  selectedId: null,
  status: 'idle',
  error: null,
};

// Thunk : <type retourné, type de l'argument>
export const fetchFamilies = createAsyncThunk<Family[], void>(
  'families/fetch',
  async (_arg, { rejectWithValue }) => {
    const res = await fetch('/api/families');
    if (!res.ok) return rejectWithValue('Chargement des familles impossible');
    return (await res.json()) as Family[];
  }
);

const familiesSlice = createSlice({
  name: 'families',
  initialState,
  reducers: {
    // Sélection : simple affectation, immer gère l'immutabilité
    selectFamily: (state, action: PayloadAction<string>) => {
      state.selectedId = action.payload;
    },
    clearSelection: (state) => {
      state.selectedId = null;
    },
    // Changement de statut : on retrouve la famille et on mute son champ
    setStatus: (state, action: PayloadAction<{ id: string; status: FamilyStatus }>) => {
      const family = state.items.find((f) => f.id === action.payload.id);
      if (family) family.status = action.payload.status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFamilies.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFamilies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchFamilies.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Erreur inconnue';
      });
  },
});

export const { selectFamily, clearSelection, setStatus } = familiesSlice.actions;
export default familiesSlice.reducer;
```

```tsx
// ─── features/families/FamiliesPage.tsx ─────────────────────────
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchFamilies, selectFamily, setStatus } from './familiesSlice';

function FamiliesPage() {
  const dispatch = useAppDispatch();
  // Trois selectors distincts : chacun cible sa tranche d'état
  const items = useAppSelector((s) => s.families.items);
  const status = useAppSelector((s) => s.families.status);
  const selectedId = useAppSelector((s) => s.families.selectedId);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchFamilies());
  }, [status, dispatch]);

  if (status === 'loading') return <p>Chargement des familles…</p>;
  if (status === 'failed') return <p role="alert">Impossible de charger les familles.</p>;

  return (
    <ul>
      {items.map((family) => (
        <li key={family.id} aria-current={family.id === selectedId}>
          <button onClick={() => dispatch(selectFamily(family.id))}>
            {family.name} · {family.status} · {family.memberCount} membres
          </button>
          {family.status !== 'suspended' && (
            <button
              onClick={() => dispatch(setStatus({ id: family.id, status: 'suspended' }))}
            >
              Suspendre
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default FamiliesPage;
```

**Ce que ce découpage apporte :**
- Aucun prop drilling : `FamiliesList`, le panneau latéral, la top-bar lisent le store directement via selectors.
- `setStatus` est une action **nommée et tracée** : dans DevTools on voit `families/setStatus` avec son payload.
- Le `status` (`idle`/`loading`/`succeeded`/`failed`) découle du thunk sans code manuel de gestion des états de chargement.

### Exemple 2 — Slice `auth` + store assemblé

```tsx
// ─── features/auth/authSlice.ts ─────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  role: 'owner' | 'admin';
}

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

export const fetchCurrentUser = createAsyncThunk<User, void>(
  'auth/me',
  async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Session invalide');
    return (await res.json()) as User;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'idle' } as AuthState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.status = 'failed';
        state.user = null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
```

```tsx
// ─── app/store.ts ────────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import familiesReducer from '../features/families/familiesSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    families: familiesReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```tsx
// ─── features/auth/TopBar.tsx ────────────────────────────────────
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { logout } from './authSlice';

function TopBar() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  if (!user) return null;
  return (
    <header>
      <span>{user.name} ({user.role})</span>
      <button onClick={() => dispatch(logout())}>Déconnexion</button>
    </header>
  );
}

export default TopBar;
```

**Pourquoi deux slices séparés :** `auth` et `families` évoluent indépendamment et sont maintenus par des équipes différentes. Chaque slice possède son état, ses actions, son thunk. `configureStore` les combine sans qu'ils se connaissent — couplage faible.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Muter le state hors d'un reducer immer

```tsx
// ❌ Mutation du state dans un selector ou un composant
const families = useAppSelector((s) => s.families.items);
families.push(newFamily); // interdit — hors reducer, hors immer
families[0].status = 'active'; // idem : mutation directe du store

// ✅ Toujours passer par une action dispatchée
dispatch(addFamily(newFamily));
dispatch(setStatus({ id: families[0].id, status: 'active' }));
```

La « mutation apparente » n'est autorisée **que dans les reducers de `createSlice`**, où immer intercepte les changements. Partout ailleurs, l'état est gelé — muter lève une erreur en dev (middleware d'immutabilité).

### PIÈGE #2 — Mélanger mutation et return dans un reducer

```tsx
// ❌ On mute ET on retourne — immer plante
setStatus: (state, action) => {
  state.selectedId = action.payload.id;
  return { ...state, error: null }; // conflit : draft muté + valeur retournée
},

// ✅ Soit muter sans return...
setStatus: (state, action) => {
  state.selectedId = action.payload.id;
  state.error = null;
},

// ✅ ...soit retourner une nouvelle valeur sans muter
resetFamilies: () => initialState,
```

Règle immer : **muter le draft OU retourner une nouvelle valeur, jamais les deux** dans le même reducer.

### PIÈGE #3 — Faire de l'async dans un reducer

```tsx
// ❌ fetch dans un reducer — un reducer DOIT être synchrone et pur
reducers: {
  loadFamilies: async (state) => {
    const res = await fetch('/api/families'); // interdit
    state.items = await res.json();
  },
}

// ✅ createAsyncThunk + extraReducers
export const fetchFamilies = createAsyncThunk('families/fetch', async () => {
  const res = await fetch('/api/families');
  return res.json();
});
// puis builder.addCase(fetchFamilies.fulfilled, ...) dans extraReducers
```

Un reducer prend `(state, action)` et calcule un état de façon déterministe. Tout effet (réseau, timers, aléatoire) va dans un thunk.

### PIÈGE #4 — Selector qui crée un nouvel objet à chaque render

```tsx
// ❌ Nouvel objet/array à chaque appel → nouvelle référence → re-render permanent
const data = useAppSelector((s) => ({ items: s.families.items, count: s.families.items.length }));
const actives = useAppSelector((s) => s.families.items.filter((f) => f.status === 'active'));

// ✅ Sélectionner des tranches stables séparément
const items = useAppSelector((s) => s.families.items);
const count = useAppSelector((s) => s.families.items.length);
// Pour un dérivé filtré/coûteux : mémoïser avec createSelector (reselect, inclus dans RTK)
```

`useSelector` compare le résultat par égalité de référence (`===`). Un `.filter`/`.map`/objet littéral renvoie une **nouvelle** référence à chaque render → re-render infini ou inutile. Sélectionne des tranches stables, ou mémoïse avec `createSelector`.

### PIÈGE #5 — Utiliser `useSelector`/`useDispatch` bruts au lieu des hooks typés

```tsx
// ❌ Hooks bruts : state est `unknown`, dispatch ne connaît pas les thunks
import { useSelector, useDispatch } from 'react-redux';
const items = useSelector((s) => s.families.items); // s: unknown → erreur TS

// ✅ Hooks pré-typés définis une fois dans app/hooks.ts
import { useAppSelector, useAppDispatch } from '../../app/hooks';
const items = useAppSelector((s) => s.families.items); // s: RootState, typé
```

Sans hooks typés, on perd l'autocomplétion et le typage du `dispatch` (indispensable pour dispatcher des thunks). On les définit **une seule fois** et on les importe partout.

---

## 5. Ancrage TribuZen

L'admin web TribuZen est **le** cas d'école RTK du curriculum : plusieurs équipes, état partagé, besoin de traçabilité. Le store central vit ici :

```
tribuzen-admin/src/
  app/
    store.ts            # configureStore { families, auth }
    hooks.ts            # useAppSelector, useAppDispatch (withTypes)
  features/
    families/
      familiesSlice.ts  # items, selectedId, status + fetchFamilies + setStatus/selectFamily
      FamiliesPage.tsx  # container qui dispatche le thunk et lit via selectors
      FamilyDetailPanel.tsx  # panneau latéral, lit families.selectedId
    auth/
      authSlice.ts      # user, status + fetchCurrentUser + logout
      TopBar.tsx        # lit auth.user
  main.tsx              # <Provider store={store}>
```

- **`familiesSlice`** — `items` (la liste), `selectedId` (la famille ouverte dans le panneau latéral), `status`/`error` (état du `fetchFamilies`). Actions : `selectFamily`, `clearSelection`, `setStatus`. C'est le cas concret du module, écrit complet en Exemple 1.
- **`authSlice`** — `user` connecté, lu sans prop drilling par la top-bar, la sidebar et les gardes de route. Thunk `fetchCurrentUser` au démarrage, action `logout`.
- **Pourquoi RTK et pas Zustand ici :** au module 15, le mini-store de préférences UI TribuZen (thème, sidebar ouverte/fermée) était parfait pour Zustand — état local, un seul mainteneur. L'admin, lui, coche toutes les cases RTK : multi-équipes, historique DevTools pour débugger un changement de statut, async structuré, conventions imposées. **Même produit, deux outils selon l'échelle du besoin.**

---

## 6. Points clés

1. RTK est la façon officielle et moderne d'écrire Redux : flux unidirectionnel `dispatch → reducer → nouvel état → re-render`.
2. `createSlice` regroupe état initial + reducers + action creators générés ; `name` préfixe le type des actions.
3. Immer permet la « mutation apparente » **dans les reducers** : on écrit `state.x = …`, immer produit un état immuable.
4. `configureStore` assemble les slices, branche DevTools/thunk/middlewares ; `RootState` et `AppDispatch` sont inférés du store.
5. On définit `useAppSelector`/`useAppDispatch` avec `.withTypes` **une seule fois** et on n'utilise plus jamais les hooks bruts.
6. Un reducer est synchrone et pur : l'async passe par `createAsyncThunk` + `extraReducers` (`pending`/`fulfilled`/`rejected`).
7. RTK Query (survol) couvre le CRUD serveur avec cache/invalidation ; thunk pour la logique async custom.
8. Context pour une valeur stable, Zustand en solo/petite équipe, RTK dès qu'on veut conventions + traçabilité + async structuré à plusieurs.

---

## 7. Seeds Anki

```
Que regroupe un slice créé avec createSlice ?|L'état initial (initialState), les reducers, et les action creators générés automatiquement à partir des clés de `reducers`. Le champ `name` préfixe le type des actions (ex: families/setStatus).
Pourquoi peut-on écrire state.items.push(x) dans un reducer RTK ?|Parce que RTK intègre immer : il enregistre les mutations sur un draft proxy et produit un nouvel état immuable. La mutation est seulement APPARENTE, et uniquement autorisée dans les reducers de createSlice.
Quelle est la règle immer à ne jamais enfreindre dans un reducer ?|Soit muter le draft sans rien retourner, soit retourner une nouvelle valeur — jamais les deux dans le même reducer, sinon immer plante.
À quoi sert configureStore et d'où viennent RootState / AppDispatch ?|configureStore assemble les reducers des slices et branche DevTools, thunk et les middlewares de sécurité. RootState = ReturnType<typeof store.getState> et AppDispatch = typeof store.dispatch sont inférés du store, jamais écrits à la main.
Pourquoi définir useAppSelector / useAppDispatch avec .withTypes ?|Pour typer le state (RootState) et le dispatch (AppDispatch, qui connaît les thunks) une seule fois. On importe ces hooks partout au lieu des useSelector/useDispatch bruts où le state serait `unknown`.
Comment gère-t-on un fetch asynchrone en Redux Toolkit ?|Avec createAsyncThunk<Retour, Arg>, qui dispatche automatiquement pending/fulfilled/rejected. On réagit à ces trois actions dans extraReducers via builder.addCase pour mettre à jour status, items et error. Jamais d'async dans un reducer.
Pourquoi useSelector((s) => s.items.filter(...)) provoque-t-il des re-renders inutiles ?|Parce que .filter renvoie un nouvel array (nouvelle référence) à chaque render ; useSelector compare par === et croit que l'état a changé. Il faut sélectionner des tranches stables ou mémoïser avec createSelector.
Quand choisir Redux Toolkit plutôt que Zustand ou Context ?|Context pour une valeur stable rarement modifiée ; Zustand en solo/petite équipe pour aller vite ; RTK dès qu'on veut des conventions strictes, un historique DevTools traçable et de l'async structuré à plusieurs équipes (cas de l'admin TribuZen).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-16-redux-toolkit/README.md`. Construire de zéro le store `families` de l'admin TribuZen (slice typé, thunk de fetch, hooks pré-typés) et le câbler dans un composant qui liste, sélectionne et change le statut des familles.
