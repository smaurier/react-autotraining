# Correction — Exercice 16b : Middleware Next.js

---

## Étape 1 : Middleware principal

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Routes qui necessitent une authentification
const PROTECTED_ROUTES: readonly string[] = [
  "/dashboard",
  "/profile",
  "/settings",
] as const;

// Routes d'authentification (rediriger si deja connecte)
const AUTH_ROUTES: readonly string[] = ["/login", "/register"] as const;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session-token")?.value;

  // 1. Verifier si la route est protegee
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 2. Verifier si c'est une route d'authentification
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  // 3. Redirection : utilisateur non authentifie sur route protegee
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    // Sauvegarder l'URL de destination pour rediriger apres login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Redirection : utilisateur authentifie sur page de login
  if (isAuthRoute && sessionToken) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 5. Continuer avec la requete et ajouter des headers de securite
  const response = NextResponse.next();

  // Headers de securite
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  // Identifiant unique de requete pour le tracing
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  response.headers.set("X-Request-Id", requestId);

  return response;
}

// Configuration du matcher — exclut les fichiers statiques et API
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico (icone du site)
     * - api/* (routes API gerees separement)
     * - Fichiers publics (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/).*)",
  ],
};
```

---

## Étape 2 : Page de login

```tsx
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Recuperer l'URL de callback si elle existe
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  function handleLogin(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError("");

    // Validation simple
    if (!email || !password) {
      setError("Email et mot de passe requis");
      return;
    }

    // Simuler l'authentification en posant un cookie
    document.cookie = `session-token=fake-jwt-token-${Date.now()}; path=/; max-age=3600; SameSite=Lax`;

    // Rediriger vers la page demandee ou le dashboard
    router.push(callbackUrl);
    router.refresh(); // Force le middleware a re-evaluer
  }

  return (
    <div style={{ maxWidth: "400px", margin: "4rem auto", padding: "2rem" }}>
      <h1>Connexion</h1>

      {error && (
        <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>
      )}

      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div>
          <label htmlFor="email" style={{ display: "block", marginBottom: "0.25rem" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom@exemple.fr"
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: "block", marginBottom: "0.25rem" }}>
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "0.75rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
```

---

## Étape 3 : Page dashboard (protegee)

```tsx
// src/app/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  function handleLogout(): void {
    // Supprimer le cookie de session
    document.cookie = "session-token=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#e00",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Deconnexion
        </button>
      </div>

      <p>Bienvenue sur votre tableau de bord. Cette page est protegee par le middleware.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        {[
          { label: "Taches", value: "12" },
          { label: "Projets", value: "3" },
          { label: "Notifications", value: "5" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "1.5rem",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>
              {stat.value}
            </p>
            <p style={{ color: "#666", margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Étape 4 : Pages protegees supplementaires

```tsx
// src/app/profile/page.tsx
export default function ProfilePage() {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem" }}>
      <h1>Mon profil</h1>
      <p>Page protegee par le middleware. Accessible uniquement avec un cookie de session.</p>
    </div>
  );
}
```

```tsx
// src/app/settings/page.tsx
export default function SettingsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem" }}>
      <h1>Parametres</h1>
      <p>Page protegee par le middleware. Accessible uniquement avec un cookie de session.</p>
    </div>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **Le fichier `middleware.ts` doit etre à la racine du projet** (dans `src/` si tu utilises `src/`). Il ne fonctionne pas s'il est dans un sous-dossier.

2. **Le middleware s'exécuté sur le Edge Runtime** : pas d'acces a Node.js APIs completes (pas de `fs`, pas de `Buffer` natif). Seules les Web APIs sont disponibles.

3. **`NextResponse.next()` est obligatoire** pour continuer la requête. Sans lui, la requête est bloquee.

4. **Le matcher utilise une regex** : les parentheses et backslashes doivent etre echappes correctement.

5. **`router.refresh()`** est nécessaire après avoir modifie les cookies pour que le middleware re-évalué la requête lors de la prochaine navigation.

6. **Les cookies poses cote client** (`document.cookie`) sont visibles par le middleware car ils sont envoyes avec chaque requête HTTP.

7. **Le `callbackUrl`** permet de rediriger l'utilisateur vers la page qu'il voulait visiter après la connexion. C'est un pattern standard en authentification.

8. **`SameSite=Lax`** est recommande pour les cookies de session : il empeche l'envoi du cookie lors de requêtes cross-site (protection CSRF partielle).
