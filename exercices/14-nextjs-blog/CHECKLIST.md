# Checklist — Exercice 14 : Blog Next.js

## Validation

- [ ] L'interface `Post` est definie et exportee depuis `src/types/post.ts`
- [ ] Le fichier `posts.json` contient au moins 5 articles avec tous les champs requis
- [ ] Le `layout.tsx` racine contient `<html lang="fr">`, `<body>`, header avec `<Link>` et footer
- [ ] La metadata est definie avec `title` et `description`
- [ ] La page d'accueil `/` affiche un titre et un lien vers le blog
- [ ] La page `/blog` liste tous les articles tries par date decroissante
- [ ] Chaque article de la liste affiche : titre (lien), extrait, date formatee, tags
- [ ] La page `/blog/[slug]` affiche le detail de l'article correspondant
- [ ] `params` est type comme `Promise<{ slug: string }>` et `await` correctement (Next.js 15)
- [ ] `notFound()` est appele quand le slug n'existe pas
- [ ] `generateMetadata` genere des metadata dynamiques par article
- [ ] `loading.tsx` affiche un skeleton de chargement
- [ ] `not-found.tsx` affiche une page 404 personnalisee avec lien retour
- [ ] Aucun `any` dans le code — `strict: true` respecte
- [ ] Le projet compile sans erreur TypeScript (`npx tsc --noEmit`)
