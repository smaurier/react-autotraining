# Lab 32 — Patterns de composition avancés

> **Outcome :** à la fin, tu sais construire un compound component (`<Tabs>`) piloté par un contexte interne et un composant polymorphe à slots (`<Card>`) en React 19 + TypeScript, puis les assembler dans une page de l'admin TribuZen.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis les briques de composition de la page **Tribu** de l'admin TribuZen. Cahier des charges **exact** :

1. **`<Tabs>` compound component** — onglets **Familles / Membres / Invitations**, pilotés par un **contexte interne**. API cible :

```tsx
<Tabs defaultTab="families">
  <Tabs.List>
    <Tabs.Tab value="families">Familles</Tabs.Tab>
    <Tabs.Tab value="members">Membres</Tabs.Tab>
    <Tabs.Tab value="invites">Invitations</Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel value="families">…</Tabs.Panel>
  <Tabs.Panel value="members">…</Tabs.Panel>
  <Tabs.Panel value="invites">…</Tabs.Panel>
</Tabs>
```

2. **`<Card>` polymorphe à slots** — prop `as` (défaut `'div'`), slots `header` / `footer` optionnels, `children` pour le corps. `href` n'est autorisé **que** si `as="a"`.

3. **`TribePage`** — assemble le tout : trois onglets, chaque panneau affiche une `<Card>` avec un contenu bidon (compteurs).

**Contraintes :**
- `Tabs` fonctionne en mode **uncontrolled** (`defaultTab`) — l'appelant ne gère pas `activeTab`.
- Les sous-composants `Tabs.Tab` / `Tabs.Panel` lisent l'état via un **hook interne** qui `throw` s'ils sont utilisés hors de `<Tabs>`.
- Accessibilité minimale : `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`.
- `Card` typé avec un **générique** `T extends React.ElementType` — **pas de `as: any`**.
- **Pas de gap-fill** — tu écris chaque composant complet depuis le starter.

### Starter minimal

Crée ces fichiers dans un projet Vite (`pnpm create vite@latest tribuzen-lab --template react-ts`) :

```
src/
  components/
    ui/
      Tabs.tsx     ← à écrire (compound)
      Card.tsx     ← à écrire (polymorphe + slots)
  features/
    tribe/
      TribePage.tsx  ← à écrire, assemble Tabs + Card
  App.tsx           ← branche <TribePage />
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **`Tabs.tsx` — le contexte interne.** Crée `TabsContext` (`createContext<TabsContextValue | null>(null)`) et le hook garde-fou `useTabsContext()` qui `throw` si `ctx` est null.
2. **`Tabs.tsx` — la racine.** `Tabs({ defaultTab, children })` : `useState(defaultTab)`, enveloppe `children` dans `<TabsContext.Provider>`.
3. **`Tabs.tsx` — les sous-composants.** `TabList` (`role="tablist"`), `Tab` (bouton `role="tab"`, `aria-selected`, `onClick` → `setActiveTab`), `TabPanel` (retourne `null` si pas actif).
4. **`Tabs.tsx` — l'API.** Attache `Tabs.List = TabList`, `Tabs.Tab = Tab`, `Tabs.Panel = TabPanel`. Exporte `Tabs`.
5. **`Card.tsx` — le polymorphe.** Générique `T extends React.ElementType = 'div'`, prop `as`, slots `header` / `footer`, `...rest`. Type = tes props + `Omit<React.ComponentPropsWithoutRef<T>, ...>`.
6. **`TribePage.tsx` — l'assemblage.** Trois onglets ; chaque `Tabs.Panel` contient une `<Card>` avec un `header` et un contenu bidon.
7. **Vérifie dans le navigateur :** clic sur un onglet change le panneau ; `<Card as="a" href="…">` compile et rend un lien ; retire `as` → redevient `<div>` ; utiliser `<Tabs.Tab>` hors de `<Tabs>` lève bien l'erreur.

---

## Corrigé complet commenté

```tsx
// ─── src/components/ui/Tabs.tsx ─────────────────────────────────
import { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Contexte interne — non exporté, invisible pour l'appelant du compound
const TabsContext = createContext<TabsContextValue | null>(null);

// Hook garde-fou : throw explicite si utilisé hors de <Tabs>
function useTabsContext(): TabsContextValue {
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

// Conteneur des onglets — role tablist pour l'accessibilité
function TabList({ children }: { children: React.ReactNode }) {
  return (
    <div className="tab-list" role="tablist">
      {children}
    </div>
  );
}

// Un onglet — lit l'état via le contexte, le change au clic
function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const selected = activeTab === value;
  return (
    <button
      role="tab"
      aria-selected={selected}
      id={`tab-${value}`}
      aria-controls={`panel-${value}`}
      className={selected ? 'tab tab--active' : 'tab'}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// Un panneau — rendu seulement si son value == activeTab
function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return (
    <div role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`}>
      {children}
    </div>
  );
}

// API publique via propriétés statiques : documente la relation + autocomplétion
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };

// ─── src/components/ui/Card.tsx ─────────────────────────────────
import React from 'react';

// Nos props propres au composant
type CardOwnProps<T extends React.ElementType> = {
  as?: T;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

// Fusion : nos props + props natives du tag choisi, sans doublon
type CardProps<T extends React.ElementType> = CardOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

function Card<T extends React.ElementType = 'div'>({
  as,
  header,
  footer,
  children,
  ...rest
}: CardProps<T>) {
  const Component = as ?? 'div'; // tag par défaut
  return (
    <Component
      className="card"
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}
      {...rest} // href/onClick/aria-* natifs transmis sur l'élément réel
    >
      {header && <div className="card__header" style={{ fontWeight: 600, marginBottom: 8 }}>{header}</div>}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer" style={{ marginTop: 8 }}>{footer}</div>}
    </Component>
  );
}

export { Card };

// ─── src/features/tribe/TribePage.tsx ───────────────────────────
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';

function TribePage() {
  return (
    <Tabs defaultTab="families">
      <Tabs.List>
        <Tabs.Tab value="families">Familles</Tabs.Tab>
        <Tabs.Tab value="members">Membres</Tabs.Tab>
        <Tabs.Tab value="invites">Invitations</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="families">
        {/* Card sémantique : <article> */}
        <Card as="article" header={<h3>Familles</h3>}>
          <p>12 familles enregistrées.</p>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="members">
        <Card header={<h3>Membres</h3>} footer={<button>Inviter un membre</button>}>
          <p>48 membres actifs.</p>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="invites">
        {/* Card cliquable : <a href> — typé grâce au polymorphisme */}
        <Card as="a" href="/tribu/42/invitations" header={<h3>Invitations</h3>}>
          <p>3 invitations en attente — cliquer pour gérer.</p>
        </Card>
      </Tabs.Panel>
    </Tabs>
  );
}

export default TribePage;

// ─── src/App.tsx ─────────────────────────────────────────────────
import TribePage from './features/tribe/TribePage';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>TribuZen Admin — Lab 32</h1>
      <TribePage />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `TabsContext` est **interne** : `TribePage` ne le voit jamais, il assemble juste `Tabs.*`. C'est ça, un compound component.
- `useTabsContext` `throw` un message nommant `<Tabs>` — si on colle un `<Tabs.Tab>` hors racine, l'erreur est immédiate et lisible, pas un `null` obscur.
- `Tabs` est **uncontrolled** : `activeTab` vit dans `useState` interne, l'appelant ne le pilote pas.
- `Card` est typé par générique : `as="a"` débloque `href` ; `<Card href="…">` sans `as` provoquerait une erreur TS (href n'existe pas sur `<div>`). `{...rest}` transmet les attributs natifs sans les lister.
- Les slots `header` / `footer` optionnels : absents → les `<div>` correspondants ne sont pas rendus (`&&`).

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Rends `Tabs` **controlled-compatible** : ajoute les props optionnelles `value?: string` et `onValueChange?: (v: string) => void`. Le composant reste uncontrolled si `value` est absent, controlled sinon (voir §2.7 du module — état interne utilisé seulement en uncontrolled).
2. Dans `TribePage`, passe `Tabs` en **controlled** et synchronise l'onglet actif avec l'URL via `useState` + `history.replaceState` (ou `URLSearchParams`) : recharger sur `?tab=members` ouvre le bon onglet.
3. Ajoute un **badge compteur** dans `<Tabs.Tab value="invites">` : `Invitations <span className="badge">3</span>` — vérifie que l'API compound l'accepte sans modifier `Tabs`.
4. **Sans ouvrir ce corrigé** ni le module 32.

**Critère de réussite :** cliquer un onglet met à jour l'URL ; recharger sur `?tab=invites` ouvre l'onglet Invitations ; le badge s'affiche dans l'onglet sans toucher au composant `Tabs`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces composants vivent ici :

```
tribuzen/src/
  components/
    ui/
      Tabs/
        Tabs.tsx          ← compound : Tabs + Tabs.List/Tab/Panel
        index.ts          ← export { Tabs } from './Tabs'
      Card/
        Card.tsx          ← polymorphe (as) + slots header/footer
        index.ts
  features/
    tribe/
      TribePage.tsx       ← consomme <Tabs> + <Card>
      FamiliesTable.tsx
      MembersTable.tsx
      InvitesTable.tsx
```

**Différences par rapport au lab :**
- Les styles inline seront remplacés par les classes/tokens du design system TribuZen — la logique de composition reste identique.
- `Tabs` sera **controlled** et synchronisé avec le router (`?tab=members`), pattern de la variante J+30.
- Les `Tabs.Panel` contiendront de vraies tables (`FamiliesTable`, `MembersTable`, `InvitesTable`) alimentées par TanStack Query (module 23), pas du texte bidon.
- L'onglet Invitations portera un vrai badge compteur alimenté par le nombre d'invitations en attente.

**Commit cible :**
```
feat(ui): Tabs compound component + Card polymorphe (slots header/footer)
feat(tribe): TribePage — onglets Familles/Membres/Invitations
```
