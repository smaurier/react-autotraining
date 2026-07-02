# Lab 27 — Server Actions & Route Handlers sécurisés (admin TribuZen)

> **Outcome :** à la fin, tu sais écrire une Server Action sécurisée (validation zod + contrôle du rôle + `revalidatePath`), la câbler à un formulaire via `useActionState`/`useFormStatus`, et exposer un Route Handler `GET` à un client externe authentifié par clé d'API — dans une vraie app Next.js 15 + React 19.
> **Vrai outil :** Next.js 15 (App Router) + React 19. Serveur réel (`next dev`), pas de harnais simulé.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur).

> ⚠️ **Message central du lab — à te répéter à voix haute :** une Server Action est un **endpoint public**. N'importe qui peut la POSTer directement, sans passer par ton formulaire. Donc **toute** action valide ses entrées (zod) **et** vérifie l'autorisation **dans l'action**. Le formulaire côté client n'est que du confort UX — jamais une barrière de sécurité.

## Pré-requis

Une app Next.js 15 App Router + TypeScript :

```bash
npx create-next-app@latest tribuzen-admin --typescript --app --eslint
cd tribuzen-admin
npm install zod
npm run dev
```

Faux modules d'infra (pas de vraie base ni vrai auth à écrire) — crée `lib/auth.ts` et `lib/db.ts` :

```ts
// lib/auth.ts — fausse session (en vrai : NextAuth/lucia + cookie)
export interface Session {
  user: { id: string; role: 'admin' | 'member' };
}
// bascule 'admin' ↔ 'member' pour tester le refus
export async function auth(): Promise<Session | null> {
  return { user: { id: 'u1', role: 'admin' } };
}
```

```ts
// lib/db.ts — fausse "base" en mémoire
export interface Family { id: string; name: string; spaceId: string }
let FAMILIES: Family[] = [];
export const db = {
  family: {
    async create(data: Omit<Family, 'id'>): Promise<Family> {
      const family = { id: crypto.randomUUID(), ...data };
      FAMILIES = [...FAMILIES, family];
      return family;
    },
    async list(spaceId: string): Promise<Family[]> {
      return FAMILIES.filter((f) => f.spaceId === spaceId);
    },
  },
};
```

## Énoncé

1. **Server Action `createFamily`** (`app/actions/family-actions.ts`) qui applique le **triptyque** : (a) `auth()` + rôle `admin`, (b) validation zod `FamilySchema`, (c) `db.family.create` + `revalidatePath('/admin/familles')`. Retourne un état structuré (`fieldErrors` / `success`).
2. **Formulaire** (`CreateFamilyForm.tsx` + `SubmitButton.tsx`, tous deux `"use client"`) branché sur l'action via `useActionState`, avec `useFormStatus` pour désactiver le bouton pendant l'envoi.
3. **Route Handler `GET /api/familles`** (`app/api/familles/route.ts`) pour un **client externe** (app mobile partenaire, pas de cookie de session) : auth par header `x-api-key`, query params validés zod, `select` restreint.

**Contrainte (le cœur du lab) :** tu dois **prouver** que la sécurité est côté serveur — en POSTant l'action / en curlant la route **sans** passer par l'UI, et en montrant qu'elle refuse (401/403) quand l'auth manque ou que le rôle est mauvais.

## Étapes (en friction)

1. Écris `FamilySchema` (zod) : `name` string 2–80 chars, `spaceId` non vide.
2. Écris `createFamily`. Ordre imposé : **d'abord** `auth()` + rôle, **ensuite** zod, **ensuite** `db`. Si l'ordre t'indiffère, demande-toi : pourquoi valider avant d'avoir vérifié qui appelle ?
3. Câble `CreateFamilyForm` avec `useActionState`, affiche `state.fieldErrors`.
4. Passe `auth()` en `role: 'member'` : soumets le form → l'action doit refuser. Repasse en `admin`.
5. **Preuve serveur** : sans toucher au form, `curl -X POST` l'action (ou appelle-la depuis la console) avec un rôle member simulé → refus. C'est la démonstration que le form n'est pas la barrière.
6. Écris `GET /api/familles`, teste `curl` **sans** `x-api-key` (401) puis **avec** (200). `await params`/`searchParams` (Next 15 : ce sont des Promises côté page ; pour un Route Handler, lis via `request.nextUrl.searchParams`).

## Corrigé complet commenté

```ts
// app/actions/family-actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const FamilySchema = z.object({
  name: z.string().trim().min(2, '2 caractères minimum').max(80),
  spaceId: z.string().min(1),
});

export interface CreateFamilyState {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  success?: boolean;
}

export async function createFamily(
  _prev: CreateFamilyState,
  formData: FormData,
): Promise<CreateFamilyState> {
  // (a) AUTORISATION D'ABORD — l'action est un endpoint public.
  const session = await auth();
  if (!session) return { formError: 'Non authentifié.' };
  if (session.user.role !== 'admin') {
    return { formError: 'Réservé aux administrateurs.' };
  }

  // (b) VALIDATION ensuite — ne jamais faire confiance au corps de la requête.
  const parsed = FamilySchema.safeParse({
    name: formData.get('name'),
    spaceId: formData.get('spaceId'),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // (c) EFFET + revalidation
  await db.family.create(parsed.data);
  revalidatePath('/admin/familles'); // la liste se rafraîchit sans reload manuel
  return { success: true };
}
```

```tsx
// app/admin/familles/SubmitButton.tsx
'use client';
import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  // useFormStatus DOIT être dans un enfant du <form>, pas dans le composant du form
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Création…' : 'Créer la famille'}
    </button>
  );
}
```

```tsx
// app/admin/familles/CreateFamilyForm.tsx
'use client';
import { useActionState } from 'react';
import { createFamily, type CreateFamilyState } from '@/app/actions/family-actions';
import { SubmitButton } from './SubmitButton';

const initial: CreateFamilyState = {};

export function CreateFamilyForm({ spaceId }: { spaceId: string }) {
  const [state, formAction] = useActionState(createFamily, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="spaceId" value={spaceId} />
      <label>
        Nom
        <input name="name" required />
      </label>
      {state.fieldErrors?.name && (
        <p role="alert">{state.fieldErrors.name[0]}</p>
      )}
      {state.formError && <p role="alert">{state.formError}</p>}
      {state.success && <p>Famille créée.</p>}
      <SubmitButton />
    </form>
  );
}
```

```ts
// app/api/familles/route.ts — client EXTERNE (pas de cookie de session)
import { z } from 'zod';
import { db } from '@/lib/db';

const QuerySchema = z.object({
  spaceId: z.string().min(1),
});

export async function GET(request: Request) {
  // Auth par clé d'API : le client externe ne partage pas la session admin
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.PARTNER_API_KEY) {
    return Response.json({ error: 'Clé invalide' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ spaceId: searchParams.get('spaceId') });
  if (!parsed.success) {
    return Response.json({ error: 'spaceId requis' }, { status: 400 });
  }

  const families = await db.family.list(parsed.data.spaceId);
  // select restreint : on ne renvoie QUE ce que le partenaire doit voir
  const safe = families.map((f) => ({ id: f.id, name: f.name }));
  return Response.json(safe);
}
```

**Ce que tu dois pouvoir expliquer au coach :**
- Pourquoi `auth()` **avant** zod : inutile de valider le corps d'un appelant qu'on va de toute façon refuser ; l'autorisation est la première porte.
- Pourquoi le Route Handler utilise `x-api-key` et non la session cookie : le client externe n'a pas de session dans le navigateur admin.
- Pourquoi le `select` restreint : ne jamais fuiter `spaceId`/champs internes à un partenaire externe.
- Pourquoi `useFormStatus` est dans `SubmitButton` et pas dans `CreateFamilyForm` : il lit le statut du `<form>` **parent**, il doit être un enfant.

## Variante J+30 (fading)

Reprends **sans le corrigé**, en 30 minutes :
1. Ajoute une Server Action `deleteFamily(id)` — même triptyque (rôle admin + zod sur l'id + revalidate). Vérifie qu'un `member` est refusé.
2. Sur `GET /api/familles`, ajoute un rate-limit naïf en mémoire (map IP → compteur, 429 au-delà de N appels/min). Explique pourquoi ce n'est qu'un garde-fou de démo (en prod : store partagé/edge).

## Application TribuZen

Porte dans `smaurier/tribuzen` :
- `app/actions/family-actions.ts` : `createFamily` avec `auth()` réel (NextAuth/lucia) + `FamilySchema` partagé front/back + `db.family.create` (Prisma/Drizzle) + `revalidatePath('/admin/familles')`.
- `app/admin/familles/` : `CreateFamilyForm` (`useActionState`) + `SubmitButton` (`useFormStatus`).
- `app/api/familles/route.ts` : GET public par `x-api-key` pour l'app mobile partenaire, `select` restreint.
- Secret `PARTNER_API_KEY` dans `.env.local` (sans préfixe `NEXT_PUBLIC_`, invisible au navigateur).
- Commit : `feat(familles): server action securisee (zod + role) + route API partenaire`.
```
