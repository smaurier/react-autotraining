# Cours 11 — useRef et le DOM

> **Objectif** : Comprendre `useRef` sous ses deux facettes — conteneur de valeur persistante (sans re-render) et accès direct au DOM — maîtriser `forwardRef` et `useImperativeHandle`, et transposer les template refs Vue/Angular vers React.

---

## Rappel du cours précédent

<details>
<summary>1. Quelles sont les 3 formes de `useEffect` et quand s'exécutent-elles ?</summary>

- `useEffect(fn)` : après **chaque** rendu
- `useEffect(fn, [])` : au **montage** uniquement (et cleanup au démontage)
- `useEffect(fn, [deps])` : quand une **dépendance** change

</details>

<details>
<summary>2. Pourquoi ne peut-on pas passer une fonction `async` directement à `useEffect` ?</summary>

`useEffect` attend que le callback retourne soit `undefined` soit une **cleanup function**. Une fonction `async` retourne une `Promise`, ce qui n'est pas une cleanup valide. La solution : créer une fonction async interne et l'appeler immédiatement.
</details>

<details>
<summary>3. Quel est l'anti-pattern le plus courant avec `useEffect` ?</summary>

Utiliser `useEffect` pour calculer un **état dérivé** (valeur calculée à partir d'autres valeurs). Il faut simplement déclarer une variable ou utiliser `useMemo`.
</details>

---

## Analogie

`useRef` est comme un **tiroir dans votre bureau**. Vous pouvez y ranger ce que vous voulez et le consulter à tout moment. Contrairement au tableau blanc (`useState`), ouvrir ou fermer le tiroir ne déclenche **aucune photo** (aucun re-render). Le contenu persiste entre les rendus, mais sa modification est silencieuse. C'est idéal pour stocker des identifiants de timer, des valeurs précédentes, ou une référence directe à un élément DOM.

---

## Théorie

### 1. useRef comme conteneur de valeur persistante

```tsx
import { useRef, useState, useEffect } from "react";

function StopWatch() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  };

  const reset = () => {
    stop();
    setSeconds(0);
  };

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div>
      <p>{seconds}s</p>
      <button onClick={start} disabled={isRunning}>Démarrer</button>
      <button onClick={stop} disabled={!isRunning}>Arrêter</button>
      <button onClick={reset}>Réinitialiser</button>
    </div>
  );
}
```

> **Pourquoi pas `useState` pour `intervalRef` ?** Parce que modifier l'identifiant du timer ne doit **pas** déclencher de re-render. Un `useState` causerait un rendu inutile.

### 2. Stocker la valeur précédente

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  });

  return ref.current; // Retourne la valeur d'AVANT le rendu actuel
}

// Utilisation
function PriceDisplay({ price }: { price: number }) {
  const previousPrice = usePrevious(price);

  const trend =
    previousPrice === undefined
      ? "neutral"
      : price > previousPrice
        ? "up"
        : price < previousPrice
          ? "down"
          : "neutral";

  return (
    <p>
      Prix : {price} EUR
      {trend === "up" && " (hausse)"}
      {trend === "down" && " (baisse)"}
    </p>
  );
}
```

### 3. Accéder au DOM avec useRef

```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus automatique au montage
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder="Focus automatique" />;
}
```

Exemples courants d'accès DOM :

```tsx
function DomExamples() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Canvas — accéder au contexte 2D
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.fillRect(0, 0, 100, 100);

    // Video — contrôler la lecture
    videoRef.current?.play();

    // Div — mesurer les dimensions
    const rect = divRef.current?.getBoundingClientRect();
    console.log("Dimensions:", rect?.width, rect?.height);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} width={200} height={200} />
      <video ref={videoRef} src="/video.mp4" />
      <div ref={divRef}>Contenu mesurable</div>
    </>
  );
}
```

### 4. Typage des refs DOM

| Élément HTML   | Type TypeScript               |
|----------------|-------------------------------|
| `<input>`      | `HTMLInputElement`            |
| `<button>`     | `HTMLButtonElement`           |
| `<div>`        | `HTMLDivElement`              |
| `<canvas>`     | `HTMLCanvasElement`           |
| `<video>`      | `HTMLVideoElement`            |
| `<form>`       | `HTMLFormElement`             |
| `<a>`          | `HTMLAnchorElement`           |
| `<img>`        | `HTMLImageElement`            |

```tsx
// ✅ Type correct pour une ref DOM
const inputRef = useRef<HTMLInputElement>(null);

// ❌ Oublier le type — ref.current est `undefined`, pas l'élément DOM
const inputRef = useRef(null); // TS ne sait pas que c'est un HTMLInputElement
```

### 5. forwardRef — transmettre une ref à un composant enfant

Par défaut, un composant fonction ne peut **pas** recevoir de `ref`. Il faut utiliser `forwardRef` (où, depuis React 19, la prop `ref` directement) :

```tsx
import { forwardRef, useRef } from "react";

// Composant enfant qui accepte une ref
interface CustomInputProps {
  label: string;
  error?: string;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ label, error }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} className={error ? "input-error" : ""} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";

// Composant parent qui utilise la ref
function Form() {
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    nameRef.current?.focus(); // Accès direct à l'input interne
  };

  return (
    <>
      <CustomInput ref={nameRef} label="Nom" />
      <button onClick={handleSubmit}>Focus sur le nom</button>
    </>
  );
}
```

> **React 19** : `ref` est désormais une prop standard. `forwardRef` n'est plus strictement nécessaire, mais reste très courant dans les codebases existantes et les librairies.

```tsx
// ✅ React 19 — ref comme prop standard (nouveau)
interface CustomInputProps {
  label: string;
  ref?: React.Ref<HTMLInputElement>;
}

function CustomInput({ label, ref }: CustomInputProps) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} />
    </div>
  );
}
```

### 6. useImperativeHandle — exposer une API personnalisée

Rarement nécessaire, mais utile pour les composants complexes (et question d'entretien) :

```tsx
import { forwardRef, useRef, useImperativeHandle } from "react";

interface CounterHandle {
  reset: () => void;
  increment: () => void;
  getValue: () => number;
}

const FancyCounter = forwardRef<CounterHandle>((_, ref) => {
  const [count, setCount] = useState(0);

  useImperativeHandle(ref, () => ({
    reset: () => setCount(0),
    increment: () => setCount((c) => c + 1),
    getValue: () => count,
  }));

  return <p>Compteur interne : {count}</p>;
});

FancyCounter.displayName = "FancyCounter";

// Utilisation depuis le parent
function App() {
  const counterRef = useRef<CounterHandle>(null);

  return (
    <>
      <FancyCounter ref={counterRef} />
      <button onClick={() => counterRef.current?.increment()}>+1</button>
      <button onClick={() => counterRef.current?.reset()}>Reset</button>
    </>
  );
}
```

> **Quand l'utiliser** : intégration de librairies impératives (cartes, éditeurs rich text), animations complexes. Dans la majorité des cas, préférez les props et callbacks.

### 7. Ref vs State : quand utiliser quoi ?

| Besoin                                    | `useState`     | `useRef`       |
|-------------------------------------------|----------------|----------------|
| Afficher une valeur dans le JSX           | ✅              | ❌             |
| Déclencher un re-render à la modification | ✅              | ❌             |
| Persister une valeur entre les rendus     | ✅              | ✅             |
| Stocker un ID de timer / AbortController  | ❌ (overkill)   | ✅             |
| Accéder à un élément DOM                  | ❌              | ✅             |
| Compter le nombre de rendus (debug)       | ❌ (boucle)     | ✅             |

```tsx
// ✅ useRef pour compter les rendus (debug)
function DebugComponent() {
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`Rendu n°${renderCount.current}`);

  return <p>Voir la console</p>;
}
```

### 8. Comparaison : template refs Vue/Angular vs useRef

| Aspect                  | Vue 3                         | Angular 19+                    | React                          |
|-------------------------|-------------------------------|--------------------------------|--------------------------------|
| Ref DOM                 | `const el = ref<HTMLInputElement>()` + `ref="el"` | `@ViewChild('el')` ou `viewChild<ElementRef>('el')` | `useRef<HTMLInputElement>(null)` + `ref={el}` |
| Accès                   | `el.value?.focus()`           | `this.el()?.nativeElement.focus()` | `el.current?.focus()`         |
| Ref sur composant       | `ref="comp"` expose tout      | `@ViewChild(CompType)`         | `forwardRef` + `useImperativeHandle` |
| API impérative          | `defineExpose({ ... })`       | Accès direct au composant      | `useImperativeHandle`          |

```tsx
// Vue 3
const inputEl = ref<HTMLInputElement>();
onMounted(() => inputEl.value?.focus());
// <input ref="inputEl" />

// Angular 19
inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
ngAfterViewInit() { this.inputEl()?.nativeElement.focus(); }
// <input #inputEl />

// React
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => { inputRef.current?.focus(); }, []);
// <input ref={inputRef} />
```

---

## Pratique

### Exercice : composant de mesure de taille

Créez un composant `ResizeObserverBox` qui :
1. Affiche un `<div>` redimensionnable (avec `resize: both` en CSS)
2. Utilise un `useRef` pour accéder à cette `<div>`
3. Utilise un `useEffect` + `ResizeObserver` pour surveiller ses dimensions
4. Affiche la largeur et hauteur en temps réel
5. Nettoie le `ResizeObserver` au démontage

<details>
<summary>Voir la solution</summary>

```tsx
import { useState, useRef, useEffect } from "react";

interface Dimensions {
  width: number;
  height: number;
}

function ResizeObserverBox() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.round(width), height: Math.round(height) });
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <p>
        Dimensions : {dimensions.width} x {dimensions.height} px
      </p>
      <div
        ref={boxRef}
        style={{
          width: 200,
          height: 150,
          resize: "both",
          overflow: "auto",
          border: "2px solid #333",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
        }}
      >
        Redimensionnez-moi !
      </div>
    </div>
  );
}

export default ResizeObserverBox;
```
</details>

---

## Résumé

| Concept                    | Ce qu'il faut retenir                                        |
|----------------------------|--------------------------------------------------------------|
| `useRef<T>(init)`          | Conteneur `.current` — persiste entre rendus, pas de re-render |
| Ref DOM                    | `useRef<HTMLXxxElement>(null)` + `ref={myRef}`               |
| `forwardRef`               | Transmet une ref à un composant enfant (legacy, toujours courant) |
| React 19 `ref` prop       | `ref` devient une prop standard (plus besoin de `forwardRef`)|
| `useImperativeHandle`      | Expose une API impérative personnalisée — usage rare         |
| Ref vs State               | Ref = silencieux, State = re-render                          |

> **Prochain cours** : [Cours 12 — useCallback et useMemo](./04-usecallback-usememo.md)
