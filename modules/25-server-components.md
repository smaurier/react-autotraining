---
titre: React Server Components (RSC) et frontière client
cours: 04-react
notions: [RSC par défaut dans app/, directive use client, ce que le serveur peut et ne peut pas faire, frontière serveur/client, composition serveur dans un client via children, serialization des props, streaming avec Suspense]
outcomes: [distinguer un Server Component d'un Client Component et savoir lequel choisir, placer la frontière use client au plus bas dans l'arbre, composer un Server Component en children d'un Client Component sans casser la frontière]
prerequis: [24-nextjs-fondamentaux]
next: 26-data-fetching
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }]
tribuzen: page admin /familles en Server Component qui lit les données, bouton d'action interactif isolé en use client
last-reviewed: 2026-07
---

# React Server Components (RSC) et frontière client

> **Outcomes — tu sauras FAIRE :** distinguer un Server Component d'un Client Component et choisir le bon, placer la frontière `"use client"` au plus bas dans l'arbre, composer un Server Component en `children` d'un Client Component sans casser la frontière.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu ouvres l'admin TribuZen. La page `/familles` doit afficher la liste des familles lue en base, et chaque ligne a un bouton "Archiver" interactif. Un collègue a écrit ça :

```tsx
// src/app/familles/page.tsx — AVANT
"use client";

import { useEffect, useState } from "react";

interface Family {
  id: string;
  name: string;
  memberCount: number;
}

export default function FamillesPage() {
  const [families, setFamilies] = useState<Family[]>([]);

  useEffect(() => {
    fetch("/api/families")
      .then((r) => r.json())
      .then(setFamilies);
  }, []);

  return (
    <ul>
      {families.map((f) => (
        <li key={f.id}>
          {f.name} — {f.memberCount} membres
          <button onClick={() => archive(f.id)}>Archiver</button>
        </li>
      ))}
    </ul>
  );
}
```

**Trois problèmes immédiats :**
1. Toute la page est `"use client"` alors que seul le bouton "Archiver" a besoin d'interactivité — le reste (lecture + affichage) pourrait vivre côté serveur.
2. Il a fallu créer une route API `/api/families` juste pour que le client puisse fetcher — le serveur pourrait lire la base directement.
3. Écran vide au premier rendu (`useState([])`) puis flash quand `useEffect` résout : mauvaise UX et pas de données dans le HTML initial.

Ce module te donne le modèle mental pour couper ça correctement : page serveur qui lit les données, bouton client isolé.

---

## 2. Théorie complète, concise

### 2.1 RSC par défaut dans `app/`

Dans l'App Router de Next.js 15, **tout composant est un Server Component par défaut**. C'est l'inversion du modèle historique où tout était client.

Un Server Component s'exécute **uniquement sur le serveur**. Son JavaScript n'est **jamais** envoyé au navigateur — seul le résultat rendu (un format sérialisé appelé *RSC Payload*) transite. Concrètement, un Server Component peut être `async` et faire son travail de données inline :

```tsx
// src/app/familles/page.tsx
// PAS de "use client" → Server Component par défaut

import { db } from "@/lib/db";

export default async function FamillesPage() {
  // ✅ Lecture base directe — pas de route API, pas de useEffect
  const families = await db.family.findMany();

  return (
    <ul>
      {families.map((f) => (
        <li key={f.id}>
          {f.name} — {f.memberCount} membres
        </li>
      ))}
    </ul>
  );
}
```

### 2.2 Ce que le serveur PEUT et NE PEUT PAS faire

Un Server Component tourne dans Node.js, pas dans un navigateur. Cela délimite strictement ses capacités.

| Le serveur PEUT | Le serveur NE PEUT PAS |
|---|---|
| Lire la base directement (Prisma, Drizzle) | Utiliser des hooks (`useState`, `useEffect`, `useRef`) |
| Lire le système de fichiers (`fs`) | Utiliser des gestionnaires d'événements (`onClick`, `onChange`) |
| Lire des secrets d'env (sans `NEXT_PUBLIC_`) | Accéder aux APIs navigateur (`window`, `document`, `localStorage`) |
| Être `async` et `await` des données | Utiliser `createContext` / `useContext` |
| Importer des packages lourds sans grossir le bundle client | Utiliser un hook custom qui dépend de l'état/effets |

La logique : les hooks et les événements supposent un **cycle de vie interactif dans le navigateur**, qui n'existe pas côté serveur. Un composant qui a besoin d'une de ces choses **doit** franchir la frontière client.

### 2.3 La directive `"use client"` : une frontière, pas une étiquette

`"use client"` se place en **première ligne** d'un fichier. Elle ne rend pas ce seul composant client : elle marque un **point d'entrée** dans le module graph. Tout ce qui est importé *à partir de* ce fichier fait partie du bundle client.

```tsx
// src/components/archive-button.tsx
"use client"; // ← première ligne, avant tout import

import { useState } from "react";

export function ArchiveButton({ familyId }: { familyId: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={() => {
        setBusy(true);
        // ... appel d'archivage
      }}
    >
      {busy ? "..." : "Archiver"}
    </button>
  );
}
```

**Règle d'or : pousse `"use client"` le plus bas possible dans l'arbre.** Ne marque pas une page entière comme client parce qu'un seul bouton est interactif. Chaque composant repoussé côté serveur, c'est du JavaScript en moins dans le navigateur.

### 2.4 Quel composant choisir ?

| Tu as besoin de... | Server | Client |
|---|---|---|
| Lire des données (BDD, fichiers, secrets) | ✅ | ❌ |
| Afficher du contenu statique | ✅ | ❌ (gaspille du JS) |
| `useState`, `useEffect`, `useRef` | ❌ | ✅ |
| `onClick`, `onChange`, formulaires interactifs | ❌ | ✅ |
| `window`, `localStorage`, APIs navigateur | ❌ | ✅ |
| Context React (`useContext`) | ❌ | ✅ |
| Réduire le JS envoyé au client | ✅ | ❌ |

Défaut mental : **serveur d'abord**, on descend en client seulement à la première ligne qui a besoin d'interactivité.

### 2.5 Composition : le sens des imports

La contrainte structurante :

- Un **Server Component peut importer et rendre un Client Component**. ✅
- Un **Client Component ne peut PAS importer un Server Component** et le rendre directement. ❌

Pourquoi : dès qu'un fichier est `"use client"`, tout ce qu'il importe entre dans le bundle client — et un Server Component (qui touche la base, `fs`, des secrets) ne peut pas vivre dans le navigateur.

```
Server Component (page.tsx)
├── Server Component (family-row.tsx)   ← OK
├── Client Component (archive-button)   ← OK (serveur importe client)
│   └── Client Component (spinner)      ← OK (client importe client)
└── Server Component (stats.tsx)        ← OK
```

### 2.6 Passer un Server Component en `children` d'un Client Component

L'exception qui débloque tout : un Client Component ne peut pas **importer** un Server Component, mais il peut le **recevoir via `children`** (ou toute prop de type `ReactNode`). Le Server Component est rendu **sur le serveur** puis inséré dans le trou (`children`) laissé par le Client Component.

```tsx
// src/components/collapsible.tsx
"use client";

import { useState } from "react";

// Ce Client Component ne connaît pas ses children — il ne fait que les afficher
export function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <button onClick={() => setOpen((v) => !v)}>
        {open ? "Réduire" : "Déplier"}
      </button>
      {open && children}
    </section>
  );
}
```

```tsx
// src/app/familles/page.tsx  (Server Component)
import { Collapsible } from "@/components/collapsible";
import { db } from "@/lib/db";

export default async function FamillesPage() {
  const families = await db.family.findMany();

  return (
    <Collapsible>
      {/* Rendu côté SERVEUR, puis injecté dans le trou children du Client */}
      <ul>
        {families.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </Collapsible>
  );
}
```

Ce n'est pas un contournement magique : `Collapsible` reçoit un *arbre déjà rendu* (le RSC Payload de la liste), il ne l'exécute jamais lui-même. C'est ce qui permet un wrapper interactif (accordéon, modale, sidebar) autour de contenu serveur.

### 2.7 Serialization des props

Quand un Server Component passe des props à un Client Component, ces props traversent la frontière serveur→client. Elles doivent donc être **sérialisables** : objets simples, tableaux, chaînes, nombres, booléens, `null`, `Date`, `Promise`… mais **pas de fonctions**.

```tsx
// ❌ Une fonction ordinaire n'est PAS sérialisable
<ArchiveButton onArchive={() => db.archive(id)} /> // erreur : non sérialisable
```

```tsx
// ✅ Passe des données sérialisables, garde le handler dans le Client Component
<ArchiveButton familyId={f.id} />
```

**Exception importante :** une **Server Action** (fonction marquée `"use server"`) *peut* être passée en prop à un Client Component. Ce n'est pas la fonction qui traverse, mais une référence que React résout côté serveur à l'appel. C'est le mécanisme officiel pour déclencher une mutation serveur depuis un bouton client (couvert au module 27).

### 2.8 Streaming avec Suspense

Un Server Component `async` bloque le rendu tant que ses données ne sont pas prêtes. Pour ne pas retenir toute la page, on isole la partie lente dans un `<Suspense>` : Next.js envoie d'abord le fallback, puis *streame* le contenu réel quand il arrive.

```tsx
// src/app/familles/page.tsx  (Server Component)
import { Suspense } from "react";
import { FamilyStats } from "@/components/family-stats";

export default function FamillesPage() {
  return (
    <>
      <h1>Familles</h1>
      {/* Le reste s'affiche tout de suite ; les stats streament après */}
      <Suspense fallback={<p>Calcul des statistiques…</p>}>
        <FamilyStats />
      </Suspense>
    </>
  );
}
```

```tsx
// src/components/family-stats.tsx  (Server Component async)
import { db } from "@/lib/db";

export async function FamilyStats() {
  const count = await db.family.count(); // requête lente isolée
  return <p>{count} familles au total.</p>;
}
```

Variante « streamer une promesse » : un Server Component peut passer une `Promise` **non-`await`** en prop, et un Client Component la déballe avec le hook `use()` sous un `<Suspense>`. On l'exploite au module 26.

---

## 3. Worked examples

### Exemple 1 — Refactorer la page `/familles` (TribuZen)

Reprise du cas concret : on coupe la frontière au bon endroit. Page serveur qui lit la base, bouton client isolé.

```tsx
// ─── src/lib/db.ts (stub — remplacé par Prisma au vrai projet) ────
export interface Family {
  id: string;
  name: string;
  memberCount: number;
  status: "active" | "archived";
}

export const db = {
  family: {
    async findMany(): Promise<Family[]> {
      // En vrai : SELECT * FROM families. Ici, données simulées côté serveur.
      return [
        { id: "f1", name: "Les Dupont", memberCount: 4, status: "active" },
        { id: "f2", name: "Les Martin", memberCount: 3, status: "active" },
      ];
    },
  },
};

// ─── src/components/archive-button.tsx  (Client Component) ────────
"use client";

import { useState } from "react";

// Isolé ici parce qu'il a besoin d'état + onClick.
// familyId est une string → sérialisable, traverse la frontière sans souci.
export function ArchiveButton({ familyId }: { familyId: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    // En vrai : appel d'une Server Action ou d'une route.
    console.log(`Archivage de ${familyId}…`);
  }

  return (
    <button onClick={handleClick} disabled={busy}>
      {busy ? "Archivage…" : "Archiver"}
    </button>
  );
}

// ─── src/app/familles/page.tsx  (Server Component par défaut) ─────
import { db } from "@/lib/db";
import { ArchiveButton } from "@/components/archive-button";

export default async function FamillesPage() {
  // ✅ Lecture directe, HTML rempli au premier rendu, zéro route API.
  const families = await db.family.findMany();

  return (
    <section>
      <h1>Familles</h1>
      <ul>
        {families.map((f) => (
          <li key={f.id}>
            {f.name} — {f.memberCount} membres
            {/* Seul ce bouton est du JS client */}
            <ArchiveButton familyId={f.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Ce que ce découpage apporte :**
- Le HTML de la liste arrive **rempli** dès le premier rendu (pas d'écran vide).
- **Zéro route API** : le serveur lit la base directement dans le composant.
- Seul `ArchiveButton` part dans le bundle client — le reste est du HTML pur.
- La frontière est **au plus bas** : une ligne = un composant client minuscule.

### Exemple 2 — Wrapper client autour de contenu serveur

Le designer veut que chaque famille soit dans un panneau pliable. Le pli est interactif (`useState`) donc client, mais son contenu (les détails lus en base) doit rester serveur. On utilise le pattern `children`.

```tsx
// ─── src/components/collapsible.tsx  (Client Component) ───────────
"use client";

import { useState } from "react";

interface CollapsibleProps {
  title: string;            // string → sérialisable ✅
  children: React.ReactNode; // trou rempli par du contenu SERVEUR
}

export function Collapsible({ title, children }: CollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="collapsible">
      <button onClick={() => setOpen((v) => !v)}>
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div className="collapsible__body">{children}</div>}
    </div>
  );
}

// ─── src/components/family-detail.tsx  (Server Component async) ────
import { db } from "@/lib/db";

// Ce composant lit la base → il DOIT rester serveur.
export async function FamilyDetail({ familyId }: { familyId: string }) {
  const members = await db.member.findByFamily(familyId);
  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>{m.name}</li>
      ))}
    </ul>
  );
}

// ─── src/app/familles/page.tsx  (Server Component) ────────────────
import { db } from "@/lib/db";
import { Collapsible } from "@/components/collapsible";
import { FamilyDetail } from "@/components/family-detail";

export default async function FamillesPage() {
  const families = await db.family.findMany();

  return (
    <section>
      <h1>Familles</h1>
      {families.map((f) => (
        // Collapsible est CLIENT, mais on lui passe un Server Component
        // (FamilyDetail) en children — rendu sur le serveur, injecté dans le trou.
        <Collapsible key={f.id} title={f.name}>
          <FamilyDetail familyId={f.id} />
        </Collapsible>
      ))}
    </section>
  );
}
```

**Pourquoi ça marche :** `Collapsible` n'**importe** jamais `FamilyDetail`. La page (serveur) rend `FamilyDetail` puis passe le résultat déjà rendu comme `children`. Le Client Component reçoit un arbre inerte qu'il se contente d'afficher ou masquer. Si `Collapsible` avait fait `import { FamilyDetail }`, la base aurait été tirée dans le bundle client — erreur.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Mettre `"use client"` en haut de la page « par sécurité »

```tsx
// ❌ Page entière client alors que seul un bouton est interactif
"use client";
export default function FamillesPage() {
  const [families, setFamilies] = useState([]);
  useEffect(() => { /* fetch via route API… */ }, []);
  // ... 150 lignes de contenu statique + 1 bouton ...
}
```

**Pourquoi c'est faux :** tout le contenu statique part inutilement dans le bundle client, tu perds la lecture base directe, et tu réintroduis `useEffect` + route API. La frontière doit descendre au composant interactif, pas remonter à la page.

### PIÈGE #2 — Importer un Server Component dans un Client Component

```tsx
// ❌ Client qui importe un Server Component et le rend
"use client";
import { FamilyDetail } from "./family-detail"; // FamilyDetail touche la base

export function Wrapper() {
  return <FamilyDetail familyId="f1" />; // casse : la base dans le bundle client
}
```

```tsx
// ✅ Passer le Server Component en children depuis un parent serveur
<Collapsible>
  <FamilyDetail familyId="f1" />
</Collapsible>
```

**Signal d'alarme :** un fichier `"use client"` avec un `import` d'un composant qui lit la base / `fs` / des secrets.

### PIÈGE #3 — Passer une fonction en prop à un Client Component

```tsx
// ❌ Une fonction ordinaire n'est pas sérialisable
<ArchiveButton onArchive={() => db.family.archive(id)} />
// Error: Functions cannot be passed directly to Client Components
```

```tsx
// ✅ Passe des données sérialisables ; garde le handler DANS le client
<ArchiveButton familyId={f.id} />
// ✅ Ou passe une Server Action ("use server") — seule fonction autorisée à traverser
```

**Discrimination fine :** *toutes* les fonctions ne sont pas interdites — une **Server Action** est le cas légitime. La distinction : une fonction ordinaire est rejetée, une fonction `"use server"` est une référence que React sait résoudre.

### PIÈGE #4 — Croire que `"use client"` désactive le rendu serveur

Un Client Component est **quand même pré-rendu sur le serveur** (SSR) pour produire le HTML initial, puis **hydraté** dans le navigateur. `"use client"` ne veut pas dire « rendu uniquement dans le navigateur » : ça veut dire « ce composant a besoin de JS côté client (hooks, événements) ». Le HTML initial existe dans les deux cas — la différence est le JavaScript embarqué et l'interactivité.

### PIÈGE #5 — Utiliser `useState`/`useEffect` dans un Server Component

```tsx
// ❌ Pas de "use client" → Server Component → les hooks n'existent pas
export default async function Page() {
  const [x, setX] = useState(0); // Error: useState only works in Client Components
}
```

**Règle :** la présence d'un hook ou d'un `onClick` est le signal qu'il faut extraire un Client Component. Ne colle pas `"use client"` sur la page — extrais le petit morceau interactif.

---

## 5. Ancrage TribuZen

L'admin TribuZen est une app Next.js 15 (App Router). La page `/familles` est le cas d'école de ce module.

**`src/app/familles/page.tsx`** — Server Component par défaut. Il lit la liste des familles directement via Prisma (au vrai projet), sans route API ni `useEffect`. Le HTML arrive rempli, indexable, rapide.

**`src/components/archive-button.tsx`** — Client Component (`"use client"`). Isolé au niveau du bouton : il gère l'état `busy` et l'`onClick`. Reçoit `familyId: string` (sérialisable) en prop. C'est le seul JavaScript interactif tiré dans le bundle pour cette vue.

**`src/components/collapsible.tsx`** — Client Component réutilisable (pli interactif) qui accueille du contenu serveur via `children`. Utilisé pour afficher les détails d'une famille (`FamilyDetail`, Server Component qui lit les membres) sans faire entrer la base dans le bundle client.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  app/
    familles/
      page.tsx           ← Server Component : lit la base, compose
  components/
    archive-button.tsx   ← "use client" : bouton interactif isolé
    collapsible.tsx      ← "use client" : wrapper à children serveur
    family-detail.tsx    ← Server Component async : lit les membres
```

La règle qui guide tout le découpage : **serveur par défaut, `"use client"` au plus bas**, exactement là où un hook ou un événement apparaît.

---

## 6. Points clés

1. Dans l'App Router, tout composant est **Server Component par défaut** ; il faut `"use client"` pour passer côté client.
2. Un Server Component peut lire la base, `fs`, les secrets et être `async` ; il ne peut **pas** utiliser hooks, événements ni APIs navigateur.
3. `"use client"` est une **frontière** en première ligne du fichier — pousse-la le plus bas possible pour réduire le JS envoyé.
4. Un Server Component peut importer/rendre un Client Component ; l'inverse est interdit (un Client ne peut pas **importer** un Server Component).
5. Un Client Component peut recevoir un Server Component via **`children`** : il est rendu sur le serveur puis injecté dans le trou.
6. Les props qui traversent serveur→client doivent être **sérialisables** — pas de fonctions ordinaires ; seule exception, les **Server Actions** (`"use server"`).
7. `<Suspense>` autour d'un Server Component `async` permet le **streaming** : fallback immédiat, contenu réel envoyé dès qu'il est prêt.

---

## 7. Seeds Anki

```
Dans l'App Router de Next.js 15, un composant est-il serveur ou client par défaut ?|Server Component par défaut. Il faut ajouter la directive "use client" en première ligne du fichier pour en faire un Client Component.
Cite deux choses qu'un Server Component peut faire et qu'un Client Component ne peut pas.|Lire la base de données directement, lire le système de fichiers, utiliser des secrets d'env non NEXT_PUBLIC_, être async et await des données. À l'inverse, le serveur ne peut pas utiliser hooks ni gérer d'événements.
Pourquoi un Client Component ne peut-il pas importer un Server Component ?|Parce que tout ce qu'un fichier "use client" importe entre dans le bundle client ; or un Server Component touche la base / fs / des secrets, qui ne peuvent pas vivre dans le navigateur.
Comment rendre du contenu serveur à l'intérieur d'un Client Component interactif ?|En passant le Server Component via children (ou une prop ReactNode) depuis un parent serveur. Le Server Component est rendu sur le serveur, puis son résultat est injecté dans le trou laissé par le Client Component.
Quelle contrainte pèse sur les props passées d'un Server Component à un Client Component ?|Elles doivent être sérialisables (objets simples, tableaux, chaînes, nombres, Date, Promise…). Les fonctions ordinaires sont interdites ; seule exception, une Server Action ("use server").
Que signifie la règle d'or "pousse use client le plus bas possible" ?|Ne pas marquer une page entière comme client parce qu'un seul bouton est interactif : extraire le petit composant interactif en Client Component et laisser le reste en serveur, pour réduire le JavaScript envoyé au navigateur.
À quoi sert un <Suspense> autour d'un Server Component async ?|À streamer : Next.js envoie d'abord le fallback puis le contenu réel dès que les données sont prêtes, sans bloquer le reste de la page.
Un Client Component est-il rendu uniquement dans le navigateur ?|Non. Il est aussi pré-rendu sur le serveur (SSR) pour produire le HTML initial, puis hydraté côté client. "use client" signifie qu'il a besoin de JS client (hooks/événements), pas qu'il n'existe que dans le navigateur.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-25-server-components/README.md`. Refactorer la page `/familles` de l'admin TribuZen : Server Component qui lit les données, `ArchiveButton` client isolé, puis wrapper `Collapsible` client accueillant un `FamilyDetail` serveur via `children`.
