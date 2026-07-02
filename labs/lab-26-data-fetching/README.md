# Lab 26 — Data fetching dans Next.js (admin TribuZen)

> **Outcome :** à la fin, tu sais construire une page `/familles` avec cache ISR contrôlé (Next 15) et une page `/familles/:id` en fetch parallèle streamé, dans une vraie app Next.js 15 App Router.
> **Vrai outil :** Next.js 15 (App Router) + React 19. Serveur réel (`next dev`), pas de harnais simulé.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur).

## Pré-requis

Une app Next.js 15 (App Router, TypeScript). Si tu pars de zéro :

```bash
npx create-next-app@latest tribuzen-admin --typescript --app --eslint
cd tribuzen-admin
npm run dev
```

Comme source de données, on utilise une fausse API publique (pas de backend à écrire) : `https://jsonplaceholder.typicode.com`. On fait comme si `/users` = familles et `/users/:id/... ` = détails. L'important est le **contrôle du cache**, pas la forme exacte des données.

## Énoncé

Construis deux routes dans l'admin TribuZen :

1. **`/familles`** — liste des familles.
   - Fetch de `https://jsonplaceholder.typicode.com/users`.
   - Cache **ISR de 60 secondes** + tag `"familles"` (revalidation à la demande possible plus tard).
   - Un `loading.tsx` qui s'affiche pendant le chargement.
   - Chaque famille est un lien vers `/familles/:id`.

2. **`/familles/:id`** — détail d'une famille.
   - Fetch **en parallèle** de l'entête (`/users/:id`) et des « membres » (`/posts?userId=:id`) via deux `<Suspense>` frères.
   - Chaque bloc a son propre fallback et streame indépendamment.
   - `params` correctement traité (rappel : c'est une `Promise` en Next 15).

**Contrainte Next 15 à respecter (le cœur du lab) :** n'oublie pas qu'un `fetch` **n'est pas caché par défaut**. Tu dois demander le cache explicitement là où tu le veux, et pouvoir expliquer au coach pourquoi telle route est cachée et telle autre non.

## Étapes (en friction)

1. Crée `app/familles/page.tsx` : Server Component `async`, fetch de la liste **avec** `next: { revalidate: 60, tags: ["familles"] }`. Type l'interface `Famille`. Rends une `<ul>` de liens.
2. Crée `app/familles/loading.tsx` : un fallback simple (texte ou skeleton).
3. Lance `next dev`, recharge `/familles` plusieurs fois. Note dans le terminal si le fetch part à chaque fois ou non. **Puis retire l'option `next`** et recharge : observe la différence (dynamique vs caché).
4. Crée `app/familles/[id]/page.tsx` : `await params`, puis deux composants `async` `EnteteFamille` et `MembresFamille`, chacun dans son `<Suspense>`.
5. Ajoute un délai artificiel dans `MembresFamille` (`await new Promise((r) => setTimeout(r, 2000))`) et vérifie que l'entête s'affiche **avant** les membres (streaming visible).
6. Explique à voix haute : pourquoi la liste est-elle en ISR 60 s, et pas en `force-cache` ni en dynamique ?

## Corrigé complet commenté

```tsx
// app/familles/page.tsx — LISTE (ISR 60 s + tag)
interface Famille {
  id: number;
  name: string; // "nom" de la famille dans notre mapping
  email: string;
}

export default async function FamillesPage() {
  // Next 15 : SANS l'option next, ce fetch ne serait PAS caché (route dynamique).
  // On veut du cache ici (liste lue souvent) → ISR 60 s.
  // tags: prépare l'invalidation à la demande via revalidateTag (module 27).
  const res = await fetch("https://jsonplaceholder.typicode.com/users", {
    next: { revalidate: 60, tags: ["familles"] },
  });

  if (!res.ok) {
    // Une erreur ici sera attrapée par un error.tsx (ou remonte au boundary parent).
    throw new Error("Échec du chargement des familles");
  }

  const familles: Famille[] = await res.json();

  return (
    <section>
      <h1>Familles ({familles.length})</h1>
      <ul>
        {familles.map((f) => (
          <li key={f.id}>
            {/* lien vers le détail — déclenche la route [id] */}
            <a href={`/familles/${f.id}`}>{f.name}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// app/familles/loading.tsx — fallback automatique de TOUTE la route /familles
// Next.js enveloppe page.tsx dans un <Suspense fallback={<Loading />}>.
export default function Loading() {
  return <p aria-busy="true">Chargement des familles…</p>;
}
```

```tsx
// app/familles/[id]/page.tsx — DÉTAIL (fetch parallèle + streaming)
import { Suspense } from "react";

interface Famille {
  id: number;
  name: string;
  email: string;
}
interface Membre {
  id: number;
  title: string; // on mappe un "post" en membre pour la démo
}

// Fetcher 1 — entête. Indépendant du fetcher 2.
async function EnteteFamille({ id }: { id: string }) {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`, {
    next: { revalidate: 60, tags: [`famille-${id}`] },
  });
  const famille: Famille = await res.json();
  return (
    <header>
      <h1>{famille.name}</h1>
      <p>{famille.email}</p>
    </header>
  );
}

// Fetcher 2 — "membres". Volontairement ralenti pour VOIR le streaming.
async function MembresFamille({ id }: { id: string }) {
  // Délai artificiel : l'entête doit s'afficher avant ce bloc.
  await new Promise((r) => setTimeout(r, 2000));

  const res = await fetch(
    `https://jsonplaceholder.typicode.com/posts?userId=${id}`,
    { next: { revalidate: 60, tags: [`membres-${id}`] } }
  );
  const membres: Membre[] = await res.json();
  return (
    <ul>
      {membres.map((m) => (
        <li key={m.id}>{m.title}</li>
      ))}
    </ul>
  );
}

export default async function FamillePage({
  params,
}: {
  params: Promise<{ id: string }>; // Next 15 : params est une Promise
}) {
  const { id } = await params;

  // Deux <Suspense> frères : React lance les deux rendus en parallèle,
  // donc les deux fetch partent en même temps. Chaque bloc streame dès qu'il est prêt.
  return (
    <div>
      <Suspense fallback={<p>Chargement de la famille…</p>}>
        <EnteteFamille id={id} />
      </Suspense>
      <Suspense fallback={<p>Chargement des membres…</p>}>
        <MembresFamille id={id} />
      </Suspense>
    </div>
  );
}
```

**Ce que tu dois pouvoir expliquer au coach :**
- Pourquoi la liste est en **ISR 60 s** et non en `force-cache` : les familles changent (ajouts), on veut une fraîcheur bornée sans re-fetcher à chaque visite.
- Pourquoi ce n'est pas laissé **dynamique** (sans option) : la liste est lue en boucle, le cache 60 s économise des allers-retours.
- Pourquoi les deux blocs du détail sont **parallèles** : entête et membres sont indépendants — pas de raison d'attendre l'un pour l'autre.

## Variante J+30 (fading)

Reprends le lab **sans regarder le corrigé**, en 25 minutes, avec deux contraintes ajoutées :
1. Sur `/familles/:id`, combine entête **et** membres dans **un seul** composant `async` en utilisant `Promise.all` (au lieu de deux `<Suspense>`). Explique le compromis : plus de parallélisme dans un seul bloc, mais tu perds le streaming section par section (la page attend le plus lent des deux).
2. Ajoute un `error.tsx` sur `/familles` qui affiche un message propre quand le fetch échoue (teste en changeant l'URL vers un domaine invalide).

## Application TribuZen

Porte le pattern dans le vrai `smaurier/tribuzen-admin` :
- Remplace l'API `jsonplaceholder` par les vrais endpoints TribuZen (`/api/familles`, `/api/familles/:id`, `/api/familles/:id/membres`).
- Garde `next: { revalidate: 60, tags: ["familles"] }` sur la liste.
- Prépare le terrain pour le module 27 : au prochain module tu ajouteras la Server Action `creerFamille` qui appelle `revalidateTag("familles")` après le POST, pour que la liste se rafraîchisse **immédiatement** après ajout (sans attendre les 60 s).
- Commit : `feat(familles): liste ISR + detail parallele streame (Next 15 cache explicite)`.
