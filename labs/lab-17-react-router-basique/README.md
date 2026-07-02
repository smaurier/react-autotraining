# Lab 17 — React Router : navigation basique

> **Outcome :** à la fin, tu sais câbler un data router React Router v7 (`createBrowserRouter` + `RouterProvider`), construire un layout à sidebar avec `Outlet`, poser des `NavLink` actifs, gérer une 404 et naviguer par code avec `useNavigate` — sur un vrai projet Vite.
> **Vrai outil :** React 19 + React Router v7 + Vite dev server (navigation testée en direct dans le navigateur, barre d'URL comprise).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu montes le **shell de l'admin web TribuZen**. Cahier des charges **exact** :

1. **`AdminLayout`** — sidebar fixe (à gauche) + zone de contenu (`Outlet`, à droite). La sidebar contient trois `NavLink` : Tableau de bord (`/`), Familles (`/familles`), Invitations (`/invitations`). Le lien courant reçoit une classe/style actif.
2. **Routes** via `createBrowserRouter` :
   - `/` → `Dashboard` (route **index**)
   - `/familles` → `FamillesPage` (liste avec des `Link` vers chaque fiche)
   - `/invitations` → `InvitationsPage`
   - `*` → `NotFound` (404)
3. **`useNavigate`** — dans `InvitationsPage`, un bouton « Nouvelle invitation » qui, après une création simulée, redirige vers `/invitations` en `{ replace: true }`.
4. **`end`** — le `NavLink` du Tableau de bord ne doit être actif que sur `/` exact.

**Contraintes :**
- Import depuis `react-router-dom` (v7 le ré-exporte pour le web).
- Aucun `<a href>` pour de la navigation interne — que des `Link`/`NavLink`.
- Aucun state manuel pour simuler des pages — l'URL est la seule source de vérité.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

```bash
pnpm create vite@latest tribuzen-router --template react-ts
cd tribuzen-router
pnpm add react-router-dom
pnpm dev
```

Arborescence à produire :

```
src/
  main.tsx                 ← RouterProvider (à modifier)
  router.tsx               ← createBrowserRouter (à écrire)
  layouts/
    AdminLayout.tsx        ← sidebar + Outlet (à écrire)
  pages/
    Dashboard.tsx          ← à écrire
    FamillesPage.tsx       ← à écrire (Link vers /familles/:id)
    InvitationsPage.tsx    ← à écrire (useNavigate)
    NotFound.tsx           ← à écrire
```

Lance `pnpm dev` et valide dans le navigateur à chaque étape : clique, recharge (F5), teste le bouton Précédent.

---

## Étapes (en friction)

1. **Écris les 4 pages** (`Dashboard`, `FamillesPage`, `InvitationsPage`, `NotFound`) comme composants exportés nommés. `FamillesPage` mappe un tableau de familles en `Link to={\`/familles/${f.id}\`}`. `NotFound` affiche un titre 404 + un `Link` retour vers `/`.
2. **Écris `AdminLayout.tsx`** — `<Outlet />` dans la zone de contenu, trois `NavLink` dans la sidebar. Le lien `/` porte `end`. `className` (ou `style`) reçoit une fonction `({ isActive }) => ...`.
3. **Écris `router.tsx`** — `createBrowserRouter` avec un parent `path: '/'` + `element: <AdminLayout />`, et `children` : index → `Dashboard`, `familles` → `FamillesPage`, `invitations` → `InvitationsPage`, `*` → `NotFound`. Ajoute `errorElement: <NotFound />` sur le parent.
4. **Branche `main.tsx`** — remplace le rendu de `<App />` par `<RouterProvider router={router} />`.
5. **Ajoute `useNavigate`** dans `InvitationsPage` — bouton « Nouvelle invitation » → `handleCreate` async qui `navigate('/invitations', { replace: true })`.
6. **Vérifie dans le navigateur** : clique chaque lien (contenu change, sidebar reste) ; recharge sur `/familles` (même page) ; va sur `/nawak` (404) ; observe que « Tableau de bord » n'est actif que sur `/` ; teste le bouton Précédent après navigation.

---

## Corrigé complet commenté

```tsx
// ─── src/pages/Dashboard.tsx ─────────────────────────────────────
export function Dashboard() {
  return <h1>Tableau de bord</h1>;
}

// ─── src/pages/FamillesPage.tsx ──────────────────────────────────
import { Link } from 'react-router-dom';

// Données mockées — dans le vrai produit, elles viendront d'un loader (module 18)
const FAMILIES = [
  { id: 'f1', name: 'Les Dupont' },
  { id: 'f2', name: 'Les Martin' },
  { id: 'f3', name: 'Les Nguyen' },
];

export function FamillesPage() {
  return (
    <div>
      <h1>Familles</h1>
      <ul>
        {FAMILIES.map((f) => (
          <li key={f.id}>
            {/* Link vers un chemin dynamique — la fiche :id est câblée au module 18 */}
            <Link to={`/familles/${f.id}`}>{f.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── src/pages/InvitationsPage.tsx ───────────────────────────────
import { useNavigate } from 'react-router-dom';

export function InvitationsPage() {
  const navigate = useNavigate();

  async function handleCreate() {
    // await createInvitation(...); // création réelle plus tard
    // On revient sur la liste rafraîchie SANS empiler l'écran de formulaire :
    // replace évite qu'un Précédent ne rejoue un état transitoire.
    navigate('/invitations', { replace: true });
  }

  return (
    <div>
      <h1>Invitations en attente</h1>
      <button onClick={handleCreate}>Nouvelle invitation</button>
    </div>
  );
}

// ─── src/pages/NotFound.tsx ──────────────────────────────────────
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div>
      <h1>404 — Page introuvable</h1>
      <Link to="/">Retour au tableau de bord</Link>
    </div>
  );
}

// ─── src/layouts/AdminLayout.tsx ─────────────────────────────────
import { Outlet, NavLink } from 'react-router-dom';

// className en fonction : NavLink passe { isActive } ; on renvoie la classe adaptée.
function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — montée une seule fois, ne re-monte pas à la navigation */}
      <aside style={{ width: 200, borderRight: '1px solid #e5e7eb', padding: 16 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* end : actif UNIQUEMENT sur "/" exact (sinon actif partout, "/" étant préfixe) */}
          <NavLink to="/" end className={navClass}>Tableau de bord</NavLink>
          <NavLink to="/familles" className={navClass}>Familles</NavLink>
          <NavLink to="/invitations" className={navClass}>Invitations</NavLink>
        </nav>
      </aside>

      {/* Zone de contenu — la route enfant matchée s'injecte dans l'Outlet */}
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}

// ─── src/router.tsx ──────────────────────────────────────────────
import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { FamillesPage } from './pages/FamillesPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,   // layout partagé (sidebar + Outlet)
    errorElement: <NotFound />, // secours si une route enfant lève une erreur
    children: [
      { index: true, element: <Dashboard /> },               // "/"
      { path: 'familles', element: <FamillesPage /> },       // "/familles"
      { path: 'invitations', element: <InvitationsPage /> }, // "/invitations"
      { path: '*', element: <NotFound /> },                  // 404 catch-all
    ],
  },
]);

// ─── src/main.tsx ────────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

**Pourquoi ce corrigé est correct :**
- **Un seul `RouterProvider`** pilote toute l'admin : l'URL est la source de vérité, F5 réaffiche la bonne page, le bouton Précédent marche.
- **`AdminLayout` monté une fois** : la sidebar ne clignote pas, seul l'`Outlet` change entre `/familles` et `/invitations`.
- **Route index sans `path`** pour `Dashboard` : c'est le rendu par défaut du parent sur `/` exact.
- **`end` sur le lien racine** : sans lui, « Tableau de bord » resterait actif sur toutes les pages (préfixe `/`).
- **`path: '*'`** en dernier : toute URL inconnue tombe sur `NotFound`.
- **`useNavigate({ replace: true })`** : après la création, on remplace l'entrée courante au lieu d'en empiler une — historique propre.
- **Zéro `<a href>` interne** : chaque lien est un `Link`/`NavLink`, donc navigation client sans rechargement.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module 17 :**

1. Ajoute un **layout imbriqué** `FamillesLayout` sous `/familles`, avec une barre de deux onglets `NavLink` : « Toutes » (`/familles`, avec `end`) et « Actives » (`/familles/actives`). Chaque onglet rend une page distincte dans un **second `Outlet`**.
2. Ajoute une page `FamilleDetail` sur `/familles/:id` qui affiche seulement `Famille {id}` (lis l'`id` avec `useParams` — anticipation du module 18) et un bouton « Retour » utilisant `navigate(-1)`.
3. Fais en sorte que le clic sur une famille de la liste mène bien à `/familles/f2`, que « Actives » ne désactive pas « Toutes » par erreur (vérifie le `end`), et que « Retour » revienne à la liste.

**Critère de réussite :** deux niveaux d'`Outlet` fonctionnels, les onglets s'allument correctement (aucun « faux actif »), `/familles/f2` affiche la fiche, `navigate(-1)` ramène à la liste.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce shell est la fondation de l'admin web :

```
tribuzen/src/
  main.tsx                 # RouterProvider
  router.tsx               # createBrowserRouter (arbre de routes)
  layouts/
    AdminLayout.tsx        # sidebar + Outlet
  pages/
    Dashboard.tsx
    FamillesPage.tsx
    FamilleDetail.tsx      # /familles/:id — params + loader au module 18
    InvitationsPage.tsx
    NotFound.tsx
```

**Différences par rapport au lab :**
- Les styles inline / classes ad hoc seront remplacés par les tokens du design system TribuZen (`nav-link--active` mappé sur une variable de couleur).
- `FAMILIES` mocké deviendra un **loader** (`loader: () => fetchFamilies()`) au module 18 ; la structure de routes ne bouge pas.
- `/familles/:id` lira le paramètre via `useParams` / l'argument du loader (module 18).
- L'accès à l'admin sera protégé par une route « garde » (auth) — même arbre, une layout route supplémentaire.

**Commit cible :**
```
feat(admin): shell de routing — data router v7 + AdminLayout (sidebar + Outlet)
feat(admin): routes familles / invitations + 404, NavLink actif
```
