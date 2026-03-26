# Exercice 24 — Accessibilité React

**Module** : 09a-Accessibilité · **Difficulté** : ★★★
**Durée estimée** : 90 minutes
**Cours** : `cours/09-accessibilite/01-fondamentaux-wcag-react.md`, `cours/09-accessibilite/02-aria-patterns-avances.md`

---

## Objectif

Auditer et corriger les violations d'accessibilité WCAG 2.1 AA dans un composant React existant. L'exercice couvre la navigation clavier, les rôles ARIA, la gestion du focus et le HTML sémantique.

---

## Contexte

Le composant `TaskModal` de l'application `taskflow` présente plusieurs violations d'accessibilité. Tu dois les identifier et les corriger.

---

## Code de départ

Crée le fichier `src/exercises/ex24/TaskModal.tsx` avec ce code volontairement défaillant :

```tsx
// ❌ Version inaccessible — à corriger
export function TaskModal({ task, onClose, onSave }) {
  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal" onClick={e => e.stopPropagation()}>
        <div class="modal-title">{task.title}</div>
        <div onClick={onClose}>×</div>

        <input
          placeholder="Titre de la tâche"
          value={task.title}
          onChange={e => onSave({ ...task, title: e.target.value })}
        />

        <select value={task.priority}>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
        </select>

        <div onClick={onSave}>Sauvegarder</div>
        <div onClick={onClose}>Annuler</div>
      </div>
    </div>
  );
}
```

---

## Consignes

### Partie 1 — Audit WCAG

1. Identifier les violations dans le code de départ en les listant sous forme de commentaires. Pour chaque violation, indiquer le critère WCAG concerné (ex: `1.3.1 Information et relations`, `2.1.1 Clavier`).

### Partie 2 — Navigation clavier

2. La modale doit se fermer avec la touche `Escape`. Implémenter un `useEffect` qui écoute `keydown`.

3. Le focus doit être piégé à l'intérieur de la modale (focus trap) : Tab et Shift+Tab ne doivent pas sortir de la modale.

4. À l'ouverture, le focus doit se placer sur le premier élément focusable de la modale. À la fermeture, il doit revenir à l'élément déclencheur.

### Partie 3 — Rôles ARIA et structure

5. Convertir `<div class="modal">` en une vraie boîte de dialogue avec `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant vers le titre.

6. Donner un `id` au titre et utiliser `<h2>` pour la hiérarchie sémantique.

7. Convertir le bouton de fermeture `×` en `<button>` avec `aria-label="Fermer la modale"`.

8. Convertir les boutons Sauvegarder et Annuler de `<div>` en `<button>` avec `type` explicite.

### Partie 4 — Formulaire accessible

9. Ajouter des `<label>` explicitement associés aux inputs (`htmlFor` / `id`).

10. Ajouter `<select>` avec son label `Priorité`.

11. Indiquer les champs requis avec `required` et `aria-required="true"`.

---

## Contraintes

- Aucun `any` TypeScript.
- Pas de librairie focus-trap externe — implémenter la logique manuellement.
- Le composant doit passer `axe-core` sans violation au niveau AA.

---

## Bonus

- Ajouter un `aria-live="polite"` pour annoncer les messages de succès/erreur après la sauvegarde.
- Tester avec un lecteur d'écran (NVDA sur Windows, VoiceOver sur macOS).
- Écrire un test RTL qui vérifie que le focus revient au déclencheur après fermeture.
