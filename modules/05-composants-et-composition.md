---
titre: Composants et composition
cours: 04-react
notions: [composition plutôt qu'héritage, composants présentational et container, composants réutilisables, pattern children comme slots, render props en survol, découpage d'un composant complexe, colocation]
outcomes: [composer des composants plutôt qu'hériter, séparer présentation et logique, découper un composant complexe en pièces réutilisables]
prerequis: [04-props-et-children]
next: 06-rendu-conditionnel-et-listes
libs: [{ name: react, version: "^19" }]
tribuzen: composants réutilisables de l'admin TribuZen (Card, Avatar, Badge) par composition
last-reviewed: 2026-07
---

# Composants et composition

> **Outcomes — tu sauras FAIRE :** composer des composants React plutôt qu'hériter, séparer présentation et logique en composants distincts, découper un composant complexe en pièces réutilisables.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu intègres l'admin TribuZen. Un collègue a laissé ce composant qui gère la fiche d'un membre :

```tsx
// MemberPanel.tsx — AVANT découpage
function MemberPanel({ member }: { member: Member }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="panel">
      {/* Avatar */}
      <div className="avatar-wrapper">
        <img src={member.avatar} alt={member.name} className="avatar" />
        {member.isOnline && <span className="online-dot" />}
      </div>

      {/* Badge rôle */}
      <span className={`badge badge--${member.role}`}>
        {member.role === 'admin' ? 'Admin' : member.role === 'mod' ? 'Modo' : 'Membre'}
      </span>

      {/* Infos détail */}
      {expanded && (
        <div className="detail">
          <p>Email : {member.email}</p>
          <p>Inscrit le : {new Date(member.createdAt).toLocaleDateString('fr')}</p>
          <p>Famille : {member.familyName}</p>
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Réduire' : 'Détails'}
      </button>
    </div>
  );
}
```

**Trois problèmes immédiats :**
1. `Avatar` + `Badge` + `MemberDetail` sont mélangés — impossible de réutiliser `Badge` ailleurs (notifications, cartes famille…).
2. La logique `expanded` vit dans le même composant que le rendu de l'avatar — présentation et état cohabitent.
3. Si le designer change l'avatar, il touche `MemberPanel` au lieu d'un fichier isolé.

Ce module te donne les outils pour découper ça correctement.

---

## 2. Théorie complète, concise

### 2.1 Composition plutôt qu'héritage

React ne propose pas de mécanisme d'héritage entre composants. La philosophie officielle : **imbriquer**, pas étendre.

```tsx
// ❌ Héritage de classe — vestige pré-hooks, ne plus faire
class AdminCard extends UserCard {
  render() { /* surcharge */ }
}

// ✅ Composition — on imbrique des composants indépendants
function AdminCard({ user }: { user: User }) {
  return (
    <Card>
      <Avatar src={user.avatar} name={user.name} />
      <Badge variant="admin">Admin</Badge>
    </Card>
  );
}
```

L'héritage crée du couplage fort (les sous-classes dépendent des détails de la classe parente). La composition crée du couplage faible : chaque composant ne connaît que son interface de props.

### 2.2 Composants présentationnel et container

Ce pattern sépare **ce qui affiche** de **ce qui orchestre** :

| | Présentationnel | Container |
|---|---|---|
| Rôle | Rendu pur, reçoit tout via props | Gère l'état, fetche les données |
| State | Rarement (UI locale seulement) | Oui — state métier |
| Réutilisabilité | Haute — sans dépendance au contexte | Faible — couplé à la feature |
| Exemple TribuZen | `Avatar`, `Badge`, `Card` | `MemberPanel`, `FamilyPage` |

```tsx
// ─── Présentationnel — ne sait rien de TribuZen ───────────────
interface BadgeProps {
  variant: 'admin' | 'mod' | 'member';
  children: React.ReactNode;
}

function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>
      {children}
    </span>
  );
}

// ─── Container — orchestre les données et passe aux présentationnels ───
function MemberContainer({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMember(memberId).then(setMember);
  }, [memberId]);

  if (!member) return <Spinner />;

  return (
    <MemberCard
      name={member.name}
      avatar={member.avatar}
      role={member.role}
    />
  );
}
```

> En pratique avec React Query / TanStack Query (module 05b), les containers deviennent de simples composants avec `useQuery`. Le pattern reste valide — seul le mécanisme de fetch change.

### 2.3 Composants réutilisables

Un composant réutilisable se distingue par trois propriétés :
1. **Générique** : ses props décrivent une interface, pas un cas métier précis.
2. **Sans side-effects** : il ne fetche pas, ne modifie pas le store, n'appelle pas d'API.
3. **Composable** : ses enfants peuvent être injectés via `children` ou des slots de props.

```tsx
// ✅ Card générique — utilisable dans n'importe quel contexte
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={['card', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Usage : on compose librement
function MemberCard({ member }: { member: Member }) {
  return (
    <Card onClick={() => openProfile(member.id)}>
      <Avatar src={member.avatar} name={member.name} />
      <Badge variant={member.role}>{member.role}</Badge>
    </Card>
  );
}
```

### 2.4 Pattern children comme slots

`children` est le mécanisme React équivalent aux slots Vue ou au contenu projeté Angular. Il permet d'injecter du JSX arbitraire dans un composant hôte.

```tsx
// Pattern de base : children unique
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2 className="panel__title">{title}</h2>
      <div className="panel__body">{children}</div>
    </section>
  );
}

// Usage
<Panel title="Membres actifs">
  <MemberList members={activeMembers} />
</Panel>
```

**Slots multiples via props nommées** — quand on a besoin de plusieurs zones d'injection :

```tsx
interface LayoutProps {
  header: React.ReactNode;   // slot "header"
  sidebar: React.ReactNode;  // slot "sidebar"
  children: React.ReactNode; // slot "main"
}

function AdminLayout({ header, sidebar, children }: LayoutProps) {
  return (
    <div className="layout">
      <header>{header}</header>
      <nav>{sidebar}</nav>
      <main>{children}</main>
    </div>
  );
}

// Usage — chaque slot reçoit du JSX indépendant
<AdminLayout
  header={<AdminTopBar user={currentUser} />}
  sidebar={<AdminMenu items={navItems} />}
>
  <FamilyListPage />
</AdminLayout>
```

> **Équivalence Vue / Angular :**
> - Vue : `<slot name="header">` → React : prop `header: React.ReactNode`
> - Vue : `<slot>` (défaut) → React : prop `children`
> - Angular : `<ng-content select="[slot-header]">` → même pattern React

### 2.5 Render props en survol

Les render props sont une technique avancée où **une prop est une fonction qui retourne du JSX**. Elles permettent d'injecter de la logique dans un composant sans héritage.

```tsx
// Le composant fournit l'état, le parent décide du rendu
interface ToggleProps {
  render: (isOn: boolean, toggle: () => void) => React.ReactNode;
}

function Toggle({ render }: ToggleProps) {
  const [isOn, setIsOn] = useState(false);
  return <>{render(isOn, () => setIsOn(v => !v))}</>;
}

// Usage — le parent contrôle l'apparence
<Toggle
  render={(isOn, toggle) => (
    <button onClick={toggle} className={isOn ? 'btn--active' : 'btn'}>
      {isOn ? 'Masquer sidebar' : 'Afficher sidebar'}
    </button>
  )}
/>
```

> **En pratique React moderne**, les render props sont souvent remplacées par des **custom hooks** (`useToggle`, `useDisclosure`…) qui encapsulent la même logique. Le pattern reste courant dans des bibliothèques tierces (React Table, Downshift…). Reconnaître la syntaxe est indispensable en lecture de code.

### 2.6 Découpage d'un composant complexe

Règle pratique pour savoir quand extraire :

| Signal | Action |
|---|---|
| Le composant dépasse ~80 lignes | Chercher à extraire |
| Un bloc JSX identifié a une sémantique propre | Extraire en composant nommé |
| Le même bloc apparaît à deux endroits | Extraire obligatoire |
| Un bloc a son propre état local | Candidat sérieux à l'extraction |

Méthode en 3 étapes :
1. **Identifier les blocs** — entourer mentalement les zones visuellement distinctes.
2. **Nommer les composants** — le nom doit décrire *ce que c'est*, pas *ce qu'il fait*.
3. **Définir les props minimales** — passer seulement ce dont le composant a besoin.

```tsx
// ─── Avant extraction ───────────────────────────────────────────
function MemberPanel({ member }: { member: Member }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="panel">
      <div className="avatar-wrapper">
        <img src={member.avatar} alt={member.name} className="avatar" />
        {member.isOnline && <span className="online-dot" />}
      </div>
      <span className={`badge badge--${member.role}`}>{member.role}</span>
      {expanded && (
        <div className="detail">
          <p>{member.email}</p>
          <p>{member.familyName}</p>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Réduire' : 'Détails'}
      </button>
    </div>
  );
}

// ─── Après extraction ────────────────────────────────────────────
function Avatar({ src, name, isOnline }: AvatarProps) { /* ... */ }
function Badge({ variant, children }: BadgeProps) { /* ... */ }
function MemberDetail({ email, familyName }: MemberDetailProps) { /* ... */ }

function MemberPanel({ member }: { member: Member }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="panel">
      <Avatar src={member.avatar} name={member.name} isOnline={member.isOnline} />
      <Badge variant={member.role}>{member.role}</Badge>
      {expanded && <MemberDetail email={member.email} familyName={member.familyName} />}
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Réduire' : 'Détails'}
      </button>
    </div>
  );
}
```

### 2.7 Colocation

La colocation signifie : **garder ensemble ce qui change ensemble**.

```
src/components/
├── ui/                        # Composants génériques — changent rarement
│   ├── Avatar/
│   │   ├── Avatar.tsx
│   │   ├── Avatar.module.css
│   │   └── index.ts
│   ├── Badge/
│   │   ├── Badge.tsx
│   │   └── index.ts
│   └── Card/
│       ├── Card.tsx
│       └── index.ts
└── features/
    └── member/                # Feature — change souvent ensemble
        ├── MemberPanel.tsx    # Container
        ├── MemberDetail.tsx   # Présentationnel spécifique
        ├── MemberPanel.test.tsx  # Colocalisé avec le composant
        └── index.ts
```

**Règle de décision :**
- `ui/` : le composant n'a pas de connaissance du domaine métier TribuZen → générique.
- `features/` : le composant dépend d'un type métier (`Member`, `Family`) → feature.

Les barrel exports (`index.ts`) permettent des imports propres :

```tsx
// Sans barrel : import fragile sur le chemin interne
import Avatar from '../../../components/ui/Avatar/Avatar';

// Avec barrel : import stable sur la feature
import { Avatar, Badge, Card } from '@/components/ui';
```

---

## 3. Worked examples

### Exemple 1 — Décomposer MemberPanel (TribuZen)

Reprise du cas concret, découpage complet et typé.

```tsx
// ─── types/member.ts ─────────────────────────────────────────────
export interface Member {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'admin' | 'mod' | 'member';
  isOnline: boolean;
  familyName: string;
  createdAt: string;
}

// ─── components/ui/Avatar/Avatar.tsx ────────────────────────────
interface AvatarProps {
  src: string;
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function Avatar({ src, name, isOnline = false, size = 'md' }: AvatarProps) {
  return (
    <div className={`avatar avatar--${size}`}>
      <img src={src} alt={name} />
      {isOnline && <span className="avatar__online-dot" aria-label="En ligne" />}
    </div>
  );
}

export default Avatar;

// ─── components/ui/Badge/Badge.tsx ───────────────────────────────
interface BadgeProps {
  variant: 'admin' | 'mod' | 'member';
  children: React.ReactNode;
}

const LABELS: Record<BadgeProps['variant'], string> = {
  admin: 'Admin',
  mod: 'Modo',
  member: 'Membre',
};

function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>
      {/* children = texte custom, ou LABELS[variant] si on n'en passe pas */}
      {children ?? LABELS[variant]}
    </span>
  );
}

export default Badge;

// ─── components/features/member/MemberDetail.tsx ─────────────────
interface MemberDetailProps {
  email: string;
  familyName: string;
  createdAt: string;
}

// Présentationnel pur — reçoit tout via props, n'a pas d'état
function MemberDetail({ email, familyName, createdAt }: MemberDetailProps) {
  const formatted = new Date(createdAt).toLocaleDateString('fr');
  return (
    <dl className="detail">
      <dt>Email</dt><dd>{email}</dd>
      <dt>Famille</dt><dd>{familyName}</dd>
      <dt>Inscrit le</dt><dd>{formatted}</dd>
    </dl>
  );
}

export default MemberDetail;

// ─── components/features/member/MemberPanel.tsx ──────────────────
import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import MemberDetail from './MemberDetail';
import type { Member } from '@/types/member';

interface MemberPanelProps {
  member: Member;
}

// Container léger — gère uniquement l'état expanded (UI locale)
function MemberPanel({ member }: MemberPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="panel">
      <Avatar src={member.avatar} name={member.name} isOnline={member.isOnline} />
      <Badge variant={member.role}>{member.role}</Badge>

      {expanded && (
        <MemberDetail
          email={member.email}
          familyName={member.familyName}
          createdAt={member.createdAt}
        />
      )}

      <button onClick={() => setExpanded(v => !v)}>
        {expanded ? 'Réduire' : 'Détails'}
      </button>
    </div>
  );
}

export default MemberPanel;
```

**Ce que ce découpage apporte :**
- `Avatar` réutilisable dans les notifications, la top-bar, les cartes famille.
- `Badge` réutilisable pour les rôles, les statuts, les étiquettes.
- `MemberDetail` testable seul (snapshot, a11y) sans monter tout le panel.
- `MemberPanel` ne contient plus que la logique d'expand — ~20 lignes au lieu de 50.

### Exemple 2 — AdminLayout avec slots multiples

Pattern `children comme slots` appliqué à la mise en page de l'admin TribuZen.

```tsx
// ─── components/layout/AdminLayout.tsx ──────────────────────────
interface AdminLayoutProps {
  topBar: React.ReactNode;       // slot header
  sidebar: React.ReactNode;      // slot navigation
  children: React.ReactNode;     // slot contenu principal
}

function AdminLayout({ topBar, sidebar, children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <header className="admin-layout__top">{topBar}</header>
      <nav className="admin-layout__nav">{sidebar}</nav>
      <main className="admin-layout__main">{children}</main>
    </div>
  );
}

export default AdminLayout;

// ─── Utilisation dans App.tsx ─────────────────────────────────────
import AdminLayout from '@/components/layout/AdminLayout';
import AdminTopBar from '@/components/features/admin/AdminTopBar';
import AdminSidebar from '@/components/features/admin/AdminSidebar';
import FamilyListPage from '@/pages/FamilyListPage';

function App() {
  return (
    <AdminLayout
      topBar={<AdminTopBar />}
      sidebar={<AdminSidebar />}
    >
      <FamilyListPage />
    </AdminLayout>
  );
}
```

**Pourquoi des props nommées plutôt qu'un seul `children` :**
- `children` est syntaxiquement plus naturel pour *un* emplacement.
- Des props nommées (`topBar`, `sidebar`) rendent les zones **explicites et typées** — pas d'ambiguïté sur quel JSX va où.
- Chaque slot peut recevoir `null` sans erreur : `topBar={null}` cache le header proprement.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Passer trop de props plutôt que children

```tsx
// ❌ Props pour du contenu qui pourrait être JSX
function Card({ title, subtitle, footer }: { title: string; subtitle: string; footer: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div>{footer}</div>
    </div>
  );
}
// Le footer ne peut être que du texte — impossible d'y mettre un bouton

// ✅ ReactNode donne la liberté au parent
interface CardProps {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
function Card({ header, children, footer }: CardProps) {
  return (
    <div>
      <div>{header}</div>
      <div>{children}</div>
      {footer && <div>{footer}</div>}
    </div>
  );
}
```

**Règle :** si une prop contiendra toujours du texte brut → `string`. Si elle pourrait contenir des composants → `React.ReactNode`.

### PIÈGE #2 — Confondre container et présentationnel

```tsx
// ❌ Badge qui fetche ses propres données — présentationnel pollué
function Badge({ userId }: { userId: string }) {
  const [role, setRole] = useState('');
  useEffect(() => {
    fetch(`/api/users/${userId}/role`).then(r => r.json()).then(setRole);
  }, [userId]);
  return <span className={`badge badge--${role}`}>{role}</span>;
}
// Résultat : Badge ne peut plus être utilisé sans réseau. Impossible à tester unitairement.

// ✅ Badge présentationnel pur — le rôle est fourni par le parent
function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
```

**Signal d'alarme :** un composant présentationnel qui contient `useEffect` + `fetch` est probablement mal découpé.

### PIÈGE #3 — Extraire trop tôt (over-engineering)

```tsx
// ❌ Extraction prématurée d'un composant utilisé une seule fois
function MemberNameText({ name }: { name: string }) {
  return <span className="member-name">{name}</span>;
}
// Si ce span n'apparaît jamais ailleurs, l'extraction crée un indirection sans valeur.

// ✅ Inline tant que c'est utilisé une seule fois
function MemberCard({ member }: { member: Member }) {
  return (
    <div>
      <span className="member-name">{member.name}</span>
    </div>
  );
}
// Extraire seulement quand le besoin de réutilisation est avéré (rule of three).
```

**Règle :** extraire à la 2ème duplication, pas à la 1ère anticipation.

### PIÈGE #4 — Mauvaise colocation (fichier plat)

```
❌ Structure plate — tout au même niveau
src/components/
  MemberPanel.tsx
  MemberDetail.tsx
  Avatar.tsx
  Badge.tsx
  FamilyCard.tsx
  FamilyDetail.tsx
  AdminTopBar.tsx
  ...

✅ Colocation — regrouper par cohésion
src/components/
  ui/          Avatar/ Badge/ Card/
  features/    member/ family/ admin/
  layout/      AdminLayout/
```

La structure plate semble simple au début mais devient ingérable dès 10+ composants. Appliquer la colocation dès le 3e composant d'une même feature.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, les trois composants de ce module constituent les briques de base de toutes les vues.

**`Avatar`** (`src/components/ui/Avatar/Avatar.tsx`) — apparaît dans la top-bar (utilisateur connecté), les cartes de membres, les listes de notifications, les threads de commentaires. Même composant, mêmes props `src` + `name` + `isOnline`, partout.

**`Badge`** (`src/components/ui/Badge/Badge.tsx`) — les rôles membres (`admin`, `mod`, `member`), les statuts de familles (`active`, `pending`), les étiquettes d'événements. La prop `variant` est une union TypeScript qui garantit qu'on ne peut créer un badge hors nomenclature.

**`Card`** (`src/components/ui/Card/Card.tsx`) — enveloppe générique utilisée pour `MemberCard`, `FamilyCard`, `EventCard`. Le `children` + `onClick` optionnel suffit — chaque page compose l'intérieur différemment.

**`MemberPanel`** (`src/components/features/member/MemberPanel.tsx`) — le container qui assemble `Avatar`, `Badge`, `MemberDetail` et gère l'état `expanded`. C'est le cas concret du module, écrit complet en Exemple 1.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  components/
    ui/
      Avatar/Avatar.tsx
      Badge/Badge.tsx
      Card/Card.tsx
    features/
      member/
        MemberPanel.tsx
        MemberDetail.tsx
    layout/
      AdminLayout.tsx
```

---

## 6. Points clés

1. En React, la composition (imbriquer des composants) remplace l'héritage — pas de `extends` entre composants.
2. Les composants présentationnels ne font que du rendu depuis leurs props — pas de fetch, pas d'état métier.
3. Les containers orchestrent données et état, puis passent tout aux présentationnels.
4. `children: React.ReactNode` est le slot par défaut ; des props nommées (`header`, `sidebar`) servent de slots multiples.
5. Les render props (`render: (state) => ReactNode`) injectent de la logique externe dans un composant — souvent remplacées par des custom hooks en React moderne.
6. Extraire un composant à la 2ème duplication, pas à la 1ère (éviter l'over-engineering).
7. La colocation regroupe composant, styles, tests dans le même dossier — tout ce qui change ensemble vit ensemble.

---

## 7. Seeds Anki

```
Pourquoi React favorise-t-il la composition plutôt que l'héritage ?|L'héritage de classe crée du couplage fort entre parent et enfant. La composition (imbriquer des composants) crée du couplage faible via les props — chaque composant ne connaît que son interface.
Quelle est la différence entre un composant présentationnel et un container ?|Le présentationnel reçoit tout via props et ne fait que du rendu (pas de fetch, pas d'état métier). Le container gère l'état et les données, puis passe les résultats aux présentationnels.
Comment React implémente-t-il les "slots" Vue ou l'ng-content Angular ?|Via la prop children (React.ReactNode) pour un slot unique, et via des props nommées (header, sidebar, footer : React.ReactNode) pour des slots multiples.
Qu'est-ce qu'une render prop ? Dans quel cas l'utilise-t-on ?|Une prop dont la valeur est une fonction qui retourne du JSX : render: (state) => React.ReactNode. Elle injecte de la logique réutilisable dans un composant. En React moderne, les custom hooks remplissent souvent le même rôle.
À quelle règle obéit la colocation des fichiers React ?|Garder ensemble ce qui change ensemble — composant, styles, tests dans le même dossier. On sépare ui/ (générique) de features/ (métier) pour refléter la fréquence et le périmètre du changement.
Quand faut-il extraire un composant inline en composant séparé ?|À la 2ème duplication (rule of three), ou quand le bloc dépasse ~80 lignes, ou quand il a une sémantique propre clairement nommable. Extraire à la 1ère anticipation crée de l'over-engineering.
Quelle est la différence entre string et React.ReactNode pour une prop de contenu ?|string n'accepte que du texte brut. React.ReactNode accepte du JSX, des composants, des chaînes, des nombres, null et des fragments — indispensable pour les slots flexibles.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-05-composants-et-composition/README.md`. Construire les trois composants réutilisables de l'admin TribuZen (`Card`, `Avatar`, `Badge`) de zéro, puis les assembler dans `MemberPanel`.
