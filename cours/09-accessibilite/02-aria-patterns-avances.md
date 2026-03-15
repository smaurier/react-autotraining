# 02 — Patterns ARIA avances en React

> **Premiere regle d'ARIA : ne pas utiliser ARIA si le HTML natif suffit.**
> Un `<button>` est toujours preferable à un `<div role="button">`.
> ARIA comble les lacunes du HTML natif pour les widgets complexes.

---

## Rappel du cours précédent

<details>
<summary>1. Quels sont les 4 principes de WCAG (POUR) ?</summary>

Perceptible, Operable, Comprehensible (Understandable), Robuste.
</details>

<details>
<summary>2. Quel attribut JSX remplace <code>for</code> pour lier un label à un input ?</summary>

`htmlFor` — car `for` est un mot reserve en JavaScript.
</details>

<details>
<summary>3. Quelle est la différence entre <code>aria-live="polite"</code> et <code>"assertive"</code> ?</summary>

`polite` attend que l'utilisateur soit inactif pour annoncer. `assertive` interrompt immediatement le lecteur d'ecran.
</details>

---

## Composant Tabs accessible

Le pattern Tabs suit la spécification WAI-ARIA Authoring Practices. Un seul onglet est dans le flux Tab, les fleches naviguent entre les onglets.

### Roles et attributs requis

| Élément | Role/Attribut | Description |
|---------|--------------|-------------|
| Conteneur onglets | `role="tablist"` | Groupe d'onglets |
| Onglet | `role="tab"` | Un onglet individuel |
| Panneau | `role="tabpanel"` | Contenu associe à un onglet |
| Onglet actif | `aria-selected="true"` | Indique l'onglet selectionne |
| Onglet inactif | `tabIndex={-1}` | Retire du flux Tab |
| Panneau | `aria-labelledby` | Pointe vers l'onglet associe |
| Onglet | `aria-controls` | Pointe vers le panneau associe |

### Implementation complete

```tsx
import { useState, useRef, useCallback } from "react";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  label: string;
}

function Tabs({ tabs, label }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setTabRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      tabRefs.current[index] = el;
    },
    [],
  );

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    let newIndex = index;

    switch (event.key) {
      case "ArrowRight":
        newIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveIndex(newIndex);
    tabRefs.current[newIndex]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={setTabRef(index)}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== activeIndex}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Utilisation

```tsx
function SettingsPage() {
  const tabs: TabItem[] = [
    { id: "general", label: "General", content: <GeneralSettings /> },
    { id: "security", label: "Securite", content: <SecuritySettings /> },
    { id: "notifications", label: "Notifications", content: <NotifSettings /> },
  ];

  return <Tabs tabs={tabs} label="Parametres du compte" />;
}
```

---

## Modal avec focus trap

Une modale accessible doit :
1. Pieger le focus a l'interieur
2. Recevoir le focus a l'ouverture
3. Restaurer le focus à la fermeture
4. Se fermer avec Escape
5. Avoir `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

### Hook `useFocusTrap`

```tsx
import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Sauvegarder l'element actuellement focalise
    previouslyFocused.current = document.activeElement as HTMLElement;

    // Focus le premier element focusable
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restaurer le focus precedent
      previouslyFocused.current?.focus();
    };
  }, [isActive, getFocusable]);

  return containerRef;
}
```

### Composant Modal

```tsx
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const containerRef = useFocusTrap(isOpen);
  const titleId = `modal-title-${title.replace(/\s+/g, "-").toLowerCase()}`;

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  function handleOverlayClick(event: React.MouseEvent) {
    // Fermer seulement si on clique sur l'overlay, pas sur le contenu
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <button onClick={onClose}>Fermer</button>
      </div>
    </div>,
    document.body,
  );
}
```

### Utilisation

```tsx
function ProductPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Confirmer la suppression
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirmer la suppression"
      >
        <p>Cette action est irreversible. Continuer ?</p>
        <button onClick={() => setIsModalOpen(false)}>Annuler</button>
        <button onClick={() => { /* supprimer */ setIsModalOpen(false); }}>
          Supprimer
        </button>
      </Modal>
    </>
  );
}
```

---

## Combobox (Autocomplete) accessible

Le pattern Combobox combine un champ de saisie avec une liste de suggestions.

```tsx
import { useState, useRef, useCallback, useId } from "react";

interface ComboboxProps {
  label: string;
  options: string[];
  onSelect: (value: string) => void;
}

function Combobox({ label, options, onSelect }: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  );

  const selectOption = useCallback(
    (value: string) => {
      setQuery(value);
      setIsOpen(false);
      setActiveIndex(-1);
      onSelect(value);
      inputRef.current?.focus();
    },
    [onSelect],
  );

  function handleInputKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          selectOption(filtered[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const activeDescendant =
    activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div>
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleInputKeyDown}
        onFocus={() => query && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={label}
        >
          {filtered.map((option, index) => (
            <li
              key={option}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={() => selectOption(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite" className="sr-only">
        {isOpen && filtered.length > 0
          ? `${filtered.length} suggestion${filtered.length > 1 ? "s" : ""} disponible${filtered.length > 1 ? "s" : ""}.`
          : ""}
      </div>
    </div>
  );
}
```

---

## Accordion accessible

```tsx
import { useState, useId } from "react";

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

function Accordion({ items, allowMultiple = false }: AccordionProps) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());
  const id = useId();

  function toggle(index: number) {
    setOpenIndices((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div>
      {items.map((item, index) => {
        const isOpen = openIndices.has(index);
        const headingId = `${id}-heading-${index}`;
        const panelId = `${id}-panel-${index}`;

        return (
          <div key={index}>
            <h3>
              <button
                id={headingId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                {item.title}
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              hidden={!isOpen}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Utilisation

```tsx
function FAQPage() {
  const faqItems: AccordionItem[] = [
    {
      title: "Comment creer un compte ?",
      content: <p>Cliquez sur le bouton "S'inscrire" en haut a droite.</p>,
    },
    {
      title: "Comment reinitialiser mon mot de passe ?",
      content: <p>Utilisez le lien "Mot de passe oublie" sur la page de connexion.</p>,
    },
    {
      title: "Comment contacter le support ?",
      content: <p>Envoyez un email a support@example.com.</p>,
    },
  ];

  return (
    <section aria-label="Questions frequentes">
      <h2>FAQ</h2>
      <Accordion items={faqItems} allowMultiple />
    </section>
  );
}
```

---

## `aria-describedby` pour la validation de formulaires

Lier les messages d'erreur aux champs permet au lecteur d'ecran d'annoncer l'erreur quand l'utilisateur focalise le champ.

```tsx
import { useState, useId } from "react";

interface FieldError {
  message: string;
}

interface FormField {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  validate?: (value: string) => string | null;
}

function AccessibleField({
  label,
  name,
  type,
  required,
  validate,
  value,
  onChange,
  error,
}: FormField & {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Construire la liste des descriptions
  const describedBy = [
    required ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      {required && (
        <span id={hintId} className="sr-only">
          (champ obligatoire)
        </span>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-required={required}
      />
      {error && (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
```

---

## Live regions pour les operations asynchrones

### Indicateur de chargement

```tsx
function LoadingButton({
  isLoading,
  onClick,
  children,
}: {
  isLoading: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        onClick={onClick}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? "Chargement..." : children}
      </button>
      <div aria-live="polite" className="sr-only">
        {isLoading ? "Operation en cours, veuillez patienter." : ""}
      </div>
    </>
  );
}
```

### Toast notifications

```tsx
import { useState, useCallback, useRef, useId } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  return { toasts, addToast };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      className="toast-container"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
          className={`toast toast--${toast.type}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

### Utilisation

```tsx
function OrderPage() {
  const { toasts, addToast } = useToast();

  async function handleOrder() {
    try {
      await fetch("/api/orders", { method: "POST" });
      addToast("Commande validee avec succes.", "success");
    } catch {
      addToast("Erreur lors de la validation de la commande.", "error");
    }
  }

  return (
    <>
      <button onClick={handleOrder}>Valider la commande</button>
      <ToastContainer toasts={toasts} />
    </>
  );
}
```

---

## Reduced motion : `prefers-reduced-motion`

Certains utilisateurs desactivent les animations (epilepsie, troubles vestibulaires). Respecter cette préférence est un critere WCAG 2.1 AA (2.3.3).

### En CSS

```css
/* Animation par defaut */
.fade-in {
  animation: fadeIn 300ms ease-in;
}

/* Desactiver pour les utilisateurs qui le demandent */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
  }
}
```

### Hook `useReducedMotion`

```tsx
import { useState, useEffect } from "react";

function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReduced(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
}
```

### Utilisation dans un composant

```tsx
function AnimatedList({ items }: { items: string[] }) {
  const prefersReduced = useReducedMotion();

  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={item}
          className={prefersReduced ? "" : "fade-in"}
          style={
            prefersReduced
              ? undefined
              : { animationDelay: `${index * 100}ms` }
          }
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

---

## Test avec lecteurs d'ecran

### NVDA (Windows, gratuit)

| Action | Raccourci |
|--------|-----------|
| Démarrer/arreter la lecture | Insert + Fleche bas |
| Élément suivant | Tab |
| Titre suivant | H |
| Region suivante | D |
| Liste des éléments | Insert + F7 |
| Lire la ligne courante | Insert + L |

### VoiceOver (macOS, intégré)

| Action | Raccourci |
|--------|-----------|
| Activer/désactiver | Cmd + F5 |
| Élément suivant | VO + Fleche droite |
| Titre suivant | VO + Cmd + H |
| Rotor (liste des éléments) | VO + U |
| Lire depuis le curseur | VO + A |

> `VO` = Control + Option

### Workflow de test recommande

1. **Automatise** : jest-axe dans les tests unitaires (couvre ~30% des problèmes)
2. **Semi-automatise** : extension axe DevTools dans le navigateur
3. **Manuel clavier** : naviguer avec Tab uniquement, vérifier le focus visible
4. **Lecteur d'ecran** : tester les flux critiques avec NVDA ou VoiceOver
5. **Utilisateurs réels** : tests avec des personnes en situation de handicap

---

## React Hook Form + validation accessible

React Hook Form s'intégré avec les attributs ARIA pour les erreurs de validation.

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>();

  const onSubmit: SubmitHandler<ContactFormData> = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Formulaire de contact">
      <div>
        <label htmlFor="contact-name">Nom</label>
        <input
          id="contact-name"
          {...register("name", {
            required: "Le nom est obligatoire.",
            minLength: { value: 2, message: "Le nom doit contenir au moins 2 caracteres." },
          })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          aria-required="true"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="field-error">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          {...register("email", {
            required: "L'email est obligatoire.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "L'adresse email n'est pas valide.",
            },
          })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-required="true"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          {...register("message", {
            required: "Le message est obligatoire.",
            minLength: { value: 10, message: "Le message doit contenir au moins 10 caracteres." },
          })}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          aria-required="true"
          rows={5}
        />
        {errors.message && (
          <p id="message-error" role="alert" className="field-error">
            {errors.message.message}
          </p>
        )}
      </div>

      <button type="submit">Envoyer</button>

      {Object.keys(errors).length > 0 && (
        <div role="alert" aria-live="assertive" className="form-errors-summary">
          Le formulaire contient {Object.keys(errors).length} erreur
          {Object.keys(errors).length > 1 ? "s" : ""}. Corrigez-les avant de soumettre.
        </div>
      )}
    </form>
  );
}
```

---

## Next.js : considerations spécifiques

### Annonce de changement de route

Next.js (App Router) ne géré pas nativement l'annonce des changements de route aux lecteurs d'ecran. Il faut ajouter un composant d'annonce.

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Chercher le h1 de la page pour annoncer le titre
    const timer = setTimeout(() => {
      const h1 = document.querySelector("h1");
      const title = h1?.textContent || document.title;
      setAnnouncement(`Page chargee : ${title}`);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      role="status"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Dans le layout racine
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <RouteAnnouncer />
        {children}
      </body>
    </html>
  );
}
```

### Gestion du `<head>` avec Metadata API

```tsx
// app/produits/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produits — MonSite",
  description: "Liste des produits disponibles sur MonSite.",
  // La langue est definie dans le layout racine via <html lang="fr">
};

export default function ProduitsPage() {
  return (
    <main id="main-content">
      <h1>Produits</h1>
      {/* ... */}
    </main>
  );
}
```

### Skip link dans le layout Next.js

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <RouteAnnouncer />
        <header>
          <nav aria-label="Navigation principale">{/* ... */}</nav>
        </header>
        {children}
      </body>
    </html>
  );
}
```

---

## Pratique

### Exercice ARIA.1 — Créer un Accordion accessible

Implementez un composant Accordion qui respecte le pattern WAI-ARIA :
- Chaque section à un bouton de titre avec `aria-expanded`
- Les panneaux ont `role="region"` et `aria-labelledby`
- Les fleches Haut/Bas naviguent entre les titres

<details>
<summary>Solution</summary>

```tsx
import { useState, useRef, useId } from "react";

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

function KeyboardAccordion({ items }: { items: AccordionItem[] }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function toggle(index: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    let newIndex = index;

    switch (event.key) {
      case "ArrowDown":
        newIndex = (index + 1) % items.length;
        break;
      case "ArrowUp":
        newIndex = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    buttonRefs.current[newIndex]?.focus();
  }

  return (
    <div>
      {items.map((item, index) => {
        const isOpen = openIndices.has(index);
        const headingId = `${id}-heading-${index}`;
        const panelId = `${id}-panel-${index}`;

        return (
          <div key={index}>
            <h3>
              <button
                id={headingId}
                ref={(el) => { buttonRefs.current[index] = el; }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                {item.title}
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              hidden={!isOpen}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```
</details>

---

### Exercice ARIA.2 — Focus trap pour modale

Ce composant modale ne piege pas le focus. Identifiez les problèmes et corrigez-le :

```tsx
function BrokenModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Titre</h2>
        <p>Contenu de la modale</p>
        <button onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
```

<details>
<summary>Solution</summary>

**Problemes :**
1. Pas de `role="dialog"` ni `aria-modal="true"`
2. Pas de focus trap
3. Pas de `aria-labelledby`
4. Pas de gestion de Escape
5. Le focus n'est pas deplace dans la modale
6. Le focus n'est pas restaure à la fermeture
7. Pas de portail (`createPortal`)

```tsx
import { createPortal } from "react-dom";

function FixedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fixed-modal-title"
      >
        <h2 id="fixed-modal-title">Titre</h2>
        <p>Contenu de la modale</p>
        <button onClick={onClose}>Fermer</button>
      </div>
    </div>,
    document.body,
  );
}
```
</details>

---

### Exercice ARIA.3 — Formulaire React Hook Form accessible

Ajoutez la validation accessible a ce formulaire React Hook Form :

```tsx
function NewsletterForm() {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register("email")} placeholder="Votre email" />
      <button type="submit">S'inscrire</button>
    </form>
  );
}
```

<details>
<summary>Solution</summary>

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";
import { useState } from "react";

interface NewsletterData {
  email: string;
}

function NewsletterForm() {
  const [successMessage, setSuccessMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewsletterData>();

  const onSubmit: SubmitHandler<NewsletterData> = (data) => {
    console.log(data);
    setSuccessMessage("Inscription reussie !");
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Inscription a la newsletter"
    >
      <label htmlFor="newsletter-email">Adresse email</label>
      <input
        id="newsletter-email"
        type="email"
        {...register("email", {
          required: "L'adresse email est obligatoire.",
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "L'adresse email n'est pas valide.",
          },
        })}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? "newsletter-email-error" : undefined}
        aria-required="true"
      />
      {errors.email && (
        <p id="newsletter-email-error" role="alert" className="field-error">
          {errors.email.message}
        </p>
      )}

      <button type="submit">S'inscrire</button>

      <div aria-live="polite" className="sr-only">
        {successMessage}
      </div>
    </form>
  );
}
```
</details>

---

## Résumé

| Pattern | Points clés |
|---------|-------------|
| Tabs | `role="tablist/tab/tabpanel"`, fleches pour naviguer, un seul `tabIndex={0}` |
| Modal | Focus trap, `role="dialog"`, `aria-modal`, Escape, `createPortal` |
| Combobox | `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"` |
| Accordion | `aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby` |
| Validation | `aria-invalid`, `aria-describedby`, `role="alert"` sur les erreurs |
| Live regions | `aria-live="polite"` pour les confirmations, `"assertive"` pour les erreurs |
| Reduced motion | `prefers-reduced-motion` en CSS + hook `useReducedMotion` |
| Next.js | `RouteAnnouncer` client, `<html lang>`, Metadata API, skip link |

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Quiz** : [quiz 09 accessibilité](../../quizzes/quiz-09-accessibilite.html)
:::
