# Cours 30 — Tests de composants avec React Testing Library

> **Objectif** : adopter la philosophie "tester le comportement, pas l'implémentation" de React Testing Library (RTL), maîtriser les queries (`getByRole`, `getByText`, `findBy`), les interactions utilisateur avec `user-event`, et tester des composants asynchrones.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre `vi.fn()` et `vi.mock()` ?</summary>

`vi.fn()` crée une **fonction mock individuelle** (espion) qu'on peut inspecter (nombre d'appels, arguments). `vi.mock()` remplace un **module entier** par des mocks, permettant de contrôler toutes les exportations d'un fichier importé.
</details>

<details>
<summary>2. Pourquoi faut-il envelopper les mises à jour de state dans `act()` ?</summary>

`act()` garantit que toutes les mises à jour de state et les effets sont traités de manière synchrone dans le test. Sans `act()`, le state pourrait ne pas être mis à jour au moment de l'assertion, causant des tests flaky.
</details>

<details>
<summary>3. Comment tester un hook personnalisé avec Vitest ?</summary>

On utilise `renderHook` de `@testing-library/react` : `const { result } = renderHook(() => useMonHook())`. On accède au résultat via `result.current` et on wrappe les mises à jour dans `act()`.
</details>

---

## Analogie

Imagine que tu testes un **distributeur automatique de boissons**. Tu ne vérifies pas les engrenages internes (implémentation). Tu vérifies que :
1. Quand tu insères une pièce, l'écran affiche le crédit (rendu)
2. Quand tu appuies sur "Café", un café sort (interaction)
3. Si la machine est en panne, elle affiche "Hors service" (état d'erreur)

React Testing Library adopte cette philosophie : **teste ce que l'utilisateur voit et fait**, pas comment le composant fonctionne en interne.

---

## Théorie

### La philosophie RTL

> *"Plus tes tests ressemblent à la manière dont ton logiciel est utilisé, plus ils te donnent confiance."* — Kent C. Dodds

```tsx
// ❌ MAUVAIS : tester l'implémentation interne
const { container } = render(<Counter />);
const state = container.querySelector(".counter-value");
expect(state?.textContent).toBe("0");

// ✅ BON : tester le comportement visible
render(<Counter />);
expect(screen.getByText("Compteur : 0")).toBeInTheDocument();
```

### Installation

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
```

### render et screen

```tsx
import { render, screen } from "@testing-library/react";

// render monte le composant dans un DOM virtuel
render(<MyComponent />);

// screen donne accès aux queries sur le DOM
const heading = screen.getByRole("heading", { name: /bienvenue/i });
```

### Les queries : comment trouver un élément

RTL offre plusieurs types de queries, classées par priorité :

| Priorité | Query | Usage |
|---|---|---|
| 1 (meilleur) | `getByRole` | Accessible à tous (lecteurs d'écran) |
| 2 | `getByLabelText` | Champs de formulaire |
| 3 | `getByPlaceholderText` | Si pas de label |
| 4 | `getByText` | Texte visible |
| 5 | `getByDisplayValue` | Valeur actuelle d'un input |
| 6 | `getByAltText` | Images |
| 7 (dernier recours) | `getByTestId` | Quand rien d'autre ne marche |

```tsx
// ✅ Priorité 1 : getByRole (le plus accessible)
screen.getByRole("button", { name: /envoyer/i });
screen.getByRole("heading", { level: 2 });
screen.getByRole("textbox", { name: /email/i });
screen.getByRole("checkbox", { name: /accepter/i });

// ✅ Priorité 2 : getByLabelText (formulaires)
screen.getByLabelText(/adresse email/i);

// ✅ Priorité 4 : getByText (texte visible)
screen.getByText(/bienvenue sur notre site/i);

// ⚠️ Dernier recours : getByTestId
// <div data-testid="custom-element">...</div>
screen.getByTestId("custom-element");
```

### Variantes de queries

| Préfixe | Comportement | Usage |
|---|---|---|
| `getBy` | Erreur si pas trouvé | Élément présent immédiatement |
| `queryBy` | Retourne `null` si pas trouvé | Vérifier l'absence d'un élément |
| `findBy` | Attente async (Promise) | Élément qui apparaît après un chargement |
| `getAllBy` | Retourne un tableau | Plusieurs éléments |
| `queryAllBy` | Retourne `[]` si pas trouvé | Vérifier l'absence de plusieurs éléments |
| `findAllBy` | Attente async (tableau) | Plusieurs éléments après un chargement |

```tsx
// L'élément est là maintenant
const button = screen.getByRole("button");

// L'élément pourrait ne pas être là
const error = screen.queryByText(/erreur/i);
expect(error).not.toBeInTheDocument();

// L'élément apparaîtra après un chargement async
const data = await screen.findByText(/données chargées/i);
```

### User events : simuler les interactions

`@testing-library/user-event` est **préféré** à `fireEvent` car il simule le comportement réel de l'utilisateur (focus, type caractère par caractère, etc.).

```tsx
import userEvent from "@testing-library/user-event";

// Configurer user-event
const user = userEvent.setup();

// Cliquer
await user.click(screen.getByRole("button", { name: /envoyer/i }));

// Taper du texte
await user.type(screen.getByRole("textbox"), "Hello World");

// Effacer un champ
await user.clear(screen.getByRole("textbox"));

// Cocher une checkbox
await user.click(screen.getByRole("checkbox"));

// Sélectionner dans un select
await user.selectOptions(screen.getByRole("combobox"), "option2");

// Hover
await user.hover(screen.getByText("Menu"));

// Tab (navigation clavier)
await user.tab();
```

```tsx
// ❌ fireEvent : déclenche l'événement directement (pas réaliste)
import { fireEvent } from "@testing-library/react";
fireEvent.click(button);
fireEvent.change(input, { target: { value: "test" } });

// ✅ user-event : simule le comportement utilisateur réel
const user = userEvent.setup();
await user.click(button);
await user.type(input, "test"); // focus, keydown, keypress, keyup par caractère
```

### Exemple complet : tester un formulaire

```tsx
// src/components/login-form.tsx
"use client";

import { useState } from "react";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setError("");
    onSubmit(email, password);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <label>
        Mot de passe
        <input type="password" name="password" required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

```tsx
// src/components/login-form.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("affiche les champs email et mot de passe", () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
  });

  it("affiche une erreur si le mot de passe est trop court", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/mot de passe/i), "short");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /au moins 8 caractères/i
    );
  });

  it("appelle onSubmit avec les bonnes valeurs", async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/mot de passe/i), "password123");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(handleSubmit).toHaveBeenCalledWith("alice@example.com", "password123");
  });

  it("n'affiche pas d'erreur quand le formulaire est valide", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/mot de passe/i), "validpassword");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
```

### Tester des composants asynchrones

```tsx
// src/components/user-profile.tsx
"use client";

import { useEffect, useState } from "react";

interface User {
  name: string;
  email: string;
}

export function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Utilisateur non trouvé");
        return res.json();
      })
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <p>Chargement...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!user) return null;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

```tsx
// src/components/user-profile.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserProfile } from "./user-profile";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("UserProfile", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("affiche le chargement puis les données", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: "Alice", email: "alice@test.com" }),
    });

    render(<UserProfile userId={1} />);

    // D'abord le loading
    expect(screen.getByText(/chargement/i)).toBeInTheDocument();

    // Puis les données (findBy attend l'apparition)
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
  });

  it("affiche une erreur si le fetch échoue", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<UserProfile userId={999} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/non trouvé/i);
  });
});
```

### Comparaison avec Vue / Angular

| Concept | React Testing Library | Vue Test Utils | Angular TestBed |
|---|---|---|---|
| Philosophie | Tester le comportement | Tester le comportement | Tester le composant |
| Montage | `render(<Comp />)` | `mount(Comp)` | `TestBed.createComponent(Comp)` |
| Queries | `screen.getByRole(...)` | `wrapper.find(...)` | `fixture.debugElement.query(...)` |
| Interaction | `userEvent.click(...)` | `wrapper.trigger("click")` | `el.triggerEventHandler("click")` |
| Async | `findByText` / `waitFor` | `nextTick` / `flushPromises` | `fixture.whenStable()` |
| State interne | Pas d'accès (par design) | `wrapper.vm.state` | `component.property` |

> **Différence clé** : RTL ne donne volontairement **pas accès au state interne** du composant. En Vue Test Utils et Angular TestBed, tu peux inspecter les propriétés internes — ce que RTL considère comme un anti-pattern.

---

## Pratique

### Exercice : tester un composant TodoList

**Objectif** : écrire des tests complets pour un composant de liste de tâches.

1. Crée un composant `TodoList` qui :
   - Affiche une liste de tâches
   - Permet d'ajouter une tâche via un champ texte + bouton
   - Permet de cocher/décocher une tâche
   - Affiche le nombre de tâches restantes
2. Écris les tests suivants :
   - Affiche les tâches initiales
   - Ajoute une nouvelle tâche
   - N'ajoute pas de tâche vide
   - Coche une tâche et met à jour le compteur
   - Décoche une tâche

<details>
<summary>Solution</summary>

```tsx
// src/components/todo-list.tsx
"use client";

import { useState } from "react";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

interface TodoListProps {
  initialTodos?: Todo[];
}

export function TodoList({ initialTodos = [] }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [input, setInput] = useState("");

  const remaining = todos.filter((t) => !t.done).length;

  function addTodo() {
    const text = input.trim();
    if (!text) return;

    setTodos((prev) => [
      ...prev,
      { id: Date.now(), text, done: false },
    ]);
    setInput("");
  }

  function toggleTodo(id: number) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  return (
    <div>
      <h2>Ma liste de tâches</h2>
      <p>{remaining} tâche(s) restante(s)</p>

      <div>
        <label>
          Nouvelle tâche
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button onClick={addTodo}>Ajouter</button>
      </div>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              {todo.text}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

// src/components/todo-list.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoList } from "./todo-list";

const initialTodos = [
  { id: 1, text: "Apprendre React", done: false },
  { id: 2, text: "Écrire des tests", done: false },
];

describe("TodoList", () => {
  it("affiche les tâches initiales", () => {
    render(<TodoList initialTodos={initialTodos} />);

    expect(screen.getByText("Apprendre React")).toBeInTheDocument();
    expect(screen.getByText("Écrire des tests")).toBeInTheDocument();
    expect(screen.getByText("2 tâche(s) restante(s)")).toBeInTheDocument();
  });

  it("ajoute une nouvelle tâche", async () => {
    const user = userEvent.setup();
    render(<TodoList initialTodos={initialTodos} />);

    await user.type(screen.getByLabelText(/nouvelle tâche/i), "Nouvelle tâche");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect(screen.getByText("Nouvelle tâche")).toBeInTheDocument();
    expect(screen.getByText("3 tâche(s) restante(s)")).toBeInTheDocument();
  });

  it("n'ajoute pas de tâche vide", async () => {
    const user = userEvent.setup();
    render(<TodoList initialTodos={initialTodos} />);

    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect(screen.getByText("2 tâche(s) restante(s)")).toBeInTheDocument();
  });

  it("coche une tâche et met à jour le compteur", async () => {
    const user = userEvent.setup();
    render(<TodoList initialTodos={initialTodos} />);

    const checkbox = screen.getByRole("checkbox", { name: /apprendre react/i });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText("1 tâche(s) restante(s)")).toBeInTheDocument();
  });

  it("décoche une tâche", async () => {
    const user = userEvent.setup();
    render(
      <TodoList
        initialTodos={[{ id: 1, text: "Tâche faite", done: true }]}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /tâche faite/i });
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("1 tâche(s) restante(s)")).toBeInTheDocument();
  });
});
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| Philosophie RTL | Tester le comportement (ce que l'utilisateur voit/fait), pas l'implémentation |
| `getByRole` | Query prioritaire — accessible et robuste |
| `queryBy` | Retourne `null` — pour vérifier l'absence |
| `findBy` | Retourne une Promise — pour les éléments async |
| `userEvent` | Préféré à `fireEvent` — simule un utilisateur réel |
| `getByTestId` | Dernier recours quand aucune query accessible ne marche |
| Pas d'accès au state | RTL ne permet pas (volontairement) d'inspecter le state interne |

---

> **Prochain cours** : [Tests d'API avec MSW](./03-tests-api-msw.md) — mocker les appels réseau avec Mock Service Worker pour tester les composants qui fetch des données.
