# Cours 20 — Protection des routes et lazy loading

> **Objectif** : Implémenter des routes protégées en React (équivalent des guards Angular), comprendre le code splitting avec `React.lazy` et `Suspense`, et mettre en place le lazy loading par route pour des performances optimales. Comparer avec les guards Angular et `loadComponent`.

---

## Rappel du cours précédent

<details>
<summary>1. Que retourne useParams et quel est le piège courant avec les types ?</summary>

`useParams` retourne un objet dont les valeurs sont toujours `string | undefined`. Le piège : oublier de convertir en nombre avec `Number(id)` ou ne pas vérifier que le paramètre existe avant de l'utiliser.
</details>

<details>
<summary>2. Quelle est la différence entre un loader et un useQuery ?</summary>

Le loader charge les données **avant** le rendu du composant (pas de loading state dans le composant). `useQuery` charge les données **après** le montage mais offre un cache intelligent, le refetch automatique et la gestion fine du staleTime.
</details>

<details>
<summary>3. Comment déclencher un errorElement depuis un loader ?</summary>

En lançant une `Response` : `throw new Response('Not found', { status: 404 })`. React Router attrape cette erreur et affiche l'`errorElement` configuré pour la route.
</details>

---

## Analogie

Imaginez un **musée avec différentes salles**. Certaines salles sont en accès libre (routes publiques), d'autres nécessitent un badge spécial (routes protégées). Le vigile à l'entrée (le composant de protection) vérifie votre badge avant de vous laisser entrer. S'il ne vous reconnaît pas, il vous redirige vers l'accueil. Par ailleurs, certaines salles lointaines ne sont pas éclairées tant que personne ne s'y rend (lazy loading) : on n'allume les lumières (on ne charge le code) que quand un visiteur approche.

---

## Théorie

### Routes protégées — le pattern wrapper

En React, il n'y a pas de « guards » natifs comme en Angular. On utilise un composant wrapper qui vérifie l'authentification :

```tsx
import { Navigate, Outlet } from 'react-router';

// ✅ Pattern standard : composant de protection
interface ProtectedRouteProps {
  isAuthenticated: boolean;
  redirectTo?: string;
}

function ProtectedRoute({ isAuthenticated, redirectTo = '/login' }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
```

```tsx
// ✅ Utilisation dans la configuration des routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Routes publiques
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },

      // Routes protégées
      {
        element: <ProtectedRoute isAuthenticated={/* ... */} />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'profile', element: <Profile /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
]);
```

> **Note** : `<Navigate>` est l'équivalent d'un `router.navigate()` déclaratif. L'option `replace` évite d'empiler l'entrée dans l'historique (l'utilisateur ne peut pas « revenir » à la page protégée avec le bouton retour).

### Pattern avancé : protection avec Context d'authentification

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

// Context d'auth
interface AuthContextType {
  user: { name: string; role: string } | null;
  login: (name: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être dans un AuthProvider');
  return context;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  const login = (name: string, role: string) => setUser({ name, role });
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Route protégée qui utilise le Context
function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Sauvegarde la page demandée pour rediriger après login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// ✅ Route protégée par rôle
function AdminRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

### Redirection après login

```tsx
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Récupère la page d'où venait l'utilisateur
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... appel API
    login('Alice', 'admin');
    navigate(from, { replace: true });  // ✅ Redirige vers la page demandée
  };

  return (
    <form onSubmit={handleLogin}>
      <p>Vous serez redirigé vers : {from}</p>
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

### Protection avec un loader

```tsx
// ✅ Alternative : protéger via un loader (avant le rendu)
async function protectedLoader() {
  const user = await getCurrentUser();  // Appel API
  if (!user) {
    return redirect('/login');
  }
  return user;
}

const router = createBrowserRouter([
  {
    path: 'dashboard',
    element: <Dashboard />,
    loader: protectedLoader,
  },
]);
```

### React.lazy — code splitting par composant

`React.lazy` permet de charger un composant uniquement quand il est nécessaire, au lieu de tout bundler dans un seul fichier :

```tsx
import { lazy, Suspense } from 'react';

// ❌ Import statique : chargé même si l'utilisateur ne visite jamais cette page
import Dashboard from './pages/Dashboard';

// ✅ Import dynamique : chargé uniquement quand le composant est rendu
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
```

### Suspense — le fallback pendant le chargement

```tsx
// ✅ Suspense affiche un fallback pendant que le composant lazy se charge
function App() {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <Dashboard />
    </Suspense>
  );
}

// ✅ Fallback plus élaboré
function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div className="spinner" />
      <p>Chargement de la page...</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

### Lazy loading par route — le pattern complet

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router';

// ✅ Chaque page est chargée à la demande
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Login = lazy(() => import('./pages/Login'));

// ✅ Layout avec Suspense global
function RootLayout() {
  return (
    <div>
      <header>{/* navigation */}</header>
      <Suspense fallback={<p>Chargement...</p>}>
        <Outlet />
      </Suspense>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: 'admin', element: <AdminPanel /> },
        ],
      },
    ],
  },
]);
```

### Lazy loading avec React Router v7 (route.lazy)

React Router v7 offre aussi `lazy` directement dans la configuration des routes :

```tsx
// ✅ Charge le module entier (composant + loader + errorElement) à la demande
const router = createBrowserRouter([
  {
    path: 'dashboard',
    lazy: async () => {
      const { Dashboard, dashboardLoader } = await import('./pages/Dashboard');
      return {
        element: <Dashboard />,
        loader: dashboardLoader,
      };
    },
  },
]);
```

### Impact sur le bundle

```
Sans lazy loading :
bundle.js ─────────────────────── 500 Ko (tout en un seul fichier)

Avec lazy loading par route :
bundle.js ─────── 150 Ko (core + page d'accueil)
dashboard.js ──── 80 Ko  (chargé quand on visite /dashboard)
settings.js ───── 40 Ko  (chargé quand on visite /settings)
admin.js ──────── 120 Ko (chargé quand on visite /admin)
```

### Comparaison avec Angular

| Concept | React | Angular |
|---------|-------|---------|
| Route protégée | Composant wrapper + `<Navigate>` | `canActivate` / `canActivateFn` guard |
| Protection par rôle | Composant wrapper avec logique de rôle | `canActivate` avec vérification du rôle |
| Redirection | `<Navigate to="/login">` | `router.navigate(['/login'])` dans le guard |
| Code splitting | `React.lazy(() => import(...))` | `loadComponent: () => import(...)` |
| Fallback loading | `<Suspense fallback={...}>` | Implicite (Angular charge en fond) |
| Lazy par route | `lazy` dans la config route | `loadComponent` / `loadChildren` |

```typescript
// Angular — canActivateFn guard (équivalent du ProtectedRoute React)
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

// Angular — lazy loading
export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
  },
];
```

> **Différence clé** : Angular a des guards déclaratifs (fonctions séparées), React utilise des composants. Les deux approches fonctionnent, mais les composants React sont plus flexibles (vous pouvez y mettre n'importe quelle logique et du JSX).

---

## Pratique

Créez une application avec :

1. Un `AuthProvider` avec `login` / `logout`
2. Un `ProtectedRoute` qui redirige vers `/login` si non connecté
3. Trois pages lazy-loadées : `Home`, `Dashboard` (protégée), `Login`
4. Après login, redirection vers la page demandée initialement
5. Un bouton `Déconnexion` sur le Dashboard

<details>
<summary>Solution</summary>

```tsx
import { createContext, useContext, useState, lazy, Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  Link,
} from 'react-router';

// Auth Context
interface AuthContextType {
  user: string | null;
  login: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  return (
    <AuthContext.Provider value={{ user, login: setUser, logout: () => setUser(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route
function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

// Lazy Pages
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));

// pages/Home.tsx
export default function Home() {
  return (
    <div>
      <h1>Accueil</h1>
      <Link to="/dashboard">Aller au Dashboard</Link>
    </div>
  );
}

// pages/Dashboard.tsx
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenue, {user} !</p>
      <button onClick={handleLogout}>Déconnexion</button>
    </div>
  );
}

// pages/Login.tsx
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login('Alice');
    navigate(from, { replace: true });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Connexion</h1>
      <button type="submit">Se connecter</button>
    </form>
  );
}

// Router
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<p>Chargement...</p>}>
        <Outlet />
      </Suspense>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
        ],
      },
    ],
  },
]);

// App
function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| Route protégée | Composant wrapper qui vérifie l'auth et rend `<Outlet />` ou `<Navigate />` |
| `<Navigate>` | Redirection déclarative (avec `replace` pour ne pas polluer l'historique) |
| Protection par rôle | Même pattern avec vérification du rôle en plus |
| `location.state` | Passer la page d'origine pour rediriger après login |
| `React.lazy` | Import dynamique — charge le composant à la demande |
| `Suspense` | Affiche un fallback pendant le chargement du composant lazy |
| Lazy par route | Chaque page dans un chunk séparé = bundle initial plus léger |
| vs Angular | Guards = fonctions, React = composants wrapper (plus flexibles) |

---

> **Prochain cours** : [Cours 21 — Formulaires : controlled vs uncontrolled](../05-formulaires/01-controlled-vs-uncontrolled.md)
