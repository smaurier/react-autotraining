# Lab 15 — Zustand : store de session admin TribuZen

> **Outcome :** à la fin, tu sais créer un store Zustand v5 typé (`create<T>()(...)`), cibler les re-renders avec des sélecteurs et `useShallow`, et brancher les middlewares `persist` (thème) et `devtools`.
> **Vrai outil :** Zustand v5 + React 19 + Vite dev server, avec Redux DevTools ouvert dans le navigateur pour observer les actions.
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur. La preuve de réussite = le profiler React et l'onglet Redux DevTools.

---

## Énoncé

Tu remplaces l'`AdminContext` du dashboard TribuZen par un store Zustand. Cahier des charges **exact** :

1. **`useAdminStore`** — un store contenant :
   - state : `selectedFamilyIds: string[]`, `filters: { search: string; status: 'all' | 'active' | 'pending' }`, `notifications: Notification[]`, `theme: 'light' | 'dark'`.
   - actions : `toggleFamily(id)`, `setSearch(q)`, `setStatus(s)`, `pushNotification(msg)`, `markAllRead()`, `toggleTheme()`.
2. **Middlewares** : `devtools` (à l'extérieur) + `persist` (au milieu). `persist` ne doit sauvegarder **que** `theme` (via `partialize`).
3. **Trois composants abonnés à leur seule tranche** : `SearchBar` (lit `filters.search`), `NotificationBell` (lit le nombre de non-lus), `FilterBar` (lit `search` **et** `status` via `useShallow`).
4. **Preuve de perf** : taper dans `SearchBar` ne doit **pas** re-rendre `NotificationBell` (vérifiable au React DevTools Profiler « Highlight updates »).

**Type de départ (à copier dans `adminStore.ts`) :**

```ts
export interface Notification {
  id: string;
  message: string;
  read: boolean;
}
```

**Contraintes :**
- Forme **curried** obligatoire : `create<AdminStore>()(...)`.
- Chaque composant utilise un **sélecteur** — aucun `useAdminStore()` nu.
- `setSearch` / `setStatus` doivent **préserver** l'autre champ de `filters` (merge de premier niveau → étaler `...state.filters`).
- **Pas de gap-fill** — tu écris le store et les composants complets depuis le starter.

### Starter minimal

Crée un projet Vite puis installe Zustand :

```
pnpm create vite@latest tribuzen-lab15 --template react-ts
cd tribuzen-lab15
pnpm add zustand
pnpm dev
```

Arborescence à produire :

```
src/
  stores/
    adminStore.ts       ← à écrire (state + actions + middlewares)
  components/
    SearchBar.tsx       ← lit filters.search
    NotificationBell.tsx← lit le compte non-lu
    FilterBar.tsx       ← lit search + status via useShallow
  App.tsx               ← assemble les trois + un bouton pushNotification
```

Installe l'extension **Redux DevTools** dans ton navigateur pour voir les actions nommées.

---

## Étapes (en friction)

1. **Écris `adminStore.ts`** — interface `AdminStore` (state + signatures d'actions). `create<AdminStore>()(devtools(persist(init, options), { name: 'AdminStore' }))`. N'oublie pas le `()` curried.
2. **Implémente les actions** — `toggleFamily` (include → filter / spread), `setSearch` et `setStatus` (étaler `...state.filters`), `pushNotification` (push avec `crypto.randomUUID()`), `markAllRead` (map `read: true`), `toggleTheme`.
3. **Configure `persist`** — `name: 'tribuzen-admin'`, `partialize: (s) => ({ theme: s.theme })`. Recharge la page après avoir basculé le thème : il doit persister.
4. **Écris `SearchBar.tsx`** — sélecteurs `s => s.filters.search` et `s => s.setSearch`. Un `<input>` contrôlé.
5. **Écris `NotificationBell.tsx`** — sélecteur dérivé `s => s.notifications.filter(n => !n.read).length` + `s => s.markAllRead`.
6. **Écris `FilterBar.tsx`** — `useShallow(s => ({ search: s.filters.search, status: s.filters.status }))`. Un `<input>` + un `<select>`.
7. **Assemble `App.tsx`** — les trois composants + un bouton qui appelle `pushNotification('...')`. Ouvre Redux DevTools, déclenche les actions, vérifie leurs noms.
8. **Vérifie la perf** — React DevTools → Profiler → « Highlight updates ». Tape dans `SearchBar` : seuls `SearchBar` et `FilterBar` doivent clignoter, **pas** `NotificationBell`.

---

## Corrigé complet commenté

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

// create<T>()(...) : le () vide après <AdminStore> est OBLIGATOIRE avec middleware + TS
export const useAdminStore = create<AdminStore>()(
  devtools(
    persist(
      (set) => ({
        selectedFamilyIds: [],
        filters: { search: '', status: 'all' },
        notifications: [],
        theme: 'light',

        // include → on retire ; sinon → on ajoute (immuable via spread/filter)
        toggleFamily: (id) =>
          set(
            (state) => ({
              selectedFamilyIds: state.selectedFamilyIds.includes(id)
                ? state.selectedFamilyIds.filter((x) => x !== id)
                : [...state.selectedFamilyIds, id],
            }),
            undefined,
            'admin/toggleFamily', // 3e arg de set = nom lisible dans Redux DevTools
          ),

        // On étale ...state.filters pour NE PAS écraser status (merge de 1er niveau)
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
        // partialize : SEUL theme est persisté. Filtres et notifs repartent à zéro.
        partialize: (state) => ({ theme: state.theme }),
      },
    ),
    { name: 'AdminStore' },
  ),
);

// ─── src/components/SearchBar.tsx ───────────────────────────────
import { useAdminStore } from '../stores/adminStore';

function SearchBar() {
  // Deux sélecteurs scalaires : re-rend seulement si filters.search change
  const search = useAdminStore((s) => s.filters.search);
  const setSearch = useAdminStore((s) => s.setSearch); // action = référence stable
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Rechercher une famille…"
    />
  );
}

export default SearchBar;

// ─── src/components/NotificationBell.tsx ────────────────────────
import { useAdminStore } from '../stores/adminStore';

function NotificationBell() {
  // Sélecteur dérivé : le composant ne re-rend que si le COMPTE non-lu change
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

export default NotificationBell;

// ─── src/components/FilterBar.tsx ───────────────────────────────
import { useShallow } from 'zustand/react/shallow';
import { useAdminStore } from '../stores/adminStore';

function FilterBar() {
  // useShallow : le sélecteur retourne un objet neuf → comparaison champ par champ,
  // sinon Object.is verrait une nouvelle référence à chaque render → boucle.
  const { search, status } = useAdminStore(
    useShallow((s) => ({ search: s.filters.search, status: s.filters.status })),
  );
  const setSearch = useAdminStore((s) => s.setSearch);
  const setStatus = useAdminStore((s) => s.setStatus);

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
      >
        <option value="all">Toutes</option>
        <option value="active">Actives</option>
        <option value="pending">En attente</option>
      </select>
    </div>
  );
}

export default FilterBar;

// ─── src/App.tsx ─────────────────────────────────────────────────
import SearchBar from './components/SearchBar';
import NotificationBell from './components/NotificationBell';
import FilterBar from './components/FilterBar';
import { useAdminStore } from './stores/adminStore';

function App() {
  // Sélecteurs pour le thème + les actions du bandeau de démo
  const theme = useAdminStore((s) => s.theme);
  const toggleTheme = useAdminStore((s) => s.toggleTheme);
  const pushNotification = useAdminStore((s) => s.pushNotification);

  return (
    <div
      style={{
        padding: '2rem',
        background: theme === 'dark' ? '#111' : '#fff',
        color: theme === 'dark' ? '#eee' : '#111',
        minHeight: '100vh',
      }}
    >
      <h1>TribuZen Admin — Lab 15 (Zustand)</h1>
      <NotificationBell />
      <FilterBar />
      <SearchBar />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => pushNotification('Nouvelle demande famille')}>
          + Notification
        </button>
        <button onClick={toggleTheme}>
          Thème : {theme} (persisté)
        </button>
      </div>
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- La forme `create<AdminStore>()(devtools(persist(...)))` respecte l'ordre de composition (devtools à l'extérieur) et le curried exigé par TypeScript.
- `setSearch` / `setStatus` étalent `...state.filters` : `set` ne fusionnant qu'au premier niveau, sans le spread on perdrait l'autre champ.
- Chaque composant s'abonne par **sélecteur** à sa seule tranche → taper dans `SearchBar` ne re-rend pas `NotificationBell`.
- `FilterBar` retourne un objet, donc `useShallow` est indispensable pour éviter le re-render en boucle.
- `partialize` limite la persistance au thème : recharger la page conserve `dark`/`light` mais repart avec des filtres et notifs vides — comportement voulu pour une session.

---

## Variante J+30 (fading)

**Même store, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module 15 :**

1. Ajoute un sélecteur dérivé `selectedCount` consommé par un nouveau composant `SelectionBar` qui affiche « N famille(s) sélectionnée(s) » et un bouton « Tout désélectionner » (nouvelle action `clearSelection`).
2. Branche le middleware **`immer`** (`zustand/middleware/immer`) et réécris `markAllRead` en mutation directe (`state.notifications.forEach(n => { n.read = true })`).
3. Ajoute un accès **hors React** : dans un fichier `seed.ts`, appelle `useAdminStore.getState().pushNotification('seed')` trois fois au démarrage, et logge via `useAdminStore.subscribe(...)` chaque changement du nombre de notifications.

**Critère de réussite :** l'app compile en TypeScript strict, le thème persiste au reload, Redux DevTools montre les actions nommées (dont `admin/clearSelection`), et taper dans la recherche ne fait clignoter que `SearchBar` + `FilterBar` au Profiler.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce store est le cœur de la session admin :

```
tribuzen/src/
  stores/
    adminStore.ts         # session admin : sélection, filtres, notifs, thème
  components/
    admin/
      SearchBar.tsx
      StatusSelect.tsx
      NotificationBell.tsx
      FamilyList.tsx        # lit filters + selectedFamilyIds
```

**Différences par rapport au lab :**
- Les données réelles des familles (liste, statuts) **ne** vivent **pas** dans `adminStore` : elles viennent de TanStack Query (module 05b). Le store ne garde que l'état *client* (sélection, filtres, thème, notifs UI).
- Le thème pourra être extrait dans un `useThemeStore` dédié si on veut le partager avec des vues hors admin.
- Les styles inline seront remplacés par les tokens du design system TribuZen ; la logique de store reste identique.

**Commit cible :**
```
feat(store): useAdminStore — session admin Zustand (sélection, filtres, notifs)
feat(store): persist du thème + devtools sur AdminStore
```
