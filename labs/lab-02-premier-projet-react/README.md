# Lab 02 — Premier projet React

> **Outcome :** à la fin, tu sais créer un projet React TypeScript avec Vite, lire sa structure, écrire un composant `AdminLayout` avec des props typées, et le rendre dans `App.tsx` — dev server HMR visible dans le navigateur.
> **Vrai outil :** Vite 6 + React 19 + TypeScript — projet réel, pas de simulateur.
> **Feedback :** le coach valide visuellement en session (header admin affiché, HMR actif) — pas de test-runner auto-correcteur.

---

## Énoncé

Tu bootstrappes `tribuzen-admin` — l'interface React que les coachs TribuZen utiliseront pour piloter les familles. Cahier des charges exact pour ce lab :

1. Créer le projet `tribuzen-admin` avec `pnpm create vite@latest` (template `react-ts`).
2. Inspecter `main.tsx` et identifier les trois éléments clés (`createRoot`, `StrictMode`, `getElementById('root')`).
3. Créer `src/components/layout/AdminLayout.tsx` — composant avec deux props : `title: string` et `children: React.ReactNode`.
4. Modifier `src/App.tsx` pour utiliser `AdminLayout` comme wrapper, avec `title="TribuZen Admin"` et un paragraphe en `children`.
5. Lancer `pnpm dev` et vérifier que le header s'affiche — modifier le `title` dans `App.tsx` et observer le HMR sans rechargement de page.
6. Ajouter un second composant `DashboardWelcome.tsx` (export nommé) avec une prop `userName: string`, l'utiliser dans `App.tsx` en `children` de `AdminLayout`.

**Pas de gap-fill** — tu écris les fichiers à partir du starter ci-dessous.

### Starter minimal

Après `pnpm install`, tu as la structure Vite par défaut. Remplace entièrement `src/App.tsx` :

```tsx
// src/App.tsx — starter (remplacer le contenu généré par Vite)
export default function App() {
  return (
    <div>
      {/* À toi : importer AdminLayout, wrapper le contenu ici */}
    </div>
  )
}
```

Crée `src/components/layout/AdminLayout.tsx` et `src/components/DashboardWelcome.tsx` à partir de zéro.

---

## Étapes (en friction)

1. **Crée le projet** — `pnpm create vite@latest tribuzen-admin -- --template react-ts`, `cd tribuzen-admin`, `pnpm install`.
2. **Lis `main.tsx`** — identifie `createRoot`, `StrictMode`, et le `!` de l'assertion non-null. Comprends pourquoi `getElementById('root')` ne peut pas retourner `null` ici.
3. **Écris `AdminLayout.tsx`** — interface `AdminLayoutProps` avec `title: string` et `children: React.ReactNode`, export nommé `export function AdminLayout`.
4. **Modifie `App.tsx`** — import nommé `{ AdminLayout }`, rendu avec `<AdminLayout title="TribuZen Admin"><p>Dashboard en construction.</p></AdminLayout>`.
5. **Lance `pnpm dev`** — vérifie l'affichage à `http://localhost:5173`. Change le titre dans `App.tsx`, sauvegarde, observe la mise à jour sans rechargement.
6. **Écris `DashboardWelcome.tsx`** — props `{ userName: string }`, affiche `Bonjour, {userName} !` dans un `<p>`. Export nommé.
7. **Branche `DashboardWelcome` dans `App.tsx`** — passe-le en `children` de `AdminLayout` avec `userName="Coach"`.
8. **Vérifie les cas limites** — essaie de nommer un composant en minuscule et observe l'erreur React dans la console. Remets la majuscule.

---

## Corrigé complet commenté

### Création du projet

```bash
pnpm create vite@latest tribuzen-admin -- --template react-ts
cd tribuzen-admin
pnpm install
pnpm dev
```

### `src/main.tsx` — fourni par Vite, à lire et comprendre

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// createRoot — remplace ReactDOM.render (supprimé en React 19)
// Prend le nœud DOM cible et retourne un objet root avec .render()
// Le ! (assertion non-null TS) : on garantit que #root existe car index.html le contient
createRoot(document.getElementById('root')!).render(
  // StrictMode : vérifications dev uniquement (double-rendu pour détecter les effets impurs)
  // Aucun impact en production — toujours garder
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### `src/components/layout/AdminLayout.tsx`

```tsx
// Composant racine du layout admin TribuZen
// Responsabilité unique : fournir le squelette (header + main)
// Zéro logique métier ici — le contenu vient via children

interface AdminLayoutProps {
  // title : le titre affiché dans le header (ex: "TribuZen Admin", "Familles")
  title: string
  // React.ReactNode : tout ce qu'un composant peut rendre
  // (JSX, string, number, null, array de JSX)
  children: React.ReactNode
}

// Export nommé — convention pour tous les composants hors App.tsx
export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    // Fragment inutile ici : une seule racine <div>
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          padding: '1rem 2rem',
          background: '#1e293b',
          color: '#f8fafc',
          // borderBottom pour séparer visuellement le header du contenu
          borderBottom: '2px solid #334155',
        }}
      >
        {/* {} = interpolation JSX (pas {{ }} comme en Vue) */}
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h1>
      </header>
      {/* flex: 1 → main occupe tout l'espace restant après le header */}
      <main style={{ flex: 1, padding: '2rem', background: '#f8fafc' }}>
        {children}
      </main>
    </div>
  )
}
```

### `src/components/DashboardWelcome.tsx`

```tsx
// Composant de bienvenue — premier contenu du dashboard admin
// Props minimalistes : juste le nom du coach connecté

interface DashboardWelcomeProps {
  userName: string
}

// Export nommé (pas default) — cohérence avec AdminLayout
export function DashboardWelcome({ userName }: DashboardWelcomeProps) {
  return (
    // Fragment <> : deux éléments racine sans nœud DOM wrapper
    // Équivalent de <React.Fragment> mais plus concis
    <>
      <h2 style={{ marginTop: 0, color: '#1e293b' }}>
        Bonjour, {userName} !
      </h2>
      <p style={{ color: '#64748b' }}>
        Bienvenue dans l'interface d'administration TribuZen.
      </p>
    </>
  )
}
```

### `src/App.tsx`

```tsx
// Import nommé : AdminLayout exporte function (pas default)
import { AdminLayout } from './components/layout/AdminLayout'
// Import nommé : DashboardWelcome exporte function (pas default)
import { DashboardWelcome } from './components/DashboardWelcome'

// Export default : convention pour le composant racine — attendu par main.tsx
export default function App() {
  return (
    // AdminLayout majuscule → composant React
    // Passe title comme prop string, DashboardWelcome comme children
    <AdminLayout title="TribuZen Admin">
      {/* DashboardWelcome est injecté en children dans AdminLayout */}
      <DashboardWelcome userName="Coach" />
    </AdminLayout>
  )
}
```

**Résultat attendu dans le navigateur :**
- Header sombre `#1e293b` avec "TribuZen Admin" en blanc
- Zone main claire avec "Bonjour, Coach !" + texte de bienvenue
- Modifier `title` ou `userName` dans `App.tsx` → HMR met à jour sans rechargement

**Pourquoi ce corrigé est correct :**
- `AdminLayout` est un export nommé → import avec `{ }`. `App` est un export default → import sans `{ }`. Confusion entre les deux est l'erreur #1 des débutants React.
- `React.ReactNode` est le bon type pour `children` — pas `JSX.Element` (trop restrictif : exclut les strings, numbers, null) ni `any` (perd le typage).
- `StrictMode` est conservé dans `main.tsx` — pas de raison de le retirer, les avertissements qu'il génère signalent des vrais problèmes.
- Le style inline est un objet JS camelCase (`borderBottom`, pas `border-bottom`) — React traduit vers les propriétés CSS au rendu.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées :**

Reproduis le projet `tribuzen-admin` **de mémoire, en 20 minutes**, avec ces modifications :

1. Ajoute une prop `subtitle?: string` optionnelle à `AdminLayout` — si elle est définie, affiche-la sous le titre dans le header (police plus petite, couleur `#94a3b8`).
2. Ajoute un composant `StatCard.tsx` (export nommé) avec props `label: string` et `value: number` — affiche une carte avec fond blanc, ombre légère, label en gris et value en grand.
3. Utilise `StatCard` trois fois dans `App.tsx` (en children de `AdminLayout`) pour afficher : Familles (12), Membres (47), Sessions (3).
4. **Sans ouvrir ce corrigé ni le module 02.**

**Critère de réussite :** le dev server tourne, les trois cards s'affichent, TypeScript ne signale aucune erreur.

---

## Application TribuZen

Dans `smaurier/tribuzen-admin`, `AdminLayout` vit ici :

```
tribuzen-admin/
  src/
    components/
      layout/
        AdminLayout.tsx    ← créé dans ce lab
      DashboardWelcome.tsx ← créé dans ce lab
    App.tsx
    main.tsx
```

**Différences par rapport au lab quand le produit mûrit :**

- `AdminLayout` recevra une barre de navigation latérale (sidebar) avec des liens React Router (module 07) — pour l'instant, le header seul suffit.
- `DashboardWelcome` affichera le vrai nom du coach depuis un contexte d'authentification (module 08 — `useContext`) — pour l'instant, `userName` est passé en prop hardcodée.
- Le style inline sera remplacé par des classes CSS Tailwind (ou CSS Modules) — mais la structure des composants reste identique.

**Commit cible :**

```
feat(admin): bootstrap tribuzen-admin — AdminLayout + DashboardWelcome, Vite React TS
```
