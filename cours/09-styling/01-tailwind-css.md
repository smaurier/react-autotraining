# Cours 36 — Tailwind CSS : le standard styling en React

> **Objectif** : Comprendre l'approche utility-first de Tailwind CSS, maîtriser les classes essentielles (layout, spacing, couleurs, typographie, responsive, dark mode), utiliser la fonction `cn()` pour combiner les classes conditionnellement, et construire des composants React réutilisables avec Tailwind.

---

## Rappel du cours précédent

<details>
<summary>1. Qu'est-ce qu'un Error Boundary et pourquoi est-ce une class component ?</summary>

Un Error Boundary capture les erreurs de rendu JavaScript dans son arbre de composants enfants. C'est une class component car les méthodes `getDerivedStateFromError` et `componentDidCatch` n'existent que dans les classes. C'est la seule raison légitime d'écrire une class component en React moderne.
</details>

<details>
<summary>2. Quel est l'ordre recommandé pour le pattern ErrorBoundary + Suspense ?</summary>

`ErrorBoundary` (extérieur) → `Suspense` (intérieur) → composant de données (enfant). L'ErrorBoundary capture les erreurs, Suspense gère le loading, et le composant enfant peut "suspendre" pendant le fetch.
</details>

<details>
<summary>3. Comment Next.js 15 gère-t-il les Error Boundaries et le loading ?</summary>

Via les fichiers spéciaux `error.tsx` (Error Boundary automatique, doit être un Client Component) et `loading.tsx` (Suspense fallback automatique) dans le répertoire de la route. Chaque segment de route peut avoir ses propres fichiers.
</details>

---

## Analogie

Pensez à Tailwind comme un **catalogue de stickers** : au lieu de dessiner chaque illustration à la main (CSS custom), vous collez des stickers prédéfinis (`flex`, `p-4`, `bg-blue-500`) pour composer votre design. C'est rapide, cohérent, et tout le monde dans l'équipe utilise le même catalogue. Comparé au CSS classique où chaque développeur invente ses propres noms de classes, Tailwind impose un **vocabulaire commun** — comme un design system intégré.

---

## Théorie

### 1. Pourquoi Tailwind en 2025 ?

| Critère | CSS classique | CSS Modules | Tailwind |
|---------|--------------|-------------|----------|
| Nommage | Inventer des noms | Noms scopés automatiques | Pas de noms à inventer |
| Taille du bundle | Croît avec le projet | Croît avec le projet | Purge automatique |
| Cohérence design | Manuelle | Manuelle | Tokens intégrés (spacing, colors) |
| Adoption ESN (React) | Faible | Moyenne | Très forte |
| DX (autocomplétion) | Limitée | Limitée | Excellente (extension VS Code) |

> **En ESN**, Tailwind est devenu le standard de facto pour les projets React/Next.js. Les fiches de poste mentionnent souvent "React + Tailwind".

### 2. Setup avec Next.js 15

`create-next-app` inclut Tailwind par défaut. Si vous avez choisi "Yes" à la question Tailwind lors de la création du projet, tout est déjà configuré :

```bash
npx create-next-app@latest mon-app
# ✔ Would you like to use Tailwind CSS? → Yes
```

Fichiers générés :

```
app/globals.css       ← Import Tailwind
postcss.config.mjs    ← PostCSS avec Tailwind
```

```css
/* app/globals.css */
@import "tailwindcss";
```

> **Tailwind v4 (fevrier 2025)** : Tailwind v4 remplace le fichier `tailwind.config.ts` par une configuration CSS-native avec `@theme`. L'ancien fichier de config reste supporte via `@config './tailwind.config.ts'` pour la migration progressive.

**Avant / Apres :**

```ts
// ❌ Tailwind v3 — tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: { brand: "#6366f1" },
    },
  },
} satisfies Config;
```

```css
/* ✅ Tailwind v4 — dans globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #6366f1;
}
```

### 3. Classes essentielles

#### Layout : Flexbox et Grid

```tsx
// Flexbox
<div className="flex items-center justify-between gap-4">
  <span>Gauche</span>
  <span>Droite</span>
</div>

// Grid
<div className="grid grid-cols-3 gap-6">
  <div>Col 1</div>
  <div>Col 2</div>
  <div>Col 3</div>
</div>

// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 colonne mobile, 2 tablette, 3 desktop */}
</div>
```

#### Spacing : padding et margin

Le système utilise une échelle de 4px : `1` = 4px, `2` = 8px, `4` = 16px, `6` = 24px, `8` = 32px.

```tsx
<div className="p-4">         {/* padding: 16px partout */}
<div className="px-6 py-2">   {/* padding horizontal 24px, vertical 8px */}
<div className="mt-4 mb-8">   {/* margin-top 16px, margin-bottom 32px */}
<div className="space-y-4">   {/* gap vertical de 16px entre enfants */}
```

#### Couleurs

```tsx
<p className="text-gray-700">Texte gris foncé</p>
<div className="bg-blue-500">Fond bleu</div>
<div className="border border-gray-200">Bordure grise claire</div>
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Bouton avec hover
</button>
```

#### Typographie

```tsx
<h1 className="text-3xl font-bold">Titre</h1>
<p className="text-sm text-gray-500 leading-relaxed">
  Petit texte gris avec interligne aéré
</p>
<span className="text-xs uppercase tracking-wide font-medium">
  Label
</span>
```

#### Dimensions et bordures

```tsx
<div className="w-full max-w-md">    {/* Largeur max 28rem */}
<div className="h-screen">           {/* Hauteur 100vh */}
<div className="rounded-lg">         {/* Border radius large */}
<div className="shadow-md">          {/* Ombre moyenne */}
<img className="w-12 h-12 rounded-full object-cover" />  {/* Avatar */}
```

### 4. Responsive design

Les breakpoints sont des préfixes qui s'appliquent **à partir de** cette taille (mobile-first) :

| Préfixe | Min-width | Usage |
|---------|-----------|-------|
| (rien) | 0px | Mobile par défaut |
| `sm:` | 640px | Petit écran |
| `md:` | 768px | Tablette |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Grand écran |
| `2xl:` | 1536px | Très grand écran |

```tsx
// ✅ Mobile-first : on part du mobile et on ajoute pour les grands écrans
<div className="flex flex-col md:flex-row gap-4">
  <aside className="w-full md:w-64">Sidebar</aside>
  <main className="flex-1">Contenu principal</main>
</div>

// ✅ Texte responsive
<h1 className="text-xl sm:text-2xl lg:text-4xl font-bold">
  Titre adaptatif
</h1>
```

### 5. Dark mode

```tsx
// tailwind.config.ts (v3)
export default {
  darkMode: "class", // Active le dark mode par classe
  // ...
} satisfies Config;
```

> **Tailwind v4** : le dark mode par classe est active par defaut (`@custom-variant dark (&:where(.dark, .dark *))` dans le CSS). Plus besoin de `tailwind.config.ts` pour cela. Si vous migrez progressivement, ajoutez `@config './tailwind.config.ts'` dans votre CSS.

```tsx
// Composant avec dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 className="text-2xl font-bold">Mon App</h1>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>

// Toggle dark mode (ajouter/retirer la classe "dark" sur <html>)
function ThemeToggle() {
  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
      Basculer le thème
    </button>
  );
}
```

### 6. La fonction cn() : combiner les classes conditionnellement

La convention dans l'écosystème React est d'utiliser `cn()` qui combine `clsx` et `tailwind-merge` :

```bash
npm install clsx tailwind-merge
```

```tsx
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}

function Button({ variant = "primary", size = "md", className, children }: ButtonProps) {
  return (
    <button
      className={cn(
        // Classes de base
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        // Variants
        {
          "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",
          "bg-gray-200 text-gray-900 hover:bg-gray-300": variant === "secondary",
          "bg-red-600 text-white hover:bg-red-700": variant === "danger",
        },
        // Tailles
        {
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 text-sm": size === "md",
          "h-12 px-6 text-base": size === "lg",
        },
        // Classes externes (override possible)
        className
      )}
    >
      {children}
    </button>
  );
}
```

> **Pourquoi `tailwind-merge` ?** Sans lui, `cn("p-4", "p-2")` donnerait `"p-4 p-2"` (conflit). Avec `twMerge`, le résultat est `"p-2"` — la dernière classe gagne, comme en CSS natif.

### 7. Composants patterns avec Tailwind

#### Card

```tsx
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-gray-600 dark:text-gray-400">{children}</div>
    </div>
  );
}
```

#### Badge

```tsx
function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-gray-100 text-gray-800": variant === "default",
          "bg-green-100 text-green-800": variant === "success",
          "bg-yellow-100 text-yellow-800": variant === "warning",
          "bg-red-100 text-red-800": variant === "error",
        }
      )}
    >
      {children}
    </span>
  );
}
```

#### Input

```tsx
function Input({ label, error, ...props }: {
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        className={cn(
          "w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-700"
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

---

## Pratique

### Exercice : créer une page de liste de tâches avec Tailwind

Créez une page responsive avec :
- Un header avec titre et bouton "Ajouter"
- Une grille de cartes de tâches (1 colonne mobile, 2 tablette, 3 desktop)
- Chaque carte a un titre, une description, un badge de statut et un bouton "Supprimer"
- Support du dark mode

<details>
<summary>Voir la solution</summary>

```tsx
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
}

const statusConfig = {
  todo: { label: "A faire", className: "bg-gray-100 text-gray-800" },
  "in-progress": { label: "En cours", className: "bg-blue-100 text-blue-800" },
  done: { label: "Terminé", className: "bg-green-100 text-green-800" },
};

function TaskCard({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const status = statusConfig[task.status];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {task.title}
        </h3>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            status.className
          )}
        >
          {status.label}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
        {task.description}
      </p>
      <button
        onClick={() => onDelete(task.id)}
        className="self-end text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
      >
        Supprimer
      </button>
    </div>
  );
}

export default function TaskListPage() {
  const tasks: Task[] = [
    { id: "1", title: "Configurer le projet", description: "Installer Next.js, Tailwind, ESLint", status: "done" },
    { id: "2", title: "Créer les composants", description: "Card, Button, Badge, Input", status: "in-progress" },
    { id: "3", title: "Implémenter l'API", description: "Routes CRUD pour les tâches", status: "todo" },
    { id: "4", title: "Ajouter les tests", description: "Vitest + React Testing Library", status: "todo" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Mes tâches
          </h1>
          <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Ajouter
          </button>
        </div>

        {/* Grid responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={(id) => console.log("Delete", id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Utility-first | Classes atomiques plutôt que CSS custom |
| Mobile-first | Sans préfixe = mobile, `md:` = tablette, `lg:` = desktop |
| Dark mode | Préfixe `dark:` + `darkMode: "class"` dans la config |
| `cn()` | `clsx` + `tailwind-merge` pour combiner les classes |
| Composants | Encapsuler les classes Tailwind dans des composants React |
| Purge | Tailwind supprime automatiquement les classes non utilisées |

> **Prochain cours** : [Cours 37 — CSS Modules et alternatives](./02-css-modules-et-alternatives.md)
