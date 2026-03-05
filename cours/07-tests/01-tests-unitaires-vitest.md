# Cours 29 — Tests unitaires avec Vitest

> **Objectif** : configurer Vitest dans un projet React, tester des fonctions pures et des hooks personnalisés avec `renderHook`, maîtriser le mocking avec `vi.fn()` et `vi.mock()`, et comprendre les patterns `describe/it/expect`.

---

## Rappel du cours précédent

<details>
<summary>1. À quoi sert le fichier `middleware.ts` dans Next.js ?</summary>

Le middleware intercepte les requêtes HTTP **avant** qu'elles n'atteignent les pages ou les Route Handlers. Il permet de rediriger les utilisateurs non authentifiés, ajouter des headers, gérer l'i18n, ou appliquer du rate limiting.
</details>

<details>
<summary>2. Quelle est la différence entre `NEXT_PUBLIC_API_URL` et `API_SECRET_KEY` ?</summary>

Les variables préfixées `NEXT_PUBLIC_` sont injectées dans le bundle JavaScript côté client (accessibles dans le navigateur). Les variables sans ce préfixe restent uniquement côté serveur et ne sont jamais exposées au client.
</details>

<details>
<summary>3. Comment configurer une redirection permanente dans `next.config.ts` ?</summary>

Dans la fonction `redirects()` de `next.config.ts`, on retourne un tableau d'objets avec `source`, `destination` et `permanent: true` (code HTTP 301).
</details>

---

## Analogie

Tester du code, c'est comme faire un **contrôle technique automobile**. Tu vérifies chaque pièce individuellement (test unitaire = le moteur tourne-t-il ?), puis l'ensemble (test d'intégration = le moteur + la boîte de vitesses fonctionnent-ils ensemble ?), puis tu fais un essai sur route (test E2E = la voiture se conduit-elle normalement ?).

Vitest est ton **banc d'essai moteur** : rapide, précis, il teste les pièces isolées de ton code (fonctions, hooks) sans avoir besoin de monter toute la voiture (le navigateur).

---

## Théorie

### Pourquoi Vitest ?

| Critère | Jest | Vitest |
|---|---|---|
| Vitesse | Lent (transforme le code avec Babel) | Ultra-rapide (utilise Vite/esbuild) |
| Config | Complexe (`jest.config.js` + transformers) | Minimale (réutilise `vite.config.ts`) |
| ESM natif | Support partiel | Support natif |
| Compatibilité Jest | — | API 100% compatible (`describe`, `it`, `expect`) |
| Watch mode | Bon | Excellent (HMR de Vite) |
| TypeScript | Besoin de `ts-jest` | Natif |

> **Recommandation** : utilise Vitest pour les projets Vite (React seul). Pour Next.js, Vitest fonctionne aussi avec `@vitejs/plugin-react`.

### Installation

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```tsx
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
```

```tsx
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

```json
// package.json (scripts)
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Tester des fonctions pures

Les fonctions pures sont les plus faciles à tester : même entrée = même sortie, pas d'effets de bord.

```tsx
// src/utils/format.ts
export function formatPrice(cents: number, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

```tsx
// src/utils/format.test.ts
import { describe, it, expect } from "vitest";
import { formatPrice, slugify, clamp } from "./format";

describe("formatPrice", () => {
  it("formate les centimes en euros", () => {
    expect(formatPrice(1999)).toBe("19,99\u00a0€");
  });

  it("gère le zéro", () => {
    expect(formatPrice(0)).toBe("0,00\u00a0€");
  });

  it("gère les grands montants", () => {
    expect(formatPrice(1_000_000)).toContain("10");
  });
});

describe("slugify", () => {
  it("convertit en minuscules avec tirets", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("supprime les accents", () => {
    expect(slugify("Café crème")).toBe("cafe-creme");
  });

  it("supprime les caractères spéciaux", () => {
    expect(slugify("React & Next.js!")).toBe("react-next-js");
  });
});

describe("clamp", () => {
  it("retourne la valeur si dans la plage", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("retourne min si la valeur est trop basse", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("retourne max si la valeur est trop haute", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
```

### Patterns describe / it / expect

```tsx
describe("Nom du module ou de la fonction", () => {
  // Arrange commun (optionnel)
  const defaultUser = { name: "Alice", age: 30 };

  it("devrait faire X quand Y", () => {
    // Arrange (préparer)
    const input = "test";

    // Act (exécuter)
    const result = maFonction(input);

    // Assert (vérifier)
    expect(result).toBe("expected");
  });

  it("devrait gérer le cas d'erreur", () => {
    expect(() => maFonction(null)).toThrow("Erreur attendue");
  });
});
```

**Matchers courants** :

```tsx
expect(value).toBe(42);                     // Égalité stricte (===)
expect(value).toEqual({ a: 1 });            // Égalité profonde (objets)
expect(value).toBeTruthy();                 // Truthy
expect(value).toBeNull();                   // null
expect(value).toContain("substring");       // Contient
expect(array).toHaveLength(3);              // Longueur
expect(fn).toThrow();                       // Lance une erreur
expect(fn).toHaveBeenCalledWith("arg");     // Appelé avec
expect(value).toMatchObject({ a: 1 });      // Sous-ensemble d'objet
```

### Tester des hooks avec renderHook

```tsx
// src/hooks/use-counter.ts
import { useState, useCallback } from "react";

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initial), [initial]);

  return { count, increment, decrement, reset };
}
```

```tsx
// src/hooks/use-counter.test.ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("initialise à 0 par défaut", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("accepte une valeur initiale", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it("incrémente le compteur", () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("décrémente le compteur", () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it("reset à la valeur initiale", () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

> **Important** : les mises à jour de state doivent être wrappées dans `act()` pour que React les traite synchroniquement dans les tests.

### Mocking avec vi.fn() et vi.mock()

#### vi.fn() : mock d'une fonction

```tsx
import { describe, it, expect, vi } from "vitest";

it("appelle le callback avec le bon argument", () => {
  const callback = vi.fn();

  callback("hello");
  callback("world");

  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenCalledWith("hello");
  expect(callback).toHaveBeenLastCalledWith("world");
});

// Mock avec valeur de retour
const getUser = vi.fn().mockReturnValue({ name: "Alice" });
const fetchData = vi.fn().mockResolvedValue({ data: [1, 2, 3] });
```

#### vi.mock() : mock d'un module entier

```tsx
// src/services/api.ts
export async function fetchUsers() {
  const res = await fetch("/api/users");
  return res.json();
}

// src/services/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUsers } from "./api";

// Mock du module fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchUsers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("retourne la liste des utilisateurs", async () => {
    const mockUsers = [{ id: 1, name: "Alice" }];
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockUsers),
    });

    const users = await fetchUsers();

    expect(mockFetch).toHaveBeenCalledWith("/api/users");
    expect(users).toEqual(mockUsers);
  });
});
```

#### vi.mock() avec module

```tsx
// Mock d'un module entier
vi.mock("@/services/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 1, name: "Alice" }),
  isAuthenticated: vi.fn().mockReturnValue(true),
}));
```

### Comparaison Jest vs Vitest

| API | Jest | Vitest |
|---|---|---|
| `describe` | `describe` | `describe` |
| `it` / `test` | `it` / `test` | `it` / `test` |
| `expect` | `expect` | `expect` |
| Mock function | `jest.fn()` | `vi.fn()` |
| Mock module | `jest.mock()` | `vi.mock()` |
| Timer mock | `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| Spy | `jest.spyOn()` | `vi.spyOn()` |
| Reset | `jest.resetAllMocks()` | `vi.resetAllMocks()` |

> La migration Jest vers Vitest est quasi mécanique : remplace `jest.` par `vi.`.

---

## Pratique

### Exercice : tester un hook useLocalStorage

**Objectif** : écrire des tests complets pour un hook `useLocalStorage`.

1. Implémente le hook `useLocalStorage<T>(key: string, initialValue: T)` qui :
   - Lit la valeur depuis `localStorage` au montage
   - Retourne `[value, setValue]` comme `useState`
   - Persiste la valeur dans `localStorage` à chaque changement
2. Écris les tests suivants :
   - Retourne la valeur initiale si rien en localStorage
   - Lit la valeur existante depuis localStorage
   - Met à jour la valeur et persiste en localStorage
   - Gère les erreurs de parsing JSON

<details>
<summary>Solution</summary>

```tsx
// src/hooks/use-local-storage.ts
import { useState, useEffect } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      console.error(`Erreur localStorage pour la clé "${key}"`);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// src/hooks/use-local-storage.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "./use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("retourne la valeur initiale si rien en localStorage", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default")
    );
    expect(result.current[0]).toBe("default");
  });

  it("lit la valeur existante depuis localStorage", () => {
    localStorage.setItem("test-key", JSON.stringify("existing"));

    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default")
    );
    expect(result.current[0]).toBe("existing");
  });

  it("met à jour la valeur et persiste en localStorage", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "initial")
    );

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(localStorage.getItem("test-key")).toBe(
      JSON.stringify("updated")
    );
  });

  it("gère les objets complexes", () => {
    const initial = { name: "Alice", scores: [1, 2, 3] };
    const { result } = renderHook(() =>
      useLocalStorage("user", initial)
    );

    expect(result.current[0]).toEqual(initial);

    act(() => {
      result.current[1]({ name: "Bob", scores: [4, 5] });
    });

    expect(result.current[0]).toEqual({ name: "Bob", scores: [4, 5] });
  });

  it("retourne la valeur initiale si le JSON est invalide", () => {
    localStorage.setItem("test-key", "invalid-json{{{");

    const { result } = renderHook(() =>
      useLocalStorage("test-key", "fallback")
    );
    expect(result.current[0]).toBe("fallback");
  });
});
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| Vitest | Test runner ultra-rapide, compatible Jest, natif TypeScript |
| `describe/it/expect` | Structure un test : grouper, nommer, vérifier |
| `renderHook` | Teste un hook React en isolation |
| `act()` | Enveloppe les mises à jour de state dans les tests |
| `vi.fn()` | Crée une fonction mock (espion) |
| `vi.mock()` | Mock un module entier |
| Fonctions pures | Les plus faciles à tester : entrée = sortie, pas d'effet de bord |

---

> **Prochain cours** : [Tests de composants avec React Testing Library](./02-tests-composants-rtl.md) — tester le comportement de tes composants React, pas leur implémentation.
