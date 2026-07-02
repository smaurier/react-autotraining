---
titre: Props et children
cours: 04-react
notions: [props typées avec TypeScript, passage de données parent vers enfant, children et composition, props par défaut, spread de props, flux de données unidirectionnel, prop drilling et ses limites]
outcomes: [typer et passer des props parent vers enfant, utiliser children pour composer, reconnaître le prop drilling et ses limites]
prerequis: [03-jsx-en-profondeur]
next: 05-composants-et-composition
libs: [{ name: react, version: "^19" }]
tribuzen: FamilyCard reçoit une famille typée en props dans l'admin TribuZen
last-reviewed: 2026-07
---

# Props et children

> **Outcomes — tu sauras FAIRE :** typer et passer des props d'un parent vers un enfant, utiliser `children` pour composer des composants, reconnaître le prop drilling et ses limites.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu rejoins l'équipe admin TribuZen. Ta première tâche : afficher une carte famille (`FamilyCard`) dans le tableau de bord. Un collègue a posté ce code dans la PR :

```tsx
// ❌ Version sans typage — que contient "family" ?
function FamilyCard({ family }) {
  return (
    <div className="card">
      <h2>{family.nom}</h2>         {/* nom ou name ? */}
      <p>{family.memberCount} membres</p>
      <span>{family.plan}</span>    {/* plan existe-t-il ? */}
    </div>
  );
}

// Appel parent
<FamilyCard family={selectedFamily} />
```

**Trois problèmes concrets :**
1. `family.nom` vs `family.name` — aucun IDE ne peut t'avertir si tu te trompes.
2. `family.plan` — la prop existe-t-elle dans l'objet retourné par l'API ?
3. Si `selectedFamily` est `null` au chargement, le composant crashe sans message utile.

Ce module te donne les outils pour corriger ça avec TypeScript.

---

## 2. Théorie complète, concise

### 2.1 Typer les props avec une interface

Les props React sont **un objet ordinaire**. On les type avec une `interface` (ou `type`) nommée `NomComposantProps` par convention.

```tsx
// Interface pour FamilyCard
interface Family {
  id: string;
  name: string;
  memberCount: number;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

interface FamilyCardProps {
  family: Family;           // obligatoire
  onSelect?: () => void;    // optionnelle — ? indique l'optionnalité
  highlighted?: boolean;    // optionnelle avec valeur par défaut possible
}

function FamilyCard({ family, onSelect, highlighted = false }: FamilyCardProps) {
  return (
    <div
      className={`card ${highlighted ? "card--highlighted" : ""}`}
      onClick={onSelect}
    >
      <h2>{family.name}</h2>
      <p>{family.memberCount} membres · {family.plan}</p>
    </div>
  );
}
```

TypeScript vérifie maintenant :
- `family.nom` → erreur : propriété `nom` inexistante sur `Family`
- `<FamilyCard />` sans `family` → erreur : prop obligatoire manquante
- `<FamilyCard family={null} />` → erreur : `null` n'est pas assignable à `Family`

### 2.2 Passage de données parent vers enfant

Les données descendent **uniquement du parent vers l'enfant** via les props. L'enfant ne peut pas modifier les props reçues — c'est le **flux unidirectionnel**.

```tsx
// Parent — possède et contrôle les données
function AdminDashboard() {
  const families: Family[] = [
    { id: "f1", name: "Dupont", memberCount: 4, plan: "pro", createdAt: "2025-01" },
    { id: "f2", name: "Martin", memberCount: 2, plan: "free", createdAt: "2025-03" },
  ];

  return (
    <div>
      {families.map((family) => (
        // Le parent passe chaque famille en prop — l'enfant affiche
        <FamilyCard key={family.id} family={family} />
      ))}
    </div>
  );
}
```

L'enfant ne "pull" pas ses données — le parent les "push" via les props. C'est le contrat React.

### 2.3 Props par défaut dans le destructuring

`defaultProps` est **supprimé en React 19** pour les composants fonction. La seule approche valide est le destructuring avec valeur par défaut :

```tsx
interface BadgeProps {
  label: string;
  variant?: "info" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
}

// ✅ Valeurs par défaut dans la signature — idiome React 19
function Badge({ label, variant = "info", size = "md" }: BadgeProps) {
  return <span className={`badge badge-${variant} badge-${size}`}>{label}</span>;
}

// ❌ Ne plus utiliser — supprimé en React 19
// Badge.defaultProps = { variant: "info", size: "md" };
```

Le destructuring avec défauts est plus lisible, plus proche du TypeScript pur, et fonctionne avec tous les outils d'analyse statique.

### 2.4 La prop `children` et la composition

`children` est une prop **implicite** qui contient tout ce qui est placé **entre les balises ouvrante et fermante** du composant. Son type standard est `ReactNode`.

```tsx
import { type ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;        // JSX, string, number, null, array — tout accepté
  footer?: ReactNode;         // section optionnelle en bas
}

function Panel({ title, children, footer }: PanelProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{title}</h2>
      </header>
      <div className="panel-body">
        {children}             {/* contenu libre injecté par le parent */}
      </div>
      {footer && (
        <footer className="panel-footer">{footer}</footer>
      )}
    </section>
  );
}

// Utilisation — tout ce qui est "dans" Panel devient children
<Panel
  title="Famille Dupont"
  footer={<button onClick={handleClose}>Fermer</button>}
>
  <FamilyCard family={dupont} />
  <p>Inscrite depuis janvier 2025</p>
</Panel>
```

**Nuances de type pour `children` :**

```tsx
children: ReactNode          // ✅ Le plus courant — accepte tout
children: ReactElement       // Uniquement des éléments React (pas de string brute)
children: string             // Uniquement du texte — rarement utile
children: (data: T) => ReactNode  // Render prop — pattern avancé (module suivant)
```

La composition via `children` est la façon React d'éviter le prop drilling pour le contenu UI.

### 2.5 Spread de props avec `...rest`

Quand un composant wrape un élément HTML natif, il faut pouvoir transmettre toutes les props HTML sans les lister une à une. Le pattern `...rest` avec `ComponentPropsWithoutRef` permet ça.

```tsx
import { type ComponentPropsWithoutRef } from "react";

// extends pour hériter de toutes les props d'un <button> HTML natif
interface ActionButtonProps extends ComponentPropsWithoutRef<"button"> {
  label: string;
  loading?: boolean;
}

function ActionButton({ label, loading = false, disabled, ...rest }: ActionButtonProps) {
  return (
    // {...rest} transmet : type, onClick, aria-*, data-*, className, etc.
    <button
      {...rest}
      disabled={disabled || loading}
      className={loading ? "btn btn--loading" : "btn"}
    >
      {loading ? "Chargement…" : label}
    </button>
  );
}

// Utilisation — toutes les props <button> natives sont disponibles
<ActionButton
  label="Approuver famille"
  onClick={() => approve(familyId)}
  type="submit"
  aria-label="Approuver la famille Dupont"
  loading={isSubmitting}
/>
```

> **`ComponentPropsWithoutRef<"button">`** expose tous les attributs HTML d'un `<button>` sauf le `ref`. Pour inclure le ref (patterns avancés), utiliser `ComponentPropsWithRef<"button">` ou `React.ButtonHTMLAttributes<HTMLButtonElement>`.

### 2.6 Flux unidirectionnel et prop drilling

Le flux unidirectionnel (données descendantes, événements montants) est le modèle mental fondamental de React. Il simplifie le débogage : pour toute valeur affichée, on remonte la chaîne de props jusqu'à la source.

**Prop drilling** : quand une donnée doit traverser plusieurs niveaux de composants pour atteindre le composant qui en a besoin.

```tsx
// Prop drilling sur 3 niveaux — currentUser doit atteindre UserAvatar
function App() {
  const currentUser = { name: "Alice", avatarUrl: "/alice.png" };
  return <Layout currentUser={currentUser} />;           // niveau 1 : passe la prop
}

function Layout({ currentUser }: { currentUser: User }) {
  return <Sidebar currentUser={currentUser} />;          // niveau 2 : re-passe sans l'utiliser
}

function Sidebar({ currentUser }: { currentUser: User }) {
  return <UserAvatar user={currentUser} />;              // niveau 3 : enfin utilisé
}

function UserAvatar({ user }: { user: User }) {
  return <img src={user.avatarUrl} alt={user.name} />;  // consommateur réel
}
```

**Limites du prop drilling :**
- `Layout` et `Sidebar` reçoivent `currentUser` sans s'en servir — couplage artificiel.
- Toute modification du type `User` force la mise à jour de chaque intermédiaire.
- Au-delà de 2-3 niveaux, la maintenance devient coûteuse.

**Solutions au prop drilling :** Context API (module 08) ou state management (Zustand, Jotai — modules avancés). Pour l'instant, retenir que le prop drilling est acceptable sur 2 niveaux et devient une dette technique au-delà.

---

## 3. Worked examples

### Exemple 1 — `FamilyCard` typée de A à Z (correction du cas concret)

```tsx
// types/family.ts — types partagés entre composants
export interface Family {
  id: string;
  name: string;
  memberCount: number;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

// components/family/FamilyCard.tsx
import { type Family } from "../../types/family";

interface FamilyCardProps {
  family: Family;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
}

// ✅ Destructuring avec défaut — highlighted vaut false si non fourni
export function FamilyCard({ family, highlighted = false, onSelect }: FamilyCardProps) {
  // ✅ TypeScript vérifie family.name, family.plan, family.memberCount — aucune surprise
  const planLabel: Record<Family["plan"], string> = {
    free: "Gratuit",
    pro: "Pro",
    enterprise: "Entreprise",
  };

  return (
    <article
      className={`card ${highlighted ? "card--highlighted" : ""}`}
      // ✅ onSelect est optionnelle — pas d'erreur si absent
      onClick={onSelect ? () => onSelect(family.id) : undefined}
    >
      <h2 className="card-title">{family.name}</h2>
      <p className="card-meta">
        {family.memberCount} membre{family.memberCount > 1 ? "s" : ""} · {planLabel[family.plan]}
      </p>
      <time className="card-date" dateTime={family.createdAt}>
        Depuis {new Date(family.createdAt).getFullYear()}
      </time>
    </article>
  );
}

// Utilisation dans le parent
function FamilyList() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const families: Family[] = [/* ... données API ... */];

  return (
    <ul className="family-list">
      {families.map((f) => (
        <li key={f.id}>
          <FamilyCard
            family={f}
            highlighted={f.id === selectedId}
            onSelect={setSelectedId}
          />
        </li>
      ))}
    </ul>
  );
}
```

**Ce que TypeScript vérifie :**
- `family.nom` → erreur : `nom` n'existe pas sur `Family`
- `planLabel[family.billing]` → erreur : `billing` n'est pas une clé de `Family`
- `<FamilyCard />` sans `family` → erreur : prop obligatoire manquante
- `onSelect="string"` → erreur : attend `(id: string) => void`

### Exemple 2 — `Panel` avec `children` et spread props

```tsx
import { type ReactNode, type ComponentPropsWithoutRef } from "react";

// Panel hérite de toutes les props HTML d'une <section>
interface PanelProps extends ComponentPropsWithoutRef<"section"> {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;   // boutons d'action dans le header — prop nommée plutôt que children
}

export function Panel({ title, subtitle, children, actions, className, ...rest }: PanelProps) {
  return (
    // {...rest} transmet : id, data-testid, aria-*, style, etc.
    <section className={`panel ${className ?? ""}`} {...rest}>
      <header className="panel-header">
        <div className="panel-header-text">
          <h2>{title}</h2>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {/* slot nommé en React : une prop ReactNode dédiée */}
        {actions && <div className="panel-actions">{actions}</div>}
      </header>

      <div className="panel-body">
        {children}
      </div>
    </section>
  );
}

// Composition dans AdminDashboard
<Panel
  title="Familles actives"
  subtitle="32 familles ce mois"
  data-testid="families-panel"
  actions={
    <>
      <button onClick={exportCsv}>Exporter</button>
      <button onClick={openModal}>+ Nouvelle famille</button>
    </>
  }
>
  <FamilyList />
</Panel>
```

**Pourquoi deux props plutôt qu'une seule `children` :**
- `children` = corps principal (FamilyList)
- `actions` = zone de boutons dans le header

React n'a pas de slots nommés comme Vue — on utilise des **props `ReactNode` dédiées** pour les zones multiples. C'est plus verbeux mais explicite et entièrement typé.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Muter une prop (le plus dangereux)

```tsx
// ❌ INTERDIT — React ne détecte pas toujours la mutation, mais c'est un bug réel
function FamilyCard({ family }: FamilyCardProps) {
  family.name = family.name.toUpperCase(); // Mutation directe de la prop !
  return <h2>{family.name}</h2>;
}

// ✅ Dériver une valeur locale — ne touche pas la prop source
function FamilyCard({ family }: FamilyCardProps) {
  const displayName = family.name.toUpperCase(); // valeur locale dérivée
  return <h2>{displayName}</h2>;
}
```

La mutation casse le modèle mental de React : le parent ne sait plus quelle valeur est affichée. TypeScript ne le détecte pas (`readonly` doit être ajouté manuellement sur l'interface), mais c'est un bug de comportement certain en production.

### PIÈGE #2 — `defaultProps` sur un composant fonction (React 19)

```tsx
// ❌ Supprimé en React 19 — erreur à l'exécution
function Badge({ label, variant }: BadgeProps) { /* ... */ }
Badge.defaultProps = { variant: "info" }; // déprécié 18.3, supprimé 19

// ✅ Valeur par défaut dans le destructuring — la seule approche valide
function Badge({ label, variant = "info" }: BadgeProps) { /* ... */ }
```

`defaultProps` reste disponible pour les **class components** (legacy), mais n'a jamais été nécessaire pour les composants fonction.

### PIÈGE #3 — Confondre `ReactNode` et `ReactElement`

```tsx
// ReactElement — uniquement des éléments JSX (retour de React.createElement)
interface SlotProps {
  icon: ReactElement;   // ❌ "Bonjour" ou {42} planteront ici
}

// ReactNode — tout ce que React sait afficher
interface SlotProps {
  icon: ReactNode;      // ✅ JSX, string, number, null, array — tout accepté
}
```

Utiliser `ReactElement` seulement quand le composant doit appeler `.props` ou `React.cloneElement` sur l'enfant — cas avancé. Par défaut : `ReactNode`.

### PIÈGE #4 — Prop drilling masqué par un composant intermédiaire "muet"

```tsx
// ❌ Composant intermédiaire qui ne fait que passer la prop — signe de prop drilling
function FamilySection({ currentUser, families }: { currentUser: User; families: Family[] }) {
  return <FamilyTable families={families} adminUser={currentUser} />;
  //                                               ↑ currentUser renommé en adminUser — confus
}

// ✅ Signal d'alarme : si un composant reçoit une prop qu'il n'utilise PAS dans son JSX
// → candidat au refactoring vers Context ou état global
```

Le symptôme est un composant qui ne consomme pas une prop mais la passe à un enfant. C'est le critère objectif pour introduire un Context (module 08).

### PIÈGE #5 — `...rest` écrase les props explicites si mal ordonné

```tsx
// ❌ {...rest} avant className — className de rest écrase la classe du composant
function Panel({ className, ...rest }: PanelProps) {
  return <section {...rest} className={`panel ${className ?? ""}`} />;
  //                        ↑ mis APRÈS {...rest} — ✅ correct
}

// ❌ Ordre inversé — la className de l'appelant peut supprimer "panel"
function Panel({ className, ...rest }: PanelProps) {
  return <section className={`panel ${className ?? ""}`} {...rest} />;
  //              ↑ mis AVANT {...rest} — className dans rest l'écrase !
}
```

Règle : mettre les props explicites **après** `{...rest}` pour qu'elles aient la priorité.

---

## 5. Ancrage TribuZen

Dans TribuZen, les props typées sont la colonne vertébrale de l'admin :

**`FamilyCard.tsx`** (Exemple 1 de ce module) — reçoit une `Family` typée depuis le parent `FamilyList`. Le type `Family` est défini dans `src/types/family.ts` et importé par tous les composants qui manipulent une famille. Aucun composant ne devine la forme des données.

**`Panel.tsx`** (Exemple 2) — wrapper de layout qui utilise `children` + `actions` (prop `ReactNode` nommée) + spread `ComponentPropsWithoutRef<"section">`. Tous les panneaux de l'admin TribuZen (familles, membres, statistiques) réutilisent ce composant.

**Prop drilling dans TribuZen :** l'identité de l'admin connecté (`currentUser`) descend de `App` → `AdminLayout` → `Sidebar`. Deux niveaux : acceptable. Si elle devait descendre jusqu'à `FamilyCard`, ce serait le signal d'introduire un `UserContext`.

Fichiers cibles dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    types/
      family.ts              ← interface Family (source de vérité)
    components/
      family/
        FamilyCard.tsx       ← props typées + highlighted + onSelect
      ui/
        Panel.tsx            ← children + actions + spread section
```

---

## 6. Points clés

1. Les props sont un objet — les typer avec `interface NomComposantProps` et les destructurer dans la signature.
2. Toute prop non marquée `?` est obligatoire — TypeScript le vérifie à la compilation.
3. Les valeurs par défaut se mettent dans le destructuring : `{ variant = "info" }` — `defaultProps` est supprimé en React 19.
4. `children: ReactNode` est la prop spéciale pour la composition — type le plus permissif, le plus courant.
5. `ComponentPropsWithoutRef<"button">` via `extends` permet le spread props HTML sans les lister.
6. Les props sont en lecture seule — toute mutation est un bug silencieux ; dériver une valeur locale à la place.
7. Le flux est unidirectionnel : données descendent par les props, événements montent par les callbacks.
8. Le prop drilling au-delà de 2 niveaux est le signal objectif pour introduire Context ou un store.

---

## 7. Seeds Anki

```
Pourquoi les valeurs par défaut de props se mettent dans le destructuring et non dans defaultProps ?|defaultProps est supprimé en React 19 pour les composants fonction. Le destructuring ({ variant = "info" }: Props) est la seule approche valide, plus lisible et pleinement typée par TypeScript.
Quel est le type React pour children qui accepte JSX, strings, numbers, null et arrays ?|ReactNode — le type le plus large. ReactElement n'accepte que des éléments JSX (pas de strings brutes). Par défaut, utiliser ReactNode pour children.
Comment hériter des props HTML natives d'un <button> dans une interface de composant ?|interface ActionButtonProps extends ComponentPropsWithoutRef<"button"> — puis spreader ...rest sur le <button> natif rendu. ComponentPropsWithRef inclut aussi le ref.
Qu'est-ce que le prop drilling et quel est le critère objectif pour le détecter ?|Un composant reçoit une prop qu'il ne consomme pas dans son JSX et la passe à un enfant. Signal objectif : prop présente dans l'interface mais absente du rendu JSX du composant.
Pourquoi les props React sont-elles en lecture seule et que faire si on doit modifier une valeur ?|Les props viennent du parent — les muter brise le modèle unidirectionnel et crée des bugs silencieux. Dériver une valeur locale (const display = prop.toUpperCase()) ou remonter l'événement via une callback.
Quelle est la règle d'ordre entre {...rest} et les props explicites dans un spread ?|Les props explicites doivent être placées APRÈS {...rest} pour avoir la priorité — sinon une prop dans rest peut écraser la valeur calculée du composant (ex: className).
Comment React remplace-t-il les slots nommés de Vue pour les zones multiples d'un composant ?|Via des props ReactNode dédiées — ex: actions?: ReactNode pour la zone de boutons, footer?: ReactNode pour le bas. Plus verbeux que les slots Vue mais entièrement typé.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-04-props-et-children/README.md`. Construire `FamilyCard` et `Panel` avec props typées, children et spread — vrai projet Vite + React 19 + TypeScript strict, corrigé commenté intégral.
