# Correction — Exercice 17 : Tests composants

---

## Etape 1 : Configuration Vitest

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true, // describe, it, expect sans import
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

---

## Etape 2 : Types

```ts
// src/types/task.ts
export interface Task {
  id: string;
  title: string;
  completed: boolean;
}
```

---

## Etape 3 : Composant TaskList

```tsx
// src/components/TaskList.tsx
"use client";

import { useState } from "react";
import type { Task } from "@/types/task";

interface TaskListProps {
  initialTasks?: Task[];
}

export function TaskList({ initialTasks = [] }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");

  const remainingCount = tasks.filter((t) => !t.completed).length;

  function handleAddTask(): void {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      completed: false,
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle("");
  }

  function handleToggleTask(id: string): void {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function handleDeleteTask(id: string): void {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      handleAddTask();
    }
  }

  return (
    <div>
      <h2>Liste de taches</h2>

      {/* Formulaire d'ajout */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nouvelle tache..."
          aria-label="Nouvelle tache"
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <button
          type="button"
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim()}
        >
          Ajouter
        </button>
      </div>

      {/* Compteur */}
      <p>
        {remainingCount} tache{remainingCount !== 1 ? "s" : ""} restante
        {remainingCount !== 1 ? "s" : ""}
      </p>

      {/* Liste ou etat vide */}
      {tasks.length === 0 ? (
        <p>Aucune tache</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }} role="list">
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                borderBottom: "1px solid #eee",
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                aria-label={`Marquer "${task.title}" comme ${
                  task.completed ? "non terminee" : "terminee"
                }`}
              />
              <span
                style={{
                  flex: 1,
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteTask(task.id)}
                aria-label={`Supprimer "${task.title}"`}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Etape 4 : Tests complets

```tsx
// src/components/__tests__/TaskList.test.tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { TaskList } from "../TaskList";
import type { Task } from "@/types/task";

describe("TaskList", () => {
  // Test 1 : Etat vide
  it("affiche 'Aucune tache' quand la liste est vide", () => {
    render(<TaskList />);

    expect(screen.getByText("Aucune tache")).toBeInTheDocument();
    expect(screen.getByText("0 taches restantes")).toBeInTheDocument();
  });

  // Test 2 : Ajout d'une tache
  it("ajoute une tache quand on saisit un texte et clique 'Ajouter'", async () => {
    const user = userEvent.setup();
    render(<TaskList />);

    const input = screen.getByLabelText("Nouvelle tache");
    const addButton = screen.getByRole("button", { name: "Ajouter" });

    // Saisir le texte
    await user.type(input, "Acheter du pain");
    await user.click(addButton);

    // Verifier que la tache apparait
    expect(screen.getByText("Acheter du pain")).toBeInTheDocument();
    // Verifier que l'input est vide
    expect(input).toHaveValue("");
    // Verifier que "Aucune tache" a disparu
    expect(screen.queryByText("Aucune tache")).not.toBeInTheDocument();
  });

  // Test 3 : Compteur de taches restantes
  it("met a jour le compteur apres ajout de plusieurs taches", async () => {
    const user = userEvent.setup();
    render(<TaskList />);

    const input = screen.getByLabelText("Nouvelle tache");
    const addButton = screen.getByRole("button", { name: "Ajouter" });

    // Ajouter 3 taches
    await user.type(input, "Tache 1");
    await user.click(addButton);
    await user.type(input, "Tache 2");
    await user.click(addButton);
    await user.type(input, "Tache 3");
    await user.click(addButton);

    expect(screen.getByText("3 taches restantes")).toBeInTheDocument();
  });

  // Test 4 : Toggle d'une tache
  it("coche et barre une tache quand on clique la checkbox", async () => {
    const user = userEvent.setup();
    const initialTasks: Task[] = [
      { id: "1", title: "Tache existante", completed: false },
    ];

    render(<TaskList initialTasks={initialTasks} />);

    // Verifier l'etat initial
    expect(screen.getByText("1 tache restante")).toBeInTheDocument();

    // Cocher la checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: /Marquer "Tache existante"/,
    });
    await user.click(checkbox);

    // Verifier que la checkbox est cochee
    expect(checkbox).toBeChecked();
    // Verifier le style barre
    expect(screen.getByText("Tache existante")).toHaveStyle(
      "text-decoration: line-through"
    );
    // Verifier le compteur mis a jour
    expect(screen.getByText("0 taches restantes")).toBeInTheDocument();
  });

  // Test 5 : Suppression d'une tache
  it("supprime une tache quand on clique 'Supprimer'", async () => {
    const user = userEvent.setup();
    const initialTasks: Task[] = [
      { id: "1", title: "Tache a supprimer", completed: false },
      { id: "2", title: "Tache a garder", completed: false },
    ];

    render(<TaskList initialTasks={initialTasks} />);

    // Verifier que les 2 taches sont presentes
    expect(screen.getByText("Tache a supprimer")).toBeInTheDocument();
    expect(screen.getByText("Tache a garder")).toBeInTheDocument();

    // Supprimer la premiere tache
    const deleteButton = screen.getByRole("button", {
      name: /Supprimer "Tache a supprimer"/,
    });
    await user.click(deleteButton);

    // Verifier que la tache a disparu
    expect(screen.queryByText("Tache a supprimer")).not.toBeInTheDocument();
    // L'autre tache est toujours la
    expect(screen.getByText("Tache a garder")).toBeInTheDocument();
  });

  // Test 6 : Tache vide interdite
  it("ne permet pas d'ajouter une tache vide", async () => {
    const user = userEvent.setup();
    render(<TaskList />);

    const addButton = screen.getByRole("button", { name: "Ajouter" });

    // Le bouton est desactive quand l'input est vide
    expect(addButton).toBeDisabled();

    // Saisir des espaces uniquement
    const input = screen.getByLabelText("Nouvelle tache");
    await user.type(input, "   ");

    // Le bouton reste desactive (trim)
    expect(addButton).toBeDisabled();

    // Verifier qu'aucune tache n'est ajoutee
    expect(screen.getByText("Aucune tache")).toBeInTheDocument();
  });

  // Test 7 : Accessibilite
  it("utilise les bons roles ARIA", () => {
    const initialTasks: Task[] = [
      { id: "1", title: "Tache accessible", completed: false },
    ];

    render(<TaskList initialTasks={initialTasks} />);

    // Verifier la presence d'une liste
    expect(screen.getByRole("list")).toBeInTheDocument();

    // Verifier les checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(1);

    // Verifier les boutons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2); // Ajouter + Supprimer
  });

  // Test 8 : Ajout avec la touche Entree
  it("ajoute une tache en appuyant sur Entree", async () => {
    const user = userEvent.setup();
    render(<TaskList />);

    const input = screen.getByLabelText("Nouvelle tache");

    await user.type(input, "Tache via Entree{Enter}");

    expect(screen.getByText("Tache via Entree")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  // Test 9 : Rendu avec taches initiales
  it("affiche les taches initiales fournies en props", () => {
    const initialTasks: Task[] = [
      { id: "1", title: "Premiere", completed: false },
      { id: "2", title: "Deuxieme", completed: true },
    ];

    render(<TaskList initialTasks={initialTasks} />);

    expect(screen.getByText("Premiere")).toBeInTheDocument();
    expect(screen.getByText("Deuxieme")).toBeInTheDocument();
    expect(screen.getByText("1 tache restante")).toBeInTheDocument();
  });
});
```

---

## Ce que tu aurais pu oublier

1. **`userEvent.setup()` avant chaque test** : il faut appeler `userEvent.setup()` au debut du test, pas globalement. Cela cree une instance avec un etat propre.

2. **`screen.queryByText` pour verifier l'absence** : `getByText` leve une erreur si l'element n'est pas trouve. Utiliser `queryByText` qui retourne `null` si absent.

3. **Selecteurs accessibles** : privilegier `getByRole`, `getByLabelText`, `getByText` plutot que `getByTestId`. C'est la philosophie de Testing Library : tester comme un utilisateur.

4. **`aria-label` sur les boutons de suppression** : sans label unique, impossible de distinguer les boutons "Supprimer" de chaque tache. Le pattern `aria-label={`Supprimer "${title}"`}` resout ce probleme.

5. **`toBeInTheDocument()`** vient de `@testing-library/jest-dom` — il faut l'importer dans le setup (`import "@testing-library/jest-dom/vitest"`).

6. **`{Enter}` dans `userEvent.type`** : la syntaxe `{Enter}` simule l'appui sur la touche Entree directement dans la chaine.

7. **Les tests doivent etre independants** : chaque test cree sa propre instance avec `render()`. Pas d'etat partage entre les tests.

8. **`crypto.randomUUID()`** : dans `jsdom`, cette API est disponible. Si elle ne l'est pas dans ton environnement, tu peux utiliser un polyfill ou un compteur simple.
