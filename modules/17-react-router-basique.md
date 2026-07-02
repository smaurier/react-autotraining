---
titre: React Router — navigation basique
cours: 04-react
notions: [createBrowserRouter et RouterProvider, data router v7, arbre de routes objet, route index, layout route et Outlet, Link, NavLink et état actif, navigation programmatique useNavigate, route 404 catch-all]
outcomes: [configurer un data router v7 avec createBrowserRouter et RouterProvider, construire un layout partagé avec Outlet et des routes imbriquées, naviguer avec Link/NavLink et par code avec useNavigate]
prerequis: [16-redux-toolkit]
next: 18-parametres-et-loaders
libs: [{ name: react, version: "^19" }, { name: react-router-dom, version: "^7" }]
tribuzen: shell de l'admin web SPA — routes familles/invitations, layout sidebar avec Outlet, NavLink actif
last-reviewed: 2026-07
---

# React Router — navigation basique

> **Outcomes — tu sauras FAIRE :** configurer un data router v7 avec `createBrowserRouter` + `RouterProvider`, construire un layout partagé avec `Outlet` et des routes imbriquées, naviguer avec `Link`/`NavLink` et par code avec `useNavigate`.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu démarres le shell de l'admin web TribuZen. Le product owner veut trois écrans accessibles au clic, sans jamais recharger la page : la liste des familles (`/familles`), la fiche d'une famille (`/familles/:id`), et les invitations en attente (`/invitations`). Une **sidebar** reste visible partout, avec le lien de la page courante mis en évidence.

Un collègue a commencé « à la main », avec du state pour simuler la navigation :

```tsx
// ❌ AVANT — routing artisanal avec du state
function AdminApp() {
  const [page, setPage] = useState<'familles' | 'invitations'>('familles');

  return (
    <div className="admin">
      <aside>
        <button onClick={() => setPage('familles')}>Familles</button>
        <button onClick={() => setPage('invitations')}>Invitations</button>
      </aside>
      <main>
        {page === 'familles' && <FamillesPage />}
        {page === 'invitations' && <InvitationsPage />}
      </main>
    </div>
  );
}
```

**Trois problèmes immédiats :**
1. **L'URL ne change jamais.** Impossible de partager un lien vers une famille, ni de recharger sur la bonne page — F5 renvoie toujours à l'écran par défaut.
2. **Le bouton Précédent du navigateur ne fait rien** d'utile : l'historique n'est pas alimenté.
3. **Ça ne scale pas.** Ajouter `/familles/:id` (fiche détail) transforme le `&&` en sapin de conditions imbriquées.

React Router règle les trois d'un coup : l'URL devient la source de vérité, l'historique est géré, et l'arbre de routes remplace les conditions.

---

## 2. Théorie complète, concise

### 2.1 Le data router v7 — `createBrowserRouter` + `RouterProvider`

React Router est la librairie de routing de référence en React. La **v7** (fin 2024) fusionne React Router et Remix ; elle reste parfaitement utilisable en **SPA** via le *data router*, l'API moderne qu'on adopte ici.

Deux styles coexistent. On privilégie la **configuration objet** (data router), pas l'ancien JSX déclaratif :

```tsx
// ❌ Ancien style déclaratif (v5/v6) — routes en JSX dans le rendu
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/familles" element={<Familles />} />
  </Routes>
</BrowserRouter>
```

```tsx
// ✅ Data router v7 — arbre d'objets + RouterProvider
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'familles', element: <FamillesPage /> },
      { path: 'invitations', element: <InvitationsPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

> **Package :** en v7, tout est exposé par `react-router`. Le paquet `react-router-dom` existe toujours et **ré-exporte** ces symboles pour le web ; les deux imports fonctionnent en SPA. Ce cours importe depuis `react-router-dom` (aligné sur le `package.json` du projet).

Pourquoi le data router plutôt que le JSX : c'est lui qui débloque les **loaders/actions** (module 18). On installe donc dès maintenant la bonne fondation.

### 2.2 L'arbre de routes : `path`, `children`, `element`

Une route est un objet. Ses clés de base :

| Clé | Rôle |
|---|---|
| `path` | Segment d'URL. Relatif au parent s'il ne commence pas par `/` |
| `element` | Le JSX rendu quand la route matche |
| `children` | Routes imbriquées, rendues dans l'`Outlet` du parent |
| `index` | `true` = route par défaut du parent (voir 2.4) |
| `errorElement` | JSX de secours si une erreur remonte à ce niveau |

Les `path` enfants sont **relatifs** : sous un parent `path: '/'`, l'enfant `path: 'familles'` répond à `/familles`. Pas de slash initial sur les enfants.

### 2.3 Layout route + `Outlet`

Une **layout route** est une route qui rend une coquille commune (sidebar, header) et délègue le contenu à ses enfants via `<Outlet />`. C'est l'équivalent de `<router-view>` (Vue) ou `<router-outlet>` (Angular).

```tsx
import { Outlet, NavLink } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <NavLink to="/familles">Familles</NavLink>
        <NavLink to="/invitations">Invitations</NavLink>
      </aside>
      <main className="admin__main">
        {/* La route enfant qui matche s'affiche ICI */}
        <Outlet />
      </main>
    </div>
  );
}
```

Le parent (`AdminLayout`) est rendu **une fois** ; seul le contenu de l'`Outlet` change quand on navigue entre `/familles` et `/invitations`. La sidebar ne re-monte pas — c'est ce qui donne la sensation d'app native.

On peut **imbriquer** les layouts : une route enfant peut elle-même avoir un `element` layout + ses propres `children` + son propre `Outlet`.

### 2.4 Route index

Une route `index: true` est la route **par défaut** d'un parent : elle matche l'URL exacte du parent, quand aucun enfant plus spécifique ne matche.

```tsx
{
  path: '/',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Dashboard /> },      // rendu sur "/"
    { path: 'familles', element: <FamillesPage /> }, // rendu sur "/familles"
  ],
}
```

Une route index **n'a pas de `path`** (c'est incompatible) et **pas de `children`** (elle est terminale). Elle remplit l'`Outlet` du parent quand on est pile sur l'URL du parent.

### 2.5 `Link` — naviguer sans recharger

`Link` rend une balise `<a>` mais **intercepte le clic** pour naviguer côté client, sans rechargement complet.

```tsx
import { Link } from 'react-router-dom';

// ✅ Navigation SPA — pas de rechargement
<Link to="/familles">Voir les familles</Link>

// ✅ Lien vers une fiche précise (chemin dynamique)
<Link to={`/familles/${family.id}`}>{family.name}</Link>
```

```tsx
// ❌ JAMAIS <a href> pour du lien interne — recharge toute l'app
<a href="/familles">Voir les familles</a>
```

### 2.6 `NavLink` — lien avec état actif

`NavLink` est un `Link` qui **sait s'il est actif** (l'URL courante matche son `to`). Ses props `className` et `style` acceptent une fonction recevant `{ isActive }` :

```tsx
import { NavLink } from 'react-router-dom';

// className fonction : classe conditionnelle
<NavLink
  to="/familles"
  className={({ isActive }) => (isActive ? 'link link--active' : 'link')}
>
  Familles
</NavLink>

// style fonction : idem en inline
<NavLink
  to="/invitations"
  style={({ isActive }) => ({ fontWeight: isActive ? 700 : 400 })}
>
  Invitations
</NavLink>
```

Par défaut, un `NavLink` vers `/familles` est aussi actif sur `/familles/42` (match de préfixe). Pour n'être actif que sur l'URL exacte, ajoute la prop `end` :

```tsx
// Actif UNIQUEMENT sur "/", pas sur "/familles"
<NavLink to="/" end>Tableau de bord</NavLink>
```

### 2.7 `useNavigate` — navigation programmatique

Quand la navigation doit se déclencher **par du code** (après une soumission, une suppression, un timeout) et non par un clic sur un lien, on utilise le hook `useNavigate`.

```tsx
import { useNavigate } from 'react-router-dom';

function InviteForm() {
  const navigate = useNavigate();

  async function handleSubmit(data: InvitePayload) {
    await createInvitation(data);
    navigate('/invitations');                    // va à la liste
    // navigate('/invitations', { replace: true }); // sans empiler l'historique
    // navigate(-1);                                 // "Précédent"
  }

  return <form onSubmit={/* ... */}>{/* champs */}</form>;
}
```

`navigate(path)` empile une entrée d'historique (le bouton Précédent y revient). `{ replace: true }` **remplace** l'entrée courante — utile après un login pour empêcher le retour vers la page de connexion. `navigate(-1)` / `navigate(1)` reculent / avancent dans l'historique.

**Règle :** pour un lien cliquable, `Link`/`NavLink`. Pour naviguer suite à un événement non-lien, `useNavigate`. Ne mets pas un `useNavigate` derrière un `onClick` d'un `<a>` que tu fabriques toi-même.

### 2.8 Route 404 catch-all

Le `path: '*'` matche **tout ce qui n'a pas été capté** avant. C'est la page « introuvable ».

```tsx
children: [
  { index: true, element: <Dashboard /> },
  { path: 'familles', element: <FamillesPage /> },
  { path: '*', element: <NotFound /> }, // dernier recours
];
```

> **Équivalences framework :**
> - Outlet → `<router-view>` (Vue) / `<router-outlet>` (Angular)
> - `<Link>` → `<router-link>` (Vue) / `[routerLink]` (Angular)
> - actif → classe `router-link-active` (Vue) / directive `routerLinkActive` (Angular)
> - `useNavigate()` → `router.push()` (Vue) / `Router.navigate()` (Angular)

---

## 3. Worked examples

### Exemple 1 — Le shell de l'admin TribuZen (layout + 3 routes + index + 404)

Reprise du cas concret, câblé proprement avec le data router.

```tsx
// ─── src/pages/Dashboard.tsx ─────────────────────────────────────
export function Dashboard() {
  return <h1>Tableau de bord</h1>;
}

// ─── src/pages/FamillesPage.tsx ──────────────────────────────────
import { Link } from 'react-router-dom';

const FAMILIES = [
  { id: 'f1', name: 'Les Dupont' },
  { id: 'f2', name: 'Les Martin' },
];

export function FamillesPage() {
  return (
    <div>
      <h1>Familles</h1>
      <ul>
        {FAMILIES.map((f) => (
          <li key={f.id}>
            {/* chemin dynamique vers la fiche — détaillé au module 18 */}
            <Link to={`/familles/${f.id}`}>{f.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── src/pages/InvitationsPage.tsx ───────────────────────────────
export function InvitationsPage() {
  return <h1>Invitations en attente</h1>;
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

// className fonction : la classe "active" est posée par NavLink
function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 200, borderRight: '1px solid #e5e7eb', padding: 16 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* `end` : "Tableau de bord" actif seulement sur "/" exact */}
          <NavLink to="/" end className={navClass}>Tableau de bord</NavLink>
          <NavLink to="/familles" className={navClass}>Familles</NavLink>
          <NavLink to="/invitations" className={navClass}>Invitations</NavLink>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        {/* le contenu de la route enfant s'affiche ici */}
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
      { index: true, element: <Dashboard /> },          // "/"
      { path: 'familles', element: <FamillesPage /> },  // "/familles"
      { path: 'invitations', element: <InvitationsPage /> }, // "/invitations"
      { path: '*', element: <NotFound /> },             // 404
    ],
  },
]);

// ─── src/main.tsx ────────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

**Ce que ce câblage apporte :**
- L'URL est la source de vérité : `/familles` rechargé (F5) réaffiche la bonne page.
- La sidebar (`AdminLayout`) est montée une seule fois ; seul l'`Outlet` change.
- `NavLink` colore automatiquement le lien courant, sans state manuel.
- Toute URL inconnue tombe sur `NotFound` grâce au `path: '*'`.

### Exemple 2 — Sous-layout imbriqué + navigation programmatique

Ajoutons un sous-espace `/familles` avec sa propre barre d'onglets (un layout imbriqué), et un bouton « Nouvelle invitation » qui navigue par code.

```tsx
// ─── src/layouts/FamillesLayout.tsx ──────────────────────────────
import { Outlet, NavLink } from 'react-router-dom';

// Layout imbriqué : rendu SOUS l'Outlet d'AdminLayout,
// il fournit à son tour un Outlet pour ses propres enfants.
export function FamillesLayout() {
  return (
    <div>
      <h1>Familles</h1>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <NavLink to="/familles" end>Toutes</NavLink>
        <NavLink to="/familles/actives">Actives</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

// ─── src/pages/InvitationsPage.tsx (enrichie) ────────────────────
import { useNavigate } from 'react-router-dom';

export function InvitationsPage() {
  const navigate = useNavigate();

  async function handleCreate() {
    // await createInvitation(...); // (mock ici)
    // après création, on ramène l'utilisateur sur la liste à jour
    navigate('/invitations', { replace: true });
  }

  return (
    <div>
      <h1>Invitations en attente</h1>
      <button onClick={handleCreate}>Nouvelle invitation</button>
    </div>
  );
}

// ─── extrait de src/router.tsx ───────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'familles',
        element: <FamillesLayout />,   // layout imbriqué
        children: [
          { index: true, element: <FamillesListe /> },        // "/familles"
          { path: 'actives', element: <FamillesActives /> },  // "/familles/actives"
        ],
      },
      { path: 'invitations', element: <InvitationsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
```

**Points de lecture :**
- Deux niveaux d'`Outlet` : celui d'`AdminLayout` rend `FamillesLayout`, qui rend à son tour sa route enfant (`FamillesListe` ou `FamillesActives`).
- `NavLink to="/familles" end` : sans `end`, l'onglet « Toutes » resterait actif aussi sur `/familles/actives` (match de préfixe).
- `useNavigate` avec `{ replace: true }` évite d'empiler une entrée d'historique après l'action — le bouton Précédent ne repasse pas par un état transitoire.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `<a href>` au lieu de `Link` pour du lien interne

```tsx
// ❌ Recharge toute l'application (nouvelle requête HTML, perte du state)
<a href="/familles">Familles</a>

// ✅ Navigation client, instantanée, historique géré
<Link to="/familles">Familles</Link>
```

**Pourquoi c'est faux :** `<a href>` déclenche une navigation navigateur complète — l'app React est re-téléchargée et re-montée, tout le state en mémoire est perdu. `Link` intercepte le clic et ne change que l'URL + le rendu.

### PIÈGE #2 — Slash initial sur un `path` enfant

```tsx
// ❌ children avec slash initial → chemin absolu, pas ce qu'on croit
{ path: '/', element: <AdminLayout />, children: [
  { path: '/familles', element: <FamillesPage /> }, // fragile / trompeur
]}

// ✅ children relatifs — pas de slash initial
{ path: '/', element: <AdminLayout />, children: [
  { path: 'familles', element: <FamillesPage /> },  // → "/familles"
]}
```

**Pourquoi :** les `path` enfants se composent avec le parent. Un enfant `path: 'familles'` sous parent `/` donne `/familles`. Mettre `/familles` en enfant est source de confusion et casse dès que le parent change de préfixe.

### PIÈGE #3 — Oublier `<Outlet />` dans le layout

```tsx
// ❌ Layout sans Outlet : les routes enfants ne s'affichent JAMAIS
function AdminLayout() {
  return <aside>{/* sidebar */}</aside>; // pas d'Outlet → contenu absent
}

// ✅ L'Outlet est le point d'injection des enfants
function AdminLayout() {
  return (
    <>
      <aside>{/* sidebar */}</aside>
      <main><Outlet /></main>
    </>
  );
}
```

**Symptôme typique :** la sidebar s'affiche, l'URL change bien, mais le contenu principal reste vide. C'est presque toujours un `Outlet` manquant.

### PIÈGE #4 — `NavLink` actif sur trop d'URLs (manque de `end`)

```tsx
// ❌ "/" reste actif partout — il est préfixe de toutes les URLs
<NavLink to="/">Tableau de bord</NavLink>

// ✅ actif seulement sur "/" exact
<NavLink to="/" end>Tableau de bord</NavLink>
```

**Pourquoi :** `NavLink` est actif dès que l'URL courante **commence par** son `to`. Comme `/` est préfixe de tout, le lien racine reste éclairé sur toutes les pages. `end` force le match exact.

### PIÈGE #5 — Route index avec `path`

```tsx
// ❌ index ET path sont mutuellement exclusifs
{ index: true, path: 'accueil', element: <Home /> } // invalide

// ✅ soit une route index (défaut du parent)...
{ index: true, element: <Home /> }
// ✅ ...soit une route à path nommé
{ path: 'accueil', element: <Home /> }
```

**Pourquoi :** une route index **est** le défaut du parent (URL exacte du parent), elle ne peut pas avoir de segment propre. Le routeur lève une erreur de config si les deux coexistent.

---

## 5. Ancrage TribuZen

Le data router est le **squelette de l'admin web TribuZen**. Toute l'interface d'administration vit dans un seul `RouterProvider`.

**`AdminLayout`** (`src/layouts/AdminLayout.tsx`) — la coquille permanente : sidebar de navigation à gauche (Familles, Invitations, plus tard Événements, Modération), zone de contenu à droite pilotée par l'`Outlet`. Montée une fois pour toute la session admin.

**Routes principales :**
- `/familles` (`FamillesPage`) — la liste des familles inscrites.
- `/familles/:id` (`FamilleDetail`) — la fiche d'une famille ; le paramètre `:id` est traité au **module 18** (params + loaders).
- `/invitations` (`InvitationsPage`) — les invitations en attente, avec action de création qui utilise `useNavigate` après succès.

**`NavLink`** — dans la sidebar, chaque entrée est un `NavLink` avec la classe `--active` du design system TribuZen. Le lien « Tableau de bord » porte `end` pour ne s'allumer que sur `/`.

**`useNavigate`** — après « inviter une famille » ou « supprimer une invitation », on redirige par code vers la liste rafraîchie, en `{ replace: true }` pour ne pas polluer l'historique avec l'écran de formulaire.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  main.tsx                 # RouterProvider
  router.tsx               # arbre de routes (createBrowserRouter)
  layouts/
    AdminLayout.tsx        # sidebar + Outlet
  pages/
    Dashboard.tsx
    FamillesPage.tsx
    FamilleDetail.tsx      # :id → module 18
    InvitationsPage.tsx
    NotFound.tsx           # path '*'
```

---

## 6. Points clés

1. En v7, on configure les routes avec `createBrowserRouter([...])` (data router objet) et on les fournit via `<RouterProvider router={router} />` — pas de JSX `<Routes>` déclaratif.
2. Une route = un objet `{ path, element, children }` ; les `path` enfants sont **relatifs** (pas de slash initial).
3. Une **layout route** rend une coquille commune et place `<Outlet />` là où le contenu des routes enfants s'injecte — sans `Outlet`, les enfants ne s'affichent pas.
4. Une **route index** (`index: true`, sans `path`) est le rendu par défaut du parent sur son URL exacte.
5. `Link`/`NavLink` remplacent `<a href>` pour la navigation interne (pas de rechargement) ; `NavLink` connaît son état `isActive` via des fonctions `className`/`style`.
6. La prop `end` sur `NavLink` force le match exact — indispensable pour le lien racine `/`.
7. `useNavigate()` navigue par code après un événement (`navigate(path)`, `{ replace: true }`, `navigate(-1)`) ; `path: '*'` capture les URLs inconnues (404).

---

## 7. Seeds Anki

```
En React Router v7, quelle API remplace le JSX <Routes>/<Route> et comment la fournit-on à l'app ?|Le data router : on déclare l'arbre avec createBrowserRouter([...]) (objets de routes) et on le passe à <RouterProvider router={router} />. C'est cette API qui débloque loaders/actions.
À quoi sert <Outlet /> dans une layout route ?|Outlet est le point d'injection : la route enfant qui matche s'affiche à l'emplacement de l'Outlet, pendant que le layout (sidebar, header) reste monté. Sans Outlet, les enfants ne s'affichent jamais.
Qu'est-ce qu'une route index et quelles clés lui sont interdites ?|C'est la route par défaut du parent, rendue sur l'URL exacte du parent : { index: true, element }. Elle ne peut avoir ni path (mutuellement exclusif) ni children (terminale).
Pourquoi préférer <Link>/<NavLink> à <a href> pour un lien interne ?|<a href> déclenche un rechargement complet du navigateur (l'app React est re-téléchargée, le state perdu). Link intercepte le clic et ne change que l'URL et le rendu, côté client, avec historique géré.
À quoi sert la prop end sur NavLink ?|NavLink est actif dès que l'URL courante commence par son to (match de préfixe). end force le match exact — indispensable pour le lien racine "/", sinon il reste actif sur toutes les pages.
Quand utiliser useNavigate plutôt que Link ?|Pour naviguer par code après un événement non-lien (soumission, suppression, timeout) : navigate('/x'), navigate('/x', { replace: true }) pour ne pas empiler l'historique, navigate(-1) pour revenir en arrière.
À quoi correspond la route path: '*' ?|C'est le catch-all : elle matche toute URL non capturée par les routes précédentes, typiquement pour afficher une page 404.
Les path des routes enfants sont-ils absolus ou relatifs ?|Relatifs au parent : sous un parent path '/', un enfant path 'familles' répond à '/familles'. On ne met pas de slash initial sur les enfants.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-17-react-router-basique/README.md`. Câbler le shell de l'admin TribuZen de zéro (data router v7 + layout sidebar + `Outlet` + `NavLink` actif + 404) sur un vrai projet Vite, puis vérifier la navigation dans le navigateur.
