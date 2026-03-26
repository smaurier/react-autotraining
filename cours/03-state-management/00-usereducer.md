# useReducer et logique de state complexe

> **Prérequis** : `useState` (module 02) · **Durée** : ~60 min
>
> **Analogie Vue** : `useReducer` est l'équivalent d'un Pinia `actions` associé à un `state` local — mais sans store externe. C'est Redux en miniature dans un composant.
>
> **Analogie Angular** : Pense à un service avec une propriété `BehaviorSubject` et des méthodes `dispatch`.

---

## Pourquoi `useReducer` existe

`useState` gère bien un état simple. Mais dès qu'un état a **plusieurs sous-valeurs liées** ou que **plusieurs actions modifient le même état**, le code devient fragile :

```tsx
// ❌ useState qui devient ingérable
const [items, setItems] = useState<Item[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [filter, setFilter] = useState('all');

// Pour "charger les données" tu dois appeler 3 setters dans le bon ordre
const loadItems = async () => {
  setLoading(true);   // oublier un setter = bug silencieux
  setError(null);
  try {
    const data = await fetchItems();
    setItems(data);
    setLoading(false);
  } catch (e) {
    setError(e.message);
    setLoading(false);
  }
};
```

`useReducer` regroupe toute cette logique en un endroit :

```tsx
// ✅ useReducer : état cohérent, transitions explicites
type State = {
  items: Item[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'active' | 'done';
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_FILTER'; payload: State['filter'] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}
```

---

## Anatomie de `useReducer`

```tsx
const [state, dispatch] = useReducer(reducer, initialState);
//            ^^^^^^^^^
//            fonction qui envoie une action

dispatch({ type: 'FETCH_START' });
dispatch({ type: 'FETCH_SUCCESS', payload: data });
```

| Concept | Rôle |
|---|---|
| `state` | L'état courant (read-only) |
| `dispatch` | La seule façon de modifier l'état |
| `reducer` | Fonction pure : `(state, action) => newState` |
| `action` | Objet `{ type: string, payload?: any }` |

> **Règle d'or** : le reducer est une **fonction pure**. Pas d'effets de bord, pas de `fetch`, pas de `console.log` de production. Entrée → sortie, c'est tout.

---

## Exemple complet — Todo list

```tsx
import { useReducer } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

type Action =
  | { type: 'ADD'; text: string }
  | { type: 'TOGGLE'; id: number }
  | { type: 'DELETE'; id: number }
  | { type: 'CLEAR_DONE' };

function todoReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'ADD':
      return [...state, { id: Date.now(), text: action.text, done: false }];
    case 'TOGGLE':
      return state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
    case 'DELETE':
      return state.filter(t => t.id !== action.id);
    case 'CLEAR_DONE':
      return state.filter(t => !t.done);
    default:
      return state;
  }
}

export function TodoApp() {
  const [todos, dispatch] = useReducer(todoReducer, []);

  return (
    <div>
      <button onClick={() => dispatch({ type: 'ADD', text: 'Nouveau' })}>
        Ajouter
      </button>
      <button onClick={() => dispatch({ type: 'CLEAR_DONE' })}>
        Supprimer les faits
      </button>

      {todos.map(todo => (
        <div key={todo.id}>
          <span
            style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
            onClick={() => dispatch({ type: 'TOGGLE', id: todo.id })}
          >
            {todo.text}
          </span>
          <button onClick={() => dispatch({ type: 'DELETE', id: todo.id })}>×</button>
        </div>
      ))}
    </div>
  );
}
```

---

## useReducer + Context : le pattern classique

`useReducer` devient très puissant combiné avec Context. C'est le pattern que Redux popularise — mais ici sans librairie externe :

```tsx
// store/CartContext.tsx
import { createContext, useContext, useReducer } from 'react';

type CartState = { items: CartItem[]; total: number };
type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.item],
        total: state.total + action.item.price,
      };
    case 'REMOVE_ITEM': {
      const item = state.items.find(i => i.id === action.id)!;
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.id),
        total: state.total - item.price,
      };
    }
    case 'CLEAR':
      return { items: [], total: 0 };
    default:
      return state;
  }
}

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });
  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans un CartProvider');
  return ctx;
}
```

Utilisation :

```tsx
function AddToCartButton({ item }: { item: CartItem }) {
  const { dispatch } = useCart();
  return (
    <button onClick={() => dispatch({ type: 'ADD_ITEM', item })}>
      Ajouter au panier
    </button>
  );
}
```

---

## useState vs useReducer — arbre de décision

```
État simple (un seul booléen, un compteur) ?
  → useState ✅

Plusieurs valeurs d'état qui évoluent ENSEMBLE ?
  → useReducer ✅

Logique de transition complexe (state machines) ?
  → useReducer ✅

État partagé entre composants distants ?
  → useReducer + Context  ou  Zustand (prochain cours)

Données serveur (liste d'utilisateurs, posts...) ?
  → TanStack Query (module 05b) — PAS de state client
```

| Critère | useState | useReducer |
|---|---|---|
| Nombre de setters | 1 | 1 (`dispatch`) |
| Cohérence de l'état | Risque si plusieurs setters | Toujours cohérent |
| Testabilité | Difficile (composant) | Facile (reducer = fonction pure) |
| Lisibilité pour les transitions | Ok pour <3 états | Bien meilleur |
| Boilerplate | Minimal | Modéré |

---

## Tester un reducer (sans rendu)

Un reducer est une fonction pure — il se teste sans React :

```ts
// __tests__/todoReducer.test.ts
import { todoReducer } from '../todoReducer';

test('ajoute un todo', () => {
  const state = todoReducer([], { type: 'ADD', text: 'Premier todo' });
  expect(state).toHaveLength(1);
  expect(state[0].text).toBe('Premier todo');
  expect(state[0].done).toBe(false);
});

test('toggle un todo', () => {
  const initial = [{ id: 1, text: 'Test', done: false }];
  const state = todoReducer(initial, { type: 'TOGGLE', id: 1 });
  expect(state[0].done).toBe(true);
});
```

C'est l'un des gros avantages par rapport à `useState` : la logique est isolée et testable sans monter de composant.

---

## Équivalences framework

```tsx
// Vue 3 (Pinia)
const useCartStore = defineStore('cart', {
  state: () => ({ items: [], total: 0 }),
  actions: {
    addItem(item) { this.items.push(item); this.total += item.price; }
  }
});

// React — useReducer + Context
const { dispatch } = useCart();
dispatch({ type: 'ADD_ITEM', item });

// Angular — Service avec BehaviorSubject
cartService.dispatch('ADD_ITEM', item);
```

La différence principale : en React, le state reste **dans le composant** (ou dans un Context local) — pas dans un singleton global. C'est une décision architecturale délibérée.

---

## Ce qu'il faut retenir

- `useReducer` remplace `useState` quand l'état a plusieurs dimensions liées
- Toujours utiliser des **unions discriminantes** TypeScript pour les actions (`type: 'ADD' | 'DELETE'`)
- Le reducer est une **fonction pure** : pas d'effets de bord dedans
- `useReducer + Context` = Redux léger, sans dépendance externe
- Si le state devient partagé partout dans l'app → Zustand est plus simple (prochain cours)
