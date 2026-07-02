---
titre: Patterns ARIA avancés en React
cours: 04-react
notions: [quand utiliser ARIA vs HTML natif, roles states et properties, aria-live regions pour annonces dynamiques, modale accessible avec role dialog et aria-modal, focus trap et restauration du focus, fermeture Escape, aria-expanded et aria-controls, navigation clavier tabs menu combobox, gestion programmatique du focus avec useRef]
outcomes: [décider quand ARIA est nécessaire et quand le HTML natif suffit, construire une modale accessible avec focus trap Escape et restauration du focus, annoncer des changements dynamiques via aria-live, rendre des tabs et widgets navigables au clavier]
prerequis: [35-fondamentaux-wcag-react]
next: 37-tailwind-css
libs: [{ name: react, version: "^19" }]
tribuzen: admin web TribuZen — modale d'invitation accessible, live region "invitation envoyée", tabs Familles/Membres pilotables au clavier
last-reviewed: 2026-07
---

# Patterns ARIA avancés en React

> **Outcomes — tu sauras FAIRE :** décider quand ARIA est nécessaire (et quand le HTML natif suffit), construire une modale accessible (focus trap + Escape + restauration du focus), annoncer des changements dynamiques via `aria-live`, rendre des tabs navigables au clavier.
> **Difficulté :** :star::star::star:

> **Première règle d'ARIA : ne pas utiliser ARIA si le HTML natif suffit.**
> Un `<button>` natif est toujours préférable à un `<div role="button">`. ARIA ne comble que les lacunes du HTML pour les widgets complexes qui n'existent pas nativement (tabs, combobox, live regions).

## 1. Cas concret d'abord

Tu intègres l'admin TribuZen. L'admin d'une tribu doit pouvoir **inviter un nouveau membre** via une modale. Un collègue a livré ça :

```tsx
// InviteModal.tsx — AVANT (inaccessible)
function InviteModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="overlay">
      <div className="modal">
        <h2>Inviter un membre</h2>
        <input placeholder="email@exemple.fr" />
        <button onClick={onClose}>Envoyer</button>
      </div>
    </div>
  );
}
```

Teste-la **au clavier uniquement** (débranche ta souris mentalement) :

1. À l'ouverture, le focus reste sur le bouton "Inviter" **derrière** la modale — l'utilisateur clavier ne sait pas qu'une modale s'est ouverte.
2. `Tab` sort de la modale et navigue dans la page **en dessous** — rien ne piège le focus.
3. `Escape` ne ferme rien.
4. À la fermeture, le focus part au hasard (souvent sur `<body>`) — l'utilisateur est perdu.
5. Aucun lecteur d'écran n'annonce "boîte de dialogue" : pas de `role="dialog"`, pas de `aria-modal`.
6. Quand l'invitation part, aucun retour n'est **annoncé** vocalement.

Ce module te donne les patterns pour corriger chacun de ces points — et le réflexe de te demander d'abord si le HTML natif ne ferait pas le travail.

---

## 2. Théorie complète, concise

### 2.1 Quand utiliser ARIA — la règle d'or

ARIA (Accessible Rich Internet Applications) est un ensemble d'attributs (`role`, `aria-*`) qui **décrivent** au lecteur d'écran ce qu'un élément est et fait. C'est une **surcouche sémantique**, jamais un remplacement du HTML.

Les 5 règles d'ARIA (résumé de la spec "Using ARIA") :

1. **Si un élément HTML natif fait le travail, utilise-le.** `<button>`, `<a href>`, `<input>`, `<select>`, `<nav>`, `<dialog>`… apportent gratuitement rôle, état, clavier et focus.
2. **Ne change pas la sémantique native.** `<button role="heading">` est une faute.
3. **Tout widget ARIA doit être utilisable au clavier.**
4. **N'utilise pas `role="presentation"` ni `aria-hidden="true"` sur un élément focusable.**
5. **Tout élément interactif doit avoir un nom accessible** (texte, `aria-label`, ou `aria-labelledby`).

```tsx
// ❌ Réinventer un bouton — pas de focus, pas de touche Espace/Entrée, pas de rôle
<div role="button" tabIndex={0} onClick={handle}>Envoyer</div>

// ✅ Le natif fait tout gratuitement
<button onClick={handle}>Envoyer</button>
```

On ne sort ARIA que pour les widgets **absents du HTML** : onglets (tabs), combobox/autocomplete, régions live, arbres, menus applicatifs.

### 2.2 Roles, states et properties

ARIA se décompose en trois familles :

| Famille | Rôle | Exemples | Change-t-il ? |
|---|---|---|---|
| **Roles** | Ce qu'est l'élément | `role="dialog"`, `role="tablist"`, `role="alert"` | Non (statique) |
| **States** | État courant, dynamique | `aria-expanded`, `aria-selected`, `aria-checked`, `aria-busy`, `aria-invalid` | Oui (au fil des interactions) |
| **Properties** | Relations et méta stables | `aria-label`, `aria-labelledby`, `aria-controls`, `aria-describedby`, `aria-modal` | Rarement |

En React, les **states** sont typiquement pilotés par du `useState` : la valeur booléenne de l'état devient la valeur de l'attribut.

```tsx
// L'état React alimente directement l'attribut ARIA
const [open, setOpen] = useState(false);

<button aria-expanded={open} aria-controls="menu-panel" onClick={() => setOpen(o => !o)}>
  Options
</button>
{/* aria-expanded passe de "false" à "true" sans effort — React réconcilie l'attribut */}
```

> Note JSX : les attributs ARIA en React s'écrivent en **kebab-case** (`aria-expanded`, `aria-labelledby`) — contrairement à `className`/`htmlFor`. React accepte les booléens JS et les sérialise en `"true"`/`"false"`.

### 2.3 `aria-live` : annoncer les changements dynamiques

Quand le contenu change **sans rechargement** (envoi d'une invitation, résultat de recherche, toast), le lecteur d'écran ne le remarque pas par défaut. Une **live region** force l'annonce.

| Valeur | Comportement | Usage |
|---|---|---|
| `aria-live="polite"` | Annonce quand l'utilisateur est inactif | Confirmations, statuts, compteurs |
| `aria-live="assertive"` | **Interrompt** immédiatement la lecture | Erreurs bloquantes uniquement |
| `role="status"` | = `polite` implicite | Messages de statut |
| `role="alert"` | = `assertive` implicite | Alertes d'erreur |

```tsx
function InviteFeedback({ message }: { message: string }) {
  return (
    // La région existe DÈS le montage, vide. On y injecte le texte APRÈS.
    // Créer la région et le texte en même temps = souvent non annoncé.
    <div aria-live="polite" className="sr-only">
      {message /* "Invitation envoyée à alice@tribuzen.app" */}
    </div>
  );
}
```

Deux propriétés associées :
- `aria-atomic="true"` : relire **toute** la région à chaque changement (utile pour un message reformulé).
- `aria-relevant="additions"` : n'annoncer que les ajouts (par défaut `additions text`).

**Piège fondamental** : la live region doit être **présente dans le DOM au montage** et rester vide, puis se remplir. Si tu montes `<div aria-live>Texte</div>` d'un coup, beaucoup de lecteurs n'annoncent rien. La classe `.sr-only` la garde visuellement cachée mais lisible.

### 2.4 Modale accessible : le pattern `dialog` complet

Une modale accessible coche **six** cases :

1. `role="dialog"` + `aria-modal="true"`.
2. Un nom accessible via `aria-labelledby` pointant vers le titre.
3. Le focus **entre** dans la modale à l'ouverture.
4. Le focus est **piégé** dedans (Tab/Shift+Tab bouclent).
5. `Escape` ferme.
6. Le focus **revient** sur l'élément déclencheur à la fermeture.

On isole 3, 4 et 6 dans un hook `useFocusTrap` réutilisable.

```tsx
import { useEffect, useRef, useCallback } from "react";

// Sélecteur des éléments naturellement focusables
const FOCUSABLE = [
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
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // (6) Mémoriser QUI avait le focus avant l'ouverture (le bouton déclencheur)
    previouslyFocused.current = document.activeElement as HTMLElement;

    // (3) Déplacer le focus dans la modale
    getFocusable()[0]?.focus();

    // (4) Piéger Tab / Shift+Tab
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const f = getFocusable();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus(); // Shift+Tab sur le premier → dernier
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus(); // Tab sur le dernier → premier
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // (6) Restaurer le focus au démontage / à la fermeture
      previouslyFocused.current?.focus();
    };
  }, [isActive, getFocusable]);

  return containerRef;
}
```

Le composant `Modal` branche le hook, gère `Escape` et rend via **portail** (le DOM de la modale vit sous `<body>`, hors du flux de la page — évite les soucis de `z-index`/`overflow`).

```tsx
import { createPortal } from "react-dom";
import { useId } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const containerRef = useFocusTrap(isOpen);
  const titleId = useId(); // id stable et unique pour aria-labelledby

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      // Fermer seulement au clic sur l'overlay, pas sur le contenu
      onClick={(e) => e.target === e.currentTarget && onClose()}
      // (5) Escape ferme
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        ref={containerRef}
        role="dialog"          // (1)
        aria-modal="true"      // (1)
        aria-labelledby={titleId} // (2)
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

### 2.5 Tabs accessibles au clavier

Le pattern Tabs (WAI-ARIA APG) : un `tablist` contient des `tab`, chacun contrôle un `tabpanel`. Règle clavier clé — **un seul onglet est dans l'ordre de tabulation** (`tabIndex={0}`), les flèches naviguent entre onglets.

| Élément | Rôle / attribut | But |
|---|---|---|
| conteneur | `role="tablist"` + `aria-label` | Groupe nommé |
| onglet | `role="tab"` | Onglet cliquable |
| onglet actif | `aria-selected="true"`, `tabIndex={0}` | Sélectionné, tabbable |
| onglet inactif | `aria-selected="false"`, `tabIndex={-1}` | Retiré du flux Tab |
| onglet | `aria-controls={panelId}` | Lie au panneau |
| panneau | `role="tabpanel"` + `aria-labelledby={tabId}` | Contenu nommé par l'onglet |

```tsx
import { useState, useRef } from "react";

interface TabItem { id: string; label: string; content: React.ReactNode; }

function Tabs({ tabs, label }: { tabs: TabItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;

    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus(); // focus programmatique sur le nouvel onglet
  }

  return (
    <div>
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { refs.current[i] = el; }}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={i === active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={i !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### 2.6 `aria-expanded` / `aria-controls` : révéler du contenu

Tout déclencheur qui **ouvre/ferme** une zone (menu, accordéon, disclosure) doit exposer son état :
- `aria-expanded={open}` : l'état ouvert/fermé, piloté par `useState`.
- `aria-controls={panelId}` : l'`id` de la zone contrôlée.

```tsx
function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <>
      <button aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)}>
        {title}
      </button>
      <div id={panelId} hidden={!open}>{children}</div>
    </>
  );
}
```

### 2.7 Combobox : le widget qui exige le plus d'ARIA

Un champ de saisie avec suggestions. Les attributs clés : `role="combobox"`, `aria-expanded`, `aria-controls` (vers la liste), `aria-activedescendant` (l'option "virtuellement" surlignée, sans lui donner le focus DOM), et `role="listbox"`/`role="option"` sur la liste. Version complète en Worked example 2.

### 2.8 Gestion programmatique du focus avec `useRef`

En React, on ne manipule pas le DOM directement — sauf pour **le focus**, cas légitime d'`useRef` + `.focus()`. Trois moments typiques : ouvrir une modale, valider un formulaire (focus sur le 1er champ en erreur), naviguer au clavier dans un widget.

```tsx
const inputRef = useRef<HTMLInputElement>(null);

// Après une action, on redonne le focus à l'utilisateur clavier
function focusInput() {
  inputRef.current?.focus();
}

<input ref={inputRef} />
```

Ne jamais faire `.focus()` pendant le rendu : ça déclenche un side-effect. Le faire dans un `useEffect`, un handler d'événement, ou un callback (comme dans `useFocusTrap`).

---

## 3. Worked examples

### Exemple 1 — Modale d'invitation TribuZen, de bout en bout

On reprend le cas concret et on le corrige complètement : modale accessible + live region qui annonce l'envoi.

```tsx
// ─── src/features/invite/InviteModal.tsx ────────────────────────
import { createPortal } from "react-dom";
import { useId, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited: (email: string) => void; // remonte l'email envoyé au parent
}

function InviteModal({ isOpen, onClose, onInvited }: InviteModalProps) {
  const containerRef = useFocusTrap(isOpen);
  const titleId = useId();
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onInvited(email); // le parent affichera la confirmation en live region
    setEmail("");
    onClose();        // fermeture → useFocusTrap restaure le focus déclencheur
  }

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>Inviter un membre</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="invite-email">Adresse email</label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Envoyer l'invitation</button>
          <button type="button" onClick={onClose}>Annuler</button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default InviteModal;

// ─── src/features/invite/MembersToolbar.tsx (parent) ────────────
import { useState } from "react";
import InviteModal from "./InviteModal";

function MembersToolbar() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  function handleInvited(email: string) {
    // On remplit la live region APRÈS coup → le lecteur d'écran annonce
    setConfirmation(`Invitation envoyée à ${email}.`);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>Inviter un membre</button>

      <InviteModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onInvited={handleInvited}
      />

      {/* Live region PERMANENTE dans le DOM, vide au départ */}
      <div aria-live="polite" className="sr-only">
        {confirmation}
      </div>
    </>
  );
}

export default MembersToolbar;
```

**Ce que ce corrigé garantit, point par point :**
1. `role="dialog"` + `aria-modal="true"` → le lecteur annonce "boîte de dialogue".
2. `aria-labelledby={titleId}` → la modale est nommée par son titre (`useId` évite les collisions d'`id`).
3. `useFocusTrap` déplace le focus sur le champ email à l'ouverture.
4. Tab boucle dans le formulaire, jamais dans la page derrière.
5. `Escape` (ou clic overlay) ferme.
6. À la fermeture, le focus revient sur "Inviter un membre".
7. La live region **préexistante** annonce "Invitation envoyée à …" sans voler le focus.

### Exemple 2 — Combobox de recherche de famille (TribuZen)

Autocomplete pour retrouver une famille par son nom. Montre `aria-activedescendant` : la sélection visuelle se déplace dans la liste **sans** déplacer le focus DOM (il reste dans l'input).

```tsx
import { useState, useRef, useId } from "react";

interface ComboboxProps {
  label: string;
  options: string[];
  onSelect: (value: string) => void;
}

function FamilyCombobox({ label, options, onSelect }: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  function select(value: string) {
    setQuery(value);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(value);
    inputRef.current?.focus(); // focus programmatique de retour dans l'input
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActiveIndex((p) => Math.min(p + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((p) => Math.max(p - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex]);
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  // Option "active" = surlignée visuellement, PAS focusée dans le DOM
  const activeDescendant =
    activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined;

  return (
    <div>
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onKeyDown={onKeyDown}
      />

      {open && filtered.length > 0 && (
        <ul id={`${id}-listbox`} role="listbox" aria-label={label}>
          {filtered.map((option, i) => (
            <li
              key={option}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => select(option)} // mouseDown avant le blur de l'input
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      {/* Compte des résultats annoncé poliment */}
      <div aria-live="polite" className="sr-only">
        {open && filtered.length > 0
          ? `${filtered.length} famille${filtered.length > 1 ? "s" : ""} trouvée${filtered.length > 1 ? "s" : ""}.`
          : ""}
      </div>
    </div>
  );
}

export default FamilyCombobox;
```

**Points de vigilance :**
- `aria-activedescendant` pointe vers l'`id` de l'option surlignée : le lecteur annonce l'option **sans** que le focus quitte l'input (impossible avec un simple `.focus()`).
- `onMouseDown` plutôt que `onClick` : le clic déclenche un `blur` de l'input qui fermerait la liste avant que `onClick` ne parte.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Recréer un widget natif avec ARIA

```tsx
// ❌ "div-bouton" : aucun focus, aucune touche clavier, rôle bricolé
<div role="button" tabIndex={0} onClick={submit}>Envoyer</div>

// ✅ Le natif apporte focus, Entrée/Espace, rôle et état — gratuitement
<button onClick={submit}>Envoyer</button>
```

**Règle :** ajouter `role` sur un `<div>` est un signal qu'un élément natif existait probablement. Première règle d'ARIA : préférer le HTML natif.

### PIÈGE #2 — Live region montée avec son contenu

```tsx
// ❌ Région + texte apparaissent en même temps → souvent PAS annoncé
{sent && <div aria-live="polite">Invitation envoyée</div>}

// ✅ Région présente en permanence, on la remplit après coup
<div aria-live="polite" className="sr-only">{message}</div>
```

Le lecteur d'écran observe les **mutations** d'une région déjà présente. S'il découvre la région et son texte au même instant, il n'a rien à comparer.

### PIÈGE #3 — Modale sans restauration du focus

```tsx
// ❌ On ouvre, on piège, mais à la fermeture le focus tombe sur <body>
// L'utilisateur clavier repart en haut de la page, désorienté.

// ✅ Mémoriser document.activeElement à l'ouverture,
//    puis previouslyFocused.current?.focus() au cleanup (cf. useFocusTrap).
```

La restauration du focus (case 6) est la plus souvent oubliée. Sans elle, la modale reste "à moitié accessible".

### PIÈGE #4 — Tous les onglets tabbables

```tsx
// ❌ Chaque onglet dans le flux Tab → l'utilisateur tabule 8 fois pour traverser 8 onglets
{tabs.map((t, i) => <button role="tab" tabIndex={0}>{t.label}</button>)}

// ✅ Un seul tabIndex={0} (l'actif), les autres tabIndex={-1} ;
//    les flèches naviguent entre onglets (roving tabindex).
tabIndex={i === active ? 0 : -1}
```

Le pattern APG veut que le `tablist` compte pour **un** arrêt de tabulation, pas un par onglet.

### PIÈGE #5 — `aria-label` qui écrase le texte visible

```tsx
// ❌ Le lecteur lit "Fermer", l'écran affiche "×" — mais pire :
//    ici aria-label masque un texte utile
<button aria-label="Options">Paramètres du compte</button>
// Résultat : le lecteur annonce "Options", l'utilisateur voyant lit "Paramètres" → incohérence

// ✅ Si un texte visible existe, il SUFFIT comme nom accessible
<button>Paramètres du compte</button>
// aria-label ne sert que si l'élément n'a pas de texte (icône seule)
<button aria-label="Fermer"><IconX /></button>
```

`aria-label` **remplace** le contenu pour le lecteur. Ne l'utilise que sur les éléments sans texte visible (boutons-icônes).

### PIÈGE #6 — `.focus()` pendant le rendu

```tsx
// ❌ Side-effect dans le corps du composant → warning, comportement imprévisible
function Field() {
  const ref = useRef<HTMLInputElement>(null);
  ref.current?.focus(); // ne JAMAIS faire ça ici
  return <input ref={ref} />;
}

// ✅ Dans un effet ou un handler
useEffect(() => { ref.current?.focus(); }, []);
```

---

## 5. Ancrage TribuZen

L'admin web TribuZen s'appuie sur ces patterns dans trois zones concrètes.

**Modale d'invitation** (`src/features/invite/InviteModal.tsx`) — l'admin d'une tribu invite des membres par email. C'est le cas concret du module : `role="dialog"`, `aria-modal`, focus trap via `useFocusTrap` (`src/hooks/useFocusTrap.ts`), fermeture Escape, restauration du focus sur le bouton "Inviter". La même modale sert de base à "Créer une famille" et "Modifier un membre".

**Live region de confirmation** (`src/features/invite/MembersToolbar.tsx`) — après l'envoi, `aria-live="polite"` annonce "Invitation envoyée à …". La même région centralise les confirmations d'actions admin (membre archivé, rôle modifié). Elle est montée une fois, vide, dans le layout admin.

**Tabs Familles / Membres** (`src/features/admin/AdminTabs.tsx`) — la vue principale de l'admin bascule entre l'onglet "Familles" et l'onglet "Membres" via le pattern Tabs : flèches gauche/droite pour naviguer, `aria-selected` sur l'onglet courant, `roving tabindex`. Chaque `tabpanel` contient la liste correspondante.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  hooks/
    useFocusTrap.ts
  features/
    invite/
      InviteModal.tsx
      MembersToolbar.tsx
    admin/
      AdminTabs.tsx
    search/
      FamilyCombobox.tsx
```

---

## 6. Points clés

1. Première règle d'ARIA : **ne pas utiliser ARIA si le HTML natif suffit** — `<button>` bat toujours `<div role="button">`.
2. ARIA se décompose en **roles** (ce qu'est l'élément), **states** (dynamiques, pilotés par `useState`) et **properties** (relations stables).
3. Une **live region** (`aria-live="polite"`/`"assertive"`) doit être présente dans le DOM au montage puis remplie après coup, sinon elle n'est pas annoncée.
4. Une modale accessible coche 6 cases : `role="dialog"`, `aria-modal`, nom via `aria-labelledby`, focus entrant, focus piégé, `Escape`, **restauration du focus**.
5. Le pattern Tabs utilise un **roving tabindex** : un seul onglet `tabIndex={0}`, les flèches naviguent, `aria-selected` marque l'actif.
6. `aria-expanded` + `aria-controls` exposent l'état ouvert/fermé de tout déclencheur (menu, accordéon, disclosure).
7. Le focus programmatique se fait avec `useRef` + `.focus()` dans un effet ou un handler — **jamais** pendant le rendu.

---

## 7. Seeds Anki

```
Quelle est la première règle d'ARIA ?|Ne pas utiliser ARIA si le HTML natif suffit. Un <button> natif apporte gratuitement rôle, clavier, focus et état — préférable à un <div role="button">. ARIA ne comble que les widgets absents du HTML.
Quelle est la différence entre un role, un state et une property ARIA ?|Le role dit ce qu'est l'élément (dialog, tab) — statique. Le state est dynamique et change au fil des interactions (aria-expanded, aria-selected), souvent piloté par useState. La property décrit des relations stables (aria-labelledby, aria-controls).
Pourquoi une live region doit-elle être présente dans le DOM avant d'être remplie ?|Le lecteur d'écran annonce les mutations d'une région déjà observée. Si la région et son texte apparaissent au même instant, il n'y a pas de mutation à détecter et rien n'est annoncé. On monte la région vide puis on injecte le texte.
Différence entre aria-live="polite" et aria-live="assertive" ?|polite attend que l'utilisateur soit inactif avant d'annoncer (confirmations, statuts). assertive interrompt immédiatement la lecture en cours — réservé aux erreurs bloquantes.
Quelles sont les 6 exigences d'une modale accessible ?|role="dialog" + aria-modal="true", un nom via aria-labelledby, le focus entre à l'ouverture, le focus est piégé (Tab boucle), Escape ferme, et le focus est restauré sur le déclencheur à la fermeture.
Qu'est-ce que le roving tabindex dans le pattern Tabs ?|Un seul onglet est dans l'ordre de tabulation (tabIndex=0, l'onglet actif) ; les autres ont tabIndex=-1. Les flèches gauche/droite naviguent entre onglets et déplacent le focus programmatiquement. Le tablist compte pour un seul arrêt de Tab.
À quoi servent aria-expanded et aria-controls sur un bouton ?|aria-expanded expose l'état ouvert/fermé de la zone contrôlée (booléen piloté par useState). aria-controls contient l'id de la zone que le bouton ouvre/ferme (menu, panneau, accordéon).
Où doit-on appeler .focus() en React, et où NE JAMAIS l'appeler ?|Dans un useEffect ou un handler d'événement (ouverture de modale, focus du 1er champ en erreur, navigation clavier). Jamais pendant le rendu (corps du composant) : c'est un side-effect qui provoque un comportement imprévisible.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-36-aria-patterns-avances/README.md`. Construire la modale d'invitation accessible de TribuZen (focus trap + Escape + restauration) et la live region qui annonce l'envoi, en React 19 + TypeScript.
