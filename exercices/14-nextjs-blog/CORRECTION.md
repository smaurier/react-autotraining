# Correction — Exercice 14 : Blog Next.js

---

## Étape 1 : Types TypeScript

```ts
// src/types/post.ts

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string; // format ISO 8601
  tags: string[];
}
```

---

## Étape 2 : Donnees statiques

```json
// src/data/posts.json
[
  {
    "slug": "introduction-react-19",
    "title": "Introduction a React 19",
    "excerpt": "Decouvrez les nouveautes de React 19 : Server Components, Actions et plus.",
    "content": "React 19 marque un tournant majeur dans l'ecosysteme React. Les Server Components deviennent la norme, les Actions simplifient la gestion des formulaires, et le compilateur React optimise automatiquement les re-renders.\n\nParmi les nouveautes cles :\n- **Server Components** par defaut\n- **Actions** pour les mutations\n- **use()** pour lire les Promises et le Context\n- **Metadata API** amelioree\n\nCes changements permettent de construire des applications plus rapides avec moins de code client.",
    "author": "Sophie Martin",
    "date": "2025-01-15",
    "tags": ["react", "javascript", "frontend"]
  },
  {
    "slug": "nextjs-15-app-router",
    "title": "Next.js 15 et le App Router",
    "excerpt": "Le App Router de Next.js 15 change la facon de structurer vos applications.",
    "content": "Next.js 15 consolide le App Router comme la methode recommandee pour construire des applications React. Le systeme de fichiers definit les routes, les layouts persistent entre les navigations, et les Server Components sont utilises par defaut.\n\nPoints cles :\n- `params` est desormais une Promise\n- Turbopack est stable pour le dev\n- Le cache est moins agressif par defaut\n- Les Server Actions sont stables",
    "author": "Pierre Dupont",
    "date": "2025-02-01",
    "tags": ["nextjs", "react", "fullstack"]
  },
  {
    "slug": "typescript-strict-mode",
    "title": "TypeScript strict : pourquoi l'activer",
    "excerpt": "Le mode strict de TypeScript detecte des bugs avant meme l'execution.",
    "content": "Activer le mode strict dans TypeScript active un ensemble de verifications supplementaires : strictNullChecks, noImplicitAny, strictFunctionTypes, etc. Cela peut sembler contraignant au debut, mais les benefices sont enormes en termes de fiabilite du code.\n\nChaque option strict ajoutee est un filet de securite supplementaire qui empeche des categories entieres de bugs.",
    "author": "Sophie Martin",
    "date": "2025-02-10",
    "tags": ["typescript", "bonnes-pratiques"]
  },
  {
    "slug": "tailwind-css-4",
    "title": "Tailwind CSS v4 : les nouveautes",
    "excerpt": "Tailwind CSS v4 apporte un nouveau moteur et une configuration simplifiee.",
    "content": "Tailwind CSS v4 est une reecriture complete du moteur. Le fichier de configuration `tailwind.config.js` est remplace par des directives CSS natives avec `@theme`. Les performances sont considerablement ameliorees grace a un nouveau compilateur en Rust.\n\nLes classes utilitaires restent les memes, mais la configuration est plus intuitive et la compilation plus rapide.",
    "author": "Marie Leroy",
    "date": "2025-03-05",
    "tags": ["css", "tailwind", "frontend"]
  },
  {
    "slug": "tests-react-testing-library",
    "title": "Tester vos composants avec React Testing Library",
    "excerpt": "React Testing Library encourage des tests centres sur l'utilisateur.",
    "content": "React Testing Library (RTL) part du principe que les tests doivent interagir avec les composants comme le ferait un utilisateur. On cherche les elements par leur role, leur texte ou leur label, pas par leur classe CSS ou leur structure interne.\n\nCette approche rend les tests plus resilients aux refactorisations et garantit que l'experience utilisateur est correcte.",
    "author": "Pierre Dupont",
    "date": "2025-03-15",
    "tags": ["tests", "react", "qualite"]
  }
]
```

---

## Étape 3 : Layout racine

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Mon Blog React",
    template: "%s | Mon Blog React",
  },
  description: "Blog technique sur React 19, Next.js 15 et TypeScript",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {/* Header avec navigation */}
        <header style={{ borderBottom: "1px solid #eee", padding: "1rem" }}>
          <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
              Mon Blog
            </Link>
            <Link href="/blog">Articles</Link>
          </nav>
        </header>

        {/* Contenu principal */}
        <main style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid #eee", padding: "1rem", textAlign: "center" }}>
          <p>&copy; 2025 Mon Blog React. Tous droits reserves.</p>
        </footer>
      </body>
    </html>
  );
}
```

---

## Étape 4 : Page d'accueil

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <h1>Bienvenue sur Mon Blog React</h1>
      <p>
        Decouvrez des articles sur React 19, Next.js 15, TypeScript et les
        bonnes pratiques du developpement frontend moderne.
      </p>
      <Link
        href="/blog"
        style={{
          display: "inline-block",
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#0070f3",
          color: "white",
          borderRadius: "4px",
          textDecoration: "none",
        }}
      >
        Voir les articles
      </Link>
    </div>
  );
}
```

---

## Étape 5 : Page liste du blog

```tsx
// src/app/blog/page.tsx
import Link from "next/link";
import type { Post } from "@/types/post";
import postsData from "@/data/posts.json";

// Cast type-safe des donnees JSON
const posts: Post[] = postsData;

export default function BlogPage() {
  // Trier par date decroissante
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <h1>Articles</h1>
      <p>{posts.length} articles disponibles</p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {sortedPosts.map((post) => (
          <li
            key={post.slug}
            style={{
              marginBottom: "2rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid #eee",
            }}
          >
            <h2>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              Par {post.author} · {new Date(post.date).toLocaleDateString("fr-FR")}
            </p>
            <p>{post.excerpt}</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "0.2rem 0.5rem",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Étape 6 : Page detail avec route dynamique

```tsx
// src/app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { Post } from "@/types/post";
import postsData from "@/data/posts.json";

const posts: Post[] = postsData;

// Typage des props — params est une Promise dans Next.js 15
interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

// Metadata dynamiques pour le SEO
export async function generateMetadata({
  params,
}: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return { title: "Article introuvable" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

// Pre-rendu statique de tous les slugs connus
export function generateStaticParams(): { slug: string }[] {
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }: BlogPostProps) {
  // Await obligatoire dans Next.js 15
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  // Declenche la page not-found.tsx
  if (!post) {
    notFound();
  }

  return (
    <article>
      <Link href="/blog" style={{ color: "#0070f3" }}>
        &larr; Retour aux articles
      </Link>

      <h1 style={{ marginTop: "1rem" }}>{post.title}</h1>

      <p style={{ color: "#666" }}>
        Par <strong>{post.author}</strong> ·{" "}
        {new Date(post.date).toLocaleDateString("fr-FR")}
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        {post.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: "0.2rem 0.5rem",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px",
              fontSize: "0.8rem",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Contenu de l'article */}
      <div style={{ lineHeight: 1.8 }}>
        {post.content.split("\n\n").map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
```

---

## Étape 7 : Loading et Not Found

```tsx
// src/app/blog/loading.tsx
export default function BlogLoading() {
  return (
    <div>
      <div
        style={{
          width: "60%",
          height: "2rem",
          backgroundColor: "#f0f0f0",
          borderRadius: "4px",
          marginBottom: "1rem",
        }}
      />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            border: "1px solid #f0f0f0",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "80%",
              height: "1.5rem",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px",
              marginBottom: "0.5rem",
            }}
          />
          <div
            style={{
              width: "40%",
              height: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              marginBottom: "0.5rem",
            }}
          />
          <div
            style={{
              width: "100%",
              height: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h1 style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>404</h1>
      <h2>Page introuvable</h2>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        La page que vous cherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#0070f3",
          color: "white",
          borderRadius: "4px",
          textDecoration: "none",
        }}
      >
        Retour a l&apos;accueil
      </Link>
    </div>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **`params` est une Promise dans Next.js 15** : il faut `await params` avant d'acceder a `slug`. C'est un changement majeur par rapport a Next.js 14.

2. **`notFound()` ne retourne pas** : après l'appel a `notFound()`, l'exécution continue. TypeScript ne sait pas que c'est un `never`. Mettre le `notFound()` dans un bloc `if` suivi d'un `return` implicite.

3. **`generateMetadata` doit aussi await `params`** : même contrainte que le composant page.

4. **Le layout racine doit contenir `<html>` et `<body>`** : c'est obligatoire, sinon Next.js généré une erreur.

5. **Les imports JSON necessitent `resolveJsonModule: true`** dans `tsconfig.json` (active par defaut avec `create-next-app`).

6. **`generateStaticParams`** est optionnel mais recommande pour le pre-rendu statique. Sans lui, les pages dynamiques sont rendues à la demandé.

7. **`metadata.title.template`** permet d'avoir un format coherent pour les titres de page (ex: "Mon Article | Mon Blog React").

8. **Server Components par defaut** : les fichiers `page.tsx` et `layout.tsx` sont des Server Components. Pas besoin de `'use client'` ici car aucune interactivite (pas de `useState`, `onClick`, etc.).
