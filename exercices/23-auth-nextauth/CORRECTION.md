# Correction — Exercice 23 : Auth NextAuth

---

## Étape 1 : Types avec module augmentation

```ts
// src/types/auth.ts
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

export type UserRole = "admin" | "user" | "editor";

// Etendre les types de next-auth pour inclure le role
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: UserRole;
    id: string;
  }
}
```

---

## Étape 2 : Configuration Auth.js

```ts
// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { UserRole } from "@/types/auth";

// Simulation d'une base de donnees
const users = [
  {
    id: "1",
    email: "admin@example.com",
    password: "admin123",
    name: "Admin User",
    role: "admin" as UserRole,
  },
  {
    id: "2",
    email: "user@example.com",
    password: "user123",
    name: "Regular User",
    role: "user" as UserRole,
  },
  {
    id: "3",
    email: "editor@example.com",
    password: "editor123",
    name: "Editor User",
    role: "editor" as UserRole,
  },
];

// Schema de validation
const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caracteres"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        // Valider les donnees
        const result = loginSchema.safeParse(credentials);
        if (!result.success) return null;

        // Chercher l'utilisateur
        const user = users.find(
          (u) =>
            u.email === result.data.email &&
            u.password === result.data.password
        );

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Ajouter le role au JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id ?? "";
      }
      return token;
    },

    // Ajouter le role a la session
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
});
```

---

## Étape 3 : Route Handler

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

---

## Étape 4 : Page de login

```tsx
// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  // Rediriger si deja connecte
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Connexion
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
```

```tsx
// src/components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                     dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="nom@exemple.fr"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-lg border border-gray-300 px-4 py-2
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                     dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Mot de passe"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium
                   text-white transition-colors hover:bg-blue-700
                   disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {loading ? "Connexion en cours..." : "Se connecter"}
      </button>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-blue-600 hover:underline dark:text-blue-400">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}
```

---

## Étape 5 : Page d'inscription

```tsx
// src/app/register/page.tsx
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Inscription
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}
```

```tsx
// src/components/auth/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const registerSchema = z
  .object({
    name: z.string().min(2, "Le nom doit faire au moins 2 caracteres"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit faire au moins 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  function updateField(field: keyof RegisterFormData, value: string): void {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setErrors({});
    setLoading(true);

    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    // Simuler la creation du compte
    // En production : appel API ou Server Action
    await new Promise((resolve) => setTimeout(resolve, 1000));

    router.push("/login?registered=true");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(["name", "email", "password", "confirmPassword"] as const).map(
        (field) => (
          <div key={field}>
            <label
              htmlFor={field}
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {field === "name"
                ? "Nom"
                : field === "email"
                  ? "Email"
                  : field === "password"
                    ? "Mot de passe"
                    : "Confirmer le mot de passe"}
            </label>
            <input
              id={field}
              type={field.includes("password") || field.includes("Password") ? "password" : field === "email" ? "email" : "text"}
              value={formData[field]}
              onChange={(e) => updateField(field, e.target.value)}
              required
              className={`w-full rounded-lg border px-4 py-2
                         focus:outline-none focus:ring-1
                         dark:bg-gray-800 dark:text-white
                         ${
                           errors[field]
                             ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                             : "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                         }`}
            />
            {errors[field] && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors[field]}
              </p>
            )}
          </div>
        )
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium
                   text-white transition-colors hover:bg-blue-700
                   disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {loading ? "Inscription..." : "S'inscrire"}
      </button>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Deja un compte ?{" "}
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
```

---

## Étape 6 : Page profil (Server Component + session)

```tsx
// src/app/profile/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();

  // Rediriger si pas de session
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        Mon profil
      </h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Nom
            </span>
            <p className="text-lg text-gray-900 dark:text-white">
              {session.user.name}
            </p>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Email
            </span>
            <p className="text-lg text-gray-900 dark:text-white">
              {session.user.email}
            </p>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Role
            </span>
            <p className="text-lg text-gray-900 dark:text-white">
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {session.user.role}
              </span>
            </p>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ID utilisateur
            </span>
            <p className="font-mono text-sm text-gray-600 dark:text-gray-300">
              {session.user.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Étape 7 : Middleware RBAC

```ts
// src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Routes protegees (authentification requise)
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/settings"];

// Routes admin uniquement
const ADMIN_ROUTES = ["/admin"];

// Routes d'authentification (rediriger si deja connecte)
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Verifier si c'est une route protegee
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Verifier si c'est une route admin
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Verifier si c'est une route d'auth
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  // Non authentifie sur route protegee → login
  if ((isProtected || isAdminRoute) && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Non admin sur route admin → dashboard avec erreur
  if (isAdminRoute && userRole !== "admin") {
    const dashboardUrl = new URL("/dashboard", req.url);
    dashboardUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(dashboardUrl);
  }

  // Deja authentifie sur page de login → dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)"],
};
```

---

## Étape 8 : SessionProvider

```tsx
// src/components/providers/SessionProvider.tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function SessionProvider({ children }: ProvidersProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

---

## Ce que tu aurais pu oublier

1. **Module augmentation pour les types** : `declare module "next-auth"` est nécessaire pour ajouter `role` aux types existants. Sans cela, TypeScript ne reconnait pas `session.user.role`.

2. **`auth()` est une fonction serveur** : elle ne fonctionne que dans les Server Components, Route Handlers et Server Actions. Cote client, utiliser `useSession()` du `SessionProvider`.

3. **`redirect: false` dans `signIn`** : sans cette option, `signIn` redirige automatiquement et on ne peut pas gérer les erreurs cote client.

4. **Le callback `jwt` s'exécuté à chaque requête** : le `user` n'est disponible que lors de la première connexion. Il faut vérifier `if (user)` avant d'ajouter les propriétés.

5. **Le middleware Auth.js utilise `auth()`** : la fonction `auth` retourne un middleware enrichi avec `req.auth` qui contient la session.

6. **Le `config.matcher` exclut les routes Auth.js** : `api/auth` doit etre exclu du middleware pour éviter les boucles de redirection.

7. **Les mots de passe doivent etre hashes en production** : cette correction utilise des mots de passe en clair pour simplifier. En production, utiliser `bcrypt` pour hasher et comparer.

8. **`router.refresh()` après le login** : nécessaire pour que les Server Components recuperent la nouvelle session.
