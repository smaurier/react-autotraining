# Lab 04 — Props et children

> **Outcome :** à la fin, tu sais typer des props avec TypeScript strict, passer des données parent → enfant, utiliser `children` pour composer, et spreader des props HTML natives — dans un vrai projet Vite + React 19.
> **Vrai outil :** Vite + React 19 + TypeScript strict (`strict: true` dans `tsconfig.json`).
> **Feedback :** le coach valide en session via `tsc --noEmit` (zéro erreur TypeScript) + rendu visuel dans le navigateur.

---

## Énoncé

Tu construis deux composants pour l'admin TribuZen : `FamilyCard` et `Panel`. Ensemble, ils constituent la vue principale du tableau de bord.

**Cahier des charges exact :**

### Composant 1 — `FamilyCard`

Fichier : `src/components/family/FamilyCard.tsx`

1. Reçoit une prop `family` typée avec cette interface (à définir dans `src/types/family.ts`) :

```ts
export interface Family {
  id: string;
  name: string;
  memberCount: number;
  plan: "free" | "pro" | "enterprise";
  createdAt: string; // ISO date : "2025-01-15"
}
```

2. Prop `highlighted?: boolean` — défaut `false`. Quand vrai, ajoute la classe CSS `card--highlighted` sur l'article.
3. Prop `onSelect?: (id: string) => void` — si fournie, rend la carte cliquable (onClick appelle `onSelect(family.id)`).
4. Affiche : nom de la famille, nombre de membres, label du plan (traduit : `free` → `"Gratuit"`, `pro` → `"Pro"`, `enterprise` → `"Entreprise"`), année d'inscription dérivée de `createdAt`.
5. TypeScript strict — `tsc --noEmit` doit retourner zéro erreur.

### Composant 2 — `Panel`

Fichier : `src/components/ui/Panel.tsx`

1. `title: string` — obligatoire.
2. `subtitle?: string` — affiché sous le titre si fourni.
3. `children: ReactNode` — corps principal du panel.
4. `actions?: ReactNode` — zone de boutons dans le header, affichée si fournie.
5. Hérite de toutes les props HTML d'une `<section>` via `ComponentPropsWithoutRef<"section">` — les spreader sur l'élément rendu **après** les props explicites.

### Assemblage dans `App.tsx`

Affiche un `Panel` avec `title="Familles actives"` contenant une liste de deux `FamilyCard` :

```ts
const families: Family[] = [
  { id: "f1", name: "Dupont",  memberCount: 4, plan: "pro",        createdAt: "2025-01-15" },
  { id: "f2", name: "Martin",  memberCount: 2, plan: "free",       createdAt: "2025-03-20" },
  { id: "f3", name: "Bernard", memberCount: 6, plan: "enterprise", createdAt: "2024-11-01" },
];
```

La carte `f1` est `highlighted`. Cliquer une carte log l'id dans la console.

**Pas de gap-fill** — tu écris les composants à partir du starter ci-dessous.

### Starter minimal

Projet Vite existant (`pnpm create vite@latest admin-tribuzen -- --template react-ts`), ou utilise `04-react/` si déjà configuré. Crée les fichiers suivants vides :

```
src/
  types/
    family.ts          ← interface Family
  components/
    family/
      FamilyCard.tsx   ← composant à écrire
    ui/
      Panel.tsx        ← composant à écrire
  App.tsx              ← assemblage
```

Lance `pnpm dev` et `pnpm tsc --noEmit` en parallèle pour avoir le feedback TypeScript en temps réel.

---

## Étapes (en friction)

1. **Définit l'interface `Family`** dans `src/types/family.ts` et l'exporte.
2. **Écris `FamilyCard`** — interface `FamilyCardProps`, destructuring avec défaut `highlighted = false`, Record pour les labels de plan, `onClick` conditionnel.
3. **Vérifie avec `tsc --noEmit`** — zéro erreur avant de continuer.
4. **Écris `Panel`** — `extends ComponentPropsWithoutRef<"section">`, destructuring de `className` et `...rest`, spread `{...rest}` **avant** `className` explicite.
5. **Assemble dans `App.tsx`** — liste les trois familles, `highlighted` sur `f1`, `onSelect` qui log l'id.
6. **Teste les cas limites** : retire `onSelect` sur une carte → plus cliquable ; retire `subtitle` et `actions` sur Panel → sections absentes du DOM.
7. **Ajoute un CSS minimal** (fichier `.css` ou `<style>` inline dans App) pour distinguer `.card--highlighted` (fond bleu pâle) du reste.

---

## Corrigé complet commenté

```tsx
// src/types/family.ts
export interface Family {
  id: string;
  name: string;
  memberCount: number;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}
```

```tsx
// src/components/family/FamilyCard.tsx
import { type Family } from "../../types/family";

interface FamilyCardProps {
  family: Family;
  highlighted?: boolean;        // optionnelle
  onSelect?: (id: string) => void; // callback optionnelle
}

export function FamilyCard({ family, highlighted = false, onSelect }: FamilyCardProps) {
  // Record pour mapper plan → label — TypeScript vérifie l'exhaustivité
  const planLabel: Record<Family["plan"], string> = {
    free: "Gratuit",
    pro: "Pro",
    enterprise: "Entreprise",
  };

  // Dériver l'année depuis la string ISO — ne mute pas la prop
  const year = new Date(family.createdAt).getFullYear();

  return (
    <article
      className={`card ${highlighted ? "card--highlighted" : ""}`}
      // onSelect optionnelle : si absente, onClick est undefined → carte non cliquable
      onClick={onSelect ? () => onSelect(family.id) : undefined}
      // style curseur conditionnel pour l'UX
      style={{ cursor: onSelect ? "pointer" : "default" }}
    >
      <h2 className="card-title">{family.name}</h2>
      <p className="card-meta">
        {/* pluriel conditionnel — logique dans le composant, pas dans le parent */}
        {family.memberCount} membre{family.memberCount > 1 ? "s" : ""}
        {" · "}
        {planLabel[family.plan]}
      </p>
      {/* dateTime pour l'accessibilité — attribut HTML standard */}
      <time className="card-date" dateTime={family.createdAt}>
        Depuis {year}
      </time>
    </article>
  );
}
```

```tsx
// src/components/ui/Panel.tsx
import { type ReactNode, type ComponentPropsWithoutRef } from "react";

// extends : hérite de tous les attributs HTML d'une <section>
interface PanelProps extends ComponentPropsWithoutRef<"section"> {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Panel({ title, subtitle, children, actions, className, ...rest }: PanelProps) {
  return (
    // {...rest} AVANT className explicite — évite qu'une className dans rest l'écrase
    <section {...rest} className={`panel ${className ?? ""}`}>
      <header className="panel-header">
        <div className="panel-header-text">
          <h2>{title}</h2>
          {/* subtitle optionnel — rien dans le DOM si absent */}
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {/* actions : slot nommé React — prop ReactNode dédiée */}
        {actions && <div className="panel-actions">{actions}</div>}
      </header>

      <div className="panel-body">
        {children}
      </div>
    </section>
  );
}
```

```tsx
// src/App.tsx
import { useState } from "react";
import { FamilyCard } from "./components/family/FamilyCard";
import { Panel } from "./components/ui/Panel";
import { type Family } from "./types/family";

const families: Family[] = [
  { id: "f1", name: "Dupont",  memberCount: 4, plan: "pro",        createdAt: "2025-01-15" },
  { id: "f2", name: "Martin",  memberCount: 2, plan: "free",       createdAt: "2025-03-20" },
  { id: "f3", name: "Bernard", memberCount: 6, plan: "enterprise", createdAt: "2024-11-01" },
];

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(id: string) {
    console.log("Famille sélectionnée :", id);
    setSelectedId(id);
  }

  return (
    <main style={{ padding: "2rem" }}>
      <Panel
        title="Familles actives"
        subtitle={`${families.length} familles`}
        data-testid="families-panel"  // passé via ...rest sur la <section>
        actions={
          <button onClick={() => console.log("export")}>
            Exporter CSV
          </button>
        }
      >
        <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "1rem" }}>
          {families.map((f) => (
            <li key={f.id}>
              <FamilyCard
                family={f}
                // f1 toujours highlighted — highlighted sur f2/f3 si sélectionné
                highlighted={f.id === "f1" || f.id === selectedId}
                onSelect={handleSelect}
              />
            </li>
          ))}
        </ul>
      </Panel>
    </main>
  );
}
```

**Vérification finale :**

```bash
pnpm tsc --noEmit   # → zéro erreur
pnpm dev            # → rendu visible, clic log l'id, f1 highlighted en bleu pâle
```

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Ajoute une prop `badge?: string` à `FamilyCard` — affiche un `<span className="badge">` dans le coin supérieur droit si fournie (ex: `"Nouveau"`, `"Suspendu"`).
2. Ajoute un composant `StatRow` qui reçoit `label: string` et `value: string | number` et les affiche dans une `<dl>` sémantique. Utilise `ComponentPropsWithoutRef<"dl">` pour le spread.
3. Utilise `StatRow` dans `FamilyCard` pour afficher membres et plan — remplace le `<p className="card-meta">`.
4. `tsc --noEmit` doit toujours retourner zéro erreur.

**Critère de réussite :** composants fonctionnels dans le navigateur, zéro erreur TypeScript, badge conditionnel visible.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces composants vivent ici :

```
tribuzen/
  src/
    types/
      family.ts              ← interface Family (source de vérité partagée)
    components/
      family/
        FamilyCard.tsx       ← ce lab, props typées
      ui/
        Panel.tsx            ← ce lab, children + spread
    pages/
      admin/
        FamiliesPage.tsx     ← assemblage : Panel + liste de FamilyCard
```

**Différences par rapport au lab :**

- `families` viendra d'un hook `useFamilies()` (fetch API TribuZen) au lieu de données statiques — les props `FamilyCard` restent identiques.
- Le style sera géré par le design system TribuZen (variables CSS tokens) — la logique `card--highlighted` et le spread de `className` restent identiques.
- `Panel` est le composant de layout universel de l'admin — toutes les pages admin en héritent.

**Commit cible :**

```
feat(admin): FamilyCard typée + Panel avec children — props React 19
```
