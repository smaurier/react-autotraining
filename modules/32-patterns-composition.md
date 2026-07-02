---
titre: Patterns de composition avancés
cours: 04-react
notions: [compound components, contexte interne, render props, slots via children et props nommées, polymorphic component, prop as, controlled vs uncontrolled, éviter le prop drilling par composition]
outcomes: [construire un compound component piloté par un contexte interne, exposer des slots via children et props nommées, écrire un composant polymorphe typé avec une prop as, choisir entre pattern controlled et uncontrolled]
prerequis: [31-performance-react]
next: 33-error-boundaries-suspense
libs: [{ name: react, version: "^19" }]
tribuzen: composants avancés de l'admin TribuZen — Tabs compound (Familles/Membres/Invitations), Card polymorphe, slots header/footer
last-reviewed: 2026-07
---

# Patterns de composition avancés

> **Outcomes — tu sauras FAIRE :** construire un compound component piloté par un contexte interne, exposer des slots via `children` et props nommées, écrire un composant polymorphe typé avec une prop `as`, choisir entre le pattern controlled et uncontrolled.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, la page de gestion d'une tribu affiche trois onglets : **Familles**, **Membres**, **Invitations**. Un collègue a écrit ça :

```tsx
// TribeTabs.tsx — AVANT (props qui explosent)
function TribeTabs({
  activeTab,
  onTabChange,
  familiesLabel,
  membersLabel,
  invitesLabel,
  familiesContent,
  membersContent,
  invitesContent,
}: {
  activeTab: string;
  onTabChange: (t: string) => void;
  familiesLabel: string;
  membersLabel: string;
  invitesLabel: string;
  familiesContent: React.ReactNode;
  membersContent: React.ReactNode;
  invitesContent: React.ReactNode;
}) {
  return (
    <div className="tabs">
      <div role="tablist">
        <button onClick={() => onTabChange('families')}>{familiesLabel}</button>
        <button onClick={() => onTabChange('members')}>{membersLabel}</button>
        <button onClick={() => onTabChange('invites')}>{invitesLabel}</button>
      </div>
      {activeTab === 'families' && familiesContent}
      {activeTab === 'members' && membersContent}
      {activeTab === 'invites' && invitesContent}
    </div>
  );
}
```

**Trois problèmes :**
1. Chaque nouvel onglet ajoute **deux props** (`xLabel` + `xContent`). L'API grossit sans fin.
2. L'appelant doit tenir `activeTab` en state et le câbler à la main, même pour un cas trivial.
3. Impossible d'insérer un séparateur, une icône ou un badge "3 invitations en attente" dans un onglet — tout passe par des props scalaires.

Ce qu'on veut écrire à la place :

```tsx
<Tabs defaultTab="families">
  <Tabs.List>
    <Tabs.Tab value="families">Familles</Tabs.Tab>
    <Tabs.Tab value="members">Membres</Tabs.Tab>
    <Tabs.Tab value="invites">Invitations <Badge>3</Badge></Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel value="families"><FamiliesTable /></Tabs.Panel>
  <Tabs.Panel value="members"><MembersTable /></Tabs.Panel>
  <Tabs.Panel value="invites"><InvitesTable /></Tabs.Panel>
</Tabs>
```

L'API est plate, extensible, et l'état `activeTab` disparaît de l'appelant. Ce module te donne les patterns pour construire ça : **compound components**, **slots**, **polymorphisme**, et le choix **controlled / uncontrolled**.

---

## 2. Théorie complète, concise

### 2.1 Compound components : le principe

Un *compound component* est un ensemble de composants qui **collaborent autour d'un état partagé implicite**, comme `<select>` et `<option>` en HTML natif. L'utilisateur assemble des sous-composants ; l'état circule entre eux **sans props explicites**.

Le mécanisme : un composant racine crée un **contexte interne** (Context API), les sous-composants le consomment.

```tsx
import { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Contexte interne — jamais exporté, invisible pour l'appelant
const TabsContext = createContext<TabsContextValue | null>(null);

// Hook garde-fou : lève une erreur si un sous-composant est utilisé hors de <Tabs>
function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* doit être utilisé dans <Tabs>');
  return ctx;
}
```

Le `throw` dans `useTabsContext` est essentiel : il transforme un bug silencieux (`ctx` null → crash obscur) en message clair au premier rendu.

### 2.2 Assembler la racine et les sous-composants

```tsx
// --- Racine : détient l'état, fournit le contexte ---
function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// --- Sous-composants : consomment le contexte ---
function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const selected = activeTab === value;
  return (
    <button
      role="tab"
      aria-selected={selected}
      className={selected ? 'tab tab--active' : 'tab'}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null; // panneau inactif = pas rendu
  return <div role="tabpanel">{children}</div>;
}
```

### 2.3 Exposer l'API via propriétés statiques

On attache les sous-composants **comme propriétés** du composant racine. Ça documente la relation (`Tabs.Tab` appartient à `Tabs`) et donne l'autocomplétion.

```tsx
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };
```

> **Note React 19 / lint** : la règle `react/no-unstable-nested-components` ne s'applique pas ici — on assigne des composants déjà définis au niveau module, pas des composants créés au rendu. C'est le pattern standard (Radix, Reach UI l'utilisent).

### 2.4 Slots : `children` vs props nommées

Un *slot* est un emplacement où l'appelant injecte du JSX. React n'a pas de mot-clé `slot` (contrairement à Vue) — il utilise des **props de type `React.ReactNode`**.

| Besoin | Mécanisme React | Équivalent Vue |
|---|---|---|
| Un seul emplacement | `children` | `<slot />` |
| Plusieurs emplacements nommés | props `header`, `footer`… | `<slot name="header" />` |
| Emplacement recevant des données | render prop | scoped slot `v-slot:x="data"` |

```tsx
// Slots nommés : header / footer via props, corps via children
interface CardShellProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

function CardShell({ header, footer, children }: CardShellProps) {
  return (
    <div className="card">
      {header && <div className="card__header">{header}</div>}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}

// Chaque slot reçoit du JSX indépendant, ou rien (null → non rendu)
<CardShell
  header={<h3>Les Dupont</h3>}
  footer={<button>Voir la tribu</button>}
>
  <p>5 membres · 2 invitations en attente</p>
</CardShell>
```

### 2.5 Render props : survol

Une *render prop* est une prop dont la valeur est **une fonction qui retourne du JSX**. Le composant fournit un état, l'appelant décide du rendu.

```tsx
interface ToggleProps {
  children: (state: { on: boolean; toggle: () => void }) => React.ReactNode;
}

function Toggle({ children }: ToggleProps) {
  const [on, setOn] = useState(false);
  return <>{children({ on, toggle: () => setOn(v => !v) })}</>;
}

// L'appelant contrôle entièrement l'apparence
<Toggle>
  {({ on, toggle }) => (
    <button onClick={toggle}>{on ? 'Masquer' : 'Afficher'}</button>
  )}
</Toggle>
```

> **En pratique React 19, on n'écrit presque plus de render props.** Un **custom hook** (`useToggle`) fait le même partage de logique avec une syntaxe plus lisible et composable. On les rencontre encore dans des libs (React Table, Downshift, Formik) et en lecture de code — savoir les reconnaître suffit.

### 2.6 Composant polymorphe : la prop `as`

Un composant *polymorphe* rend un élément DOM différent selon une prop `as`, tout en gardant son style et ses props typés. Exemple : un `<Card>` qui peut être un `<div>`, un `<article>`, ou un `<a>` selon le contexte.

```tsx
import React from 'react';

type CardProps<T extends React.ElementType> = {
  as?: T;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children'>;

function Card<T extends React.ElementType = 'div'>({
  as,
  children,
  ...rest
}: CardProps<T>) {
  const Component = as ?? 'div'; // valeur par défaut : <div>
  return (
    <Component className="card" {...rest}>
      {children}
    </Component>
  );
}
```

- `T extends React.ElementType` : `T` est un tag (`'a'`, `'article'`) ou un composant.
- `ComponentPropsWithoutRef<T>` : récupère **les props natives du tag choisi**. Avec `as="a"`, TypeScript accepte `href` ; avec `as="button"`, il accepte `onClick`, `disabled`…
- `Omit<..., 'as' | 'children'>` : évite de redéclarer nos propres props.

```tsx
<Card>Contenu simple</Card>                          {/* <div> */}
<Card as="article">Fiche famille</Card>              {/* <article> */}
<Card as="a" href="/tribu/42">Ouvrir la tribu</Card> {/* <a href> typé */}
```

> Le point fort : `href` n'est autorisé **que** si `as="a"`. Le typage suit le tag — pas de props invalides qui passent en silence.

### 2.7 Controlled vs uncontrolled

Un composant à état interne peut fonctionner en deux modes :

- **Uncontrolled** : le composant détient son propre état (`useState` interne). L'appelant ne le pilote pas, il donne juste une valeur initiale (`defaultTab`).
- **Controlled** : l'appelant détient l'état et le passe en prop (`value`), plus un callback (`onChange`). Le composant devient un pur reflet de la prop.

C'est exactement la distinction `<input defaultValue>` (uncontrolled) vs `<input value onChange>` (controlled), vue au module 20.

```tsx
interface TabsProps {
  defaultTab?: string;              // uncontrolled : valeur initiale
  value?: string;                   // controlled : valeur pilotée
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
}

function Tabs({ defaultTab, value, onValueChange, children }: TabsProps) {
  // état interne utilisé UNIQUEMENT en mode uncontrolled
  const [internal, setInternal] = useState(defaultTab ?? '');
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internal;

  const setActiveTab = (next: string) => {
    if (!isControlled) setInternal(next); // maj interne seulement si uncontrolled
    onValueChange?.(next);                // toujours notifier l'appelant
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}
```

**Règle de décision :** commence uncontrolled (plus simple pour l'appelant). Passe controlled quand un parent doit **synchroniser** l'onglet actif avec l'URL, un store, ou un autre composant.

### 2.8 Éviter le prop drilling par composition

Le *prop drilling* : faire transiter une prop à travers des composants intermédiaires qui n'en font rien, juste pour la passer plus bas.

```tsx
// ❌ Prop drilling — user traverse 3 niveaux qui ne l'utilisent pas
function Page({ user }: { user: User }) {
  return <Layout user={user} />;
}
function Layout({ user }: { user: User }) {
  return <Sidebar user={user} />;
}
function Sidebar({ user }: { user: User }) {
  return <Avatar name={user.name} />; // seul vrai consommateur
}
```

Deux issues, selon le cas :

**A. Composition (children)** — quand c'est de la structure. On remonte le JSX au niveau où la donnée existe, et on l'injecte via `children`. `Layout` et `Sidebar` deviennent des coquilles génériques.

```tsx
// ✅ Layout/Sidebar ne connaissent plus User — ils reçoivent du JSX
function Page({ user }: { user: User }) {
  return (
    <Layout>
      <Sidebar>
        <Avatar name={user.name} />
      </Sidebar>
    </Layout>
  );
}
```

**B. Context** — quand la donnée est un état partagé large (utilisateur connecté, thème). Vu au module 14. Le compound component (§2.1) est une application locale et bornée de ce principe.

> **Arbitrage :** la composition suffit pour la majorité des cas et garde le flux de données explicite. Réserve le Context aux données vraiment transverses — sinon tu perds la traçabilité.

---

## 3. Worked examples

### Exemple 1 — `<Tabs>` compound complet (TribuZen)

Le composant du cas concret, écrit en entier, uncontrolled, typé, accessible.

```tsx
// ─── components/ui/Tabs/Tabs.tsx ────────────────────────────────
import { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* doit être utilisé dans <Tabs>');
  return ctx;
}

// Racine — détient l'état activeTab (mode uncontrolled)
function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return (
    <div className="tab-list" role="tablist">
      {children}
    </div>
  );
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const selected = activeTab === value;
  return (
    <button
      role="tab"
      aria-selected={selected}
      // id + aria-controls relient l'onglet à son panneau (a11y)
      id={`tab-${value}`}
      aria-controls={`panel-${value}`}
      className={selected ? 'tab tab--active' : 'tab'}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return (
    <div role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`}>
      {children}
    </div>
  );
}

// API publique via propriétés statiques
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };
```

```tsx
// ─── features/tribe/TribePage.tsx ───────────────────────────────
import { Tabs } from '@/components/ui/Tabs/Tabs';
import { FamiliesTable } from './FamiliesTable';
import { MembersTable } from './MembersTable';
import { InvitesTable } from './InvitesTable';

function TribePage() {
  return (
    <Tabs defaultTab="families">
      <Tabs.List>
        <Tabs.Tab value="families">Familles</Tabs.Tab>
        <Tabs.Tab value="members">Membres</Tabs.Tab>
        <Tabs.Tab value="invites">Invitations</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="families"><FamiliesTable /></Tabs.Panel>
      <Tabs.Panel value="members"><MembersTable /></Tabs.Panel>
      <Tabs.Panel value="invites"><InvitesTable /></Tabs.Panel>
    </Tabs>
  );
}

export default TribePage;
```

**Ce que ce pattern règle par rapport au cas concret :**
- Ajouter un onglet = 1 ligne `<Tabs.Tab>` + 1 ligne `<Tabs.Panel>`. Zéro prop ajoutée à `Tabs`.
- L'état `activeTab` est encapsulé — `TribePage` ne le voit pas.
- Chaque `<Tabs.Tab>` reçoit du JSX libre : on peut y mettre `Familles <Badge>3</Badge>` sans toucher l'API.

### Exemple 2 — `<Card>` polymorphe avec slots (TribuZen)

Une carte réutilisable pour l'admin : par défaut un `<div>`, mais `<article>` pour une fiche famille, `<a>` pour une carte cliquable — avec slots `header` / `footer`.

```tsx
// ─── components/ui/Card/Card.tsx ────────────────────────────────
import React from 'react';

type CardOwnProps<T extends React.ElementType> = {
  as?: T;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

// On fusionne nos props avec les props natives du tag choisi,
// en retirant celles qu'on gère nous-mêmes.
type CardProps<T extends React.ElementType> = CardOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

function Card<T extends React.ElementType = 'div'>({
  as,
  header,
  footer,
  children,
  ...rest
}: CardProps<T>) {
  const Component = as ?? 'div';
  return (
    <Component className="card" {...rest}>
      {header && <div className="card__header">{header}</div>}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </Component>
  );
}

export { Card };
```

```tsx
// ─── Utilisation dans l'admin ───────────────────────────────────
// 1. Carte simple — <div> par défaut
<Card header={<h3>Statistiques</h3>}>
  <p>12 familles · 48 membres</p>
</Card>

// 2. Fiche famille sémantique — <article>, slot footer
<Card
  as="article"
  header={<h3>Les Dupont</h3>}
  footer={<button onClick={() => openTribe('42')}>Gérer</button>}
>
  <p>5 membres · 2 invitations en attente</p>
</Card>

// 3. Carte entièrement cliquable — <a>, href TYPÉ grâce au polymorphisme
<Card as="a" href="/tribu/42" header={<h3>Les Martin</h3>}>
  <p>Cliquer pour ouvrir</p>
</Card>
```

**Pourquoi c'est correct :**
- `as="a"` débloque `href` dans le typage ; l'omettre le rendrait invalide. TypeScript suit le tag.
- `header` / `footer` sont des slots optionnels : absents, les `<div>` correspondants ne sont pas rendus (`&&`).
- `{...rest}` transmet les attributs natifs (`onClick`, `aria-*`, `href`) sur l'élément réel, sans les lister un par un.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Compound component sans garde-fou de contexte

```tsx
// ❌ Pas de vérification null — crash obscur si mal utilisé
function Tab({ value, children }: TabProps) {
  const { setActiveTab } = useContext(TabsContext)!; // le ! ment au compilateur
  // Si <Tab> est rendu hors de <Tabs>, ctx est null → "Cannot read setActiveTab of null"
}

// ✅ Hook garde-fou avec message explicite
function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* doit être utilisé dans <Tabs>');
  return ctx;
}
```

**Règle :** un compound component expose toujours un hook interne qui `throw` un message nommant le composant racine. Le `!` non-null assertion masque le vrai problème.

### PIÈGE #2 — Confondre controlled et uncontrolled (ou mélanger les deux)

```tsx
// ❌ value fourni MAIS pas onValueChange → onglet figé, aucun clic ne marche
<Tabs value="families">{/* ... */}</Tabs>

// ❌ defaultTab ET value en même temps → React ne sait plus qui commande
<Tabs defaultTab="members" value={active}>{/* ... */}</Tabs>

// ✅ uncontrolled : defaultTab seul
<Tabs defaultTab="families">{/* ... */}</Tabs>

// ✅ controlled : value + onValueChange ensemble
<Tabs value={active} onValueChange={setActive}>{/* ... */}</Tabs>
```

**Règle :** `value` sans `onChange` = composant en lecture seule figé. Soit uncontrolled (`defaultX`), soit controlled (`value` + `onChange`) — jamais un panachage. C'est le même piège que `<input>` (module 20).

### PIÈGE #3 — Render prop là où un custom hook suffit

```tsx
// ❌ Render prop pour partager une logique sans UI propre — verbeux, imbriqué
<MousePosition>
  {({ x, y }) => (
    <FetchOnMove x={x} y={y}>
      {(data) => <Chart data={data} />}  {/* "callback hell" JSX */}
    </FetchOnMove>
  )}
</MousePosition>

// ✅ Custom hooks — plat, composable, lisible
function Widget() {
  const { x, y } = useMousePosition();
  const data = useFetchOnMove(x, y);
  return <Chart data={data} />;
}
```

**Règle :** en React 19, si le pattern ne fait que **partager de la logique/état** (pas injecter du JSX dans un trou précis), c'est un custom hook. Réserve la render prop aux libs qui doivent rester agnostiques du rendu.

### PIÈGE #4 — Composant polymorphe mal typé (props qui fuient)

```tsx
// ❌ as: any → href accepté partout, y compris sur un <div> invalide
function Card({ as: Component = 'div', ...props }: { as?: any }) {
  return <Component {...props} />;
}
<Card as="div" href="/x" /> // ❌ passe à la compilation, href sur un div : invalide

// ✅ Générique contraint → href autorisé SEULEMENT si as="a"
function Card<T extends React.ElementType = 'div'>(props: CardProps<T>) { /* ... */ }
<Card href="/x" />          // ❌ erreur TS : href n'existe pas sur <div>
<Card as="a" href="/x" />   // ✅ ok
```

**Règle :** un composant polymorphe se type avec un générique `T extends React.ElementType` + `ComponentPropsWithoutRef<T>`, jamais avec `as: any`. Sinon on perd toute la sécurité que le pattern est censé apporter.

### PIÈGE #5 — Tout passer en Context pour "éviter le prop drilling"

```tsx
// ❌ Context pour une donnée qui traverse 2 niveaux → flux de données invisible
const UserContext = createContext<User | null>(null);
// ... Provider tout en haut, useContext(UserContext) 40 lignes plus bas

// ✅ Composition : on injecte le JSX là où la donnée existe
<Layout>
  <Sidebar>
    <Avatar name={user.name} />
  </Sidebar>
</Layout>
```

**Règle :** le prop drilling sur 1-2 niveaux se règle par **composition** (`children`), pas par Context. Le Context est justifié pour des données transverses et profondes (auth, thème, i18n) — pas pour économiser deux props.

---

## 5. Ancrage TribuZen

Ces patterns structurent l'admin web TribuZen (`smaurier/tribuzen`) :

**`<Tabs>` compound** (`src/components/ui/Tabs/Tabs.tsx`) — la page tribu (`TribePage`) l'utilise pour les onglets **Familles / Membres / Invitations**. L'onglet Invitations affiche un badge de compteur injecté dans `<Tabs.Tab>`. Plus tard, `Tabs` passera en mode controlled pour synchroniser l'onglet actif avec l'URL (`?tab=members`) via le router.

**`<Card>` polymorphe** (`src/components/ui/Card/Card.tsx`) — brique visuelle partout : `<div>` pour les tuiles de stats du dashboard, `<article>` pour les fiches familles (sémantique/SEO interne), `<a>` pour les cartes cliquables des listes. Les slots `header` / `footer` portent le titre et les actions.

**Composition anti-drilling** — le `AdminLayout` (module 05) reçoit ses zones via slots (`topBar`, `sidebar`) et son contenu via `children`. L'utilisateur connecté n'est pas drillé à travers le layout : il est injecté au niveau page, dans le JSX passé en `children`.

Fichiers cibles :
```
tribuzen/src/
  components/
    ui/
      Tabs/
        Tabs.tsx        # compound : Tabs + Tabs.List/Tab/Panel
        index.ts
      Card/
        Card.tsx        # polymorphe (as) + slots header/footer
        index.ts
  features/
    tribe/
      TribePage.tsx     # consomme <Tabs>
      FamiliesTable.tsx
      MembersTable.tsx
      InvitesTable.tsx
```

---

## 6. Points clés

1. Un compound component partage un état via un **contexte interne** ; ses sous-composants s'exposent en propriétés statiques (`Tabs.Tab`).
2. Le contexte interne s'accompagne d'un hook garde-fou qui `throw` si un sous-composant est utilisé hors de la racine.
3. Les slots React = props `React.ReactNode` : `children` pour un emplacement unique, props nommées (`header`, `footer`) pour plusieurs.
4. Une render prop passe une **fonction qui retourne du JSX** ; en React 19 elle est presque toujours remplacée par un custom hook.
5. Un composant polymorphe se type avec `T extends React.ElementType` + `ComponentPropsWithoutRef<T>` ; la prop `as` change le tag rendu, et les props natives suivent le tag.
6. Uncontrolled = état interne (`defaultX`) ; controlled = état piloté par le parent (`value` + `onChange`). Ne jamais mélanger les deux.
7. Le prop drilling court se règle par composition (`children`) ; le Context est réservé aux données transverses profondes.

---

## 7. Seeds Anki

```
Qu'est-ce qu'un compound component et comment ses sous-composants communiquent-ils ?|Un ensemble de composants qui collaborent autour d'un état partagé implicite (ex. Tabs + Tab + Panel). Ils communiquent via un contexte interne (createContext/useContext) créé par le composant racine — pas via des props explicites.
Pourquoi un compound component expose-t-il un hook interne qui throw ?|Pour transformer un bug silencieux (contexte null quand un sous-composant est utilisé hors de la racine) en message d'erreur clair au premier rendu, ex. "Tabs.* doit être utilisé dans <Tabs>". Le ! non-null assertion masquerait le problème.
Comment React implémente-t-il les slots nommés de Vue ?|Via des props de type React.ReactNode : children pour un slot unique, props nommées (header, footer) pour des slots multiples. Il n'existe pas de mot-clé slot en React.
Qu'est-ce qu'une render prop et pourquoi l'évite-t-on en React 19 ?|Une prop dont la valeur est une fonction retournant du JSX, à qui le composant passe un état. En React 19 on préfère un custom hook : plat, composable, sans imbrication de callbacks. La render prop subsiste dans des libs (React Table, Downshift).
Comment typer un composant polymorphe avec une prop as ?|Générique T extends React.ElementType, prop as?: T, et fusion avec Omit<React.ComponentPropsWithoutRef<T>, ...> pour récupérer les props natives du tag choisi. Ainsi href n'est autorisé que si as="a".
Quelle est la différence entre un composant controlled et uncontrolled ?|Uncontrolled : le composant détient son état interne, l'appelant donne une valeur initiale (defaultX). Controlled : l'appelant détient l'état et le passe en prop (value) avec un callback (onChange). Il ne faut jamais mélanger les deux modes.
Quand régler le prop drilling par composition plutôt que par Context ?|Composition (children) pour 1-2 niveaux de structure : on injecte le JSX là où la donnée existe, le flux reste explicite. Context réservé aux données transverses et profondes (auth, thème, i18n).
Comment expose-t-on l'API d'un compound component ?|En attachant les sous-composants comme propriétés statiques du composant racine (Tabs.List = TabList, Tabs.Tab = Tab...). Ça documente la relation et donne l'autocomplétion.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-32-patterns-composition/README.md`. Construire le `<Tabs>` compound (Familles/Membres/Invitations) et le `<Card>` polymorphe à slots de l'admin TribuZen, en React 19 + TypeScript, puis les brancher dans une page tribu.
