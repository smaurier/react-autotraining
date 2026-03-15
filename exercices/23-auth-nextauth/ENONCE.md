# Exercice 23 — Auth NextAuth

**Module** : 10-Auth & Sécurité · **Difficulte** : ⭐⭐⭐⭐
**Duree estimee** : 90 minutes
**Cours** : `cours/10-auth-securite/01-nextauth.md`

---

## Objectif

Implementer un flux d'authentification complet avec Auth.js (NextAuth.js v5) dans une application Next.js 15 : provider credentials, pages de login et register, acces à la session dans les Server Components, protection des routes via middleware, et controle d'acces base sur les roles (RBAC).

C'est l'exercice le plus complet du parcours — il combine Server Components, Client Components, Server Actions, middleware et gestion d'état.

---

## Consignes

1. **Configurer Auth.js** :
   - `src/auth.ts` : configuration centrale avec `NextAuth`.
   - Provider `Credentials` : valide email + mot de passe.
   - Callbacks `jwt` et `session` pour ajouter le role au token.
   - Exporter `handlers`, `signIn`, `signOut`, `auth`.

2. **Créer les types** `src/types/auth.ts` :
   - Etendre les types de `next-auth` pour inclure `role` dans `Session`, `User`, `JWT`.
   - Type `UserRole` : `"admin" | "user" | "editor"`.

3. **Route handler** `src/app/api/auth/[...nextauth]/route.ts` :
   - Exposer les handlers GET et POST d'Auth.js.

4. **Page de login** `src/app/login/page.tsx` :
   - Formulaire email + mot de passe.
   - Utiliser la Server Action `signIn("credentials", ...)`.
   - Afficher les erreurs de validation.
   - Lien vers la page d'inscription.

5. **Page d'inscription** `src/app/register/page.tsx` :
   - Formulaire email, nom, mot de passe, confirmation.
   - Validation avec Zod.
   - Server Action pour créer le compte.

6. **Session dans les Server Components** `src/app/profile/page.tsx` :
   - Utiliser `auth()` pour récupérer la session cote serveur.
   - Afficher les informations de l'utilisateur connecte.
   - Rediriger vers `/login` si pas de session.

7. **Middleware de protection** `src/middleware.ts` :
   - Proteger `/dashboard`, `/profile`, `/admin`.
   - Rediriger `/login` vers `/dashboard` si déjà authentifie.
   - Vérifier le role pour `/admin` (admin uniquement).

8. **SessionProvider** `src/components/providers/SessionProvider.tsx` :
   - Wrapper Client Component pour les composants qui ont besoin de `useSession`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Etendre les types `next-auth` avec module augmentation (`declare module`).
- Typer le `UserRole` comme union litterale.
- Typer les callbacks `jwt` et `session` d'Auth.js.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un provider OAuth (GitHub ou Google).
- [ ] Implementer le "Remember me" avec duree de session configurable.
- [ ] Ajouter un CSRF token dans les formulaires.
- [ ] Créer un composant `<RoleGate>` qui affiche le contenu uniquement si le role correspond.

---

## Fichiers

```
src/
  auth.ts
  middleware.ts
  types/
    auth.ts
  components/
    providers/
      SessionProvider.tsx
  app/
    api/auth/[...nextauth]/
      route.ts
    login/
      page.tsx
    register/
      page.tsx
    profile/
      page.tsx
    admin/
      page.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Auth.js est configure avec le provider Credentials | oui   |
| Le login fonctionne et créé une session          | oui     |
| Le register valide les donnees avec Zod          | oui     |
| La session est accessible dans les Server Components | oui  |
| Le middleware protege les routes privees         | oui     |
| Le RBAC empeche les non-admins d'acceder a `/admin` | oui  |
| Les types `next-auth` sont etendus avec `role`   | oui     |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [Auth.js — Getting Started](https://authjs.dev/getting-started)
- [Auth.js — Credentials Provider](https://authjs.dev/getting-started/providers/credentials)
- [Auth.js — TypeScript](https://authjs.dev/getting-started/typescript)
- [Next.js — Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
