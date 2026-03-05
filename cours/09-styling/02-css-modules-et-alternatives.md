# Cours 37 — CSS Modules et alternatives de styling

> **Objectif** : Maîtriser CSS Modules (scoping automatique, zero runtime), savoir quand choisir CSS Modules vs Tailwind, connaître les alternatives historiques (styled-components, CSS-in-JS) et découvrir shadcn/ui, LA bibliothèque de composants React de référence en 2025. Comparer avec les scoped styles Vue et Angular Material.

---

## Rappel du cours précédent

<details>
<summary>1. Quel est le principe "mobile-first" de Tailwind ?</summary>

Les classes sans préfixe s'appliquent à toutes les tailles d'écran (mobile d'abord). Les préfixes `sm:`, `md:`, `lg:`, `xl:` ajoutent des styles à partir de la taille spécifiée. On construit la mise en page pour mobile, puis on l'enrichit pour les écrans plus grands.
</details>

<details>
<summary>2. A quoi sert la fonction cn() ?</summary>

`cn()` combine `clsx` (conditions sur les classes) et `tailwind-merge` (résolution des conflits Tailwind). Elle permet de passer des classes conditionnellement et de laisser les classes externes (via prop `className`) écraser les classes internes.
</details>

<details>
<summary>3. Comment activer le dark mode avec Tailwind ?</summary>

Configurer `darkMode: "class"` dans `tailwind.config.ts`, puis utiliser le préfixe `dark:` sur les classes. Le dark mode s'active en ajoutant la classe `dark` sur l'élément `<html>`.
</details>

---

## Analogie

Si Tailwind est un **catalogue de stickers prédéfinis**, CSS Modules est comme un **atelier de gravure personnalisé** : vous dessinez exactement ce que vous voulez, et l'atelier s'assure que votre gravure ne sera pas confondue avec celle de quelqu'un d'autre (noms de classes uniques automatiquement). C'est plus de travail mais plus de liberté créative.

`styled-components` serait un graveur qui travaille directement dans votre code JavaScript — pratique mais il ralentit la chaîne de production (runtime CSS). Et shadcn/ui ? C'est un **catalogue de plans de gravure open-source** : vous copiez les plans dans votre atelier et les personnalisez à volonté.

---

## Théorie

### 1. CSS Modules : le scoping automatique

CSS Modules est intégré nativement dans Next.js et Vite. Chaque fichier `.module.css` génère des noms de classes uniques :

```css
/* components/Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.primary {
  background-color: #2563eb;
  color: white;
}

.primary:hover {
  background-color: #1d4ed8;
}

.secondary {
  background-color: #e5e7eb;
  color: #111827;
}
```

```tsx
// components/Button.tsx
import styles from "./Button.module.css";

interface ButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

function Button({ variant = "primary", children }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  );
}
```

Le HTML généré :

```html
<!-- Les noms sont uniques : pas de collision possible -->
<button class="Button_button_x7f2a Button_primary_k3d9e">
  Cliquez
</button>
```

> **Comparaison Vue** : CSS Modules en React fonctionne exactement comme les `<style module>` en Vue SFC. Le `<style scoped>` Vue ajoute un attribut `data-v-xxxxx` ; CSS Modules renomme la classe elle-même.

> **Comparaison Angular** : Angular encapsule par défaut avec `ViewEncapsulation.Emulated` (attributs `_ngcontent-xxx`). CSS Modules est un mécanisme similaire mais au niveau build.

### 2. Techniques avancées CSS Modules

#### Composition de classes

```css
/* shared/typography.module.css */
.heading {
  font-weight: 700;
  line-height: 1.2;
}
```

```css
/* components/Card.module.css */
.title {
  composes: heading from "../shared/typography.module.css";
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}
```

#### Classes conditionnelles avec clsx

```tsx
import styles from "./Alert.module.css";
import { clsx } from "clsx";

function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={clsx(styles.alert, styles[type])}>
      {message}
    </div>
  );
}
```

#### Variables CSS pour le theming

```css
/* globals.css */
:root {
  --color-primary: #2563eb;
  --color-bg: #ffffff;
  --color-text: #111827;
}

.dark {
  --color-primary: #60a5fa;
  --color-bg: #0f172a;
  --color-text: #f1f5f9;
}
```

```css
/* components/Card.module.css */
.card {
  background-color: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-primary);
}
```

### 3. Tailwind vs CSS Modules : matrice de décision

| Critère | Tailwind | CSS Modules |
|---------|----------|-------------|
| Vitesse de développement | Rapide (pas de fichier CSS séparé) | Moyenne (fichier CSS à créer) |
| Cohérence design | Tokens intégrés | Manuelle (variables CSS) |
| Animations complexes | Limitées (besoin de CSS custom) | Illimitées |
| Taille du bundle | Optimal (purge) | Bon (scoped, pas de runtime) |
| Lisibilité JSX | Longues chaînes de classes | Noms sémantiques courts |
| Onboarding équipe | Courbe d'apprentissage Tailwind | CSS standard |
| Design system existant | S'adapte au thème Tailwind | S'adapte aux variables CSS |

**Recommandation :**

```
Nouveau projet React/Next.js → Tailwind (standard ESN)
Design très custom / animations → CSS Modules pour les cas complexes
Les deux ensemble → Tailwind pour le layout, CSS Modules pour les animations
```

### 4. styled-components (CSS-in-JS historique)

```bash
npm install styled-components @types/styled-components
```

```tsx
import styled from "styled-components";

// ❌ En 2025, préférer Tailwind ou CSS Modules
const StyledButton = styled.button<{ $variant: "primary" | "danger" }>`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  color: white;
  background-color: ${({ $variant }) =>
    $variant === "primary" ? "#2563eb" : "#dc2626"};

  &:hover {
    opacity: 0.9;
  }
`;

function App() {
  return <StyledButton $variant="primary">Cliquez</StyledButton>;
}
```

**Problèmes du CSS-in-JS :**

| Problème | Impact |
|----------|--------|
| Runtime overhead | Le CSS est généré en JavaScript au runtime |
| Server Components incompatible | Ne fonctionne pas avec les RSC de Next.js |
| Bundle size | Bibliothèque ajoutée au bundle client |
| Hydration mismatch | Risque de flash de contenu non stylé |

> styled-components reste dans de nombreux projets legacy. Il faut savoir le lire et le maintenir, mais ne pas le choisir pour un nouveau projet.

### 5. shadcn/ui : LA bibliothèque de composants React 2025

shadcn/ui n'est **pas** une bibliothèque installée via npm. C'est un **générateur de composants** : il copie le code source directement dans votre projet, vous permettant de le personnaliser à 100%.

```bash
# Initialisation dans un projet Next.js
npx shadcn@latest init

# Ajouter un composant
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
```

Le composant est copié dans `components/ui/` :

```
components/
└── ui/
    ├── button.tsx    ← Code source complet, modifiable
    ├── card.tsx
    ├── dialog.tsx
    └── input.tsx
```

#### Utilisation

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function TaskCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{description}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="default">Modifier</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button variant="outline">Annuler</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Pourquoi shadcn/ui domine en 2025 ?

| Avantage | Détail |
|----------|--------|
| Code source dans le projet | Pas de dépendance npm, personnalisation totale |
| Basé sur Radix UI | Accessibilité (a11y) intégrée |
| Tailwind natif | S'intègre parfaitement avec Tailwind |
| Thème configurable | Variables CSS pour changer tout le design |
| Composants complets | Dialog, Dropdown, Table, Form, Toast, etc. |
| Next.js compatible | Server Components + Client Components |

> **Comparaison** : en Angular, Angular Material est la bibliothèque de référence. En Vue, PrimeVue ou Vuetify. En React 2025, c'est shadcn/ui (devant MUI/Ant Design qui sont plus lourds et plus opinionnés).

### 6. Résumé des approches de styling

```
                          ┌─────────────────────────────┐
                          │     Nouveau projet 2025     │
                          └──────────┬──────────────────┘
                                     │
                          ┌──────────▼──────────────────┐
                          │ Tailwind CSS (base layout)  │
                          │ + shadcn/ui (composants UI) │
                          │ + cn() (classes dynamiques) │
                          └──────────┬──────────────────┘
                                     │
                     ┌───────────────┼──────────────────┐
                     │               │                  │
              CSS Modules       Variables CSS      Animations
           (composants très    (theming global)    CSS custom
            custom, isolés)                       (@keyframes)
```

---

## Pratique

### Exercice : créer un composant Card avec CSS Modules et une variante Tailwind

1. Créez `Card.module.css` et `Card.tsx` utilisant CSS Modules avec :
   - Variante `elevated` (ombre portée) et `outlined` (bordure)
   - Support dark mode via variables CSS

2. Créez le même composant `TailwindCard.tsx` avec Tailwind + `cn()`

3. Comparez la lisibilité et le nombre de lignes

<details>
<summary>Voir la solution</summary>

**Version CSS Modules :**

```css
/* Card.module.css */
.card {
  border-radius: 0.5rem;
  padding: 1.5rem;
  background-color: var(--color-bg, #ffffff);
  color: var(--color-text, #111827);
  transition: box-shadow 0.2s;
}

.elevated {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.elevated:hover {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.outlined {
  border: 1px solid var(--color-border, #e5e7eb);
}

.title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.body {
  font-size: 0.875rem;
  color: var(--color-muted, #6b7280);
}
```

```tsx
// Card.tsx (CSS Modules)
import styles from "./Card.module.css";
import { clsx } from "clsx";

interface CardProps {
  variant?: "elevated" | "outlined";
  title: string;
  children: React.ReactNode;
}

function Card({ variant = "elevated", title, children }: CardProps) {
  return (
    <div className={clsx(styles.card, styles[variant])}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
```

**Version Tailwind :**

```tsx
// TailwindCard.tsx
import { cn } from "@/lib/utils";

interface TailwindCardProps {
  variant?: "elevated" | "outlined";
  title: string;
  children: React.ReactNode;
  className?: string;
}

function TailwindCard({ variant = "elevated", title, children, className }: TailwindCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-shadow",
        {
          "shadow-md hover:shadow-lg": variant === "elevated",
          "border border-gray-200 dark:border-gray-800": variant === "outlined",
        },
        className
      )}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-sm text-gray-500 dark:text-gray-400">{children}</div>
    </div>
  );
}
```

**Comparaison :** CSS Modules = 2 fichiers, plus de lignes, noms sémantiques. Tailwind = 1 fichier, inline, plus rapide à écrire. Pour un composant UI standard, Tailwind est plus productif. Pour des animations ou du CSS très custom, CSS Modules offre plus de flexibilité.

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| CSS Modules | Scoping automatique, zero runtime, fichiers `.module.css` |
| Tailwind vs Modules | Tailwind pour la majorité, Modules pour le custom poussé |
| styled-components | Legacy, runtime overhead, incompatible Server Components |
| CSS-in-JS | A éviter pour les nouveaux projets Next.js |
| shadcn/ui | Composants copiés dans le projet, Radix UI + Tailwind, standard 2025 |
| `cn()` | Indispensable pour les classes Tailwind conditionnelles |

> **Prochain cours** : [Cours 38 — Authentification avec Auth.js](../10-auth-securite/01-auth-nextauth.md)
