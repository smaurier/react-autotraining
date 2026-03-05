# Exercice 22 — Tailwind dashboard

**Module** : 09-Styling · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/09-styling/01-css-modules-tailwind.md`

---

## Objectif

Construire une page de dashboard complete avec Tailwind CSS : sidebar responsive (hamburger sur mobile), cartes de statistiques, tableau de taches, et toggle dark mode. Tu vas maitriser les classes utilitaires de Tailwind, le responsive design avec les breakpoints, et le mode sombre.

---

## Consignes

1. **Layout responsive** `src/app/dashboard/layout.tsx` :
   - Sidebar fixe a gauche sur desktop (`lg:` et plus).
   - Hamburger menu sur mobile/tablette.
   - Header avec titre de la page, barre de recherche, toggle dark mode.
   - Zone de contenu principale avec padding responsive.

2. **Sidebar** `src/components/dashboard/Sidebar.tsx` :
   - Logo ou titre de l'application.
   - Liens de navigation : Dashboard, Taches, Projets, Equipe, Parametres.
   - Indication visuelle de la page active.
   - Sur mobile : overlay qui se ferme au clic en dehors.
   - Client Component (interactivite : ouverture/fermeture).

3. **Cartes de statistiques** `src/components/dashboard/StatsCards.tsx` :
   - 4 cartes en grille responsive (1 colonne mobile, 2 tablette, 4 desktop).
   - Chaque carte : icone, valeur numerique, label, variation (+/- avec couleur).
   - Ex: "Taches completees : 42 (+12%)", "En cours : 15 (-3%)", etc.

4. **Tableau de taches** `src/components/dashboard/TaskTable.tsx` :
   - Tableau HTML responsive avec Tailwind.
   - Colonnes : Titre, Priorite (badge colore), Statut, Assignee, Date.
   - Au moins 8 lignes de donnees.
   - Hover state sur les lignes.

5. **Dark mode** :
   - Toggle dans le header (Client Component).
   - Utiliser la strategie `class` de Tailwind (`dark:` prefix).
   - Persister le choix dans `localStorage`.
   - Toutes les sections s'adaptent au mode sombre.

---

## Contraintes TypeScript

- Mode `strict` active.
- Interfaces pour les donnees des stats et des taches.
- Typer les props de chaque composant.
- Le toggle dark mode doit etre type (`"light" | "dark"`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un graphique simple (barres ou camembert) en CSS/SVG pur.
- [ ] Ajouter des animations Tailwind sur les cartes (hover:scale, transition).
- [ ] Supporter la preference systeme avec `prefers-color-scheme`.
- [ ] Ajouter une version print-friendly (`print:` variant).

---

## Fichiers

```
src/
  types/
    dashboard.ts
  components/
    dashboard/
      Sidebar.tsx
      StatsCards.tsx
      TaskTable.tsx
      DarkModeToggle.tsx
  app/
    dashboard/
      layout.tsx
      page.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| La sidebar est fixe sur desktop, hamburger sur mobile | oui |
| Les cartes de stats s'adaptent en grille responsive | oui  |
| Le tableau affiche les taches avec des badges colores | oui |
| Le dark mode fonctionne sur toute la page        | oui     |
| Le choix dark/light est persiste dans localStorage | oui   |
| Les breakpoints Tailwind sont utilises (`sm:`, `md:`, `lg:`) | oui |
| Le code compile sans erreur TypeScript           | oui     |

---

## Ressources

- [Tailwind CSS — Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS — Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS — Responsive Design](https://tailwindcss.com/docs/responsive-design)
