# Cours 9 — useState

> **Objectif** : Maîtriser `useState` avec TypeScript strict — initialisation, updater function, gestion immutable des objets et tableaux, batching, et comprendre les différences avec `ref()` en Vue et `signal()` en Angular.

---

<details>
<summary>Rappel du cours précédent</summary>

1. **Quelle est la différence entre un input contrôlé et non-contrôlé ?**
   Un input contrôlé a sa valeur pilotée par le state React (`value` + `onChange`). Un input non-contrôlé conserve son état dans le DOM, accessible via `useRef` et `defaultValue`.

2. **Pourquoi faut-il appeler `e.preventDefault()` dans un `onSubmit` ?**
   Sans `preventDefault()`, le navigateur effectue une requête HTTP classique et recharge la page, ce qui détruit l'état de l'application React.

3. **Quel type TypeScript utilise-t-on pour un événement `onChange` sur un `<input>` ?**
   `React.ChangeEvent<HTMLInputElement>`. Pour un `<select>`, ce serait `React.ChangeEvent<HTMLSelectElement>`.

</details>

---

## Analogie

`useState` est comme un **tableau blanc personnel** dans un bureau. Chaque fois que vous y écrivez une nouvelle information (via le setter), un photographe prend une photo du tableau (re-render) et l'affiche sur l'écran. Vous ne pouvez pas gommer et réécrire sur le même tableau — vous devez prendre un **nouveau tableau** avec les modifications (immutabilité).

---

## Théorie

### 1. Syntaxe de base

```tsx
import { useState } from "react";

function Counter() {
  // Déclaration : [valeurActuelle, fonctionDeMiseAJour]
  const [count, setCount] = useState(0);
  //     ^             ^                    ^
  //     état       setter          valeur initiale

  return (
    <div>
      <p>Compteur : {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

### 2. Typage explicite avec `useState<T>()`

TypeScript peut souvent inférer le type, mais parfois vous devez être explicite :

```tsx
// ✅ Inférence automatique — TS déduit `number`
const [count, setCount] = useState(0);

// ✅ Inférence automatique — TS déduit `string`
const [name, setName] = useState("");

// ✅ Type explicite nécessaire — la valeur initiale est `null`
const [user, setUser] = useState<User | null>(null);

// ✅ Type explicite pour un tableau vide
const [items, setItems] = useState<Product[]>([]);

// ✅ Type explicite pour une union
const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
```

### 3. Updater function vs valeur directe

```tsx
// ❌ Valeur directe — bug potentiel avec des mises à jour consécutives
function Counter() {
  const [count, setCount] = useState(0);

  const incrementThrice = () => {
    setCount(count + 1); // count vaut 0
    setCount(count + 1); // count vaut TOUJOURS 0 (closure)
    setCount(count + 1); // count vaut TOUJOURS 0 → résultat final : 1
  };

  return <button onClick={incrementThrice}>{count}</button>;
}

// ✅ Updater function — se base sur la valeur précédente
function Counter() {
  const [count, setCount] = useState(0);

  const incrementThrice = () => {
    setCount((prev) => prev + 1); // 0 → 1
    setCount((prev) => prev + 1); // 1 → 2
    setCount((prev) => prev + 1); // 2 → 3 → résultat final : 3
  };

  return <button onClick={incrementThrice}>{count}</button>;
}
```

> **Règle** : utilisez l'updater function `(prev) => newValue` chaque fois que la nouvelle valeur dépend de l'ancienne. C'est **toujours** plus sûr.

### 4. Lazy initialization (initialisation paresseuse)

Quand la valeur initiale est coûteuse à calculer :

```tsx
// ❌ La fonction est appelée à CHAQUE rendu (gaspillage)
const [data, setData] = useState(parseExpensiveJSON(rawData));

// ✅ La fonction n'est appelée qu'au PREMIER rendu
const [data, setData] = useState(() => parseExpensiveJSON(rawData));
```

> **Quand l'utiliser** : lecture du `localStorage`, parsing de données, calculs lourds. Passez une **fonction** (pas le résultat de la fonction) comme valeur initiale.

```tsx
// ✅ Exemple : initialiser depuis le localStorage
const [theme, setTheme] = useState<"light" | "dark">(() => {
  const saved = localStorage.getItem("theme");
  return saved === "dark" ? "dark" : "light";
});
```

### 5. Plusieurs states vs un seul objet

```tsx
// ✅ Plusieurs useState — recommandé quand les valeurs changent indépendamment
function UserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState(0);
  // ...
}

// ✅ Un seul objet state — quand les valeurs changent ensemble
interface FormState {
  name: string;
  email: string;
  age: number;
}

function UserForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", age: 0 });

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  // ...
}
```

> **Règle de pouce** : si deux valeurs changent toujours ensemble, groupez-les. Sinon, séparez-les. Au-delà de 4-5 `useState`, envisagez `useReducer`.

### 6. Mises à jour immutables

React détecte les changements par **référence** (`===`). Muter un objet ou un tableau ne déclenche pas de re-render.

#### Objets

```tsx
interface User {
  name: string;
  address: {
    city: string;
    zip: string;
  };
}

const [user, setUser] = useState<User>({
  name: "Alice",
  address: { city: "Paris", zip: "75001" },
});

// ❌ Mutation directe — React ne voit RIEN changer
user.address.city = "Lyon";
setUser(user); // Même référence → pas de re-render

// ✅ Spread pour créer un nouvel objet
setUser((prev) => ({
  ...prev,
  address: { ...prev.address, city: "Lyon" },
}));
```

#### Tableaux

```tsx
const [todos, setTodos] = useState<Todo[]>([]);

// ✅ Ajouter un élément
setTodos((prev) => [...prev, newTodo]);

// ✅ Supprimer un élément
setTodos((prev) => prev.filter((t) => t.id !== idToRemove));

// ✅ Modifier un élément
setTodos((prev) =>
  prev.map((t) => (t.id === idToUpdate ? { ...t, done: !t.done } : t))
);

// ✅ Réordonner (créer une copie avant sort)
setTodos((prev) => [...prev].sort((a, b) => a.priority - b.priority));

// ❌ Mutation — sort() mute le tableau en place
setTodos((prev) => prev.sort((a, b) => a.priority - b.priority));
```

### 7. Auto-batching (React 18+)

React regroupe automatiquement les mises à jour d'état dans un seul re-render :

```tsx
function handleClick() {
  setCount((c) => c + 1);   // Pas de re-render ici
  setName("Alice");          // Pas de re-render ici
  setIsLoading(false);       // Pas de re-render ici
  // → Un seul re-render pour les 3 mises à jour
}

// Avant React 18, le batching ne fonctionnait que dans les event handlers.
// Depuis React 18, il fonctionne PARTOUT : setTimeout, Promises, event listeners natifs…
```

### 8. Comparaison : ref() / signal() vs useState()

| Aspect                | Vue 3 `ref()`          | Angular `signal()`       | React `useState()`        |
|-----------------------|------------------------|--------------------------|---------------------------|
| Déclaration           | `const x = ref(0)`    | `x = signal(0)`          | `const [x, setX] = useState(0)` |
| Lire la valeur        | `x.value`              | `x()`                    | `x`                       |
| Modifier              | `x.value = 5`          | `x.set(5)`               | `setX(5)`                 |
| Modifier avec prev    | —                      | `x.update(v => v + 1)`  | `setX(prev => prev + 1)` |
| Réactivité            | Automatique (proxy)    | Automatique (signal graph)| Re-render du composant   |
| Mutabilité            | Mutable                | Immutable (set/update)   | Immutable (nouveau state) |

```tsx
// Vue 3
const count = ref(0);
count.value++;  // Mutation directe, réactivité automatique

// Angular 19
count = signal(0);
count.update(v => v + 1);  // Setter obligatoire

// React 19
const [count, setCount] = useState(0);
setCount(prev => prev + 1);  // Setter obligatoire, re-render
```

> **Différence clé** : en Vue, `ref()` est mutable et la réactivité est granulaire (seul le binding qui lit `.value` se met à jour). En React, `useState` provoque un re-render **de tout le composant** — d'où l'importance de la mémoïsation (abordée plus tard).

---

## Pratique

### Exercice : gestionnaire de panier d'achat

Créez un composant `ShoppingCart` avec :
1. Un state `items` (tableau d'objets `{ id, name, price, quantity }`)
2. Une fonction pour **ajouter** un article (où incrémenter sa quantité s'il existe déjà)
3. Une fonction pour **supprimer** un article
4. Une fonction pour **modifier la quantité** d'un article
5. Un affichage du **total** (somme des `price * quantity`)
6. Toutes les mises à jour doivent être **immutables**

<details>
<summary>Voir la solution</summary>

```tsx
import { useState } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const CATALOG = [
  { id: "1", name: "Clavier mécanique", price: 89.99 },
  { id: "2", name: "Souris ergonomique", price: 49.99 },
  { id: "3", name: "Écran 27 pouces", price: 299.99 },
];

function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: (typeof CATALOG)[number]) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div>
      <h2>Catalogue</h2>
      {CATALOG.map((product) => (
        <div key={product.id}>
          {product.name} — {product.price} EUR
          <button onClick={() => addItem(product)}>Ajouter</button>
        </div>
      ))}

      <h2>Panier ({items.length} articles)</h2>
      {items.length === 0 ? (
        <p>Votre panier est vide</p>
      ) : (
        <>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.name} — {item.price} EUR x
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                {item.quantity}
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                <button onClick={() => removeItem(item.id)}>Supprimer</button>
              </li>
            ))}
          </ul>
          <p><strong>Total : {total.toFixed(2)} EUR</strong></p>
        </>
      )}
    </div>
  );
}

export default ShoppingCart;
```
</details>

---

## Résumé

| Concept                   | Ce qu'il faut retenir                                       |
|---------------------------|-------------------------------------------------------------|
| `useState<T>(init)`       | Retourne `[value, setter]`, typage explicite si nécessaire  |
| Updater `(prev) => next`  | Toujours l'utiliser quand la valeur dépend de la précédente |
| Lazy init `() => value`   | Pour les calculs coûteux au premier rendu                   |
| Immutabilité              | Spread `...`, `.map()`, `.filter()` — ne jamais muter       |
| Batching                  | React 18+ regroupe toutes les mises à jour automatiquement  |
| Plusieurs vs un state     | Séparer si indépendants, grouper si liés                    |

> **Prochain cours** : [Cours 10 — useEffect](./02-useeffect.md)
