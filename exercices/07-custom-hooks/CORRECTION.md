# Correction — Exercice 07 : Custom hooks

## Resultat attendu

Trois hooks personnalises reutilisables et generiques, demontres dans un composant App. Le nom d'utilisateur persiste apres rechargement, le champ de recherche est debounce, et le composant detecte dynamiquement si l'ecran est mobile ou desktop.

---

## Code corrige

### `src/exercises/ex07/useLocalStorage.ts`

```ts
import { useState, useCallback } from "react";

/**
 * Hook useLocalStorage
 * Persiste un etat dans le localStorage du navigateur.
 *
 * @param key - Cle de stockage dans le localStorage
 * @param initialValue - Valeur par defaut si aucune valeur n'est trouvee
 * @returns Tuple [valeur, setter] identique a useState
 */
export default function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialisation paresseuse : lire le localStorage une seule fois
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      // Si la cle existe, parser le JSON ; sinon, valeur initiale
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      // En cas d'erreur (JSON invalide, etc.), utiliser la valeur initiale
      console.warn(`Erreur lecture localStorage pour "${key}":`, error);
      return initialValue;
    }
  });

  // Setter personnalise qui met a jour le state ET le localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        // Supporter la forme fonctionnelle comme useState
        const nextValue =
          value instanceof Function ? value(prev) : value;

        // Persister dans le localStorage
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Erreur ecriture localStorage pour "${key}":`, error);
        }

        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
```

### `src/exercises/ex07/useDebounce.ts`

```ts
import { useState, useEffect } from "react";

/**
 * Hook useDebounce
 * Retarde la mise a jour d'une valeur d'un delai specifie.
 * Utile pour eviter des appels API a chaque frappe dans un champ de recherche.
 *
 * @param value - Valeur a debouncer
 * @param delay - Delai en millisecondes
 * @returns La valeur debouncee
 */
export default function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Lancer un timer qui met a jour la valeur debouncee apres le delai
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup : si value ou delay change avant la fin du timer,
    // on annule le timer precedent (c'est le principe du debounce)
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### `src/exercises/ex07/useMediaQuery.ts`

```ts
import { useState, useEffect } from "react";

/**
 * Hook useMediaQuery
 * Evalue une media query CSS et se met a jour dynamiquement.
 *
 * @param query - Media query CSS (ex : "(max-width: 768px)")
 * @returns true si la media query correspond, false sinon
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // Initialisation : evaluer la media query immediatement
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // Creer le MediaQueryList
    const mediaQueryList = window.matchMedia(query);

    // Handler pour les changements
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Synchroniser l'etat au cas ou la valeur a change depuis l'init
    setMatches(mediaQueryList.matches);

    // Ecouter les changements
    mediaQueryList.addEventListener("change", handleChange);

    // Cleanup : retirer l'ecouteur au demontage ou si query change
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
```

### `src/exercises/ex07/App.tsx`

```tsx
import { useState } from "react";
import useLocalStorage from "./useLocalStorage";
import useDebounce from "./useDebounce";
import useMediaQuery from "./useMediaQuery";

/**
 * Composant de demonstration des trois custom hooks.
 */
export default function App() {
  // --- useLocalStorage : le nom persiste apres rechargement ---
  const [username, setUsername] = useLocalStorage<string>("username", "");

  // --- useDebounce : la recherche est retardee de 500ms ---
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearch = useDebounce<string>(searchTerm, 500);

  // --- useMediaQuery : detecter si l'ecran est mobile ---
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <main>
      <h1>Exercice 07 — Custom hooks</h1>

      {/* Demo useLocalStorage */}
      <section>
        <h2>useLocalStorage</h2>
        <p>Le nom est persiste dans le localStorage. Recharge la page pour verifier.</p>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Ton prenom..."
          aria-label="Nom d'utilisateur"
        />
        <p>
          Valeur stockee : <strong>{username || "(vide)"}</strong>
        </p>
      </section>

      {/* Demo useDebounce */}
      <section>
        <h2>useDebounce</h2>
        <p>Tape dans le champ. La valeur debouncee se met a jour 500ms apres la derniere frappe.</p>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher..."
          aria-label="Recherche debouncee"
        />
        <p>
          Valeur saisie : <code>{searchTerm}</code>
        </p>
        <p>
          Valeur debouncee : <code>{debouncedSearch}</code>
        </p>
      </section>

      {/* Demo useMediaQuery */}
      <section>
        <h2>useMediaQuery</h2>
        <p>Redimensionne la fenetre pour voir le changement.</p>
        <p>
          Ecran actuel : <strong>{isMobile ? "Mobile" : "Desktop"}</strong>
        </p>
      </section>
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Oublier l'initialisation paresseuse dans `useLocalStorage`

- ❌ `const [value, setValue] = useState<T>(JSON.parse(localStorage.getItem(key)!));`
  `localStorage.getItem` et `JSON.parse` sont appeles a chaque render.
- ✅ `useState<T>(() => { ... })` — la fonction d'initialisation n'est appelee qu'au premier render.

### 2. Ne pas supporter la forme fonctionnelle du setter

- ❌ `setValue(newValue)` uniquement, pas `setValue((prev) => prev + 1)`.
  Incompatible avec l'API de `useState` que les developpeurs connaissent.
- ✅ Verifier `value instanceof Function` pour supporter les deux formes.

### 3. Oublier le cleanup dans `useDebounce`

- ❌ Pas de `clearTimeout` dans le cleanup de `useEffect`.
  Si la valeur change rapidement, plusieurs timers s'empilent et la valeur "saute".
- ✅ `return () => clearTimeout(timer);` annule le timer precedent a chaque changement.

### 4. Utiliser `addListener` au lieu de `addEventListener`

- ❌ `mediaQueryList.addListener(handler)` — methode deprecee.
- ✅ `mediaQueryList.addEventListener("change", handler)` — methode moderne et standard.

### 5. Ne pas gerer le SSR dans `useMediaQuery`

- ❌ Appeler `window.matchMedia` directement sans verifier l'existence de `window`.
  Crash en SSR (Next.js).
- ✅ `if (typeof window !== "undefined")` avant d'acceder a `window`.

---

## Concepts cles utilises

| Concept                 | Description                                                          | Documentation                              |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| Custom hooks            | Extraire de la logique reutilisable dans une fonction `use...`       | [react.dev](https://react.dev/learn/reusing-logic-with-custom-hooks) |
| Generiques TypeScript   | `<T>` permet de creer des hooks qui fonctionnent avec n'importe quel type | [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/generics.html) |
| Initialisation paresseuse | `useState(() => ...)` pour un calcul initial couteux               | [react.dev](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state) |
| Debounce                | Retarder une action jusqu'a ce que l'utilisateur arrete d'interagir  | Pattern courant en UX |
| `matchMedia`            | API navigateur pour evaluer des media queries en JavaScript          | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) |
| `useEffect` cleanup     | Nettoyer les effets de bord (timers, listeners) au demontage        | [react.dev](https://react.dev/reference/react/useEffect) |

---

## Pour aller plus loin

- Ecris des tests avec `renderHook` de `@testing-library/react` et `vi.useFakeTimers` pour `useDebounce`.
- Ajoute la synchronisation entre onglets pour `useLocalStorage` avec l'evenement `storage`.
- Cree un hook `useWindowSize` qui combine `useMediaQuery` avec les dimensions exactes de la fenetre.
