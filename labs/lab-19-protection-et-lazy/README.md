# Lab 19 — Protection des routes et lazy loading

> **Outcome :** à la fin, tu sais protéger la branche `/admin` de l'admin TribuZen par rôle (redirection UX), et lazy-loader l'écran stats (lourd) avec un fallback squelette — le tout dans une vraie app React 19 + React Router v7.
> **Vrai outil :** projet Vite + React 19 + TypeScript + `react-router-dom@^7`. Pas de harnais simulé, pas de fichier `exercise.ts`/`solution.ts`.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur). Critère de réussite = comportement observé dans le navigateur + relecture du code.

> ⚠️ **À garder en tête pendant TOUT le lab : la garde que tu écris ici est de l'UX, PAS une sécurité.**
> Elle empêche l'interface d'afficher un écran interdit et redirige proprement. Elle n'empêche **pas** l'accès aux données : n'importe qui peut lire ton bundle, contourner la garde, ou appeler l'API à la main. Le vrai contrôle d'accès vit **côté API** (re-vérification du token + du rôle à chaque requête). Si tu retires ce lab, l'app doit devenir moins agréable — jamais moins sûre.

## Énoncé

Tu pars d'une app admin TribuZen minimale. Elle a un `AuthProvider`, quelques pages, mais **aucune garde** et **tout est importé en dur**. Tu dois :

1. Écrire une garde `RequireRole` qui protège `/admin` (rôle `admin` requis).
2. Rediriger un non-connecté vers `/login` (avec retour après login), un connecté sans le bon rôle vers `/403`.
3. Lazy-loader l'écran lourd `/admin/stats` avec `React.lazy` + `<Suspense>` et un squelette.
4. Vérifier dans le navigateur que le chunk stats n'est téléchargé qu'à l'ouverture de l'écran.

Starter (à recréer dans un projet Vite `react-ts`) :

```tsx
// src/auth/AuthContext.tsx  (fourni)
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface User { name: string; role: 'admin' | 'mod' | 'member'; }
interface AuthValue { user: User | null; login: (u: User) => void; logout: () => void; }

const AuthContext = createContext<AuthValue | null>(null);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors <AuthProvider>');
  return ctx;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  return (
    <AuthContext value={{ user, login: setUser, logout: () => setUser(null) }}>
      {children}
    </AuthContext>
  );
}
```

```tsx
// src/pages/AdminStats.tsx  (fourni — simule un écran lourd)
export default function AdminStats() {
  // Imagine ici une lib de charting de ~200 Ko.
  return <section><h1>Statistiques de rétention</h1><p>[graphe lourd]</p></section>;
}
```

```tsx
// src/App.tsx  (fourni — À CORRIGER : aucune garde, tout statique)
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminStats from './pages/AdminStats'; // ⚠️ import statique
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { path: 'login', element: <Login /> },
      { path: '403', element: <Forbidden /> },
      { path: 'admin', element: <AdminDashboard /> },         // ⚠️ pas gardé
      { path: 'admin/stats', element: <AdminStats /> },       // ⚠️ pas gardé, pas lazy
    ],
  },
]);

export default function App() {
  return <AuthProvider><RouterProvider router={router} /></AuthProvider>;
}
```

## Étapes (en friction)

1. **Écris la garde toi-même.** Crée `src/auth/guards.tsx` avec `RequireRole({ role })` : lit `useAuth()` et `useLocation()`, rend <code v-pre>&lt;Navigate to="/login" state={{ from }} replace /&gt;</code> si pas de user, `<Navigate to="/403" replace />` si mauvais rôle, `<Outlet />` sinon. Ne recopie pas le module — reconstruis de mémoire.
2. **Câble la garde** dans `App.tsx` : regroupe `admin` et `admin/stats` sous une route parente `{ element: <RequireRole role="admin" />, children: [...] }`.
3. **Gère le retour après login.** Dans `Login`, lis `location.state.from?.pathname` (défaut `/admin`) et `navigate(from, { replace: true })` après `login(...)`.
4. **Lazy-load l'écran stats.** Remplace l'import statique de `AdminStats` par `const AdminStats = lazy(() => import('./pages/AdminStats'))`, et entoure-le d'un `<Suspense fallback={<StatsSkeleton />}>`. Crée `StatsSkeleton` avec `aria-busy`.
5. **Observe le réseau.** `npm run build && npm run preview`, ouvre l'onglet Réseau, confirme qu'un chunk `AdminStats-*.js` séparé n'apparaît que quand tu ouvres `/admin/stats`.
6. **Prouve que ce n'est pas une sécurité.** Connecte-toi en `member`, tape `/admin` : tu es renvoyé sur `/403`. Puis note à voix haute pourquoi un appel direct à `/api/admin/*` passerait quand même sans contrôle serveur.

## Corrigé complet commenté

```tsx
// src/auth/guards.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type User } from './AuthContext';

// Garde de RÔLE. RAPPEL : UX, pas sécurité — le vrai contrôle est côté API.
export function RequireRole({ role }: { role: User['role'] }) {
  const { user } = useAuth();
  const location = useLocation();

  // Cas 1 : pas connecté → /login, en mémorisant la cible pour y revenir.
  if (!user) {
    // replace : n'empile pas /login (sinon "Précédent" reboucle dessus).
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Cas 2 : connecté mais rôle insuffisant → écran dédié, PAS /login.
  if (user.role !== role) {
    return <Navigate to="/403" replace />;
  }

  // Cas 3 : autorisé → on laisse passer vers les routes enfants.
  return <Outlet />;
}
```

```tsx
// src/pages/StatsSkeleton.tsx
// Fallback aux dimensions du contenu final → pas de layout shift.
export function StatsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des statistiques">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--chart" />
    </div>
  );
}
```

```tsx
// src/pages/Login.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Page visée avant redirection (posée par RequireRole), défaut /admin.
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // En vrai : POST /api/login → renvoie le user + pose le cookie httpOnly.
    login({ name: 'Alice', role: 'admin' });
    navigate(from, { replace: true }); // ramène l'utilisateur là où il allait
  };

  return (
    <form onSubmit={handleSubmit}>
      <p>Après connexion : redirection vers {from}</p>
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

```tsx
// src/App.tsx — CORRIGÉ : garde de rôle + lazy loading de l'écran lourd
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireRole } from './auth/guards';
import { StatsSkeleton } from './pages/StatsSkeleton';
import AdminDashboard from './pages/AdminDashboard'; // léger → statique OK
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';

// Écran lourd sorti du bundle initial : chunk chargé à la demande.
const AdminStats = lazy(() => import('./pages/AdminStats'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { path: 'login', element: <Login /> },
      { path: '403', element: <Forbidden /> },
      {
        // Toute la branche /admin exige le rôle admin (UX).
        element: <RequireRole role="admin" />,
        children: [
          { path: 'admin', element: <AdminDashboard /> },
          {
            path: 'admin/stats',
            element: (
              // Suspense obligatoire autour d'un composant React.lazy.
              <Suspense fallback={<StatsSkeleton />}>
                <AdminStats />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```

Comportement attendu :
- non connecté sur `/admin` → `/login`, puis retour automatique sur `/admin` après connexion ;
- `role: 'member'` sur `/admin` → `/403` ;
- `role: 'admin'` sur `/admin/stats` → chunk `AdminStats-*.js` téléchargé à ce moment-là (visible dans l'onglet Réseau), squelette affiché le temps du chargement.

## Variante J+30 (fading)

Refais le lab **sans regarder le corrigé, en 25 min**, avec deux contraintes ajoutées :

1. Remplace `React.lazy` + `Suspense` par le **`lazy` de route du data router v7** : `{ path: 'admin/stats', lazy: () => import('./pages/adminStats.route') }`, où `adminStats.route.tsx` exporte `Component` (renommé depuis le default) **et** un `loader` qui `fetch('/api/admin/stats')` et `throw new Response('Forbidden', { status: 403 })` sur un 403. Plus de `Suspense` manuel.
2. Ajoute un `ErrorBoundary` de route qui affiche l'écran `/403` quand le loader lève la `Response 403`.

Objectif : montrer que tu sais choisir entre les deux mécanismes de lazy et que tu relies la garde client au vrai contrôle serveur (le loader capte le `403` de l'API).

## Application TribuZen

Porte le résultat dans le vrai produit `smaurier/tribuzen` :

- crée `src/auth/guards.tsx` (`RequireRole`) et enveloppe la branche `/admin` du routeur ;
- passe `AdminStats.tsx` (écran de rétention réel, avec sa lib de charting) en lazy-load + `StatsSkeleton` ;
- **côté API** : vérifie/ajoute le middleware serveur qui re-contrôle le JWT et le rôle `admin` sur `GET /api/admin/*`. C'est CETTE barrière qui protège les données ; la garde React n'est que l'habillage UX.
- commit suggéré : `feat(admin): garde de rôle /admin + lazy-load écran stats (UX) — contrôle réel côté API`.
