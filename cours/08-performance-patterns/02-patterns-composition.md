# Cours 34 — Patterns de composition en React

> **Objectif** : Maîtriser les patterns de composition qui font la force de React : `children`, render props, Higher-Order Components (HOC), compound components et headless components. Comprendre pourquoi React privilégie la composition à l'héritage et savoir transposer ses réflexes Vue (slots/scoped-slots) et Angular (content projection/ng-content).

---

## Rappel du cours précédent

<details>
<summary>1. Dans quels cas un composant React re-rend-il ?</summary>

Trois cas : (1) son state change, (2) son parent re-rend, (3) un contexte auquel il souscrit change. Contrairement à une idée reçue, ce n'est pas "quand les props changent" — c'est le re-rendu du parent qui déclenche la cascade.
</details>

<details>
<summary>2. Quelle est la différence entre useMemo et useCallback ?</summary>

`useMemo` mémorise une **valeur calculée** (résultat d'une fonction). `useCallback` mémorise la **référence d'une fonction** elle-même. Les deux prennent un tableau de dépendances. `useCallback(fn, deps)` est équivalent à `useMemo(() => fn, deps)`.
</details>

<details>
<summary>3. Quand React.memo() est-il réellement utile ?</summary>

Quand un composant reçoit des props stables (primitives ou références mémorisées) et que son rendu est coûteux. Il est inutile si les props changent à chaque rendu (objets/fonctions recréés) sans `useMemo`/`useCallback`.
</details>

---

## Analogie

Pensez à des **briques LEGO**. L'héritage, c'est comme mouler une pièce spéciale pour chaque usage. La composition, c'est assembler des briques standard pour construire ce qu'on veut. React est conçu comme un système LEGO : des petits composants simples qu'on emboîte librement. Vue utilise les **slots** (des emplacements nommés dans la brique), Angular utilise la **projection de contenu** (`<ng-content>`). React utilise simplement les **props** — dont la plus naturelle est `children`.

---

## Théorie

### 1. Composition over inheritance : le principe fondamental

React ne recommande **jamais** l'héritage de composants. Contrairement à Angular où l'on peut étendre une classe composant, React utilise exclusivement la composition :

```tsx
// ❌ Héritage — ne faites JAMAIS ça en React
class SpecialButton extends BaseButton {
  render() {
    return <button className="special">{super.render()}</button>;
  }
}

// ✅ Composition — le pattern React
function SpecialButton({ children, ...props }: ButtonProps) {
  return (
    <Button className="special" {...props}>
      {children}
    </Button>
  );
}
```

### 2. Le pattern `children` (equivalent des slots)

`children` est une prop spéciale qui contient tout ce qui est entre les balises ouvrante et fermante :

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}

// Utilisation
<Card title="Mon profil">
  <p>Contenu libre ici</p>
  <Avatar url="/photo.jpg" />
</Card>
```

#### Slots nommés : utiliser des props

En Vue, on a `<slot name="header">`. En Angular, `<ng-content select="[header]">`. En React, on utilise simplement des props :

```tsx
interface PageLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

function PageLayout({ header, sidebar, children }: PageLayoutProps) {
  return (
    <div className="grid grid-cols-[250px_1fr]">
      <header className="col-span-2">{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

// Utilisation — equivalent des slots nommés
<PageLayout
  header={<NavBar />}
  sidebar={<Menu items={menuItems} />}
>
  <ArticleContent />
</PageLayout>
```

> **Comparaison directe :**
>
> | Concept | Vue 3 | Angular 19+ | React |
> |---------|-------|-------------|-------|
> | Slot par défaut | `<slot />` | `<ng-content />` | `{children}` |
> | Slot nommé | `<slot name="x" />` | `<ng-content select="x">` | Prop `x: ReactNode` |
> | Slot avec données | Scoped slot `v-slot:x="data"` | — | Render prop |

### 3. Render props (scoped slots React)

Le pattern render prop consiste à passer une **fonction** comme prop qui reçoit des données et retourne du JSX. C'est l'équivalent des scoped slots Vue :

```tsx
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return <div>{render(position)}</div>;
}

// Utilisation
<MouseTracker
  render={({ x, y }) => (
    <p>
      Position : {x}, {y}
    </p>
  )}
/>
```

> **En pratique** : les render props sont largement remplacées par les **custom hooks** depuis React 16.8. On les rencontre encore dans des bibliothèques legacy et en entretien technique. Préférez un hook `useMousePosition()`.

### 4. Higher-Order Components (HOC)

Un HOC est une fonction qui prend un composant et retourne un nouveau composant enrichi. C'est un pattern historique, remplacé par les hooks dans le code moderne :

```tsx
// HOC qui ajoute du logging
function withLogging<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithLogging(props: P) {
    useEffect(() => {
      console.log(`[${WrappedComponent.name}] monté`);
    }, []);

    return <WrappedComponent {...props} />;
  };
}

// Utilisation
const LoggedButton = withLogging(Button);
<LoggedButton label="Cliquez" />
```

> **Quand les rencontrer :** projets legacy, bibliothèques comme `react-redux` (l'ancien `connect()`), certaines bibliothèques d'internationalisation. Dans le code moderne, préférez les hooks.

### 5. Compound components (composants composés)

Le pattern compound components crée des composants qui fonctionnent ensemble, comme `<select>` et `<option>` en HTML :

```tsx
import { createContext, useContext, useState } from "react";

// --- Contexte interne ---
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* doit être utilisé dans <Tabs>");
  return ctx;
}

// --- Composant racine ---
function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// --- Sous-composants ---
function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      className={activeTab === value ? "tab active" : "tab"}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

// --- API publique ---
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };
```

```tsx
// Utilisation — API claire et flexible
<Tabs defaultTab="general">
  <Tabs.List>
    <Tabs.Tab value="general">Général</Tabs.Tab>
    <Tabs.Tab value="security">Sécurité</Tabs.Tab>
    <Tabs.Tab value="billing">Facturation</Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel value="general">Paramètres généraux...</Tabs.Panel>
  <Tabs.Panel value="security">Options de sécurité...</Tabs.Panel>
  <Tabs.Panel value="billing">Informations de facturation...</Tabs.Panel>
</Tabs>
```

### 6. Headless components (logique sans UI)

Un composant headless fournit la logique et l'état sans imposer de rendu. C'est un hook + un pattern de composition :

```tsx
// Hook headless pour un toggle
function useToggle(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close };
}

// Utilisation 1 : dropdown
function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const { isOpen, toggle } = useToggle();
  return (
    <div>
      <button onClick={toggle}>{label}</button>
      {isOpen && <div className="dropdown-menu">{children}</div>}
    </div>
  );
}

// Utilisation 2 : modal
function Modal({ trigger, children }: { trigger: string; children: React.ReactNode }) {
  const { isOpen, open, close } = useToggle();
  return (
    <>
      <button onClick={open}>{trigger}</button>
      {isOpen && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {children}
            <button onClick={close}>Fermer</button>
          </div>
        </div>
      )}
    </>
  );
}
```

> **Bibliothèques headless populaires** : Radix UI, Headless UI (Tailwind), React Aria (Adobe), Downshift. Elles fournissent la logique d'accessibilité et d'interaction, vous fournissez le CSS.

### 7. Arbre de décision des patterns

| Besoin | Pattern recommandé |
|--------|--------------------|
| Injecter du contenu dans un composant | `children` ou props `ReactNode` |
| Partager de la logique entre composants | Custom hook |
| API multi-composants liés (Tabs, Accordion) | Compound components |
| Logique réutilisable sans imposer de UI | Headless hook |
| Composant legacy à enrichir sans le modifier | HOC (rare) |
| Passer des données du parent vers le JSX enfant | Render prop (rare, préférer hook) |

---

## Pratique

### Exercice : créer un Accordion compound component

Créez un composant `Accordion` avec les sous-composants `Accordion.Item`, `Accordion.Trigger` et `Accordion.Content`. Un seul item peut être ouvert à la fois.

```tsx
// API cible
<Accordion>
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>Qu'est-ce que React ?</Accordion.Trigger>
    <Accordion.Content>Une bibliothèque UI créée par Meta.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>React est-il un framework ?</Accordion.Trigger>
    <Accordion.Content>Non, c'est une bibliothèque. Next.js est le framework.</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

<details>
<summary>Voir la solution</summary>

```tsx
import { createContext, useContext, useState } from "react";

// Contexte Accordion
interface AccordionContextType {
  openItem: string | null;
  toggle: (value: string) => void;
}
const AccordionContext = createContext<AccordionContextType | null>(null);

// Contexte Item (pour connaître la valeur de l'item courant)
const ItemContext = createContext<string>("");

function useAccordionContext() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion.* doit être utilisé dans <Accordion>");
  return ctx;
}

// --- Composant racine ---
function Accordion({ children }: { children: React.ReactNode }) {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (value: string) => {
    setOpenItem((prev) => (prev === value ? null : value));
  };

  return (
    <AccordionContext.Provider value={{ openItem, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

// --- Sous-composants ---
function Item({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <ItemContext.Provider value={value}>
      <div className="accordion-item">{children}</div>
    </ItemContext.Provider>
  );
}

function Trigger({ children }: { children: React.ReactNode }) {
  const { openItem, toggle } = useAccordionContext();
  const value = useContext(ItemContext);
  const isOpen = openItem === value;

  return (
    <button
      className="accordion-trigger"
      aria-expanded={isOpen}
      onClick={() => toggle(value)}
    >
      {children} {isOpen ? "▲" : "▼"}
    </button>
  );
}

function Content({ children }: { children: React.ReactNode }) {
  const { openItem } = useAccordionContext();
  const value = useContext(ItemContext);

  if (openItem !== value) return null;

  return (
    <div className="accordion-content" role="region">
      {children}
    </div>
  );
}

// --- API publique ---
Accordion.Item = Item;
Accordion.Trigger = Trigger;
Accordion.Content = Content;

export { Accordion };
```

</details>

---

## Résumé

| Pattern | Usage | Fréquence |
|---------|-------|-----------|
| `children` / props ReactNode | Injection de contenu (slots) | Quotidien |
| Custom hooks | Partage de logique | Quotidien |
| Compound components | API multi-composants (Tabs, Accordion) | Régulier |
| Headless components | Logique sans UI imposée | Régulier |
| Render props | Passage de données enfant → JSX | Rare (legacy) |
| HOC | Enrichir un composant existant | Rare (legacy) |

> **Prochain cours** : [Cours 35 — Error Boundaries et Suspense](./03-error-boundaries-suspense.md)
