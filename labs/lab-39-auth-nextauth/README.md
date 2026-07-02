# Lab 39 — Authentification admin avec Auth.js v5 (NextAuth)

> **Outcome :** à la fin, tu sais protéger une route `/admin` Next.js 15 avec Auth.js v5 — login credentials (hash bcrypt vérifié serveur), session jwt, rôle admin scellé dans le token, et une double barrière middleware + revérification serveur.
> **Vrai outil :** un vrai projet Next.js 15 App Router + `next-auth@beta` (Auth.js v5). Pas de harnais simulé, pas d'`exercise.ts`/`solution.ts`.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur).

## Énoncé

Tu pars d'un projet Next.js 15 nu et tu ajoutes l'auth admin de TribuZen. Rien n'est fourni pré-câblé : tu écris toi-même `auth.ts`, le route handler, le middleware, la DAL et la page.

Périmètre minimal à livrer :

1. `auth.ts` — `NextAuth({...})` en session `jwt`, provider `Credentials` avec `authorize` (validation Zod + `bcrypt.compare`), callbacks `jwt`/`session` qui injectent le rôle.
2. `app/api/auth/[...nextauth]/route.ts` — export des `handlers`.
3. `types/next-auth.d.ts` — augmentation pour `role`.
4. `middleware.ts` — redirige vers `/login` tout accès non connecté à `/admin`.
5. `lib/dal.ts` — `requireAdmin()` qui revérifie le rôle via `auth()`.
6. `app/admin/page.tsx` — appelle `requireAdmin()` avant d'afficher quoi que ce soit.
7. `app/login/page.tsx` — form Server Action `signIn("credentials", ...)`.

Contrainte de sécurité imposée : **le middleware seul ne doit jamais être la seule barrière** — la page `/admin` doit refuser un non-admin même si on désactive le middleware.

Setup de départ :

```bash
npx create-next-app@latest tribuzen-admin --ts --app --eslint
cd tribuzen-admin
npm install next-auth@beta bcryptjs zod
npm install -D @types/bcryptjs
npx auth secret   # génère AUTH_SECRET dans .env.local
```

Base admin factice (en dur pour le lab, pas de vraie DB) — crée `lib/admins.ts` avec un hash bcrypt réel :

```ts
// lib/admins.ts — génère le hash une fois : bcrypt.hashSync("admin1234", 10)
import bcrypt from "bcryptjs";

const ADMINS = [
  {
    id: "1",
    name: "Sylvain",
    email: "admin@tribuzen.app",
    passwordHash: bcrypt.hashSync("admin1234", 10),
    role: "admin",
  },
];

export async function getAdminByEmail(email: string) {
  return ADMINS.find((a) => a.email === email) ?? null;
}
```

## Étapes (en friction)

1. Écris `auth.ts` **sans regarder le corrigé**. Impose `session: { strategy: "jwt" }` et explique-toi à voix haute pourquoi Credentials l'exige.
2. Dans `authorize`, valide avec Zod, puis compare avec `bcrypt.compare`. Retourne `null` sur tout échec avec un seul message générique.
3. Ajoute les callbacks `jwt`/`session` pour faire remonter `role`. Crée `types/next-auth.d.ts`.
4. Câble le route handler et le middleware.
5. Écris `lib/dal.ts` puis `app/admin/page.tsx`. **Test manuel de sécurité :** commente le contenu de `middleware.ts`, connecte-toi avec un compte non-admin (ajoute-en un temporaire, rôle `member`) et vérifie que `/admin` refuse quand même.
6. Écris `/login` en Server Action et connecte-toi pour de vrai.

## Corrigé complet commenté

```ts
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminByEmail } from "@/lib/admins";

// authorize ne valide rien par défaut : on le fait nous-mêmes
const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" }, // OBLIGATOIRE : Credentials n'est pas persisté par un adapter DB
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return null;            // entrées invalides → échec

        const admin = await getAdminByEmail(parsed.data.email); // requête SERVEUR
        if (!admin) return null;

        const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!ok) return null;                        // hash != saisie → échec

        // objet retourné = "user" transmis au callback jwt
        return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;              // 1er login : on grave le rôle dans le token signé
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;      // on l'expose à l'app
      return session;
    },
  },
  pages: { signIn: "/login" },
});
```

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
// rebranche GET/POST sur /api/auth/* ; gère CSRF automatiquement
export const { GET, POST } = handlers;
```

```ts
// types/next-auth.d.ts — sans ça, session.user.role ne type pas
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

```ts
// middleware.ts — barrière d'UX : redirige tôt, mais N'EST PAS le gardien unique
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");
  if (isOnAdmin && !req.auth) { // req.auth injecté par le wrapper auth()
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  // exclut les assets et le endpoint d'auth
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

> **⚠️ Edge runtime — split-config dès qu'une vraie DB entre en jeu.** Ci-dessus, `middleware.ts` importe `auth` depuis `@/auth`, qui tire tout `auth.ts` : `Credentials`, `bcryptjs`, Zod. Pour ce lab (base admin factice en mémoire, pas de driver DB), ça passe. **Mais** le middleware Next tourne en **Edge runtime** : `bcryptjs` et un driver DB Node (accès TCP) y **cassent**. Au portage TribuZen (vraie table `admins`, hash stocké), applique le pattern **split-config** d'Auth.js v5 :
> - `auth.config.ts` — portion **edge-safe** : providers OAuth + callback `authorized`, **sans** adapter / bcrypt / DB.
> - `auth.ts` — `NextAuth({ ...authConfig, adapter, providers: [Credentials(...)] })` : la partie Node complète.
> - `middleware.ts` — construit sur `NextAuth(authConfig).auth`, important **uniquement** `auth.config.ts`, **jamais** `auth.ts`.
>
> Voir §2.10 du module 39 pour les trois fichiers complets. Règle : le middleware n'importe que la portion edge-compatible ; la revérification serveur (`requireAdmin()` via `auth()`) continue d'utiliser `auth.ts` en Node.

```ts
// lib/dal.ts — LA vraie barrière d'autorisation, près des données
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  if (session.user.role !== "admin") throw new Error("Accès refusé");
  return session;
}
```

```tsx
// app/admin/page.tsx — revérifie le rôle même si le middleware est contourné
import { requireAdmin } from "@/lib/dal";
import { signOut } from "@/auth";

export default async function AdminPage() {
  const session = await requireAdmin(); // jette si non authentifié / non admin

  return (
    <main>
      <h1>Console admin TribuZen — {session.user.name}</h1>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
        <button type="submit">Déconnexion</button>
      </form>
    </main>
  );
}
```

```tsx
// app/login/page.tsx — Server Action, pas de "use client" nécessaire
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default function LoginPage() {
  return (
    <main>
      <h1>Connexion admin</h1>
      <form
        action={async (formData: FormData) => {
          "use server";
          try {
            await signIn("credentials", {
              ...Object.fromEntries(formData),
              redirectTo: "/admin",
            });
          } catch (error) {
            // message générique : ne dit pas si c'est l'email ou le mot de passe
            if (error instanceof AuthError) redirect("/login?error=1");
            throw error; // laisse passer la redirection interne de Next
          }
        }}
      >
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Mot de passe" required />
        <button type="submit">Se connecter</button>
      </form>
    </main>
  );
}
```

**Vérification de sécurité attendue :** avec `middleware.ts` neutralisé, une session `member` qui atteint `/admin` déclenche l'erreur `Accès refusé` de `requireAdmin()`. Preuve que l'autorisation ne dépend pas du middleware.

## Variante J+30 (fading)

Reprends de zéro, **sans relire le corrigé**, en ≤ 30 min, et ajoute une contrainte :

- ajoute un **provider GitHub** à côté des credentials ;
- les comptes OAuth n'ont **pas** de rôle admin par défaut : dans le callback `jwt`, fixe `token.role ??= "member"` pour tout compte sans rôle ;
- vérifie que se connecter via GitHub mène à un `Accès refusé` sur `/admin` (comportement sûr), tandis que le compte credentials admin passe.

Objectif : prouver que tu sais où le rôle est décidé et pourquoi le défaut sûr est « pas admin ».

## Application TribuZen

Porte ce lab dans le vrai produit `smaurier/tribuzen` :

1. Remplace `lib/admins.ts` factice par une vraie source (table `admins` en base, hash bcrypt stocké à la création du compte — jamais le mot de passe en clair).
2. Garde `requireAdmin()` dans `lib/dal.ts` et appelle-le **au début de chaque Server Action sensible** (`deleteFamily`, `exportEmails`…), pas seulement dans la page.
3. Vérifie `AUTH_SECRET` en variable d'environnement de déploiement (pas commité), et que les secrets OAuth restent côté serveur.
4. Commit : `feat(auth): login admin credentials + session jwt + garde /admin (Auth.js v5)` dans `smaurier/tribuzen`.
