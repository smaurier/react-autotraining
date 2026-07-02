# Lab 16 — Redux Toolkit

> **Outcome :** à la fin, tu sais structurer un store Redux Toolkit (v2) + react-redux (v9) avec un slice typé, un `createAsyncThunk` de fetch, des hooks pré-typés, et le câbler dans un composant React 19 + TypeScript qui liste, sélectionne et change le statut des familles TribuZen.
> **Vrai outil :** React 19 + Vite + `@reduxjs/toolkit@^2` + `react-redux@^9` (Redux DevTools visibles dans le navigateur).
> **Feedback :** le coach valide visuellement en session + inspection Redux DevTools — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le store central de l'admin TribuZen. Cahier des charges **exact** :

1. **`app/store.ts`** — `configureStore` avec un seul reducer `families`. Exporte `RootState` et `AppDispatch` inférés.
2. **`app/hooks.ts`** — `useAppSelector` et `useAppDispatch` typés avec `.withTypes`.
3. **`features/families/familiesSlice.ts`** — état `{ items, selectedId, status, error }`, un thunk `fetchFamilies`, et les reducers `selectFamily`, `clearSelection`, `setStatus`.
4. **`features/families/FamiliesPage.tsx`** — dispatche `fetchFamilies` au montage, liste les familles via selectors, permet de sélectionner une famille et de la suspendre.
5. **`main.tsx`** — enveloppe l'app dans `<Provider store={store}>`.

**Type et données de départ (à placer dans `familiesSlice.ts`) :**

```tsx
export type FamilyStatus = 'active' | 'pending' | 'suspended';

export interface Family {
  id: string;
  name: string;
  status: FamilyStatus;
  memberCount: number;
}

// Le thunk simule un appel API — pas de vrai backend ici
const FAKE_API: Family[] = [
  { id: 'f1', name: 'Les Dupont', status: 'active', memberCount: 4 },
  { id: 'f2', name: 'Les Martin', status: 'pending', memberCount: 2 },
  { id: 'f3', name: 'Les Bernard', status: 'active', memberCount: 5 },
];
```

**Contraintes :**
- **Aucun `fetch`/`await` dans un reducer** — l'async vit exclusivement dans `createAsyncThunk`.
- **Aucune mutation du state hors reducer** — toute modification passe par un `dispatch(action())`.
- `FamilyStatus` est une **union stricte** — pas de `string`.
- Les composants n'utilisent **que** `useAppSelector`/`useAppDispatch`, jamais les hooks bruts.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

```bash
pnpm create vite@latest tribuzen-admin --template react-ts
cd tribuzen-admin
pnpm add @reduxjs/toolkit react-redux
```

```
src/
  app/
    store.ts             ← à écrire
    hooks.ts             ← à écrire
  features/
    families/
      familiesSlice.ts   ← à écrire
      FamiliesPage.tsx   ← à écrire
  App.tsx                ← branche <FamiliesPage />
  main.tsx               ← ajoute <Provider store={store}>
```

Lance `pnpm dev`, ouvre l'extension **Redux DevTools** et observe les actions dispatchées.

---

## Étapes (en friction)

1. **Écris `familiesSlice.ts`** — définis `FamiliesState { items, selectedId, status, error }`. Crée `fetchFamilies` avec `createAsyncThunk<Family[], void>` qui `await` un `setTimeout` de 600 ms puis retourne `FAKE_API`. Écris `selectFamily`, `clearSelection`, `setStatus({ id, status })` avec mutation immer. Gère `pending`/`fulfilled`/`rejected` dans `extraReducers`.
2. **Écris `store.ts`** — `configureStore({ reducer: { families: familiesReducer } })`. Exporte `RootState` et `AppDispatch`.
3. **Écris `hooks.ts`** — `useAppDispatch = useDispatch.withTypes<AppDispatch>()`, idem pour le selector.
4. **Écris `FamiliesPage.tsx`** — `useEffect` qui dispatche `fetchFamilies()` si `status === 'idle'`. Selectors séparés pour `items`, `status`, `selectedId`. Bouton pour sélectionner, bouton « Suspendre » (masqué si déjà suspendue).
5. **Branche `<Provider>` dans `main.tsx`** et `<FamiliesPage />` dans `App.tsx`.
6. **Vérifie dans DevTools** : `families/fetch/pending` → `families/fetch/fulfilled` au chargement ; un clic « Suspendre » dispatche `families/setStatus` avec le bon payload ; la sélection change `selectedId`.

---

## Corrigé complet commenté

```tsx
// ─── src/features/families/familiesSlice.ts ─────────────────────
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

// Simule un backend — remplacé par un vrai fetch en prod
const FAKE_API: Family[] = [
  { id: 'f1', name: 'Les Dupont', status: 'active', memberCount: 4 },
  { id: 'f2', name: 'Les Martin', status: 'pending', memberCount: 2 },
  { id: 'f3', name: 'Les Bernard', status: 'active', memberCount: 5 },
];

// <type retourné, type de l'argument> — void car pas d'argument
export const fetchFamilies = createAsyncThunk<Family[], void>(
  'families/fetch',
  async (_arg, { rejectWithValue }) => {
    // L'async vit ICI, jamais dans un reducer
    await new Promise((r) => setTimeout(r, 600));
    // Simule un échec 1 fois sur 10 pour exercer le cas rejected
    if (Math.random() < 0.1) return rejectWithValue('Réseau indisponible');
    return FAKE_API;
  }
);

const familiesSlice = createSlice({
  name: 'families', // préfixe le type des actions : families/selectFamily...
  initialState,
  reducers: {
    // Mutation APPARENTE : immer transforme ça en update immuable
    selectFamily: (state, action: PayloadAction<string>) => {
      state.selectedId = action.payload;
    },
    clearSelection: (state) => {
      state.selectedId = null;
    },
    // Payload objet quand on a besoin de plusieurs valeurs
    setStatus: (state, action: PayloadAction<{ id: string; status: FamilyStatus }>) => {
      const family = state.items.find((f) => f.id === action.payload.id);
      if (family) family.status = action.payload.status; // muté sur le draft
    },
  },
  // extraReducers : réagit aux actions du thunk (définies hors de `reducers`)
  extraReducers: (builder) => {
    builder
      .addCase(fetchFamilies.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFamilies.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // typé Family[]
      })
      .addCase(fetchFamilies.rejected, (state, action) => {
        state.status = 'failed';
        // payload de rejectWithValue, sinon message d'erreur brut
        state.error = (action.payload as string) ?? action.error.message ?? 'Erreur';
      });
  },
});

export const { selectFamily, clearSelection, setStatus } = familiesSlice.actions;
export default familiesSlice.reducer;

// ─── src/app/store.ts ────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import familiesReducer from '../features/families/familiesSlice';

export const store = configureStore({
  reducer: {
    families: familiesReducer, // accessible via state.families
  },
});

// Types inférés du store réel — se mettent à jour si on ajoute un slice
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ─── src/app/hooks.ts ────────────────────────────────────────────
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Définis UNE fois, importés partout — jamais les hooks bruts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// ─── src/features/families/FamiliesPage.tsx ─────────────────────
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchFamilies, selectFamily, setStatus } from './familiesSlice';

function FamiliesPage() {
  const dispatch = useAppDispatch();
  // Un selector par tranche : re-render seulement si CETTE tranche change
  const items = useAppSelector((s) => s.families.items);
  const status = useAppSelector((s) => s.families.status);
  const error = useAppSelector((s) => s.families.error);
  const selectedId = useAppSelector((s) => s.families.selectedId);

  useEffect(() => {
    // On ne fetch qu'une fois : garde sur status === 'idle'
    if (status === 'idle') dispatch(fetchFamilies());
  }, [status, dispatch]);

  if (status === 'loading') return <p>Chargement des familles…</p>;
  if (status === 'failed') return <p role="alert">Erreur : {error}</p>;

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

// ─── src/App.tsx ─────────────────────────────────────────────────
import FamiliesPage from './features/families/FamiliesPage';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>TribuZen Admin — Familles</h1>
      <FamiliesPage />
    </div>
  );
}

export default App;

// ─── src/main.tsx ────────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Le Provider expose le store à tout l'arbre */}
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
```

**Pourquoi ce corrigé est correct :**
- **Aucun async dans un reducer** : `fetchFamilies` isole le `setTimeout`/réseau, les reducers restent purs et synchrones.
- **Aucune mutation hors reducer** : chaque changement (`selectFamily`, `setStatus`) passe par un `dispatch`, et la mutation apparente n'a lieu que sur le draft immer de `createSlice`.
- **Types inférés** : `RootState`/`AppDispatch` dérivent du store, donc `useAppSelector((s) => s.families.items)` est entièrement typé sans annotation manuelle.
- **Selectors séparés** : `items`, `status`, `selectedId` sont sélectionnés indépendamment — pas d'objet littéral qui casserait la comparaison `===` et forcerait des re-renders.
- **Union stricte** : `setStatus` n'accepte que `'active' | 'pending' | 'suspended'` — TypeScript refuse toute autre valeur à la compilation.

---

## Variante J+30 (fading)

**Même store, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Ajoute un **slice `auth`** (`user: { id, name, role } | null`, `status`) avec un thunk `fetchCurrentUser` et une action `logout`. Branche-le dans `configureStore` à côté de `families`.
2. Ajoute un composant `TopBar` qui lit `auth.user` via `useAppSelector` et affiche un bouton « Déconnexion » qui dispatche `logout`.
3. Ajoute un **selector mémoïsé** avec `createSelector` (importé de `@reduxjs/toolkit`) qui retourne uniquement les familles `active`, et affiche leur compte dans un `<h2>`.
4. **Sans rouvrir ce corrigé** ni le module 16.

**Critère de réussite :** la top-bar affiche l'utilisateur, `logout` le remet à `null` ; le compteur de familles actives se met à jour quand on suspend une famille ; DevTools montre les actions des deux slices (`families/*` et `auth/*`).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen-admin`, ce store vit ici :

```
tribuzen-admin/src/
  app/
    store.ts            # configureStore { families, auth }
    hooks.ts            # useAppSelector, useAppDispatch (withTypes)
  features/
    families/
      familiesSlice.ts
      FamiliesPage.tsx
      FamilyDetailPanel.tsx  # lit families.selectedId pour le panneau latéral
    auth/
      authSlice.ts
      TopBar.tsx
  main.tsx              # <Provider store={store}>
```

**Différences par rapport au lab :**
- `fetchFamilies` appellera un **vrai endpoint** (`fetch('/api/families')` ou RTK Query) au lieu du `setTimeout` + `FAKE_API`.
- `FamilyDetailPanel` consommera `selectedId` pour afficher le détail sans prop drilling depuis `FamiliesPage`.
- Le `setStatus` optimiste local sera suivi d'une mutation serveur (thunk ou `useUpdateStatusMutation` RTK Query) pour persister.

**Commit cible :**
```
feat(store): configureStore + hooks typés (RTK v2, react-redux v9)
feat(families): slice familles — liste, sélection, statut, thunk fetchFamilies
feat(auth): slice auth — user courant, fetchCurrentUser, logout
```
