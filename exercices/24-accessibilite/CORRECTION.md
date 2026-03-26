# Correction — Exercice 24 : Accessibilité React

---

## Partie 1 — Audit des violations

```tsx
// Violations identifiées dans le code de départ :
// 1. `class` au lieu de `className` (erreur React, mais aussi WCAG 4.1.1 Parsing)
// 2. Titre en <div> → pas de hiérarchie sémantique (WCAG 1.3.2)
// 3. Bouton × en <div> → non focusable au clavier (WCAG 2.1.1 Clavier)
// 4. Boutons Save/Cancel en <div> → idem (WCAG 2.1.1)
// 5. Pas de role="dialog" ni aria-modal → lecteur d'écran ne sait pas que c'est une modale (WCAG 4.1.2)
// 6. Pas d'aria-labelledby → titre de la modale non annoncé (WCAG 4.1.2)
// 7. Input sans <label> → formulaire inaccessible (WCAG 1.3.1, 2.4.6)
// 8. Select sans <label> (WCAG 1.3.1)
// 9. Pas de gestion du focus (WCAG 2.4.3 Ordre du focus)
// 10. Pas de fermeture par Escape (WCAG 2.1.2 Pas de piège clavier)
```

---

## Solution complète

```tsx
import { useEffect, useRef } from 'react';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskModalProps {
  task: Task;
  triggerRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export function TaskModal({ task, triggerRef, onClose, onSave }: TaskModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${task.id}`;

  // Fermeture par Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus initial sur le premier élément focusable
  useEffect(() => {
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    // Retour du focus au déclencheur à la fermeture
    return () => {
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  // Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    // Overlay — clique en dehors pour fermer
    <div
      className="modal-overlay"
      onClick={onClose}
      aria-hidden="true"
    >
      {/* ✅ role="dialog" + aria-modal + aria-labelledby */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ✅ <h2> avec id pour aria-labelledby */}
        <h2 id={titleId}>{task.title}</h2>

        {/* ✅ <button> avec aria-label explicite */}
        <button
          type="button"
          aria-label="Fermer la modale"
          onClick={onClose}
          className="modal-close"
        >
          ×
        </button>

        {/* ✅ Input avec <label> associé */}
        <div>
          <label htmlFor="task-title">Titre de la tâche</label>
          <input
            id="task-title"
            type="text"
            value={task.title}
            required
            aria-required="true"
            onChange={e => onSave({ ...task, title: e.target.value })}
          />
        </div>

        {/* ✅ Select avec <label> associé */}
        <div>
          <label htmlFor="task-priority">Priorité</label>
          <select
            id="task-priority"
            value={task.priority}
            onChange={e => onSave({ ...task, priority: e.target.value as Task['priority'] })}
          >
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </div>

        {/* ✅ <button> avec type explicite */}
        <button type="submit" onClick={() => onSave(task)}>
          Sauvegarder
        </button>
        <button type="button" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
```

---

## Récapitulatif des corrections

| Violation | Correction appliquée |
|---|---|
| `<div>` cliquable non actionnable | `<button type="button">` |
| Pas de `role="dialog"` | `role="dialog" aria-modal="true"` |
| Titre non annoncé | `aria-labelledby` + `<h2 id={titleId}>` |
| Input sans label | `<label htmlFor>` + `id` |
| Select sans label | `<label htmlFor>` + `id` |
| Pas d'Escape | `useEffect` sur `keydown` |
| Pas de focus trap | `handleKeyDown` + `querySelectorAll` focusable |
| Pas de retour focus | `return () => triggerRef.current?.focus()` |
