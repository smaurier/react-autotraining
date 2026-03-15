# Correction — Exercice 01 : Premier composant

## Résultat attendu

Une page affichant un titre, un message de bienvenue personnalise et un bouton pour basculer entre le français et l'anglais. A chaque clic, le message change de langue instantanement.

---

## Code corrige

### `src/exercises/ex01/Greeting.tsx`

```tsx
import { useState } from "react";

// --- Typage strict des props ---
export interface GreetingProps {
  /** Prenom de l'utilisateur */
  name: string;
}

// --- Type union pour les langues supportees ---
type Language = "fr" | "en";

// --- Objet de traductions (extensible) ---
const greetings: Record<Language, (name: string) => string> = {
  fr: (name) => `Bonjour, ${name} ! Bienvenue sur React.`,
  en: (name) => `Hello, ${name}! Welcome to React.`,
};

// --- Labels du bouton selon la langue ---
const buttonLabels: Record<Language, string> = {
  fr: "Passer en anglais",
  en: "Switch to French",
};

/**
 * Composant Greeting
 * Affiche un message de bienvenue dans la langue selectionnee.
 */
export default function Greeting({ name }: GreetingProps) {
  // useState avec type explicite et valeur par defaut "fr"
  const [language, setLanguage] = useState<Language>("fr");

  // Valeur derivee : le message est calcule a partir de l'etat
  const message = greetings[language](name);

  // Handler pour basculer la langue
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "fr" ? "en" : "fr"));
  };

  return (
    <div className="greeting">
      {/* Affichage du message */}
      <p className="greeting__message">{message}</p>

      {/* Bouton de bascule */}
      <button onClick={toggleLanguage} type="button">
        {buttonLabels[language]}
      </button>
    </div>
  );
}
```

### `src/exercises/ex01/App.tsx`

```tsx
import Greeting from "./Greeting";

/**
 * Composant racine de l'exercice 01.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 01 — Premier composant</h1>

      {/* Utilisation du composant avec la prop name */}
      <Greeting name="Sophie" />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Ne pas typer `useState`

- ❌ `const [language, setLanguage] = useState("fr");`
  TypeScript infere `string` au lieu de `"fr" | "en"`, ce qui autorise n'importe quelle chaine.
- ✅ `const [language, setLanguage] = useState<Language>("fr");`
  Le type est restreint aux valeurs attendues.

### 2. Muter l'état au lieu d'utiliser le setter

- ❌ `language = "en";`
  React ne détecté pas le changement, le composant ne se re-rend pas.
- ✅ `setLanguage("en");`
  React planifie un re-render avec la nouvelle valeur.

### 3. Oublier le `key` ou le `type` sur le bouton

- ❌ `<button onClick={toggleLanguage}>` (sans `type`)
  Dans un formulaire, un bouton sans `type` est par defaut `submit`, ce qui peut recharger la page.
- ✅ `<button onClick={toggleLanguage} type="button">`
  Explicitement un bouton d'action, pas de soumission.

### 4. Utiliser `React.FC` sans comprendre les implications

- ❌ `const Greeting: React.FC<GreetingProps> = (props) => { ... }`
  Fonctionne mais ajoute implicitement `children` aux props (avant React 18) et masque le typage.
- ✅ `function Greeting({ name }: GreetingProps) { ... }`
  Plus lisible, typage explicite, pas de magie cachee.

### 5. Concatenation de chaines au lieu de template literals

- ❌ `"Bonjour, " + name + " ! Bienvenue sur React."`
  Fonctionne mais moins lisible et plus sujet aux erreurs d'espacement.
- ✅ `` `Bonjour, ${name} ! Bienvenue sur React.` ``
  Plus clair et plus maintenable.

---

## Concepts clés utilises

| Concept         | Description                                                         | Documentation                              |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| JSX             | Syntaxe declarative pour decrire l'UI dans du JavaScript            | [react.dev](https://react.dev/learn/writing-markup-with-jsx) |
| Props           | Donnees passees d'un composant parent à un composant enfant         | [react.dev](https://react.dev/learn/passing-props-to-a-component) |
| `useState`      | Hook pour gérer un état local réactif dans un composant fonction    | [react.dev](https://react.dev/reference/react/useState) |
| Type union      | `"fr" \| "en"` restreint les valeurs possibles d'une variable       | [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) |
| `Record<K, V>`  | Type utilitaire pour créer un objet dont les clés sont du type `K`  | [TS Handbook](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type) |
| Valeur derivee  | Valeur calculee à partir de l'état, sans état supplementaire        | Bonne pratique React |

---

## Pour aller plus loin

- Essaie d'ajouter un `useEffect` qui affiche dans la console la langue courante à chaque changement.
- Transforme les traductions en un fichier JSON separe pour simuler de l'internationalisation (i18n).
- Ajoute des tests unitaires avec Vitest et Testing Library.
