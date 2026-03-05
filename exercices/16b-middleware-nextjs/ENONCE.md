# Exercice 16b — Middleware Next.js

**Module** : 06-Next.js App Router · **Difficulte** : ⭐⭐
**Duree estimee** : 45 minutes
**Cours** : `cours/06-nextjs/05-middleware-api-routes.md`

---

## Objectif

Exercice de renforcement sur le middleware Next.js. Tu vas creer un fichier `middleware.ts` a la racine du projet qui intercepte les requetes pour : rediriger les utilisateurs non authentifies, ajouter des headers de securite, et effectuer du path matching avance.

Le middleware Next.js s'execute **avant** le rendu de la page, cote Edge Runtime. C'est l'endroit ideal pour la protection de routes, la redirection et l'ajout de headers.

---

## Consignes

1. **Creer le fichier** `src/middleware.ts` :
   - Le middleware s'execute pour toutes les requetes matchant le `config.matcher`.

2. **Redirection authentification** :
   - Verifier la presence d'un cookie `session-token`.
   - Si absent et que la route est protegee (`/dashboard`, `/profile`, `/settings`), rediriger vers `/login`.
   - Si present et que la route est `/login`, rediriger vers `/dashboard`.

3. **Headers de securite** :
   - Ajouter les headers suivants a chaque reponse :
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `X-Request-Id` : un identifiant unique genere (UUID ou timestamp).

4. **Path matching** :
   - Configurer le `matcher` pour exclure les fichiers statiques (`_next/static`, `_next/image`, `favicon.ico`).
   - Exclure les routes API (`/api/*`).

5. **Page de login** `src/app/login/page.tsx` :
   - Formulaire simple avec un bouton qui pose le cookie `session-token`.
   - Client Component avec `'use client'`.

6. **Page dashboard** `src/app/dashboard/page.tsx` :
   - Affiche un message de bienvenue.
   - Bouton de deconnexion qui supprime le cookie.

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer la fonction middleware avec `NextRequest` et `NextResponse`.
- Definir un type pour les routes protegees (`readonly string[]`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un rate limiting basique (compteur en memoire par IP).
- [ ] Logger les requetes avec timestamp, methode, path et duree.
- [ ] Ajouter une redirection i18n basee sur le header `Accept-Language`.
- [ ] Gerer les roles (cookie `user-role`) pour des redirections differenciees.

---

## Fichiers

```
src/
  middleware.ts
  app/
    login/
      page.tsx
    dashboard/
      page.tsx
    profile/
      page.tsx
    settings/
      page.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Le middleware s'execute pour les routes configurees | oui   |
| Les routes protegees redirigent vers `/login` sans cookie | oui |
| `/login` redirige vers `/dashboard` avec cookie  | oui     |
| Les headers de securite sont presents sur chaque reponse | oui |
| Les fichiers statiques et API sont exclus du matcher | oui   |
| Le code compile sans erreur TypeScript            | oui     |

---

## Ressources

- [Next.js — Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js — NextRequest](https://nextjs.org/docs/app/api-reference/functions/next-request)
- [MDN — HTTP Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
