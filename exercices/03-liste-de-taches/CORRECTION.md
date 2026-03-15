# Correction — Exercice 03 : Liste de taches

## Résultat attendu

Une page avec un champ de saisie, un bouton "Ajouter", une liste de taches interactives (checkbox, texte, bouton supprimer) et un compteur des taches restantes. Le message "Aucune tache pour le moment" s'affiche quand la liste est vide.

---

## Code corrige

### `src/exercises/ex03/TodoList.tsx`

```tsx
import { useState } from "react";

// --- Types exportes ---
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Composant TodoList
 * Gere une liste de taches avec ajout, bascule et suppression.
 */
export default function TodoList() {
  // --- Etats ---
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState<string>("");

  // --- Valeur derivee : nombre de taches restantes ---
  const remainingCount = todos.filter((todo) => !todo.completed).length;

  // --- Handlers ---

  /** Ajouter une tache */
  const addTodo = () => {
    const trimmed = inputValue.trim();
    if (trimmed === "") return; // empecher l'ajout de taches vides

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
    };

    // Immutabilite : on cree un nouveau tableau
    setTodos((prev) => [...prev, newTodo]);
    setInputValue(""); // vider le champ
  };

  /** Gerer la soumission via Enter */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  /** Basculer le statut d'une tache */
  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  /** Supprimer une tache */
  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <div className="todo-list">
      {/* Formulaire d'ajout */}
      <div className="todo-list__form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nouvelle tache..."
          aria-label="Nouvelle tache"
        />
        <button onClick={addTodo} type="button">
          Ajouter
        </button>
      </div>

      {/* Rendu conditionnel : liste ou message vide */}
      {todos.length === 0 ? (
        <p className="todo-list__empty">Aucune tache pour le moment</p>
      ) : (
        <ul className="todo-list__items">
          {/* .map() avec key unique */}
          {todos.map((todo) => (
            <li key={todo.id} className="todo-list__item">
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span
                  style={{
                    textDecoration: todo.completed ? "line-through" : "none",
                    opacity: todo.completed ? 0.5 : 1,
                  }}
                >
                  {todo.text}
                </span>
              </label>
              <button
                onClick={() => deleteTodo(todo.id)}
                type="button"
                aria-label={`Supprimer ${todo.text}`}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Compteur des taches restantes */}
      {todos.length > 0 && (
        <p className="todo-list__count">
          {remainingCount} tache{remainingCount > 1 ? "s" : ""} restante
          {remainingCount > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
```

### `src/exercises/ex03/App.tsx`

```tsx
import TodoList from "./TodoList";

/**
 * Composant racine de l'exercice 03.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 03 — Liste de taches</h1>
      <TodoList />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Muter le tableau au lieu de créer un nouveau

- ❌ `todos.push(newTodo); setTodos(todos);`
  React ne détecté pas le changement car la référence du tableau n'a pas change.
- ✅ `setTodos((prev) => [...prev, newTodo]);`
  Nouveau tableau = nouvelle référence = React re-rend le composant.

### 2. Utiliser l'index comme `key`

- ❌ `{todos.map((todo, index) => <li key={index}>...)}`
  Si on supprime un élément au milieu, les index se decalent et React perd le suivi des éléments.
- ✅ `{todos.map((todo) => <li key={todo.id}>...)}`
  L'id est unique et stable, React sait exactement quel élément a change.

### 3. Oublier le `.trim()` avant l'ajout

- ❌ `if (inputValue === "") return;`
  Un espace seul passe le test et créé une tache "invisible".
- ✅ `const trimmed = inputValue.trim(); if (trimmed === "") return;`
  Les espaces en debut et fin sont nettoyes.

### 4. Oublier le rendu conditionnel pour la liste vide

- ❌ Afficher un `<ul>` vide quand il n'y a pas de taches.
  L'utilisateur ne sait pas quoi faire, pas de feedback visuel.
- ✅ Afficher un message explicite "Aucune tache pour le moment".

### 5. Ne pas vider le champ après l'ajout

- ❌ Oublier `setInputValue("")` après l'ajout.
  L'utilisateur doit effacer manuellement, mauvaise UX.
- ✅ `setInputValue("")` juste après `setTodos(...)`.

---

## Concepts clés utilises

| Concept                 | Description                                                         | Documentation                              |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `useState<T[]>`         | Gestion d'un tableau dans l'état local                              | [react.dev](https://react.dev/reference/react/useState) |
| Immutabilite            | Créer de nouvelles références au lieu de muter                      | [react.dev](https://react.dev/learn/updating-arrays-in-state) |
| `.map()` avec `key`     | Transformer un tableau en éléments JSX avec identification unique   | [react.dev](https://react.dev/learn/rendering-lists) |
| `.filter()`             | Créer un nouveau tableau sans l'élément cible (suppression)         | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) |
| Rendu conditionnel      | Afficher du contenu différent selon une condition                    | [react.dev](https://react.dev/learn/conditional-rendering) |
| `crypto.randomUUID()`   | Générer un identifiant unique cote navigateur                       | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) |
| Valeur derivee          | `remainingCount` calcule depuis `todos` sans état supplementaire    | Bonne pratique React |

---

## Pour aller plus loin

- Ajoute les filtres "Toutes / Actives / Completees" avec un état `filter`.
- Persiste les taches dans `localStorage` et restaure-les au chargement.
- Ajoute du drag & drop pour reordonner les taches.
