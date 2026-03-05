# Checklist — Exercice 11 : Routing multi-pages

Coche chaque element une fois valide :

- [ ] Le router est configure avec `createBrowserRouter`
- [ ] Le composant `Layout` contient une `<nav>` avec des `<NavLink>`
- [ ] `<Outlet />` est utilise dans le Layout pour afficher les pages
- [ ] `NavLink` applique un style actif sur le lien de la page courante
- [ ] La page d'accueil s'affiche sur `/`
- [ ] La liste des taches s'affiche sur `/tasks`
- [ ] Le detail d'une tache s'affiche sur `/tasks/:id` avec `useParams`
- [ ] "Tache introuvable" s'affiche si l'id n'existe pas
- [ ] La page 404 s'affiche pour les routes inconnues (`*`)
- [ ] `ProtectedRoute` redirige si l'utilisateur n'est pas authentifie
- [ ] `AboutPage` est chargee en lazy loading avec `React.lazy` et `Suspense`
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
