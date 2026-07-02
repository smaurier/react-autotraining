# Lab 38 — CSS Modules et theming par variables CSS

> **Outcome :** à la fin, tu sais styliser un composant React 19 + TypeScript en CSS Modules (scoping local, variantes, `clsx`), mettre en place un theming clair/sombre par variables CSS, et justifier le choix Tailwind vs CSS Modules pour l'admin.
> **Vrai outil :** React 19 + Vite (support CSS Modules natif, HMR visible dans le navigateur). Aucun harnais de test simulé.
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu stylises la carte famille de l'admin TribuZen. Cahier des charges **exact** :

1. **`FamilyCard`** stylé en **CSS Modules** (`FamilyCard.module.css`) — scoping local, aucun nom de classe global.
2. Deux variantes via `clsx` : `flat` (défaut) et `elevated` (ombre + ombre au survol).
3. **Theming clair/sombre par variables CSS** : un fichier `tokens.css` global (`:root` + `[data-theme='dark']`). `FamilyCard` ne référence QUE des tokens (`var(--tz-...)`) — zéro couleur en dur.
4. **`ThemeToggle`** — bouton qui bascule `data-theme` sur `<html>` et persiste le choix en `localStorage`.
5. Rédige un court **arbitrage Tailwind vs CSS Modules** pour ce composant (3-4 lignes, dans un commentaire ou le README de ton projet).

**Données de départ (à copier dans `App.tsx`) :**

```tsx
export interface Family {
  id: string;
  name: string;
  memberCount: number;
}

const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', memberCount: 4 },
  { id: 'f2', name: 'Les Martin', memberCount: 2 },
  { id: 'f3', name: 'Les Nguyen', memberCount: 5 },
];
```

**Contraintes :**
- `FamilyCard` est un composant **présentationnel pur** : pas de `useEffect`, pas de fetch.
- **Aucune couleur littérale** dans `FamilyCard.module.css` — uniquement `var(--tz-...)`.
- Accès à la variante via `styles[variant]` OU via `clsx` conditionnel — pas de nom de classe en dur.
- **Pas de gap-fill** : tu écris chaque fichier complet depuis le starter.

### Starter minimal

```
pnpm create vite@latest tribuzen-lab-38 --template react-ts
```

Structure cible :

```
src/
  styles/
    tokens.css              ← à écrire (:root + [data-theme='dark'])
  components/
    FamilyCard.tsx          ← à écrire
    FamilyCard.module.css   ← à écrire
    ThemeToggle.tsx         ← à écrire
  App.tsx                   ← importe tokens.css, mappe DEMO_FAMILIES, branche ThemeToggle
  main.tsx                  ← inchangé
```

Dans `main.tsx`, importe `tokens.css` une fois (ou dans `App.tsx`). Lance `pnpm dev` et valide dans le navigateur.

---

## Étapes (en friction)

1. **Écris `styles/tokens.css`** — sur `:root`, déclare `--tz-bg`, `--tz-text`, `--tz-primary`, `--tz-border`. Sous `[data-theme='dark']`, surcharge les mêmes tokens avec des valeurs sombres. Ajoute une transition douce sur `body { background: var(--tz-bg); color: var(--tz-text); }`.
2. **Écris `FamilyCard.module.css`** — `.card` (padding, `var(--tz-bg)`, `var(--tz-text)`, bordure `var(--tz-border)`), `.elevated` + `.elevated:hover` (box-shadow), `.title`, `.badge` (fond `var(--tz-primary)`). **Zéro couleur en dur.**
3. **Écris `FamilyCard.tsx`** — `import styles from './FamilyCard.module.css'`, props `{ family, variant?: 'flat' | 'elevated' }`. Assemble via `clsx(styles.card, { [styles.elevated]: variant === 'elevated' })`.
4. **Écris `ThemeToggle.tsx`** — state `theme`, `useEffect` de restauration depuis `localStorage`, `toggle()` qui écrit `document.documentElement.dataset.theme` et persiste.
5. **Branche `App.tsx`** — importe `tokens.css`, affiche `<ThemeToggle />` puis `DEMO_FAMILIES.map(...)` en `FamilyCard` (mets `variant="elevated"` sur une carte).
6. **Vérifie dans le navigateur** : clic sur le toggle → toutes les cartes changent de fond/texte sans rechargement ; inspecte le DOM → les classes portent des noms générés uniques (`FamilyCard_card_...`) ; recharge la page → le thème persiste.

---

## Corrigé complet commenté

```css
/* ─── src/styles/tokens.css ──────────────────────────────────────── */
/* Tokens du thème clair (valeurs par défaut) */
:root {
  --tz-bg: #ffffff;
  --tz-text: #111827;
  --tz-primary: #2563eb;
  --tz-border: #e5e7eb;
}

/* Thème sombre : on surcharge LES MÊMES tokens.
   Aucun composant n'est modifié — ils lisent var(--tz-*). */
[data-theme='dark'] {
  --tz-bg: #0f172a;
  --tz-text: #f1f5f9;
  --tz-primary: #60a5fa;
  --tz-border: #1e293b;
}

body {
  margin: 0;
  padding: 2rem;
  background: var(--tz-bg);
  color: var(--tz-text);
  transition: background 0.2s, color 0.2s; /* bascule douce */
  font-family: system-ui, sans-serif;
}
```

```css
/* ─── src/components/FamilyCard.module.css ───────────────────────── */
/* Scopé : ces noms deviennent FamilyCard_card_xxx au build.
   Aucune couleur en dur — uniquement des tokens. */
.card {
  padding: 1rem;
  background: var(--tz-bg);
  color: var(--tz-text);
  border: 1px solid var(--tz-border);
  border-radius: 0.5rem;
  transition: box-shadow 0.2s;
}

/* Variante ajoutée par-dessus .card via clsx côté TSX */
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
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}
```

```tsx
// ─── src/components/FamilyCard.tsx ───────────────────────────────
import styles from './FamilyCard.module.css';
import { clsx } from 'clsx';

export interface Family {
  id: string;
  name: string;
  memberCount: number;
}

interface FamilyCardProps {
  family: Family;
  variant?: 'flat' | 'elevated';
}

// Présentationnel pur : pas d'état, pas de fetch.
// Ne connaît aucune couleur — tout vient des tokens CSS (thème transparent).
function FamilyCard({ family, variant = 'flat' }: FamilyCardProps) {
  return (
    <div
      className={clsx(styles.card, {
        // .elevated inclus seulement si variant === 'elevated'
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

```tsx
// ─── src/components/ThemeToggle.tsx ──────────────────────────────
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  // Restaure le thème persisté au montage (localStorage lu côté client)
  useEffect(() => {
    const saved = (localStorage.getItem('tz-theme') as Theme | null) ?? 'light';
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // Écrit l'attribut lu par le sélecteur [data-theme='dark'] dans tokens.css
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

```tsx
// ─── src/App.tsx ─────────────────────────────────────────────────
import './styles/tokens.css'; // charge les variables globales UNE fois
import FamilyCard, { type Family } from './components/FamilyCard';
import ThemeToggle from './components/ThemeToggle';

const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', memberCount: 4 },
  { id: 'f2', name: 'Les Martin', memberCount: 2 },
  { id: 'f3', name: 'Les Nguyen', memberCount: 5 },
];

function App() {
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1>TribuZen Admin — Familles</h1>
        <ThemeToggle />
      </header>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {DEMO_FAMILIES.map((family, i) => (
          // Une carte en elevated pour montrer la variante
          <FamilyCard key={family.id} family={family} variant={i === 0 ? 'elevated' : 'flat'} />
        ))}
      </div>
    </div>
  );
}

export default App;
```

**Arbitrage Tailwind vs CSS Modules pour cette carte (à rédiger toi-même, exemple de correction) :**

> `FamilyCard` a peu d'états visuels (2 variantes) mais un besoin de theming clair/sombre. Tailwind conviendrait aussi (`dark:` + tokens). On garde CSS Modules ici parce que le composant sert d'exemple de CSS scopé et parce que ses règles `:hover` composées restent plus lisibles en `.module.css` qu'en chaîne d'utilitaires. Dans l'admin réelle, ce même composant serait probablement en Tailwind + shadcn ; on bascule en CSS Modules seulement si les états se multiplient.

**Pourquoi ce corrigé est correct :**
- `FamilyCard` ne contient **aucune couleur littérale** : il lit `var(--tz-*)`, donc la bascule de thème est gratuite.
- Les classes sont scopées (`styles.card`) : aucun risque de collision avec une autre feature déclarant `.card`.
- `clsx` ajoute `.elevated` conditionnellement sans concaténation manuelle fragile.
- `ThemeToggle` agit sur `data-theme` de `<html>` — un seul point de vérité, lu par le sélecteur CSS ; aucun rebuild, aucune duplication de règles.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes :**

1. Ajoute une **troisième variante** `selected` (bordure `2px solid var(--tz-primary)`), gérée dans le même `clsx`.
2. Ajoute un token `--tz-radius` et utilise-le pour `border-radius` dans `.card` et `.badge` — prouve qu'un token peut piloter autre chose que la couleur.
3. Ajoute un **thème « sépia »** (`[data-theme='sepia']`) et fais du `ThemeToggle` un cycle à 3 états (`light → dark → sepia → light`).
4. **Sans rouvrir ce corrigé** ni le module 38.

**Critère de réussite :** les trois thèmes basculent sans rechargement, la carte `selected` a sa bordure primaire, le rayon vient du token, et le choix persiste au reload.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/src/
  styles/
    tokens.css                      ← :root + [data-theme='dark'], importé au layout racine
  components/
    features/
      family/
        FamilyCard.tsx
        FamilyCard.module.css
    layout/
      ThemeToggle.tsx               ← écrit data-theme sur <html>, persiste en localStorage
```

**Différences par rapport au lab :**
- Le jeu de tokens réel est plus large (espacements, rayons, ombres) et aligné sur le thème shadcn/ui existant — mêmes variables CSS, consommées à la fois par Tailwind et par les `.module.css`.
- `ThemeToggle` réel évite le flash de thème initial (script inline dans le `<head>` qui pose `data-theme` avant l'hydratation) — hors périmètre du lab.
- La stratégie d'équipe reste **Tailwind par défaut** ; `FamilyCard` en CSS Modules illustre le cas « CSS custom pointu » où l'on bascule volontairement.

**Commit cible :**
```
feat(styles): tokens.css — theming clair/sombre par variables CSS
feat(family): FamilyCard en CSS Modules (variantes flat/elevated) + ThemeToggle
```
