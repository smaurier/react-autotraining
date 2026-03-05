# Correction — Exercice 02 : Compteur hooks

## Resultat attendu

Une page affichant un compteur avec sa valeur, son double, un indicateur pair/impair et trois boutons (incrementer, decrementer, reset). Toutes les valeurs derivees se mettent a jour automatiquement a chaque changement.

---

## Code corrige

### `src/exercises/ex02/Counter.tsx`

```tsx
import { useState } from "react";

/**
 * Composant Counter
 * Gere un compteur avec des valeurs derivees et trois actions.
 */
export default function Counter() {
  // --- Etat principal : la seule source de verite ---
  const [count, setCount] = useState<number>(0);

  // --- Valeurs derivees (calculees a chaque render, pas d'etat supplementaire) ---
  const double = count * 2;
  const isEven = count % 2 === 0;

  // --- Handlers d'evenements ---
  const increment = () => {
    setCount((prev) => prev + 1);
  };

  const decrement = () => {
    setCount((prev) => prev - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="counter">
      {/* Affichage de la valeur courante */}
      <div className="counter__display">
        <span className="counter__label">Compteur :</span>
        <span className="counter__value">{count}</span>
      </div>

      {/* Affichage du double */}
      <div className="counter__info">
        <span>Double : </span>
        <span className="counter__double">{double}</span>
      </div>

      {/* Indicateur pair/impair */}
      <div className="counter__info">
        <span>Parite : </span>
        <span className={isEven ? "counter__even" : "counter__odd"}>
          {isEven ? "Pair" : "Impair"}
        </span>
      </div>

      {/* Boutons d'action */}
      <div className="counter__actions">
        <button onClick={decrement} type="button">
          -1
        </button>
        <button onClick={reset} type="button">
          Reset
        </button>
        <button onClick={increment} type="button">
          +1
        </button>
      </div>
    </div>
  );
}
```

### `src/exercises/ex02/App.tsx`

```tsx
import Counter from "./Counter";

/**
 * Composant racine de l'exercice 02.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 02 — Compteur hooks</h1>
      <Counter />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Creer un `useState` pour `double` ou `isEven`

- ❌ `const [double, setDouble] = useState(0);` avec un `useEffect` pour le synchroniser.
  C'est de l'etat duplique : `double` depend a 100 % de `count`, pas besoin d'un etat propre.
- ✅ `const double = count * 2;`
  Valeur derivee calculee a chaque render. Simple, performant, sans risque de desynchronisation.

### 2. Ne pas utiliser la forme fonctionnelle du setter

- ❌ `setCount(count + 1);`
  Si deux appels se suivent dans le meme cycle, le second ecrase le premier car `count` a la meme valeur.
- ✅ `setCount((prev) => prev + 1);`
  Chaque appel part de la valeur la plus recente, meme en cas de batching.

### 3. Oublier `type="button"` sur les boutons

- ❌ `<button onClick={increment}>+1</button>`
  Dans un formulaire, le comportement par defaut est `submit`.
- ✅ `<button onClick={increment} type="button">+1</button>`
  Comportement explicite et sans surprise.

### 4. Utiliser `let` au lieu de `const` pour les valeurs derivees

- ❌ `let double = count * 2;`
  `let` implique que la variable pourrait etre reassignee, ce qui est trompeur.
- ✅ `const double = count * 2;`
  `const` signale clairement que cette valeur n'est jamais modifiee apres sa creation.

### 5. Inline handlers trop complexes

- ❌ `<button onClick={() => { setCount((prev) => prev + 1); console.log("incremented"); }}>`
  Difficile a lire et a tester.
- ✅ Extraire dans une fonction nommee `increment` pour la lisibilite et la reutilisabilite.

---

## Concepts cles utilises

| Concept              | Description                                                          | Documentation                              |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `useState`           | Hook pour gerer un etat local reactif                                | [react.dev](https://react.dev/reference/react/useState) |
| Valeur derivee       | Variable calculee a partir de l'etat, sans etat supplementaire       | Bonne pratique React |
| Setter fonctionnel   | `setCount((prev) => prev + 1)` garantit la valeur la plus recente   | [react.dev](https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state) |
| Handler d'evenement  | Fonction appelee en reponse a une interaction utilisateur             | [react.dev](https://react.dev/learn/responding-to-events) |
| Re-render            | React re-execute le composant quand l'etat change                    | [react.dev](https://react.dev/learn/render-and-commit) |

---

## Pour aller plus loin

- Ajoute un `useEffect` qui log la valeur du compteur dans la console a chaque changement.
- Ajoute des tests unitaires avec Vitest : verifier que le compteur s'incremente, se decremente et se reset correctement.
- Essaie de passer `min` et `max` en props pour borner le compteur.
