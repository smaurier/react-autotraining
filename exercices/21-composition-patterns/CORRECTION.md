# Correction — Exercice 21 : Composition patterns

---

## Etape 1 : Context des Tabs

```tsx
// src/components/Tabs/TabsContext.tsx
"use client";

import { createContext, useContext } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

// On utilise undefined comme valeur par defaut pour detecter
// l'utilisation hors du Provider
const TabsContext = createContext<TabsContextValue | undefined>(undefined);

/**
 * Hook pour acceder au contexte Tabs.
 * Lance une erreur explicite si utilise hors du composant <Tabs>.
 */
export function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (context === undefined) {
    throw new Error(
      "useTabsContext doit etre utilise a l'interieur d'un composant <Tabs>"
    );
  }
  return context;
}

export { TabsContext };
```

---

## Etape 2 : Composant Tabs (parent)

```tsx
// src/components/Tabs/Tabs.tsx
"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { TabsContext } from "./TabsContext";

interface TabsProps {
  /** Onglet actif par defaut (mode non controle) */
  defaultTab: string;
  /** Onglet actif (mode controle — optionnel) */
  activeTab?: string;
  /** Callback quand l'onglet change (mode controle) */
  onChange?: (tabId: string) => void;
  children: ReactNode;
}

export function Tabs({
  defaultTab,
  activeTab: controlledActiveTab,
  onChange,
  children,
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(defaultTab);

  // Support mode controle et non controle
  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

  function setActiveTab(tabId: string): void {
    if (isControlled) {
      onChange?.(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  }

  // Memoriser la valeur du contexte pour eviter les re-renders inutiles
  const contextValue = useMemo(
    () => ({ activeTab, setActiveTab }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, isControlled]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}
```

---

## Etape 3 : TabList

```tsx
// src/components/Tabs/TabList.tsx
"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { useRef } from "react";

interface TabListProps {
  children: ReactNode;
  /** "horizontal" (defaut) ou "vertical" */
  orientation?: "horizontal" | "vertical";
}

export function TabList({ children, orientation = "horizontal" }: TabListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]'
    );
    if (!tabs || tabs.length === 0) return;

    const currentIndex = Array.from(tabs).findIndex(
      (tab) => tab === document.activeElement
    );
    if (currentIndex === -1) return;

    let nextIndex: number;

    const isHorizontal = orientation === "horizontal";
    const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
    const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

    switch (event.key) {
      case prevKey:
        event.preventDefault();
        nextIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
        break;
      case nextKey:
        event.preventDefault();
        nextIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
        break;
      case "Home":
        event.preventDefault();
        tabs[0].focus();
        tabs[0].click();
        break;
      case "End":
        event.preventDefault();
        tabs[tabs.length - 1].focus();
        tabs[tabs.length - 1].click();
        break;
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
```

---

## Etape 4 : Tab

```tsx
// src/components/Tabs/Tab.tsx
"use client";

import type { ReactNode } from "react";
import { useTabsContext } from "./TabsContext";

interface TabProps {
  /** Identifiant unique de l'onglet */
  id: string;
  children: ReactNode;
  /** Desactiver l'onglet */
  disabled?: boolean;
}

export function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => {
        if (!disabled) setActiveTab(id);
      }}
    >
      {children}
    </button>
  );
}
```

---

## Etape 5 : TabPanel

```tsx
// src/components/Tabs/TabPanel.tsx
"use client";

import type { ReactNode } from "react";
import { useTabsContext } from "./TabsContext";

interface TabPanelProps {
  /** ID de l'onglet auquel ce panel est associe */
  tabId: string;
  children: ReactNode;
}

export function TabPanel({ tabId, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === tabId;

  // Ne pas rendre le contenu si l'onglet n'est pas actif
  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
```

---

## Etape 6 : Export unifie (Compound Component)

```ts
// src/components/Tabs/index.ts
import { Tabs as TabsRoot } from "./Tabs";
import { TabList } from "./TabList";
import { Tab } from "./Tab";
import { TabPanel } from "./TabPanel";

// Attacher les sous-composants au composant principal
// Cela permet l'API Tabs.List, Tabs.Tab, Tabs.Panel
const Tabs = Object.assign(TabsRoot, {
  List: TabList,
  Tab: Tab,
  Panel: TabPanel,
});

export { Tabs };
export type { } from "./TabsContext";
```

---

## Etape 7 : Page de demo

```tsx
// src/app/tabs-demo/page.tsx
"use client";

import { Tabs } from "@/components/Tabs";

export default function TabsDemoPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem" }}>
      <h1>Demo du composant Tabs</h1>

      {/* Instance 1 : style simple */}
      <section style={{ marginBottom: "3rem" }}>
        <h2>Style simple</h2>
        <Tabs defaultTab="accueil">
          <Tabs.List>
            <Tabs.Tab id="accueil">Accueil</Tabs.Tab>
            <Tabs.Tab id="projets">Projets</Tabs.Tab>
            <Tabs.Tab id="contact">Contact</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel tabId="accueil">
            <div style={{ padding: "1rem", border: "1px solid #eee", borderTop: "none" }}>
              <h3>Bienvenue</h3>
              <p>Ceci est le contenu de l'onglet Accueil.</p>
            </div>
          </Tabs.Panel>
          <Tabs.Panel tabId="projets">
            <div style={{ padding: "1rem", border: "1px solid #eee", borderTop: "none" }}>
              <h3>Mes projets</h3>
              <ul>
                <li>Projet TaskFlow</li>
                <li>Blog Next.js</li>
                <li>Composant Tabs</li>
              </ul>
            </div>
          </Tabs.Panel>
          <Tabs.Panel tabId="contact">
            <div style={{ padding: "1rem", border: "1px solid #eee", borderTop: "none" }}>
              <h3>Contact</h3>
              <p>Envoyez-moi un email a contact@example.com</p>
            </div>
          </Tabs.Panel>
        </Tabs>
      </section>

      {/* Instance 2 : style card */}
      <section>
        <h2>Style card</h2>
        <Tabs defaultTab="react">
          <Tabs.List>
            <Tabs.Tab id="react">React</Tabs.Tab>
            <Tabs.Tab id="vue">Vue</Tabs.Tab>
            <Tabs.Tab id="angular">Angular</Tabs.Tab>
            <Tabs.Tab id="svelte" disabled>Svelte (bientot)</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel tabId="react">
            <div style={{ padding: "1.5rem", backgroundColor: "#f0f7ff", borderRadius: "0 0 8px 8px" }}>
              <p><strong>React 19</strong> : Server Components, Actions, use() hook.</p>
            </div>
          </Tabs.Panel>
          <Tabs.Panel tabId="vue">
            <div style={{ padding: "1.5rem", backgroundColor: "#f0fff0", borderRadius: "0 0 8px 8px" }}>
              <p><strong>Vue 3</strong> : Composition API, Pinia, Vapor mode.</p>
            </div>
          </Tabs.Panel>
          <Tabs.Panel tabId="angular">
            <div style={{ padding: "1.5rem", backgroundColor: "#fff0f0", borderRadius: "0 0 8px 8px" }}>
              <p><strong>Angular 19</strong> : Signals, zoneless, standalone components.</p>
            </div>
          </Tabs.Panel>
        </Tabs>
      </section>
    </div>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **`Object.assign` pour les Compound Components** : c'est le pattern standard pour attacher des sous-composants a un composant parent (`Tabs.List`, `Tabs.Tab`, etc.). En TypeScript, les types sont automatiquement inferes.

2. **Le Context doit avoir une valeur par defaut `undefined`** : cela permet de detecter quand un sous-composant est utilise en dehors du `<Tabs>` parent et de lancer une erreur explicite.

3. **`tabIndex={isActive ? 0 : -1}`** sur les onglets : seul l'onglet actif est dans l'ordre de tabulation. Les autres sont accessibles uniquement via les fleches du clavier.

4. **`aria-controls` et `aria-labelledby`** : ils creent un lien bidirectionnel entre l'onglet et son panel pour les lecteurs d'ecran.

5. **Navigation clavier avec bouclage** : quand on est sur le dernier onglet et qu'on appuie sur la fleche droite, on revient au premier (et vice versa).

6. **Mode controle vs non controle** : le composant supporte les deux modes grace a un pattern classique (`controlledValue ?? internalState`).

7. **Headless = reutilisable** : en n'imposant aucun style, le composant peut etre utilise avec n'importe quel systeme de design (Tailwind, CSS Modules, etc.).

8. **Chaque instance est independante** : les deux instances de `<Tabs>` sur la page de demo ont chacune leur propre Context. Changer d'onglet dans l'une n'affecte pas l'autre.
