# Correction — Exercice 08 : Context theme

## Résultat attendu

Une page avec un header contenant un bouton de bascule de theme et plusieurs cartes dont le style (couleurs, fond) change dynamiquement entre le mode clair et le mode sombre. Les composants accedent au theme sans prop drilling grace au contexte.

---

## Code corrige

### `src/exercises/ex08/ThemeContext.tsx`

```tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// --- Types exportes ---
export type Theme = "light" | "dark";

export interface ThemeContextValue {
  /** Theme courant */
  theme: Theme;
  /** Basculer entre light et dark */
  toggleTheme: () => void;
}

// --- Creation du contexte ---
// La valeur par defaut est null : on forcera le check dans useTheme
const ThemeContext = createContext<ThemeContextValue | null>(null);

// --- Provider ---
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider
 * Fournit le theme et la fonction de bascule a tous les composants enfants.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// --- Hook consommateur ---

/**
 * Hook useTheme
 * Consomme le ThemeContext. Lance une erreur si utilise hors du ThemeProvider.
 * @returns ThemeContextValue (jamais null grace au guard)
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error(
      "useTheme doit etre utilise a l'interieur d'un <ThemeProvider>."
    );
  }

  return context;
}
```

### `src/exercises/ex08/Header.tsx`

```tsx
import { useTheme } from "./ThemeContext";

/**
 * Composant Header
 * Affiche le theme courant et un bouton pour le basculer.
 */
export default function Header() {
  // Consommer le contexte via le hook personnalise
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        padding: "1rem",
        backgroundColor: theme === "light" ? "#f8f9fa" : "#212529",
        color: theme === "light" ? "#212529" : "#f8f9fa",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h2>Theme actuel : {theme === "light" ? "Clair" : "Sombre"}</h2>
      <button onClick={toggleTheme} type="button">
        Basculer en {theme === "light" ? "sombre" : "clair"}
      </button>
    </header>
  );
}
```

### `src/exercises/ex08/Card.tsx`

```tsx
import { useTheme } from "./ThemeContext";

interface CardProps {
  title: string;
  content: string;
}

/**
 * Composant Card
 * Adapte son style selon le theme courant via le contexte.
 */
export default function Card({ title, content }: CardProps) {
  const { theme } = useTheme();

  // Styles conditionnels selon le theme
  const cardStyle: React.CSSProperties = {
    padding: "1.5rem",
    margin: "1rem 0",
    borderRadius: "8px",
    backgroundColor: theme === "light" ? "#ffffff" : "#343a40",
    color: theme === "light" ? "#212529" : "#f8f9fa",
    border: theme === "light" ? "1px solid #dee2e6" : "1px solid #495057",
    boxShadow:
      theme === "light"
        ? "0 2px 4px rgba(0,0,0,0.1)"
        : "0 2px 4px rgba(0,0,0,0.3)",
  };

  return (
    <div style={cardStyle}>
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
}
```

### `src/exercises/ex08/App.tsx`

```tsx
import { ThemeProvider, useTheme } from "./ThemeContext";
import Header from "./Header";
import Card from "./Card";

/**
 * Composant interne qui utilise le theme pour le fond de page.
 */
function AppContent() {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme === "light" ? "#e9ecef" : "#1a1a2e",
        transition: "background-color 0.3s ease",
      }}
    >
      <Header />
      <main style={{ padding: "1rem" }}>
        <h1>Exercice 08 — Context theme</h1>
        <Card
          title="Premiere carte"
          content="Cette carte adapte son style au theme courant grace au contexte React."
        />
        <Card
          title="Deuxieme carte"
          content="Aucun prop drilling necessaire : le theme est accessible depuis n'importe quel composant enfant."
        />
        <Card
          title="Troisieme carte"
          content="Le Provider enveloppe l'arbre de composants et fournit la valeur du contexte."
        />
      </main>
    </div>
  );
}

/**
 * Composant racine de l'exercice 08.
 * Le ThemeProvider enveloppe tout l'arbre de composants.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Ne pas vérifier que le contexte est `null` dans le hook

- ❌ `const { theme } = useContext(ThemeContext)!;`
  L'assertion non-null (`!`) masque le problème. Si le Provider est absent, crash sans message clair.
- ✅ Vérifier explicitement et lancer une erreur avec un message descriptif.

### 2. Passer le theme en prop a travers tous les niveaux (prop drilling)

- ❌ `App -> Header -> Button` avec `theme` passe en prop à chaque niveau.
  Difficile a maintenir quand l'arbre de composants grandit.
- ✅ `useTheme()` permet a n'importe quel composant d'acceder au theme directement.

### 3. Créer le contexte avec une valeur par defaut non-null

- ❌ `createContext<ThemeContextValue>({ theme: "light", toggleTheme: () => {} });`
  La valeur par defaut masque l'absence de Provider. Le `toggleTheme` par defaut ne fait rien, bug silencieux.
- ✅ `createContext<ThemeContextValue | null>(null)` force la vérification dans le hook.

### 4. Oublier d'envelopper avec le Provider

- ❌ Utiliser `useTheme()` dans un composant qui n'est pas enfant de `<ThemeProvider>`.
  Le contexte retourne `null`, crash ou comportement imprevu.
- ✅ Toujours placer `<ThemeProvider>` au sommet de l'arbre qui a besoin du theme.

### 5. Recreer l'objet `value` à chaque render

- ❌ `<ThemeContext.Provider value={{ theme, toggleTheme }}>` créé un nouvel objet à chaque render.
  Tous les consommateurs se re-rendent même si `theme` n'a pas change.
- ✅ Pour les applications critiques en performance, utiliser `useMemo` sur la valeur du Provider. Ici c'est acceptable car le Provider est à la racine.

---

## Concepts clés utilises

| Concept          | Description                                                           | Documentation                              |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `createContext`  | Créer un contexte React pour partager des donnees sans prop drilling  | [react.dev](https://react.dev/reference/react/createContext) |
| `useContext`     | Consommer la valeur d'un contexte dans un composant                   | [react.dev](https://react.dev/reference/react/useContext) |
| Provider         | Composant qui fournit la valeur du contexte a ses enfants             | [react.dev](https://react.dev/learn/passing-data-deeply-with-context) |
| Hook personnalise | `useTheme()` encapsule `useContext` + validation                     | Bonne pratique React |
| Type guard       | Vérifier que la valeur n'est pas `null` avant de l'utiliser           | Pattern TypeScript |

---

## Pour aller plus loin

- Persiste le theme dans le `localStorage` et restaure-le au montage.
- Ajoute un theme "system" qui suit `prefers-color-scheme` du navigateur.
- Utilise des variables CSS au lieu de styles inline pour un theming plus propre.
