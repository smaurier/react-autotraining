# Cours 35 — Error Boundaries et Suspense

> **Objectif** : Maîtriser la gestion des erreurs en React avec les Error Boundaries (la seule exception où l'on utilise une class component), découvrir la bibliothèque `react-error-boundary`, et comprendre `Suspense` pour le chargement de données et le code splitting. Construire une hiérarchie loading → data → error robuste.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre le pattern children et les render props ?</summary>

`children` injecte du contenu statique (JSX) dans un composant. Les render props passent une **fonction** qui reçoit des données et retourne du JSX — c'est l'équivalent des scoped slots Vue. Les render props sont aujourd'hui largement remplacées par les custom hooks.
</details>

<details>
<summary>2. Qu'est-ce qu'un compound component ?</summary>

Un ensemble de composants qui partagent un état interne via un Context et fonctionnent ensemble (comme `<select>` et `<option>`). Exemples : `<Tabs>`, `<Accordion>`, `<Menu>`. L'API est déclarative et flexible.
</details>

<details>
<summary>3. Pourquoi React privilégie-t-il la composition à l'héritage ?</summary>

L'héritage crée un couplage fort entre composants. La composition via `children` et les props est plus flexible, plus testable, et ne souffre pas des problèmes de diamant d'héritage. La documentation officielle React recommande explicitement de ne jamais utiliser l'héritage.
</details>

---

## Analogie

Imaginez un **réseau électrique** : quand un court-circuit se produit dans une pièce, le disjoncteur de cette pièce saute, mais le reste de la maison continue de fonctionner. Les Error Boundaries sont les **disjoncteurs** de votre application React : ils capturent les erreurs dans une partie de l'arbre de composants sans faire tomber toute l'application.

`Suspense`, c'est comme un **interrupteur avec voyant** : pendant que le courant arrive (les données chargent), le voyant est orange (fallback). Quand tout est prêt, le voyant passe au vert (contenu rendu).

---

## Théorie

### 1. Le problème : une erreur non capturée plante toute l'app

```tsx
// ❌ Sans Error Boundary : si UserProfile plante, TOUTE l'app devient blanche
function App() {
  return (
    <div>
      <Header />
      <UserProfile /> {/* 💥 throw Error ici → écran blanc */}
      <Footer />
    </div>
  );
}
```

En production, une erreur non capturée dans le rendu d'un composant provoque le **démontage complet de l'arbre React**. L'utilisateur voit un écran blanc.

### 2. Error Boundary : la class component (la seule exception)

Les Error Boundaries utilisent les méthodes de cycle de vie `getDerivedStateFromError` et `componentDidCatch`, qui n'existent **que** dans les class components. C'est la seule raison légitime d'écrire une class component en 2025 :

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    // Met à jour le state pour afficher le fallback
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Envoyer l'erreur à un service de monitoring (Sentry, etc.)
    console.error("Error Boundary a capturé :", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

```tsx
// ✅ Utilisation : Header et Footer continuent de fonctionner
function App() {
  return (
    <div>
      <Header />
      <ErrorBoundary fallback={<p>Une erreur est survenue dans le profil.</p>}>
        <UserProfile />
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
```

> **Limites des Error Boundaries :** ils ne capturent PAS :
> - Les erreurs dans les event handlers (utiliser `try/catch`)
> - Les erreurs asynchrones (`async/await` dans useEffect)
> - Les erreurs dans le server-side rendering
> - Les erreurs dans l'Error Boundary lui-même

### 3. react-error-boundary : la solution moderne

La bibliothèque `react-error-boundary` fournit un wrapper fonctionnel avec plus de fonctionnalités :

```bash
npm install react-error-boundary
```

```tsx
import { ErrorBoundary } from "react-error-boundary";

// Composant fallback avec accès à l'erreur et au reset
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded">
      <h2 className="text-red-800 font-bold">Quelque chose s'est mal passé</h2>
      <p className="text-red-600">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        Réessayer
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Nettoyer le state, refetch, etc.
      }}
      onError={(error, info) => {
        // Envoyer à Sentry
        console.error(error, info);
      }}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### 4. Suspense pour le chargement de données

`Suspense` affiche un fallback pendant qu'un composant enfant "suspend" (attend des données) :

```tsx
import { Suspense } from "react";

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UserProfile />
    </Suspense>
  );
}
```

> **Important** : `Suspense` fonctionne avec les bibliothèques qui le supportent : React Query (TanStack Query), Next.js (Server Components avec `async`), `React.lazy()`. Il ne fonctionne **pas** avec un `useEffect` + `fetch` classique.

#### Suspense avec React Query

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";

function UserProfile() {
  // useSuspenseQuery "suspend" le composant → Suspense affiche le fallback
  const { data: user } = useSuspenseQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetch("/api/user/me").then((r) => r.json()),
  });

  // Pas besoin de vérifier isLoading — Suspense s'en charge !
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### 5. Suspense + lazy pour le code splitting par route

```tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";

// Chaque page est chargée à la demande
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

> **En Next.js 15**, le code splitting par route est automatique. Chaque `page.tsx` est un chunk séparé. Pas besoin de `React.lazy` pour les pages.

### 6. Suspense boundaries imbriqués

On peut imbriquer plusieurs `Suspense` pour un chargement progressif :

```tsx
function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Le header se charge d'abord */}
      <Suspense fallback={<HeaderSkeleton />}>
        <DashboardHeader />
      </Suspense>

      {/* Chaque widget se charge indépendamment */}
      <Suspense fallback={<WidgetSkeleton />}>
        <RevenueWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <UsersWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <OrdersWidget />
      </Suspense>
    </div>
  );
}
```

Chaque `Suspense` boundary est indépendante : si `RevenueWidget` charge lentement, les autres widgets s'affichent dès qu'ils sont prêts.

### 7. Pattern complet : loading → data → error

La combinaison `ErrorBoundary` + `Suspense` crée une hiérarchie robuste :

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

// ✅ Pattern recommandé : Error Boundary AUTOUR de Suspense
function SafeWidget({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="p-4 bg-red-50 rounded">
          <p>Erreur : {error.message}</p>
          <button onClick={resetErrorBoundary}>Réessayer</button>
        </div>
      )}
    >
      <Suspense
        fallback={
          <div className="p-4 animate-pulse bg-gray-100 rounded">
            Chargement...
          </div>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Utilisation
function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SafeWidget>
        <RevenueChart />
      </SafeWidget>
      <SafeWidget>
        <UsersList />
      </SafeWidget>
    </div>
  );
}
```

**Ordre important :**
1. `ErrorBoundary` (extérieur) — capture les erreurs
2. `Suspense` (intérieur) — gère le chargement
3. Composant de données (enfant) — suspend ou throw

```
ErrorBoundary
  └── Suspense (fallback = skeleton)
        └── DataComponent (suspend pendant le fetch)
              ├── Succès → affiche les données
              └── Erreur → remonte à ErrorBoundary
```

### 8. Error Boundaries en Next.js 15

Next.js utilise les fichiers spéciaux `error.tsx` et `loading.tsx` qui sont des Error Boundaries et Suspense intégrés :

```
app/
├── layout.tsx
├── error.tsx        ← Error Boundary automatique
├── loading.tsx      ← Suspense fallback automatique
├── page.tsx
└── dashboard/
    ├── error.tsx    ← Error Boundary pour /dashboard uniquement
    ├── loading.tsx  ← Loading pour /dashboard uniquement
    └── page.tsx
```

```tsx
// app/error.tsx — DOIT être un Client Component
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Une erreur est survenue</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Réessayer</button>
    </div>
  );
}
```

```tsx
// app/loading.tsx — peut être Server ou Client Component
export default function Loading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
```

---

## Pratique

### Exercice : créer une page avec chargement progressif et gestion d'erreur

Créez une page `DashboardPage` qui contient trois widgets (`StatsWidget`, `ChartWidget`, `ActivityWidget`). Chaque widget charge ses données via `useSuspenseQuery`. Implémentez :

1. Un `SafeSection` réutilisable (ErrorBoundary + Suspense)
2. Un skeleton de chargement pour chaque widget
3. Un fallback d'erreur avec bouton "Réessayer"
4. Les widgets doivent se charger indépendamment

<details>
<summary>Voir la solution</summary>

```tsx
"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useSuspenseQuery } from "@tanstack/react-query";

// --- Composant réutilisable SafeSection ---
function SafeSection({
  children,
  skeletonHeight = "h-48",
}: {
  children: React.ReactNode;
  skeletonHeight?: string;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Erreur : {error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Réessayer
          </button>
        </div>
      )}
    >
      <Suspense
        fallback={
          <div
            className={`${skeletonHeight} bg-gray-200 animate-pulse rounded-lg`}
          />
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// --- Widgets ---
function StatsWidget() {
  const { data } = useSuspenseQuery({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
  });

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-bold text-lg">Statistiques</h3>
      <p>Utilisateurs : {data.users}</p>
      <p>Revenus : {data.revenue} EUR</p>
    </div>
  );
}

function ChartWidget() {
  const { data } = useSuspenseQuery({
    queryKey: ["chart"],
    queryFn: () => fetch("/api/chart-data").then((r) => r.json()),
  });

  return (
    <div className="p-4 bg-white rounded-lg shadow col-span-2">
      <h3 className="font-bold text-lg">Graphique</h3>
      <p>{data.points.length} points de données</p>
    </div>
  );
}

function ActivityWidget() {
  const { data } = useSuspenseQuery({
    queryKey: ["activity"],
    queryFn: () => fetch("/api/activity").then((r) => r.json()),
  });

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-bold text-lg">Activité récente</h3>
      <ul>
        {data.items.map((item: { id: string; text: string }) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </div>
  );
}

// --- Page principale ---
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <SafeSection skeletonHeight="h-32">
          <StatsWidget />
        </SafeSection>

        <SafeSection skeletonHeight="h-64">
          <ChartWidget />
        </SafeSection>

        <SafeSection skeletonHeight="h-48">
          <ActivityWidget />
        </SafeSection>
      </div>
    </div>
  );
}
```

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Error Boundary | Capture les erreurs de rendu pour éviter l'écran blanc |
| Class component | La seule raison légitime d'en écrire une en 2025 |
| `react-error-boundary` | Wrapper moderne avec `FallbackComponent` et `resetErrorBoundary` |
| `Suspense` | Affiche un fallback pendant le chargement (lazy, React Query, Server Components) |
| Suspense imbriqué | Chargement progressif indépendant par section |
| `error.tsx` / `loading.tsx` | Équivalents Next.js des Error Boundaries et Suspense |
| Pattern recommandé | `ErrorBoundary > Suspense > DataComponent` |

> **Prochain cours** : [Cours 36 — Tailwind CSS](../09-styling/01-tailwind-css.md)
