# Cours 39 — Sécurité front-end en React et Next.js

> **Objectif** : Connaître les principales vulnérabilités web (XSS, CSRF, injection) et les mécanismes de protection spécifiques à React et Next.js. Comprendre la gestion sécurisée des variables d'environnement, les CSP headers, le rate limiting, et disposer d'une checklist sécurité pour les projets ESN. Comparer avec les protections Angular (DomSanitizer) et les bonnes pratiques communes à tous les frameworks.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre auth() et useSession() dans Auth.js ?</summary>

`auth()` est utilisé côté serveur (Server Components, Server Actions, middleware) et retourne la session directement. `useSession()` est un hook client qui nécessite un `SessionProvider` dans le layout et retourne `{ data: session, status }`.
</details>

<details>
<summary>2. Comment protéger une route /admin pour qu'elle soit accessible uniquement aux admins ?</summary>

Deux niveaux : (1) le middleware vérifie `req.auth?.user?.role === "admin"` et redirige sinon, (2) la page elle-même appelle `requireRole("admin")` qui vérifie le rôle dans la session serveur. La double vérification assure une protection robuste.
</details>

<details>
<summary>3. Pourquoi le middleware Next.js est-il plus sécurisé que les guards Angular côté client ?</summary>

Le middleware s'exécute au niveau HTTP (Edge Runtime), avant que le code JavaScript ne soit envoyé au client. Un utilisateur non autorisé ne reçoit jamais le code de la page protégée. Les guards Angular s'exécutent côté client — le code JavaScript est déjà téléchargé, la protection est contournable.
</details>

---

## Analogie

La sécurité web, c'est comme la **sécurité d'un aéroport** : il y a plusieurs couches. Le contrôle des passeports (authentification), la fouille des bagages (validation des entrées), le détecteur de métaux (CSP headers), la zone réservée aux équipages (RBAC). Chaque couche a un rôle spécifique, et aucune ne suffit seule. React fournit certaines protections automatiquement (comme l'échappement XSS), mais vous devez configurer les autres vous-même.

---

## Théorie

### 1. XSS : React protège par défaut (presque)

React échappe automatiquement toutes les expressions JSX :

```tsx
// ✅ SAFE — React échappe le HTML automatiquement
const userInput = '<script>alert("XSS")</script>';
return <p>{userInput}</p>;
// Rendu HTML : &lt;script&gt;alert("XSS")&lt;/script&gt;
```

#### La faille : dangerouslySetInnerHTML

```tsx
// ❌ DANGER — injection HTML directe, jamais avec des données utilisateur
const htmlFromUser = '<img src="x" onerror="alert(document.cookie)">';
return <div dangerouslySetInnerHTML={{ __html: htmlFromUser }} />;
```

```tsx
// ✅ Si vous DEVEZ injecter du HTML (contenu CMS, markdown rendu) :
// 1. Utiliser une bibliothèque de sanitization
import DOMPurify from "dompurify";

function SafeHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "li"],
    ALLOWED_ATTR: ["href", "target"],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

#### Autres vecteurs XSS en React

```tsx
// ❌ DANGER — URL javascript:
const userUrl = "javascript:alert('XSS')";
return <a href={userUrl}>Cliquez</a>;

// ✅ Valider les URLs
function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  const isValid = url.startsWith("https://") || url.startsWith("http://");
  if (!isValid) return <span>{children}</span>;
  return <a href={url} rel="noopener noreferrer">{children}</a>;
}
```

> **Comparaison Angular** : Angular utilise `DomSanitizer` qui nettoie automatiquement les URLs et le HTML injecté via `[innerHTML]`. React n'a pas d'équivalent intégré — c'est à vous d'utiliser DOMPurify.

### 2. CSP Headers dans Next.js

Les Content Security Policy headers contrôlent quelles ressources le navigateur peut charger :

```tsx
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",  // Next.js a besoin d'inline scripts
              "style-src 'self' 'unsafe-inline'",   // Tailwind inline styles
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.example.com",
              "frame-ancestors 'none'",               // Anti-clickjacking
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

> **Note** : en production, remplacez `'unsafe-inline'` pour les scripts par un nonce. Next.js supporte les nonces CSP via le middleware.

### 3. CSRF : SameSite cookies et tokens

React + Next.js est naturellement protégé contre CSRF si vous utilisez correctement les cookies :

```tsx
// ✅ Auth.js configure automatiquement les cookies avec SameSite=Lax
// Pas d'action supplémentaire nécessaire pour les Server Actions

// Pour les API Routes custom qui modifient des données :
// Option 1 — Vérifier l'en-tête Origin
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  // ... traiter la requête
}
```

```tsx
// Option 2 — Double submit cookie pattern
// Le token CSRF est envoyé dans un cookie ET dans un header
// Le serveur vérifie que les deux correspondent
```

> **Comparaison Angular** : Angular HttpClient envoie automatiquement un header `X-XSRF-TOKEN` lu depuis un cookie `XSRF-TOKEN`. En Next.js avec Server Actions, la protection CSRF est intégrée (les actions sont liées à l'origine).

### 4. Variables d'environnement : le piège NEXT_PUBLIC_

```bash
# .env.local

# ✅ Variables SERVEUR UNIQUEMENT (jamais exposées au client)
DATABASE_URL=postgresql://user:password@host/db
AUTH_SECRET=super-secret-key
STRIPE_SECRET_KEY=sk_live_xxx
API_KEY=xxx

# ⚠️ Variables EXPOSEES AU CLIENT (dans le bundle JavaScript !)
NEXT_PUBLIC_APP_URL=https://monapp.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxx
NEXT_PUBLIC_ANALYTICS_ID=G-XXXXXX
```

**Règle absolue :**

| Préfixe | Accessible côté | Usage |
|---------|----------------|-------|
| (aucun) | Serveur uniquement | Secrets, clés API, URLs de BDD |
| `NEXT_PUBLIC_` | Client ET serveur | Clés publiques uniquement |

```tsx
// ❌ DANGER — le secret est dans le bundle client !
// Si vous nommez une variable NEXT_PUBLIC_API_SECRET, elle est visible
// dans le code source JavaScript téléchargé par le navigateur

// ✅ Vérification au démarrage du serveur
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// Valide au démarrage — fail fast si manquant
export const env = envSchema.parse(process.env);
```

### 5. Rate limiting avec middleware

```tsx
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Store simple en mémoire (en production, utiliser Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

export function middleware(request: NextRequest) {
  // Rate limiting sur les routes API
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez plus tard." },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}
```

> **En production**, utilisez une solution de rate limiting comme `@upstash/ratelimit` avec Redis pour un store distribué compatible avec le Edge Runtime.

### 6. Autres bonnes pratiques de sécurité

#### Validation des entrées (Server Actions)

```tsx
"use server";

import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
});

export async function createTask(formData: FormData) {
  // ✅ TOUJOURS valider côté serveur, même si validé côté client
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // ... insérer en base
}
```

#### Protection des images (Next.js Image)

```tsx
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    // ✅ Limiter les domaines autorisés pour les images externes
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.example.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};
```

#### Dépendances npm

```bash
# Vérifier les vulnérabilités connues
npm audit

# Corriger automatiquement
npm audit fix

# En CI, échouer si des vulnérabilités critiques existent
npm audit --audit-level=high
```

### 7. Checklist sécurité pour projets ESN React

| Catégorie | Vérification | Statut |
|-----------|-------------|--------|
| **XSS** | Pas de `dangerouslySetInnerHTML` avec données utilisateur | [ ] |
| **XSS** | URLs utilisateur validées (pas de `javascript:`) | [ ] |
| **XSS** | DOMPurify si injection HTML nécessaire | [ ] |
| **CSRF** | Server Actions avec validation Origin | [ ] |
| **CSRF** | Cookies SameSite=Lax (Auth.js par défaut) | [ ] |
| **Env** | Aucun secret avec préfixe `NEXT_PUBLIC_` | [ ] |
| **Env** | Validation Zod des variables d'environnement | [ ] |
| **Headers** | CSP configuré dans next.config.ts | [ ] |
| **Headers** | X-Frame-Options: DENY | [ ] |
| **Headers** | X-Content-Type-Options: nosniff | [ ] |
| **Auth** | Middleware pour routes protégées | [ ] |
| **Auth** | Double vérification (middleware + page) | [ ] |
| **Input** | Validation Zod côté serveur sur toutes les entrées | [ ] |
| **Deps** | `npm audit` sans vulnérabilités critiques | [ ] |
| **Images** | `remotePatterns` configuré (pas de wildcard) | [ ] |
| **Rate limit** | Rate limiting sur les API Routes | [ ] |

---

## Pratique

### Exercice : audit de sécurité d'un code existant

Le code suivant contient plusieurs failles de sécurité. Identifiez-les et proposez des corrections :

```tsx
// app/profile/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Anonyme";
  const website = searchParams.get("website") || "#";
  const bio = searchParams.get("bio") || "";

  return (
    <div>
      <h1>Profil de {name}</h1>
      <a href={website}>Site web</a>
      <div dangerouslySetInnerHTML={{ __html: bio }} />
      <img src={`https://api.example.com/avatar?token=${process.env.NEXT_PUBLIC_API_SECRET}`} />
    </div>
  );
}
```

<details>
<summary>Voir la solution</summary>

**Failles identifiées :**

1. **XSS via `dangerouslySetInnerHTML`** : `bio` vient de l'URL, un attaquant peut injecter `<script>` ou `<img onerror=...>`
2. **XSS via `href`** : `website` peut contenir `javascript:alert(...)`
3. **Secret exposé** : `NEXT_PUBLIC_API_SECRET` est dans le bundle client (ne devrait pas avoir le préfixe `NEXT_PUBLIC_`)
4. **Pas de validation** des entrées utilisateur

**Code corrigé :**

```tsx
// app/profile/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name")?.slice(0, 100) || "Anonyme";
  const website = searchParams.get("website") || "#";
  const bio = searchParams.get("bio") || "";

  // ✅ Sanitizer le HTML
  const safeBio = DOMPurify.sanitize(bio, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
  });

  // ✅ Valider l'URL
  const safeWebsite = isValidUrl(website) ? website : "#";

  return (
    <div>
      <h1>Profil de {name}</h1>
      <a href={safeWebsite} rel="noopener noreferrer">Site web</a>
      <div dangerouslySetInnerHTML={{ __html: safeBio }} />
      {/* ✅ L'avatar devrait être chargé côté serveur avec un token non-public */}
      <img src="/api/avatar" alt={`Avatar de ${name}`} />
    </div>
  );
}
```

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| XSS | React échappe par défaut, mais `dangerouslySetInnerHTML` et `href` sont des vecteurs |
| CSP | Headers dans `next.config.ts` pour contrôler les ressources chargées |
| CSRF | SameSite cookies (Auth.js) + validation Origin pour les API custom |
| Variables d'env | `NEXT_PUBLIC_` = visible par le client, jamais de secrets |
| Rate limiting | Middleware + Redis (@upstash/ratelimit) en production |
| Validation | Zod côté serveur sur TOUTES les entrées, même si validées côté client |
| Checklist | 16 points à vérifier avant chaque mise en production |

> **Prochain cours** : [Cours 40 — Pipeline CI avec GitHub Actions](../11-cicd-deploiement/01-pipeline-ci.md)
