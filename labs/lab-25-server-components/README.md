# Lab 25 — React Server Components et frontière client

> **Outcome :** à la fin, tu sais construire une page `/familles` en Server Component qui lit ses données côté serveur, isoler un bouton interactif en `"use client"` au plus bas de l'arbre, et composer un Server Component en `children` d'un Client Component.
> **Vrai outil :** Next.js 15 (App Router) + React 19, lancé avec `next dev` (rendu serveur + hydratation visibles dans le navigateur et les DevTools réseau).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu refais la page `/familles` de l'admin TribuZen proprement. Cahier des charges **exact** :

1. **`FamillesPage`** (`src/app/familles/page.tsx`) — Server Component `async` qui lit la liste des familles **directement** (pas de route API, pas de `useEffect`) et l'affiche.
2. **`ArchiveButton`** (`src/components/archive-button.tsx`) — Client Component (`"use client"`) avec un état `busy` et un `onClick`. Reçoit `familyId: string` en prop. C'est le **seul** JavaScript client de la page à ce stade.
3. **`Collapsible`** (`src/components/collapsible.tsx`) — Client Component réutilisable avec un état `open` (`useState`) et une prop `children: React.ReactNode`.
4. **`FamilyDetail`** (`src/components/family-detail.tsx`) — Server Component `async` qui lit les membres d'une famille. Il est passé en **`children`** de `Collapsible` depuis la page (parent serveur).

**Données de départ (à copier dans `src/lib/db.ts`) :**

```ts
export interface Family {
  id: string;
  name: string;
  memberCount: number;
  status: "active" | "archived";
}

export interface Member {
  id: string;
  name: string;
}

// Faux client de base — simule Prisma. Le point est qu'il tourne CÔTÉ SERVEUR.
export const db = {
  family: {
    async findMany(): Promise<Family[]> {
      return [
        { id: "f1", name: "Les Dupont", memberCount: 4, status: "active" },
        { id: "f2", name: "Les Martin", memberCount: 3, status: "active" },
        { id: "f3", name: "Les Bernard", memberCount: 5, status: "active" },
      ];
    },
  },
  member: {
    async findByFamily(familyId: string): Promise<Member[]> {
      const byFamily: Record<string, Member[]> = {
        f1: [{ id: "m1", name: "Alice" }, { id: "m2", name: "Bob" }],
        f2: [{ id: "m3", name: "Chloé" }],
        f3: [{ id: "m4", name: "David" }, { id: "m5", name: "Emma" }],
      };
      return byFamily[familyId] ?? [];
    },
  },
};
```

**Contraintes :**
- `FamillesPage` et `FamilyDetail` **n'ont pas** `"use client"` — ils lisent `db` directement.
- `ArchiveButton` et `Collapsible` **ont** `"use client"` et n'importent **jamais** un composant qui lit `db`.
- Les props qui traversent vers un Client Component sont **sérialisables** (strings, pas de fonctions).
- `Collapsible` ne doit **pas** `import` `FamilyDetail` — il le reçoit via `children`.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Starter minimal

Crée le projet et l'arborescence :

```
pnpm create next-app@latest tribuzen-lab --ts --app --no-src-dir=false
```

```
src/
  app/
    familles/
      page.tsx            ← à écrire (Server Component)
  components/
    archive-button.tsx    ← à écrire ("use client")
    collapsible.tsx       ← à écrire ("use client")
    family-detail.tsx     ← à écrire (Server Component async)
  lib/
    db.ts                 ← copier le stub ci-dessus
```

Lance `pnpm dev` puis ouvre `http://localhost:3000/familles`.

---

## Étapes (en friction)

1. **`src/lib/db.ts`** — copie le stub de données ci-dessus.
2. **`FamillesPage`** — `export default async function`, `await db.family.findMany()`, mappe en `<li>`. Vérifie dans les DevTools (onglet Réseau, document HTML) que **les noms de familles sont déjà dans le HTML** de la réponse — preuve du rendu serveur.
3. **`ArchiveButton`** — `"use client"` en première ligne, `useState` pour `busy`, `onClick` qui log l'archivage. Branche-le dans chaque `<li>` de la page. Passe `familyId={f.id}`.
4. **Test frontière** : essaie temporairement de passer `onArchive={() => db.family...}` en prop → observe l'erreur de sérialisation, puis reviens à `familyId`.
5. **`Collapsible`** — `"use client"`, `useState` `open`, props `title: string` + `children: React.ReactNode`, bouton qui bascule `open`.
6. **`FamilyDetail`** — Server Component `async`, `await db.member.findByFamily(familyId)`, liste des membres.
7. **Compose** : dans la page, enveloppe `<FamilyDetail familyId={f.id} />` dans `<Collapsible title={f.name}>`. Vérifie que le pli fonctionne dans le navigateur ET que `Collapsible` n'importe pas `FamilyDetail`.

---

## Corrigé complet commenté

```tsx
// ─── src/lib/db.ts ──────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  memberCount: number;
  status: "active" | "archived";
}

export interface Member {
  id: string;
  name: string;
}

// Faux client de base — tourne UNIQUEMENT côté serveur (importé par des Server Components).
export const db = {
  family: {
    async findMany(): Promise<Family[]> {
      return [
        { id: "f1", name: "Les Dupont", memberCount: 4, status: "active" },
        { id: "f2", name: "Les Martin", memberCount: 3, status: "active" },
        { id: "f3", name: "Les Bernard", memberCount: 5, status: "active" },
      ];
    },
  },
  member: {
    async findByFamily(familyId: string): Promise<Member[]> {
      const byFamily: Record<string, Member[]> = {
        f1: [{ id: "m1", name: "Alice" }, { id: "m2", name: "Bob" }],
        f2: [{ id: "m3", name: "Chloé" }],
        f3: [{ id: "m4", name: "David" }, { id: "m5", name: "Emma" }],
      };
      return byFamily[familyId] ?? [];
    },
  },
};

// ─── src/components/archive-button.tsx  (Client Component) ───────
"use client"; // première ligne, avant tout import

import { useState } from "react";

// Isolé ici parce qu'il a besoin d'état + onClick.
// familyId est une string → sérialisable, elle traverse la frontière sans souci.
export function ArchiveButton({ familyId }: { familyId: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    // En vrai : appel d'une Server Action ou d'une route. Ici, on log.
    console.log(`Archivage de ${familyId}…`);
    // Simule la fin de l'opération
    setTimeout(() => setBusy(false), 600);
  }

  return (
    <button onClick={handleClick} disabled={busy}>
      {busy ? "Archivage…" : "Archiver"}
    </button>
  );
}

// ─── src/components/collapsible.tsx  (Client Component) ──────────
"use client";

import { useState } from "react";

interface CollapsibleProps {
  title: string;             // string → sérialisable ✅
  children: React.ReactNode; // trou rempli par du contenu SERVEUR
}

// Ce Client Component ne connaît pas ses children — il ne fait que les afficher.
// Il n'importe JAMAIS FamilyDetail : il le reçoit déjà rendu via children.
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

// ─── src/components/family-detail.tsx  (Server Component async) ──
import { db } from "@/lib/db";

// PAS de "use client" → il peut lire la base directement.
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

// ─── src/app/familles/page.tsx  (Server Component par défaut) ────
import { db } from "@/lib/db";
import { ArchiveButton } from "@/components/archive-button";
import { Collapsible } from "@/components/collapsible";
import { FamilyDetail } from "@/components/family-detail";

// export default async → Server Component qui await ses données.
export default async function FamillesPage() {
  // ✅ Lecture directe : HTML rempli au premier rendu, zéro route API.
  const families = await db.family.findMany();

  return (
    <section>
      <h1>Familles</h1>
      <ul>
        {families.map((f) => (
          <li key={f.id}>
            {/* Collapsible est CLIENT, mais on lui passe un Server Component
                (FamilyDetail) en children — rendu serveur, injecté dans le trou. */}
            <Collapsible title={`${f.name} — ${f.memberCount} membres`}>
              <FamilyDetail familyId={f.id} />
            </Collapsible>
            {/* Seul JS client de la ligne : le bouton */}
            <ArchiveButton familyId={f.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Pourquoi ce corrigé est correct :**
- `FamillesPage` et `FamilyDetail` n'ont pas `"use client"` : ils lisent `db` côté serveur, le HTML arrive rempli (vérifiable dans l'onglet Réseau).
- `ArchiveButton` et `Collapsible` sont les **seuls** morceaux tirés dans le bundle client — précisément là où il y a `useState` / `onClick`.
- `Collapsible` n'**importe** jamais `FamilyDetail`. La page (serveur) rend `FamilyDetail` et passe le résultat en `children` — la base ne fuit pas dans le bundle client.
- Les props qui traversent (`familyId`, `title`) sont des **strings** : sérialisables. Aucune fonction ne franchit la frontière.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Ajoute une section **statistiques** lente : un Server Component `async` `FamilyStats` qui `await` une fonction simulant une requête lente (`await new Promise((r) => setTimeout(r, 1500))` puis retourne un total).
2. Enveloppe `<FamilyStats />` dans un `<Suspense fallback={<p>Calcul…</p>}>` dans la page, **au-dessus** de la liste.
3. Vérifie dans le navigateur que la liste des familles s'affiche **immédiatement** et que les stats apparaissent après ~1,5 s (streaming).
4. **Sans ouvrir ce corrigé** ni le module 25.

**Critère de réussite :** la liste ne bloque pas sur la section lente ; le fallback s'affiche puis est remplacé par le total streamé. La frontière `"use client"` reste uniquement sur `ArchiveButton` et `Collapsible`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/src/
  app/
    familles/
      page.tsx           ← Server Component : lit la base (Prisma), compose
  components/
    archive-button.tsx   ← "use client" : bouton interactif isolé
    collapsible.tsx      ← "use client" : wrapper à children serveur
    family-detail.tsx    ← Server Component async : lit les membres
  lib/
    db.ts                ← client Prisma réel (remplace le stub)
```

**Différences par rapport au lab :**
- `src/lib/db.ts` devient le vrai `PrismaClient` (`db.family.findMany()` frappe Postgres). La signature reste identique — d'où le stub qui la mime.
- `ArchiveButton` déclenchera une **Server Action** (`"use server"`) au lieu d'un `console.log` (module 26) — la seule fonction autorisée à traverser la frontière.
- `Collapsible` sera stylé avec les tokens du design system TribuZen ; la logique `open` + `children` reste identique.

**Commit cible :**
```
feat(familles): page /familles en Server Component + lecture Prisma directe
feat(familles): ArchiveButton client isolé + Collapsible à children serveur
```
