# Cours 38 — Authentification avec Auth.js (NextAuth v5)

> **Objectif** : Implémenter un système d'authentification complet dans une application Next.js 15 avec Auth.js (anciennement NextAuth.js v5). Configurer des providers (credentials, Google, GitHub), gérer les sessions (client et serveur), protéger les routes avec le middleware, et implémenter un pattern RBAC (Role-Based Access Control). Comparer avec les guards Angular et les solutions Vue.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre CSS Modules et Tailwind CSS ?</summary>

CSS Modules génère des noms de classes uniques automatiquement (scoping), nécessite un fichier `.module.css` séparé, et offre une liberté totale en CSS. Tailwind utilise des classes utilitaires prédéfinies directement dans le JSX, sans fichier CSS séparé. Tailwind est plus rapide à écrire, CSS Modules est plus flexible pour du CSS complexe.
</details>

<details>
<summary>2. Qu'est-ce que shadcn/ui et pourquoi est-il populaire ?</summary>

shadcn/ui est un générateur de composants qui copie le code source dans votre projet (pas une dépendance npm). Il est basé sur Radix UI (accessibilité) + Tailwind CSS. On peut personnaliser chaque composant à 100%. C'est le standard pour les projets React/Next.js en 2025.
</details>

<details>
<summary>3. Pourquoi éviter styled-components dans un nouveau projet Next.js ?</summary>

styled-components a un runtime overhead (CSS généré en JS), est incompatible avec les React Server Components, augmente la taille du bundle, et peut causer des problèmes d'hydratation. Préférer Tailwind ou CSS Modules (zero runtime, compatibles RSC).
</details>

---

## Analogie

L'authentification, c'est comme un **système de badges d'accès dans un immeuble de bureaux**. Auth.js est le **système central de badges** : il gère l'émission (connexion), la vérification (session) et la révocation (déconnexion) des badges. Les providers (Google, GitHub) sont comme des **partenaires de confiance** qui peuvent attester de votre identité — comme quand un badge visiteur est émis sur présentation d'une pièce d'identité officielle. Le middleware Next.js est le **portique de sécurité** à l'entrée de chaque étage.

En Angular, les guards (`CanActivate`) jouent le rôle du portique. En Vue, `vue-router` + `beforeEach` fait la même chose. En Next.js, le middleware est plus puissant car il s'exécute **avant** le rendu de la page, côté serveur.

---

## Théorie

### 1. Auth.js : l'écosystème

Auth.js (anciennement NextAuth.js) est LA solution d'authentification pour Next.js :

| Version | Nom | Next.js |
|---------|-----|---------|
| v4 | NextAuth.js | Pages Router |
| v5 | Auth.js | App Router (recommandé) |

```bash
npm install next-auth@beta
```

### 2. Configuration de base

```
projet/
├── auth.ts              ← Configuration Auth.js
├── app/
│   ├── api/auth/[...nextauth]/route.ts  ← Route handler
│   ├── layout.tsx
│   └── page.tsx
├── middleware.ts         ← Protection des routes
└── .env.local           ← Secrets
```

#### Fichier de configuration principal

```tsx
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Provider credentials (email/password)
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Vérifier en base de données
        const user = await getUserByEmail(parsed.data.email);
        if (!user) return null;

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // Pour RBAC
        };
      },
    }),

    // Provider Google
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    // Provider GitHub
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],

  // Callbacks pour enrichir la session
  callbacks: {
    async jwt({ token, user }) {
      // Ajouter le rôle au token JWT
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Exposer le rôle dans la session
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",      // Page de connexion personnalisée
    error: "/auth/error",  // Page d'erreur personnalisée
  },
});
```

#### Variables d'environnement

```bash
# .env.local
AUTH_SECRET=your-secret-key-generated-with-openssl-rand-base64-32
AUTH_GOOGLE_ID=xxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=xxx
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=xxx
```

#### Route handler

```tsx
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

### 3. Typage TypeScript pour le rôle

```tsx
// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
```

### 4. Gestion de session : client et serveur

#### Côté serveur (Server Components, Server Actions)

```tsx
// app/dashboard/page.tsx (Server Component)
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Bienvenue, {session.user.name}</h1>
      <p>Rôle : {session.user.role}</p>
    </div>
  );
}
```

#### Côté client (Client Components)

```tsx
// components/UserMenu.tsx
"use client";

import { useSession, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Chargement...</p>;
  if (!session) return <a href="/login">Se connecter</a>;

  return (
    <div className="flex items-center gap-4">
      <span>{session.user.name}</span>
      <span className="text-sm text-gray-500">({session.user.role})</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-red-600 hover:text-red-800"
      >
        Déconnexion
      </button>
    </div>
  );
}
```

#### Provider de session (layout racine)

```tsx
// app/layout.tsx
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

### 5. Protection des routes avec middleware

```tsx
// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Routes publiques
  const publicRoutes = ["/", "/login", "/register", "/about"];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Routes protégées : rediriger si non connecté
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Routes admin : vérifier le rôle
  if (pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protéger tout sauf les assets statiques et les routes API auth
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

> **Comparaison Angular** : le middleware Next.js est l'équivalent des `CanActivate` / `CanMatch` guards d'Angular Router, mais il s'exécute au niveau HTTP (Edge Runtime), avant même que React ne se charge. C'est plus sécurisé car aucun code client n'est envoyé pour les routes non autorisées.

> **Comparaison Vue** : en Vue, on utilise `router.beforeEach()` côté client. Le middleware Next.js est côté serveur — l'utilisateur non autorisé ne reçoit jamais le JavaScript de la page protégée.

### 6. Pattern RBAC (Role-Based Access Control)

```tsx
// lib/auth-utils.ts
import { auth } from "@/auth";

type Role = "user" | "editor" | "admin";

const roleHierarchy: Record<Role, number> = {
  user: 1,
  editor: 2,
  admin: 3,
};

export async function requireRole(minimumRole: Role) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const userRole = session.user.role as Role;
  if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
    throw new Error("Permissions insuffisantes");
  }

  return session;
}
```

```tsx
// app/admin/page.tsx
import { requireRole } from "@/lib/auth-utils";

export default async function AdminPage() {
  const session = await requireRole("admin");

  return <h1>Panneau admin — Bienvenue {session.user.name}</h1>;
}
```

#### Composant conditionnel par rôle

```tsx
// components/RoleGate.tsx
"use client";

import { useSession } from "next-auth/react";

export function RoleGate({
  allowedRoles,
  children,
  fallback = null,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: session } = useSession();

  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Utilisation
<RoleGate allowedRoles={["admin", "editor"]}>
  <button>Modifier l'article</button>
</RoleGate>

<RoleGate allowedRoles={["admin"]} fallback={<p>Accès réservé aux admins</p>}>
  <AdminDashboard />
</RoleGate>
```

### 7. Page de connexion personnalisée

```tsx
// app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState<string | null>(null);

  async function handleCredentialsLogin(formData: FormData) {
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6">Connexion</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {/* OAuth providers */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          Continuer avec Google
        </button>
        <button
          onClick={() => signIn("github", { callbackUrl })}
          className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          Continuer avec GitHub
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">ou</span>
        </div>
      </div>

      {/* Credentials form */}
      <form action={handleCredentialsLogin} className="space-y-4">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full p-3 border rounded-lg"
        />
        <input
          name="password"
          type="password"
          placeholder="Mot de passe"
          required
          className="w-full p-3 border rounded-lg"
        />
        <button
          type="submit"
          className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
```

---

## Pratique

### Exercice : implémenter un flow d'authentification complet

Créez une application Next.js avec :
1. Configuration Auth.js avec provider credentials
2. Page de connexion (`/login`)
3. Page protégée (`/dashboard`) — redirect si non connecté
4. Middleware qui protège `/dashboard` et `/admin`
5. Composant `UserMenu` qui affiche le nom et un bouton déconnexion
6. Route `/admin` accessible uniquement aux utilisateurs avec le rôle "admin"

<details>
<summary>Voir la solution</summary>

La solution complète combine les sections 2 à 7 de ce cours. Les fichiers clés sont :

1. **`auth.ts`** : configuration avec provider Credentials et callbacks pour le rôle
2. **`app/api/auth/[...nextauth]/route.ts`** : export des handlers
3. **`middleware.ts`** : protection des routes avec vérification du rôle
4. **`app/login/page.tsx`** : formulaire de connexion
5. **`app/dashboard/page.tsx`** :
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Bienvenue, {session.user.name} ({session.user.role})</p>
    </div>
  );
}
```
6. **`app/admin/page.tsx`** :
```tsx
import { requireRole } from "@/lib/auth-utils";

export default async function AdminPage() {
  const session = await requireRole("admin");
  return <h1>Admin — {session.user.name}</h1>;
}
```
7. **`components/UserMenu.tsx`** : le composant client avec `useSession` et `signOut`

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Auth.js v5 | LA solution auth pour Next.js App Router |
| Providers | Credentials (email/pwd), Google, GitHub, etc. |
| `auth()` | Session côté serveur (Server Components, Server Actions) |
| `useSession()` | Session côté client (Client Components) |
| Middleware | Protection des routes au niveau HTTP (Edge Runtime) |
| RBAC | Rôle dans le token JWT, vérifié dans middleware + composants |
| `SessionProvider` | Wrapper obligatoire dans le layout racine |

> **Prochain cours** : [Cours 39 — Sécurité front-end](./02-securite-front.md)
