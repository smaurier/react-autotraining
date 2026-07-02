# Lab 36 — Patterns ARIA avancés en React

> **Outcome :** à la fin, tu sais construire une modale d'invitation **accessible** (focus trap + `Escape` + restauration du focus + `role="dialog"`) et une **live region** `aria-live` qui annonce l'envoi, en React 19 + TypeScript.
> **Vrai outil :** React 19 + Vite dev server + un lecteur d'écran réel (NVDA sous Windows, gratuit) pour la validation.
> **Feedback :** le coach valide en session — clavier seul + lecteur d'écran, pas de test-runner auto-correcteur.

> **Rappel — première règle d'ARIA : ne pas utiliser ARIA si le HTML natif suffit.**
> Dans ce lab tu n'ajoutes ARIA que là où le HTML n'offre rien (dialog modale, live region). Le formulaire, lui, reste du HTML natif (`<form>`, `<label>`, `<input>`, `<button>`) — n'y colle aucun `role`.

---

## Énoncé

Tu construis la fonctionnalité **"Inviter un membre"** de l'admin TribuZen. Cahier des charges **exact** :

1. **`useFocusTrap(isActive)`** — hook qui, quand `isActive` passe à `true` :
   - mémorise l'élément actuellement focusé (le bouton déclencheur) ;
   - déplace le focus sur le premier élément focusable de la modale ;
   - piège `Tab` / `Shift+Tab` (boucle premier ↔ dernier) ;
   - au cleanup, **restaure** le focus sur l'élément mémorisé.
2. **`InviteModal`** — modale rendue via `createPortal`, avec `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (titre), fermeture par `Escape` et par clic sur l'overlay. Contient un `<form>` natif (label + input email + boutons Envoyer/Annuler).
3. **`MembersToolbar`** (parent) — bouton "Inviter un membre" qui ouvre la modale, et une **live region** `aria-live="polite"` permanente qui annonce `Invitation envoyée à <email>.` après soumission.

**Contraintes :**
- La live region est **montée en permanence** (vide au départ), jamais conditionnellement — sinon elle n'est pas annoncée.
- Le formulaire n'utilise **aucun** `role` ARIA : HTML natif uniquement.
- Le focus doit revenir sur le bouton "Inviter un membre" à la fermeture (teste-le au clavier).
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

Crée un projet Vite (`pnpm create vite@latest tribuzen-a11y --template react-ts`) puis ces fichiers :

```
src/
  hooks/
    useFocusTrap.ts       ← à écrire
  features/
    invite/
      InviteModal.tsx     ← à écrire
      MembersToolbar.tsx  ← à écrire
  App.tsx                 ← branche <MembersToolbar />
  index.css               ← ajoute la classe .sr-only (fournie ci-dessous)
```

CSS obligatoire pour cacher visuellement la live region sans la retirer aux lecteurs d'écran :

```css
/* index.css */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid; place-items: center;
}
```

Lance `pnpm dev` et valide au clavier au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `useFocusTrap.ts`** — `useRef` pour le conteneur et pour l'élément précédemment focusé. Dans un `useEffect` gardé par `isActive` : sauvegarde `document.activeElement`, focus le premier focusable, ajoute un listener `keydown` qui piège `Tab`. Le cleanup retire le listener et restaure le focus.
2. **Écris `InviteModal.tsx`** — `useFocusTrap(isOpen)` pour le `ref`, `useId()` pour l'`id` du titre. `createPortal` vers `document.body`. Gère `Escape` (onKeyDown de l'overlay) et le clic overlay (`e.target === e.currentTarget`). Formulaire natif contrôlé (`useState` pour l'email).
3. **Écris `MembersToolbar.tsx`** — état `open` + état `confirmation`. Bouton d'ouverture, `<InviteModal>`, et `<div aria-live="polite" className="sr-only">{confirmation}</div>` **permanent**.
4. **Branche dans `App.tsx`** — `<MembersToolbar />`.
5. **Teste au clavier seul** (débranche la souris) : ouvrir avec Entrée, vérifier que le focus entre dans la modale, que `Tab` boucle, que `Escape` ferme, et que le focus **revient** sur "Inviter un membre".
6. **Teste avec NVDA** : à l'envoi, tu dois entendre "Invitation envoyée à …" sans que le focus bouge.

---

## Corrigé complet commenté

```tsx
// ─── src/hooks/useFocusTrap.ts ──────────────────────────────────
import { useEffect, useRef, useCallback } from "react";

// Éléments naturellement focusables à l'intérieur de la modale
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Recalcule la liste à chaque besoin (le contenu peut changer)
  const getFocusable = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // 1. Mémoriser QUI avait le focus avant l'ouverture (le déclencheur)
    previouslyFocused.current = document.activeElement as HTMLElement;

    // 2. Déplacer le focus dans la modale
    getFocusable()[0]?.focus();

    // 3. Piéger Tab / Shift+Tab
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const f = getFocusable();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();  // Shift+Tab sur le premier → va au dernier
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus(); // Tab sur le dernier → revient au premier
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // 4. Restaurer le focus sur le déclencheur à la fermeture
      previouslyFocused.current?.focus();
    };
  }, [isActive, getFocusable]);

  return containerRef;
}

// ─── src/features/invite/InviteModal.tsx ────────────────────────
import { createPortal } from "react-dom";
import { useId, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited: (email: string) => void;
}

function InviteModal({ isOpen, onClose, onInvited }: InviteModalProps) {
  const containerRef = useFocusTrap(isOpen); // gère focus entrant, trap, restauration
  const titleId = useId();                   // id unique et stable pour aria-labelledby
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onInvited(email); // le parent remplira la live region
    setEmail("");
    onClose();        // fermeture → useFocusTrap restaure le focus déclencheur
  }

  return createPortal(
    <div
      className="modal-overlay"
      // Fermer seulement si on clique sur l'overlay, pas sur le contenu
      onClick={(e) => e.target === e.currentTarget && onClose()}
      // Escape ferme
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        ref={containerRef}
        role="dialog"             // widget absent du HTML → ARIA légitime
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ background: "#fff", padding: "1.5rem", borderRadius: 8, minWidth: 320 }}
      >
        <h2 id={titleId}>Inviter un membre</h2>
        {/* Formulaire NATIF — aucun role ARIA ici */}
        <form onSubmit={handleSubmit}>
          <label htmlFor="invite-email">Adresse email</label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem" }}
          />
          <button type="submit">Envoyer l'invitation</button>
          <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>
            Annuler
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default InviteModal;

// ─── src/features/invite/MembersToolbar.tsx ─────────────────────
import { useState } from "react";
import InviteModal from "./InviteModal";

function MembersToolbar() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  function handleInvited(email: string) {
    // On remplit la live region APRÈS coup → le lecteur d'écran annonce la mutation
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

      {/* Live region PERMANENTE, vide au départ, cachée visuellement */}
      <div aria-live="polite" className="sr-only">
        {confirmation}
      </div>
    </>
  );
}

export default MembersToolbar;

// ─── src/App.tsx ─────────────────────────────────────────────────
import MembersToolbar from "./features/invite/MembersToolbar";

function App() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>TribuZen Admin — Membres</h1>
      <MembersToolbar />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- **Focus entrant + restauration** : `useFocusTrap` mémorise `document.activeElement` à l'ouverture et le refocalise au cleanup — le focus revient exactement sur "Inviter un membre".
- **Trap** : le listener global sur `Tab` boucle premier ↔ dernier ; impossible de tabuler dans la page derrière.
- **`Escape` + clic overlay** : deux façons de fermer, sans dépendre de la souris.
- **`role="dialog"` + `aria-modal` + `aria-labelledby`** : le lecteur annonce "boîte de dialogue, Inviter un membre". `useId` garantit un `id` unique même si plusieurs modales coexistent.
- **Live region permanente** : montée vide, remplie après soumission → le lecteur annonce la mutation. Si on l'avait rendue conditionnellement (`{sent && <div aria-live>…}`), rien ne serait annoncé.
- **HTML natif pour le formulaire** : `<form>`/`<label>`/`<input>`/`<button>` — zéro ARIA superflu, conformément à la première règle.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module 36 :**

1. Ajoute des **tabs** "Familles / Membres" au-dessus du bouton d'invitation (pattern `role="tablist"` + `roving tabindex` : flèches gauche/droite, un seul `tabIndex={0}`). Le bouton "Inviter" ne s'affiche que dans l'onglet "Membres".
2. Fais en sorte que la modale, si le champ email est **invalide** à la soumission, affiche un message d'erreur lié par `aria-describedby` + `aria-invalid`, et déplace le focus **programmatiquement** sur l'input en erreur.
3. Remplace la confirmation `polite` par une gestion **`role="status"`** équivalente et vérifie au lecteur d'écran que le comportement est identique.

**Critère de réussite :** navigation 100 % clavier des tabs (flèches), erreur de formulaire annoncée et focus reporté sur le champ fautif, confirmation d'envoi annoncée sans vol de focus.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/src/
  hooks/
    useFocusTrap.ts
  features/
    invite/
      InviteModal.tsx
      MembersToolbar.tsx
    admin/
      AdminTabs.tsx      ← tabs Familles/Membres (variante J+30)
```

**Différences par rapport au lab :**
- Les styles inline seront remplacés par les tokens du design system TribuZen (variables CSS) — la logique ARIA et focus reste identique.
- `InviteModal` deviendra une modale générique `<Modal>` réutilisée pour "Créer une famille" et "Modifier un membre" ; seul le `children` (le formulaire) change.
- L'appel `onInvited` déclenchera un vrai `POST /invitations` (via TanStack Query) ; la live region annoncera le succès **après** la résolution de la requête, et une erreur passera en `role="alert"`.
- La live region sera hissée dans le layout admin (montée une seule fois) et alimentée par un petit store/contexte de notifications.

**Commit cible :**
```
feat(a11y): useFocusTrap — focus trap + restauration réutilisable
feat(invite): InviteModal accessible (dialog, Escape, aria-live confirmation)
```
