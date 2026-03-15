# Checklist — Exercice 23 : Auth NextAuth

## Validation

- [ ] Auth.js est configure dans `src/auth.ts` avec le provider Credentials
- [ ] Les types `next-auth` sont etendus avec `role` via `declare module`
- [ ] Le type `UserRole` est une union litterale (`"admin" | "user" | "editor"`)
- [ ] Le callback `jwt` ajoute le `role` et l'`id` au token
- [ ] Le callback `session` expose le `role` et l'`id` dans la session
- [ ] Le Route Handler `[...nextauth]/route.ts` exporte `GET` et `POST`
- [ ] La page de login utilise `signIn("credentials", { redirect: false })`
- [ ] Les erreurs d'authentification sont affichees dans le formulaire
- [ ] La page d'inscription valide les donnees avec Zod (y compris la confirmation du mot de passe)
- [ ] La page profil utilise `auth()` cote serveur et affiche les infos utilisateur
- [ ] Le middleware protege les routes `/dashboard`, `/profile`, `/settings`
- [ ] Le middleware redirige vers `/login` les utilisateurs non authentifies
- [ ] Le middleware vérifié le role `admin` pour les routes `/admin`
- [ ] Le `SessionProvider` encapsule les composants clients qui utilisent `useSession`
- [ ] Aucun `any` dans le code — types stricts partout
