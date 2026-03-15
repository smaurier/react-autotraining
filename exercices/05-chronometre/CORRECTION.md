# Correction — Exercice 05 : Chronometre

## Résultat attendu

Un chronometre affichant le temps au format `MM:SS.ms` avec trois boutons : Démarrer, Arreter et Reset. Le chronometre se met a jour toutes les 10 millisecondes et l'intervalle est correctement nettoye au demontage.

---

## Code corrige

### `src/exercises/ex05/Stopwatch.tsx`

```tsx
import { useState, useRef, useEffect } from "react";

/**
 * Formater un temps en millisecondes au format MM:SS.ms
 * @param ms - Temps en millisecondes
 * @returns Chaine formatee (ex : "01:23.45")
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const pad2 = (n: number): string => n.toString().padStart(2, "0");

  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
}

/**
 * Composant Stopwatch
 * Chronometre avec demarrage, arret et reset.
 */
export default function Stopwatch() {
  // --- Etats ---
  const [time, setTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // --- Ref pour stocker l'id de l'intervalle ---
  // useRef ne declenche pas de re-render quand sa valeur change
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Nettoyage au demontage du composant ---
  useEffect(() => {
    // La fonction de cleanup est appelee quand le composant est demonte
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // [] = execute une seule fois au montage, cleanup au demontage

  // --- Handlers ---

  /** Demarrer le chronometre */
  const start = () => {
    if (isRunning) return; // eviter de lancer plusieurs intervalles

    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setTime((prev) => prev + 10);
    }, 10);
  };

  /** Arreter le chronometre */
  const stop = () => {
    if (!isRunning) return;

    setIsRunning(false);

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /** Remettre a zero */
  const reset = () => {
    // Arreter l'intervalle s'il tourne
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsRunning(false);
    setTime(0);
  };

  return (
    <div className="stopwatch">
      {/* Affichage du temps formate */}
      <div className="stopwatch__display">
        <span className="stopwatch__time">{formatTime(time)}</span>
      </div>

      {/* Boutons de controle */}
      <div className="stopwatch__controls">
        <button onClick={start} disabled={isRunning} type="button">
          Demarrer
        </button>
        <button onClick={stop} disabled={!isRunning} type="button">
          Arreter
        </button>
        <button onClick={reset} type="button">
          Reset
        </button>
      </div>

      {/* Indicateur d'etat */}
      <p className="stopwatch__status">
        Statut : {isRunning ? "En cours" : "Arrete"}
      </p>
    </div>
  );
}
```

### `src/exercises/ex05/App.tsx`

```tsx
import Stopwatch from "./Stopwatch";

/**
 * Composant racine de l'exercice 05.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 05 — Chronometre</h1>
      <Stopwatch />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Utiliser `useState` au lieu de `useRef` pour l'intervalle

- ❌ `const [intervalId, setIntervalId] = useState<number | null>(null);`
  Chaque appel a `setIntervalId` declenche un re-render inutile. De plus, l'id est une valeur technique qui n'a pas besoin d'etre affichee.
- ✅ `const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);`
  `useRef` conserve la valeur entre les renders sans re-render.

### 2. Oublier le nettoyage dans `useEffect`

- ❌ Pas de cleanup : si le composant est demonte pendant que le chronometre tourne, l'intervalle continue en arriere-plan (fuite mémoire).
- ✅ `useEffect(() => { return () => { clearInterval(intervalRef.current); }; }, []);`
  Le cleanup est appele au demontage, l'intervalle est stoppe.

### 3. Lancer plusieurs intervalles

- ❌ Cliquer plusieurs fois sur "Démarrer" lance plusieurs `setInterval` qui s'empilent, accelerant le compteur.
- ✅ Vérifier `if (isRunning) return;` au debut de `start()` ou désactiver le bouton avec `disabled={isRunning}`.

### 4. Typer `useRef` comme `number`

- ❌ `useRef<number>(null)` — dans un environnement Node/navigateur, `setInterval` peut retourner un `NodeJS.Timeout` ou un `number`.
- ✅ `useRef<ReturnType<typeof setInterval> | null>(null)` fonctionne partout grâce à l'inference.

### 5. Mauvais calcul du formatage

- ❌ Oublier de convertir correctement les millisecondes en minutes/secondes/centiemes.
- ✅ Extraire dans une fonction pure `formatTime` avec `Math.floor` et `padStart`.

---

## Concepts clés utilises

| Concept              | Description                                                            | Documentation                              |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| `useRef`             | Stocker une valeur mutable qui persiste entre les renders sans re-render | [react.dev](https://react.dev/reference/react/useRef) |
| `useEffect` cleanup  | Fonction retournee par `useEffect`, executee au demontage              | [react.dev](https://react.dev/reference/react/useEffect) |
| `setInterval`        | Exécuter une fonction a intervalles reguliers                          | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/setInterval) |
| `clearInterval`      | Stopper un intervalle lance avec `setInterval`                         | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/clearInterval) |
| `ReturnType<typeof>` | Extraire le type de retour d'une fonction                              | [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) |
| `padStart`           | Completer une chaine avec des caracteres en debut                      | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) |

---

## Pour aller plus loin

- Ajoute un système de tours (laps) avec un bouton "Tour" et une liste des temps.
- Utilise `performance.now()` au lieu de compter les increments pour un chrono plus précis.
- Ajoute une barre de progression circulaire animee avec CSS.
