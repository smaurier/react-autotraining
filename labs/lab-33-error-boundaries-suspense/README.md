# Lab 33 — Error boundaries et Suspense

> **Outcome :** à la fin, tu sais écrire un `ErrorBoundary` réinitialisable qui isole `FamilyFeed`, envelopper un panneau lazy dans `Suspense` + `use()` (React 19), et démontrer de tes mains qu'une erreur d'event handler N'EST PAS attrapée par un boundary.
> **Vrai outil :** React 19 + Vite dev server (erreurs visibles en direct dans le navigateur et la console).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu robustifies la page famille de l'admin TribuZen. Cahier des charges **exact** :

1. **`ErrorBoundary`** — composant classe réutilisable avec `getDerivedStateFromError`, `componentDidCatch` (log console), et une méthode `reset` exposée au fallback.
2. **`FamilyFeed`** — composant qui **throw pendant le rendu** si une donnée est corrompue (un membre sans `role`). Enveloppé dans `ErrorBoundary`, il affiche « Impossible de charger le flux » + bouton *Réessayer* sans casser le reste de la page.
3. **`FamilyStatsPanel`** — composant chargé via `lazy()`, qui lit ses stats via `use(promise)` sous `Suspense` (squelette) + `ErrorBoundary` (fallback erreur).
4. **`LikeButton`** — un bouton dont le `onClick` throw, pour **prouver** que le boundary ne l'attrape pas, puis corriger avec `try/catch` + state.

**Données de départ (à copier dans le projet) :**

```tsx
export interface Member {
  id: string;
  name: string;
  role?: 'admin' | 'mod' | 'member'; // role OPTIONNEL → source du bug volontaire
}

export interface Stats {
  membersCount: number;
  eventsCount: number;
}

// Un membre corrompu (sans role) pour déclencher l'erreur de rendu
export const FEED_MEMBERS: Member[] = [
  { id: 'm1', name: 'Alice', role: 'admin' },
  { id: 'm2', name: 'Bob' }, // ← pas de role → member.role.toUpperCase() throw
];
```

**Contraintes :**
- `ErrorBoundary` est un **composant classe** — pas de lib externe pour cette partie (tu écris les deux méthodes toi-même).
- Le `reset` doit **refetch / remonter** le sous-arbre, pas juste re-render (sinon même erreur).
- La promesse de stats est **mise en cache hors du rendu** (Map module-level) — interdit de faire `use(fetch(...))` inline.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

Projet Vite (`pnpm create vite@latest tribuzen-lab33 --template react-ts`), React 19 :

```
src/
  system/
    ErrorBoundary.tsx     ← à écrire (classe)
  features/family/
    statsApi.ts           ← à écrire (getStats + cache Map)
    FamilyFeed.tsx        ← à écrire (throw si role manquant)
    FamilyStats.tsx       ← à écrire (use(getStats))
    LikeButton.tsx        ← à écrire (handler qui throw puis try/catch)
    AdminFamilyPage.tsx   ← à écrire (assemble tout)
  App.tsx                 ← branche <AdminFamilyPage />
```

Lance `pnpm dev` et valide dans le navigateur à chaque étape.

---

## Étapes (en friction)

1. **Écris `ErrorBoundary.tsx`** — `state = { hasError, error }`. `getDerivedStateFromError` retourne le state (pure, aucun log). `componentDidCatch` logge `error` + `info.componentStack`. `reset` appelle `onReset?.()` puis remet `hasError` à false. `fallback` est une fonction `(reset, error) => ReactNode`.
2. **Écris `FamilyFeed.tsx`** — reçoit `members: Member[]`, mappe et fait `member.role.toUpperCase()`. Avec un membre sans role → throw pendant le rendu.
3. **Assemble `AdminFamilyPage.tsx` (partie feed)** — une fausse `AdminTopBar` et `FamilySidebar` (juste un texte), et au milieu `<ErrorBoundary>` autour de `FamilyFeed`. Vérifie dans le navigateur : le feed montre le fallback, top-bar et sidebar restent visibles.
4. **Branche le reset** — un state `reloadKey` dans la page, `onReset` l'incrémente, `key={reloadKey}` sur `FamilyFeed`. Clique *Réessayer* : observe le remontage (avec les mêmes données corrompues, l'erreur revient — c'est normal, discute-en avec le coach).
5. **Écris `statsApi.ts` + `FamilyStats.tsx`** — `getStats(familyId)` met la promesse en cache dans une Map. `FamilyStats` fait `const stats = use(getStats(familyId))`.
6. **Charge le panneau en lazy sous Suspense + ErrorBoundary** — `const FamilyStats = lazy(...)`, enveloppé `ErrorBoundary > Suspense(skeleton) > FamilyStats`. Vérifie : squelette bref puis stats. Force un `throw` dans `getStats` → fallback erreur.
7. **Écris `LikeButton.tsx`** — version A : `onClick={() => { throw new Error('like boom'); }}`. Place-le DANS l'`ErrorBoundary` du feed, clique : **le boundary ne réagit pas**, l'erreur va seulement dans la console. Version B : `try/catch` + `useState(error)` qui affiche le message. Constate la différence.

---

## Corrigé complet commenté

```tsx
// ─── src/system/ErrorBoundary.tsx ───────────────────────────────
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (reset: () => void, error: Error) => ReactNode;
  onReset?: () => void; // hook pour refetch / remonter au reset
}
interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  // Pure : bascule le state pour rendre le fallback. AUCUN effet de bord ici.
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Effet de bord légitime : logging / monitoring.
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset = () => {
    this.props.onReset?.();                       // 1. relance le fetch côté parent
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

// ─── src/features/family/statsApi.ts ────────────────────────────
export interface Stats {
  membersCount: number;
  eventsCount: number;
}

// Cache module-level : une promesse par familyId, STABLE entre les rendus.
// Sans ce cache, use(getStats(...)) recréerait une promesse à chaque rendu
// → boucle de suspension infinie.
const statsCache = new Map<string, Promise<Stats>>();

export function getStats(familyId: string): Promise<Stats> {
  if (!statsCache.has(familyId)) {
    statsCache.set(
      familyId,
      // Simulation d'un fetch réseau (remplace par un vrai fetch en prod)
      new Promise<Stats>((resolve, reject) => {
        setTimeout(() => {
          // Pour tester le chemin d'erreur : décommente la ligne suivante
          // return reject(new Error('stats fetch failed'));
          resolve({ membersCount: 12, eventsCount: 5 });
        }, 800);
      }),
    );
  }
  return statsCache.get(familyId)!;
}

// Permet au bouton Réessayer de vider le cache pour une famille.
export function invalidateStats(familyId: string): void {
  statsCache.delete(familyId);
}

// ─── src/features/family/FamilyFeed.tsx ─────────────────────────
import type { Member } from './types';

interface FamilyFeedProps {
  members: Member[];
}

// Erreur de rendu VOLONTAIRE : un membre sans role fait throw pendant le rendu.
// C'est exactement ce qu'un ErrorBoundary est censé attraper.
function FamilyFeed({ members }: FamilyFeedProps) {
  return (
    <ul className="feed">
      {members.map((m) => (
        <li key={m.id}>
          {m.name} — {m.role!.toUpperCase()} {/* 💥 throw si role undefined */}
        </li>
      ))}
    </ul>
  );
}

export default FamilyFeed;

// ─── src/features/family/FamilyStats.tsx ────────────────────────
import { use } from 'react';
import { getStats } from './statsApi';

// use(promise) : suspend si pending (→ Suspense), throw si rejected (→ ErrorBoundary).
// La promesse vient de getStats (cache stable) — jamais créée inline dans le rendu.
function FamilyStats({ familyId }: { familyId: string }) {
  const stats = use(getStats(familyId));
  return (
    <p className="stats">
      {stats.membersCount} membres · {stats.eventsCount} événements
    </p>
  );
}

export default FamilyStats;

// ─── src/features/family/LikeButton.tsx ─────────────────────────
import { useState } from 'react';

// VERSION A (démonstration) : le boundary NE l'attrape PAS.
// L'erreur d'un event handler s'exécute hors du rendu → aucun fallback ne s'affiche,
// on la voit seulement dans la console. Décommente pour l'observer.
// function LikeButtonBroken() {
//   return <button onClick={() => { throw new Error('like boom'); }}>J'aime</button>;
// }

// VERSION B (correcte) : on gère l'erreur async à la main.
function LikeButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      // Simule un like qui peut échouer
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('network')), 300),
      );
      setError(null);
    } catch {
      // ✅ Capturé explicitement : un boundary ne verrait JAMAIS cette erreur.
      setError('Le like a échoué, réessaie.');
    }
  };

  return (
    <div>
      <button onClick={handleClick}>J'aime (famille {id})</button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default LikeButton;

// ─── src/features/family/AdminFamilyPage.tsx ────────────────────
import { lazy, Suspense, useState } from 'react';
import ErrorBoundary from '../../system/ErrorBoundary';
import FamilyFeed from './FamilyFeed';
import LikeButton from './LikeButton';
import { invalidateStats } from './statsApi';
import { FEED_MEMBERS } from './types';

const FamilyStats = lazy(() => import('./FamilyStats'));

const FAMILY_ID = 'fam-42';

function AdminFamilyPage() {
  // reloadKey change à chaque reset → remonte FamilyFeed (refetch simulé)
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="admin-family">
      <header>TribuZen Admin — Top bar (survit à tout)</header>

      {/* ── Zone 1 : feed protégé par un boundary réinitialisable ── */}
      <ErrorBoundary
        onReset={() => setReloadKey((k) => k + 1)}
        fallback={(reset) => (
          <div role="alert" className="feed-error">
            <p>Impossible de charger le flux de la famille.</p>
            <button onClick={reset}>Réessayer</button>
          </div>
        )}
      >
        {/* key force le remontage complet au reset */}
        <FamilyFeed key={reloadKey} members={FEED_MEMBERS} />
        <LikeButton id={FAMILY_ID} />
      </ErrorBoundary>

      {/* ── Zone 2 : panneau stats lazy → ErrorBoundary > Suspense > use() ── */}
      <ErrorBoundary
        onReset={() => {
          invalidateStats(FAMILY_ID); // vide le cache → nouvelle promesse au remontage
          setReloadKey((k) => k + 1);
        }}
        fallback={(reset) => (
          <div role="alert">
            <p>Statistiques indisponibles.</p>
            <button onClick={reset}>Réessayer</button>
          </div>
        )}
      >
        <Suspense fallback={<div className="skeleton">Chargement des stats…</div>}>
          <FamilyStats familyId={FAMILY_ID} />
        </Suspense>
      </ErrorBoundary>

      <footer>TribuZen Admin — Sidebar (survit à tout)</footer>
    </div>
  );
}

export default AdminFamilyPage;

// ─── src/features/family/types.ts ───────────────────────────────
export interface Member {
  id: string;
  name: string;
  role?: 'admin' | 'mod' | 'member';
}

export const FEED_MEMBERS: Member[] = [
  { id: 'm1', name: 'Alice', role: 'admin' },
  { id: 'm2', name: 'Bob' }, // pas de role → erreur de rendu volontaire
];

// ─── src/App.tsx ────────────────────────────────────────────────
import AdminFamilyPage from './features/family/AdminFamilyPage';

function App() {
  return <AdminFamilyPage />;
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- **Le boundary isole le feed** : quand `FamilyFeed` throw (membre sans `role`), `header` et `footer` restent affichés — la panne est contenue.
- **`getDerivedStateFromError` reste pure**, le log vit dans `componentDidCatch` — respect strict des rôles des deux méthodes.
- **Le reset fait deux choses** : `onReset` (invalide le cache / incrémente `reloadKey`) **et** `setState`. Sans le refetch, on retomberait sur la même erreur.
- **`use(getStats(...))`** consomme une promesse **mise en cache hors du rendu** : pas de recréation à chaque passage, donc pas de boucle de suspension. Elle suspend (→ squelette) puis résout (→ stats), ou rejette (→ fallback erreur).
- **`LikeButton` prouve la limite** : la version A throw dans un `onClick` et le boundary ne bronche pas (console seulement) ; la version B gère avec `try/catch` + state. C'est LA distinction du module.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Remplace ton `ErrorBoundary` classe **par `react-error-boundary`** (`pnpm add react-error-boundary`) : utilise `<ErrorBoundary FallbackComponent={...} onReset={...} onError={...}>`. Vérifie que `resetErrorBoundary` remplace ton `reset` maison.
2. Ajoute un **second panneau lazy** (`FamilyEventsPanel`) avec sa propre paire `Suspense` + `ErrorBoundary`, pour que les deux panneaux se chargent **indépendamment** (l'un peut afficher ses données pendant que l'autre charge encore).
3. Fais en sorte que le bouton *Réessayer* des stats **corrige réellement** l'erreur : `invalidateStats` + une variable qui, au 2e essai, fait résoudre la promesse au lieu de rejeter (simule un backend rétabli).
4. **Sans rouvrir ce corrigé** ni le module 33.

**Critère de réussite :** top-bar et sidebar survivent à la panne du feed ; les deux panneaux stats/events chargent indépendamment ; le clic *Réessayer* des stats finit par afficher les données ; une erreur d'`onClick` reste invisible au boundary (console uniquement).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces éléments vivent ici :

```
tribuzen/src/
  components/
    system/
      ErrorBoundary.tsx      # classe réutilisable (ou wrapper react-error-boundary)
  features/
    family/
      AdminFamilyPage.tsx     # TopBar + <ErrorBoundary><FamilyFeed/></ErrorBoundary> + StatsPanel
      FamilyFeed.tsx          # flux d'activité protégé
      FamilyStatsPanel.tsx    # lazy + Suspense + use()
      statsApi.ts             # getStats(familyId) : promesse mise en cache
```

**Différences par rapport au lab :**
- `getStats` fera un **vrai `fetch`** vers l'API TribuZen (avec `if (!r.ok) throw` pour router le rejet vers l'ErrorBoundary), au lieu du `setTimeout` simulé.
- Le `componentDidCatch` enverra vers le **monitoring réel** (Sentry) au lieu de `console.error`.
- Le fallback du feed utilisera les **composants du design system** (Alert, Button) au lieu du HTML brut inline.

**Commit cible :**
```
feat(system): ErrorBoundary réutilisable (getDerivedStateFromError + componentDidCatch)
feat(family): FamilyFeed sous ErrorBoundary + panneau stats lazy Suspense/use()
```
