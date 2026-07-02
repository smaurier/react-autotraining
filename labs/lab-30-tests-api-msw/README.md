# Lab 30 — Tester les appels API avec MSW

> **Outcome :** à la fin, tu sais configurer MSW v2 (handlers + `setupServer` + setup Vitest) et écrire une suite de tests qui couvre les états `loading`, `success`, `vide` et `erreur 500` d'un composant TribuZen qui fetch — en overridant les handlers par test.
> **Vrai outil :** Vitest 3 + `@testing-library/react` 16 + MSW 2 (aucun harnais maison, aucun `assertEqual` : tu lances `pnpm test` et lis le rapport Vitest).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu testes `FamilyListPage`, la page « liste des familles » de l'admin TribuZen. Elle fetch `GET /api/familles` et affiche : un spinner pendant le chargement, la liste au succès, un message si la liste est vide, une alerte si l'API échoue.

**Le composant à tester (à copier dans ton projet) :**

```tsx
// src/features/family/FamilyListPage.tsx
import { useEffect, useState } from 'react';

export interface Famille {
  id: string;
  nom: string;
  membres: number;
}

export function FamilyListPage() {
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [statut, setStatut] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/familles')
      .then((res) => {
        if (!res.ok) throw new Error('Erreur serveur');
        return res.json();
      })
      .then((data: Famille[]) => {
        setFamilles(data);
        setStatut('success');
      })
      .catch(() => setStatut('error'));
  }, []);

  if (statut === 'loading') return <p role="status">Chargement des familles…</p>;
  if (statut === 'error') return <p role="alert">Impossible de charger les familles.</p>;
  if (familles.length === 0) return <p>Aucune famille pour le moment.</p>;

  return (
    <ul>
      {familles.map((f) => (
        <li key={f.id}>{f.nom} — {f.membres} membres</li>
      ))}
    </ul>
  );
}
```

**Contraintes :**
- MSW v2 uniquement : `http.get` + `HttpResponse.json`. Interdit d'utiliser `rest`, `res`, `ctx` (API v1 périmée).
- Interdit de `vi.mock('fetch')` ou de mocker `global.fetch` à la main — c'est MSW qui intercepte.
- Le test **success** ne doit ajouter **aucun** handler : il valide le happy path de `handlers.ts`.
- Les cas vide et erreur passent **obligatoirement** par `server.use()` (override local), pas par une modif de `handlers.ts`.
- Assertion `loading` **synchrone** juste après `render` (pas d'`await` avant).

### Starter minimal

Projet Vite React-TS avec Vitest déjà en place (`pnpm create vite@latest tribuzen-lab --template react-ts`, puis `pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw`).

```
src/
  test/
    setup.ts                 ← à écrire (listen / resetHandlers / close)
    mocks/
      handlers.ts            ← à écrire (happy path GET + POST)
      server.ts              ← à écrire (setupServer)
  features/
    family/
      FamilyListPage.tsx     ← fourni ci-dessus
      FamilyListPage.test.tsx ← à écrire (4 tests)
vitest.config.ts             ← environment jsdom + setupFiles
```

`vitest.config.ts` attendu :

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

---

## Étapes (en friction)

1. **Écris `handlers.ts`** — un tableau `handlers` avec le happy path : `http.get('/api/familles', …)` renvoyant deux familles via `HttpResponse.json`, et un `http.post('/api/familles', …)` qui lit le body et renvoie 201.
2. **Écris `server.ts`** — `setupServer(...handlers)` importé de `msw/node`, exporté sous le nom `server`.
3. **Écris `setup.ts`** — importe `jest-dom/vitest`, branche `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(server.resetHandlers)`, `afterAll(server.close)`.
4. **Test success** — `render(<FamilyListPage />)`, assertion synchrone sur `role="status"`, puis `await screen.findByText(/les dupont/i)`.
5. **Test vide** — `server.use(http.get('/api/familles', () => HttpResponse.json([])))`, vérifie le message « Aucune famille » et l'absence de `listitem`.
6. **Test erreur** — `server.use(http.get('/api/familles', () => new HttpResponse(null, { status: 500 })))`, vérifie `findByRole('alert')`.
7. **Lance `pnpm test`** — les 4 tests passent. Vérifie qu'aucun warning MSW « unhandled request » n'apparaît.

---

## Corrigé complet commenté

```tsx
// ─── src/test/mocks/handlers.ts ─────────────────────────────────
import { http, HttpResponse } from 'msw';

export interface Famille {
  id: string;
  nom: string;
  membres: number;
}

// Happy path : le contrat par défaut de l'API TribuZen.
// Ces données servent AUSSI en dev navigateur (setupWorker).
const familles: Famille[] = [
  { id: 'f1', nom: 'Les Dupont', membres: 4 },
  { id: 'f2', nom: 'Les Martin', membres: 3 },
];

export const handlers = [
  // GET → renvoie la liste. HttpResponse.json = 200 + Content-Type JSON.
  http.get('/api/familles', () => HttpResponse.json(familles)),

  // POST → lit le body (request.json() est async), renvoie 201.
  http.post('/api/familles', async ({ request }) => {
    const body = (await request.json()) as { nom: string };
    const nouvelle: Famille = { id: `f${Date.now()}`, nom: body.nom, membres: 1 };
    return HttpResponse.json(nouvelle, { status: 201 });
  }),
];

// ─── src/test/mocks/server.ts ───────────────────────────────────
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// setupServer = API Node (tests). Le navigateur utiliserait setupWorker.
export const server = setupServer(...handlers);

// ─── src/test/setup.ts ──────────────────────────────────────────
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Démarre l'interception. 'error' → tout fetch non mocké fait échouer le test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Retire les overrides server.use() après CHAQUE test → isolation.
afterEach(() => server.resetHandlers());

// Éteint le serveur à la fin de la suite.
afterAll(() => server.close());

// ─── src/features/family/FamilyListPage.test.tsx ────────────────
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { FamilyListPage } from './FamilyListPage';

describe('FamilyListPage', () => {
  // 1. SUCCESS — aucun handler ajouté : on valide le happy path de handlers.ts
  it('montre le spinner puis les familles', async () => {
    render(<FamilyListPage />);

    // Assertion SYNCHRONE : l'état initial est loading, avant que fetch résolve.
    expect(screen.getByRole('status')).toHaveTextContent(/chargement/i);

    // findByText réessaie jusqu'à ce que la donnée arrive.
    expect(await screen.findByText(/les dupont — 4 membres/i)).toBeInTheDocument();
    // Une fois la liste rendue, le reste est là synchronement.
    expect(screen.getByText(/les martin — 3 membres/i)).toBeInTheDocument();
    // Le spinner a disparu.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // 2. EMPTY — override local : la route renvoie []
  it('montre un message quand aucune famille', async () => {
    server.use(http.get('/api/familles', () => HttpResponse.json([])));

    render(<FamilyListPage />);

    expect(await screen.findByText(/aucune famille/i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  // 3. ERROR — override local : la route renvoie 500
  it('montre une alerte quand l’API échoue', async () => {
    server.use(
      http.get('/api/familles', () => new HttpResponse(null, { status: 500 })),
    );

    render(<FamilyListPage />);

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent(/impossible de charger/i);
  });

  // 4. LOADING isolé — le spinner est bien présent au premier rendu
  it('affiche le spinner au chargement initial', () => {
    render(<FamilyListPage />);
    // Test purement synchrone : on ne await rien.
    expect(screen.getByRole('status')).toHaveTextContent(/chargement des familles/i);
  });
});
```

**Pourquoi ce corrigé est correct :**
- Le test success **n'ajoute aucun handler** — il vérifie le contrat par défaut, celui que le dev voit aussi en mode navigateur. C'est le test le plus important : il documente le happy path.
- Les cas vide et erreur passent par `server.use()` ; `afterEach(server.resetHandlers())` garantit qu'ils ne fuient pas sur les autres tests.
- La distinction `findBy` (async, réessaie) / `getBy` / `queryBy` (synchrone) est respectée : `findBy` pour attendre l'apparition, `queryBy … not.toBeInTheDocument()` pour constater une absence.
- Aucun `vi.mock`, aucun faux `fetch` : le vrai `fetch` du composant s'exécute, MSW l'intercepte. C'est le comportement de production qui est testé.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module 30 :**

1. Passe `FamilyListPage` en version **TanStack Query** (`useQuery`, `queryKey: ['familles']`). Crée un helper `renderWithQuery` qui enveloppe dans un `QueryClientProvider` avec un `QueryClient` neuf par test et `retry: false`.
2. Réécris les tests success + erreur en utilisant `renderWithQuery`. Le test d'erreur doit toujours passer par `server.use()` avec un 500.
3. Ajoute un **5e test** : une famille précise renvoyée par `http.get('/api/familles/:id', …)` — vérifie que `params.id` est bien lu côté handler.
4. Ajoute un handler qui lit une query string : `GET /api/familles?q=dupont` filtre les familles ; écris le test correspondant.

**Critère de réussite :** `pnpm test` passe, aucun warning « unhandled request », le test d'erreur affiche `role="alert"` immédiatement (preuve que `retry: false` fonctionne — sinon le test met plusieurs secondes).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, cette infrastructure de test est mutualisée pour toute l'admin :

```
tribuzen/src/
  test/
    setup.ts                  # listen / resetHandlers / close (une fois pour tout le projet)
    mocks/
      handlers.ts             # contrat API partagé : /api/familles, /api/membres, /api/evenements
      server.ts               # setupServer(...handlers) — tests Node
      browser.ts              # setupWorker(...handlers) — dev navigateur sans backend
  features/
    family/
      FamilyListPage.tsx
      FamilyListPage.test.tsx
      AddFamilyForm.tsx
      AddFamilyForm.test.tsx
```

**Différences par rapport au lab :**
- `handlers.ts` grossit avec le produit (membres, événements, invitations) ; le lab n'en couvre qu'un endpoint.
- Les mêmes handlers alimentent `browser.ts` (`setupWorker`) → l'équipe front développe les pages admin avant que le backend NestJS ne soit prêt, puis réutilise les mocks en test.
- En prod, `FamilyListPage` passera par TanStack Query (module 23) ; les tests MSW restent identiques, seul le wrapper `QueryClientProvider` s'ajoute (voir variante J+30).

**Commit cible :**
```
test(family): couverture FamilyListPage (loading/success/vide/erreur) via MSW
chore(test): infra MSW partagée — handlers, setupServer, setup Vitest
```
