---
titre: CSS Modules et alternatives de styling
cours: 04-react
notions: [scoping local avec .module.css, composition de classes avec composes, classes conditionnelles avec clsx, theming par variables CSS, CSS-in-JS runtime et son incompatibilite RSC, zero-runtime vanilla-extract Panda Linaria, utility-first Tailwind rappel, matrice de decision quand choisir quoi]
outcomes: [scoper des styles React avec CSS Modules et composer des classes, theming multi-theme via variables CSS, choisir une approche de styling selon le contexte RSC bundle et equipe]
prerequis: [37-tailwind-css]
next: 39-auth-nextauth
libs: [{ name: react, version: "^19" }]
tribuzen: composant de l'admin TribuZen style en CSS Modules avec theming clair/sombre par variables CSS
last-reviewed: 2026-07
---

# CSS Modules et alternatives de styling

> **Outcomes — tu sauras FAIRE :** scoper des styles React avec CSS Modules et composer des classes, mettre en place un theming clair/sombre par variables CSS, choisir une approche de styling selon le contexte (RSC, bundle, équipe).
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu reprends l'admin TribuZen. La liste des familles affiche des cartes stylées avec un `<style>` global hérité d'un ancien dev :

```tsx
// FamilyCard.tsx — AVANT, styles globaux
import './family-card.css'; // fichier CSS classique, non scopé

function FamilyCard({ family }: { family: Family }) {
  return (
    <div className="card">
      <h3 className="title">{family.name}</h3>
      <span className="badge">{family.memberCount} membres</span>
    </div>
  );
}
```

```css
/* family-card.css — global, écrase tout le monde */
.card { padding: 1rem; border: 1px solid #ddd; }
.title { font-size: 1.25rem; }
.badge { background: #2563eb; color: white; }
```

**Trois problèmes immédiats :**
1. `.card`, `.title`, `.badge` sont des noms **globaux** : une autre feature qui déclare `.badge` entre en collision. Le dernier CSS chargé gagne — bug invisible en dev, cassé en prod.
2. Impossible de savoir quel composant possède quelle règle : le CSS n'est pas rattaché au composant.
3. Le thème (couleurs) est en dur dans le fichier — pas de mode sombre possible sans dupliquer chaque règle.

Ce module te donne le scoping local (CSS Modules), le theming par variables CSS, et la grille pour choisir entre CSS Modules, Tailwind (module 37), CSS-in-JS et les solutions zero-runtime.

---

## 2. Théorie complète, concise

### 2.1 Le problème de fond : le CSS est global par nature

Un sélecteur `.badge` dans n'importe quel fichier `.css` s'applique à **tout** le document. Deux composants qui déclarent `.badge` se marchent dessus. Toutes les approches modernes de styling résolvent ce même problème — le **scoping** — de manières différentes :

| Approche | Mécanisme de scoping | Runtime |
|---|---|---|
| CSS Modules | Renomme la classe au build (`badge` → `FamilyCard_badge_x7f2`) | Zéro |
| Tailwind (utility) | Pas de classe custom : on compose des utilitaires atomiques | Zéro |
| CSS-in-JS (styled-components, emotion) | Génère la classe en JS **au runtime** | Oui (client) |
| Zero-runtime (vanilla-extract, Panda, Linaria) | Écrit des styles en TS, extraits en CSS statique au build | Zéro |

Retiens l'axe **runtime vs build** : c'est lui qui décide de la compatibilité avec les Server Components (voir 2.6).

### 2.2 CSS Modules : scoping local par convention de nom

Un fichier nommé `*.module.css` est traité par le bundler (Vite, Next.js — support natif, aucune config) comme un **module scopé**. On importe un objet `styles` qui mappe les noms locaux vers des noms uniques générés.

```css
/* FamilyCard.module.css */
.card {
  padding: 1rem;
  border: 1px solid var(--tz-border);
  border-radius: 0.5rem;
}
.title {
  font-size: 1.25rem;
  font-weight: 600;
}
.badge {
  background: var(--tz-primary);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}
```

```tsx
// FamilyCard.tsx
import styles from './FamilyCard.module.css';

function FamilyCard({ family }: { family: Family }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{family.name}</h3>
      <span className={styles.badge}>{family.memberCount} membres</span>
    </div>
  );
}
```

Le HTML rendu contient des noms uniques — collision impossible :

```html
<div class="FamilyCard_card_x7f2a">
  <h3 class="FamilyCard_title_k3d9e">Les Dupont</h3>
  <span class="FamilyCard_badge_m1p4z">4 membres</span>
</div>
```

- `styles.card` est une simple `string`. `styles["card"]` marche aussi (utile pour un accès dynamique `styles[variant]`).
- Une classe absente renvoie `undefined` → `className={undefined}` est ignoré par React (pas d'erreur, mais pas de style : source de bug silencieux).

### 2.3 Composition avec `composes`

`composes` est la fonctionnalité propre aux CSS Modules pour **réutiliser** des règles sans dupliquer. Ce n'est PAS de l'héritage CSS : au build, la classe finale reçoit les deux noms générés.

```css
/* typography.module.css */
.heading {
  font-weight: 700;
  line-height: 1.2;
}
```

```css
/* FamilyCard.module.css */
.title {
  composes: heading from './typography.module.css';
  font-size: 1.25rem; /* on ajoute/écrase */
}
```

Au rendu, `styles.title` produit `class="FamilyCard_title_.. typography_heading_.."`. `composes` doit être en **première** déclaration du bloc et ne s'applique qu'à des classes (pas des sélecteurs complexes).

### 2.4 Classes conditionnelles avec `clsx`

Concaténer des classes à la main (`` `${styles.card} ${active ? styles.active : ''}` ``) devient vite illisible. `clsx` (ou `classnames`) gère les conditions proprement — même utilitaire que côté Tailwind (module 37), mais ici sans `tailwind-merge` puisqu'il n'y a pas de conflit d'utilitaires à arbitrer.

```tsx
import styles from './Badge.module.css';
import { clsx } from 'clsx';

type Variant = 'admin' | 'mod' | 'member';

function Badge({ variant, active }: { variant: Variant; active?: boolean }) {
  return (
    <span className={clsx(styles.badge, styles[variant], { [styles.active]: active })}>
      {variant}
    </span>
  );
}
```

- Chaîne → toujours incluse ; objet → clé incluse si la valeur est truthy ; falsy → ignoré.
- `styles[variant]` : accès dynamique typé si `Variant` est une union stricte.

### 2.5 Theming par variables CSS (custom properties)

Les variables CSS (`--nom`) sont la brique de theming **indépendante de l'approche** : elles marchent avec CSS Modules, Tailwind ou du CSS brut, et changent à l'exécution sans reconstruire le bundle. On déclare les tokens sur `:root`, on les surcharge sous un sélecteur de thème, et les composants ne référencent QUE les variables.

```css
/* tokens.css — chargé globalement (import dans le layout racine) */
:root {
  --tz-bg: #ffffff;
  --tz-text: #111827;
  --tz-primary: #2563eb;
  --tz-border: #e5e7eb;
}

/* Thème sombre : on surcharge les mêmes tokens */
[data-theme='dark'] {
  --tz-bg: #0f172a;
  --tz-text: #f1f5f9;
  --tz-primary: #60a5fa;
  --tz-border: #1e293b;
}
```

```css
/* FamilyCard.module.css — ne connaît que les tokens */
.card {
  background: var(--tz-bg);
  color: var(--tz-text);
  border: 1px solid var(--tz-border);
}
```

Basculer le thème = changer un attribut sur `<html>`, aucune reconstruction :

```tsx
// Toggle de thème — écrit l'attribut lu par le sélecteur [data-theme]
function toggleTheme() {
  const el = document.documentElement;
  const next = el.dataset.theme === 'dark' ? 'light' : 'dark';
  el.dataset.theme = next;
  localStorage.setItem('tz-theme', next); // persistance
}
```

C'est exactement le mécanisme que shadcn/ui expose : ses composants lisent des variables CSS (`--background`, `--foreground`) qu'un thème surcharge.

### 2.6 Les alternatives, et le point RSC crucial

**CSS-in-JS runtime (styled-components, emotion)** — on écrit le CSS dans des template literals JS, la classe est générée **à l'exécution dans le navigateur**.

```tsx
// styled-components — génération de style AU RUNTIME
import styled from 'styled-components';

const Card = styled.div<{ $elevated: boolean }>`
  padding: 1rem;
  box-shadow: ${(p) => (p.$elevated ? '0 4px 6px rgba(0,0,0,.1)' : 'none')};
`;
```

> **Incompatibilité RSC — le point à retenir (rappel module 25).** Un React Server Component s'exécute sur le serveur et n'envoie **aucun JavaScript** au client. Or le CSS-in-JS runtime a besoin de JS côté client (contexte, hooks de style, injection dynamique) pour produire ses classes. Un composant styled-components/emotion doit donc être `use client`, ce qui casse le bénéfice des RSC et interdit son usage dans un Server Component. C'est la raison n°1 du **déclin** de cette famille : styled-components est passé en mode maintenance et l'écosystème Next.js App Router la déconseille. Le legacy existe, il faut savoir le lire et le maintenir — pas le choisir pour du neuf.

**Zero-runtime CSS-in-TS (vanilla-extract, Panda CSS, Linaria)** — même ergonomie (styles typés en TS, autocomplétion des tokens) mais **extraits en fichiers `.css` statiques au build**. Zéro JS de style à l'exécution → **compatible RSC**.

```ts
// vanilla-extract — style.css.ts, extrait en CSS au build (zéro runtime)
import { style } from '@vanilla-extract/css';

export const card = style({
  padding: '1rem',
  background: 'var(--tz-bg)',
  ':hover': { boxShadow: '0 4px 6px rgba(0,0,0,.1)' },
});
```

C'est la réponse moderne à ceux qui veulent la DX du CSS-in-JS sans la pénalité runtime ni le blocage RSC.

**Utility-first (Tailwind — module 37)** — pas de classe custom, on compose des utilitaires atomiques ; zéro runtime, purge automatique. C'est le défaut de l'écosystème React/Next 2026.

### 2.7 Matrice de décision : quand choisir quoi

| Besoin dominant | Choix recommandé |
|---|---|
| Projet React/Next neuf, vélocité, équipe alignée | Tailwind (+ shadcn/ui) |
| Composant très custom, animations `@keyframes`, CSS complexe isolé | CSS Modules |
| DX typée du CSS-in-JS SANS runtime, compatible RSC | vanilla-extract / Panda |
| Base legacy déjà en styled-components/emotion | Maintenir, ne pas étendre ; migrer par îlots |
| Theming multi-thème (clair/sombre, marque blanche) | Variables CSS — transverse à tous les choix |

Combinaison courante et saine : **Tailwind** pour le layout et le 90 % courant, **CSS Modules** pour les quelques composants au CSS pointu, **variables CSS** pour le thème global. Ces trois-là sont zero-runtime et cohabitent sans friction.

---

## 3. Worked examples

### Exemple 1 — `FamilyCard` en CSS Modules + theming, avec variantes

On reprend le cas concret et on le rend scopé, thémé et à variantes.

```css
/* ─── FamilyCard.module.css ─────────────────────────────────────── */
.card {
  /* ne référence QUE des tokens → thème appliqué automatiquement */
  padding: 1rem;
  background: var(--tz-bg);
  color: var(--tz-text);
  border: 1px solid var(--tz-border);
  border-radius: 0.5rem;
  transition: box-shadow 0.2s;
}

/* Variante elevated : composée par-dessus .card via clsx côté TSX */
.elevated {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
.elevated:hover {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.badge {
  display: inline-block;
  background: var(--tz-primary);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}
```

```tsx
// ─── FamilyCard.tsx ────────────────────────────────────────────────
import styles from './FamilyCard.module.css';
import { clsx } from 'clsx';

interface Family {
  id: string;
  name: string;
  memberCount: number;
}

interface FamilyCardProps {
  family: Family;
  variant?: 'flat' | 'elevated';
}

// Composant présentationnel pur : pas d'état, pas de fetch.
// Il ne connaît aucune couleur en dur — tout passe par les tokens CSS.
function FamilyCard({ family, variant = 'flat' }: FamilyCardProps) {
  return (
    <div
      className={clsx(styles.card, {
        // .elevated ajouté seulement si variant === 'elevated'
        [styles.elevated]: variant === 'elevated',
      })}
    >
      <h3 className={styles.title}>{family.name}</h3>
      <span className={styles.badge}>{family.memberCount} membres</span>
    </div>
  );
}

export default FamilyCard;
```

**Ce que ça apporte :** les noms `card`/`title`/`badge` sont scopés (plus de collision globale), le composant suit le thème clair/sombre sans une seule couleur en dur, et la variante `elevated` s'ajoute proprement via `clsx`.

### Exemple 2 — Bascule de thème clair/sombre au runtime

Le composant `FamilyCard` ne bouge pas ; seul l'attribut `data-theme` sur `<html>` change, et toutes les variables se recalculent.

```tsx
// ─── ThemeToggle.tsx ───────────────────────────────────────────────
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  // Au montage : restaure le thème persisté (SSR-safe : localStorage lu côté client)
  useEffect(() => {
    const saved = (localStorage.getItem('tz-theme') as Theme | null) ?? 'light';
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // On écrit l'attribut lu par le sélecteur [data-theme='dark'] en CSS
    document.documentElement.dataset.theme = next;
    localStorage.setItem('tz-theme', next);
  }

  return (
    <button onClick={toggle} aria-pressed={theme === 'dark'}>
      {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    </button>
  );
}

export default ThemeToggle;
```

**Pourquoi ça marche sans reconstruire :** les variables CSS sont résolues par le navigateur à chaque rendu. Changer `[data-theme]` change la valeur de `--tz-bg` & co ; tout composant qui lit `var(--tz-bg)` se met à jour. Aucun rebuild, aucune duplication de règles — c'est l'avantage décisif du theming par variables sur des classes `dark:` figées.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que `<style scoped>` de Vue = CSS Modules

Les deux scopent, mais **différemment**. `<style scoped>` (Vue) ajoute un attribut `data-v-xxxx` et **garde le nom de classe d'origine**. CSS Modules **renomme la classe elle-même** (`badge` → `FamilyCard_badge_x7f2`). Conséquence : avec CSS Modules tu **dois** passer par `styles.badge` en JS ; écrire `className="badge"` en dur ne matchera jamais la classe générée.

```tsx
// ❌ Nom en dur : ne correspond à aucune classe générée → aucun style
<span className="badge">…</span>

// ✅ Passe par l'objet importé
<span className={styles.badge}>…</span>
```

### PIÈGE #2 — Utiliser CSS-in-JS runtime dans un Server Component

```tsx
// ❌ styled-components dans un fichier RSC (pas de 'use client')
import styled from 'styled-components';
const Box = styled.div`padding: 1rem;`; // échoue : besoin du runtime client
```

`styled-components`/`emotion` génèrent la classe **côté client au runtime** : ils exigent `use client` et cassent le bénéfice RSC (rappel module 25). Pour de la DX typée compatible RSC, prends **vanilla-extract / Panda** (extraits en CSS statique au build) ou reste sur CSS Modules / Tailwind.

### PIÈGE #3 — `composes` confondu avec l'héritage CSS

`composes` n'ajoute pas de spécificité ni ne « surcharge » comme une cascade : au build, la classe finale reçoit **les deux noms générés**. Donc l'ordre de déclaration des deux fichiers CSS dans le bundle décide qui gagne en cas de propriété identique. `composes` sert à **factoriser**, pas à hiérarchiser — et ne compose que depuis une classe, jamais un sélecteur complexe.

### PIÈGE #4 — Couleurs en dur au lieu de tokens → thème impossible

```css
/* ❌ Impossible à thémer : il faudrait dupliquer chaque règle en .dark */
.card { background: #ffffff; color: #111827; }

/* ✅ Le composant suit le thème sans code en plus */
.card { background: var(--tz-bg); color: var(--tz-text); }
```

Dès qu'un composant contient une couleur littérale, le mode sombre force à réécrire ou dupliquer la règle. Référencer uniquement des variables CSS rend le theming gratuit.

### PIÈGE #5 — `styles.typo` mal orthographié → `undefined` silencieux

`styles.tilte` (faute de frappe) vaut `undefined`. `className={undefined}` ne lève **aucune erreur** : le composant s'affiche juste sans style. Avec TypeScript + un plugin CSS Modules typé (ou `typed-css-modules`), la clé inexistante devient une erreur de compilation — active-le pour transformer ce bug silencieux en erreur.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, la stratégie de styling est **hybride et assumée** :

- **Tailwind + shadcn/ui** portent 90 % de l'UI (layout, formulaires, tables, dialogs) — vélocité et cohérence, choix par défaut (module 37).
- **CSS Modules** est réservé aux composants au CSS pointu que Tailwind rend illisible : `FamilyCard` avec ses états `elevated`/`hover`, les vues de statistiques avec animations `@keyframes`, le calendrier familial.
- **Variables CSS** (`--tz-bg`, `--tz-text`, `--tz-primary`…) définissent le thème clair/sombre, transverses à Tailwind ET CSS Modules — un seul jeu de tokens, deux consommateurs.

**Pourquoi Tailwind par défaut mais pas exclusif :** dans un composant avec 6 états visuels combinables, la chaîne d'utilitaires Tailwind devient un mur illisible ; un `.module.css` avec des noms sémantiques (`.elevated`, `.selected`) est plus maintenable. La règle d'équipe TribuZen : Tailwind d'abord, on bascule un composant précis en CSS Modules quand la chaîne de classes dépasse la lisibilité — jamais par principe.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/src/
  styles/
    tokens.css            ← :root + [data-theme='dark'], importé au layout racine
  components/
    features/
      family/
        FamilyCard.tsx
        FamilyCard.module.css
    layout/
      ThemeToggle.tsx     ← écrit data-theme sur <html>, persiste en localStorage
```

---

## 6. Points clés

1. Le CSS est global par défaut ; toute approche moderne résout le **scoping** — l'axe déterminant est runtime vs build.
2. CSS Modules (`*.module.css`) renomme les classes au build → collision impossible ; on y accède via l'objet `styles` importé, jamais par un nom en dur.
3. `composes ... from` factorise des classes (deux noms générés au build), ce n'est ni de l'héritage ni de la surcharge de cascade.
4. `clsx` gère les classes conditionnelles proprement, avec CSS Modules comme avec Tailwind.
5. Le theming par **variables CSS** est transverse : on surcharge les tokens sous `[data-theme]`, on bascule à l'exécution sans rebuild ni duplication.
6. CSS-in-JS runtime (styled-components, emotion) est en **déclin** : incompatible avec les Server Components (nécessite `use client`, rappel module 25) — legacy à lire, pas à choisir.
7. Zero-runtime CSS-in-TS (vanilla-extract, Panda, Linaria) offre la DX typée **sans** pénalité runtime et reste compatible RSC.
8. Décision : Tailwind par défaut, CSS Modules pour le CSS custom pointu, variables CSS pour le thème — les trois zero-runtime cohabitent.

---

## 7. Seeds Anki

```
Comment CSS Modules garantit-il l'absence de collision de noms de classes ?|Le bundler renomme chaque classe d'un fichier *.module.css en un nom unique au build (badge → FamilyCard_badge_x7f2). On y accède via l'objet styles importé ; un nom en dur ne matchera jamais la classe générée.
En quoi <style scoped> de Vue diffère-t-il de CSS Modules ?|Vue ajoute un attribut data-v-xxxx et garde le nom de classe d'origine ; CSS Modules renomme la classe elle-même. Donc avec CSS Modules on doit passer par styles.x, pas par className="x".
Que fait la directive composes en CSS Modules ?|Elle factorise une classe en réutilisant les règles d'une autre : au build la classe finale reçoit les deux noms générés. Ce n'est pas de l'héritage ni de la surcharge de cascade, et elle ne compose que depuis une classe.
Pourquoi le CSS-in-JS runtime (styled-components, emotion) est-il incompatible avec les Server Components ?|Il génère les classes en JavaScript au runtime côté client ; un Server Component n'envoie pas de JS. Le composant doit donc être use client, ce qui casse le bénéfice RSC. D'où le déclin de cette famille (styled-components en maintenance).
Quelle famille offre la DX du CSS-in-JS sans pénalité runtime ni blocage RSC ?|Le zero-runtime CSS-in-TS : vanilla-extract, Panda CSS, Linaria. On écrit les styles typés en TS, ils sont extraits en fichiers CSS statiques au build — zéro JS de style à l'exécution, compatible RSC.
Comment implémenter un thème clair/sombre sans dupliquer chaque règle CSS ?|Définir des tokens en variables CSS sur :root, les surcharger sous un sélecteur [data-theme='dark'], et ne référencer que var(--token) dans les composants. Basculer = changer l'attribut data-theme sur <html>, sans rebuild.
Quand choisir CSS Modules plutôt que Tailwind dans un projet React 2026 ?|Quand un composant a un CSS pointu (nombreux états combinables, animations @keyframes, custom isolé) où la chaîne d'utilitaires Tailwind devient illisible. Sinon Tailwind reste le défaut ; les deux + variables CSS cohabitent (tous zero-runtime).
Que se passe-t-il si on écrit styles.tilte (faute de frappe) en CSS Modules ?|La valeur est undefined, className={undefined} est ignoré par React sans erreur : le composant s'affiche sans style (bug silencieux). Un plugin CSS Modules typé transforme la clé inexistante en erreur de compilation.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-38-css-modules-et-alternatives/README.md`. Styliser `FamilyCard` de l'admin TribuZen en CSS Modules, ajouter le theming clair/sombre par variables CSS, et arbitrer le choix Tailwind vs CSS Modules pour l'admin.
