# Correction — Exercice 25 : Entretien React

---

## Partie 1 : Reponses au QCM

**1. useState vs useReducer**
`useState` géré un état simple (valeur unique). `useReducer` géré un état complexe avec une logique de transition via un reducer (fonction pure qui prend state + action et retourne le nouvel état). `useReducer` est préféré quand les mises a jour dependent de l'état précédent ou quand il y a plusieurs sous-valeurs liees.

**2. 'use client'**
La directive `'use client'` marque un fichier comme Client Component dans Next.js App Router. Ce composant sera inclus dans le bundle JavaScript client et pourra utiliser des hooks React (`useState`, `useEffect`, etc.) et des événements DOM (`onClick`, etc.). Sans cette directive, le composant est un Server Component par defaut.

**3. useRef**
`useRef` permet d'acceder à un élément DOM sans provoquer de re-render. La valeur de `ref.current` est mutable et persiste entre les renders.

**4. React.memo vs useMemo**
`React.memo` est un HOC qui empeche le re-render d'un composant si ses props n'ont pas change (shallow compare). `useMemo` memorise le résultat d'un calcul a l'interieur d'un composant, recalculant uniquement si les dépendances changent.

**5. params dans Next.js 15**
`params` est de type `Promise<{ slug: string }>` (où le type dynamique correspondant). Il faut `await params` pour acceder aux valeurs. C'est un changement majeur par rapport a Next.js 14.

**6. revalidatePath()**
`revalidatePath()` invalide le cache d'une route spécifique après une mutation (Server Action). Sans lui, la page continuerait d'afficher les donnees en cache.

**7. useFormStatus dans un enfant**
`useFormStatus` lit le statut du `<form>` parent le plus proche. Il doit etre dans un composant enfant car il s'abonne au formulaire via le contexte DOM. S'il est dans le même composant que le `<form>`, il ne peut pas "voir" le formulaire.

**8. Route Handler vs Server Action**
Un Route Handler est un endpoint HTTP classique (GET, POST, etc.) dans un fichier `route.ts`. Une Server Action est une fonction marquee `'use server'` appelee directement depuis le client via RPC (pas de requête HTTP explicite). Les Route Handlers sont pour les API publiques, les Server Actions pour les mutations depuis l'UI.

**9. Éviter le prop drilling**
Utiliser Context API pour les donnees partagees globalement (theme, auth), ou un store externe (Zustand) pour le state applicatif. Composition (passer des composants en children) est aussi une solution.

**10. Zustand vs Context**
Zustand ne provoque de re-render que dans les composants qui utilisent le selecteur concerne. Context re-render tous les consumers quand la valeur change. Zustand est aussi plus simple à utiliser (pas de Provider).

**11. React.lazy()**
`React.lazy()` permet le chargement dynamique d'un composant (code splitting). Il doit etre combine avec `<Suspense>` qui affiche un fallback pendant le chargement.

**12. getByRole vs getByTestId**
`getByRole` selectionne par le role ARIA (accessible). `getByTestId` selectionne par un attribut `data-testid`. `getByRole` est préféré car il garantit l'accessibilité et est plus resilient aux refactorisations.

**13. MSW**
MSW (Mock Service Worker) intercepte les requêtes HTTP au niveau du réseau dans les tests. Il permet de simuler des réponses API (succes, erreur, delai) sans modifier le code du composant.

**14. Server -> Client Component**
Ajouter `'use client'` en première ligne du fichier. Cette directive s'applique au fichier entier et a tous ses imports.

**15. middleware.ts**
Le middleware Next.js s'exécuté avant chaque requête (Edge Runtime). Il permet de rediriger, reecrire, ajouter des headers, vérifier l'authentification, etc. Il se place dans `src/middleware.ts`.

**16. Zod + React Hook Form**
Via le resolver `@hookform/resolvers/zod`. On définit un schema Zod, on infere le type TypeScript avec `z.infer<typeof schema>`, et on passe le resolver a `useForm({ resolver: zodResolver(schema) })`.

**17. Mobile-first Tailwind**
Les classes sans prefix s'appliquent a toutes les tailles. Les prefixes (`sm:`, `md:`, `lg:`) s'appliquent à partir du breakpoint indique (min-width). On code d'abord le mobile, puis on ajoute les variantes pour les ecrans plus grands.

**18. Cleanup de useEffect**
La fonction retournee par le callback de `useEffect` s'exécuté au demontage du composant et avant chaque re-exécution de l'effet. Elle sert a nettoyer les abonnements, timers, etc.

**19. Ne pas muter le state**
React détecté les changements par comparaison de référence (===). Si on mute un objet, sa référence ne change pas, donc React ne declenche pas de re-render. Il faut toujours créer un nouvel objet/tableau.

**20. Le key prop**
`key` permet a React d'identifier chaque élément d'une liste lors du reconciliation. Sans `key` unique et stable, React peut confondre les éléments, causant des bugs visuels et de performance.

---

## Partie 2 : Corrections Live Coding

### LC1 — Counter avec hooks

```tsx
// src/exercises/ex25/Counter.tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState<number>(0);

  // Le compteur ne peut pas descendre en dessous de 0
  function decrement(): void {
    setCount((prev) => Math.max(0, prev - 1));
  }

  function increment(): void {
    setCount((prev) => prev + 1);
  }

  const parity: "pair" | "impair" = count % 2 === 0 ? "pair" : "impair";

  return (
    <div>
      <h2>Compteur : {count}</h2>
      <p>Le nombre est {parity}</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={decrement} disabled={count === 0}>
          -
        </button>
        <button type="button" onClick={increment}>
          +
        </button>
      </div>
    </div>
  );
}
```

**Points clés** :
- `Math.max(0, prev - 1)` empeche les valeurs negatives.
- Le bouton "-" est désactivé quand `count === 0`.
- Le type de `parity` est une union litterale, pas un `string`.

---

### LC2 — Custom hook useDebounce

```ts
// src/exercises/ex25/useDebounce.ts
import { useState, useEffect } from "react";

/**
 * Hook generique qui retourne une valeur debounced.
 * La valeur ne se met a jour qu'apres `delay` ms sans changement.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Creer un timer qui met a jour la valeur apres le delai
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer precedent a chaque changement de value ou delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

```tsx
// Exemple d'utilisation dans un composant de recherche
"use client";

import { useState } from "react";
import { useDebounce } from "./useDebounce";

interface SearchResult {
  id: number;
  title: string;
}

export function SearchComponent() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch quand la valeur debounced change
  useState(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    // Simuler un fetch
    const mockResults: SearchResult[] = [
      { id: 1, title: `Resultat pour "${debouncedQuery}" — 1` },
      { id: 2, title: `Resultat pour "${debouncedQuery}" — 2` },
    ];

    setResults(mockResults);
  });

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher..."
      />
      <p>Recherche : {debouncedQuery || "(vide)"}</p>
      <ul>
        {results.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Points clés** :
- Le hook est générique (`<T>`) : il fonctionne avec `string`, `number`, `object`, etc.
- Le `clearTimeout` dans le cleanup empeche les fuites de mémoire.
- Le delai se reinitialise à chaque changement de `value`.

---

### LC3 — Composant de data fetching

```ts
// src/exercises/ex25/useFetch.ts
import { useState, useEffect } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook generique pour le data fetching.
 */
export function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // AbortController pour annuler le fetch en cas de demontage
    const controller = new AbortController();

    async function fetchData(): Promise<void> {
      setState({ data: null, loading: true, error: null });

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data: T = await response.json();
        setState({ data, loading: false, error: null });
      } catch (err) {
        // Ignorer les erreurs d'annulation
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Erreur inconnue";
        setState({ data: null, loading: false, error: message });
      }
    }

    void fetchData();

    // Cleanup : annuler le fetch si le composant se demonte
    return () => {
      controller.abort();
    };
  }, [url]);

  return state;
}
```

```tsx
// src/exercises/ex25/UserList.tsx
"use client";

import { useFetch } from "./useFetch";

interface User {
  id: number;
  name: string;
  email: string;
}

export function UserList() {
  const { data: users, loading, error } = useFetch<User[]>(
    "https://jsonplaceholder.typicode.com/users"
  );

  if (loading) {
    return <p>Chargement des utilisateurs...</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p style={{ color: "red" }}>Erreur : {error}</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <p>Aucun utilisateur trouve.</p>;
  }

  return (
    <div>
      <h2>Utilisateurs ({users.length})</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <strong>{user.name}</strong> — {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Points clés** :
- `useFetch` est générique : `useFetch<User[]>(url)` infere le type de `data`.
- L'`AbortController` empeche les mises a jour sur un composant demonte.
- Les 3 états (loading, error, success) sont geres explicitement.
- L'interface `User` est definie avec les champs utilises (pas de `any`).

---

## Ce que tu aurais pu oublier

1. **Chronometrer réellement** : en entretien, le temps est compte. 5 minutes pour un Counter semble beaucoup, mais avec le stress et l'explication a voix haute, ça passe vite.

2. **Expliquer en codant** : en entretien, on attend que tu expliques tes choix (`"J'utilise useState car l'etat est simple"`, `"Je mets un generique pour la reutilisabilite"`).

3. **`AbortController` dans useFetch** : c'est un detail que beaucoup oublient en live coding, mais qui montre une bonne maîtrise de `useEffect` et de la gestion des effets asynchrones.

4. **Ne pas commencer par le styling** : en live coding, la logique prime. Les styles viennent en dernier si le temps le permet.

5. **Le QCM revele les lacunes** : si tu as moins de 16/20, relis les cours correspondants avant de passer à un entretien réel.

6. **`setCount((prev) => ...)` avec la forme fonctionnelle** : obligatoire quand la nouvelle valeur depend de l'ancienne. C'est un classique d'entretien.

7. **Les génériques TypeScript** : `useDebounce<T>` et `useFetch<T>` montrent une comprehension avancee de TypeScript. C'est un plus en entretien ESN.

8. **La gestion des erreurs** : `err instanceof Error` est le pattern safe en TypeScript (le `catch` recoit `unknown`, pas `Error`).
