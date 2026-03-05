# Cours 18 — React Router : navigation basique

> **Objectif** : Mettre en place React Router v7 avec `createBrowserRouter` et `RouterProvider`. Configurer les routes, créer des layouts avec `Outlet`, et naviguer avec `Link`, `NavLink` et `useNavigate`. Comparer avec Vue Router et Angular Router.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence fondamentale entre état client et état serveur ?</summary>

L'état client (thème, sidebar, formulaire) est contrôlé entièrement par le frontend. L'état serveur (utilisateurs, produits, commandes) vit sur le backend et peut devenir obsolète. TanStack Query gère l'état serveur, Zustand/Context gèrent l'état client.
</details>

<details>
<summary>2. À quoi sert le queryKey dans TanStack Query ?</summary>

Le `queryKey` est un tableau qui sert d'identifiant unique pour le cache. TanStack Query l'utilise pour stocker, retrouver et invalider les données. Exemple : `['users', 42]` identifie l'utilisateur avec l'id 42.
</details>

<details>
<summary>3. Comment invalider le cache après une mutation ?</summary>

En appelant `queryClient.invalidateQueries({ queryKey: ['users'] })` dans le callback `onSuccess` de `useMutation`. Cela force TanStack Query à refetcher les données concernées.
</details>

---

## Analogie

Imaginez un **immeuble de bureaux avec un réceptionniste**. Quand un visiteur arrive et dit « je vais au service comptabilité » (URL `/comptabilite`), le réceptionniste (le Router) consulte le plan de l'immeuble (la configuration des routes) et dirige le visiteur vers le bon étage et le bon bureau (le composant). Le visiteur ne recharge pas tout l'immeuble à chaque visite — il se déplace simplement d'une pièce à l'autre (navigation SPA).

---

## Théorie

### React Router v7 — le standard de fait

React Router est la librairie de routing de référence en React. La v7 (sortie fin 2024) unifie React Router et Remix en un seul framework.

```bash
npm install react-router
```

> **Note** : en React Router v7, le package s'appelle simplement `react-router` (plus besoin de `react-router-dom` séparément).

### Configuration avec createBrowserRouter

```tsx
// ❌ Ancienne API (v5 et avant) — composants JSX dans le rendu
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Routes>
</BrowserRouter>
```

```tsx
// ✅ API moderne (v7) — configuration objet + RouterProvider
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### Le Layout avec Outlet

`Outlet` est l'équivalent de `<router-view>` en Vue et `<router-outlet>` en Angular :

```tsx
import { Outlet } from 'react-router';

function RootLayout() {
  return (
    <div>
      <header>
        <nav>
          <Link to="/">Accueil</Link>
          <Link to="/about">À propos</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </header>

      <main>
        {/* ✅ Le composant enfant correspondant à la route s'affiche ici */}
        <Outlet />
      </main>

      <footer>
        <p>Mon App React</p>
      </footer>
    </div>
  );
}
```

### Layouts imbriqués

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,       // Header + Footer + Outlet
    children: [
      { index: true, element: <Home /> },
      {
        path: 'dashboard',
        element: <DashboardLayout />,  // Sidebar + Outlet imbriqué
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'settings', element: <Settings /> },
          { path: 'profile', element: <Profile /> },
        ],
      },
    ],
  },
]);

function DashboardLayout() {
  return (
    <div style={{ display: 'flex' }}>
      <aside>
        <NavLink to="/dashboard">Tableau de bord</NavLink>
        <NavLink to="/dashboard/settings">Paramètres</NavLink>
        <NavLink to="/dashboard/profile">Profil</NavLink>
      </aside>
      <section>
        <Outlet />  {/* Composant enfant du dashboard */}
      </section>
    </div>
  );
}
```

### Navigation : Link, NavLink, useNavigate

#### Link — lien simple

```tsx
import { Link } from 'react-router';

// ✅ Génère un <a> sans rechargement de page
<Link to="/about">À propos</Link>

// ❌ Ne JAMAIS utiliser <a href> pour la navigation interne
<a href="/about">À propos</a>  // Recharge toute la page !
```

#### NavLink — lien avec état actif

```tsx
import { NavLink } from 'react-router';

// ✅ Ajoute automatiquement une classe quand la route est active
<NavLink
  to="/about"
  className={({ isActive }) => isActive ? 'nav-active' : ''}
>
  À propos
</NavLink>

// ✅ Avec style inline
<NavLink
  to="/about"
  style={({ isActive }) => ({
    fontWeight: isActive ? 'bold' : 'normal',
    color: isActive ? '#007bff' : 'inherit',
  })}
>
  À propos
</NavLink>
```

#### useNavigate — navigation programmatique

```tsx
import { useNavigate } from 'react-router';

function LoginForm() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await login(credentials);
    navigate('/dashboard');          // Navigation simple
    navigate('/dashboard', { replace: true });  // Remplace l'historique
    navigate(-1);                    // Retour arrière
  };

  return <button onClick={handleLogin}>Connexion</button>;
}
```

### Page d'erreur (errorElement)

```tsx
import { useRouteError, isRouteErrorResponse } from 'react-router';

function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status}</h1>
        <p>{error.statusText}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Oups !</h1>
      <p>Une erreur inattendue est survenue.</p>
    </div>
  );
}

// Utilisé dans la configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,  // ✅ Attrape les erreurs de ce niveau et en dessous
    children: [/* ... */],
  },
]);
```

### Comparaison avec Vue Router et Angular Router

| Concept | React Router v7 | Vue Router | Angular Router |
|---------|------------------|------------|----------------|
| Configuration | `createBrowserRouter([...])` | `createRouter({ routes: [...] })` | `Routes` array dans `app.routes.ts` |
| Provider | `<RouterProvider>` | `app.use(router)` | `provideRouter(routes)` |
| Outlet | `<Outlet />` | `<RouterView />` | `<router-outlet />` |
| Lien | `<Link to="/">` | `<RouterLink to="/">` | `<a routerLink="/">` |
| Lien actif | `<NavLink>` avec `isActive` | `router-link-active` class | `routerLinkActive` directive |
| Nav. programmatique | `useNavigate()` | `useRouter().push()` | `inject(Router).navigate()` |
| Erreur | `errorElement` | `onError` hook | `ErrorHandler` |
| Layouts imbriqués | `children` + `Outlet` | `children` + `RouterView` | `children` + `router-outlet` |

```vue
<!-- Vue Router — équivalent -->
<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/">Accueil</RouterLink>
    <RouterLink to="/about">À propos</RouterLink>
  </nav>
  <RouterView />
</template>
```

```typescript
// Angular Router — équivalent
export const routes: Routes = [
  {
    path: '',
    component: RootLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'about', component: AboutComponent },
    ],
  },
];
```

### Configuration complète type

```tsx
// router.tsx — fichier de configuration des routes
import { createBrowserRouter } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'products', element: <ProductsLayout />, children: [
        { index: true, element: <ProductList /> },
        { path: ':id', element: <ProductDetail /> },
      ]},
      { path: '*', element: <NotFound /> },
    ],
  },
]);

// main.tsx
import { RouterProvider } from 'react-router';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

---

## Pratique

Créez une mini application avec 3 pages et un layout commun :

1. Configurez `createBrowserRouter` avec un `RootLayout` contenant un header et un `Outlet`
2. Routes : `/` (Accueil), `/products` (Produits), `/about` (À propos)
3. Utilisez `NavLink` dans le header avec une classe `active`
4. Ajoutez une page 404 avec `errorElement`
5. Ajoutez un bouton dans la page Produits qui navigue vers l'accueil avec `useNavigate`

<details>
<summary>Solution</summary>

```tsx
import { createBrowserRouter, RouterProvider, Outlet, Link, NavLink, useNavigate, useRouteError } from 'react-router';

// Layout
function RootLayout() {
  return (
    <div>
      <header>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <NavLink to="/" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
            Accueil
          </NavLink>
          <NavLink to="/products" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
            Produits
          </NavLink>
          <NavLink to="/about" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
            À propos
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// Pages
function Home() {
  return <h1>Bienvenue sur l'accueil</h1>;
}

function Products() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Nos produits</h1>
      <p>Liste des produits ici...</p>
      <button onClick={() => navigate('/')}>Retour à l'accueil</button>
    </div>
  );
}

function About() {
  return <h1>À propos de nous</h1>;
}

function ErrorPage() {
  const error = useRouteError();
  return (
    <div>
      <h1>404 — Page introuvable</h1>
      <Link to="/">Retour à l'accueil</Link>
    </div>
  );
}

// Router
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products', element: <Products /> },
      { path: 'about', element: <About /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| `createBrowserRouter` | API moderne pour configurer les routes en objet |
| `RouterProvider` | Fournit le router à l'application |
| `Outlet` | Placeholder où s'affiche le composant enfant (comme `router-outlet`) |
| `Link` | Lien interne sans rechargement de page |
| `NavLink` | Lien avec état `isActive` pour le styling |
| `useNavigate` | Navigation programmatique |
| `errorElement` | Page d'erreur par route |
| Layouts imbriqués | `children` + `Outlet` à chaque niveau |

---

> **Prochain cours** : [Cours 19 — Paramètres de route et loaders](./02-parametres-et-loaders.md)
