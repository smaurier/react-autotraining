# Lab 14 — Context API

> **Outcome :** à la fin, tu sais supprimer le prop drilling avec un `AuthContext` + `ThemeContext` en React 19 + TypeScript (hooks d'accès gardés), puis monter un store de session léger `Context` + `useReducer` avec split state/dispatch.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu reprends l'admin TribuZen. `currentUser` est aujourd'hui drillé à travers 3 composants qui ne l'utilisent pas. Objectif : le brancher une fois, le lire directement, et ajouter un thème + un store de session.

Cahier des charges **exact** :

1. **`AuthContext`** — transporte `currentUser: User | null`, avec `login(user)` et `logout()`. Custom hook `useAuth()` qui **garde le hors-Provider** (throw si pas de Provider).
2. **`ThemeContext`** — thème `'light' | 'dark'` + `toggleTheme()`. Custom hook `useTheme()` gardé. Contexte **distinct** d'`AuthContext` (domaines séparés).
3. **Consommateurs** — `TopBar` (nom du connecté + bouton thème), `NavMenu` (entrée `super-admin` conditionnelle). Plus **aucune** prop drillée à travers `AdminShell`.
4. **`SessionContext`** — store de session léger : `useReducer` (`anonymous` → `authenticating` → `authenticated`) **split en deux contextes** (state + dispatch), chacun avec son hook gardé.

**Données de départ (à copier dans `types.ts`) :**

```tsx
export interface User {
  id: string;
  name: string;
  role: 'admin' | 'super-admin';
}

export const DEMO_USER: User = { id: 'u1', name: 'Alice Dupont', role: 'super-admin' };
```

**Contraintes :**
- **React 19** : monte les Providers avec `<Context value={...}>`, **jamais** `<Context.Provider>`.
- Chaque contexte a un défaut `null` et un custom hook qui `throw` hors Provider — **pas** de `useContext` brut dans les composants.
- Le `dispatch` de `SessionContext` vit dans son **propre** contexte (split), pour qu'un bouton d'action ne re-rende pas au changement de statut.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

Crée ces fichiers dans ton projet Vite (`pnpm create vite@latest tribuzen-lab --template react-ts`) :

```
src/
  types.ts                ← copier User + DEMO_USER
  contexts/
    AuthContext.tsx       ← à écrire
    ThemeContext.tsx      ← à écrire
    SessionContext.tsx    ← à écrire (useReducer + split)
  components/
    AdminShell.tsx        ← à écrire (ne drille RIEN)
    TopBar.tsx            ← à écrire (useAuth + useTheme)
    NavMenu.tsx           ← à écrire (useAuth)
  App.tsx                 ← empile les Providers autour de AdminShell
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `AuthContext.tsx`** — `interface AuthContextValue { currentUser: User | null; login: (u: User) => void; logout: () => void }`. `createContext<AuthContextValue | null>(null)`. `AuthProvider` avec un `useState<User | null>`. Custom hook `useAuth()` qui `throw` si `ctx === null`. Monte avec `<AuthContext value={...}>`.
2. **Écris `ThemeContext.tsx`** — même structure : `theme` + `toggleTheme` via `useState`, hook `useTheme()` gardé.
3. **Écris les consommateurs** — `TopBar` lit `useAuth()` (nom) + `useTheme()` (bouton bascule). `NavMenu` lit `useAuth()` et n'affiche l'entrée "Admins" que si `role === 'super-admin'`. `AdminShell` ne reçoit **aucune** prop et rend `<TopBar />` + `<NavMenu />`.
4. **Branche `App.tsx`** — empile `<AuthProvider>` > `<ThemeProvider>` > `<AdminShell />`. Dans un `useEffect` ou un bouton, appelle `login(DEMO_USER)` pour peupler la session. Vérifie : le nom s'affiche, le bouton thème bascule, l'entrée "Admins" apparaît.
5. **Écris `SessionContext.tsx`** — `sessionReducer` (4 actions), deux contextes (`SessionStateContext`, `SessionDispatchContext`), `SessionProvider` avec `useReducer` qui monte les deux contextes imbriqués, deux hooks gardés `useSessionState()` / `useSessionDispatch()`.
6. **Vérifie les cas limites** : appeler `useAuth()` dans un composant monté **hors** `<AuthProvider>` → l'app crash avec le message clair (c'est le comportement voulu) ; `role: 'admin'` → l'entrée "Admins" disparaît.

---

## Corrigé complet commenté

```tsx
// ─── src/types.ts ───────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: 'admin' | 'super-admin';
}

export const DEMO_USER: User = { id: 'u1', name: 'Alice Dupont', role: 'super-admin' };

// ─── src/contexts/AuthContext.tsx ───────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextValue {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// Défaut null : sert UNIQUEMENT hors Provider → rend l'oubli détectable
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const login = (user: User) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);

  // React 19 : <AuthContext> se monte directement, sans .Provider
  return (
    <AuthContext value={{ currentUser, login, logout }}>
      {children}
    </AuthContext>
  );
}

// Custom hook gardé : la seule porte d'entrée du contexte
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    // Hors Provider → erreur explicite en dev, pas un bug silencieux
    throw new Error('useAuth doit être appelé dans un <AuthProvider>');
  }
  return ctx; // typé non-null grâce au throw ci-dessus
}

// ─── src/contexts/ThemeContext.tsx ──────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme doit être appelé dans un <ThemeProvider>');
  }
  return ctx;
}

// ─── src/components/TopBar.tsx ──────────────────────────────────
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Lit deux contextes de domaine distincts. Basculer le thème ne touche
// pas AuthContext, et inversement.
function TopBar() {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <header style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem' }}>
      <span>Connecté : {currentUser?.name ?? 'invité'}</span>
      <button onClick={toggleTheme}>Thème : {theme}</button>
    </header>
  );
}

export default TopBar;

// ─── src/components/NavMenu.tsx ─────────────────────────────────
import { useAuth } from '../contexts/AuthContext';

// Lit directement le rôle. Aucun parent n'a eu à connaître User.
function NavMenu() {
  const { currentUser } = useAuth();
  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem' }}>
      <a href="/familles">Familles</a>
      {currentUser?.role === 'super-admin' && <a href="/admins">Admins</a>}
    </nav>
  );
}

export default NavMenu;

// ─── src/components/AdminShell.tsx ──────────────────────────────
import TopBar from './TopBar';
import NavMenu from './NavMenu';

// AdminShell ne reçoit AUCUNE prop et n'en repasse aucune : fini le drilling.
function AdminShell() {
  return (
    <div className="shell">
      <TopBar />
      <NavMenu />
    </div>
  );
}

export default AdminShell;

// ─── src/App.tsx ────────────────────────────────────────────────
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AdminShell from './components/AdminShell';
import { DEMO_USER } from './types';

// Petit composant pour déclencher un login au montage (simulateur de session).
function AutoLogin() {
  const { login } = useAuth();
  useEffect(() => {
    login(DEMO_USER);
  }, [login]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AutoLogin />
        <AdminShell />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

// ─── src/contexts/SessionContext.tsx ────────────────────────────
import {
  createContext, useContext, useReducer, type ReactNode, type Dispatch,
} from 'react';
import type { User } from '../types';

interface SessionState {
  user: User | null;
  status: 'anonymous' | 'authenticating' | 'authenticated';
  error: string | null;
}

type SessionAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, status: 'authenticating', error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, status: 'authenticated', error: null };
    case 'LOGIN_ERROR':
      return { user: null, status: 'anonymous', error: action.payload };
    case 'LOGOUT':
      return { user: null, status: 'anonymous', error: null };
  }
}

const INITIAL: SessionState = { user: null, status: 'anonymous', error: null };

// Split : state (volatile) et dispatch (référence stable) dans deux contextes
const SessionStateContext = createContext<SessionState | null>(null);
const SessionDispatchContext = createContext<Dispatch<SessionAction> | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, INITIAL);
  return (
    <SessionStateContext value={state}>
      <SessionDispatchContext value={dispatch}>
        {children}
      </SessionDispatchContext>
    </SessionStateContext>
  );
}

export function useSessionState(): SessionState {
  const ctx = useContext(SessionStateContext);
  if (ctx === null) throw new Error('useSessionState hors <SessionProvider>');
  return ctx;
}

export function useSessionDispatch(): Dispatch<SessionAction> {
  const ctx = useContext(SessionDispatchContext);
  if (ctx === null) throw new Error('useSessionDispatch hors <SessionProvider>');
  return ctx;
}

// Consommateur "écriture seule" : ne lit que dispatch → ne re-rend pas
// quand `status` change dans SessionStateContext.
export function LogoutButton() {
  const dispatch = useSessionDispatch();
  return <button onClick={() => dispatch({ type: 'LOGOUT' })}>Déconnexion</button>;
}

// Consommateur "lecture" : re-rend quand la session change (voulu).
export function SessionBadge() {
  const { user, status } = useSessionState();
  if (status === 'authenticating') return <span>Connexion…</span>;
  return <span>{user ? `Admin : ${user.name}` : 'Non connecté'}</span>;
}
```

**Pourquoi ce corrigé est correct :**
- `AdminShell`, comme les autres intermédiaires, ne connaît plus `User` : le prop drilling a disparu, chaque consommateur lit son contexte directement.
- Chaque contexte a un défaut `null` + un hook gardé : un oubli de Provider lève une erreur claire en dev au lieu d'un bug silencieux, et le type renvoyé est non-nullable.
- `AuthContext` et `ThemeContext` sont deux domaines séparés : basculer le thème ne re-rend pas les consommateurs qui ne lisent qu'`useAuth`.
- `SessionContext` split state/dispatch : le `dispatch` de `useReducer` ayant une référence stable, `LogoutButton` ne re-rend jamais à cause d'un changement de `status`.
- Tous les Providers montent en `<Context value={...}>` (React 19), pas `<Context.Provider>`.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Ajoute une action asynchrone : un bouton "Se connecter" qui dispatch `LOGIN_START`, attend `await new Promise(r => setTimeout(r, 800))`, puis dispatch `LOGIN_SUCCESS` avec `DEMO_USER`. Vérifie que `SessionBadge` passe bien par l'état "Connexion…".
2. Ajoute un `LocaleContext` (`'fr' | 'en'`) avec son hook `useLocale()` gardé, et fais afficher à `TopBar` un libellé traduit selon la locale.
3. Prouve le bénéfice du split : ajoute un `console.log('render LogoutButton')` dans `LogoutButton` et un `console.log('render SessionBadge')` dans `SessionBadge`. Déclenche un `LOGIN_SUCCESS` et vérifie dans la console que seul `SessionBadge` re-rend.
4. **Sans ouvrir ce corrigé** ni le module 14.

**Critère de réussite :** la connexion async transite par "Connexion…", la locale bascule le libellé de la top-bar, et le log confirme que `LogoutButton` ne re-rend pas au changement de session.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces contextes vivent ici :

```
tribuzen/src/
  contexts/
    AuthContext.tsx      # useAuth() gardé — admin connecté transverse
    ThemeContext.tsx     # useTheme() gardé — thème clair/sombre admin
    SessionContext.tsx   # useReducer + split state/dispatch
  components/
    AdminShell.tsx       # ne drille plus currentUser
    TopBar.tsx           # useAuth() + useTheme()
    NavMenu.tsx          # useAuth() pour les droits super-admin
```

**Différences par rapport au lab :**
- `AuthContext` sera alimenté par un vrai appel API (`/api/me`) au montage, pas par un `DEMO_USER` en dur — la structure du contexte et du hook reste identique.
- Le `ThemeContext` persistera le choix dans `localStorage` et lira `prefers-color-scheme` au premier montage.
- `SessionContext` restera le store léger tant que le state applicatif est simple ; dès que des sélecteurs fins ou du cache serveur seront nécessaires, il migrera vers Zustand (module 15) / TanStack Query — les composants consommateurs changeront de hook mais garderont leur logique.

**Commit cible :**
```
feat(contexts): AuthContext + ThemeContext — suppression du prop drilling admin
feat(session): SessionContext — store léger useReducer + split state/dispatch
```
