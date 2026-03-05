# Cours 31 — Tests d'API avec MSW (Mock Service Worker)

> **Prérequis** : les concepts de mocking API sont acquis depuis la formation Vue. Ici on se concentre sur MSW (Mock Service Worker), l'outil standard pour mocker les API en React.

> **Objectif** : configurer MSW pour intercepter les appels réseau dans les tests, écrire des handlers réalistes, tester les composants qui fetch des données (succès, erreur, chargement), et comprendre la différence avec le mocking classique.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la query RTL à privilégier pour trouver un élément ?</summary>

`getByRole` est la query prioritaire. Elle correspond à ce qu'un utilisateur (y compris un lecteur d'écran) perçoit. Exemples : `getByRole("button", { name: /envoyer/i })`, `getByRole("heading", { level: 2 })`.
</details>

<details>
<summary>2. Quelle est la différence entre `getByText`, `queryByText` et `findByText` ?</summary>

`getByText` lance une erreur si l'élément n'est pas trouvé (pour les éléments présents immédiatement). `queryByText` retourne `null` (pour vérifier l'absence). `findByText` retourne une `Promise` qui se résout quand l'élément apparaît (pour les éléments asynchrones).
</details>

<details>
<summary>3. Pourquoi `userEvent` est-il préféré à `fireEvent` ?</summary>

`userEvent` simule le comportement réel de l'utilisateur : focus, frappe caractère par caractère, événements multiples (mousedown, mouseup, click). `fireEvent` déclenche un seul événement synthétique, ce qui est moins réaliste et peut manquer des bugs.
</details>

---

## Analogie

Imagine que tu testes un **distributeur de billets (ATM)**. Au lieu de le brancher au vrai système bancaire pour chaque test, tu branches un **simulateur de banque** qui répond exactement comme la vraie banque. C'est ce que fait MSW : il intercepte les requêtes réseau au niveau du navigateur/Node et renvoie des réponses contrôlées. Le composant ne sait même pas qu'il parle à un mock.

La différence avec `vi.mock()` sur `fetch` ? C'est comme remplacer le moteur de la voiture par un faux (mock bas niveau) vs. simuler la route devant la voiture (mock au niveau réseau). MSW est plus réaliste : le vrai `fetch` s'exécute, seul le réseau est simulé.

---

## Théorie

### Pourquoi MSW plutôt que vi.mock(fetch) ?

| Critère | `vi.mock()` / `vi.fn()` | MSW |
|---|---|---|
| Niveau | Remplace la fonction `fetch` | Intercepte au niveau réseau |
| Réalisme | Le vrai `fetch` ne s'exécute pas | Le vrai `fetch` s'exécute, la requête est interceptée |
| Headers, cookies | Pas testés | Testés (comme en production) |
| Réutilisable | Copier-coller entre tests | Handlers partagés |
| Développement | Tests uniquement | Tests + dev (mock serveur en navigateur) |
| Maintenance | Couplé à l'implémentation | Couplé à l'API (contrat) |

### Installation

```bash
npm install -D msw
```

### Configuration : handlers et serveur

```tsx
// src/test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: "Alice Dupont", email: "alice@example.com" },
  { id: 2, name: "Bob Martin", email: "bob@example.com" },
];

export const handlers = [
  // GET /api/users
  http.get("/api/users", () => {
    return HttpResponse.json(users);
  }),

  // GET /api/users/:id
  http.get("/api/users/:id", ({ params }) => {
    const user = users.find((u) => u.id === Number(params.id));

    if (!user) {
      return HttpResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return HttpResponse.json(user);
  }),

  // POST /api/users
  http.post("/api/users", async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };

    const newUser: User = {
      id: Date.now(),
      name: body.name,
      email: body.email,
    };

    return HttpResponse.json(newUser, { status: 201 });
  }),

  // DELETE /api/users/:id
  http.delete("/api/users/:id", ({ params }) => {
    return HttpResponse.json(
      { message: `Utilisateur ${params.id} supprimé` },
      { status: 200 }
    );
  }),
];
```

```tsx
// src/test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```tsx
// src/test/setup.ts (mettre à jour le fichier existant)
import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";
import { beforeAll, afterEach, afterAll } from "vitest";

// Démarrer le serveur MSW avant tous les tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Réinitialiser les handlers après chaque test
afterEach(() => server.resetHandlers());

// Fermer le serveur après tous les tests
afterAll(() => server.close());
```

> **`onUnhandledRequest: "error"`** : force une erreur si un test fait un fetch vers une URL non gérée. Cela évite les appels réseau accidentels.

### Tester un composant qui fetch des données

```tsx
// src/components/user-list.tsx
"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("Erreur serveur");
        return res.json();
      })
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p role="status">Chargement des utilisateurs...</p>;
  if (error) return <p role="alert">Erreur : {error}</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} — {user.email}
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// src/components/user-list.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { UserList } from "./user-list";

describe("UserList", () => {
  it("affiche le loading puis la liste des utilisateurs", async () => {
    render(<UserList />);

    // D'abord le loading
    expect(screen.getByRole("status")).toHaveTextContent(/chargement/i);

    // Puis les utilisateurs (les handlers de src/test/mocks/handlers.ts répondent)
    expect(await screen.findByText(/alice dupont/i)).toBeInTheDocument();
    expect(screen.getByText(/bob martin/i)).toBeInTheDocument();
  });

  it("affiche une erreur quand l'API échoue", async () => {
    // Override le handler pour ce test uniquement
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    render(<UserList />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/erreur/i);
  });

  it("affiche une liste vide quand il n'y a pas d'utilisateurs", async () => {
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.json([]);
      })
    );

    render(<UserList />);

    // Attend que le loading disparaisse
    await screen.findByRole("list");

    // La liste est vide
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
```

### Tester les états d'erreur en détail

```tsx
// Simuler un timeout réseau
server.use(
  http.get("/api/users", () => {
    return HttpResponse.error(); // Erreur réseau (comme un timeout)
  })
);

// Simuler un délai
server.use(
  http.get("/api/users", async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return HttpResponse.json([]);
  })
);

// Simuler différents codes d'erreur
server.use(
  http.get("/api/users", () => {
    return HttpResponse.json(
      { error: "Non autorisé" },
      { status: 401 }
    );
  })
);
```

### Tester les mutations (POST, PUT, DELETE)

```tsx
// src/components/add-user-form.tsx
"use client";

import { useState } from "react";

interface AddUserFormProps {
  onUserAdded: () => void;
}

export function AddUserForm({ onUserAdded }: AddUserFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la création");

      setStatus("success");
      onUserAdded();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Nom
        <input type="text" name="name" required />
      </label>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Création..." : "Créer"}
      </button>
      {status === "success" && <p role="status">Utilisateur créé !</p>}
      {status === "error" && <p role="alert">Erreur lors de la création</p>}
    </form>
  );
}
```

```tsx
// src/components/add-user-form.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { AddUserForm } from "./add-user-form";

describe("AddUserForm", () => {
  it("crée un utilisateur avec succès", async () => {
    const onUserAdded = vi.fn();
    const user = userEvent.setup();

    render(<AddUserForm onUserAdded={onUserAdded} />);

    await user.type(screen.getByLabelText(/nom/i), "Charlie");
    await user.type(screen.getByLabelText(/email/i), "charlie@test.com");
    await user.click(screen.getByRole("button", { name: /créer/i }));

    expect(await screen.findByText(/utilisateur créé/i)).toBeInTheDocument();
    expect(onUserAdded).toHaveBeenCalledOnce();
  });

  it("affiche une erreur si la création échoue", async () => {
    server.use(
      http.post("/api/users", () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const user = userEvent.setup();
    render(<AddUserForm onUserAdded={vi.fn()} />);

    await user.type(screen.getByLabelText(/nom/i), "Charlie");
    await user.type(screen.getByLabelText(/email/i), "charlie@test.com");
    await user.click(screen.getByRole("button", { name: /créer/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/erreur/i);
  });
});
```

### Comparaison avec Angular et Vue

| Concept | MSW (React) | Angular `HttpTestingController` | Vue + MSW |
|---|---|---|---|
| Niveau d'interception | Réseau (Service Worker / Node) | HttpClient interne | Réseau (même MSW) |
| Setup | `setupServer(handlers)` | `TestBed` + `HttpClientTestingModule` | `setupServer(handlers)` |
| Matcher | `http.get("/url")` | `httpMock.expectOne("/url")` | `http.get("/url")` |
| Réponse | `HttpResponse.json(data)` | `req.flush(data)` | `HttpResponse.json(data)` |
| Réutilisable | Handlers partagés | Par test | Handlers partagés |
| Dev mode | Oui (navigateur) | Non | Oui (navigateur) |

> **Point fort de MSW** : les mêmes handlers fonctionnent en tests (Node) ET en développement (navigateur). Tu peux développer ton frontend sans backend, puis réutiliser les mocks pour les tests.

---

## Pratique

### Exercice : tester un composant de recherche avec MSW

**Objectif** : créer un composant de recherche d'articles et le tester avec MSW.

1. Crée un composant `ArticleSearch` qui :
   - Affiche un champ de recherche
   - Fetch `/api/articles?q={query}` à la soumission
   - Affiche les résultats ou un message "Aucun résultat"
   - Gère le loading et les erreurs
2. Crée les handlers MSW pour `/api/articles`
3. Écris les tests :
   - Affiche les résultats de recherche
   - Affiche "Aucun résultat" quand la recherche ne retourne rien
   - Affiche une erreur quand l'API échoue
   - Affiche le loading pendant la recherche

<details>
<summary>Solution</summary>

```tsx
// src/test/mocks/handlers.ts (ajouter aux handlers existants)
import { http, HttpResponse } from "msw";

const articles = [
  { id: 1, title: "Introduction à React", summary: "Les bases de React." },
  { id: 2, title: "React Hooks en détail", summary: "useState, useEffect..." },
  { id: 3, title: "Next.js App Router", summary: "Le routing moderne." },
];

// Ajouter ce handler :
http.get("/api/articles", ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.toLowerCase() ?? "";

  const results = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query)
  );

  return HttpResponse.json(results);
});

// src/components/article-search.tsx
"use client";

import { useState } from "react";

interface Article {
  id: number;
  title: string;
  summary: string;
}

export function ArticleSearch() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch(`/api/articles?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Erreur de recherche");
      const data: Article[] = await res.json();
      setArticles(data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch}>
        <label>
          Rechercher un article
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="submit">Rechercher</button>
      </form>

      {status === "loading" && <p role="status">Recherche en cours...</p>}
      {status === "error" && <p role="alert">Erreur lors de la recherche</p>}
      {status === "done" && articles.length === 0 && (
        <p>Aucun résultat pour "{query}"</p>
      )}
      {articles.length > 0 && (
        <ul>
          {articles.map((article) => (
            <li key={article.id}>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// src/components/article-search.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { ArticleSearch } from "./article-search";

describe("ArticleSearch", () => {
  it("affiche les résultats de recherche", async () => {
    const user = userEvent.setup();
    render(<ArticleSearch />);

    await user.type(screen.getByLabelText(/rechercher/i), "React");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(await screen.findByText("Introduction à React")).toBeInTheDocument();
    expect(screen.getByText("React Hooks en détail")).toBeInTheDocument();
  });

  it("affiche 'Aucun résultat' quand rien ne correspond", async () => {
    const user = userEvent.setup();
    render(<ArticleSearch />);

    await user.type(screen.getByLabelText(/rechercher/i), "xyz-introuvable");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(await screen.findByText(/aucun résultat/i)).toBeInTheDocument();
  });

  it("affiche une erreur quand l'API échoue", async () => {
    server.use(
      http.get("/api/articles", () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const user = userEvent.setup();
    render(<ArticleSearch />);

    await user.type(screen.getByLabelText(/rechercher/i), "test");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/erreur/i);
  });

  it("affiche le loading pendant la recherche", async () => {
    const user = userEvent.setup();
    render(<ArticleSearch />);

    await user.type(screen.getByLabelText(/rechercher/i), "React");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/recherche en cours/i);
    await screen.findByText("Introduction à React");
  });
});
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| MSW | Intercepte les requêtes au niveau réseau — plus réaliste que `vi.mock(fetch)` |
| `setupServer` | Crée un serveur mock pour Node (tests) |
| `handlers` | Définissent les réponses pour chaque endpoint (`http.get`, `http.post`...) |
| `server.use()` | Override un handler pour un test spécifique |
| `server.resetHandlers()` | Réinitialise après chaque test (dans `afterEach`) |
| `onUnhandledRequest: "error"` | Détecte les appels réseau non mockés |
| `HttpResponse.json()` | Retourne une réponse JSON avec status |
| `HttpResponse.error()` | Simule une erreur réseau |

---

> **Prochain cours** : [Performance React](../08-performance-patterns/01-performance-react.md) — mesurer et optimiser les performances de tes composants React.
