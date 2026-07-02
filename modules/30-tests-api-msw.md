---
titre: Tester les appels API avec MSW
cours: 04-react
notions: [interception réseau vs mock de fetch, handlers http.get et http.post, HttpResponse.json et statuts, setupServer côté Node, cycle de vie beforeAll listen afterEach resetHandlers afterAll close, override par test avec server.use, tester loading success error d'un composant qui fetch, tester un composant TanStack Query avec MSW]
outcomes: [configurer MSW v2 pour intercepter les requêtes dans un test Vitest, écrire des handlers http.get/http.post qui renvoient HttpResponse.json, tester les trois états loading/success/error d'un composant qui fetch, overrider un handler par test pour simuler un 500, tester un composant qui utilise useQuery avec MSW]
prerequis: [29-tests-composants-rtl]
next: 31-performance-react
libs: [{ name: react, version: "^19" }, { name: vitest, version: "^3" }, { name: "@testing-library/react", version: "^16" }, { name: msw, version: "^2" }]
tribuzen: tests de la page FamilyListPage de l'admin TribuZen — handlers MSW sur GET /api/familles (succès, vide, erreur), vérification des états loading→data→error, override d'un handler pour simuler un 500
last-reviewed: 2026-07
---

# Tester les appels API avec MSW

> **Outcomes — tu sauras FAIRE :** configurer MSW v2 pour intercepter le réseau dans un test Vitest, écrire des handlers `http.get`/`http.post` qui renvoient `HttpResponse.json`, tester les états `loading`/`success`/`error` d'un composant qui fetch, overrider un handler par test pour simuler un 500, tester un composant `useQuery` avec MSW.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, `FamilyListPage` affiche la liste des familles. Elle fetch `GET /api/familles`, montre un spinner pendant le chargement, la liste en cas de succès, un message d'erreur si l'API renvoie un 500.

```tsx
// FamilyListPage.tsx — le composant à tester
import { useEffect, useState } from 'react';

interface Famille {
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
        <li key={f.id}>
          {f.nom} — {f.membres} membres
        </li>
      ))}
    </ul>
  );
}
```

**Comment tester ça sans backend qui tourne ?** Trois mauvaises pistes d'abord :

1. Lancer le vrai serveur pendant les tests → lent, flaky, dépend d'une base de données.
2. `vi.mock` sur `fetch` → tu remplaces `fetch` par une fausse fonction ; le vrai `fetch` ne s'exécute jamais, les headers/statuts ne sont pas testés, et le mock est couplé à l'implémentation.
3. Injecter un faux service en prop → tu ne testes plus le vrai chemin réseau du composant.

La bonne réponse : **MSW intercepte au niveau réseau**. Le vrai `fetch` s'exécute, MSW capture la requête sortante et renvoie une réponse contrôlée. Le composant ne sait même pas qu'il parle à un mock. Ce module te montre comment.

---

## 2. Théorie complète, concise

### 2.1 Interception réseau vs mock de `fetch`

MSW (Mock Service Worker) ne remplace pas `fetch`. Il installe un **intercepteur** : en Node (tests), c'est un intercepteur de requêtes ; dans le navigateur (dev), un Service Worker. La requête part vraiment, MSW la reconnaît via un handler et répond à sa place.

| Critère | `vi.mock(fetch)` / `vi.fn()` | MSW |
|---|---|---|
| Niveau | Remplace la fonction `fetch` | Intercepte la requête au niveau réseau |
| Réalisme | Le vrai `fetch` ne s'exécute pas | Le vrai `fetch` s'exécute, la requête est interceptée |
| Statuts, headers, URL | Non testés (tu les simules à la main) | Testés comme en production |
| Couplage | À l'implémentation (quel `fetch`, quel appel) | Au contrat d'API (URL + méthode + shape) |
| Réutilisable | Copier-coller entre tests | Handlers partagés tests + dev |

Le point clé : MSW te couple au **contrat** (`GET /api/familles` renvoie un tableau de familles), pas au code. Si tu passes de `fetch` à `axios` ou à TanStack Query, les mêmes handlers continuent de marcher.

### 2.2 MSW v2 : l'API `http` + `HttpResponse`

> **Rupture v1 → v2.** MSW v1 utilisait `rest.get(url, (req, res, ctx) => res(ctx.json(data)))`. MSW v2 (2023+) a **remplacé** cette API par les standards Web `Request`/`Response` :
> - `rest.*` → `http.*`
> - `res(ctx.json(data))` → `return HttpResponse.json(data)`
>
> Tout code que tu trouves avec `rest`, `req`, `res`, `ctx` est **de la v1 périmée**. Le module ci-dessous est 100 % v2.

Un **handler** décrit comment répondre à une requête donnée :

```ts
import { http, HttpResponse } from 'msw';

// http.<méthode>(chemin, resolver)
http.get('/api/familles', () => {
  // HttpResponse.json sérialise en JSON + Content-Type: application/json
  return HttpResponse.json([{ id: 'f1', nom: 'Les Dupont', membres: 4 }]);
});
```

Les briques essentielles :

```ts
// Réponse JSON 200 par défaut
HttpResponse.json(data);

// Réponse JSON avec statut explicite
HttpResponse.json({ error: 'Non trouvé' }, { status: 404 });

// Réponse vide avec statut (typique d'un 500)
new HttpResponse(null, { status: 500 });

// Erreur réseau (comme un timeout / DNS qui échoue)
HttpResponse.error();
```

Lire les paramètres d'URL et le body :

```ts
// Paramètre de route :id
http.get('/api/familles/:id', ({ params }) => {
  return HttpResponse.json({ id: params.id });
});

// Query string ?q=...
http.get('/api/familles', ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  return HttpResponse.json({ filtre: q });
});

// Body d'un POST (request.json() est asynchrone)
http.post('/api/familles', async ({ request }) => {
  const body = (await request.json()) as { nom: string };
  return HttpResponse.json({ id: 'new', nom: body.nom }, { status: 201 });
});
```

### 2.3 `setupServer` côté Node

En environnement de test (Node, via Vitest + jsdom), on n'utilise pas de Service Worker mais `setupServer`. On lui passe la liste des handlers « happy path » — le comportement par défaut.

```ts
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export interface Famille {
  id: string;
  nom: string;
  membres: number;
}

const familles: Famille[] = [
  { id: 'f1', nom: 'Les Dupont', membres: 4 },
  { id: 'f2', nom: 'Les Martin', membres: 3 },
];

export const handlers = [
  http.get('/api/familles', () => HttpResponse.json(familles)),

  http.post('/api/familles', async ({ request }) => {
    const body = (await request.json()) as { nom: string };
    const nouvelle: Famille = { id: `f${Date.now()}`, nom: body.nom, membres: 1 };
    return HttpResponse.json(nouvelle, { status: 201 });
  }),
];
```

```ts
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Le serveur mock partagé par toute la suite de tests
export const server = setupServer(...handlers);
```

### 2.4 Cycle de vie : `listen` / `resetHandlers` / `close`

MSW doit démarrer avant les tests, se nettoyer entre chaque test, et s'éteindre à la fin. On branche ça dans le fichier de setup Vitest (référencé par `setupFiles` dans `vitest.config.ts`).

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Démarre l'interception avant tous les tests.
// onUnhandledRequest: 'error' → un fetch vers une URL non gérée fait échouer le test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Après CHAQUE test : retire les overrides ajoutés par server.use().
// Sans ça, un handler d'erreur d'un test fuiterait sur le suivant.
afterEach(() => server.resetHandlers());

// Éteint le serveur après toute la suite.
afterAll(() => server.close());
```

| Hook | Rôle | Pourquoi |
|---|---|---|
| `beforeAll(server.listen)` | Active l'interception | Sinon le vrai réseau est appelé |
| `afterEach(server.resetHandlers)` | Restaure les handlers par défaut | Isole les tests entre eux |
| `afterAll(server.close)` | Désactive l'interception | Évite les fuites entre suites |

> **`onUnhandledRequest: 'error'`** est le réglage recommandé en test : il transforme tout appel réseau non mocké en échec explicite, plutôt qu'un test qui passe en tapant une vraie URL.

### 2.5 Override par test avec `server.use()`

Les handlers de `handlers.ts` sont le happy path. Pour un test qui a besoin d'un cas particulier (erreur, liste vide), on **préempte** le handler par défaut avec `server.use()`. L'override ne vit que jusqu'au prochain `resetHandlers()` — donc un seul test.

```ts
// Dans un test précis : forcer un 500 sur GET /api/familles
server.use(
  http.get('/api/familles', () => new HttpResponse(null, { status: 500 })),
);
```

C'est le pattern central : **base = happy path partagé, exceptions = override local**. Tu ne modifies jamais `handlers.ts` pour un cas d'erreur ; tu l'overrides dans le test qui en a besoin.

### 2.6 Tester loading → success → error d'un composant qui fetch

La stratégie pour un composant asynchrone :
- **loading** : assertion synchrone juste après `render` (l'état initial, avant que la promesse ne résolve).
- **success** : `await screen.findBy…` — `findBy` réessaie jusqu'à ce que l'élément apparaisse.
- **error** : `server.use()` pour forcer l'échec, puis `await screen.findByRole('alert')`.

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { FamilyListPage } from './FamilyListPage';

describe('FamilyListPage', () => {
  it('affiche le loading puis la liste (happy path des handlers)', async () => {
    render(<FamilyListPage />);

    // État initial synchrone : le spinner est là AVANT la résolution du fetch
    expect(screen.getByRole('status')).toHaveTextContent(/chargement/i);

    // findBy réessaie jusqu'à ce que la donnée arrive
    expect(await screen.findByText(/les dupont/i)).toBeInTheDocument();
    expect(screen.getByText(/les martin/i)).toBeInTheDocument();
  });

  it('affiche une erreur quand l’API renvoie un 500', async () => {
    // Override local : ce handler ne vit que pour ce test
    server.use(
      http.get('/api/familles', () => new HttpResponse(null, { status: 500 })),
    );

    render(<FamilyListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible/i);
  });

  it('affiche un message quand la liste est vide', async () => {
    server.use(http.get('/api/familles', () => HttpResponse.json([])));

    render(<FamilyListPage />);

    expect(await screen.findByText(/aucune famille/i)).toBeInTheDocument();
  });
});
```

> **Piège d'assertion loading** : `getByRole('status')` doit être appelé **synchronement** après `render`. Si tu mets un `await` avant, la promesse a le temps de résoudre et le spinner a déjà disparu — le test échoue à tort.

### 2.7 Tester un composant TanStack Query avec MSW

Avec `useQuery` (module 23), le composant ne fait plus `fetch` lui-même mais délègue le cache à TanStack Query. MSW reste identique — c'est toujours le réseau qui est intercepté. Deux ajustements côté test :

1. Le composant doit être enveloppé dans un `QueryClientProvider`.
2. Créer un **`QueryClient` neuf par test** avec `retry: false` — sinon, sur une erreur, Query réessaie 3 fois avant d'afficher l'état d'erreur, ce qui ralentit et fait timeouter le test.

```tsx
// test/utils.tsx — helper de rendu avec un QueryClient isolé
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithQuery(ui: ReactElement) {
  // Nouveau client par test → pas de cache partagé entre tests
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }, // pas de retry = erreur immédiate
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(ui, { wrapper: Wrapper });
}
```

```tsx
// FamilyListQuery.tsx — version useQuery de la page
import { useQuery } from '@tanstack/react-query';
import type { Famille } from '@/test/mocks/handlers';

async function fetchFamilles(): Promise<Famille[]> {
  const res = await fetch('/api/familles');
  if (!res.ok) throw new Error('Erreur serveur');
  return res.json();
}

export function FamilyListQuery() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['familles'],
    queryFn: fetchFamilles,
  });

  if (isPending) return <p role="status">Chargement des familles…</p>;
  if (isError) return <p role="alert">Impossible de charger les familles.</p>;

  return (
    <ul>
      {data.map((f) => (
        <li key={f.id}>{f.nom} — {f.membres} membres</li>
      ))}
    </ul>
  );
}
```

```tsx
// FamilyListQuery.test.tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { renderWithQuery } from '@/test/utils';
import { FamilyListQuery } from './FamilyListQuery';

describe('FamilyListQuery', () => {
  it('affiche la liste au succès', async () => {
    renderWithQuery(<FamilyListQuery />);

    expect(screen.getByRole('status')).toHaveTextContent(/chargement/i);
    expect(await screen.findByText(/les dupont/i)).toBeInTheDocument();
  });

  it('affiche l’erreur sur un 500 (retry désactivé)', async () => {
    server.use(
      http.get('/api/familles', () => new HttpResponse(null, { status: 500 })),
    );

    renderWithQuery(<FamilyListQuery />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible/i);
  });
});
```

---

## 3. Worked examples

### Exemple 1 — Suite complète pour `FamilyListPage` (fetch brut)

But : couvrir loading, success, vide et erreur pour le composant du cas concret. On part des fichiers `handlers.ts` / `server.ts` / `setup.ts` de la section 2, déjà en place.

```tsx
// src/features/family/FamilyListPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { FamilyListPage } from './FamilyListPage';

describe('FamilyListPage', () => {
  // 1. SUCCESS — utilise le handler par défaut de handlers.ts
  it('montre le spinner puis les familles', async () => {
    render(<FamilyListPage />);

    // Assertion synchrone : l'état initial est loading
    expect(screen.getByRole('status')).toHaveTextContent(/chargement/i);

    // findByText attend l'apparition (la promesse fetch résout)
    expect(await screen.findByText(/les dupont — 4 membres/i)).toBeInTheDocument();
    // getByText : une fois la liste rendue, tout est déjà là (synchrone)
    expect(screen.getByText(/les martin — 3 membres/i)).toBeInTheDocument();

    // Le spinner a disparu
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // 2. EMPTY — override : la même route renvoie un tableau vide
  it('montre un message quand aucune famille', async () => {
    server.use(http.get('/api/familles', () => HttpResponse.json([])));

    render(<FamilyListPage />);

    expect(await screen.findByText(/aucune famille/i)).toBeInTheDocument();
    // Aucun <li> rendu
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  // 3. ERROR — override : la route renvoie 500
  it('montre une alerte quand l’API échoue', async () => {
    server.use(
      http.get('/api/familles', () => new HttpResponse(null, { status: 500 })),
    );

    render(<FamilyListPage />);

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent(/impossible de charger/i);
  });
});
```

**Pourquoi cette suite est correcte :**
- Le test success **n'ajoute aucun handler** : il valide le contrat par défaut de `handlers.ts` (le happy path que le dev voit aussi en mode navigateur).
- Chaque override est **local** ; grâce à `afterEach(server.resetHandlers())`, le 500 du test 3 ne contamine pas les autres.
- On mélange `findBy` (attente async) et `getBy`/`queryBy` (synchrone) selon qu'on attend une apparition ou qu'on constate un état déjà rendu.

### Exemple 2 — Tester une mutation POST (création de famille)

But : un formulaire poste `POST /api/familles` et affiche un message de succès ou d'erreur.

```tsx
// src/features/family/AddFamilyForm.tsx
import { useState } from 'react';

export function AddFamilyForm({ onCreated }: { onCreated: () => void }) {
  const [statut, setStatut] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatut('loading');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/familles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: form.get('nom') }),
      });
      if (!res.ok) throw new Error('création impossible');
      setStatut('success');
      onCreated();
    } catch {
      setStatut('error');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Nom de la famille
        <input type="text" name="nom" required />
      </label>
      <button type="submit" disabled={statut === 'loading'}>
        {statut === 'loading' ? 'Création…' : 'Créer'}
      </button>
      {statut === 'success' && <p role="status">Famille créée !</p>}
      {statut === 'error' && <p role="alert">Erreur lors de la création.</p>}
    </form>
  );
}
```

```tsx
// src/features/family/AddFamilyForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { AddFamilyForm } from './AddFamilyForm';

describe('AddFamilyForm', () => {
  it('crée une famille avec succès', async () => {
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<AddFamilyForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/nom de la famille/i), 'Les Bernard');
    await user.click(screen.getByRole('button', { name: /créer/i }));

    // Le POST par défaut (handlers.ts) répond 201
    expect(await screen.findByText(/famille créée/i)).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it('affiche une erreur si le POST échoue', async () => {
    // Override du POST pour ce test
    server.use(
      http.post('/api/familles', () => new HttpResponse(null, { status: 500 })),
    );

    const user = userEvent.setup();
    render(<AddFamilyForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText(/nom de la famille/i), 'Les Bernard');
    await user.click(screen.getByRole('button', { name: /créer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/erreur/i);
  });
});
```

**Points de lecture :** on teste le vrai chemin réseau (`fetch` POST + `Content-Type`), MSW valide le contrat, et `userEvent.setup()` reproduit une frappe réaliste. Le succès s'appuie sur le handler par défaut ; l'échec est un override local.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Utiliser l'API v1 (`rest`, `res`, `ctx`)

```ts
// ❌ MSW v1 — PÉRIMÉ. Ne compile plus avec msw@2.
import { rest } from 'msw';
rest.get('/api/familles', (req, res, ctx) => {
  return res(ctx.status(200), ctx.json(familles));
});

// ✅ MSW v2 — standards Web Request/Response
import { http, HttpResponse } from 'msw';
http.get('/api/familles', () => HttpResponse.json(familles));
```

**Pourquoi :** MSW v2 a supprimé `rest` au profit de `http`, et le trio `(req, res, ctx)` au profit du retour direct d'un `HttpResponse` (basé sur le `Response` standard). Tout tuto avec `rest.get(...res(ctx.json()))` est de la v1.

### PIÈGE #2 — Oublier `resetHandlers` entre les tests

```ts
// ❌ Sans afterEach → l'override d'un test fuit sur les suivants
beforeAll(() => server.listen());
afterAll(() => server.close());
// (pas de resetHandlers)

// Test A fait server.use(handler 500) → Test B hérite du 500 !

// ✅ Reset systématique après chaque test
afterEach(() => server.resetHandlers());
```

**Pourquoi :** `server.use()` **empile** un handler qui persiste jusqu'à `resetHandlers()`. Sans le reset, tes tests deviennent dépendants de leur ordre d'exécution — la pire forme de flakiness.

### PIÈGE #3 — `await` avant l'assertion de loading

```tsx
// ❌ La promesse a résolu, le spinner a disparu → échoue à tort
render(<FamilyListPage />);
expect(await screen.findByText(/les dupont/i)).toBeInTheDocument();
expect(screen.getByRole('status')).toBeInTheDocument(); // plus là !

// ✅ Vérifier le loading SYNCHRONE juste après render
render(<FamilyListPage />);
expect(screen.getByRole('status')).toHaveTextContent(/chargement/i); // état initial
expect(await screen.findByText(/les dupont/i)).toBeInTheDocument();
```

**Pourquoi :** l'état `loading` n'existe que le temps que la promesse fetch résolve. Toute assertion asynchrone (`findBy`, `await`) avant lui laisse le temps au composant de passer à `success`.

### PIÈGE #4 — TanStack Query : oublier `retry: false` en test

```tsx
// ❌ QueryClient par défaut → retry 3× sur erreur, le test timeoute
const client = new QueryClient();

// ✅ Désactiver le retry en test → l'état isError arrive immédiatement
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
```

**Pourquoi :** en prod, TanStack Query réessaie automatiquement les requêtes échouées (3 fois par défaut, avec backoff). En test, ça veut dire attendre plusieurs secondes avant que `isError` passe à `true` — souvent au-delà du timeout Vitest. On désactive le retry pour les tests.

### PIÈGE #5 — Un vrai appel réseau qui passe inaperçu

```ts
// ❌ onUnhandledRequest par défaut ('warn') : un fetch non mocké tape le vrai réseau
beforeAll(() => server.listen());

// ✅ 'error' : tout appel non géré fait échouer le test
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
```

**Pourquoi :** sans `'error'`, un test qui appelle une URL sans handler part sur le vrai réseau (lenteur, flakiness, dépendance externe) et ne t'alerte que par un warning discret. `'error'` force à mocker explicitement tout ce que le composant appelle.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, la couche « état serveur » (module 23, TanStack Query) est le cœur des pages liste. MSW est l'outil qui rend ces pages **testables sans backend**.

**`FamilyListPage`** (`src/features/family/FamilyListPage.tsx`) — la page auditée dans le cas concret. Ses tests vivent en colocation (`FamilyListPage.test.tsx`) et couvrent les quatre chemins : loading, liste peuplée, liste vide, erreur 500.

**Handlers partagés** (`src/test/mocks/handlers.ts`) — un seul jeu de handlers décrit le contrat de l'API TribuZen (`GET /api/familles`, `POST /api/familles`, plus tard `/api/membres`, `/api/evenements`). Ces mêmes handlers servent aussi en dev navigateur (`setupWorker`), ce qui permet de développer les pages admin avant que le backend NestJS ne soit prêt.

**Override d'erreur** — pour vérifier que `FamilyListPage` affiche bien son `role="alert"`, on ne touche jamais au handler par défaut : on override localement avec `server.use(http.get('/api/familles', () => new HttpResponse(null, { status: 500 })))`. Le happy path reste la source de vérité du contrat.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  test/
    setup.ts                  # listen / resetHandlers / close
    mocks/
      handlers.ts             # contrat API partagé tests + dev
      server.ts               # setupServer(...handlers) pour Node
      browser.ts              # setupWorker(...handlers) pour le dev
  features/
    family/
      FamilyListPage.tsx
      FamilyListPage.test.tsx
      AddFamilyForm.tsx
      AddFamilyForm.test.tsx
```

---

## 6. Points clés

1. MSW intercepte au **niveau réseau** : le vrai `fetch` s'exécute, seule la réponse est simulée — plus réaliste et plus stable que `vi.mock(fetch)`.
2. MSW v2 utilise `http.get`/`http.post` + `return HttpResponse.json(data, { status })` ; l'ancienne API `rest`/`res(ctx.json())` de la v1 est périmée.
3. En test (Node), on crée le serveur avec `setupServer(...handlers)` importé de `msw/node`.
4. Cycle de vie : `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(server.resetHandlers())`, `afterAll(server.close())`.
5. `server.use(handler)` override un endpoint **pour un seul test** (jusqu'au `resetHandlers`) — c'est ainsi qu'on simule un 500 ou une liste vide sans toucher au happy path.
6. Tester un composant async : loading en assertion **synchrone**, success via `await screen.findBy…`, error via `server.use()` + `findByRole('alert')`.
7. Avec TanStack Query, MSW ne change pas ; il faut juste envelopper dans `QueryClientProvider` et créer un `QueryClient` par test avec `retry: false`.

---

## 7. Seeds Anki

```
Quelle est la différence fondamentale entre MSW et vi.mock(fetch) ?|MSW intercepte la requête au niveau réseau : le vrai fetch s'exécute, seule la réponse est simulée. vi.mock(fetch) remplace la fonction fetch, qui ne s'exécute donc jamais. MSW te couple au contrat d'API, vi.mock à l'implémentation.
Comment écrit-on un handler GET qui renvoie du JSON en MSW v2 ?|import { http, HttpResponse } from 'msw'; puis http.get('/api/familles', () => HttpResponse.json(familles)). En v2, on retourne directement un HttpResponse, plus de trio (req, res, ctx).
Qu'est-ce qui a changé entre l'API MSW v1 et v2 ?|v1 : rest.get(url, (req, res, ctx) => res(ctx.json(data))). v2 : http.get(url, () => HttpResponse.json(data)). rest→http, et le retour d'un HttpResponse (standard Response) remplace res(ctx.*).
Quels sont les trois hooks du cycle de vie MSW en test et leur rôle ?|beforeAll(() => server.listen({ onUnhandledRequest: 'error' })) démarre l'interception ; afterEach(() => server.resetHandlers()) retire les overrides entre tests ; afterAll(() => server.close()) éteint le serveur.
À quoi sert server.use() dans un test précis ?|À overrider (préempter) un handler pour un seul test — par exemple forcer un 500 avec http.get('/api/familles', () => new HttpResponse(null, { status: 500 })). L'override est annulé par le resetHandlers du afterEach suivant.
Comment tester l'état loading d'un composant qui fetch ?|Faire l'assertion SYNCHRONE juste après render (ex: screen.getByRole('status')), avant tout await. L'état loading n'existe que le temps que la promesse fetch résolve ; un findBy avant le ferait disparaître.
Pourquoi importe-t-on setupServer depuis 'msw/node' et pas 'msw' ?|setupServer est l'API Node (tests) qui intercepte sans Service Worker. Le navigateur (dev) utilise setupWorker depuis 'msw/browser'. Les mêmes handlers alimentent les deux.
Que faut-il régler pour tester un composant TanStack Query avec MSW ?|L'envelopper dans un QueryClientProvider et créer un QueryClient neuf par test avec defaultOptions.queries.retry = false — sinon Query réessaie 3 fois sur erreur et le test timeoute avant d'afficher isError.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-30-tests-api-msw/README.md`. Configurer MSW v2 de zéro (handlers + server + setup) et écrire la suite de tests de `FamilyListPage` (loading, success, vide, erreur 500 via override), avec Vitest + RTL comme vrais outils.
