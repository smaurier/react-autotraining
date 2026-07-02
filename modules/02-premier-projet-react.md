---
titre: Premier projet React
cours: 04-react
notions: [créer un projet avec Vite, structure d'un projet React TypeScript, point d'entrée et composant racine, script de dev, TSX et rendu, premier composant fonctionnel, imports et exports de composants]
outcomes: [créer un projet React TypeScript avec Vite, comprendre la structure et le point d'entrée, écrire et rendre un premier composant]
prerequis: [01-equivalences-triple]
next: 03-jsx-en-profondeur
libs: [{ name: react, version: "^19" }, { name: vite, version: "^6" }]
tribuzen: bootstrap de l'admin web de TribuZen (premier composant du dashboard)
last-reviewed: 2026-07
---

# Premier projet React

> **Outcomes — tu sauras FAIRE :** créer un projet React TypeScript avec Vite, lire et modifier sa structure, écrire et rendre un premier composant fonctionnel.
> **Difficulté :** :star:

## 1. Cas concret d'abord

Tu rejoins TribuZen. La partie front existante (Vue) gère le site public. Tu dois maintenant bootstrapper l'**admin web** — une interface React/TypeScript séparée que les coachs TribuZen utiliseront pour piloter les familles.

Ton chef te dit : « Crée le projet, pose un premier composant `AdminLayout`, et lance le dev server. »

Avant de lire la théorie, essaie d'écrire ces deux commandes de mémoire :

```bash
# Initialiser le projet
pnpm create vite@latest tribuzen-admin -- --template react-ts
cd tribuzen-admin && pnpm install && pnpm dev
```

Si tu ne sais pas pourquoi `react-ts` et pas `react`, ni ce que `main.tsx` fait concrètement — c'est exactement ce que ce module couvre.

---

## 2. Théorie complète, concise

### 2.1 Créer un projet React TypeScript avec Vite

Vite est le bundler recommandé pour React (remplace Create React App, déprécié depuis 2023). Le template `react-ts` génère un projet prêt pour TypeScript sans configuration supplémentaire.

```bash
# Création interactive (Vite demande le nom du projet et le template)
pnpm create vite@latest

# Ou directement, tout en une commande :
pnpm create vite@latest mon-app -- --template react-ts
cd mon-app
pnpm install
pnpm dev
```

Vite 6 démarre en moins de 300 ms (esbuild pour le dev, Rollup pour le build). Le dev server tourne par défaut sur `http://localhost:5173`.

### 2.2 Structure d'un projet React TypeScript

```
mon-app/
├── public/              ← assets statiques servis tels quels
├── src/
│   ├── App.tsx          ← composant racine
│   ├── App.css
│   ├── main.tsx         ← point d'entrée JS
│   ├── index.css
│   └── vite-env.d.ts    ← types Vite (import.meta.env, etc.)
├── index.html           ← seul HTML — Vite injecte le bundle ici
├── package.json
├── tsconfig.json
├── tsconfig.app.json
└── vite.config.ts
```

Comparaison rapide :

| | Vue 3 (Vite) | React (Vite) |
|---|---|---|
| Point d'entrée | `src/main.ts` | `src/main.tsx` |
| Composant racine | `src/App.vue` | `src/App.tsx` |
| Extension fichiers | `.vue` | `.tsx` (JSX + TS) |
| HTML racine | `index.html` | `index.html` |

La différence clé : en React, il n'y a **pas de format de fichier dédié** (pas de `.vue`). Un composant est un fichier TypeScript ordinaire qui utilise JSX — d'où l'extension `.tsx`.

### 2.3 Point d'entrée et composant racine

`main.tsx` est le seul fichier qui touche le DOM directement.

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Trois éléments à comprendre :

**`createRoot`** — remplace l'ancien `ReactDOM.render` (supprimé en React 19). Il prend le nœud DOM cible et retourne un objet `root` sur lequel on appelle `.render()`.

**`StrictMode`** — composant wrapper sans rendu DOM. En développement, il double-invoque les rendus et effets pour détecter les effets de bord non purs. Aucun impact en production. À garder systématiquement.

**L'assertion `!`** — `document.getElementById('root')` retourne `HTMLElement | null`. Le `!` est une assertion TypeScript non-null qui dit « je garantis que cet élément existe ». Il existe car `index.html` contient `<div id="root"></div>`.

### 2.4 Script de dev

```bash
pnpm dev        # dev server HMR sur localhost:5173
pnpm build      # build de production dans dist/
pnpm preview    # prévisualiser le build de production localement
```

Le HMR (Hot Module Replacement) de Vite remplace les modules modifiés **sans recharger la page**. L'état React local est préservé entre les sauvegardes — pratique quand on débogue un état qui prend 3 clics à atteindre.

### 2.5 TSX et rendu

`.tsx` = TypeScript + JSX. JSX est une syntaxe qui ressemble à du HTML mais s'écrit dans du JavaScript/TypeScript. Il est transformé en appels `React.createElement(...)` par le compilateur TypeScript (via Vite).

```tsx
// Ce que tu écris :
function Hello() {
  return <h1 className="title">Bonjour</h1>
}

// Ce que le compilateur produit (React 19, JSX transform automatique) :
import { jsx as _jsx } from 'react/jsx-runtime'
function Hello() {
  return _jsx('h1', { className: 'title', children: 'Bonjour' })
}
```

Depuis React 17+, l'import automatique de `react/jsx-runtime` est géré par le compilateur — tu n'as **plus besoin** d'écrire `import React from 'react'` en haut de chaque fichier. La config Vite (`vite.config.ts`) active cette transform avec `plugin: [react()]`.

### 2.6 Premier composant fonctionnel

Un composant React est une **fonction** qui retourne du JSX. Règle fondamentale : le nom commence par une **majuscule** (sinon React interprète la balise comme un élément HTML natif).

```tsx
// src/components/AdminLayout.tsx

interface AdminLayoutProps {
  title: string
  children: React.ReactNode
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <header>
        <h1>{title}</h1>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

Quatre éléments de la signature :

1. **Interface de props** — TypeScript pur. Elle décrit les données que le parent passe au composant.
2. **Destructuring** — `{ title, children }` extrait les props directement dans les paramètres. C'est l'idiome React.
3. **`React.ReactNode`** — type pour tout ce qu'un composant React peut rendre (JSX, string, number, null, tableau…). C'est le type correct pour `children`.
4. **`export function`** — export nommé (voir 2.7 ci-dessous).

### 2.7 Imports et exports de composants

React n'impose pas un style d'export, mais la convention est tranchée selon les cas :

```tsx
// Export nommé — recommandé pour les composants internes et bibliothèques
export function AdminLayout({ title, children }: AdminLayoutProps) { ... }

// Export par défaut — convention pour le composant racine App
export default function App() { ... }
```

**Règle pratique :**
- `App.tsx` → `export default` (convention quasi-universelle, attendue par `main.tsx`)
- Tous les autres composants → `export function` (nommé)

L'import doit correspondre au style d'export :

```tsx
// Import d'un export default
import App from './App.tsx'

// Import d'un export nommé
import { AdminLayout } from './components/AdminLayout'

// Import mixte (si un fichier a les deux)
import App, { AdminLayout } from './App'
```

---

## 3. Worked examples

### Exemple 1 — Bootstrap de l'admin TribuZen de A à Z

On crée le projet, on pose `AdminLayout` et on le branche dans `App.tsx`.

```bash
pnpm create vite@latest tribuzen-admin -- --template react-ts
cd tribuzen-admin
pnpm install
```

`src/components/AdminLayout.tsx` :

```tsx
// Composant racine du dashboard admin TribuZen
// Responsabilité unique : fournir le squelette layout (header + main)
// Le contenu (children) vient du parent — pas de logique métier ici

interface AdminLayoutProps {
  title: string
  children: React.ReactNode
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: '1rem 2rem', background: '#1e293b', color: '#f8fafc' }}>
        {/* JSX : interpolation avec {} — pas de {{ }} comme en Vue */}
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h1>
      </header>
      {/* children est le contenu que le parent injecte entre les balises */}
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
    </div>
  )
}
```

`src/App.tsx` — on remplace le contenu généré par Vite :

```tsx
// Import nommé : AdminLayout est un export function, pas un export default
import { AdminLayout } from './components/AdminLayout'

// App est le composant racine : export default conventionnel
export default function App() {
  return (
    // AdminLayout majuscule → composant React
    // adminlayout minuscule → React chercherait un élément HTML "adminlayout" (inexistant)
    <AdminLayout title="TribuZen Admin">
      <p>Dashboard en construction.</p>
    </AdminLayout>
  )
}
```

```bash
pnpm dev
# → http://localhost:5173 — header sombre "TribuZen Admin" + texte dashboard
```

### Exemple 2 — Export nommé vs export default, erreurs courantes

```tsx
// ─── Fichier : src/components/StatusBadge.tsx ───────────────────────

// Export NOMMÉ
export function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span style={{ color: status === 'active' ? '#16a34a' : '#dc2626' }}>
      {status === 'active' ? 'Actif' : 'Inactif'}
    </span>
  )
}
```

```tsx
// ─── Consommateur ───────────────────────────────────────────────────

// ✅ Import nommé correct
import { StatusBadge } from './components/StatusBadge'

// ❌ Import default depuis un export nommé → erreur runtime silencieuse
// import StatusBadge from './components/StatusBadge'
// StatusBadge sera undefined, React affichera une erreur à l'usage

function Dashboard() {
  return (
    <>
      <StatusBadge status="active" />
      <StatusBadge status="inactive" />
    </>
  )
}
```

La double accolade `<>...</>` est un **Fragment** React — il permet de retourner plusieurs éléments sans ajouter un nœud DOM wrapper. En Vue 3, c'est natif (multi-root). En React, il faut le `<>` explicite.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Nom de composant en minuscule

```tsx
// ❌ 'adminlayout' → React cherche un élément HTML natif inconnu
function App() {
  return <adminlayout title="Admin" />
}

// ✅ Majuscule → React reconnaît un composant
function App() {
  return <AdminLayout title="Admin" />
}
```

React distingue composants et éléments HTML **uniquement par la casse du premier caractère**. Pas de convention de nommage kebab-case (`<admin-layout>`) comme en Vue/Angular.

### PIÈGE #2 — `class` au lieu de `className`

```tsx
// ❌ 'class' est un mot réservé JavaScript
<div class="container">

// ✅ JSX utilise 'className'
<div className="container">
```

`class` est un mot réservé JS (pour les classes ES6). JSX utilise `className` pour l'attribut CSS. Même chose pour `for` → `htmlFor` sur les `<label>`.

### PIÈGE #3 — Import default d'un export nommé (et vice-versa)

```tsx
// Fichier StatusBadge.tsx déclare : export function StatusBadge() {}

// ❌ Import default — StatusBadge sera undefined à l'exécution
import StatusBadge from './StatusBadge'

// ✅ Import nommé — correspond à l'export
import { StatusBadge } from './StatusBadge'
```

TypeScript détecte cette erreur — mais seulement si les types sont corrects. Si `StatusBadge` est `undefined`, React lèvera une erreur à l'usage, pas à l'import.

### PIÈGE #4 — Deux éléments racine sans Fragment

```tsx
// ❌ JSX n'accepte qu'un seul élément racine par return
function App() {
  return (
    <h1>Titre</h1>
    <p>Texte</p>
  )
  // SyntaxError: Adjacent JSX elements must be wrapped in an enclosing tag
}

// ✅ Fragment — pas de nœud DOM supplémentaire
function App() {
  return (
    <>
      <h1>Titre</h1>
      <p>Texte</p>
    </>
  )
}
```

Vue 3 supporte les multi-root nativement. En React, le `<>...</>` est obligatoire.

### PIÈGE #5 — Oublier `pnpm install` après `create vite`

```bash
pnpm create vite@latest mon-app -- --template react-ts
cd mon-app
pnpm dev  # ❌ Error: Cannot find module 'react'

# ✅ Il faut installer les dépendances d'abord
pnpm install
pnpm dev
```

`create vite` génère les fichiers de configuration mais n'installe pas les packages. `pnpm install` est obligatoire avant le premier `pnpm dev`.

---

## 5. Ancrage TribuZen

`AdminLayout.tsx` créé dans l'exemple 1 est le premier fichier réel de `smaurier/tribuzen-admin`. C'est la coquille dans laquelle tout le dashboard s'insère : header de navigation, zone `<main>` pour les pages.

Structure cible dans `tribuzen-admin` :

```
tribuzen-admin/
  src/
    components/
      layout/
        AdminLayout.tsx    ← créé dans ce module
    pages/
      DashboardPage.tsx    ← module 04 (state, listes)
    App.tsx
    main.tsx
```

À ce stade, `AdminLayout` est statique (pas de state, pas de routing). Les modules suivants viennent l'enrichir :
- **Module 03** — JSX en profondeur (expressions, listes, className conditionnel)
- **Module 04** — `useState` (compteurs, bascules, données asynchrones dans le dashboard)
- **Module 07** — React Router (navigation entre pages admin)

> `AdminLayout` incarne le principe React de responsabilité unique : fournir le squelette de mise en page. La logique métier (listes de familles, stats) vit dans les composants-page qu'on passe en `children`.

---

## 6. Points clés

1. `pnpm create vite@latest mon-app -- --template react-ts` crée un projet React TypeScript prêt à l'emploi — `pnpm install` est obligatoire avant `pnpm dev`.
2. `main.tsx` est le seul point de contact avec le DOM — `createRoot` cible `<div id="root">` et appelle `.render(<App />)`.
3. `StrictMode` active des vérifications dev uniquement (double-render) — aucun impact en production, à toujours garder.
4. Un composant React est une fonction dont le nom commence par une **majuscule** et qui retourne du JSX.
5. Les props sont typées par une interface TypeScript et reçues par destructuring dans les paramètres de la fonction.
6. `.tsx` = TypeScript + JSX. L'import automatique de `react/jsx-runtime` (React 17+) rend `import React from 'react'` inutile.
7. Convention d'export : `export default` pour `App.tsx`, `export function` (nommé) pour tous les autres composants.
8. JSX : `className` (pas `class`), `htmlFor` (pas `for`), `<>...</>` pour les fragments multi-root.

---

## 7. Seeds Anki

```
Quelle commande crée un projet React TypeScript avec Vite 6 ?|pnpm create vite@latest mon-app -- --template react-ts (puis pnpm install)
Quel est le rôle de createRoot dans main.tsx ?|createRoot prend le nœud DOM cible (div#root) et retourne un objet root sur lequel on appelle .render(<App />) — remplace ReactDOM.render supprimé en React 19
Que fait StrictMode en développement vs en production ?|Dev : double-invoque les rendus et effets pour détecter les effets de bord. Production : aucun effet — wrapper transparent.
Pourquoi écrire className et non class en JSX ?|class est un mot réservé JavaScript (classes ES6). JSX traduit className en l'attribut HTML class lors du rendu.
Quelle différence entre export default et export function (nommé) en React ?|export default pour App.tsx (convention, attendue par main.tsx). export function pour tous les autres composants — import nommé avec accolades {}.
Que se passe-t-il si un composant commence par une minuscule en JSX ?|React interprète la balise comme un élément HTML natif. adminlayout n'existe pas en HTML — le rendu est vide ou incorrect. Majuscule obligatoire.
Comment retourner deux éléments JSX sans ajouter un nœud DOM ?|Fragments : <> ... </> — équivalent de <React.Fragment>. Vue 3 supporte le multi-root nativement ; React exige ce wrapper explicite.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-02-premier-projet-react/README.md`. Tu bootstrappes le vrai projet `tribuzen-admin` avec Vite, tu poses `AdminLayout` et une première page, et tu lances le dev server — corrigé commenté intégral inclus.
