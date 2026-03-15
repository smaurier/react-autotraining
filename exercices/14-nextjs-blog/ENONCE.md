# Exercice 14 — Blog Next.js

**Module** : 06-Next.js App Router · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/06-nextjs/01-app-router-architecture.md`

---

## Objectif

Construire un blog complet avec Next.js 15 App Router en exploitant les conventions de fichiers : `layout.tsx`, `page.tsx`, `loading.tsx`, `not-found.tsx` et les routes dynamiques `[slug]/page.tsx`. Les donnees proviennent d'un fichier JSON statique.

Tu vas découvrir comment le système de fichiers de Next.js remplace la configuration manuelle du routing, et comment chaque fichier special (`loading`, `not-found`, `error`) joue un role précis dans l'experience utilisateur.

---

## Consignes

1. **Créer le fichier de donnees** `src/data/posts.json` contenant au moins 5 articles de blog avec les champs : `slug`, `title`, `excerpt`, `content`, `author`, `date`, `tags`.

2. **Créer le layout racine** `src/app/layout.tsx` :
   - Balises `<html lang="fr">` et `<body>`.
   - Un `<header>` avec navigation (`<Link>` vers `/` et `/blog`).
   - Un `<footer>` avec copyright.
   - Metadata Next.js (`title`, `description`).

3. **Créer la page d'accueil** `src/app/page.tsx` :
   - Titre de bienvenue.
   - Lien vers la liste du blog.

4. **Créer la page liste du blog** `src/app/blog/page.tsx` :
   - Importer et afficher tous les articles depuis le JSON.
   - Chaque article affiche : titre (lien cliquable), extrait, date, tags.

5. **Créer la page detail** `src/app/blog/[slug]/page.tsx` :
   - Recevoir `params` (Promise dans Next.js 15) et extraire le `slug`.
   - Chercher l'article correspondant dans le JSON.
   - Si l'article n'existe pas, appeler `notFound()`.
   - Afficher : titre, auteur, date, contenu complet, tags.
   - Générer les metadata dynamiques avec `generateMetadata`.

6. **Créer `src/app/blog/loading.tsx`** : skeleton de chargement.

7. **Créer `src/app/not-found.tsx`** : page 404 personnalisee avec lien retour.

---

## Contraintes TypeScript

- Mode `strict` active dans `tsconfig.json`.
- Définir une interface `Post` avec tous les champs types.
- Typer `params` comme `Promise<{ slug: string }>` (Next.js 15).
- Typer les props de `generateMetadata`.
- Aucun `any` autorise.
- Exporter les types depuis un fichier `src/types/post.ts`.

---

## Bonus

- [ ] Ajouter `generateStaticParams` pour pre-rendre tous les slugs au build.
- [ ] Créer un layout imbrique `src/app/blog/layout.tsx` avec une sidebar listant les tags.
- [ ] Ajouter un composant `<Tag>` réutilisable avec un lien vers `/blog?tag=xxx`.
- [ ] Implementer une page `src/app/blog/[slug]/not-found.tsx` spécifique au blog.

---

## Fichiers

```
src/
  types/
    post.ts
  data/
    posts.json
  app/
    layout.tsx
    page.tsx
    not-found.tsx
    blog/
      page.tsx
      loading.tsx
      [slug]/
        page.tsx
```

---

## Criteres de reussite

| Critere                                      | Attendu |
| -------------------------------------------- | ------- |
| La navigation entre pages fonctionne         | oui     |
| Les articles se chargent depuis le JSON       | oui     |
| La route dynamique `[slug]` affiche le bon article | oui |
| `notFound()` est appele si le slug n'existe pas | oui  |
| `loading.tsx` s'affiche pendant le chargement | oui     |
| Les metadata sont dynamiques par article      | oui     |
| Tous les types sont stricts (pas de `any`)    | oui     |

---

## Ressources

- [Next.js App Router — Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js — Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js — Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
