---
titre: Data fetching dans Next.js
cours: 04-react
notions: [fetch dans Server Components async/await, caching Next 15 fetch non caché par défaut, force-cache explicite, next revalidate, ISR revalidatePath revalidateTag, unstable_cache et use cache en survol, fetching parallèle vs séquentiel, loading.tsx et Suspense streaming]
outcomes: [récupérer des données dans un Server Component async sans useEffect, contrôler le cache et la revalidation d'un fetch en Next 15, streamer une page avec loading.tsx et Suspense sans waterfall]
prerequis: [25-server-components]
next: 27-api-routes-et-server-actions
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }]
tribuzen: admin web Next.js — liste des familles (revalidate 60s), page famille (fetch parallèle famille + membres), revalidateTag après mutation
last-reviewed: 2026-07
---

# Data fetching dans Next.js

> **Outcomes — tu sauras FAIRE :** récupérer des données dans un Server Component `async` sans `useEffect`, contrôler le cache et la revalidation d'un `fetch` en Next 15, streamer une page avec `loading.tsx` et `<Suspense>` sans waterfall.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu construis l'admin web de TribuZen en Next.js 15 (App Router). La page `/familles` doit afficher la liste des familles. Un collègue venant de Next.js 14 écrit ceci :

```tsx
// app/familles/page.tsx — écrit avec les réflexes Next 14
export default async function FamillesPage() {
  const res = await fetch("https://api.tribuzen.app/familles");
  const familles = await res.json();

  return (
    <ul>
      {familles.map((f: { id: string; nom: string }) => (
        <li key={f.id}>{f.nom}</li>
      ))}
    </ul>
  );
}
```

Il s'attend à ce que Next.js **mette la réponse en cache** (comportement Next 14 : `fetch` caché par défaut). Il déploie, ajoute une famille en base... et s'étonne que la liste soit **toujours à jour à chaque rechargement**, comme s'il n'y avait aucun cache.

**Ce n'est pas un bug.** En **Next.js 15, un `fetch` n'est plus mis en cache par défaut** — le contraire de Next 14. Sa page est désormais rendue dynamiquement à chaque requête. S'il voulait vraiment un cache (pour la performance), il doit le demander **explicitement**. Et s'il voulait de l'ISR (cache + rafraîchissement périodique), c'est encore un autre réglage.

Ce module te donne le modèle mental exact du cache Next 15 pour ne jamais te faire piéger par ce changement.

---

## 2. Théorie complète, concise

### 2.1 `fetch` dans un Server Component `async`

Un Server Component peut être une fonction `async`. Tu `await` directement le `fetch` dans le corps du composant — **pas de `useEffect`, pas de `useState`, pas d'état de chargement manuel**.

```tsx
// app/familles/page.tsx — Server Component (aucun 'use client')
interface Famille {
  id: string;
  nom: string;
}

export default async function FamillesPage() {
  const res = await fetch("https://api.tribuzen.app/familles");
  const familles: Famille[] = await res.json();

  return (
    <ul>
      {familles.map((f) => (
        <li key={f.id}>{f.nom}</li>
      ))}
    </ul>
  );
}
```

Le fetch s'exécute **sur le serveur** : les secrets d'API restent côté serveur, aucun JS de data-fetching n'est envoyé au navigateur, et le HTML arrive déjà rempli. C'est le prolongement direct du module 25 (Server Components).

**Déduplication automatique** : dans un même rendu, deux `fetch` identiques (même URL, méthode, headers) ne déclenchent qu'une seule requête réseau. Tu peux donc fetcher la même donnée dans plusieurs composants sans la « remonter » via props.

### 2.2 Le changement majeur Next 15 : `fetch` non caché par défaut

> **À GRAVER.** En **Next.js 14**, `fetch()` était **caché par défaut** (équivalent `force-cache`). En **Next.js 15**, `fetch()` **n'est plus caché par défaut**. Tu dois activer le cache explicitement.

L'option `cache` d'un `fetch` prend trois valeurs utiles :

| `cache` | Comportement Next 15 |
|---|---|
| *(absent)* / `'auto no cache'` | **Défaut Next 15.** Pas de cache persistant : refetch à chaque requête en dev/prod dynamique. Au `build`, si la route est statiquement pré-rendue et sans API dynamique, le fetch part une fois au build. |
| `'no-store'` | Jamais caché, refetch à chaque requête, même si aucune API dynamique n'est détectée. Force le rendu dynamique. |
| `'force-cache'` | **Cache explicite.** Cherche une entrée fraîche en cache serveur ; sinon refetch et met en cache (uniquement les réponses HTTP `200`). |

```tsx
export default async function Page() {
  const a = await fetch("https://api.tribuzen.app/familles"); // ❌ PAS caché (défaut Next 15)
  const b = await fetch("https://api.tribuzen.app/config", {
    cache: "force-cache", // ✅ caché explicitement
  });
  // ...
}
```

Pour ré-activer le cache sur **tous** les fetch d'un segment (page/layout) d'un coup, sans toucher chaque appel :

```tsx
// En tête de app/familles/page.tsx — opte tout le segment dans le cache
export const fetchCache = "default-cache";
```

### 2.3 Revalidation temporelle (ISR) : `next: { revalidate }`

L'ISR (Incremental Static Regeneration) combine le meilleur des deux mondes : servir depuis le cache **et** rafraîchir périodiquement. On l'active avec `next: { revalidate: N }` (secondes).

```tsx
// Cache la liste, mais la régénère au plus toutes les 60 s
const res = await fetch("https://api.tribuzen.app/familles", {
  next: { revalidate: 60 },
});
```

Pendant les 60 s, chaque visiteur reçoit la version cachée (instantané). Passé le délai, la **prochaine** requête déclenche une régénération en arrière-plan ; la version fraîche remplace l'ancienne pour les suivants (stale-while-revalidate).

On peut aussi fixer la revalidation au niveau du segment entier :

```tsx
// En tête de page.tsx — s'applique à toute la route
export const revalidate = 60;
```

> `revalidate: false` = cache indéfini. `revalidate: 0` = jamais caché (équivaut à dynamique).

### 2.4 Revalidation à la demande : `revalidateTag` / `revalidatePath`

L'ISR temporelle rafraîchit « à l'aveugle » selon l'horloge. La revalidation **à la demande** invalide le cache **au moment précis** où la donnée change (ex : après une mutation). Deux outils, à appeler depuis une Server Action ou un Route Handler (module 27).

**Par tag** — on étiquette le fetch, puis on invalide le tag :

```tsx
// 1. Étiqueter le fetch (dans le Server Component)
const res = await fetch("https://api.tribuzen.app/familles", {
  next: { tags: ["familles"] },
});
```

```tsx
// 2. Invalider après une mutation (dans une Server Action)
"use server";
import { revalidateTag } from "next/cache";

export async function creerFamille(data: FormData) {
  await fetch("https://api.tribuzen.app/familles", {
    method: "POST",
    body: data,
  });
  revalidateTag("familles"); // tout fetch taggé "familles" est purgé
}
```

**Par chemin** — invalide tout le cache d'une route :

```tsx
"use server";
import { revalidatePath } from "next/cache";

export async function creerFamille(data: FormData) {
  // ... mutation ...
  revalidatePath("/familles"); // purge le cache de la route /familles
}
```

`revalidateTag` est **plus chirurgical** : un même tag peut couvrir plusieurs routes, et une route peut n'invalider qu'une partie de ses données. `revalidatePath` est plus grossier mais pratique quand une seule page dépend de la donnée.

### 2.5 `unstable_cache` et `use cache` (survol)

`fetch` gère le cache des **appels HTTP**. Mais que cacher pour une requête **directe à la base** (Prisma) ou un calcul coûteux ? Deux mécanismes, à connaître de nom :

- **`unstable_cache`** (stable en pratique, nom encore préfixé) : enveloppe une fonction async quelconque pour cacher son résultat, avec `tags` et `revalidate`.

```tsx
import { unstable_cache } from "next/cache";

const getFamilles = unstable_cache(
  async () => db.famille.findMany(), // accès BDD direct, pas un fetch HTTP
  ["familles-list"], // clé de cache
  { tags: ["familles"], revalidate: 60 }
);
```

- **`use cache`** (directive de la nouvelle génération « Cache Components », derrière un flag) : on marque une fonction ou un fichier avec `"use cache"` et Next.js gère la clé de cache automatiquement.

```tsx
async function getFeatured() {
  "use cache";
  const res = await fetch("https://api.tribuzen.app/mise-en-avant");
  return res.json();
}
```

Retiens juste : quand la donnée ne vient **pas** d'un `fetch` HTTP, `unstable_cache` / `use cache` prennent le relais. Détails en cours avancé.

### 2.6 Fetching parallèle vs séquentiel

Deux `await` à la suite créent un **waterfall** : le second fetch n'part qu'une fois le premier terminé. Si les données sont **indépendantes**, c'est du temps perdu.

```tsx
// ❌ Séquentiel — temps total = temps(famille) + temps(membres)
const famille = await fetch(`.../familles/${id}`).then((r) => r.json());
const membres = await fetch(`.../familles/${id}/membres`).then((r) => r.json());

// ✅ Parallèle — temps total = max(temps(famille), temps(membres))
const [famille, membres] = await Promise.all([
  fetch(`.../familles/${id}`).then((r) => r.json()),
  fetch(`.../familles/${id}/membres`).then((r) => r.json()),
]);
```

Règle : `Promise.all` dès que les fetch ne dépendent pas l'un de l'autre. Garde le séquentiel **uniquement** quand le second a besoin d'un résultat du premier (ex : récupérer un `familleId` puis fetcher ses membres).

### 2.7 Streaming : `loading.tsx` et `<Suspense>`

Le streaming envoie la page **par morceaux** : la coquille arrive tout de suite, les zones lentes se remplissent ensuite. Deux niveaux de granularité.

**`loading.tsx`** — fallback automatique pour **toute la route** pendant que le Server Component `async` résout ses fetch :

```tsx
// app/familles/loading.tsx — affiché instantanément pendant le fetch de page.tsx
export default function Loading() {
  return <p>Chargement des familles…</p>;
}
```

Next.js enveloppe automatiquement le contenu de `page.tsx` dans un `<Suspense>` dont le fallback est ce `Loading`.

**`<Suspense>` granulaire** — pour streamer **section par section**, chacune avec son propre fallback. Idéal quand une partie est rapide et une autre lente.

```tsx
// app/familles/[id]/page.tsx
import { Suspense } from "react";

async function InfosFamille({ id }: { id: string }) {
  const res = await fetch(`https://api.tribuzen.app/familles/${id}`);
  const famille = await res.json();
  return <h1>{famille.nom}</h1>;
}

async function ListeMembres({ id }: { id: string }) {
  const res = await fetch(`https://api.tribuzen.app/familles/${id}/membres`);
  const membres = await res.json();
  return (
    <ul>
      {membres.map((m: { id: string; nom: string }) => (
        <li key={m.id}>{m.nom}</li>
      ))}
    </ul>
  );
}

export default async function FamillePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // params est une Promise en Next 15
  return (
    <div>
      <Suspense fallback={<p>Chargement de la famille…</p>}>
        <InfosFamille id={id} />
      </Suspense>
      <Suspense fallback={<p>Chargement des membres…</p>}>
        <ListeMembres id={id} />
      </Suspense>
    </div>
  );
}
```

> **Note Next 15 :** `params` (et `searchParams`) sont des **`Promise`** — il faut les `await`. C'est un autre changement Next 15 à ne pas oublier.

---

## 3. Worked examples

### Exemple 1 — Liste des familles avec ISR 60 s (TribuZen)

Objectif : la page `/familles` doit être rapide (cachée) mais raisonnablement fraîche (régénérée toutes les 60 s), et invalidable à la demande après création.

```tsx
// app/familles/page.tsx — Server Component
interface Famille {
  id: string;
  nom: string;
  nbMembres: number;
}

export default async function FamillesPage() {
  // ISR : servi depuis le cache, régénéré au max toutes les 60 s.
  // tags: permet une invalidation ciblée après une mutation (voir Server Action).
  const res = await fetch("https://api.tribuzen.app/familles", {
    next: { revalidate: 60, tags: ["familles"] },
  });

  if (!res.ok) {
    throw new Error("Échec du chargement des familles");
  }

  const familles: Famille[] = await res.json();

  return (
    <section>
      <h1>Familles ({familles.length})</h1>
      <ul>
        {familles.map((f) => (
          <li key={f.id}>
            <a href={`/familles/${f.id}`}>
              {f.nom} — {f.nbMembres} membre(s)
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Points clés de la décision :
- On **veut** du cache ici (liste consultée souvent, tolère 60 s de fraîcheur) → `revalidate: 60`. Sans cette option, en Next 15 la page serait **dynamique** (refetch à chaque visite).
- On ajoute `tags: ["familles"]` pour pouvoir **purger immédiatement** après un ajout, sans attendre les 60 s.

### Exemple 2 — Page famille en fetch parallèle + streaming

Objectif : la page `/familles/:id` charge **en parallèle** la famille et ses membres, et streame chaque bloc.

```tsx
// app/familles/[id]/page.tsx
import { Suspense } from "react";

interface Famille {
  id: string;
  nom: string;
  ville: string;
}
interface Membre {
  id: string;
  nom: string;
  role: "parent" | "enfant";
}

// Deux fetchers indépendants → seront lancés en parallèle par les Suspense
async function EnteteFamille({ id }: { id: string }) {
  const res = await fetch(`https://api.tribuzen.app/familles/${id}`, {
    next: { revalidate: 60, tags: [`famille-${id}`] },
  });
  const famille: Famille = await res.json();
  return (
    <header>
      <h1>{famille.nom}</h1>
      <p>{famille.ville}</p>
    </header>
  );
}

async function MembresFamille({ id }: { id: string }) {
  const res = await fetch(`https://api.tribuzen.app/familles/${id}/membres`, {
    next: { revalidate: 60, tags: [`membres-${id}`] },
  });
  const membres: Membre[] = await res.json();
  return (
    <ul>
      {membres.map((m) => (
        <li key={m.id}>
          {m.nom} — {m.role}
        </li>
      ))}
    </ul>
  );
}

export default async function FamillePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15 : params est une Promise

  // Chaque <Suspense> streame indépendamment : l'entête peut s'afficher
  // avant que la liste des membres (plus lente) soit prête.
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

**Pourquoi c'est parallèle sans `Promise.all`** : chaque composant `async` sous son propre `<Suspense>` démarre son fetch dès que React le rend. Les deux Suspense étant frères, React lance les deux rendus « en même temps » — les deux fetch partent donc en parallèle, et chaque bloc apparaît dès qu'il est prêt.

Si tu voulais les deux données **dans le même composant** (ex : pour un titre combiné), tu utiliserais alors `Promise.all` :

```tsx
const [famille, membres] = await Promise.all([
  fetch(`.../familles/${id}`).then((r) => r.json()),
  fetch(`.../familles/${id}/membres`).then((r) => r.json()),
]);
```

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que `fetch` est encore caché par défaut (réflexe Next 14)

```tsx
// ❌ Attente Next 14 : "c'est caché, donc rapide et figé"
const res = await fetch("https://api.tribuzen.app/familles");
// En Next 15 : PAS caché → page dynamique, refetch à chaque requête
```

En Next 15, ce fetch n'est **pas** caché. Conséquences : chaque visite refetch (charge serveur + latence), et la route bascule en rendu dynamique. Si tu veux du cache, demande-le : `cache: "force-cache"` (statique) ou `next: { revalidate: N }` (ISR).

```tsx
// ✅ Cache explicite selon l'intention
const res = await fetch(url, { cache: "force-cache" });      // fige
const res2 = await fetch(url, { next: { revalidate: 60 } }); // ISR 60 s
```

### PIÈGE #2 — Waterfall involontaire avec des `await` en série

```tsx
// ❌ Séquentiel alors que les données sont indépendantes
const famille = await fetch(`.../familles/${id}`).then((r) => r.json());
const membres = await fetch(`.../familles/${id}/membres`).then((r) => r.json());
// membres attend inutilement la fin de famille
```

Deux `await` consécutifs = deux allers-retours en file. Si aucune donnée ne dépend de l'autre, parallélise avec `Promise.all` (ou des `<Suspense>` frères). Garde le séquentiel **seulement** quand le second fetch a besoin du résultat du premier.

### PIÈGE #3 — Confondre `revalidatePath`/`revalidateTag` et `revalidate`

```tsx
// ❌ Croire que ceci rafraîchit "maintenant"
export const revalidate = 60; // = fenêtre de temps, PAS un déclencheur manuel
```

`revalidate: 60` est une **durée** (ISR temporelle, passive). `revalidateTag("familles")` / `revalidatePath("/familles")` sont des **actions** qui purgent le cache **immédiatement**, appelées depuis une Server Action après une mutation. On combine souvent les deux : ISR pour la fraîcheur de fond, tag pour l'invalidation instantanée après écriture.

### PIÈGE #4 — Oublier que `params` et `searchParams` sont des Promises en Next 15

```tsx
// ❌ Réflexe Next 14 — params accédé en objet synchrone
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id; // erreur de type / runtime en Next 15
}

// ✅ Next 15 — await obligatoire
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
}
```

### PIÈGE #5 — Utiliser `useEffect` + `useState` pour fetcher dans un Server Component

```tsx
// ❌ Réflexe client dans un fichier serveur — n'a pas de sens ici
"use client";
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/familles").then((r) => r.json()).then(setData);
  }, []);
}
```

Dans un Server Component, on `await` directement — pas d'état de chargement à gérer à la main, pas de flash « loading » côté client, pas de JS envoyé pour ça. Le pattern `useEffect + fetch` reste valable **uniquement** dans un Client Component (données qui dépendent d'une interaction, temps réel…).

---

## 5. Ancrage TribuZen

L'admin web de TribuZen est une app Next.js 15 (App Router) qui pilote familles, membres et événements.

**`/familles` — liste (ISR 60 s + tag)** (`app/familles/page.tsx`) : le fetch de la liste utilise `next: { revalidate: 60, tags: ["familles"] }`. La liste est consultée en permanence par les admins → cache pour la vitesse, 60 s de tolérance de fraîcheur, invalidation ciblée à la création. C'est l'Exemple 1.

**`/familles/:id` — détail en parallèle + streaming** (`app/familles/[id]/page.tsx`) : la fiche famille et la liste des membres sont **indépendantes**, donc fetchées en parallèle via deux `<Suspense>` frères. L'entête (rapide) s'affiche pendant que la liste des membres (plus lourde) streame. C'est l'Exemple 2.

**Invalidation après mutation** (`app/familles/actions.ts`) : la Server Action `creerFamille` (détaillée au module 27) appelle `revalidateTag("familles")` juste après le POST, pour que `/familles` reflète l'ajout **immédiatement**, sans attendre la fenêtre ISR de 60 s.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen-admin/src/app/
  familles/
    page.tsx           # liste, ISR 60 s, tag "familles"
    loading.tsx        # fallback streaming de la liste
    actions.ts         # Server Action + revalidateTag (module 27)
    [id]/
      page.tsx         # détail, fetch parallèle famille + membres
```

---

## 6. Points clés

1. Dans un Server Component `async`, on `await fetch` directement — pas de `useEffect`, pas d'état de chargement manuel.
2. **Next 15 : `fetch` n'est plus caché par défaut** (contraire de Next 14). Sans option, la page devient dynamique (refetch à chaque requête).
3. Cache explicite : `cache: "force-cache"` fige la donnée ; `next: { revalidate: N }` fait de l'ISR (cache + régénération toutes les N secondes).
4. `revalidateTag(tag)` / `revalidatePath(path)` purgent le cache **à la demande** (après mutation), depuis une Server Action — à distinguer de `revalidate: N` qui est une simple durée.
5. Données HTTP → `fetch` gère le cache. Données non-HTTP (BDD, calcul) → `unstable_cache` ou la directive `use cache`.
6. Fetch indépendants → `Promise.all` (ou `<Suspense>` frères) pour éviter le waterfall ; séquentiel seulement en cas de dépendance.
7. Streaming : `loading.tsx` couvre toute la route, `<Suspense>` granulaire streame section par section. En Next 15, `params`/`searchParams` sont des `Promise` à `await`.

---

## 7. Seeds Anki

```
En Next.js 15, un fetch dans un Server Component est-il caché par défaut ?|Non. Contrairement à Next 14 (caché par défaut), en Next 15 fetch n'est PAS caché par défaut : la route devient dynamique et refetch à chaque requête. Il faut activer le cache explicitement (cache: "force-cache" ou next: { revalidate }).
Comment activer un cache explicite sur un fetch en Next 15 ?|cache: "force-cache" pour figer la donnée (statique), ou next: { revalidate: N } pour de l'ISR (cache + régénération au plus toutes les N secondes). fetchCache = "default-cache" opte tout un segment dans le cache.
Quelle est la différence entre revalidate: 60 et revalidateTag("x") ?|revalidate: 60 est une DURÉE (ISR passive, régénère au plus toutes les 60 s). revalidateTag("x") est une ACTION qui purge le cache IMMÉDIATEMENT (appelée dans une Server Action après une mutation). On combine souvent les deux.
Comment fetcher deux données indépendantes sans waterfall dans un Server Component ?|Avec Promise.all([...]) pour lancer les fetch en parallèle (temps = max au lieu de somme), ou en plaçant chaque fetcher async sous son propre <Suspense> frère. Séquentiel seulement si le 2e fetch dépend du résultat du 1er.
À quoi servent loading.tsx et <Suspense> dans l'App Router ?|loading.tsx fournit un fallback automatique pour TOUTE la route pendant que le Server Component résout ses fetch. <Suspense> permet un streaming GRANULAIRE section par section, chaque bloc s'affichant dès qu'il est prêt.
Comment accède-t-on à params dans une page Next 15 ?|params (et searchParams) sont des Promise en Next 15 : il faut les await. Ex : export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; }
Quand utiliser unstable_cache ou la directive "use cache" plutôt que fetch ?|Quand la donnée ne vient pas d'un fetch HTTP : accès direct à la BDD (Prisma), lecture fichier, calcul coûteux. unstable_cache enveloppe une fonction async avec clé/tags/revalidate ; "use cache" (Cache Components) gère la clé automatiquement.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-26-data-fetching/README.md`. Construire la page `/familles` (ISR 60 s + tag) et la page `/familles/:id` (fetch parallèle + streaming Suspense) de l'admin TribuZen, en contrôlant explicitement le cache Next 15.
