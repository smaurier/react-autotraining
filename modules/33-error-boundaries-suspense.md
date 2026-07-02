---
titre: Error boundaries et Suspense
cours: 04-react
notions: [error boundary via class component, getDerivedStateFromError, componentDidCatch, scope d'un boundary, fallback et reset, erreurs de rendu vs erreurs async, react-error-boundary en survol, Suspense et fallback, Suspense avec lazy, Suspense pour les données, hook use en React 19, combinaison Suspense plus ErrorBoundary]
outcomes: [écrire un error boundary qui isole une sous-partie de l'UI et affiche un fallback réinitialisable, distinguer les erreurs de rendu attrapées par un boundary des erreurs d'event handlers et async qui ne le sont pas, envelopper un composant lazy ou une lecture de données dans Suspense et le combiner avec un error boundary]
prerequis: [32-patterns-composition]
next: 34-react-19-nouveautes
libs: [{ name: react, version: "^19" }]
tribuzen: admin TribuZen — ErrorBoundary autour du FamilyFeed et Suspense pour le panneau lazy de statistiques
last-reviewed: 2026-07
---

# Error boundaries et Suspense

> **Outcomes — tu sauras FAIRE :** écrire un error boundary qui isole une sous-partie de l'UI avec un fallback réinitialisable, distinguer les erreurs de rendu (attrapées) des erreurs d'event handlers / async (non attrapées), envelopper un composant `lazy` ou une lecture de données dans `Suspense` et le combiner avec un error boundary.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, la page famille affiche un flux d'activité (`FamilyFeed`). Un jour, l'API renvoie un membre sans `role`, et ce composant fait `member.role.toUpperCase()`. Résultat en production :

```tsx
// AdminFamilyPage.tsx — AVANT
function AdminFamilyPage() {
  return (
    <div className="admin-family">
      <AdminTopBar />
      <FamilyFeed familyId="fam-42" /> {/* 💥 throw ici → écran blanc TOTAL */}
      <FamilySidebar />
    </div>
  );
}
```

Une erreur **non capturée pendant le rendu** démonte tout l'arbre React : la top-bar disparaît, la sidebar disparaît, l'admin voit une page blanche. Le bug d'un seul composant a tué toute la page.

**Deux besoins distincts se cachent ici :**
1. **Isoler la casse** — si `FamilyFeed` plante, le reste de la page doit survivre et afficher un message « impossible de charger le flux » avec un bouton *Réessayer*. C'est le rôle des **error boundaries**.
2. **Gérer l'attente** — le panneau de statistiques est lourd et chargé à la demande ; pendant son chargement on veut un squelette, pas un trou. C'est le rôle de **Suspense**.

Ce module couvre les deux, et surtout la limite cruciale : **un error boundary n'attrape PAS les erreurs des event handlers ni des `async`**.

---

## 2. Théorie complète, concise

### 2.1 Le problème : une erreur de rendu non attrapée démonte tout

Depuis React 16, une exception levée pendant le rendu, dans un cycle de vie ou dans un constructeur d'un composant **remonte** jusqu'à la racine si personne ne l'attrape, et React **démonte l'arbre entier**. En dev tu vois l'overlay d'erreur ; en prod, l'écran blanc. Il faut donc des points de capture volontaires dans l'arbre : les error boundaries.

### 2.2 L'error boundary : le dernier composant classe légitime

Un error boundary est un **composant classe** qui implémente une (ou les deux) méthodes spéciales. C'est aujourd'hui la seule raison d'écrire une classe en React : aucun hook n'expose encore ces deux points d'accroche.

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}
interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  // (1) Rendu de secours : appelée PENDANT le rendu, doit être pure.
  //     Retourne le nouveau state → déclenche le rendu du fallback.
  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  // (2) Effet de bord : appelée APRÈS le rendu du fallback.
  //     C'est ici (pas dans (1)) qu'on logge vers Sentry / un backend.
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Boundary a capturé :', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default ErrorBoundary;
```

Deux méthodes, deux rôles :
- **`getDerivedStateFromError`** — *statique*, *pure*, sert à basculer le state pour afficher le fallback. Pas d'effet de bord ici.
- **`componentDidCatch`** — reçoit l'`error` et un `info.componentStack` (le chemin de composants), sert au **logging / monitoring**.

### 2.3 Le scope d'un boundary : ce qu'il protège

Un error boundary attrape uniquement les erreurs de rendu de **ses descendants**, pas les siennes ni celles de ses frères. Le placement définit le périmètre protégé.

```tsx
// La top-bar et la sidebar SURVIVENT ; seul le flux est remplacé par le fallback.
function AdminFamilyPage() {
  return (
    <div className="admin-family">
      <AdminTopBar />
      <ErrorBoundary fallback={<FeedError />}>
        <FamilyFeed familyId="fam-42" />
      </ErrorBoundary>
      <FamilySidebar />
    </div>
  );
}
```

Règle de placement : **plus le boundary est bas, plus la panne est isolée**. Un boundary racine unique évite l'écran blanc mais remplace toute la page ; des boundaries fins autour de chaque zone risquée gardent le reste utilisable. En pratique on combine : un boundary racine (filet de sécurité) + des boundaries locaux autour des zones fragiles (flux, widgets, panneaux data).

### 2.4 Fallback + reset : permettre de réessayer

Un fallback figé (« une erreur est survenue ») est frustrant. On veut souvent **réinitialiser** le boundary pour retenter le rendu. Le principe : un compteur / une clé qui, en changeant, remonte proprement le sous-arbre.

```tsx
interface Props {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode; // le fallback reçoit le reset
}
interface State {
  hasError: boolean;
}

class ResettableBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) return this.props.fallback(this.reset);
    return this.props.children;
  }
}

// Usage : le fallback rend un bouton qui rappelle reset()
<ResettableBoundary
  fallback={(reset) => (
    <div role="alert">
      <p>Impossible de charger le flux.</p>
      <button onClick={reset}>Réessayer</button>
    </div>
  )}
>
  <FamilyFeed familyId="fam-42" />
</ResettableBoundary>
```

> Attention : si la cause de l'erreur persiste (même donnée corrompue), un simple reset re-throw immédiatement. Le reset a du sens quand on l'associe à un **refetch** ou à un changement d'entrée (voir 2.9).

### 2.5 Ce qu'un error boundary N'attrape PAS

C'est le point le plus mal compris. Un error boundary attrape les erreurs **du rendu React**. Il **n'attrape PAS** :

- ❌ **les erreurs dans les event handlers** (`onClick`, `onSubmit`…) — elles s'exécutent hors du cycle de rendu ;
- ❌ **les erreurs asynchrones** (`setTimeout`, `.then`, `async/await`, code dans un `useEffect` asynchrone) ;
- ❌ les erreurs du **rendu serveur** (SSR) ;
- ❌ les erreurs levées **dans le boundary lui-même** (elles remontent au boundary parent).

```tsx
function LikeButton({ id }: { id: string }) {
  // ❌ Cette erreur NE remonte PAS au boundary : c'est un event handler.
  const handleClick = async () => {
    await likeFamily(id); // si ça rejette → promesse non gérée, pas de fallback
  };
  return <button onClick={handleClick}>J'aime</button>;
}
```

Pour ces cas-là, on gère l'erreur **à la main** : `try/catch` dans le handler, et on la reflète dans le state pour l'afficher (ou, astuce, on la re-`throw` pendant le rendu via `useState` pour la faire remonter à un boundary).

```tsx
function LikeButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      await likeFamily(id);
      setError(null);
    } catch (e) {
      setError('Le like a échoué, réessaie.'); // ✅ géré explicitement
    }
  };

  return (
    <>
      <button onClick={handleClick}>J'aime</button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
```

> Distinction à mémoriser : **erreur de rendu → boundary** ; **erreur d'event handler / async → `try/catch` + state**.

### 2.6 react-error-boundary (en survol)

Écrire une classe à chaque fois est répétitif. La bibliothèque **`react-error-boundary`** fournit un composant fonctionnel prêt à l'emploi, avec fallback typé, `reset`, et hooks utilitaires. C'est le choix courant en projet réel.

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function FeedError({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Impossible de charger le flux : {error.message}</p>
      <button onClick={resetErrorBoundary}>Réessayer</button>
    </div>
  );
}

<ErrorBoundary
  FallbackComponent={FeedError}
  onReset={() => refetchFeed()}          // relance le fetch au reset
  onError={(err, info) => logToSentry(err, info)}
>
  <FamilyFeed familyId="fam-42" />
</ErrorBoundary>
```

L'API repose sur les mêmes primitives (`getDerivedStateFromError` / `componentDidCatch`) — la lib ne fait que les emballer. Le hook `useErrorBoundary()` qu'elle expose permet aussi de **propager manuellement** une erreur async vers le boundary (utile pour le cas 2.5).

### 2.7 Suspense : afficher un fallback pendant une attente

`Suspense` est le pendant « chargement » de l'error boundary. Il affiche un `fallback` tant qu'un composant enfant **suspend** (indique à React qu'il n'est pas prêt), puis affiche le contenu réel une fois prêt.

```tsx
import { Suspense } from 'react';

<Suspense fallback={<StatsSkeleton />}>
  <FamilyStatsPanel /> {/* suspend pendant son chargement */}
</Suspense>
```

Deux déclencheurs de suspension qui nous intéressent :
1. un composant chargé via **`lazy()`** (code splitting) ;
2. une **lecture de données** compatible Suspense (le hook `use()` en React 19, `useSuspenseQuery` de TanStack Query, les Server Components `async`…).

`Suspense` ne fonctionne **pas** avec un `useEffect` + `fetch` classique : ce pattern gère son `isLoading` lui-même, il ne suspend pas.

### 2.8 Suspense + lazy : le code splitting

`lazy()` diffère le chargement du code d'un composant jusqu'à son premier rendu. Le composant retourné suspend pendant le téléchargement du chunk → `Suspense` affiche le fallback.

```tsx
import { lazy, Suspense } from 'react';

// Le code de FamilyStatsPanel n'est téléchargé qu'au moment où on l'affiche.
const FamilyStatsPanel = lazy(() => import('./FamilyStatsPanel'));

function AdminFamilyPage() {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <FamilyStatsPanel familyId="fam-42" />
    </Suspense>
  );
}
```

Gain : le bundle initial n'embarque pas le panneau de stats (graphes, dépendances lourdes) ; il n'arrive que si l'admin l'ouvre.

### 2.9 IMPORTANT React 19 — le hook `use()` pour lire une promesse

React 19 introduit **`use()`** : un hook qui **lit la valeur d'une promesse** (ou d'un contexte). Quand on lui passe une promesse non résolue, le composant **suspend** — donc `Suspense` prend le relais, et si la promesse **rejette**, l'erreur remonte à l'**error boundary**. Un seul appel remplace tout le triptyque `isLoading` / `error` / `data`.

```tsx
import { use, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// La promesse est créée EN DEHORS du rendu (ou passée en prop / mise en cache).
function FamilyStats({ statsPromise }: { statsPromise: Promise<Stats> }) {
  const stats = use(statsPromise); // suspend si pending, throw si rejected
  return <p>{stats.membersCount} membres · {stats.eventsCount} événements</p>;
}

function StatsPanel({ familyId }: { familyId: string }) {
  // fetchStats retourne une promesse ; idéalement mémoïsée / cachée (voir piège #4)
  const statsPromise = useMemo(() => fetchStats(familyId), [familyId]);

  return (
    <ErrorBoundary fallback={<p role="alert">Stats indisponibles.</p>}>
      <Suspense fallback={<StatsSkeleton />}>
        <FamilyStats statsPromise={statsPromise} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

Particularités de `use()` par rapport aux autres hooks :
- il peut être appelé **conditionnellement** et dans une boucle (pas soumis à la règle « pas de hook dans un `if` ») ;
- il lit aussi un **contexte** : `const theme = use(ThemeContext)` — équivalent à `useContext`, mais appelable conditionnellement.

> Point clé : `use()` **ne crée pas** la promesse. Il la consomme. La promesse doit venir d'ailleurs (cache, framework, prop d'un Server Component). Créer `fetch(...)` directement dans le corps du composant à chaque rendu crée une **nouvelle promesse à chaque fois** → boucle de suspension infinie (piège #4).

### 2.10 Combiner Suspense + ErrorBoundary : loading → data → error

Les deux boundaries se complètent et se **superposent** : l'`ErrorBoundary` **à l'extérieur** capte l'échec, le `Suspense` **à l'intérieur** gère l'attente.

```tsx
function SafePanel({ children, skeleton }: {
  children: ReactNode;
  skeleton: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={<p role="alert">Section indisponible.</p>}>
      <Suspense fallback={skeleton}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
```

```
ErrorBoundary            ← si l'enfant throw / la promesse rejette → fallback erreur
  └── Suspense           ← pendant l'attente → fallback skeleton
        └── DataPanel    ← use(promise) : suspend puis affiche, ou rejette
```

L'ordre compte : `ErrorBoundary` doit envelopper `Suspense`, sinon un rejet de promesse pendant l'attente ne serait pas capté proprement.

---

## 3. Worked examples

### Exemple 1 — FamilyFeed protégé par un boundary réinitialisable

Objectif : isoler `FamilyFeed`, afficher un fallback « impossible de charger » avec bouton *Réessayer* qui **refetch**, sans casser le reste de la page.

```tsx
// ─── ErrorBoundary.tsx — boundary réutilisable avec reset ────────
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (reset: () => void, error: Error) => ReactNode;
  onReset?: () => void;                 // hook pour refetch au reset
}
interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };   // bascule vers le fallback
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Point de logging — en prod : Sentry, LogRocket, backend maison…
    console.error('[FamilyFeed]', error.message, info.componentStack);
  }

  reset = () => {
    this.props.onReset?.();             // 1. relance le fetch côté parent
    this.setState({ hasError: false, error: null }); // 2. re-rend les enfants
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.reset, this.state.error);
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

// ─── AdminFamilyPage.tsx — mise en place ─────────────────────────
import { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

function AdminFamilyPage() {
  // reloadKey change à chaque reset → force FamilyFeed à refetch
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="admin-family">
      <AdminTopBar />

      <ErrorBoundary
        onReset={() => setReloadKey((k) => k + 1)}
        fallback={(reset) => (
          <div role="alert" className="feed-error">
            <p>Impossible de charger le flux de la famille.</p>
            <button onClick={reset}>Réessayer</button>
          </div>
        )}
      >
        {/* key force le remontage complet du feed au reload */}
        <FamilyFeed key={reloadKey} familyId="fam-42" />
      </ErrorBoundary>

      <FamilySidebar /> {/* survit quoi qu'il arrive au feed */}
    </div>
  );
}
```

**Pourquoi c'est correct :**
- La panne de `FamilyFeed` est **contenue** : `AdminTopBar` et `FamilySidebar` restent affichées.
- `reset` fait deux choses : incrémente `reloadKey` (→ refetch via `key`) **et** re-rend les enfants. Sans le refetch, on retomberait sur la même erreur.
- Le logging vit dans `componentDidCatch`, jamais dans `getDerivedStateFromError` (qui doit rester pure).

### Exemple 2 — Panneau de stats lazy + `use()`, sous Suspense + ErrorBoundary

Objectif : charger `FamilyStatsPanel` à la demande (code splitting) et lire ses données via `use()` en React 19, avec squelette pendant l'attente et fallback en cas d'échec.

```tsx
// ─── api.ts ──────────────────────────────────────────────────────
export interface Stats { membersCount: number; eventsCount: number; }

// Cache module-level : une promesse par familyId, réutilisée entre rendus.
// Évite de recréer une promesse à chaque rendu (→ boucle de suspension).
const statsCache = new Map<string, Promise<Stats>>();

export function getStats(familyId: string): Promise<Stats> {
  if (!statsCache.has(familyId)) {
    statsCache.set(
      familyId,
      fetch(`/api/families/${familyId}/stats`).then((r) => {
        if (!r.ok) throw new Error('stats fetch failed'); // → rejette → ErrorBoundary
        return r.json() as Promise<Stats>;
      }),
    );
  }
  return statsCache.get(familyId)!;
}

// ─── FamilyStats.tsx — lit la promesse avec use() ────────────────
import { use } from 'react';
import { getStats } from './api';

function FamilyStats({ familyId }: { familyId: string }) {
  const stats = use(getStats(familyId)); // suspend si pending, throw si rejected
  return (
    <p>
      {stats.membersCount} membres · {stats.eventsCount} événements
    </p>
  );
}

export default FamilyStats; // chargé via lazy() côté page

// ─── AdminFamilyPage.tsx — assemblage ────────────────────────────
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const FamilyStats = lazy(() => import('./FamilyStats'));

function StatsPanel({ familyId }: { familyId: string }) {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <div role="alert">
          <p>Statistiques indisponibles.</p>
          <button onClick={resetErrorBoundary}>Réessayer</button>
        </div>
      )}
    >
      <Suspense fallback={<div className="skeleton skeleton--stats" />}>
        <FamilyStats familyId={familyId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Ce qui se passe, dans l'ordre :**
1. Premier rendu de `StatsPanel` → `lazy` télécharge le chunk → `Suspense` montre le squelette.
2. Le chunk arrive, `FamilyStats` s'exécute → `use(getStats(...))` suspend car la promesse est *pending* → toujours le squelette.
3. La promesse **résout** → React re-rend `FamilyStats` avec `stats` → le squelette disparaît.
4. Si la promesse **rejette** → l'erreur remonte à l'`ErrorBoundary` → fallback + bouton *Réessayer*.

Un seul `use()` a remplacé `isLoading` / `error` / `data`. Le cache module-level garantit qu'on **ne recrée pas** la promesse à chaque rendu.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire qu'un boundary attrape les erreurs d'event handlers / async

```tsx
// ❌ On espère que le boundary attrape l'échec du clic → il ne l'attrapera JAMAIS.
<ErrorBoundary fallback={<p>Erreur</p>}>
  <button onClick={() => { throw new Error('boom'); }}>Envoyer</button>
</ErrorBoundary>
```

Un handler s'exécute **hors du rendu**. Idem pour `.then`, `async/await`, `setTimeout`. La seule chose qu'un error boundary voit, c'est ce que React lève **pendant le rendu / commit**.

```tsx
// ✅ Gérer explicitement : try/catch + state (ou hook de propagation de la lib)
const onSend = async () => {
  try { await send(); } catch { setError('Envoi échoué'); }
};
```

**Règle :** erreur de rendu → boundary ; erreur d'interaction / async → `try/catch` + state.

### PIÈGE #2 — Mettre le logging dans `getDerivedStateFromError`

```tsx
// ❌ getDerivedStateFromError doit être PURE — pas d'effet de bord ici.
static getDerivedStateFromError(error: Error) {
  logToSentry(error);          // effet de bord interdit
  return { hasError: true };
}

// ✅ Le logging va dans componentDidCatch.
componentDidCatch(error: Error, info: ErrorInfo) {
  logToSentry(error, info.componentStack);
}
```

`getDerivedStateFromError` est appelée pendant le rendu (et peut l'être plusieurs fois) : un effet de bord y serait dupliqué et non déterministe.

### PIÈGE #3 — Un seul boundary racine pour toute l'app

```tsx
// ❌ Trop grossier : la moindre erreur remplace TOUTE l'app par le fallback.
<ErrorBoundary fallback={<FullPageError />}>
  <WholeApp />
</ErrorBoundary>
```

Ça évite l'écran blanc mais jette l'utilisateur hors de tout. **Mieux :** un boundary racine (filet) **plus** des boundaries fins autour des zones risquées (`FamilyFeed`, widgets data), pour que la panne reste locale et le reste utilisable.

### PIÈGE #4 — Créer la promesse dans le rendu avec `use()`

```tsx
// ❌ Nouvelle promesse à CHAQUE rendu → use() suspend, re-rend, re-crée… boucle.
function FamilyStats({ familyId }: { familyId: string }) {
  const stats = use(fetch(`/api/stats/${familyId}`).then(r => r.json()));
  return <p>{stats.membersCount}</p>;
}

// ✅ La promesse vient d'un cache stable / d'une prop / d'un Server Component.
const stats = use(getStats(familyId)); // getStats mémoïse par familyId
```

`use()` **consomme** une promesse, il ne doit pas la **fabriquer** à chaque rendu. Sinon la référence change à chaque passage, la promesse n'est jamais « la même », et le composant suspend indéfiniment.

### PIÈGE #5 — Attendre que `Suspense` gère un `useEffect` + `fetch`

```tsx
// ❌ Ce composant ne SUSPEND pas : Suspense n'affichera jamais son fallback.
function Feed() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/feed').then(r => r.json()).then(setData); }, []);
  return data ? <List data={data} /> : <p>Chargement…</p>; // géré à la main
}

<Suspense fallback={<Skeleton />}><Feed /></Suspense> // fallback inutile ici
```

Seules les sources **compatibles Suspense** suspendent : `lazy()`, `use(promise)`, `useSuspenseQuery`, Server Components `async`. Un `useEffect`+`fetch` gère son loading lui-même — `Suspense` n'a rien à intercepter.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen (`smaurier/tribuzen`), ces deux mécanismes protègent la page famille.

**`ErrorBoundary` autour de `FamilyFeed`** (`src/components/system/ErrorBoundary.tsx`) — le flux d'activité famille dépend de données externes (posts, réactions, membres) parfois incomplètes. Le boundary isole `FamilyFeed` : en cas d'erreur de rendu, il affiche « Impossible de charger le flux » + bouton *Réessayer* qui refetch, pendant que `AdminTopBar` et `FamilySidebar` restent opérationnelles. Le `componentDidCatch` envoie l'erreur au monitoring.

**`Suspense` pour le panneau de statistiques lazy** (`src/features/family/FamilyStatsPanel.tsx`) — ce panneau (graphes de participation, compteurs) est lourd et rarement ouvert : il est chargé via `lazy()` et lit ses données avec `use()` (React 19). Enveloppé dans `Suspense` (squelette pendant l'attente) **et** un `ErrorBoundary` (fallback si les stats échouent), il suit la hiérarchie `ErrorBoundary > Suspense > use()`.

Fichiers cibles :
```
tribuzen/src/
  components/
    system/
      ErrorBoundary.tsx      # classe réutilisable (getDerivedStateFromError + componentDidCatch)
  features/
    family/
      AdminFamilyPage.tsx    # assemble TopBar + <ErrorBoundary><FamilyFeed/></ErrorBoundary> + StatsPanel
      FamilyFeed.tsx         # flux protégé par le boundary
      FamilyStatsPanel.tsx   # lazy + Suspense + use()
      statsApi.ts            # getStats(familyId) : promesse mise en cache
```

Le rôle correspond à la couche « robustesse UI » du fil-rouge : après avoir composé les vues (module 32), on les rend **résistantes aux pannes et aux latences**.

---

## 6. Points clés

1. Une erreur de rendu non attrapée démonte tout l'arbre React (écran blanc) — il faut des points de capture volontaires.
2. Un error boundary est un composant classe avec `getDerivedStateFromError` (pur, bascule le fallback) et `componentDidCatch` (effet de bord, logging) — le dernier usage légitime des classes.
3. Le scope d'un boundary = ses descendants ; plus il est bas, plus la panne est isolée. On combine un boundary racine et des boundaries locaux.
4. Un fallback réinitialisable expose un `reset` ; le reset n'a de sens qu'associé à un refetch / changement d'entrée.
5. Un error boundary N'attrape PAS les erreurs d'event handlers, ni async (`.then`, `async/await`, `setTimeout`), ni SSR — celles-là se gèrent avec `try/catch` + state.
6. `react-error-boundary` emballe ces primitives dans un composant fonctionnel avec `FallbackComponent`, `resetErrorBoundary`, `onError`.
7. `Suspense` affiche un `fallback` tant qu'un enfant suspend ; déclencheurs : `lazy()`, `use(promise)`, `useSuspenseQuery`, Server Components — pas un `useEffect`+`fetch`.
8. React 19 : `use(promise)` lit une promesse (suspend si pending, throw si rejected) et `use(context)` lit un contexte ; `use()` est appelable conditionnellement mais ne doit jamais créer la promesse dans le rendu.
9. On combine `ErrorBoundary` (extérieur) > `Suspense` (intérieur) > composant data pour la hiérarchie loading → data → error.

---

## 7. Seeds Anki

```
Quelles sont les deux méthodes d'un error boundary et leur rôle respectif ?|getDerivedStateFromError (statique, pure) : bascule le state pour afficher le fallback. componentDidCatch (effet de bord) : reçoit error + componentStack, sert au logging / monitoring. Ce sont des méthodes de composant classe.
Un error boundary attrape-t-il les erreurs d'un onClick ou d'un async/await ?|Non. Un error boundary n'attrape QUE les erreurs de rendu de ses descendants. Les event handlers, le code async (.then, async/await, setTimeout) et le SSR échappent au boundary — il faut un try/catch + state.
Que définit le placement d'un error boundary dans l'arbre ?|Son scope : il n'attrape que les erreurs de rendu de ses descendants, pas les siennes ni celles de ses frères. Plus il est bas, plus la panne est isolée. En pratique : un boundary racine + des boundaries locaux.
Pourquoi ne pas logger l'erreur dans getDerivedStateFromError ?|Parce qu'elle doit rester pure : elle est appelée pendant le rendu et peut l'être plusieurs fois. Un effet de bord (log, Sentry) y serait dupliqué et non déterministe. Le logging va dans componentDidCatch.
Qu'apporte le hook use() de React 19 avec une promesse ?|use(promise) lit la valeur d'une promesse : le composant suspend si elle est pending (Suspense montre le fallback) et l'erreur remonte à l'ErrorBoundary si elle rejette. Il remplace isLoading/error/data et est appelable conditionnellement.
Pourquoi ne faut-il pas créer la promesse directement dans le rendu avec use() ?|Parce qu'un nouvel appel (ex: use(fetch(...))) crée une nouvelle promesse à chaque rendu : la référence change, la promesse n'est jamais la même, et le composant suspend indéfiniment. La promesse doit venir d'un cache stable / d'une prop / d'un Server Component.
Quels déclencheurs font suspendre un composant sous Suspense ?|Un composant lazy() (code splitting), une lecture de données compatible Suspense : use(promise) en React 19, useSuspenseQuery (TanStack Query), les Server Components async. Un useEffect + fetch classique ne suspend PAS.
Comment combiner Suspense et ErrorBoundary et dans quel ordre ?|ErrorBoundary à l'extérieur, Suspense à l'intérieur, composant data en dessous : ErrorBoundary > Suspense > DataComponent. Le Suspense gère l'attente (fallback skeleton), l'ErrorBoundary capte le rejet / l'erreur de rendu (fallback erreur).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-33-error-boundaries-suspense/README.md`. Construire un `ErrorBoundary` réinitialisable autour de `FamilyFeed`, puis un panneau de stats `lazy` + `use()` sous `Suspense` + `ErrorBoundary`, en vérifiant qu'une erreur d'event handler N'est PAS attrapée.
