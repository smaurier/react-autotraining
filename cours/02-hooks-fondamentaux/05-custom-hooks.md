# Cours 13 — Custom hooks

> **Objectif** : Savoir extraire la logique réutilisable dans des custom hooks, comprendre les règles des hooks, implémenter les patterns les plus courants (`useLocalStorage`, `useDebounce`, `useMediaQuery`, `useFetch`), et transposer les composables Vue / services Angular vers des hooks React.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre `useMemo` et `useCallback` ?</summary>

`useMemo(() => value, [deps])` mémoïse une **valeur calculée**. `useCallback(fn, [deps])` mémoïse une **référence de fonction**. `useCallback(fn, deps)` est équivalent à `useMemo(() => fn, deps)`.
</details>

<details>
<summary>2. Quand `React.memo()` est-il utile ?</summary>

Quand un composant reçoit des props dont les **références** sont stables (grâce à `useCallback`/`useMemo`). Sans props stables, `React.memo()` compare les anciennes et nouvelles props mais trouve toujours des différences — et re-render quand même.
</details>

<details>
<summary>3. Pourquoi ne faut-il pas tout mémoïser systématiquement ?</summary>

La mémoïsation à un **coût** : mémoire pour stocker la valeur précédente, CPU pour comparer les dépendances. Pour des calculs triviaux, ce coût dépasse le gain. Il faut mesurer avec le React DevTools Profiler avant d'optimiser.
</details>

---

## Analogie

Un custom hook est comme une **recette de cuisine réutilisable**. Plutôt que de réécrire les étapes "faire bouillir l'eau, ajouter le sel, cuire 10 minutes" dans chaque plat, vous créez une recette `cuirePates(durée)` que vous réutilisez partout. En Vue, ce sont les **composables** (`useCounter`, `useFetch`). En Angular, ce sont les **services injectables**. En React, ce sont les custom hooks — des fonctions qui commencent par `use` et qui composent d'autres hooks.

---

## Théorie

### 1. Créer un custom hook

Un custom hook est simplement une **fonction JavaScript** qui :
- Commence par `use` (convention obligatoire — le linter vérifie)
- Peut appeler d'autres hooks (`useState`, `useEffect`, d'autres custom hooks…)
- Retourne ce qu'elle veut (valeur, tuple, objet)

```tsx
import { useState } from "react";

// ✅ Custom hook — extrait la logique du toggle
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = () => setValue((prev) => !prev);
  const setOn = () => setValue(true);
  const setOff = () => setValue(false);

  return { value, toggle, setOn, setOff } as const;
}

// Utilisation dans un composant
function DarkModeToggle() {
  const { value: isDark, toggle } = useToggle(false);

  return (
    <button onClick={toggle}>
      Mode : {isDark ? "Sombre" : "Clair"}
    </button>
  );
}
```

### 2. Les règles des hooks

Ces règles sont **obligatoires** et vérifiées par le plugin ESLint `eslint-plugin-react-hooks` :

```tsx
// ✅ Règle 1 : Appeler les hooks au NIVEAU SUPÉRIEUR du composant/hook
function MyComponent() {
  const [count, setCount] = useState(0);     // ✅ Toujours appelé
  const { value } = useToggle();             // ✅ Toujours appelé
  // ...
}

// ❌ Règle 1 violée : hook dans une condition
function MyComponent({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    const [name, setName] = useState(""); // ❌ Conditionnel !
  }
}

// ❌ Règle 1 violée : hook dans une boucle
function MyComponent({ items }: { items: string[] }) {
  items.forEach((item) => {
    const [val, setVal] = useState(item); // ❌ Dans une boucle !
  });
}

// ❌ Règle 1 violée : hook après un return anticipé
function MyComponent({ user }: { user: User | null }) {
  if (!user) return null;
  const [name, setName] = useState(user.name); // ❌ Après un return !
}

// ✅ Correction : hooks avant tout return conditionnel
function MyComponent({ user }: { user: User | null }) {
  const [name, setName] = useState(user?.name ?? "");
  if (!user) return null;
  return <p>{name}</p>;
}
```

```tsx
// ✅ Règle 2 : Appeler les hooks uniquement dans des composants React
//              ou d'autres custom hooks (fonctions commençant par "use")
function useCustomHook() {
  const [state, setState] = useState(0); // ✅ Dans un hook
  return state;
}

// ❌ Règle 2 violée : hook dans une fonction normale
function calculateTotal(items: Item[]) {
  const [total, setTotal] = useState(0); // ❌ Pas un composant ni un hook !
  return total;
}
```

> **Pourquoi ?** React identifie les hooks **par leur ordre d'appel**. Si l'ordre change entre deux rendus (à cause d'une condition ou d'une boucle), React ne peut plus associer chaque hook à son état.

### 3. Patterns courants de custom hooks

#### `useLocalStorage` — synchroniser un state avec le localStorage

```tsx
import { useState, useEffect } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erreur localStorage pour la clé "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// Utilisation
function Settings() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
  const [lang, setLang] = useLocalStorage("lang", "fr");

  return (
    <div>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Theme: {theme}
      </button>
      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="fr">Francais</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
```

#### `useDebounce` — retarder une valeur

```tsx
import { useState, useEffect } from "react";

function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

// Utilisation — recherche API avec debounce
function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then(setResults);
  }, [debouncedQuery]); // Fetch uniquement après 300ms d'inactivité

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." />
      <ul>
        {results.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}
```

#### `useMediaQuery` — responsive en JavaScript

```tsx
import { useState, useEffect } from "react";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener("change", handler);
    setMatches(mediaQuery.matches); // Sync initial

    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Utilisation
function ResponsiveLayout() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  return (
    <div className={prefersDark ? "dark" : "light"}>
      {isMobile ? <MobileNav /> : <DesktopNav />}
    </div>
  );
}
```

#### `useFetch` — fetch avec loading/error/data

```tsx
import { useState, useEffect } from "react";

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: T) => setData(json))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [url, fetchCount]);

  const refetch = () => setFetchCount((c) => c + 1);

  return { data, isLoading, error, refetch };
}

// Utilisation
function UserList() {
  const { data: users, isLoading, error, refetch } = useFetch<User[]>("/api/users");

  if (isLoading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error} <button onClick={refetch}>Reessayer</button></p>;
  if (!users) return null;

  return (
    <ul>
      {users.map((u) => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

### 4. Composer des hooks (hooks appelant des hooks)

```tsx
// Hook de bas niveau
function useDebounce<T>(value: T, delay: number): T { /* ... */ }

// Hook de bas niveau
function useFetch<T>(url: string): UseFetchResult<T> { /* ... */ }

// ✅ Hook de haut niveau composé de hooks de bas niveau
function useDebouncedSearch<T>(baseUrl: string, query: string, delay = 300) {
  const debouncedQuery = useDebounce(query, delay);
  const url = debouncedQuery ? `${baseUrl}?q=${encodeURIComponent(debouncedQuery)}` : "";
  const result = useFetch<T[]>(url);

  return {
    ...result,
    data: result.data ?? [],
    isEmpty: debouncedQuery.length > 0 && (result.data?.length ?? 0) === 0,
  };
}

// Utilisation simplifiée
function ProductSearch() {
  const [query, setQuery] = useState("");
  const { data: products, isLoading, isEmpty } = useDebouncedSearch<Product>("/api/products", query);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading && <p>Recherche...</p>}
      {isEmpty && <p>Aucun resultat</p>}
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
```

### 5. Tester un custom hook

On utilise `@testing-library/react` et sa fonction `renderHook` :

```tsx
import { renderHook, act } from "@testing-library/react";
import { useToggle } from "./useToggle";

describe("useToggle", () => {
  it("commence avec la valeur initiale", () => {
    const { result } = renderHook(() => useToggle(false));
    expect(result.current.value).toBe(false);
  });

  it("bascule la valeur avec toggle()", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      result.current.toggle();
    });

    expect(result.current.value).toBe(true);
  });

  it("force la valeur avec setOn()/setOff()", () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => result.current.setOn());
    expect(result.current.value).toBe(true);

    act(() => result.current.setOff());
    expect(result.current.value).toBe(false);
  });
});
```

> **`act()`** est nécessaire pour encapsuler les opérations qui modifient le state. Sans `act()`, React affiche un warning.

### 6. Comparaison : composables / services vs custom hooks

| Aspect                | Vue 3 composable         | Angular service            | React custom hook            |
|-----------------------|--------------------------|----------------------------|------------------------------|
| Convention            | `useXxx()`               | `@Injectable()` + `inject()` | `useXxx()`                 |
| Réactivité            | `ref()`, `computed()`    | `signal()`, `computed()`   | `useState`, `useMemo`        |
| Effets                | `watchEffect`, `onMounted` | `effect()`, `ngOnInit`   | `useEffect`                  |
| Injection             | Import direct            | Système d'injection DI     | Import direct                |
| Singleton             | Selon l'usage            | `providedIn: 'root'`      | Pas natif (context/state mgr)|
| Partage d'état        | `ref()` hors composant   | Service partagé            | Context, Zustand, etc.       |

```tsx
// Vue 3 composable
export function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  return { count: readonly(count), increment };
}

// Angular 19 service
@Injectable({ providedIn: 'root' })
export class CounterService {
  count = signal(0);
  increment() { this.count.update(c => c + 1); }
}

// React custom hook
export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = useCallback(() => setCount(c => c + 1), []);
  return { count, increment } as const;
}
```

> **Différence clé** : un custom hook **crée une instance d'état par composant** qui l'utilise. Si 3 composants appellent `useCounter()`, chacun a son propre compteur. En Angular, un service `providedIn: 'root'` est un singleton partagé.

### 7. Organisation des hooks

```
src/
├── hooks/
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   ├── useFetch.ts
│   ├── useToggle.ts
│   └── index.ts          // Barrel export
├── hooks/__tests__/
│   ├── useToggle.test.ts
│   └── useDebounce.test.ts
```

```tsx
// hooks/index.ts — barrel export
export { useLocalStorage } from "./useLocalStorage";
export { useDebounce } from "./useDebounce";
export { useMediaQuery } from "./useMediaQuery";
export { useFetch } from "./useFetch";
export { useToggle } from "./useToggle";

// Utilisation propre dans un composant
import { useDebounce, useLocalStorage } from "@/hooks";
```

---

## Pratique

### Exercice : hook `useForm` générique

Créez un custom hook `useForm<T>` qui :
1. Prend un `initialValues: T` et une fonction de validation `validate: (values: T) => Partial<Record<keyof T, string>>`
2. Retourne : `values`, `errors`, `handleChange(field, value)`, `handleSubmit(callback)`, `reset()`, `isValid`
3. Les erreurs se recalculent à chaque changement de valeur
4. `handleSubmit` n'appelle le callback que si le formulaire est valide
5. Testez-le avec un formulaire de contact (nom, email, message)

<details>
<summary>Voir la solution</summary>

```tsx
import { useState, useMemo, useCallback } from "react";

type ValidationErrors<T> = Partial<Record<keyof T, string>>;

interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: ValidationErrors<T>;
  isValid: boolean;
  handleChange: <K extends keyof T>(field: K, value: T[K]) => void;
  handleSubmit: (callback: (values: T) => void) => (e: React.FormEvent) => void;
  reset: () => void;
}

function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  validate: (values: T) => ValidationErrors<T>
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);

  const errors = useMemo(() => validate(values), [values, validate]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleChange = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    (callback: (values: T) => void) => (e: React.FormEvent) => {
      e.preventDefault();
      const currentErrors = validate(values);
      if (Object.keys(currentErrors).length === 0) {
        callback(values);
      }
    },
    [values, validate]
  );

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, errors, isValid, handleChange, handleSubmit, reset };
}

// --- Utilisation ---

interface ContactData {
  name: string;
  email: string;
  message: string;
}

const validateContact = (values: ContactData) => {
  const errors: ValidationErrors<ContactData> = {};
  if (!values.name.trim()) errors.name = "Le nom est requis";
  if (!values.email.includes("@")) errors.email = "Email invalide";
  if (values.message.length < 10) errors.message = "Minimum 10 caracteres";
  return errors;
};

function ContactPage() {
  const { values, errors, isValid, handleChange, handleSubmit, reset } =
    useForm<ContactData>(
      { name: "", email: "", message: "" },
      validateContact
    );

  const onSubmit = (data: ContactData) => {
    console.log("Formulaire soumis:", data);
    alert(`Merci ${data.name} !`);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          placeholder="Nom"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <input
          placeholder="Email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <textarea
          placeholder="Message (min 10 caracteres)"
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
        />
        {errors.message && <span className="error">{errors.message}</span>}
      </div>

      <button type="submit" disabled={!isValid}>Envoyer</button>
      <button type="button" onClick={reset}>Reinitialiser</button>
    </form>
  );
}

export default ContactPage;
```
</details>

---

## Résumé

| Concept                    | Ce qu'il faut retenir                                         |
|----------------------------|---------------------------------------------------------------|
| Custom hook                | Fonction `useXxx()` qui compose d'autres hooks                |
| Règles des hooks           | Niveau supérieur, pas dans les conditions/boucles/after return |
| Patterns courants          | `useLocalStorage`, `useDebounce`, `useMediaQuery`, `useFetch` |
| Composition                | Les hooks peuvent appeler d'autres hooks                      |
| Test                       | `renderHook()` + `act()` de `@testing-library/react`         |
| vs composables/services    | Import direct, état par instance (pas de singleton natif)     |

> **Prochain cours** : [Cours 14 — Context API et useContext](../03-state-management/01-context-api.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [06-hooks-avances](../../exercices/06-hooks-avances/ENONCE)
2. **Exercice** : [07-custom-hooks](../../exercices/07-custom-hooks/ENONCE)
:::
