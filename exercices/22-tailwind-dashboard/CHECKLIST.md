# Checklist — Exercice 22 : Tailwind dashboard

## Validation

- [ ] Les types `StatCard`, `TaskRow` et `Theme` sont définis dans `src/types/dashboard.ts`
- [ ] La sidebar est fixe sur desktop (`lg:`) et hamburger sur mobile
- [ ] Le menu mobile se ferme en cliquant sur l'overlay ou en cliquant un lien
- [ ] Les liens de navigation ont une indication visuelle de la page active
- [ ] Les cartes de stats utilisent une grille responsive (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`)
- [ ] Chaque carte affiche une variation avec couleur verte (positive) ou rouge (negative)
- [ ] Le tableau affiche au moins 8 taches avec badges de priorite colores
- [ ] Le tableau à un hover state sur les lignes et un scroll horizontal sur mobile
- [ ] Le toggle dark mode ajoute/retire la classe `dark` sur `<html>`
- [ ] Le choix dark/light est persiste dans `localStorage`
- [ ] Toutes les sections s'adaptent au mode sombre avec les classes `dark:`
- [ ] Le header est sticky avec `backdrop-blur`
- [ ] Les breakpoints Tailwind sont utilises correctement (mobile-first)
- [ ] Aucun `any` dans le code — types stricts
