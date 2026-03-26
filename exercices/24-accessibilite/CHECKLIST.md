# Checklist — Exercice 24 : Accessibilité React

Coche chaque élément une fois validé :

- [ ] Les violations WCAG du code de départ sont listées avec les critères concernés
- [ ] La modale se ferme avec la touche `Escape`
- [ ] Le focus est piégé à l'intérieur de la modale (Tab + Shift+Tab)
- [ ] À l'ouverture, le focus se place sur le premier élément focusable
- [ ] À la fermeture, le focus revient à l'élément déclencheur
- [ ] `role="dialog"` et `aria-modal="true"` sont présents sur le conteneur
- [ ] `aria-labelledby` pointe vers l'id du titre `<h2>`
- [ ] Le titre utilise `<h2>` (ou `<h1>` selon la hiérarchie) avec un `id`
- [ ] Le bouton de fermeture est un `<button>` avec `aria-label="Fermer la modale"`
- [ ] Tous les boutons d'action sont des `<button>` avec `type` explicite
- [ ] Le champ titre a un `<label>` associé via `htmlFor` et `id`
- [ ] Le select priorité a un `<label>` associé via `htmlFor` et `id`
- [ ] Les champs requis ont `required` et `aria-required="true"`
- [ ] Aucun `any` TypeScript présent
- [ ] Le composant passe `axe-core` sans violation WCAG AA
