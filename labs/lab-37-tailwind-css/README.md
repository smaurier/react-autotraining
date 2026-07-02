# Lab 37 — Tailwind CSS (v4, utility-first)

> **Outcome :** à la fin, tu sais configurer Tailwind CSS **v4 en CSS-first** dans un projet Vite + React 19, poser des design tokens dans `@theme`, et styliser `FamilyCard` avec variantes de statut (`cva`), grille responsive et dark mode.
> **Vrai outil :** Vite + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`), rendu visible dans le navigateur (HMR).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu refais la vue « Familles » de l'admin TribuZen en Tailwind v4. Cahier des charges **exact** :

1. **Setup v4 CSS-first** — projet Vite React-TS, plugin `@tailwindcss/vite`, `@import "tailwindcss";`. **Aucun `tailwind.config.js`, aucun `postcss.config.js`, aucune directive `@tailwind`.**
2. **Tokens dans `@theme`** — couleurs de marque et de statut TribuZen.
3. **Dark mode par toggle** — `@custom-variant dark`, bouton qui bascule `.dark` sur `<html>`.
4. **`StatusBadge`** — variantes `active` / `pending` / `archived` via `cva`, typées.
5. **`FamilyCard`** — carte responsive, dark mode, statut délégué à `StatusBadge`.
6. **`FamilyListPage`** — grille `1 → 2 → 3` colonnes selon le breakpoint.

**Données de départ (à copier dans `FamilyCard.tsx`) :**

```tsx
export interface Family {
  id: string;
  name: string;
  cover: string;
  status: 'active' | 'pending' | 'archived';
  memberCount: number;
}

export const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', cover: 'https://picsum.photos/seed/dupont/400/240', status: 'active', memberCount: 5 },
  { id: 'f2', name: 'Les Martin', cover: 'https://picsum.photos/seed/martin/400/240', status: 'pending', memberCount: 3 },
  { id: 'f3', name: 'Les Bernard', cover: 'https://picsum.photos/seed/bernard/400/240', status: 'archived', memberCount: 8 },
];
```

**Contraintes :**
- **Setup v4 uniquement** — si tu écris `@tailwind base;` ou génères un `tailwind.config.js`, c'est un échec du lab (c'est du v3).
- Les couleurs de statut viennent des **tokens `@theme`**, pas de valeurs hex en dur dans les composants.
- `StatusBadge` utilise `cva` + `VariantProps` — pas de chaîne de ternaires, pas de `string` libre pour `status`.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

```bash
npm create vite@latest tribuzen-tw -- --template react-ts
cd tribuzen-tw
npm install
npm install tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge
```

Arborescence cible :

```
src/
  index.css                       ← @import + @theme + @custom-variant dark
  main.tsx                        ← importe ./index.css
  lib/utils.ts                    ← cn() (clsx + tailwind-merge)
  components/
    ui/
      StatusBadge.tsx             ← cva status
      ThemeToggle.tsx             ← toggle .dark
    family/FamilyCard.tsx         ← carte + données DEMO
  App.tsx                         ← FamilyListPage
```

Lance `npm run dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Branche le plugin** — dans `vite.config.ts`, importe `tailwindcss from '@tailwindcss/vite'` et ajoute-le aux `plugins` (à côté de `react()`).
2. **Écris `src/index.css`** — `@import "tailwindcss";`, le `@custom-variant dark (&:where(.dark, .dark *))`, puis un bloc `@theme` avec `--color-tribu-primary`, `--color-tribu-active`, `--color-tribu-pending`. Vérifie que `main.tsx` importe bien `./index.css`.
3. **Écris `lib/utils.ts`** — la fonction `cn()`.
4. **Écris `StatusBadge.tsx`** — `cva` avec `variants.status` (les trois statuts), `defaultVariants`, et une map `LABELS` FR. Type les props via `VariantProps<typeof badge>`.
5. **Écris `ThemeToggle.tsx`** — un bouton qui `document.documentElement.classList.toggle('dark')`.
6. **Écris `FamilyCard.tsx`** — carte utility-first (`rounded-lg border p-4 …`), dark mode (`dark:bg-gray-950 …`), `hover:border-tribu-primary`, statut délégué à `<StatusBadge>`. Colle-y `DEMO_FAMILIES`.
7. **Écris `App.tsx`** — `ThemeToggle` + grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` sur `DEMO_FAMILIES`.
8. **Vérifie dans le navigateur** : redimensionne (1 → 2 → 3 colonnes), clique le toggle (bascule sombre), constate les trois couleurs de statut, et confirme qu'il n'existe **ni `tailwind.config.js` ni `postcss.config.js`** dans le projet.

---

## Corrigé complet commenté

```ts
// ─── vite.config.ts ─────────────────────────────────────────────
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // plugin v4 — remplace le pipeline PostCSS

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* ─── src/index.css ─────────────────────────────────────────────
   v4 CSS-first : UN import remplace @tailwind base/components/utilities */
@import "tailwindcss";

/* Toggle dark manuel : dark: s'applique quand .dark est sur un ancêtre.
   Sans cette ligne, dark: suivrait seulement prefers-color-scheme. */
@custom-variant dark (&:where(.dark, .dark *));

/* Design tokens : chaque --color-* génère bg-*, text-*, border-*... */
@theme {
  --color-tribu-primary: oklch(62% 0.19 264);   /* indigo marque */
  --color-tribu-active: oklch(55% 0.15 150);     /* vert statut actif */
  --color-tribu-pending: oklch(60% 0.13 85);     /* ambre statut en attente */
}
```

```tsx
// ─── src/main.tsx ───────────────────────────────────────────────
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // sans cet import, aucune classe Tailwind ne s'applique

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```ts
// ─── src/lib/utils.ts ───────────────────────────────────────────
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// clsx assemble conditionnellement, twMerge résout les conflits (p-4 + p-8 → p-8)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// ─── src/components/ui/StatusBadge.tsx ──────────────────────────
import { cva, type VariantProps } from 'class-variance-authority';

// Classes de base communes + une map par valeur de la variante status.
// Les couleurs viennent des tokens @theme (bg-tribu-active, etc.).
const badge = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        active: 'bg-tribu-active/15 text-tribu-active',
        pending: 'bg-tribu-pending/15 text-tribu-pending',
        archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
      },
    },
    defaultVariants: { status: 'active' },
  },
);

// Libellés FR découplés des classes de style
const LABELS = { active: 'Active', pending: 'En attente', archived: 'Archivée' } as const;

// VariantProps dérive { status?: 'active' | 'pending' | 'archived' } depuis cva
type StatusBadgeProps = VariantProps<typeof badge>;

export function StatusBadge({ status = 'active' }: StatusBadgeProps) {
  return <span className={badge({ status })}>{LABELS[status]}</span>;
}
```

```tsx
// ─── src/components/ui/ThemeToggle.tsx ──────────────────────────
export function ThemeToggle() {
  return (
    <button
      // Bascule la classe .dark sur <html> — c'est ce que cible @custom-variant dark
      onClick={() => document.documentElement.classList.toggle('dark')}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm
                 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800
                 dark:text-gray-100"
    >
      Basculer le thème
    </button>
  );
}
```

```tsx
// ─── src/components/family/FamilyCard.tsx ───────────────────────
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface Family {
  id: string;
  name: string;
  cover: string;
  status: 'active' | 'pending' | 'archived';
  memberCount: number;
}

export const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', cover: 'https://picsum.photos/seed/dupont/400/240', status: 'active', memberCount: 5 },
  { id: 'f2', name: 'Les Martin', cover: 'https://picsum.photos/seed/martin/400/240', status: 'pending', memberCount: 3 },
  { id: 'f3', name: 'Les Bernard', cover: 'https://picsum.photos/seed/bernard/400/240', status: 'archived', memberCount: 8 },
];

export function FamilyCard({ family }: { family: Family }) {
  return (
    <article
      className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-colors
                 border-gray-200 bg-white
                 dark:border-gray-800 dark:bg-gray-950
                 hover:border-tribu-primary"
    >
      <img src={family.cover} alt="" className="h-32 w-full rounded-md object-cover" />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{family.name}</h3>
        {/* Statut typé — passe la valeur, StatusBadge choisit couleur + libellé */}
        <StatusBadge status={family.status} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{family.memberCount} membres</p>
    </article>
  );
}
```

```tsx
// ─── src/App.tsx ────────────────────────────────────────────────
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { FamilyCard, DEMO_FAMILIES } from '@/components/family/FamilyCard';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Familles</h1>
          <ThemeToggle />
        </div>
        {/* Mobile-first : 1 col → 2 (md) → 3 (lg) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_FAMILIES.map((f) => (
            <FamilyCard key={f.id} family={f} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

> L'alias `@/` suppose un `resolve.alias` (`'@': '/src'`) dans `vite.config.ts` + `paths` dans `tsconfig`. Si tu ne l'as pas configuré, remplace les imports par des chemins relatifs (`../ui/StatusBadge`).

**Pourquoi ce corrigé est correct :**
- **Zéro artefact v3** : pas de `tailwind.config.js`, pas de `postcss.config.js`, pas de `@tailwind`. Le plugin Vite + `@import "tailwindcss";` + `@theme` suffisent.
- Les couleurs de statut sont des **tokens** (`--color-tribu-active`), donc changer la charte se fait à un seul endroit.
- `StatusBadge` est **typé par `cva`** : `status="unknown"` ne compile pas — impossible de créer un statut hors nomenclature.
- Le responsive est **mobile-first déclaratif** (`grid-cols-1 md:… lg:…`), le dark mode est un simple préfixe `dark:` piloté par le toggle.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module 37 :**

1. Ajoute un composant **`Button`** avec `cva` : variantes `variant` (`primary` / `secondary` / `danger`) **et** `size` (`sm` / `md` / `lg`), surchargeable via `className` grâce à `cn(button({ variant, size }), className)`.
2. Ajoute un bouton « Supprimer » (`variant="danger"`, `size="sm"`) en bas de chaque `FamilyCard`.
3. Ajoute un **token de breakpoint** `--breakpoint-3xl: 1920px` dans `@theme` et fais passer la grille à **4 colonnes** en `3xl:`.
4. Le toggle dark doit **persister** le choix dans `localStorage` et le réappliquer au chargement.

**Critère de réussite :** boutons déclinés correctement (couleur + taille), 4 colonnes au-delà de 1920px, thème conservé après un rechargement de page.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/src/
  index.css                       # @import "tailwindcss"; + @theme + @custom-variant dark
  lib/utils.ts                    # cn()
  components/
    ui/
      Button.tsx                  # cva variant/size (voir variante J+30)
      StatusBadge.tsx             # cva status
      ThemeToggle.tsx             # + persistance localStorage
    family/FamilyCard.tsx
  pages/FamilyListPage.tsx        # grille responsive branchée sur le vrai fetch familles
```

**Différences par rapport au lab :**
- `DEMO_FAMILIES` est remplacé par le vrai chargement (React Query / route loader) — la liste vient de l'API.
- Les tokens `@theme` sont alignés sur la charte graphique TribuZen définitive (audit design séparé).
- `ThemeToggle` persiste la préférence (`localStorage` + réhydratation au boot) et respecte `prefers-color-scheme` au premier chargement.

**Commit cible :**
```
chore(styling): setup Tailwind v4 CSS-first (@tailwindcss/vite + @theme tokens)
feat(ui): StatusBadge + Button via cva ; ThemeToggle dark mode
feat(family): FamilyCard responsive + FamilyListPage grille
```
