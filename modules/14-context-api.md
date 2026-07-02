---
titre: Context API
cours: 04-react
notions: [prop drilling, createContext, Provider, useContext, Context comme Provider en React 19, valeur par défaut vs hors Provider, custom hook d'accès avec garde, split state/dispatch pour les re-renders, Context combiné avec useReducer, Context n'est pas un state manager global]
outcomes: [partager du state à travers l'arbre sans prop drilling avec createContext et useContext, sécuriser l'accès à un contexte avec un custom hook qui garde le hors-Provider, éviter les re-renders inutiles en séparant contexte state et contexte dispatch]
prerequis: [13-usereducer]
next: 15-zustand
libs: [{ name: react, version: "^19" }]
tribuzen: AuthContext + ThemeContext de l'admin TribuZen, combinés au useReducer de session pour un store léger
last-reviewed: 2026-07
---

# Context API

> **Outcomes — tu sauras FAIRE :** partager du state à travers l'arbre sans prop drilling avec `createContext` + `useContext`, sécuriser l'accès à un contexte avec un custom hook qui garde le hors-Provider, éviter les re-renders inutiles en séparant contexte state et contexte dispatch.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu reprends l'admin TribuZen. L'utilisateur admin connecté (`currentUser`) doit être lisible dans la top-bar (afficher son nom), dans la sidebar (masquer les entrées réservées aux super-admins) et dans chaque page (vérifier les droits). Un collègue a fait passer `currentUser` en prop, de proche en proche :

```tsx
// ❌ Prop drilling : currentUser traverse 3 composants qui n'en font rien
function App() {
  const currentUser = { id: 'u1', name: 'Alice', role: 'admin' as const };
  return <AdminShell currentUser={currentUser} />;
}

function AdminShell({ currentUser }: { currentUser: User }) {
  // AdminShell n'utilise PAS currentUser — il ne fait que le repasser
  return (
    <div className="shell">
      <TopBar currentUser={currentUser} />
      <Sidebar currentUser={currentUser} />
    </div>
  );
}

function Sidebar({ currentUser }: { currentUser: User }) {
  // Sidebar non plus — elle le repasse encore
  return <NavMenu currentUser={currentUser} />;
}

function NavMenu({ currentUser }: { currentUser: User }) {
  // Enfin le vrai consommateur, 3 niveaux plus bas
  return <span>Connecté : {currentUser.name}</span>;
}
```

**Trois problèmes immédiats :**
1. `AdminShell` et `Sidebar` reçoivent une prop qu'ils n'utilisent pas — juste pour la transmettre. C'est le **prop drilling**.
2. Le jour où `NavMenu` a aussi besoin du `theme`, il faut ajouter la prop dans toute la chaîne.
3. Chaque composant intermédiaire est couplé à un type (`User`) qui ne le concerne pas — refactorer devient pénible.

Ce module te donne l'outil pour brancher `currentUser` (et le thème) une fois, et les lire directement où il faut : le **Context**.

---

## 2. Théorie complète, concise

### 2.1 Ce que résout le Context — et ce qu'il ne résout pas

Le Context crée un **canal** de données accessible partout sous un point de montage, sans passer par les props intermédiaires. C'est l'équivalent React de `provide/inject` (Vue 3) ou de l'injection de dépendances Angular.

Ce n'est **pas** un state manager global. Le Context ne stocke rien par lui-même : il ne fait que *transporter* une valeur que tu tiens ailleurs (souvent un `useState` ou un `useReducer`). Il n'apporte ni sélecteurs, ni middleware, ni persistance, ni optimisation des re-renders. Pour ça, on passe à Zustand (module 15).

### 2.2 Les trois pièces : createContext, Provider, useContext

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

// 1. createContext — crée le canal. Le type inclut null car,
//    tant qu'aucun Provider n'est monté, la valeur par défaut s'applique.
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

// 2. Provider — fournit la valeur à tout le sous-arbre.
//    En React 19, <ThemeContext> se monte directement (voir 2.3).
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext>
  );
}

// 3. useContext — lit la valeur du Provider le plus proche dans l'arbre.
function ThemeToggle() {
  const ctx = useContext(ThemeContext);
  return <button onClick={ctx?.toggleTheme}>Thème : {ctx?.theme}</button>;
}
```

### 2.3 React 19 : `<Context>` est utilisable directement comme Provider

Nouveauté React 19 : l'objet retourné par `createContext` peut se monter **directement** comme composant fournisseur. Plus besoin d'écrire `.Provider`.

```tsx
// ✅ React 19 — forme moderne
<ThemeContext value={{ theme, toggleTheme }}>
  {children}
</ThemeContext>

// 🕰️ React ≤ 18 — forme historique, toujours acceptée mais dépréciée
<ThemeContext.Provider value={{ theme, toggleTheme }}>
  {children}
</ThemeContext.Provider>
```

`<Context.Provider>` fonctionne encore en React 19 (rétro-compatibilité), mais l'équipe React le déprécie : le codemod officiel réécrit `.Provider` en `<Context>`. Dans ce cours, on écrit toujours la forme courte. Le `Consumer` (`<Context.Consumer>`) reste lui aussi legacy — on ne l'utilise plus, `useContext` le remplace.

### 2.4 Valeur par défaut vs "hors Provider" — piège classique

Le premier argument de `createContext(defaultValue)` n'est **pas** une valeur initiale de state. Il est utilisé **uniquement** quand un composant appelle `useContext` sans aucun Provider au-dessus de lui dans l'arbre.

```tsx
const ThemeContext = createContext<ThemeContextValue | null>(null);
//                                                          ^^^^
// Si un composant lit ce contexte SANS <ThemeContext> parent → il reçoit null.
```

On met `null` comme défaut **exprès**, pour rendre l'oubli de Provider détectable. Sans ça, un défaut "plausible" (`{ theme: 'light', toggleTheme: () => {} }`) masquerait le bug : le bouton ne ferait rien, sans erreur. Le custom hook de la section suivante transforme ce `null` en erreur explicite.

### 2.5 Custom hook d'accès + garde "hors Provider"

On n'expose jamais `useContext(MonContexte)` brut aux composants. On l'enveloppe dans un custom hook qui :
- vérifie la présence du Provider (garde),
- renvoie un type non-nullable (plus de `ctx?.` partout côté consommateur).

```tsx
// ✅ Custom hook d'accès — la seule porte d'entrée du contexte
function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    // Garde : on est hors du Provider → erreur explicite, pas un bug silencieux
    throw new Error('useTheme doit être appelé dans un <ThemeProvider>');
  }
  return ctx; // typé ThemeContextValue (non-null) grâce au throw au-dessus
}

// Consommateur — propre, sans optional chaining
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Thème : {theme}</button>;
}
```

Le `throw` fait deux choses : il te prévient tôt (pendant le dev, pas en prod chez l'utilisateur), et il **rétrécit le type** — après le `if`, TypeScript sait que `ctx` n'est plus `null`.

### 2.6 Le piège des re-renders : split state / dispatch

Quand la valeur d'un Provider change, **tous** les composants qui consomment ce contexte re-rendent — même ceux qui ne lisent que la partie inchangée. Avec un contexte qui mélange state et fonctions, ça se paie cher.

```tsx
// ❌ Un seul contexte : state + dispatch mélangés
// Chaque changement de `count` re-rend AUSSI les composants qui n'appellent que dispatch.
const CounterContext = createContext<{
  count: number;
  dispatch: React.Dispatch<Action>;
} | null>(null);
```

La parade : **deux contextes**, un pour l'état (qui change), un pour le `dispatch` (stable — `useReducer` garantit une référence de dispatch constante). Un composant qui ne fait que dispatcher (un bouton "+1") s'abonne au contexte dispatch seul, et ne re-rend jamais quand `count` change.

```tsx
// ✅ Split : le state d'un côté, le dispatch de l'autre
const CounterStateContext = createContext<number | null>(null);
const CounterDispatchContext = createContext<React.Dispatch<Action> | null>(null);

function CounterProvider({ children }: { children: ReactNode }) {
  const [count, dispatch] = useReducer(reducer, 0);
  return (
    <CounterStateContext value={count}>
      <CounterDispatchContext value={dispatch}>
        {children}
      </CounterDispatchContext>
    </CounterStateContext>
  );
}

// Ce bouton ne lit QUE dispatch → il ne re-rend pas quand count change
function IncrementButton() {
  const dispatch = useContext(CounterDispatchContext)!;
  return <button onClick={() => dispatch({ type: 'inc' })}>+1</button>;
}
```

Autre réflexe complémentaire : **séparer les contextes par domaine** (`ThemeContext`, `AuthContext`, `LocaleContext`) plutôt qu'un mégacontexte `AppContext`. Si seul le thème change, les consommateurs d'auth ne re-rendent pas.

### 2.7 Context combiné à useReducer (rappel module 13)

Le combo canonique pour un store de session léger : `useReducer` tient l'état + la logique de transition, le Context le distribue. Ça donne un mini "Redux maison" sans dépendance.

```tsx
import { createContext, useContext, useReducer, type ReactNode } from 'react';

interface SessionState {
  user: User | null;
  status: 'anonymous' | 'authenticating' | 'authenticated';
}

type SessionAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, status: 'authenticating' };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, status: 'authenticated' };
    case 'LOGOUT':
      return { user: null, status: 'anonymous' };
  }
}

const SessionStateContext = createContext<SessionState | null>(null);
const SessionDispatchContext = createContext<React.Dispatch<SessionAction> | null>(null);

function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, {
    user: null,
    status: 'anonymous',
  });
  return (
    <SessionStateContext value={state}>
      <SessionDispatchContext value={dispatch}>
        {children}
      </SessionDispatchContext>
    </SessionStateContext>
  );
}
```

### 2.8 Cas d'usage légitimes (et illégitimes) du Context

| Donnée partagée | Fréquence de changement | Context adapté ? |
|---|---|---|
| Thème (light/dark) | Rare | Oui |
| Utilisateur authentifié | Rare | Oui |
| Locale / langue | Rare | Oui |
| Config de l'app | Quasi jamais | Oui |
| Compteur haute fréquence | Fréquente | Non (ou split + prudence) |
| Position de la souris | Très fréquente | Non |
| Cache de données serveur | Fréquente + logique | Non → TanStack Query |
| Store applicatif riche | Fréquente + sélecteurs | Non → Zustand (module 15) |

Règle : le Context brille pour du state **stable, lu partout**. Dès que ça change souvent ou demande des sélecteurs fins, un vrai state manager est plus adapté.

---

## 3. Worked examples

### Exemple 1 — AuthContext + ThemeContext de l'admin TribuZen

On remplace le prop drilling du cas concret. Deux contextes de domaine, chacun avec son custom hook gardé.

```tsx
// ─── src/types/user.ts ──────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: 'admin' | 'super-admin';
}

// ─── src/contexts/AuthContext.tsx ───────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '@/types/user';

interface AuthContextValue {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// null par défaut = "aucun Provider au-dessus" → détectable via le hook
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const login = (user: User) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);

  // React 19 : on monte <AuthContext> directement (pas de .Provider)
  return (
    <AuthContext value={{ currentUser, login, logout }}>
      {children}
    </AuthContext>
  );
}

// Custom hook gardé — seule porte d'entrée
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth doit être appelé dans un <AuthProvider>');
  }
  return ctx;
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

// ─── src/App.tsx — on compose les Providers ─────────────────────
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AdminShell from '@/components/AdminShell';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AdminShell />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

// ─── Consommateurs — plus AUCUNE prop drillée ───────────────────
function AdminShell() {
  // AdminShell ne reçoit ni ne repasse currentUser : fini le drilling
  return (
    <div className="shell">
      <TopBar />
      <NavMenu />
    </div>
  );
}

function TopBar() {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <header>
      <span>Connecté : {currentUser?.name ?? 'invité'}</span>
      <button onClick={toggleTheme}>Thème : {theme}</button>
    </header>
  );
}

function NavMenu() {
  const { currentUser } = useAuth();
  // Lit directement le rôle, sans qu'aucun parent n'ait à connaître User
  return (
    <nav>
      <a href="/familles">Familles</a>
      {currentUser?.role === 'super-admin' && <a href="/admins">Admins</a>}
    </nav>
  );
}
```

**Ce que ce découpage apporte :**
- `AdminShell` et les intermédiaires ne connaissent plus `User` — plus de prop drilling.
- Deux contextes de domaine : changer le thème ne re-rend pas les consommateurs qui ne lisent que `useAuth`.
- Chaque hook (`useAuth`, `useTheme`) garde le hors-Provider : un oubli de `<AuthProvider>` lève une erreur claire en dev.

### Exemple 2 — Store de session léger (Context + useReducer, split state/dispatch)

On combine le module 13 : `useReducer` pour la logique de session, deux contextes pour éviter les re-renders des composants qui ne font que dispatcher.

```tsx
// ─── src/contexts/SessionContext.tsx ────────────────────────────
import {
  createContext, useContext, useReducer, type ReactNode, type Dispatch,
} from 'react';
import type { User } from '@/types/user';

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

// Deux contextes : state (change) vs dispatch (référence stable)
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

// Un hook par contexte, chacun gardé
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

// ─── Consommateurs ──────────────────────────────────────────────
// Ce bouton ne lit QUE dispatch → il ne re-rend pas quand `status` change
function LogoutButton() {
  const dispatch = useSessionDispatch();
  return <button onClick={() => dispatch({ type: 'LOGOUT' })}>Déconnexion</button>;
}

// Celui-ci lit le state → il re-rend quand la session change (c'est voulu)
function SessionBadge() {
  const { user, status } = useSessionState();
  if (status === 'authenticating') return <span>Connexion…</span>;
  return <span>{user ? `Admin : ${user.name}` : 'Non connecté'}</span>;
}
```

**Pourquoi ce corrigé est correct :**
- Le `dispatch` de `useReducer` a une référence **stable** : le mettre dans son propre contexte permet à `LogoutButton` de ne jamais re-rendre à cause d'un changement de `status`.
- Un custom hook par contexte, chacun avec sa garde : impossible de lire une session hors du Provider sans erreur explicite.
- Le reducer centralise toutes les transitions de session — les composants ne font que dispatcher des intentions.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Prendre la valeur par défaut pour une valeur initiale

```tsx
// ❌ Croire que 'light' sera l'état de départ du thème
const ThemeContext = createContext<Theme>('light');
// FAUX : 'light' ne sert QUE si un composant lit le contexte hors de tout Provider.
// L'état initial réel, c'est le useState/useReducer DANS le Provider.
```

La valeur par défaut n'est lue **que** hors Provider. Mets `null` (+ hook gardé) pour transformer l'oubli de Provider en erreur, au lieu d'un défaut trompeur qui masque le bug.

### PIÈGE #2 — Exposer `useContext` brut au lieu d'un custom hook gardé

```tsx
// ❌ Chaque consommateur doit gérer le null lui-même
function TopBar() {
  const ctx = useContext(AuthContext); // ctx: AuthContextValue | null
  return <span>{ctx?.currentUser?.name}</span>; // optional chaining partout
}

// ✅ Le hook garde le null une fois pour toutes
function TopBar() {
  const { currentUser } = useAuth(); // typé non-null, ou throw si hors Provider
  return <span>{currentUser?.name}</span>;
}
```

Sans hook gardé : optional chaining répété, aucune erreur claire en cas d'oubli de Provider, et le type reste `| null` partout.

### PIÈGE #3 — Un seul mégacontexte state + dispatch → re-renders en cascade

```tsx
// ❌ state et dispatch dans la même value
const CtxA = createContext<{ count: number; dispatch: Dispatch<A> } | null>(null);
// Tout consommateur re-rend à chaque changement de count,
// même un bouton qui n'appelle QUE dispatch.

// ✅ Split : dispatch (stable) séparé du state (volatile)
const StateCtx = createContext<number | null>(null);
const DispatchCtx = createContext<Dispatch<A> | null>(null);
```

Le `dispatch` de `useReducer` est stable : l'isoler dans son propre contexte évite de re-rendre les composants qui n'écrivent que.

### PIÈGE #4 — Utiliser encore `<Context.Provider>` / `<Context.Consumer>` en React 19

```tsx
// 🕰️ Legacy — encore accepté mais déprécié en React 19
<ThemeContext.Provider value={v}>{children}</ThemeContext.Provider>
<ThemeContext.Consumer>{v => <span>{v?.theme}</span>}</ThemeContext.Consumer>

// ✅ React 19 — Provider court + useContext à la place du Consumer
<ThemeContext value={v}>{children}</ThemeContext>
// ... et dans le consommateur :
const { theme } = useTheme();
```

`<Context>` remplace `<Context.Provider>` ; `useContext` remplace le render-prop `<Context.Consumer>`. Le codemod React 19 fait la première migration automatiquement.

### PIÈGE #5 — Traiter le Context comme un state manager global

Le Context ne fait que *transporter* une valeur : pas de sélecteurs, pas de middleware, pas d'optimisation des re-renders au-delà de ce que tu codes à la main (split). Pour un vrai store (sélecteurs fins, devtools, persistance), c'est Zustand — module 15. Le Context reste parfait pour thème, auth, locale : du state stable lu partout.

### PIÈGE #6 — Créer un nouvel objet `value` à chaque rendu sans nécessité

```tsx
// ⚠️ value est un objet recréé à chaque render du Provider
<AuthContext value={{ currentUser, login, logout }}>
```

Ce n'est un problème que si le Provider re-rend souvent pour d'autres raisons : chaque nouvel objet force tous les consommateurs à re-rendre. Quand le Provider est haut et stable (cas thème/auth), c'est négligeable. Sinon, mémoïse la value avec `useMemo` (module 11) ou passe au split state/dispatch.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, le Context porte l'état transverse de session et de présentation — ce qui est lu partout mais change rarement.

**`AuthContext`** (`src/contexts/AuthContext.tsx`) — transporte l'admin connecté (`currentUser`, `role`). Lu par la top-bar (nom + avatar), la sidebar (entrées `super-admin` conditionnelles), les gardes de route. Custom hook `useAuth()` gardé : appeler `useAuth` hors `<AuthProvider>` lève une erreur en dev.

**`ThemeContext`** (`src/contexts/ThemeContext.tsx`) — thème clair/sombre de l'interface admin. Contexte de domaine distinct d'`AuthContext` : basculer le thème ne re-rend pas les consommateurs d'auth.

**`SessionProvider`** (`src/contexts/SessionContext.tsx`) — le combo Context + `useReducer` du module 13 : un store léger de session (`anonymous` → `authenticating` → `authenticated`), split state/dispatch pour que les boutons d'action (déconnexion) ne re-rendent pas au changement de statut. C'est le "Redux maison" de TribuZen tant que le state applicatif reste simple — il migrera vers Zustand (module 15) quand les sélecteurs fins deviendront nécessaires.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  contexts/
    AuthContext.tsx      # useAuth() gardé
    ThemeContext.tsx     # useTheme() gardé
    SessionContext.tsx   # useReducer + split state/dispatch
  components/
    AdminShell.tsx       # ne drille plus currentUser
    TopBar.tsx           # useAuth() + useTheme()
    NavMenu.tsx          # useAuth() pour les droits
```

---

## 6. Points clés

1. Le Context supprime le prop drilling : `createContext` crée un canal, le Provider fournit la valeur, `useContext` la lit dans tout le sous-arbre.
2. En React 19, `<Context>` se monte directement comme Provider — `<Context.Provider>` et `<Context.Consumer>` sont legacy (dépréciés, migrés par codemod).
3. La valeur passée à `createContext(defaultValue)` n'est PAS un état initial : elle ne sert que hors Provider. On met `null` exprès pour rendre l'oubli détectable.
4. On enveloppe toujours `useContext` dans un custom hook qui garde le hors-Provider (`throw`) et renvoie un type non-nullable.
5. Tout consommateur re-rend quand la value change : séparer state et dispatch en deux contextes évite les re-renders des composants qui n'écrivent que.
6. Séparer les contextes par domaine (auth, theme, locale) plutôt qu'un mégacontexte : un changement isolé ne re-rend pas tout.
7. Context + `useReducer` = store de session léger (module 13) ; le Context transporte, le reducer décide.
8. Le Context n'est pas un state manager global (pas de sélecteurs/middleware) : pour ça, Zustand (module 15). Il excelle pour du state stable lu partout.

---

## 7. Seeds Anki

```
Que résout le Context API en React, et que ne résout-il pas ?|Il supprime le prop drilling en transportant une valeur à travers l'arbre sans passer par les props intermédiaires (via createContext/Provider/useContext). Il ne stocke rien lui-même et n'est pas un state manager : ni sélecteurs, ni middleware, ni optimisation de re-render au-delà du split manuel.
En React 19, comment monte-t-on un Provider de Context ?|Directement avec <MonContext value={...}>{children}</MonContext>. La forme <MonContext.Provider> et <MonContext.Consumer> sont legacy/dépréciées ; useContext remplace le Consumer, et un codemod officiel réécrit .Provider.
À quoi sert la valeur passée à createContext(defaultValue) ?|Uniquement quand un composant appelle useContext SANS aucun Provider au-dessus de lui dans l'arbre. Ce n'est pas un état initial. On met souvent null pour rendre l'oubli de Provider détectable via un custom hook qui throw.
Pourquoi envelopper useContext dans un custom hook ?|Pour garder le cas hors-Provider (throw une erreur explicite si le contexte est null) et renvoyer un type non-nullable, évitant l'optional chaining partout côté consommateur. C'est la seule porte d'entrée du contexte.
Pourquoi et comment séparer state et dispatch en deux contextes ?|Parce que tout consommateur re-rend quand la value du Provider change. En mettant le state (volatile) et le dispatch (référence stable via useReducer) dans deux contextes distincts, un composant qui ne fait que dispatcher ne re-rend pas quand le state change.
Comment construit-on un store de session léger avec le Context ?|En combinant useReducer (état + logique de transition centralisées) et le Context (distribution). Idéalement en split : un contexte pour le state, un pour le dispatch. C'est un "Redux maison" sans dépendance, valable tant que le state reste simple.
Quand préférer un vrai state manager (Zustand) au Context ?|Quand le state change souvent ou nécessite des sélecteurs fins, du middleware, des devtools ou de la persistance. Le Context excelle pour du state stable lu partout (thème, auth, locale) mais n'optimise pas les re-renders au-delà du split manuel.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-14-context-api/README.md`. Remplacer le prop drilling de `currentUser` par un `AuthContext` + `ThemeContext` (React 19, hooks gardés), puis monter un store de session léger Context + `useReducer` avec split state/dispatch.
