# Correction — Exercice 18 : Tests integration MSW

---

## Etape 1 : Types

```ts
// src/types/task.ts
export interface Task {
  id: string;
  title: string;
  completed: boolean;
}
```

---

## Etape 2 : Composant TaskFetcher

```tsx
// src/components/TaskFetcher.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/types/task";

// Etats possibles du composant
interface FetchState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

export function TaskFetcher() {
  const [state, setState] = useState<FetchState>({
    tasks: [],
    loading: true,
    error: null,
  });

  const fetchTasks = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/tasks");

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const data: Task[] = await response.json();
      setState({ tasks: data, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setState({ tasks: [], loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Etat : chargement
  if (state.loading) {
    return <p>Chargement...</p>;
  }

  // Etat : erreur
  if (state.error) {
    return (
      <div role="alert">
        <p style={{ color: "red" }}>Erreur : {state.error}</p>
        <button type="button" onClick={() => void fetchTasks()}>
          Reessayer
        </button>
      </div>
    );
  }

  // Etat : liste vide
  if (state.tasks.length === 0) {
    return <p>Aucune tache</p>;
  }

  // Etat : succes
  return (
    <div>
      <h2>Taches ({state.tasks.length})</h2>
      <ul role="list">
        {state.tasks.map((task) => (
          <li key={task.id}>
            <span
              style={{
                textDecoration: task.completed ? "line-through" : "none",
              }}
            >
              {task.title}
            </span>
            {task.completed && (
              <span style={{ marginLeft: "0.5rem", color: "green" }}>
                (terminee)
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Etape 3 : Configuration MSW

```ts
// src/test/mocks/handlers.ts
import { http, HttpResponse } from "msw";
import type { Task } from "@/types/task";

// Donnees de test par defaut
const mockTasks: Task[] = [
  { id: "1", title: "Apprendre React Testing Library", completed: false },
  { id: "2", title: "Configurer MSW", completed: true },
  { id: "3", title: "Ecrire des tests d'integration", completed: false },
];

export const handlers = [
  // GET /api/tasks — retourne la liste des taches
  http.get("/api/tasks", () => {
    return HttpResponse.json(mockTasks);
  }),
];
```

```ts
// src/test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Creer le serveur MSW pour les tests Node.js
export const server = setupServer(...handlers);
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";
import { beforeAll, afterEach, afterAll } from "vitest";

// Demarrer le serveur MSW avant tous les tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reinitialiser les handlers apres chaque test
afterEach(() => server.resetHandlers());

// Arreter le serveur apres tous les tests
afterAll(() => server.close());
```

---

## Etape 4 : Tests d'integration

```tsx
// src/components/__tests__/TaskFetcher.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { TaskFetcher } from "../TaskFetcher";

describe("TaskFetcher", () => {
  // Test 1 : Etat de chargement
  it("affiche 'Chargement...' au rendu initial", () => {
    render(<TaskFetcher />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  // Test 2 : Succes — affiche les taches
  it("affiche la liste des taches apres un fetch reussi", async () => {
    render(<TaskFetcher />);

    // Attendre que le chargement se termine
    await waitFor(() => {
      expect(screen.queryByText("Chargement...")).not.toBeInTheDocument();
    });

    // Verifier que les taches sont affichees
    expect(
      screen.getByText("Apprendre React Testing Library")
    ).toBeInTheDocument();
    expect(screen.getByText("Configurer MSW")).toBeInTheDocument();
    expect(
      screen.getByText("Ecrire des tests d'integration")
    ).toBeInTheDocument();

    // Verifier le compteur
    expect(screen.getByText("Taches (3)")).toBeInTheDocument();
  });

  // Test 3 : Erreur serveur 500
  it("affiche un message d'erreur si le serveur retourne 500", async () => {
    // Surcharger le handler pour ce test uniquement
    server.use(
      http.get("/api/tasks", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<TaskFetcher />);

    // Attendre le message d'erreur
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Erreur.*serveur.*500/i)
    ).toBeInTheDocument();

    // Verifier la presence du bouton Reessayer
    expect(
      screen.getByRole("button", { name: "Reessayer" })
    ).toBeInTheDocument();
  });

  // Test 4 : Bouton Reessayer
  it("relance le fetch quand on clique 'Reessayer'", async () => {
    const user = userEvent.setup();
    let callCount = 0;

    // Premier appel : erreur, deuxieme appel : succes
    server.use(
      http.get("/api/tasks", () => {
        callCount++;
        if (callCount === 1) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json([
          { id: "1", title: "Tache recuperee", completed: false },
        ]);
      })
    );

    render(<TaskFetcher />);

    // Attendre l'erreur
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Cliquer sur Reessayer
    const retryButton = screen.getByRole("button", { name: "Reessayer" });
    await user.click(retryButton);

    // Attendre le succes
    await waitFor(() => {
      expect(screen.getByText("Tache recuperee")).toBeInTheDocument();
    });

    // Verifier que l'erreur a disparu
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Test 5 : Tableau vide
  it("affiche 'Aucune tache' si le serveur retourne un tableau vide", async () => {
    // Surcharger le handler pour retourner un tableau vide
    server.use(
      http.get("/api/tasks", () => {
        return HttpResponse.json([]);
      })
    );

    render(<TaskFetcher />);

    // Attendre la fin du chargement
    await waitFor(() => {
      expect(screen.queryByText("Chargement...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Aucune tache")).toBeInTheDocument();
  });

  // Test 6 : Les taches completees ont un style barre
  it("affiche les taches completees avec un style barre", async () => {
    render(<TaskFetcher />);

    await waitFor(() => {
      expect(screen.getByText("Configurer MSW")).toBeInTheDocument();
    });

    // "Configurer MSW" est completee
    expect(screen.getByText("Configurer MSW")).toHaveStyle(
      "text-decoration: line-through"
    );

    // "Apprendre React Testing Library" n'est pas completee
    expect(
      screen.getByText("Apprendre React Testing Library")
    ).toHaveStyle("text-decoration: none");
  });
});
```

---

## Ce que tu aurais pu oublier

1. **`server.use()` pour surcharger un handler** : cette methode permet de remplacer temporairement un handler pour un test specifique. `server.resetHandlers()` dans `afterEach` restaure les handlers par defaut.

2. **`onUnhandledRequest: "error"`** : cette option fait echouer le test si une requete non interceptee est effectuee. Cela evite les faux positifs.

3. **MSW v2 utilise `http` et `HttpResponse`** : l'ancienne API (`rest.get`) est depreciee. La nouvelle API est `http.get()` et `HttpResponse.json()`.

4. **`waitFor` est necessaire pour les assertions asynchrones** : le fetch est asynchrone, donc le DOM n'est pas mis a jour immediatement. `waitFor` repete l'assertion jusqu'a ce qu'elle passe (ou timeout).

5. **Les handlers sont definis avec des chemins relatifs** : MSW intercepte les requetes par chemin, pas par URL complete. `/api/tasks` matchera `http://localhost/api/tasks`.

6. **`role="alert"` pour l'accessibilite** : en mettant `role="alert"` sur le conteneur d'erreur, les lecteurs d'ecran annoncent automatiquement le contenu.

7. **Le setup doit etre dans `vitest.config.ts`** : la propriete `setupFiles` doit pointer vers le fichier qui demarre le serveur MSW.

8. **Ne pas oublier `void fetchTasks()`** : comme `fetchTasks` retourne une Promise et que `useEffect` attend `void`, il faut explicitement ignorer le retour avec `void`.
