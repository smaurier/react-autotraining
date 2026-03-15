# 01 — Fondamentaux WCAG et accessibilité en React

> **L'accessibilité web n'est pas optionnelle.**
> La directive europeenne EAA (2025) et le RGAA imposent la conformite WCAG 2.1 AA.
> React ne généré pas de HTML accessible par defaut — c'est au développeur de s'en assurer.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre <code>className</code> et <code>class</code> en JSX ?</summary>

`class` est un mot reserve en JavaScript. JSX utilise `className` pour définir les classes CSS sur un élément.
</details>

<details>
<summary>2. Comment React géré-t-il le rendu conditionnel ?</summary>

Via des expressions JavaScript : ternaire (`a ? b : c`), operateur `&&`, ou early return. Pas de directive `v-if` comme en Vue.
</details>

<details>
<summary>3. Pourquoi les `key` sont-elles importantes dans les listes ?</summary>

React utilise les `key` pour identifier quel élément a change, a ete ajoute ou supprime. Sans `key` stable, React recree tous les noeuds DOM à chaque rendu.
</details>

---

## WCAG 2.1 — Les 4 principes POUR

Tout critere WCAG appartient a l'un de ces 4 principes :

| Principe | Description | Exemple React |
|----------|-------------|---------------|
| **Perceptible** | L'information est presentee de manière perceptible | `alt` sur les images, contrastes suffisants |
| **Operable** | L'interface est utilisable au clavier | `<button>` natifs, `onKeyDown` |
| **Comprehensible** | Le contenu est comprehensible | Labels lies aux inputs, messages d'erreur clairs |
| **Robuste** | Compatible avec les technologies d'assistance | HTML semantique, ARIA correct |

### Niveaux de conformite

| Niveau | Description | Requis ? |
|--------|-------------|----------|
| **A** | Minimum vital | Oui |
| **AA** | Cible legale (RGAA) | Oui |
| **AAA** | Excellence, pas toujours atteignable | Non requis |

---

## HTML semantique en JSX

JSX n'est pas du HTML — c'est du JavaScript. Certains attributs ont des noms différents.

### Attributs spécifiques a JSX

| HTML | JSX | Raison |
|------|-----|--------|
| `class` | `className` | Mot reserve JS |
| `for` | `htmlFor` | Mot reserve JS |
| `tabindex` | `tabIndex` | camelCase |
| `aria-label` | `aria-label` | Inchange (attributs avec tiret) |
| `aria-describedby` | `aria-describedby` | Inchange |
| `role` | `role` | Inchange |

> Les attributs `aria-*` et `data-*` gardent leur syntaxe avec tirets en JSX. Seuls les attributs HTML standard sont en camelCase.

### Labels et formulaires

```tsx
// ✅ Label lie a l'input via htmlFor
function EmailField() {
  return (
    <div>
      <label htmlFor="email-input">Adresse email</label>
      <input id="email-input" type="email" name="email" />
    </div>
  );
}

// ❌ Erreur frequente : utiliser "for" au lieu de "htmlFor"
// <label for="email-input"> → warning JSX, ignore par React
```

### Structure semantique d'une page

```tsx
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      <header>
        <nav aria-label="Navigation principale">
          <ul role="list">
            <li><a href="/">Accueil</a></li>
            <li><a href="/produits">Produits</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer>
        <nav aria-label="Navigation secondaire">
          <ul role="list">
            <li><a href="/mentions-legales">Mentions legales</a></li>
            <li><a href="/accessibilite">Accessibilite</a></li>
          </ul>
        </nav>
      </footer>
    </>
  );
}
```

---

## Gestion du focus dans les SPA

En SPA, les changements de page ne declenchent pas de rechargement. Le focus reste sur l'élément clique. Les utilisateurs de lecteur d'ecran ne savent pas que la page a change.

### Skip link

```tsx
function SkipLink() {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const main = document.getElementById("main-content");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus();
      main.addEventListener(
        "blur",
        () => main.removeAttribute("tabindex"),
        { once: true },
      );
    }
  }

  return (
    <a href="#main-content" className="skip-link" onClick={handleClick}>
      Aller au contenu principal
    </a>
  );
}
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  z-index: 9999;
  padding: 0.75rem 1.5rem;
  background: #1a73e8;
  color: #fff;
  border-radius: 0 0 0.5rem 0.5rem;
  text-decoration: none;
  font-weight: 600;
}

.skip-link:focus {
  top: 0;
}
```

### Focus après changement de route (React Router)

```tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

function useRouteAnnounce(): void {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Ne pas deplacer le focus au premier rendu
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const main = document.querySelector<HTMLElement>("main");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus();
      main.addEventListener(
        "blur",
        () => main.removeAttribute("tabindex"),
        { once: true },
      );
    }
  }, [location.pathname]);
}
```

### Focus programmatique avec useRef

```tsx
import { useRef, useEffect, useState } from "react";

function SearchForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Quand le formulaire s'ouvre, deplacer le focus vers l'input
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      <button onClick={() => setIsOpen(true)} aria-expanded={isOpen}>
        Rechercher
      </button>

      {isOpen && (
        <form role="search">
          <label htmlFor="search-input" className="sr-only">
            Rechercher
          </label>
          <input
            ref={inputRef}
            id="search-input"
            type="search"
            placeholder="Rechercher..."
          />
          <button type="submit">Valider</button>
        </form>
      )}
    </>
  );
}
```

---

## Regions `aria-live` pour le contenu dynamique

En SPA, le contenu change sans rechargement. Les lecteurs d'ecran ne detectent pas ces changements. `aria-live` resout ce problème.

### Les 3 valeurs

| Valeur | Comportement | Cas d'usage |
|--------|-------------|-------------|
| `off` | Pas d'annonce (defaut) | Contenu statique |
| `polite` | Annonce quand l'utilisateur est inactif | Confirmations, mises a jour |
| `assertive` | Interrompt immediatement | Erreurs critiques |

### Hook `useAnnouncer`

```tsx
import { useState, useCallback, useRef, useEffect } from "react";

type AriaPoliteness = "polite" | "assertive";

interface Announcer {
  message: string;
  announce: (text: string, priority?: AriaPoliteness) => void;
  AnnouncerRegion: () => React.JSX.Element;
}

function useAnnouncer(): Announcer {
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<AriaPoliteness>("polite");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const announce = useCallback(
    (text: string, level: AriaPoliteness = "polite") => {
      // Vider puis remplir pour forcer la re-annonce
      setMessage("");
      setPriority(level);
      requestAnimationFrame(() => {
        setMessage(text);
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setMessage(""), 5000);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function AnnouncerRegion() {
    return (
      <div aria-live={priority} aria-atomic="true" className="sr-only">
        {message}
      </div>
    );
  }

  return { message, announce, AnnouncerRegion };
}
```

### Utilisation

```tsx
function CartButton() {
  const [count, setCount] = useState(0);
  const { announce, AnnouncerRegion } = useAnnouncer();

  function addToCart() {
    const newCount = count + 1;
    setCount(newCount);
    announce(
      `Produit ajoute. ${newCount} article${newCount > 1 ? "s" : ""} dans le panier.`,
    );
  }

  return (
    <>
      <button onClick={addToCart}>
        Ajouter au panier ({count})
      </button>
      <AnnouncerRegion />
    </>
  );
}
```

### Annonces pour les operations asynchrones

```tsx
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const { announce, AnnouncerRegion } = useAnnouncer();

  async function fetchUsers() {
    setStatus("loading");
    announce("Chargement des utilisateurs en cours...");

    try {
      const response = await fetch("/api/users");
      const data: User[] = await response.json();
      setUsers(data);
      setStatus("success");
      announce(`${data.length} utilisateur${data.length > 1 ? "s" : ""} charge${data.length > 1 ? "s" : ""}.`);
    } catch {
      setStatus("error");
      announce("Erreur lors du chargement des utilisateurs.", "assertive");
    }
  }

  return (
    <section aria-label="Utilisateurs">
      <button onClick={fetchUsers} disabled={status === "loading"}>
        {status === "loading" ? "Chargement..." : "Charger les utilisateurs"}
      </button>

      {status === "error" && (
        <p role="alert">Impossible de charger les utilisateurs.</p>
      )}

      {users.length > 0 && (
        <ul aria-label="Liste des utilisateurs">
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}

      <AnnouncerRegion />
    </section>
  );
}
```

---

## Navigation clavier

### Conventions clavier standard

| Touche | Comportement |
|--------|-------------|
| **Tab** | Élément focusable suivant |
| **Shift+Tab** | Élément focusable précédent |
| **Enter** | Activer un lien ou un bouton |
| **Space** | Activer un bouton, cocher une case |
| **Escape** | Fermer modale, dropdown, tooltip |
| **Fleches** | Naviguer dans un groupe (onglets, menu) |
| **Home / End** | Premier / dernier élément d'un groupe |

### Gestion de `onKeyDown` en React

```tsx
function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const items = ["Profil", "Parametres", "Deconnexion"];

  function handleButtonKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setIsOpen(true);
        // Focus le premier element au prochain rendu
        requestAnimationFrame(() => itemRefs.current[0]?.focus());
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  }

  function handleItemKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        const nextIndex = (index + 1) % items.length;
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        const prevIndex = (index - 1 + items.length) % items.length;
        setActiveIndex(prevIndex);
        itemRefs.current[prevIndex]?.focus();
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        itemRefs.current[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(items.length - 1);
        itemRefs.current[items.length - 1]?.focus();
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  }

  return (
    <div>
      <button
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
      >
        Menu
      </button>

      {isOpen && (
        <ul role="menu" aria-label="Menu utilisateur">
          {items.map((item, index) => (
            <li key={item} role="none">
              <button
                role="menuitem"
                ref={(el) => { itemRefs.current[index] = el; }}
                tabIndex={index === activeIndex ? 0 : -1}
                onKeyDown={(e) => handleItemKeyDown(e, index)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Hook roving tabindex

```tsx
import { useState, useRef, useCallback } from "react";

function useRovingTabindex(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    [],
  );

  function handleKeyDown(event: React.KeyboardEvent) {
    let newIndex = activeIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        newIndex = (activeIndex + 1) % itemCount;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        newIndex = (activeIndex - 1 + itemCount) % itemCount;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }

    setActiveIndex(newIndex);
    itemRefs.current[newIndex]?.focus();
  }

  function getTabIndex(index: number): 0 | -1 {
    return index === activeIndex ? 0 : -1;
  }

  return { activeIndex, setRef, handleKeyDown, getTabIndex };
}
```

---

## Anti-patterns courants en React

### 1. `<div>` comme bouton

```tsx
// ❌ Pas focusable, pas annonce comme bouton, pas de clavier
<div className="btn" onClick={handleClick}>Cliquer</div>

// ✅ Element natif : focus, Enter, Space, annonce correcte
<button className="btn" onClick={handleClick}>Cliquer</button>
```

### 2. Image sans texte alternatif

```tsx
// ❌ Pas d'information pour le lecteur d'ecran
<img src="/photo.jpg" />

// ✅ Image informative : alt descriptif
<img src="/photo.jpg" alt="Vue aerienne du campus universitaire" />

// ✅ Image decorative : alt vide + role presentation
<img src="/decoration.svg" alt="" role="presentation" />
```

### 3. Mauvaise utilisation de `autoFocus`

```tsx
// ❌ autoFocus deplace le focus sans raison — perturbe les lecteurs d'ecran
function PageContent() {
  return (
    <div>
      <h1>Bienvenue</h1>
      <input autoFocus placeholder="Rechercher..." />
    </div>
  );
}

// ✅ autoFocus seulement dans un contexte justifie (modale, formulaire ouvert par l'utilisateur)
function SearchModal({ isOpen }: { isOpen: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Recherche">
      <input ref={inputRef} type="search" placeholder="Rechercher..." />
    </div>
  );
}
```

### 4. `onClick` sur un élément non interactif sans clavier

```tsx
// ❌ La carte est cliquable mais pas focusable, pas de clavier
<div className="card" onClick={() => navigate(`/article/${id}`)}>
  <h3>{title}</h3>
  <p>{excerpt}</p>
</div>

// ✅ Lien englobant : focusable, Enter, annonce comme lien
<a href={`/article/${id}`} className="card">
  <h3>{title}</h3>
  <p>{excerpt}</p>
</a>
```

### 5. Listes de `<div>` au lieu de `<ul>/<li>`

```tsx
// ❌ Pas de semantique — le lecteur d'ecran ne sait pas que c'est une liste
<div className="product-list">
  {products.map((p) => (
    <div key={p.id}>{p.name}</div>
  ))}
</div>

// ✅ Liste semantique — le lecteur annonce "liste de 5 elements"
<ul className="product-list" aria-label="Produits disponibles">
  {products.map((p) => (
    <li key={p.id}>{p.name}</li>
  ))}
</ul>
```

---

## Error Boundaries et messages accessibles

Les Error Boundaries React attrapent les erreurs de rendu. Le message d'erreur doit etre accessible.

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AccessibleErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div role="alert" aria-live="assertive">
          <h2>Une erreur est survenue</h2>
          <p>
            Impossible d'afficher cette section.
            Veuillez rafraichir la page ou contacter le support.
          </p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Reessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Utilisation

```tsx
function App() {
  return (
    <AppLayout>
      <AccessibleErrorBoundary>
        <Dashboard />
      </AccessibleErrorBoundary>
    </AppLayout>
  );
}
```

---

## `React.Fragment` vs wrapper divs

Les `<div>` supplementaires cassent la semantique et la navigation par structure.

```tsx
// ❌ Le div casse la structure dl > dt/dd
function DefinitionItem({ term, definition }: { term: string; definition: string }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{definition}</dd>
    </div>
  );
}

// ✅ Fragment : pas de noeud DOM supplementaire
import { Fragment } from "react";

function DefinitionItem({ term, definition }: { term: string; definition: string }) {
  return (
    <Fragment>
      <dt>{term}</dt>
      <dd>{definition}</dd>
    </Fragment>
  );
}

// Utilisation
function Glossary({ items }: { items: { term: string; definition: string }[] }) {
  return (
    <dl>
      {items.map((item) => (
        <DefinitionItem key={item.term} term={item.term} definition={item.definition} />
      ))}
    </dl>
  );
}
```

---

## Portails et accessibilité

`createPortal` rend un composant dans un noeud DOM différent. L'arbre d'accessibilité (accessibility tree) suit l'arbre React, pas le DOM — donc les événements et le contexte React fonctionnent. Mais attention au focus.

```tsx
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

interface TooltipProps {
  content: string;
  targetRef: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
}

function Tooltip({ content, targetRef, isVisible }: TooltipProps) {
  const tooltipId = "tooltip-" + content.slice(0, 10).replace(/\s/g, "-");

  useEffect(() => {
    if (targetRef.current) {
      if (isVisible) {
        targetRef.current.setAttribute("aria-describedby", tooltipId);
      } else {
        targetRef.current.removeAttribute("aria-describedby");
      }
    }
  }, [isVisible, targetRef, tooltipId]);

  if (!isVisible) return null;

  return createPortal(
    <div id={tooltipId} role="tooltip">
      {content}
    </div>,
    document.body,
  );
}
```

---

## Tests d'accessibilité

### jest-axe : tests automatises

```tsx
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("LoginForm", () => {
  it("ne contient aucune violation WCAG", async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### @testing-library/react : requêtes par role

Testing Library encourage les requêtes qui refletent l'experience utilisateur :

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("SearchForm", () => {
  it("le champ de recherche est accessible par son label", () => {
    render(<SearchForm />);

    // ✅ getByRole cherche dans l'arbre d'accessibilite
    const input = screen.getByRole("searchbox", { name: /rechercher/i });
    expect(input).toBeInTheDocument();
  });

  it("le bouton de soumission est focusable et cliquable", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const button = screen.getByRole("button", { name: /valider/i });
    await user.tab();
    expect(button).toHaveFocus();
  });

  it("annonce le nombre de resultats", async () => {
    render(<SearchResults results={["React", "Angular", "Vue"]} />);

    // getByRole("status") cherche un element avec role="status" ou aria-live
    expect(screen.getByRole("status")).toHaveTextContent("3 resultats");
  });
});
```

### Priorite des requêtes Testing Library

| Priorite | Requête | Quand l'utiliser |
|----------|---------|-----------------|
| 1 | `getByRole` | Toujours en premier — reflete l'arbre d'accessibilité |
| 2 | `getByLabelText` | Champs de formulaire |
| 3 | `getByPlaceholderText` | Si pas de label (a éviter) |
| 4 | `getByText` | Contenu textuel visible |
| 5 | `getByTestId` | Dernier recours |

---

## Checklist rapide WCAG AA pour React

| Critere | Comment vérifier |
|---------|-----------------|
| Contrastes >= 4.5:1 | DevTools > Accessibility > Contrast |
| Tous les inputs ont un label | `htmlFor` + `id`, ou `aria-label` |
| Navigation clavier complete | Tester avec Tab uniquement |
| Images informatives ont un alt | Inspecter chaque `<img>` |
| Focus visible sur tous les interactifs | Tabulation et vérification visuelle |
| Langue declaree | `<html lang="fr">` |
| Structure de titres logique | h1 > h2 > h3, pas de saut |
| Erreurs de formulaire liees | `aria-describedby` + `aria-invalid` |
| Changements dynamiques annonces | `aria-live` sur les regions dynamiques |
| Pas de div cliquable | `<button>` ou `<a>` natifs |

---

## Pratique

### Exercice A11Y.1 — Corriger un composant inaccessible

Ce composant est inaccessible. Corrige-le :

```tsx
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <div className="close-btn" onClick={onClose}>X</div>
  );
}
```

<details>
<summary>Solution</summary>

```tsx
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button className="close-btn" onClick={onClose} aria-label="Fermer">
      <span aria-hidden="true">X</span>
    </button>
  );
}
```

**Pourquoi :**
- `<button>` est focusable et annonce comme bouton
- `aria-label` donne un nom accessible clair
- `aria-hidden="true"` sur le "X" evite que le lecteur d'ecran lise "X" au lieu de "Fermer"
</details>

---

### Exercice A11Y.2 — Ajouter une annonce dynamique

Le composant suivant supprime un élément, mais le lecteur d'ecran ne sait pas que l'action a reussi :

```tsx
function TodoItem({ todo, onDelete }: { todo: Todo; onDelete: (id: string) => void }) {
  return (
    <li>
      {todo.title}
      <button onClick={() => onDelete(todo.id)}>Supprimer</button>
    </li>
  );
}
```

<details>
<summary>Solution</summary>

```tsx
function TodoList({ todos, onDelete }: { todos: Todo[]; onDelete: (id: string) => void }) {
  const [announcement, setAnnouncement] = useState("");

  function handleDelete(todo: Todo) {
    onDelete(todo.id);
    setAnnouncement(`${todo.title} supprime de la liste.`);
    setTimeout(() => setAnnouncement(""), 3000);
  }

  return (
    <>
      <ul aria-label="Liste des taches">
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.title}
            <button
              onClick={() => handleDelete(todo)}
              aria-label={`Supprimer ${todo.title}`}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
```
</details>

---

### Exercice A11Y.3 — Formulaire accessible

Rendre ce formulaire conforme WCAG AA :

```tsx
function LoginForm() {
  return (
    <div>
      <input type="text" placeholder="Email" />
      <input type="password" placeholder="Mot de passe" />
      <div className="btn" onClick={() => {}}>Connexion</div>
    </div>
  );
}
```

<details>
<summary>Solution</summary>

```tsx
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) newErrors.email = "L'adresse email est obligatoire.";
    if (!password) newErrors.password = "Le mot de passe est obligatoire.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Soumettre le formulaire
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Formulaire de connexion" noValidate>
      <div>
        <label htmlFor="login-email">Adresse email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          autoComplete="email"
        />
        {errors.email && (
          <p id="email-error" role="alert">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="login-password">Mot de passe</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          autoComplete="current-password"
        />
        {errors.password && (
          <p id="password-error" role="alert">{errors.password}</p>
        )}
      </div>

      <button type="submit">Connexion</button>
    </form>
  );
}
```
</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|-----------------------|
| WCAG POUR | Perceptible, Operable, Comprehensible, Robuste |
| `htmlFor` | Remplace `for` en JSX pour lier label et input |
| `useRef` + `focus()` | Gestion programmatique du focus |
| `aria-live` | Annonce les changements dynamiques au lecteur d'ecran |
| Skip link | Premier élément focusable, saute la navigation |
| `<button>` natif | Toujours preferable a `<div onClick>` |
| Fragments | Evitent les wrapper divs qui cassent la semantique |
| jest-axe | Tests automatises de violations WCAG |
| `getByRole` | Requête prioritaire dans Testing Library |

> **Prochain cours** : [02 — Patterns ARIA avances en React](./02-aria-patterns-avances.md)
