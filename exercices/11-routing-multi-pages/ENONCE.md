# Exercice 11 — Routing multi-pages

**Module** : 04-Routing · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/04-routing/04-routing.md`

---

## Objectif

Construire une application multi-pages avec React Router v7. Tu apprendras a configurer des routes, a naviguer entre les pages, a utiliser les parametres dynamiques, a proteger des routes et a charger les composants en lazy loading.

---

## Consignes

1. **Installer React Router** :
   ```bash
   npm install react-router
   ```

2. **Creer la structure des pages** dans `src/exercises/ex11/pages/` :

   - **`HomePage.tsx`** : page d'accueil avec un titre et des liens vers les autres pages.
   - **`TasksPage.tsx`** : liste de taches (donnees statiques) avec des liens vers le detail de chaque tache.
   - **`TaskDetailPage.tsx`** : detail d'une tache, recuperer l'`id` depuis les parametres d'URL avec `useParams`. Afficher "Tache introuvable" si l'id n'existe pas.
   - **`AboutPage.tsx`** : page "A propos" avec du contenu statique.
   - **`NotFoundPage.tsx`** : page 404 affichee pour les routes inconnues.

3. **Creer le composant** `src/exercises/ex11/components/Layout.tsx` :
   - Navigation avec des `<NavLink>` (Home, Taches, A propos).
   - `<Outlet />` pour afficher la page courante.
   - `NavLink` avec style actif (classe `active`).

4. **Creer le composant** `src/exercises/ex11/components/ProtectedRoute.tsx` :
   - Accepter une prop `isAuthenticated: boolean`.
   - Si authentifie, rendre `children` (ou `<Outlet />`).
   - Sinon, rediriger vers la page d'accueil avec `<Navigate to="/" />`.

5. **Creer le fichier** `src/exercises/ex11/router.tsx` :
   - Configurer les routes avec `createBrowserRouter`.
   - Route layout avec `Layout`.
   - Routes enfants : `/`, `/tasks`, `/tasks/:id`, `/about`, `*` (404).
   - Lazy loading sur `AboutPage` avec `React.lazy` et `<Suspense>`.

6. **Creer le fichier** `src/exercises/ex11/App.tsx` :
   - Utiliser `<RouterProvider>` avec le router configure.

---

## Contraintes TypeScript

- Mode `strict` active.
- Les parametres d'URL doivent etre types (`useParams<{ id: string }>()`).
- Les props de `ProtectedRoute` doivent etre typees.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un systeme d'authentification simule (bouton login/logout dans le Layout).
- [ ] Utiliser les loaders de React Router v7 pour pre-charger les donnees.
- [ ] Ajouter des transitions de page avec `useNavigation`.
- [ ] Implementer un breadcrumb dynamique avec `useMatches`.

---

## Fichiers

```
src/exercises/ex11/
  ├── pages/
  │   ├── HomePage.tsx
  │   ├── TasksPage.tsx
  │   ├── TaskDetailPage.tsx
  │   ├── AboutPage.tsx
  │   └── NotFoundPage.tsx
  ├── components/
  │   ├── Layout.tsx
  │   └── ProtectedRoute.tsx
  ├── router.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                            | Attendu |
| -------------------------------------------------- | ------- |
| La navigation entre pages fonctionne               | oui     |
| `useParams` recupere l'id de la tache              | oui     |
| La route 404 s'affiche pour les URLs inconnues     | oui     |
| `ProtectedRoute` redirige si non authentifie       | oui     |
| Le lazy loading fonctionne avec `Suspense`         | oui     |
| `NavLink` a un style actif                         | oui     |
| Aucun `any` dans le code                           | oui     |

---

## Ressources

- [React Router v7 — Getting Started](https://reactrouter.com/start/framework/installation)
- [React Router — useParams](https://reactrouter.com/hooks/use-params)
- [React — lazy & Suspense](https://react.dev/reference/react/lazy)
