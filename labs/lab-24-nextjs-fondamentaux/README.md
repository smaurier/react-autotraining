# Lab 24 — Next.js : fondamentaux et App Router

> **Outcome :** à la fin, tu sais monter la zone admin TribuZen de zéro avec l'App Router de Next.js 15 : groupe de routes, layout à sidebar, route statique, route dynamique avec `params` awaited, `loading.tsx` et metadata.
> **Vrai outil :** Next.js 15 réel (`create-next-app`), lancé avec `npm run dev`. Aucun harnais simulé.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur). Tu vérifies en ouvrant les URLs dans le navigateur.

## Énoncé

Tu démarres la migration de l'admin TribuZen vers Next.js 15. On veut, dans un vrai projet App Router, une zone admin avec sidebar partagée, la liste des familles, la fiche d'une famille, un état de chargement et des metadata propres.

Crée le projet :

```bash
npx create-next-app@latest tribuzen-admin --typescript --tailwind --app --src-dir --eslint
cd tribuzen-admin
npm run dev
```

Cible finale de l'arborescence de routing :

```
src/app/
├── layout.tsx                    # racine (déjà généré) : ajoute metadata globale
├── (admin)/
│   ├── layout.tsx                # sidebar + main (persistant)
│   ├── familles/
│   │   ├── page.tsx              # /familles
│   │   ├── loading.tsx           # squelette
│   │   └── [id]/
│   │       └── page.tsx          # /familles/:id
```

Contraintes :
- La sidebar doit rester montée quand on passe de `/familles` à `/familles/1` (layout, pas duplication).
- `/familles/[id]` doit lire `id` **avec `await`** (Next 15).
- Chaque page porte sa `metadata` ; la fiche utilise `generateMetadata` dynamique.
- Les données peuvent être en dur (tableau) — pas besoin d'API réelle pour ce lab.

## Étapes (en friction)

1. Génère le projet et supprime le contenu de démo de `src/app/page.tsx`.
2. Ajoute une `metadata` globale dans `src/app/layout.tsx` (titre `TribuZen Admin`).
3. Crée le groupe `(admin)` et son `layout.tsx` : `<aside>` avec deux `<Link>` (Familles, Événements) + `<main>{children}</main>`. Rappel : import de `Link` depuis `next/link`.
4. Crée `(admin)/familles/page.tsx` : liste en dur de 3 familles, chacune un `<Link href={`/familles/${f.id}`}>`. Ajoute une `metadata` statique.
5. Crée `(admin)/familles/loading.tsx` : trois barres squelette (`aria-busy`).
6. Crée `(admin)/familles/[id]/page.tsx` : type `params: Promise<{ id: string }>`, `await params`, affiche la famille. Ajoute `generateMetadata` qui `await params` et met le nom dans le titre.
7. Vérifie dans le navigateur : `/familles`, clic sur une famille → `/familles/1`, la sidebar ne clignote pas. Regarde le titre de l'onglet changer.
8. (Bonus friction) Ajoute un délai artificiel (`await new Promise(r => setTimeout(r, 800))`) dans la fiche pour VOIR le `loading.tsx` s'afficher.

## Corrigé complet commenté

```tsx
// ─── src/app/layout.tsx — racine (html + body généré, on ajoute la metadata) ───
import type { Metadata } from 'next';

// metadata globale : sert de titre par défaut, fusionnée avec celle des pages
export const metadata: Metadata = {
  title: 'TribuZen Admin',
  description: "Console d'administration TribuZen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// ─── src/app/(admin)/layout.tsx — coquille admin partagée ───
// Le groupe (admin) n'ajoute PAS de segment d'URL : /familles reste /familles.
// Ce layout enveloppe toutes les pages du groupe et PERSISTE entre navigations.
import Link from 'next/link'; // navigation client + prefetch, jamais <a> en interne

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <nav>
          <Link href="/familles">Familles</Link>
          <Link href="/evenements">Événements</Link>
        </nav>
      </aside>
      {/* seul children change d'une page à l'autre — la sidebar ne se re-monte pas */}
      <main className="admin-main">{children}</main>
    </div>
  );
}
```

```tsx
// ─── src/app/(admin)/familles/page.tsx — /familles ───
import type { Metadata } from 'next';
import Link from 'next/link';

// metadata statique : contenu fixe, un simple objet exporté
export const metadata: Metadata = {
  title: 'Familles — TribuZen Admin',
  description: 'Liste des familles inscrites',
};

// données en dur pour le lab (en vrai : fetch dans un Server Component, module 25)
const FAMILIES = [
  { id: '1', name: 'Famille Durand' },
  { id: '2', name: 'Famille Nguyen' },
  { id: '3', name: 'Famille Bakary' },
];

export default function FamilyListPage() {
  return (
    <section>
      <h1>Familles</h1>
      <ul>
        {FAMILIES.map((f) => (
          <li key={f.id}>
            {/* lien dynamique vers le segment [id] */}
            <Link href={`/familles/${f.id}`}>{f.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// ─── src/app/(admin)/familles/loading.tsx — squelette ───
// Affiché automatiquement (Suspense) tant que la page enfant n'a pas résolu.
// Aucun useState(isLoading) à câbler : c'est la convention de fichier qui l'active.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des familles">
      <div className="skeleton__line" />
      <div className="skeleton__line" />
      <div className="skeleton__line" />
    </div>
  );
}
```

```tsx
// ─── src/app/(admin)/familles/[id]/page.tsx — /familles/:id ───
import type { Metadata } from 'next';
import { notFound } from 'next/navigation'; // App Router : next/navigation, PAS next/router

const FAMILIES: Record<string, { name: string; membersCount: number }> = {
  '1': { name: 'Famille Durand', membersCount: 4 },
  '2': { name: 'Famille Nguyen', membersCount: 3 },
  '3': { name: 'Famille Bakary', membersCount: 5 },
};

// En Next 15, params est une Promise → le type le reflète
interface FamilyPageProps {
  params: Promise<{ id: string }>;
}

// metadata dynamique : le titre dépend de params, donc await params
export async function generateMetadata({ params }: FamilyPageProps): Promise<Metadata> {
  const { id } = await params;
  const family = FAMILIES[id];
  if (!family) return { title: 'Famille introuvable — TribuZen Admin' };
  return { title: `${family.name} — TribuZen Admin` };
}

export default async function FamilyDetailPage({ params }: FamilyPageProps) {
  // délai artificiel du bonus pour voir loading.tsx s'afficher
  await new Promise((r) => setTimeout(r, 800));

  const { id } = await params; // Next 15 : await obligatoire
  const family = FAMILIES[id];

  if (!family) notFound(); // rend le not-found le plus proche

  return (
    <article>
      <h1>{family.name}</h1>
      <p>{family.membersCount} membres</p>
    </article>
  );
}
```

**Vérifications attendues :**
- `/familles` liste les 3 familles ; l'onglet affiche « Familles — TribuZen Admin ».
- Clic sur une famille → `/familles/1`, le squelette apparaît ~800 ms, puis la fiche ; l'onglet devient « Famille Durand — TribuZen Admin ».
- La sidebar reste immobile pendant la navigation (layout persistant).
- Une URL inconnue comme `/familles/99` déclenche le 404 via `notFound()`.

## Variante J+30 (fading)

Reprends le même objectif, mais **sans regarder le corrigé** et avec deux contraintes :
1. Ajoute une route `/familles/[id]` qui lit AUSSI `searchParams` (`?onglet=membres`) — donc un second `await searchParams` — et affiche l'onglet actif (défaut `apercu`).
2. Ajoute un `error.tsx` dans `(admin)/familles/` : rappelle-toi qu'il doit être `'use client'` et recevoir `{ error, reset }` avec un bouton « Réessayer ». Provoque une erreur volontaire (`throw new Error('boom')` conditionnel) pour le déclencher.

Objectif de rappel : reproduire params/searchParams awaited + la convention `error.tsx` client de mémoire, en moins de 25 minutes.

## Application TribuZen

Porte ce squelette dans le vrai dépôt `smaurier/tribuzen-admin` :
- Crée la branche `feat/admin-app-router`.
- Reproduis `(admin)/layout.tsx` avec la vraie sidebar (composant `AdminSidebar` du design system) et les vraies entrées de navigation.
- Remplace les données en dur de `/familles` par un vrai fetch dans le Server Component (préparé au module 25) ; garde le `loading.tsx` squelette.
- Commit : `feat(admin): squelette App Router — groupe (admin), route familles + fiche dynamique, loading & metadata`.
- Ouvre la PR et vérifie en preview Vercel que la navigation client (Link/prefetch) fonctionne et que les titres d'onglets sont corrects.
