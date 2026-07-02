---
titre: Authentification avec Auth.js (NextAuth v5)
cours: 04-react
notions: [Auth.js v5 vs NextAuth v4, config auth.ts et route handler, provider Credentials, provider OAuth, session strategy jwt vs database, callbacks jwt et session, auth() en Server Component, protection middleware, protection en DAL, signIn et signOut en Server Action, rôle dans le token, sécurité cookie httpOnly, CSRF géré par la lib]
outcomes: [configurer Auth.js v5 dans un projet Next.js 15 App Router, protéger une route serveur avec auth() et un rôle, distinguer barrière middleware et autorisation revérifiée serveur]
prerequis: [38-css-modules-et-alternatives]
next: 40-deploiement
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }, { name: "next-auth", version: "^5" }]
tribuzen: authentification admin de TribuZen — login credentials + hash bcrypt serveur, session jwt, auth() protège /admin, rôle admin dans le token, signOut
last-reviewed: 2026-07
---

# Authentification avec Auth.js (NextAuth v5)

> **Outcomes — tu sauras FAIRE :** configurer Auth.js v5 dans un projet Next.js 15 App Router, protéger une route serveur avec `auth()` et un contrôle de rôle, distinguer la barrière middleware de l'autorisation revérifiée côté serveur.
> **Difficulté :** :star::star::star:

> **Note de fiabilité (module sécurité)** — L'API décrite ici (`auth.ts`, `handlers`, `auth()`, callbacks, middleware, Server Actions `signIn`/`signOut`, contrainte JWT du provider Credentials) a été **vérifiée sur la documentation Auth.js à jour (juillet 2026)** via Context7. Les points marqués *(pratique standard, non spécifique Auth.js)* — bcrypt, détails cookie `httpOnly` — relèvent de bonnes pratiques générales à recouper avec la doc de sécurité de ton projet. La v5 (Auth.js) diffère fortement de la v4 (NextAuth.js) : ne copie jamais un tuto v4 sans vérifier.

## 1. Cas concret d'abord

L'admin TribuZen n'a aucune protection. N'importe qui atteignant `/admin` liste les familles, supprime des membres, exporte les emails. Il faut :

1. un **login admin** (email + mot de passe vérifié en base) ;
2. une **session** qui survit à la navigation sans renvoyer le mot de passe à chaque requête ;
3. `/admin` **inaccessible** sans session valide **et** sans rôle `admin`.

Un collègue propose ce middleware et pense la sécurité faite :

```ts
// middleware.ts — FAUX sentiment de sécurité
export default function middleware(req: Request) {
  const isAdmin = req.headers.get('x-role') === 'admin'; // header falsifiable
  if (!isAdmin) return Response.redirect('/login');
}
```

Deux failles majeures :

- un header HTTP est **envoyé par le client** : `curl -H "x-role: admin"` passe la barrière ;
- même corrigé, le middleware **ne suffit jamais seul** — la page `/admin` doit revérifier l'autorisation au moment où elle lit les données (rappel des modules 27/28 : le middleware filtre le trafic, il n'autorise pas l'accès aux données).

Ce module remplace ce bricolage par Auth.js v5 : session signée côté serveur, rôle dans un token infalsifiable, et double barrière (middleware + revérification serveur).

---

## 2. Théorie complète, concise

### 2.1 Auth.js v5 n'est pas NextAuth v4

Le paquet npm s'appelle toujours `next-auth`, mais la v5 est rebrandée **Auth.js** et pensée pour l'**App Router**. Les différences cassent la plupart des tutos v4 :

| | v4 (NextAuth.js) | v5 (Auth.js) |
|---|---|---|
| Cible | Pages Router | App Router |
| Config | `[...nextauth].ts` dans `pages/api` | `auth.ts` à la racine |
| Accès session serveur | `getServerSession(authOptions)` | `auth()` sans argument |
| Middleware | `withAuth` (`next-auth/middleware`) | `auth` exporté depuis ta config |
| Env secret | `NEXTAUTH_SECRET` | `AUTH_SECRET` |

```bash
npm install next-auth@beta   # la v5 s'installe encore via le tag beta
```

### 2.2 Le fichier de configuration `auth.ts`

Le cœur de la v5 : un `NextAuth({...})` qui **retourne quatre exports** réutilisés partout dans l'app.

```ts
// auth.ts — à la racine du projet
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [/* ... */],
});
```

- `handlers` → les routes GET/POST d'authentification ;
- `auth` → lit la session côté serveur **et** sert de wrapper de middleware ;
- `signIn` / `signOut` → à appeler depuis des Server Actions.

### 2.3 Le route handler

Un unique fichier catch-all rebranche les `handlers` sur `/api/auth/*` :

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

C'est ce endpoint qui gère callback OAuth, sign-in, sign-out, et le jeton **CSRF** — protection assurée par la librairie, tu n'écris rien pour ça.

### 2.4 Provider Credentials (email + mot de passe)

Le provider `Credentials` te laisse **tout le contrôle** de la vérification. Point critique : `authorize` ne valide **rien** par défaut — c'est à toi de valider les entrées (Zod) et de comparer un **hash**, jamais un mot de passe en clair.

```ts
// auth.ts (extrait)
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs"; // hash : pratique standard, non spécifique Auth.js

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Mot de passe", type: "password" },
  },
  async authorize(raw) {
    // 1. valider les entrées — authorize ne le fait PAS pour toi
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) return null;

    // 2. chercher l'utilisateur (côté serveur uniquement)
    const user = await getAdminByEmail(parsed.data.email);
    if (!user) return null;

    // 3. comparer le HASH, jamais le mot de passe en clair
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return null;

    // 4. l'objet retourné devient le "user" transmis aux callbacks
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },
})
```

Retourner `null` (ou lever `CredentialsSignin`) = échec. **Message d'erreur générique** vers le client : ne révèle jamais si c'est l'email ou le mot de passe qui est faux (anti-énumération de comptes).

### 2.5 Provider OAuth (Google, GitHub…)

Un provider OAuth se déclare en deux lignes ; les secrets restent **côté serveur** (variables d'env, jamais dans le bundle client).

```ts
import GitHub from "next-auth/providers/github";

GitHub({
  clientId: process.env.AUTH_GITHUB_ID!,
  clientSecret: process.env.AUTH_GITHUB_SECRET!,
})
```

Auth.js reconnaît automatiquement les env `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` : on peut même omettre les options.

### 2.6 Session strategy : `jwt` vs `database`

Deux façons de matérialiser une session :

| | `jwt` (défaut) | `database` |
|---|---|---|
| Où vit la session | token signé dans un **cookie** | ligne en base + id dans le cookie |
| Adapter DB requis | non | **oui** (Prisma, Drizzle…) |
| Révocation immédiate | difficile (token valide jusqu'à expiration) | facile (supprimer la ligne) |
| Compatible Credentials | **oui (obligatoire)** | **non** |

**Contrainte confirmée par la doc :** le provider **Credentials ne fonctionne qu'en session `jwt`**. Les utilisateurs connectés par credentials ne sont pas persistés par l'adapter → la stratégie base de données est incompatible. Pour l'admin TribuZen (credentials), on est donc en `jwt`.

### 2.7 Callbacks `jwt` et `session` : injecter le rôle

Par défaut la session ne contient pas le rôle. On l'ajoute en deux temps : `jwt` écrit dans le token, `session` le recopie vers l'objet lisible par l'app.

```ts
callbacks: {
  // s'exécute à la création/rafraîchissement du token
  jwt({ token, user }) {
    if (user) token.role = user.role; // user présent au 1er login
    return token;
  },
  // façonne l'objet session renvoyé par auth() / useSession()
  session({ session, token }) {
    session.user.role = token.role as string;
    return session;
  },
}
```

Le rôle vit **dans le token signé** : le client ne peut pas le falsifier sans invalider la signature. C'est ce qui rend le contrôle de rôle fiable, contrairement au header du cas concret.

### 2.8 Typage TypeScript (module augmentation)

`session.user.role` n'existe pas dans les types de base. On étend les interfaces via un fichier de déclaration.

```ts
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
```

### 2.9 Lire la session côté serveur : `auth()`

Dans un Server Component, une Server Action ou un route handler, `auth()` (sans argument) renvoie la session ou `null`.

```tsx
// app/admin/page.tsx — Server Component
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");            // pas connecté
  if (session.user.role !== "admin") redirect("/unauthorized"); // pas admin

  return <h1>Admin — {session.user.name}</h1>;
}
```

C'est cette revérification qui constitue la **vraie barrière d'autorisation** : elle s'exécute au moment de lire les données, indépendamment du middleware.

### 2.10 Protection par middleware

Le middleware s'exécute au niveau HTTP, **avant** le rendu : il filtre le trafic entrant (Edge). On exporte simplement `auth` comme middleware, ou on le wrappe pour une logique fine.

```ts
// middleware.ts — variante wrappée
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;                    // req.auth injecté par le wrapper
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");

  if (isOnAdmin && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

> **Middleware ≠ seule barrière (rappel 27/28).** Le middleware améliore l'UX (rediriger tôt, éviter d'envoyer le JS d'une page interdite) mais peut être contourné (bugs de matcher, requêtes directes à une Server Action ou une route API). L'autorisation **doit** être revérifiée là où les données sont lues — dans la page/action serveur (§2.9), idéalement centralisée dans une **DAL** (Data Access Layer).

### 2.11 Autorisation dans la DAL

Centraliser le contrôle près des données évite d'oublier une vérification. Une fonction `requireAdmin()` réutilisable :

```ts
// lib/dal.ts
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  if (session.user.role !== "admin") throw new Error("Accès refusé");
  return session;
}
```

Chaque Server Action sensible commence par `const session = await requireAdmin();`. Le middleware devient une optimisation d'UX, pas le gardien unique.

### 2.12 `signIn` / `signOut` en Server Action

En v5, on connecte/déconnecte via des Server Actions — pas d'appel client obligatoire.

```tsx
// app/login/page.tsx — Server Component avec form action
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default function LoginPage() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        try {
          await signIn("credentials", { ...Object.fromEntries(formData), redirectTo: "/admin" });
        } catch (error) {
          if (error instanceof AuthError) redirect("/login?error=1");
          throw error; // ne pas avaler les redirections internes de Next
        }
      }}
    >
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

```tsx
// composant bouton de déconnexion
import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
      <button type="submit">Déconnexion</button>
    </form>
  );
}
```

### 2.13 Sécurité : ce qui est garanti, ce qui reste ta responsabilité

- **Cookie de session `httpOnly`** : le cookie posé par Auth.js n'est pas lisible en JS côté client → limite le vol de session par XSS. *(comportement documenté Auth.js ; recoupe la config cookies de ton projet)*
- **CSRF** : géré par la librairie sur le endpoint d'auth — rien à coder.
- **`AUTH_SECRET`** : signe les tokens. Généré via `npx auth secret` ou `openssl rand -base64 32`, jamais commité, jamais exposé au client.
- **Secrets OAuth / hash** : côté serveur uniquement (`auth.ts`, env). Aucun secret dans un composant client (`"use client"`).
- **À ta charge** : valider les entrées (Zod), hasher (bcrypt), messages d'erreur génériques, et **revérifier l'autorisation au niveau des données** (le middleware ne suffit pas).

---

## 3. Worked examples

### Exemple 1 — Auth admin TribuZen de bout en bout

Objectif : login credentials, session jwt, rôle admin, `/admin` protégé.

```ts
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminByEmail } from "@/lib/admins";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" }, // obligatoire avec Credentials
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return null;

        const admin = await getAdminByEmail(parsed.data.email); // requête serveur
        if (!admin) return null;

        const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!ok) return null;

        return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;   // 1er login : on grave le rôle
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string; // exposé à l'app
      return session;
    },
  },
  pages: { signIn: "/login" },
});
```

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

```ts
// lib/dal.ts — autorisation centralisée
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Accès refusé");
  return session;
}
```

```tsx
// app/admin/page.tsx — la page revérifie, ne fait pas confiance au middleware seul
import { requireAdmin } from "@/lib/dal";

export default async function AdminPage() {
  const session = await requireAdmin(); // jette si non-admin
  return <h1>Console admin — {session.user.name}</h1>;
}
```

```ts
// middleware.ts — barrière d'UX (redirige tôt), pas gardien unique
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (req.nextUrl.pathname.startsWith("/admin") && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"] };
```

**Chaîne de sécurité obtenue :** le mot de passe n'est comparé qu'en hash serveur → le rôle est scellé dans un token signé → le middleware redirige les visiteurs non connectés → la page revérifie le rôle avant de lire quoi que ce soit. Deux barrières indépendantes.

### Exemple 2 — Login credentials + provider GitHub

On ajoute une connexion OAuth GitHub à côté des credentials.

```ts
// auth.ts (extrait providers)
import GitHub from "next-auth/providers/github";

providers: [
  Credentials({ /* … comme Exemple 1 … */ }),
  GitHub, // lit AUTH_GITHUB_ID / AUTH_GITHUB_SECRET depuis l'env
],
```

```tsx
// bouton OAuth — Server Action
import { signIn } from "@/auth";

export function GitHubButton() {
  return (
    <form action={async () => { "use server"; await signIn("github", { redirectTo: "/admin" }); }}>
      <button type="submit">Continuer avec GitHub</button>
    </form>
  );
}
```

```bash
# .env.local — jamais commité, jamais côté client
AUTH_SECRET=... # npx auth secret
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

Attention : GitHub retourne un profil sans rôle. Le callback `jwt` doit fixer un rôle par défaut pour les comptes OAuth (`token.role ??= "member"`), sinon `session.user.role` est `undefined` et `requireAdmin()` refuse — ce qui est le comportement sûr par défaut.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que le middleware suffit à autoriser

```ts
// ❌ Seule protection = middleware
export default auth((req) => {
  if (req.nextUrl.pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});
// La Server Action deleteFamily() n'est PAS derrière ce matcher → appelable directement
```

```ts
// ✅ Revérifier là où les données sont touchées
"use server";
export async function deleteFamily(id: string) {
  await requireAdmin(); // barrière réelle, indépendante du middleware
  await db.family.delete(id);
}
```

Le middleware filtre des **URLs de pages** ; il ne garde pas les Server Actions ni les routes API par défaut. L'autorisation vit près des données (rappel 27/28).

### PIÈGE #2 — Utiliser `database` avec Credentials

```ts
// ❌ Incompatible : Credentials n'est pas persisté par l'adapter
session: { strategy: "database" },
providers: [Credentials({ /* ... */ })],
// → session jamais créée, l'utilisateur reste déconnecté
```

```ts
// ✅ Credentials impose jwt
session: { strategy: "jwt" },
```

C'est une contrainte de conception, pas un bug : les users credentials ne sont pas stockés par Auth.js.

### PIÈGE #3 — Confondre v4 et v5

```ts
// ❌ API v4 — n'existe plus en v5
import { getServerSession } from "next-auth";
const session = await getServerSession(authOptions);

// ❌ env v4
NEXTAUTH_SECRET=...
```

```ts
// ✅ v5
import { auth } from "@/auth";
const session = await auth();
// env v5
AUTH_SECRET=...
```

Coller un snippet StackOverflow v4 dans un projet v5 est la première cause d'échec. Toujours vérifier la doc Auth.js à jour.

### PIÈGE #4 — Mot de passe en clair ou message d'erreur trop précis

```ts
// ❌ Comparaison en clair + fuite d'information
if (password !== user.password) throw new Error("Mot de passe incorrect");
if (!user) throw new Error("Cet email n'existe pas"); // énumération de comptes
```

```ts
// ✅ Hash + erreur générique
const ok = await bcrypt.compare(password, user.passwordHash);
if (!user || !ok) return null; // le client verra un message unique et vague
```

Ne stocke jamais un mot de passe en clair ; ne dis jamais au client *lequel* des deux champs est faux.

### PIÈGE #5 — Exposer un secret côté client

```tsx
// ❌ "use client" + secret = secret embarqué dans le bundle JS
"use client";
const secret = process.env.AUTH_GITHUB_SECRET; // fuite publique
```

```ts
// ✅ Secrets uniquement côté serveur (auth.ts, Server Actions, env sans préfixe public)
GitHub({ clientId: process.env.AUTH_GITHUB_ID!, clientSecret: process.env.AUTH_GITHUB_SECRET! });
```

Toute variable lue dans un composant client se retrouve dans le navigateur. Les secrets restent en `auth.ts` / Server Actions.

---

## 5. Ancrage TribuZen

L'authentification de l'admin TribuZen repose entièrement sur ce module :

- **`auth.ts`** (racine) — `NextAuth({...})` exportant `handlers, auth, signIn, signOut`. Provider `Credentials` : `authorize` valide via Zod, cherche l'admin en base, compare le hash bcrypt, retourne `{ id, name, email, role }`. `session.strategy = "jwt"`.
- **`app/api/auth/[...nextauth]/route.ts`** — rebranche `handlers` (GET/POST) sur `/api/auth/*`.
- **`callbacks.jwt` / `callbacks.session`** — injectent `role: "admin"` dans le token signé puis dans la session lisible.
- **`middleware.ts`** — redirige vers `/login` tout accès non connecté à `/admin` (barrière d'UX).
- **`lib/dal.ts` → `requireAdmin()`** — revérifie le rôle dans chaque page/action `/admin` (barrière d'autorisation réelle).
- **`app/admin/page.tsx`** — appelle `requireAdmin()` avant d'afficher la console.
- **`SignOutButton`** — Server Action `signOut({ redirectTo: "/login" })`.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/
  auth.ts
  middleware.ts
  types/next-auth.d.ts
  lib/
    admins.ts        # getAdminByEmail (accès DB, hash stocké)
    dal.ts           # requireAdmin
  app/
    api/auth/[...nextauth]/route.ts
    login/page.tsx
    admin/page.tsx
```

---

## 6. Points clés

1. Auth.js v5 (paquet `next-auth@beta`) cible l'App Router ; son API (`auth()`, `AUTH_SECRET`, `auth.ts`) diffère nettement de NextAuth v4.
2. `NextAuth({...})` dans `auth.ts` exporte `{ handlers, auth, signIn, signOut }` réutilisés dans toute l'app.
3. Le route handler `app/api/auth/[...nextauth]/route.ts` rebranche `handlers` et gère CSRF automatiquement.
4. Le provider `Credentials` impose la session `jwt` ; `authorize` ne valide rien par défaut → Zod + comparaison de hash bcrypt, message d'erreur générique.
5. Les callbacks `jwt` puis `session` injectent le rôle dans le token signé (infalsifiable) puis dans la session lisible.
6. `auth()` lit la session en Server Component/Action ; le rôle y est revérifié — c'est la vraie barrière d'autorisation.
7. Le middleware filtre le trafic tôt (UX) mais ne garde ni Server Actions ni routes API : l'autorisation doit être revérifiée dans la DAL (rappel 27/28).
8. Cookie de session `httpOnly`, CSRF géré par la lib, secrets et hash strictement côté serveur — jamais dans un composant client.

---

## 7. Seeds Anki

```
En quoi Auth.js v5 diffère-t-il de NextAuth v4 pour lire une session serveur ?|v4 : getServerSession(authOptions) depuis pages/api. v5 : auth() sans argument, config dans auth.ts à la racine, secret nommé AUTH_SECRET (pas NEXTAUTH_SECRET). Coller un snippet v4 dans un projet v5 casse.
Que retourne NextAuth({...}) dans auth.ts en v5 et à quoi sert chaque export ?|{ handlers, auth, signIn, signOut }. handlers = routes GET/POST d'auth ; auth = lit la session serveur + sert de wrapper middleware ; signIn/signOut = à appeler depuis des Server Actions.
Pourquoi le provider Credentials impose-t-il la session strategy jwt ?|Les utilisateurs connectés par Credentials ne sont pas persistés par l'adapter de base de données. La stratégie database est donc incompatible : la session doit vivre dans un token JWT signé (cookie).
À quoi servent les callbacks jwt et session, et pourquoi le rôle y est-il fiable ?|jwt écrit le rôle dans le token à la connexion, session le recopie vers l'objet session lisible. Le rôle vit dans un token signé : le client ne peut le falsifier sans invalider la signature — contrairement à un header HTTP.
Pourquoi le middleware ne suffit-il pas à autoriser l'accès à /admin ?|Le middleware filtre des URLs de pages au niveau HTTP (UX : rediriger tôt) mais ne garde ni Server Actions ni routes API par défaut, et un matcher buggé se contourne. L'autorisation doit être revérifiée là où les données sont lues (auth() / requireAdmin dans la DAL). Rappel modules 27/28.
Quelles vérifications sont à ta charge dans authorize() du provider Credentials ?|authorize ne valide rien par défaut : valider les entrées (Zod), chercher l'utilisateur côté serveur, comparer un HASH (bcrypt) jamais un mot de passe en clair, retourner null en cas d'échec avec un message d'erreur générique (anti-énumération).
Qu'est-ce qu'Auth.js sécurise automatiquement, et que dois-tu gérer toi-même ?|Auto : cookie de session httpOnly, protection CSRF sur le endpoint d'auth, signature des tokens via AUTH_SECRET. À ta charge : validation Zod, hachage bcrypt, secrets côté serveur uniquement, et revérification de l'autorisation au niveau des données.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-39-auth-nextauth/README.md`. Construire l'authentification admin TribuZen : `auth.ts` (Credentials + jwt + rôle), route handler, middleware, `requireAdmin()` en DAL, et `/admin` protégé — avec revérification serveur, pas seulement middleware.
