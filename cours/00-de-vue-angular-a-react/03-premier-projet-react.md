# Cours 03 — Premier projet React avec Vite + TypeScript

> **Module 00 — De Vue/Angular a React**
> Durée estimée : 60 min (dont 30 min de pratique)
> Prérequis : Cours 02 — Table d'équivalences triple

---

## Objectif

Créer un projet React from scratch, comprendre sa structure en la comparant à Vue/Angular, et écrire ton premier composant `.tsx`.

---

## 1. Création du projet

```bash
pnpm create vite@latest taskflow --template react-ts
cd taskflow
pnpm install
```

| Action | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Commande | `pnpm create vue@latest` | `npx @angular/cli new app` | `pnpm create vite@latest app --template react-ts` |
| Bundler | Vite | Webpack / esbuild | Vite |
| Temps install | ~10 s | ~30 s | ~8 s |

> Pour Next.js (module 06+), on utilisera `pnpm create next-app@latest`. Ici, Vite pur pour comprendre React sans abstraction.

---

## 2. Tour du projet

```
taskflow/
├── public/
├── src/
│   ├── App.tsx            <- Composant racine
│   ├── main.tsx           <- Point d'entrée
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

| Fichier | Vue 3 (Vite) | Angular 19+ | React (Vite) |
|---|---|---|---|
| Point d'entrée | `src/main.ts` | `src/main.ts` | `src/main.tsx` |
| Composant racine | `src/App.vue` | `src/app/app.component.ts` | `src/App.tsx` |
| HTML | `index.html` | `src/index.html` | `index.html` |

### Point d'entrée : main.tsx

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

- `createRoot` = `createApp` (Vue) = `bootstrapApplication` (Angular).
- `StrictMode` active des vérifications en dev (double-invocation des effets). **Aucun effet en production.**
- Le `!` est une assertion TypeScript non-null.

---

## 3. Ton premier composant

Remplace le contenu de `App.tsx` :

```tsx
// src/App.tsx
import { TaskCard } from './components/TaskCard';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>TaskFlow</h1>
      <TaskCard title="Apprendre React" done={false} />
      <TaskCard title="Comprendre JSX" done={true} />
    </div>
  );
}
export default App;
```

Crée `src/components/TaskCard.tsx` :

```tsx
interface TaskCardProps {
  title: string;
  done: boolean;
}

export function TaskCard({ title, done }: TaskCardProps) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h3>{title}</h3>
      <p>{done ? 'Terminée' : 'En cours'}</p>
    </div>
  );
}
```

| Étape | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Fichier | `TaskCard.vue` | `task-card.component.ts` | `TaskCard.tsx` |
| Props | `defineProps<T>()` | `input.required<T>()` | Interface + destructuring |
| Export | Auto (SFC) | `export class` | `export function` |
| Usage | `<TaskCard />` dans template | `imports: [...]` + `<app-task-card>` | `import` + `<TaskCard />` |

Points a noter :
- Pas de **sélecteur** (`app-task-card`). Le nom est celui de la fonction importée.
- Pas de **module `imports`** comme en Angular. Un `import` JS suffit.
- Les composants commencent par une **majuscule**. Les minuscules sont des éléments HTML natifs.

---

## 4. La syntaxe JSX

### `className` et `htmlFor`

```tsx
// class et for sont des mots réservés JS
<div className="container">       {/* ✅ au lieu de class */}
<label htmlFor="email">           {/* ✅ au lieu de for */}
```

### Expressions `{}`

```tsx
<p>Bonjour {name}</p>              {/* interpolation */}
<p>{isAdmin ? 'Admin' : 'User'}</p> {/* ternaire */}
<p>{name.toUpperCase()}</p>         {/* appel de fonction */}
```

En Vue/Angular : `{{ }}`. En React : une seule paire `{}`.

### Fragments

```tsx
// ❌ Deux racines sans wrapper
return (<h1>Titre</h1><p>Texte</p>);

// ✅ Fragment (pas de noeud DOM supplémentaire)
return (<><h1>Titre</h1><p>Texte</p></>);
```

Vue 3 et Angular supportent les multi-root nativement. En React : `<>...</>` ou `<Fragment key={id}>`.

### Style inline

```tsx
// Vue/Angular : string -> "color: red; font-size: 14px"
// React : objet JS, camelCase, px implicite
<div style={{ color: 'red', fontSize: 14 }}>
```

### Tags auto-fermants

```tsx
// JSX exige la fermeture explicite
<img src="photo.jpg" />
<br />
<input type="text" />
```

### Commentaires

```tsx
{/* Commentaire JSX (pas de <!-- -->) */}
```

---

## 5. Lancer le projet

```bash
pnpm dev
```

| | Vue 3 (Vite) | Angular 19+ | React (Vite) |
|---|---|---|---|
| Dev server | `pnpm dev` | `ng serve` | `pnpm dev` |
| Port | 5173 | 4200 | 5173 |
| HMR | Oui | Oui | Oui |
| Build | `pnpm build` | `ng build` | `pnpm build` |

Modifie le texte dans `TaskCard.tsx` et observe le Hot Module Replacement : mise a jour instantanée sans perdre le state.

---

## 6. Ajouter de l'interactivité

Modifie `TaskCard` pour y ajouter du state :

```tsx
import { useState } from 'react';

interface TaskCardProps {
  title: string;
  initialDone?: boolean;
}

export function TaskCard({ title, initialDone = false }: TaskCardProps) {
  const [done, setDone] = useState(initialDone);

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: 8, opacity: done ? 0.6 : 1 }}>
      <h3>{title}</h3>
      <label>
        <input type="checkbox" checked={done} onChange={() => setDone(prev => !prev)} />
        {' '}{done ? 'Terminée' : 'En cours'}
      </label>
    </div>
  );
}
```

Ce que tu remarques :
- `useState` retourne `[valeur, setter]`.
- Le setter accepte une fonction (`prev => !prev`) pour se baser sur la valeur précédente.
- Le checkbox est un **controlled input** : `checked` + `onChange`. Pas de `v-model`.

---

## 7. Résumé des différences

| Concept | Vue / Angular | React |
|---|---|---|
| Fichier composant | `.vue` / `.component.ts` | `.tsx` |
| Template | `<template>` / HTML dans `@Component` | JSX retourné par la fonction |
| Classe CSS | `class` | `className` |
| Style inline | String | Objet JS camelCase |
| Interpolation | `{{ }}` | `{ }` |
| Fragment | Implicite | `<>...</>` |
| Props | `defineProps()` / `input()` | Interface + destructuring |
| State local | `ref()` / `signal()` | `useState()` |
| Binding input | `v-model` / `[(ngModel)]` | `value` + `onChange` |

---

## A retenir

1. Un composant React est une **fonction** qui retourne du **JSX**.
2. Les props sont les **paramètres** de la fonction, typés par une interface TypeScript.
3. Le state est géré par `useState` : `[valeur, setter]`.
4. JSX utilise `className`, `htmlFor`, et `{}` (pas `{{ }}`).
5. Tous les tags doivent être **fermés explicitement**.
6. Les fragments `<>...</>` remplacent le multi-root des templates Vue/Angular.

---

## Exercice

Passe maintenant a l'exercice : [`exercices/00-premier-composant.md`](../../exercices/00-premier-composant.md)

Tu y créeras un composant `<Greeting />` avec des props typées et du state local.

---

## Prochaine étape

Module suivant : [01 — Composants & JSX](../01-composants-jsx/)

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Exercice** : [01-premier-composant](../../exercices/01-premier-composant/ENONCE)
:::
