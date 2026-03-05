# Correction — Exercice 11 : Routing multi-pages

## Resultat attendu

Une application avec une barre de navigation, 5 pages (Accueil, Taches, Detail tache, A propos, 404), des liens actifs dans la nav, un parametre dynamique `:id` pour le detail, une route protegee et le lazy loading sur la page A propos.

---

## Code corrige

### `src/exercises/ex11/pages/HomePage.tsx`

```tsx
import { Link } from "react-router";

/**
 * Page d'accueil avec liens vers les autres pages.
 */
export default function HomePage() {
  return (
    <div>
      <h2>Accueil</h2>
      <p>Bienvenue dans l'application de gestion de taches.</p>
      <nav>
        <ul>
          <li>
            <Link to="/tasks">Voir les taches</Link>
          </li>
          <li>
            <Link to="/about">A propos</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
```

### `src/exercises/ex11/pages/TasksPage.tsx`

```tsx
import { Link } from "react-router";

// Donnees statiques pour la demonstration
interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const tasks: Task[] = [
  { id: "1", title: "Configurer React Router", completed: true },
  { id: "2", title: "Creer les pages", completed: true },
  { id: "3", title: "Ajouter le lazy loading", completed: false },
  { id: "4", title: "Proteger les routes", completed: false },
];

/**
 * Page liste des taches avec liens vers le detail.
 */
export default function TasksPage() {
  return (
    <div>
      <h2>Liste des taches</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <Link to={`/tasks/${task.id}`}>
              <span
                style={{
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### `src/exercises/ex11/pages/TaskDetailPage.tsx`

```tsx
import { useParams, Link } from "react-router";

// Memes donnees que TasksPage (en production, on utiliserait un store ou un loader)
interface Task {
  id: string;
  title: string;
  completed: boolean;
  description: string;
}

const tasks: Task[] = [
  { id: "1", title: "Configurer React Router", completed: true, description: "Installer et configurer les routes de l'application." },
  { id: "2", title: "Creer les pages", completed: true, description: "Creer les composants pour chaque page de l'application." },
  { id: "3", title: "Ajouter le lazy loading", completed: false, description: "Utiliser React.lazy et Suspense pour le chargement differe." },
  { id: "4", title: "Proteger les routes", completed: false, description: "Creer un composant ProtectedRoute pour les pages protegees." },
];

/**
 * Page detail d'une tache.
 * Recupere l'id depuis les parametres d'URL.
 */
export default function TaskDetailPage() {
  // Typer les parametres d'URL
  const { id } = useParams<{ id: string }>();

  // Rechercher la tache
  const task = tasks.find((t) => t.id === id);

  // Tache introuvable
  if (!task) {
    return (
      <div>
        <h2>Tache introuvable</h2>
        <p>Aucune tache avec l'identifiant "{id}".</p>
        <Link to="/tasks">Retour a la liste</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Detail : {task.title}</h2>
      <p>
        <strong>Statut :</strong>{" "}
        {task.completed ? "Terminee" : "En cours"}
      </p>
      <p>
        <strong>Description :</strong> {task.description}
      </p>
      <Link to="/tasks">Retour a la liste</Link>
    </div>
  );
}
```

### `src/exercises/ex11/pages/AboutPage.tsx`

```tsx
/**
 * Page A propos (chargee en lazy loading).
 */
export default function AboutPage() {
  return (
    <div>
      <h2>A propos</h2>
      <p>
        Cette application a ete creee dans le cadre de la formation React 19
        avec TypeScript. Elle demontre l'utilisation de React Router v7 pour
        la navigation multi-pages.
      </p>
      <h3>Technologies utilisees</h3>
      <ul>
        <li>React 19</li>
        <li>TypeScript (mode strict)</li>
        <li>React Router v7</li>
        <li>Vite</li>
      </ul>
    </div>
  );
}
```

### `src/exercises/ex11/pages/NotFoundPage.tsx`

```tsx
import { Link } from "react-router";

/**
 * Page 404 affichee pour les routes inconnues.
 */
export default function NotFoundPage() {
  return (
    <div>
      <h2>404 — Page introuvable</h2>
      <p>La page que tu cherches n'existe pas.</p>
      <Link to="/">Retour a l'accueil</Link>
    </div>
  );
}
```

### `src/exercises/ex11/components/Layout.tsx`

```tsx
import { NavLink, Outlet } from "react-router";

/**
 * Composant Layout
 * Barre de navigation + zone de contenu (Outlet).
 */
export default function Layout() {
  // Style pour le lien actif
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? "bold" as const : "normal" as const,
    color: isActive ? "#2563eb" : "#374151",
    textDecoration: "none",
    padding: "0.5rem 1rem",
  });

  return (
    <div>
      {/* Barre de navigation */}
      <header>
        <nav style={{ display: "flex", gap: "0.5rem", padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
          <NavLink to="/" end style={navLinkStyle}>
            Accueil
          </NavLink>
          <NavLink to="/tasks" style={navLinkStyle}>
            Taches
          </NavLink>
          <NavLink to="/about" style={navLinkStyle}>
            A propos
          </NavLink>
        </nav>
      </header>

      {/* Zone de contenu : la page courante s'affiche ici */}
      <main style={{ padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
```

### `src/exercises/ex11/components/ProtectedRoute.tsx`

```tsx
import { Navigate, Outlet } from "react-router";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  redirectTo?: string;
  children?: ReactNode;
}

/**
 * Composant ProtectedRoute
 * Redirige vers une page si l'utilisateur n'est pas authentifie.
 */
export default function ProtectedRoute({
  isAuthenticated,
  redirectTo = "/",
  children,
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Rendre children s'il y en a, sinon Outlet pour les routes imbriquees
  return children ? <>{children}</> : <Outlet />;
}
```

### `src/exercises/ex11/router.tsx`

```tsx
import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

// Lazy loading : AboutPage n'est chargee que quand on y accede
const LazyAboutPage = lazy(() => import("./pages/AboutPage"));

/**
 * Configuration du router avec createBrowserRouter.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true, // Route par defaut (/)
        element: <HomePage />,
      },
      {
        path: "tasks",
        element: <TasksPage />,
      },
      {
        path: "tasks/:id", // Parametre dynamique
        element: <TaskDetailPage />,
      },
      {
        path: "about",
        element: (
          <Suspense fallback={<p>Chargement de la page...</p>}>
            <LazyAboutPage />
          </Suspense>
        ),
      },
      {
        path: "*", // Route catch-all pour les 404
        element: <NotFoundPage />,
      },
    ],
  },
]);
```

### `src/exercises/ex11/App.tsx`

```tsx
import { RouterProvider } from "react-router";
import { router } from "./router";

/**
 * Composant racine de l'exercice 11.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
```

---

## Ce que tu aurais pu oublier

### 1. Oublier `end` sur le `NavLink` de la racine

- ❌ `<NavLink to="/">Accueil</NavLink>` sans `end`.
  Le lien "Accueil" est toujours actif car `/` est un prefixe de toutes les routes.
- ✅ `<NavLink to="/" end>` ne correspond que si l'URL est exactement `/`.

### 2. Ne pas typer `useParams`

- ❌ `const { id } = useParams();` — `id` est de type `string | undefined`.
  Sans verification, on peut passer `undefined` a une fonction qui attend `string`.
- ✅ `const { id } = useParams<{ id: string }>();` avec une verification `if (!task)`.

### 3. Oublier `<Suspense>` avec `React.lazy`

- ❌ Utiliser `lazy()` sans `<Suspense>` provoque une erreur a l'execution.
- ✅ Toujours envelopper le composant lazy dans `<Suspense fallback={...}>`.

### 4. Oublier `replace` sur `<Navigate>`

- ❌ `<Navigate to="/" />` sans `replace` ajoute une entree dans l'historique.
  L'utilisateur ne peut pas revenir en arriere correctement.
- ✅ `<Navigate to="/" replace />` remplace l'entree dans l'historique.

### 5. Utiliser `<a>` au lieu de `<Link>`

- ❌ `<a href="/tasks">Taches</a>` recharge la page entiere.
- ✅ `<Link to="/tasks">Taches</Link>` fait une navigation cote client, sans rechargement.

---

## Concepts cles utilises

| Concept              | Description                                                          | Documentation                              |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `createBrowserRouter` | Creer un router avec la nouvelle API de React Router v7             | [React Router](https://reactrouter.com/) |
| `useParams`          | Recuperer les parametres dynamiques de l'URL                         | [React Router](https://reactrouter.com/hooks/use-params) |
| `NavLink`            | Lien avec style actif automatique                                    | [React Router](https://reactrouter.com/components/nav-link) |
| `Outlet`             | Zone de rendu pour les routes imbriquees                             | [React Router](https://reactrouter.com/components/outlet) |
| `Navigate`           | Composant pour les redirections declaratives                         | [React Router](https://reactrouter.com/components/navigate) |
| `React.lazy`         | Chargement differe d'un composant (code splitting)                   | [react.dev](https://react.dev/reference/react/lazy) |

---

## Pour aller plus loin

- Ajoute un systeme d'authentification simule avec un bouton login/logout.
- Utilise les loaders de React Router v7 pour pre-charger les donnees des taches.
- Implemente un breadcrumb dynamique avec `useMatches`.
