---
titre: Tailwind CSS (v4, utility-first)
cours: 04-react
notions: [utility-first, setup v4 CSS-first, plugin Vite tailwindcss, import tailwindcss et theme, design tokens, responsive mobile-first, états hover focus, dark mode, composition clsx et cva, apply avec parcimonie]
outcomes: [styliser un composant React avec des classes utilitaires Tailwind v4, configurer un projet Vite en CSS-first sans tailwind.config.js, gérer responsive et dark mode et variantes de composant avec cva]
prerequis: [36-aria-patterns-avances]
next: 38-css-modules-et-alternatives
libs: [{ name: react, version: "^19" }, { name: tailwindcss, version: "^4" }]
tribuzen: styling de l'admin TribuZen — FamilyCard à variantes de statut (cva), liste responsive, dark mode, tokens de couleur dans theme
last-reviewed: 2026-07
---

# Tailwind CSS (v4, utility-first)

> **Outcomes — tu sauras FAIRE :** styliser un composant React avec des classes utilitaires Tailwind v4, configurer un projet Vite en CSS-first (sans `tailwind.config.js`), gérer responsive + dark mode + variantes de composant avec `cva`.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu reprends l'admin TribuZen. La liste des familles est stylée à coups de CSS artisanal, et le résultat est incohérent : trois nuances de bordure, deux échelles d'espacement, un dark mode moitié cassé. On te demande de passer sur **Tailwind CSS v4** et de rendre la carte `FamilyCard` cohérente, responsive et déclinable par statut.

Voici l'existant, à refondre :

```tsx
// FamilyCard.tsx — AVANT (CSS custom éparpillé)
function FamilyCard({ family }: { family: Family }) {
  return (
    <div className="family-card">           {/* padding: 14px ici, 16px ailleurs */}
      <img src={family.cover} alt="" className="family-card__cover" />
      <h3 className="family-card__title">{family.name}</h3>
      <span className={`family-card__status status--${family.status}`}>
        {family.status}
      </span>
      <p className="family-card__count">{family.memberCount} membres</p>
    </div>
  );
}
```

```css
/* family-card.css — 60 lignes, dupliquées à chaque nouvelle carte */
.family-card { padding: 14px; border: 1px solid #e2e2e2; border-radius: 8px; }
.status--active { background: #dcfce7; color: #166534; }
.status--pending { background: #fef9c3; color: #854d0e; }
.status--archived { background: #f3f4f6; color: #4b5563; }
/* ... dark mode manquant, responsive absent ... */
```

**Trois problèmes :**
1. Le nommage des classes (`family-card__title`) est inventé à la main — pas de vocabulaire partagé.
2. Les couleurs de statut sont dupliquées dans le CSS, sans lien avec un token central.
3. Responsive et dark mode ne sont pas gérés — chaque carte réinvente sa version.

Ce module refait `FamilyCard` en Tailwind v4 : tokens centraux, classes utilitaires, variantes de statut typées via `cva`.

---

## 2. Théorie complète, concise

### 2.1 Utility-first : le principe

Tailwind n'invente pas de noms de classes sémantiques (`.family-card`). Il fournit des **classes atomiques** qui font une seule chose : `p-4` (padding 1rem), `flex`, `bg-white`, `rounded-lg`. On compose l'apparence directement dans le JSX.

```tsx
// ❌ CSS custom : un nom à inventer + un fichier à maintenir
<div className="family-card">...</div>

// ✅ Utility-first : la composition est lisible sur place
<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">...</div>
```

Bénéfices concrets : pas de nom à trouver, pas de fichier CSS qui grossit sans fin (Tailwind ne génère que les classes réellement utilisées), et une **échelle cohérente** imposée (spacing par pas de 4px, palette de couleurs fixe). Coût : le JSX contient de longues chaînes de classes — on encapsule alors dans des composants React (section 2.8).

### 2.2 Setup Tailwind v4 : CSS-first (le gros changement vs v3)

**IMPORTANT — v4 casse la configuration v3.** En v3, on installait `tailwindcss` + `postcss` + `autoprefixer`, on générait un `tailwind.config.js` (`npx tailwindcss init`) et un `postcss.config.js`, puis on écrivait `@tailwind base; @tailwind components; @tailwind utilities;`. **Rien de tout ça en v4 par défaut.**

En v4 avec Vite, le setup tient en trois gestes :

```bash
# 1. Installer le paquet + le plugin Vite officiel (plus de postcss/autoprefixer manuels)
npm install tailwindcss @tailwindcss/vite
```

```ts
// 2. vite.config.ts — brancher le plugin
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* 3. src/index.css — un SEUL import remplace les trois @tailwind de v3 */
@import "tailwindcss";
```

Différences clés à mémoriser :

| | Tailwind v3 | Tailwind v4 |
|---|---|---|
| Config | `tailwind.config.js` (JS) | CSS-first : `@theme` dans le CSS |
| Import CSS | `@tailwind base/components/utilities` | `@import "tailwindcss";` |
| Build | PostCSS + autoprefixer manuels | plugin `@tailwindcss/vite` |
| `content: []` | à déclarer à la main | détection auto des sources |

> Un `tailwind.config.js` reste possible en v4 pour migrer, via `@config "./tailwind.config.js";` dans le CSS. Mais le mode par défaut, et celui de ce module, est **CSS-first**.

### 2.3 Design tokens : `@theme`

En v4, on personnalise le thème directement en CSS avec la directive `@theme`. Chaque variable devient un token et **génère automatiquement les classes correspondantes**.

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* --color-<nom> génère bg-<nom>, text-<nom>, border-<nom>, etc. */
  --color-tribu-primary: oklch(62% 0.19 264);   /* indigo TribuZen */
  --color-tribu-active: oklch(72% 0.15 150);     /* vert statut actif */
  --color-tribu-pending: oklch(80% 0.13 85);     /* ambre statut en attente */

  /* un breakpoint custom devient le préfixe 3xl: */
  --breakpoint-3xl: 1920px;
}
```

```tsx
// Le token --color-tribu-primary est directement utilisable en classe
<button className="bg-tribu-primary text-white">Créer une famille</button>
```

C'est le mécanisme de design system : une source unique de vérité (les tokens dans `@theme`), consommée par des classes partout dans l'app.

### 2.4 Responsive : mobile-first

Les préfixes de breakpoint s'appliquent **à partir de** la largeur indiquée. Sans préfixe = mobile (base). On ajoute des surcharges vers les grands écrans.

| Préfixe | Min-width |
|---|---|
| (aucun) | 0 (mobile) |
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px |

```tsx
// 1 colonne mobile → 2 tablette → 3 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {families.map((f) => <FamilyCard key={f.id} family={f} />)}
</div>
```

Le piège classique : `md:flex-row` ne veut PAS dire « seulement sur tablette », mais « à partir de 768px ». On raisonne toujours du petit écran vers le grand.

### 2.5 États : `hover:`, `focus:`, etc.

Les variantes d'état sont aussi des préfixes. Elles n'appliquent la classe que dans l'état ciblé.

```tsx
<button className="bg-tribu-primary text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-tribu-primary">
  Enregistrer
</button>
```

`focus-visible:`, `disabled:`, `group-hover:` (réagir au survol d'un ancêtre marqué `group`) suivent la même logique. On peut empiler : `md:hover:underline`.

### 2.6 Dark mode

La variante `dark:` applique une classe uniquement en mode sombre. Par défaut en v4, `dark:` réagit à la préférence système (`prefers-color-scheme`). Pour un **toggle manuel** (le cas TribuZen), on redéfinit la variante pour qu'elle se base sur une classe `.dark` :

```css
/* src/index.css */
@import "tailwindcss";

/* Active le toggle manuel : dark: s'applique quand .dark est sur un ancêtre */
@custom-variant dark (&:where(.dark, .dark *));
```

```tsx
// Toggle : on ajoute/retire .dark sur <html>
function ThemeToggle() {
  return (
    <button
      onClick={() => document.documentElement.classList.toggle('dark')}
      className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      Basculer le thème
    </button>
  );
}

// Chaque composant déclare ses deux versions
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">…</div>
```

### 2.7 Composition conditionnelle : `clsx` et `tailwind-merge`

Quand les classes dépendent de props, on les assemble en JS. La convention React : une fonction `cn()` qui combine `clsx` (concaténation conditionnelle) et `tailwind-merge` (résolution des conflits Tailwind).

```bash
npm install clsx tailwind-merge
```

```ts
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Sans `tailwind-merge`, `cn('p-4', 'p-2')` produirait `"p-4 p-2"` (conflit, comportement CSS ambigu). Avec, on obtient `"p-2"` — la dernière classe gagne, ce qui permet à un parent de surcharger proprement via `className`.

### 2.8 Variantes de composant : `cva`

Pour un composant à plusieurs variantes (statut, taille…), enchaîner des ternaires devient illisible. `class-variance-authority` (`cva`) déclare les variantes de façon structurée et typée.

```bash
npm install class-variance-authority
```

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

// Classes de base + une map par variante
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

// VariantProps<typeof badge> type les props à partir de la déclaration cva
type StatusBadgeProps = VariantProps<typeof badge> & { children: React.ReactNode };

function StatusBadge({ status, children }: StatusBadgeProps) {
  return <span className={badge({ status })}>{children}</span>;
}
```

`cva` + `VariantProps` donne la sécurité de types gratuitement : passer `status="unknown"` échoue à la compilation.

### 2.9 `@apply` avec parcimonie

`@apply` permet de regrouper des utilitaires dans une classe CSS. **Utile pour un élément qui se répète hors JSX** (styles de contenu Markdown, reset d'un `<input>` global). À éviter comme réflexe : recréer des `.family-card` en `@apply` annule tout l'intérêt de l'utility-first (on recommence à inventer des noms).

```css
/* Acceptable : une primitive vraiment transverse */
.link {
  @apply text-tribu-primary underline underline-offset-2 hover:opacity-80;
}
```

Règle : d'abord composer dans un **composant React** (`<Button>`, `<Card>`). N'utiliser `@apply` que si le style doit vivre en pur CSS.

---

## 3. Worked examples

### Exemple 1 — Refonte de `FamilyCard` en Tailwind v4 + cva

Reprise du cas concret. On style la carte, on décline le statut via `cva`, on couvre responsive et dark mode.

```css
/* ─── src/index.css ─────────────────────────────────────────────── */
@import "tailwindcss";

/* Toggle dark manuel (voir ThemeToggle) */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-tribu-primary: oklch(62% 0.19 264);
  --color-tribu-active: oklch(55% 0.15 150);
  --color-tribu-pending: oklch(60% 0.13 85);
}
```

```tsx
// ─── src/components/ui/StatusBadge.tsx ──────────────────────────
import { cva, type VariantProps } from 'class-variance-authority';

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

// Label FR par statut — découplé des classes
const LABELS = { active: 'Active', pending: 'En attente', archived: 'Archivée' } as const;

type StatusBadgeProps = VariantProps<typeof badge>;

export function StatusBadge({ status = 'active' }: StatusBadgeProps) {
  return <span className={badge({ status })}>{LABELS[status]}</span>;
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

export function FamilyCard({ family }: { family: Family }) {
  return (
    <article
      className="
        flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-colors
        border-gray-200 bg-white
        dark:border-gray-800 dark:bg-gray-950
        hover:border-tribu-primary
      "
    >
      <img
        src={family.cover}
        alt=""
        className="h-32 w-full rounded-md object-cover"
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {family.name}
        </h3>
        <StatusBadge status={family.status} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {family.memberCount} membres
      </p>
    </article>
  );
}
```

```tsx
// ─── src/pages/FamilyListPage.tsx — liste responsive ────────────
import { FamilyCard, type Family } from '@/components/family/FamilyCard';

export function FamilyListPage({ families }: { families: Family[] }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Familles
        </h1>
        {/* 1 col mobile → 2 tablette → 3 desktop */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {families.map((f) => (
            <FamilyCard key={f.id} family={f} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Ce que la refonte apporte :**
- Zéro fichier `family-card.css` : l'apparence vit dans le composant, l'échelle est cohérente.
- Les couleurs de statut viennent des tokens `@theme` — une source unique.
- `StatusBadge` est typé : un statut hors nomenclature ne compile pas.
- Responsive et dark mode gérés déclarativement, sans media query manuelle.

### Exemple 2 — Bouton à variantes avec `cva` + surcharge `cn`

Un `Button` réutilisable, avec `variant` et `size`, surchargeable de l'extérieur via `className`.

```tsx
// ─── src/components/ui/Button.tsx ───────────────────────────────
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-tribu-primary disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-tribu-primary text-white hover:opacity-90',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({ variant, size, className, ...props }: ButtonProps) {
  // cn permet à className de surcharger proprement (tailwind-merge résout les conflits)
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
```

```tsx
// Usage
<Button variant="primary" size="lg">Créer une famille</Button>
<Button variant="secondary">Annuler</Button>
// Surcharge ponctuelle — p-* de className gagne sur celui de cva grâce à twMerge
<Button variant="danger" className="w-full">Supprimer</Button>
```

**Pourquoi `cn(button(...), className)` et pas une simple concaténation :** si `className` contient `px-8` et que la variante impose `px-4`, `tailwind-merge` garde `px-8`. Sans lui, les deux coexisteraient et le rendu serait indéterminé.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Installer Tailwind comme en v3

```bash
# ❌ Réflexe v3 — obsolète en v4
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p          # génère un config JS + postcss.config
```
```css
/* ❌ v3 — les trois directives n'existent plus en v4 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```bash
# ✅ v4 avec Vite
npm install tailwindcss @tailwindcss/vite
```
```css
/* ✅ v4 — un seul import */
@import "tailwindcss";
```

**Pourquoi c'est faux :** v4 remplace le pipeline PostCSS manuel par le plugin `@tailwindcss/vite` et la config JS par `@theme` en CSS. Suivre un tuto v3 mène à un projet qui ne build pas ou ignore le thème.

### PIÈGE #2 — Croire que `md:` cible « seulement la tablette »

```tsx
// ❌ Intention erronée : "flex-row uniquement sur tablette"
<div className="md:flex-row">…</div>
// En réalité : flex-row s'applique à partir de 768px ET au-delà (lg, xl…)

// ✅ Mobile-first assumé : base mobile, surcharge montante
<div className="flex flex-col md:flex-row">…</div>
```

**Pourquoi c'est faux :** les breakpoints Tailwind sont des `min-width`. Un préfixe s'applique à sa taille et à toutes les plus grandes. On définit toujours le mobile sans préfixe.

### PIÈGE #3 — Concaténer les classes conflictuelles sans `tailwind-merge`

```tsx
// ❌ Concaténation naïve — conflit non résolu
<div className={`p-4 ${override}`} />   // si override = "p-8" → "p-4 p-8"

// ✅ cn() résout : la dernière classe pertinente gagne
<div className={cn('p-4', override)} /> // → "p-8"
```

**Pourquoi c'est faux :** deux utilitaires de la même famille (`p-4`, `p-8`) génèrent la même propriété CSS ; l'ordre de la feuille générée, pas l'ordre dans `className`, décide. `tailwind-merge` déduplique par famille.

### PIÈGE #4 — Recréer du CSS custom via `@apply` partout

```css
/* ❌ Anti-pattern : on réinvente des noms sémantiques */
.family-card { @apply flex flex-col gap-3 rounded-lg border p-4; }
.family-card__title { @apply font-semibold text-gray-900; }
```

```tsx
// ✅ Composer dans un composant React réutilisable
export function FamilyCard(/* … */) {
  return <article className="flex flex-col gap-3 rounded-lg border p-4">…</article>;
}
```

**Pourquoi c'est faux :** `@apply` généralisé recrée exactement le problème que Tailwind résout (nommer, maintenir un fichier CSS parallèle). La réutilisation en React se fait par **composant**, pas par classe `@apply`. Réserver `@apply` aux styles vraiment hors-JSX (contenu Markdown, resets globaux).

### PIÈGE #5 — Classes construites dynamiquement par interpolation

```tsx
// ❌ Tailwind ne "voit" jamais cette classe → non générée → invisible
<div className={`text-${color}-500`} />

// ✅ Classes complètes, sélectionnées via une map
const TEXT = { red: 'text-red-500', green: 'text-green-500' } as const;
<div className={TEXT[color]} />
```

**Pourquoi c'est faux :** le scanner Tailwind fait de l'analyse statique de chaînes littérales. `text-${color}-500` n'apparaît jamais en clair, donc la classe n'est pas incluse dans le CSS généré. Toujours écrire des noms de classes complets.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, Tailwind v4 est la couche de styling de toute l'interface. Points d'ancrage réels :

**Tokens (`src/index.css`, bloc `@theme`)** — les couleurs de marque (`--color-tribu-primary`), les couleurs de statut famille (`--color-tribu-active`, `--color-tribu-pending`) et un breakpoint `3xl` pour les grands écrans admin. Source unique consommée partout.

**`StatusBadge` (`src/components/ui/StatusBadge.tsx`)** — variantes `active` / `pending` / `archived` via `cva`, typées par `VariantProps`. Réutilisé dans la liste des familles, la fiche famille, et les filtres.

**`FamilyCard` (`src/components/family/FamilyCard.tsx`)** — carte responsive avec dark mode, statut délégué à `StatusBadge`. C'est le cas concret du module.

**`FamilyListPage` (`src/pages/FamilyListPage.tsx`)** — grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, fond adaptatif dark mode.

**`ThemeToggle` (`src/components/ui/ThemeToggle.tsx`)** — bascule `.dark` sur `<html>`, appuyée par `@custom-variant dark` en CSS-first.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  index.css                       # @import + @theme + @custom-variant dark
  lib/utils.ts                    # cn() = clsx + tailwind-merge
  components/
    ui/
      Button.tsx                  # cva variant/size
      StatusBadge.tsx             # cva status
      ThemeToggle.tsx
  components/family/FamilyCard.tsx
  pages/FamilyListPage.tsx
```

---

## 6. Points clés

1. Tailwind est **utility-first** : on compose des classes atomiques dans le JSX au lieu d'inventer des noms de classes CSS.
2. **v4 = CSS-first** : `@import "tailwindcss";` remplace les trois `@tailwind`, le plugin `@tailwindcss/vite` remplace le pipeline PostCSS, `@theme` remplace `tailwind.config.js`.
3. Les **design tokens** se déclarent dans `@theme` (`--color-*`, `--breakpoint-*`) et génèrent automatiquement les classes correspondantes.
4. Le responsive est **mobile-first** : sans préfixe = mobile, `md:` s'applique à partir de 768px et au-dessus.
5. États (`hover:`, `focus:`) et **dark mode** (`dark:`, activé en toggle via `@custom-variant dark`) sont des préfixes déclaratifs.
6. `cn()` (`clsx` + `tailwind-merge`) assemble les classes conditionnelles et résout les conflits ; `cva` structure et type les variantes de composant.
7. `@apply` avec parcimonie ; la réutilisation se fait par **composant React**, pas par classe custom. Jamais d'interpolation dynamique de nom de classe.

---

## 7. Seeds Anki

```
Qu'est-ce que l'approche utility-first de Tailwind ?|Styliser en composant des classes atomiques à responsabilité unique (p-4, flex, bg-white) directement dans le JSX, au lieu d'inventer des noms de classes CSS sémantiques et de maintenir une feuille de styles séparée.
Comment installe-t-on Tailwind CSS v4 dans un projet Vite ?|npm install tailwindcss @tailwindcss/vite ; ajouter tailwindcss() aux plugins de vite.config ; mettre @import "tailwindcss"; dans le CSS. Plus de postcss/autoprefixer manuels, plus de tailwind.config.js par défaut.
Quelle est la grande différence de configuration entre Tailwind v3 et v4 ?|v3 = config JavaScript (tailwind.config.js) + trois directives @tailwind base/components/utilities + PostCSS manuel. v4 = CSS-first : un @import "tailwindcss";, le thème via @theme dans le CSS, et le plugin @tailwindcss/vite.
Comment déclare-t-on un design token de couleur en Tailwind v4 ?|Dans un bloc @theme du CSS : --color-tribu-primary: oklch(...); Tailwind génère alors automatiquement bg-tribu-primary, text-tribu-primary, border-tribu-primary, etc.
Que signifie le préfixe md: sur une classe Tailwind ?|La classe s'applique à partir de 768px (min-width) et pour toutes les tailles supérieures — pas "seulement sur tablette". Tailwind est mobile-first : la base (sans préfixe) cible le mobile.
À quoi servent clsx et tailwind-merge (fonction cn) ?|clsx assemble des classes conditionnellement ; tailwind-merge déduplique les conflits Tailwind de même famille (p-4 + p-8 → p-8). cn(...) combine les deux pour composer des classes dynamiques surchargeables.
Pourquoi ne pas écrire className={`text-${color}-500`} en Tailwind ?|Le scanner Tailwind fait de l'analyse statique de chaînes littérales : une classe construite par interpolation n'apparaît jamais en clair, donc n'est pas générée. Il faut des noms de classes complets, sélectionnés via une map d'objets.
Que fait cva (class-variance-authority) et pourquoi l'associer à VariantProps ?|cva déclare des variantes de composant (status, size...) avec classes de base + map par variante. VariantProps<typeof x> dérive automatiquement le type des props, garantissant à la compilation qu'une variante inconnue est refusée.
Comment activer un dark mode par toggle manuel en Tailwind v4 ?|Ajouter @custom-variant dark (&:where(.dark, .dark *)); dans le CSS pour que dark: réagisse à une classe .dark ; puis basculer document.documentElement.classList.toggle('dark'). Par défaut dark: suit prefers-color-scheme.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-37-tailwind-css/README.md`. Configurer Tailwind v4 en CSS-first dans un projet Vite, poser les tokens TribuZen dans `@theme`, puis styliser `FamilyCard` avec variantes de statut (`cva`), liste responsive et dark mode.
