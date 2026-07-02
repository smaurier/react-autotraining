---
titre: Protection des routes et lazy loading
cours: 04-react
notions: [garde d'authentification via wrapper Navigate, garde via loader et redirect, protection par rôle, garde client = UX pas sécurité, React.lazy et Suspense, lazy des routes du data router v7, code splitting par route, fallback de chargement]
outcomes: [protéger une route par authentification et par rôle côté client, découper le bundle par route avec React.lazy ou le lazy du data router, poser un fallback de chargement propre, distinguer garde UX et contrôle d'accès réel côté API]
prerequis: [18-parametres-et-loaders]
next: 20-controlled-vs-uncontrolled
libs: [{ name: react, version: "^19" }, { name: react-router-dom, version: "^7" }]
tribuzen: admin web TribuZen — route /admin réservée au rôle admin (redirect /login sinon), lazy-load des écrans lourds (stats) avec Suspense et squelette de chargement
last-reviewed: 2026-07
---

# Protection des routes et lazy loading

> **Outcomes — tu sauras FAIRE :** protéger une route par authentification et par rôle côté client, découper le bundle par route avec `React.lazy` ou le `lazy` du data router, poser un fallback de chargement propre, et distinguer une garde d'UX d'un vrai contrôle d'accès côté API.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu ouvres l'admin TribuZen. La page `/admin/stats` charge un gros graphe de rétention (librairie de charting, agrégats). Deux problèmes remontés en revue :

1. **N'importe qui connecté atteint `/admin`.** Un membre `role: 'member'` tape l'URL à la main et voit le tableau de bord admin. Le routeur n'a aucune barrière.
2. **Le bundle initial pèse 480 Ko** parce que le code du dashboard stats (charting compris) est importé statiquement dans `App.tsx` — donc téléchargé même par un visiteur qui reste sur la page de login.

```tsx
// App.tsx — AVANT : tout importé en dur, aucune garde
import AdminDashboard from './pages/AdminDashboard';
import AdminStats from './pages/AdminStats'; // ~200 Ko avec le charting

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/admin', element: <AdminDashboard /> },      // ⚠️ aucune vérif de rôle
  { path: '/admin/stats', element: <AdminStats /> },    // ⚠️ chargé pour tout le monde
]);
```

Ce module règle les deux : une **garde** qui bloque l'accès selon l'auth et le rôle, et un **découpage du bundle** qui ne charge le code d'un écran que quand on y va.

> **À poser d'entrée, avant tout code :** une garde côté client n'est **pas** une sécurité. C'est de l'**UX** (rediriger, cacher, éviter un écran vide). Le vrai contrôle d'accès vit **côté API** : chaque requête `/api/admin/*` doit re-vérifier le token et le rôle sur le serveur. On développe la garde client parce qu'elle améliore l'expérience — jamais parce qu'elle protège les données.

---

## 2. Théorie complète, concise

### 2.1 Garde d'authentification — le pattern wrapper + `<Navigate>`

React n'a pas de « guard » natif comme le `canActivate` d'Angular. On écrit un composant wrapper qui lit l'état d'auth et, selon le cas, rend soit la route enfant (`<Outlet />`), soit une redirection déclarative (`<Navigate>`).

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Rend les routes enfants si connecté, sinon redirige vers /login.
function RequireAuth() {
  const { user } = useAuth();          // état d'auth (context, store…)
  const location = useLocation();

  if (!user) {
    // state={{ from }} : mémorise la page visée pour y revenir après login.
    // replace : n'empile pas /login dans l'historique (pas de retour arrière piégeux).
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />; // laisse passer vers les routes enfants
}
```

`<Navigate>` est l'équivalent déclaratif d'un `navigate('/login')` impératif : dès que ce JSX est rendu, la navigation a lieu.

### 2.2 Protection par rôle

Même principe, avec une vérification supplémentaire du rôle. On sépare volontairement « pas connecté » (→ `/login`) de « connecté mais pas le bon rôle » (→ page `/403` ou accueil).

```tsx
interface RequireRoleProps {
  role: 'admin' | 'mod';
}

function RequireRole({ role }: RequireRoleProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.role !== role) {
    // Connecté mais rôle insuffisant → écran dédié, pas /login.
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}
```

### 2.3 Garde via `loader` + `redirect` (data router)

Avec le data router (`createBrowserRouter`), on peut protéger **avant le rendu** en lançant une redirection depuis le `loader`. Avantage : la barrière s'exécute avant même de monter le composant, et au même endroit que le chargement des données.

```tsx
import { redirect } from 'react-router-dom';

// loader d'une route protégée
async function adminLoader({ request }: { request: Request }) {
  const user = await getCurrentUser(request); // lit le cookie/session
  if (!user) {
    throw redirect('/login');           // non connecté
  }
  if (user.role !== 'admin') {
    throw redirect('/403');             // rôle insuffisant
  }
  return user; // disponible via useLoaderData() dans le composant
}
```

On `throw redirect(...)` (plutôt que `return`) pour interrompre net : le reste du loader ne s'exécute pas. `return redirect(...)` fonctionne aussi mais `throw` exprime mieux « on coupe ici ».

> **Wrapper `<Navigate>` ou `loader` ?** Le wrapper est simple et visuel, idéal quand l'auth vit dans un context React. Le `loader` est préférable quand la vérification est asynchrone (appel réseau) et qu'on veut bloquer avant le rendu. Les deux restent de l'UX — voir 2.7.

### 2.4 `React.lazy` + `Suspense` — code splitting par composant

`React.lazy` transforme un `import()` dynamique en composant. Le code n'est téléchargé qu'au premier rendu du composant. `Suspense` fournit le fallback affiché pendant ce téléchargement.

```tsx
import { lazy, Suspense } from 'react';

// ❌ statique : embarqué dans le bundle initial même si jamais visité
// import AdminStats from './pages/AdminStats';

// ✅ dynamique : chunk séparé, chargé à la demande
const AdminStats = lazy(() => import('./pages/AdminStats'));

function StatsRoute() {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <AdminStats />
    </Suspense>
  );
}
```

Contrainte : `lazy()` attend un module avec un **export default** qui est un composant. `import('./pages/AdminStats')` doit donc exposer `export default function AdminStats() {…}`.

### 2.5 Le fallback de chargement

Le `fallback` de `Suspense` est rendu tant que le composant lazy (ou ses données Suspense) n'est pas prêt. Préfère un **squelette** (skeleton) qui reproduit la forme de l'écran plutôt qu'un simple « Chargement… » : moins de saut de mise en page, perception de rapidité.

```tsx
// Squelette : mêmes dimensions que le contenu final → pas de layout shift
function StatsSkeleton() {
  return (
    <div className="stats-skeleton" aria-busy="true" aria-label="Chargement des statistiques">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--chart" />
    </div>
  );
}
```

Un `Suspense` placé au niveau du layout couvre toutes les routes lazy enfants ; un `Suspense` par écran permet des fallbacks sur mesure. Les deux se combinent.

### 2.6 `lazy` des routes du data router v7

React Router v7 offre un `lazy` **au niveau de la route** : il charge à la demande non seulement le composant mais **tout le module de route** (composant + `loader` + `ErrorBoundary`). Plus besoin d'entourer chaque route de `Suspense` : le routeur gère l'attente via son propre état de navigation.

```tsx
// Vérifié via Context7 (/remix-run/react-router) — API v7.
// Forme 1 : le module exporte Component/loader/ErrorBoundary aux noms attendus
const router = createBrowserRouter([
  {
    path: '/admin/stats',
    lazy: () => import('./pages/adminStats.route'), // exporte Component, loader…
  },
]);

// Forme 2 : contrôle explicite de ce qu'on renvoie
const router2 = createBrowserRouter([
  {
    path: '/admin/stats',
    lazy: async () => {
      // composant et loader importés en parallèle
      const [{ default: Component }, { adminLoader }] = await Promise.all([
        import('./pages/AdminStats'),
        import('./pages/adminStats.loader'),
      ]);
      return { Component, loader: adminLoader };
    },
  },
]);
```

Deux points à retenir sur la Forme 1 : le module cible doit exporter `Component` (majuscule, pas `element`), et optionnellement `loader`, `ErrorBoundary`, etc. — ce sont les noms attendus par le data router.

> **Actualité / source :** React Router **v7** a fusionné `react-router` et `react-router-dom` en un seul paquet `react-router` ; `react-router-dom` reste publié et **ré-exporte** tout, donc les imports depuis `react-router-dom` continuent de fonctionner (c'est la version épinglée ici, `^7`). Le `lazy` de route et `redirect` sont confirmés par la doc v7 récupérée via Context7. Si tu migres vers le mode « framework », remplace les imports par `react-router`.

### 2.7 Garde client = UX, PAS sécurité

C'est le point le plus important du module. `RequireAuth`, `RequireRole`, `adminLoader` : tout ce code vit dans le **bundle JavaScript envoyé au navigateur**. L'utilisateur peut le lire, le modifier, ou appeler ton API directement (curl, Postman) sans jamais passer par ton routeur.

```txt
Ce que la garde client fait vraiment :
  ✓ éviter d'afficher un écran vide/cassé à un non-connecté
  ✓ rediriger proprement vers /login
  ✓ cacher un lien /admin à un membre
  ✗ empêcher l'accès aux DONNÉES admin  ← FAUX, ça ne protège rien

La vraie barrière est côté serveur :
  → chaque route API /api/admin/* re-vérifie le token (signature, expiration)
  → et re-vérifie le rôle en base, à chaque requête
  → sans quoi les données fuient, garde client ou pas
```

**Règle :** toute donnée sensible est protégée côté API. La garde client sert seulement à ce que l'interface se comporte bien. Si tu retires toute la logique de ce module, l'app devient moins agréable — mais elle ne doit **pas** devenir moins sûre. Si elle le devient, la sécurité était au mauvais endroit.

---

## 3. Worked examples

### Exemple 1 — Admin TribuZen : auth + rôle + redirection post-login

Objectif : `/admin` réservé au rôle `admin`. Non connecté → `/login` (avec retour), connecté sans le rôle → `/403`.

```tsx
// ─── auth/AuthContext.tsx ────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react';

interface User { name: string; role: 'admin' | 'mod' | 'member'; }
interface AuthValue {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
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

// ─── auth/guards.tsx ─────────────────────────────────────────────
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Garde de rôle : connecté + bon rôle, sinon redirection adaptée.
// RAPPEL : ceci est de l'UX. Le contrôle réel est côté API.
export function RequireRole({ role }: { role: User['role'] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.role !== role) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}

// ─── pages/Login.tsx ─────────────────────────────────────────────
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Récupère la page visée avant la redirection, sinon /admin par défaut.
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ... appel API réel : POST /api/login → renvoie le user + pose le cookie
    login({ name: 'Alice', role: 'admin' });
    navigate(from, { replace: true }); // retourne là où l'utilisateur voulait aller
  };

  return (
    <form onSubmit={handleSubmit}>
      <p>Après connexion : redirection vers {from}</p>
      <button type="submit">Se connecter</button>
    </form>
  );
}

// ─── App.tsx : câblage des routes ────────────────────────────────
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { RequireRole } from './auth/guards';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { path: 'login', element: <Login /> },
      { path: '403', element: <Forbidden /> },
      {
        // Toutes les routes enfants exigent le rôle admin.
        element: <RequireRole role="admin" />,
        children: [
          { path: 'admin', element: <AdminDashboard /> },
          { path: 'admin/members', element: <AdminMembers /> },
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

Ce qui se passe : un membre `role: 'member'` qui tape `/admin` traverse `RequireRole`, échoue le test de rôle, et atterrit sur `/403`. Un visiteur non connecté file sur `/login`, se connecte, et `navigate(from)` le ramène pile sur `/admin`.

### Exemple 2 — Lazy-load de l'écran stats (lourd) avec Suspense + squelette

L'écran `/admin/stats` embarque une lib de charting. On le sort du bundle initial.

```tsx
// ─── pages/AdminStats.tsx ────────────────────────────────────────
// Export DEFAULT obligatoire pour React.lazy.
import { HeavyRetentionChart } from '../charts/HeavyRetentionChart'; // ~200 Ko
export default function AdminStats() {
  return (
    <section>
      <h1>Statistiques de rétention</h1>
      <HeavyRetentionChart />
    </section>
  );
}

// ─── pages/StatsSkeleton.tsx ─────────────────────────────────────
export function StatsSkeleton() {
  return (
    <div className="stats-skeleton" aria-busy="true" aria-label="Chargement des statistiques">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--chart" />
    </div>
  );
}

// ─── App.tsx : route lazy + Suspense ─────────────────────────────
import { lazy, Suspense } from 'react';
import { RequireRole } from './auth/guards';
import { StatsSkeleton } from './pages/StatsSkeleton';

// Chunk séparé : téléchargé seulement quand on rend <AdminStats>.
const AdminStats = lazy(() => import('./pages/AdminStats'));

const statsRoute = {
  element: <RequireRole role="admin" />,
  children: [
    {
      path: 'admin/stats',
      element: (
        // Le fallback couvre le temps de téléchargement du chunk.
        <Suspense fallback={<StatsSkeleton />}>
          <AdminStats />
        </Suspense>
      ),
    },
  ],
};
```

Variante data router v7 (le routeur gère l'attente, pas de `Suspense` à écrire soi-même) :

```tsx
// Le module de route porte Component + loader ; le routeur charge tout à la demande.
const router = createBrowserRouter([
  {
    path: 'admin/stats',
    lazy: () => import('./pages/adminStats.route'), // exporte Component, loader
  },
]);

// pages/adminStats.route.tsx
export { default as Component } from './AdminStats';   // renommé en Component
export async function loader() {
  const res = await fetch('/api/admin/stats'); // l'API re-vérifie le rôle admin
  if (res.status === 403) throw new Response('Forbidden', { status: 403 });
  return res.json();
}
```

Résultat mesurable : le bundle initial retombe de ~480 Ko à ~280 Ko ; les 200 Ko de charting ne partent sur le réseau que pour un admin qui ouvre effectivement `/admin/stats`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que la garde client sécurise les données

```tsx
// ❌ Raisonnement faux : « /admin est protégé par RequireRole, donc c'est sûr »
<RequireRole role="admin">
  <AdminMembers /> {/* fetch('/api/members') sans vérif serveur */}
</RequireRole>
```

La garde empêche l'**affichage** du composant, pas l'**accès aux données**. Un utilisateur ouvre l'onglet réseau, copie l'appel `/api/members`, le rejoue en curl : s'il n'y a pas de contrôle serveur, il obtient tout. **Correct :** l'API vérifie le token + le rôle à chaque requête ; la garde client reste, mais uniquement pour l'UX.

### PIÈGE #2 — Oublier `export default` avec `React.lazy`

```tsx
// ❌ Le module n'a pas d'export default
export function AdminStats() { /* ... */ }
const AdminStats = lazy(() => import('./pages/AdminStats'));
// → erreur runtime : "Element type is invalid... Lazy element type must resolve to a class or function"

// ✅ Soit un export default…
export default function AdminStats() { /* ... */ }

// ✅ …soit on remappe un export nommé vers default dans le import()
const AdminStats = lazy(() =>
  import('./pages/AdminStats').then((m) => ({ default: m.AdminStats })),
);
```

### PIÈGE #3 — Composant lazy sans `Suspense` autour

```tsx
// ❌ Aucun Suspense parent : React lève une erreur au premier rendu du lazy
<AdminStats />

// ✅ Toujours un Suspense en amont (au niveau du layout ou de l'écran)
<Suspense fallback={<StatsSkeleton />}>
  <AdminStats />
</Suspense>
```

Note : avec le `lazy` **de route** du data router v7, c'est le routeur qui gère l'attente — tu n'as pas à poser toi-même un `Suspense`. Ne confonds pas les deux mécanismes.

### PIÈGE #4 — `<Navigate>` sans `replace` sur une redirection de garde

```tsx
// ❌ Sans replace : /login s'empile dans l'historique
return <Navigate to="/login" />;
// L'utilisateur se connecte, revient sur /admin, clique "Précédent"
// → il retombe sur /login. Boucle et confusion.

// ✅ replace : la redirection remplace l'entrée courante
return <Navigate to="/login" replace />;
```

### PIÈGE #5 — Confondre `return redirect()` en composant et en loader

```tsx
// ❌ redirect() est une API de loader/action, pas un rendu de composant
function RequireAuth() {
  const { user } = useAuth();
  if (!user) return redirect('/login'); // ⚠️ ne redirige rien dans un composant
  return <Outlet />;
}

// ✅ Dans un composant → <Navigate>. Dans un loader/action → throw redirect().
function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

---

## 5. Ancrage TribuZen

Dans l'admin web TribuZen, ce module structure toute la couche d'accès et de performance des écrans réservés.

**Garde de rôle `RequireRole`** (`src/auth/guards.tsx`) — enveloppe la branche `/admin` du routeur. Un `member` ou un `mod` qui vise `/admin` est renvoyé sur `/403` ; un visiteur non connecté sur `/login` avec mémorisation de la cible. C'est exactement le cas concret d'ouverture du module.

**`AuthProvider` / `useAuth`** (`src/auth/AuthContext.tsx`) — source de vérité de l'utilisateur courant côté client (nom + rôle). Alimenté par la réponse de `POST /api/login`. Sert la garde et l'affichage conditionnel des liens du menu admin.

**Lazy-load des écrans lourds** (`src/pages/AdminStats.tsx`) — le tableau de rétention et ses graphes sont sortis du bundle initial via `React.lazy` (ou le `lazy` de route v7). Fallback `StatsSkeleton` pendant le téléchargement du chunk. Les écrans admin légers (liste de membres) restent en import statique.

**Contrôle réel côté API** — chaque endpoint `GET /api/admin/*` re-vérifie le JWT et le rôle `admin` en base. La garde React n'est jamais la barrière : si l'API renvoie `403`, le `loader` (variante v7) `throw` une `Response 403` captée par l'`ErrorBoundary` de route.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  auth/
    AuthContext.tsx      # AuthProvider + useAuth
    guards.tsx           # RequireAuth, RequireRole
  pages/
    AdminDashboard.tsx   # import statique (léger)
    AdminStats.tsx       # export default, lazy-loadé (lourd)
    StatsSkeleton.tsx    # fallback Suspense
    Forbidden.tsx        # écran /403
  App.tsx                # createBrowserRouter + branche /admin gardée
```

---

## 6. Points clés

1. Une garde d'auth = composant wrapper qui rend `<Outlet />` si autorisé, `<Navigate to="/login" replace />` sinon.
2. La protection par rôle ajoute une vérif du rôle et distingue non-connecté (`/login`) de rôle insuffisant (`/403`).
3. Alternative : protéger dans un `loader` avec `throw redirect('/login')` — la barrière s'exécute avant le rendu.
4. **Une garde côté client est de l'UX, pas de la sécurité :** le vrai contrôle d'accès est côté API, re-vérifié à chaque requête.
5. `React.lazy(() => import(...))` crée un composant chargé à la demande ; il exige un `export default` et un `<Suspense>` parent.
6. Le `fallback` de `Suspense` doit être un squelette aux bonnes dimensions pour éviter le layout shift.
7. Le `lazy` de route du data router v7 charge le module entier (Component + loader + ErrorBoundary) ; le routeur gère l'attente sans `Suspense` manuel.
8. `<Navigate replace>` évite d'empiler la redirection dans l'historique ; `redirect()` est réservé aux loaders/actions, pas aux composants.

---

## 7. Seeds Anki

```
Pourquoi une garde de route côté client n'est-elle pas une sécurité ?|Parce que tout le code de garde vit dans le bundle envoyé au navigateur : l'utilisateur peut le lire, le contourner, ou appeler l'API directement (curl, Postman). C'est de l'UX (rediriger, cacher). Le vrai contrôle d'accès est côté serveur, re-vérifié à chaque requête (token + rôle).
Comment protéger une route par authentification avec un composant wrapper ?|Un composant qui lit l'état d'auth et rend <Outlet /> si l'utilisateur est connecté, ou <Navigate to="/login" state={{ from }} replace /> sinon. On le place comme route parente des routes protégées.
Comment protéger une route via un loader dans le data router ?|Dans le loader de la route, on vérifie l'utilisateur et on interrompt avec throw redirect('/login') (ou '/403' si rôle insuffisant). La barrière s'exécute avant le rendu du composant.
Que faut-il pour utiliser React.lazy sur un composant ?|Un import() dynamique dont le module a un export default qui est le composant, et un <Suspense fallback={...}> parent. Sans Suspense, React lève une erreur ; sans export default, il faut remapper .then(m => ({ default: m.X })).
Quelle est la différence entre React.lazy + Suspense et le lazy de route du data router v7 ?|React.lazy charge un composant et nécessite un Suspense manuel. Le lazy de route (v7) charge tout le module de route (Component + loader + ErrorBoundary) à la demande, et c'est le routeur qui gère l'attente — pas de Suspense à écrire.
Pourquoi ajouter replace sur un <Navigate> de redirection de garde ?|Pour ne pas empiler la page de redirection (/login) dans l'historique. Sans replace, après connexion l'utilisateur qui clique "Précédent" retombe sur /login, créant une boucle.
Où placer le vrai contrôle d'accès dans une app React + API ?|Côté API : chaque endpoint sensible re-vérifie la signature/expiration du token et le rôle en base, à chaque requête. La garde React reste pour l'UX (redirections, affichage conditionnel), jamais comme unique barrière.
Quel gain apporte le code splitting par route ?|Le code d'un écran n'est téléchargé que lorsqu'on y navigue, au lieu d'être dans le bundle initial. Ex TribuZen : sortir les 200 Ko de charting de /admin/stats fait retomber le bundle initial et n'envoie ce chunk qu'aux admins qui ouvrent l'écran.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-19-protection-et-lazy/README.md`. Construire la garde de rôle `RequireRole` de l'admin TribuZen et lazy-loader l'écran stats — en gardant en tête que la garde est de l'UX, pas une sécurité.
