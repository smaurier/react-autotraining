---
titre: API Routes et Server Actions
cours: 04-react
notions: [Route Handlers app/api/route.ts, méthodes GET et POST, objets Request et Response Web, params await en Next 15, Server Actions use server, appel depuis form action ou event, useActionState et useFormStatus, validation zod des entrées, autorisation dans l'action, revalidatePath et redirect, Route Handler vs Server Action]
outcomes: [créer un Route Handler GET et POST qui lit une Request Web et renvoie une Response, écrire une Server Action sécurisée qui valide ses entrées avec zod et vérifie l'autorisation côté serveur, câbler une Server Action à un formulaire avec useActionState et useFormStatus puis revalider le cache]
prerequis: [26-data-fetching]
next: 28-middleware-et-config
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }, { name: zod, version: "^3" }]
tribuzen: admin web Next.js — Server Action createFamily (zod + rôle admin + revalidatePath) et Route Handler GET /api/familles pour un client externe
last-reviewed: 2026-07
---

# API Routes et Server Actions

> **Outcomes — tu sauras FAIRE :** créer un Route Handler `GET`/`POST` qui lit une `Request` Web et renvoie une `Response`, écrire une Server Action sécurisée (validation zod + autorisation côté serveur), la câbler à un formulaire avec `useActionState`/`useFormStatus` et revalider le cache.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu reprends l'admin TribuZen (Next.js 15, App Router). L'onboarding d'une nouvelle famille passe par un formulaire réservé aux admins. Un collègue a livré cette Server Action :

```tsx
// app/actions/family-actions.ts — LIVRÉ PAR UN COLLÈGUE
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createFamily(formData: FormData) {
  const name = formData.get("name") as string;
  const plan = formData.get("plan") as string;

  await db.family.create({ data: { name, plan } });
  revalidatePath("/admin/familles");
}
```

Ça marche en démo. **En production, c'est une faille.** Trois problèmes graves :

1. **Aucune validation.** `name` peut être vide, `plan` peut valoir `"pirate"` — la ligne part en base telle quelle.
2. **Aucune autorisation.** Rien ne vérifie que l'appelant est admin. Une Server Action est un **endpoint HTTP public** : n'importe qui peut la déclencher, formulaire ou pas.
3. **Confiance au client.** `formData.get("plan")` vient du navigateur. Un utilisateur peut forger la requête et passer `plan: "enterprise"` gratuitement.

Ce module te donne les outils pour transformer ce brouillon en action sûre, et pour choisir entre Server Action et Route Handler selon le besoin.

---

## 2. Théorie complète, concise

### 2.1 Deux mécanismes serveur, deux usages

Next.js 15 offre deux façons d'exécuter du code serveur depuis l'App Router :

| | Route Handler | Server Action |
|---|---|---|
| Fichier | `app/api/.../route.ts` | fonction `"use server"` (n'importe où) |
| Appelé par | `fetch("/api/...")`, client externe, webhook | `<form action={fn}>` ou event handler |
| Verbe HTTP | `GET`, `POST`, `PUT`, `DELETE`... | `POST` uniquement (encapsulé par React) |
| Contrat | REST classique, tu écris l'URL | pas d'URL visible, appel « direct » |
| Usage type | API publique, tiers, webhook, lecture | mutation depuis l'UI (formulaire) |

Règle mentale : **Route Handler = porte d'entrée pour l'extérieur** (un client qui n'est pas ton front). **Server Action = mutation déclenchée par ton propre front**.

### 2.2 Route Handlers — la base

Un Route Handler vit dans `app/api/<segment>/route.ts` et **exporte une fonction par verbe HTTP**. Il reçoit une `Request` Web standard et renvoie une `Response` Web standard.

```tsx
// app/api/familles/route.ts
export async function GET() {
  const familles = [{ id: "f1", name: "Les Dupont" }];
  // Response.json est la Web API standard (pas besoin de NextResponse)
  return Response.json(familles);
}
```

`Request` et `Response` sont les objets **du standard Web**, pas une invention Next.js. `NextRequest`/`NextResponse` (importés de `next/server`) en sont des sur-ensembles pratiques (`request.nextUrl`, cookies typés), mais les objets natifs suffisent souvent.

```tsx
// app/api/familles/route.ts
export async function POST(request: Request) {
  const body = await request.json(); // Request.json() — Web API
  return Response.json({ recu: body }, { status: 201 });
}
```

### 2.3 Lire query params et headers

```tsx
export async function GET(request: Request) {
  // URL standard — pas besoin de NextRequest pour ça
  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan"); // /api/familles?plan=pro

  const apiKey = request.headers.get("x-api-key"); // Headers Web API

  return Response.json({ plan, hasKey: Boolean(apiKey) });
}
```

### 2.4 Route dynamique — `params` est une Promise en Next 15

C'est **le** changement de rupture Next 15 : le second argument `{ params }` est désormais une **Promise**, il faut l'`await`.

```tsx
// app/api/familles/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ⚠️ Next 15 : params est une Promise
  return Response.json({ id, name: `Famille ${id}` });
}
```

> Oublier l'`await` en Next 15 donne `undefined` silencieux (`params.id` sur une Promise). C'est le piège n°1 de la migration 14 → 15.

### 2.5 Server Actions — mutation sans écrire d'endpoint

Une Server Action est une fonction `async` marquée `"use server"`. React la sérialise en une référence qu'un `<form action={...}>` ou un event handler peut invoquer. Aucun `fetch`, aucune URL à écrire côté client.

```tsx
// app/actions/family-actions.ts
"use server"; // en tête de fichier : TOUT le fichier est serveur

import { revalidatePath } from "next/cache";

export async function createFamily(formData: FormData) {
  const name = formData.get("name");
  // ... voir §2.7 pour la version sécurisée
  revalidatePath("/admin/familles");
}
```

Deux façons de placer `"use server"` :
- **En tête de fichier** — tout le module est composé de Server Actions.
- **En tête de fonction** — une seule fonction dans un Server Component devient une action.

### 2.6 SÉCURITÉ — une Server Action est un ENDPOINT PUBLIC

**Le point le plus important du module.** Quand tu écris `"use server"`, React crée un endpoint HTTP accessible publiquement. Le `<form>` n'est qu'une des façons de l'appeler — un attaquant peut forger la requête à la main, sans passer par ton UI.

Conséquences non négociables, **à faire DANS l'action** :

1. **Ne jamais faire confiance aux entrées.** Toute donnée (`formData`, arguments) vient du client. **Valide systématiquement** (zod).
2. **Toujours ré-authentifier et autoriser.** Vérifie la session ET le rôle/propriété **dans l'action**, pas dans le composant qui l'affiche. Cacher le bouton côté client ne protège rien.
3. **Ne jamais dériver un droit d'un champ client.** `formData.get("isAdmin")` ne prouve rien. Le rôle se lit depuis la session serveur.

Next.js ajoute des garde-fous (CSRF via comparaison Origin/Host, limite de body à 1 Mo, actions inutilisées retirées du bundle, chiffrement des références au build) — **mais ça ne remplace pas ta validation et ton autorisation métier**.

### 2.7 Le pattern sûr : valider (zod) + autoriser + agir

```tsx
// app/actions/family-actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// 1. Schéma d'entrée — la source de vérité sur ce qui est acceptable
const FamilySchema = z.object({
  name: z.string().min(2, "Nom trop court").max(80),
  plan: z.enum(["free", "pro"]), // impossible de forger "enterprise"
});

export type CreateFamilyState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function createFamily(
  _prev: CreateFamilyState,
  formData: FormData
): Promise<CreateFamilyState> {
  // 2. AUTORISATION — dans l'action, jamais uniquement dans l'UI
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };
  if (session.user.role !== "admin") return { error: "Accès refusé" };

  // 3. VALIDATION — safeParse ne throw pas, on renvoie les erreurs au form
  const parsed = FamilySchema.safeParse({
    name: formData.get("name"),
    plan: formData.get("plan"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // 4. ACTION — seulement ici on touche la base, avec des données propres
  await db.family.create({ data: parsed.data });

  // 5. Revalider le cache de la page qui liste les familles
  revalidatePath("/admin/familles");
  return { success: true };
}
```

Ordre imposé : **autoriser → valider → agir → revalider**. On rejette au plus tôt.

### 2.8 Câbler l'action au formulaire — `useActionState`

`useActionState` (React 19, remplace `useFormState`) prend `(action, initialState)` et renvoie `[state, formAction, isPending]`. Le `state` est ce que l'action retourne — parfait pour afficher erreurs et succès.

```tsx
// app/admin/familles/CreateFamilyForm.tsx
"use client";

import { useActionState } from "react";
import { createFamily, type CreateFamilyState } from "@/app/actions/family-actions";
import { SubmitButton } from "./SubmitButton";

const initial: CreateFamilyState = {};

export function CreateFamilyForm() {
  const [state, formAction] = useActionState(createFamily, initial);

  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>Famille créée.</p>}

      <label>
        Nom
        <input name="name" required />
      </label>
      {state.fieldErrors?.name && <span>{state.fieldErrors.name[0]}</span>}

      <label>
        Plan
        <select name="plan">
          <option value="free">Gratuit</option>
          <option value="pro">Pro</option>
        </select>
      </label>

      <SubmitButton />
    </form>
  );
}
```

### 2.9 Feedback pendant l'envoi — `useFormStatus`

`useFormStatus` (`react-dom`) lit l'état du `<form>` parent. **Contrainte forte : il doit vivre dans un composant ENFANT du `<form>`, jamais dans le même composant que le `<form>`.**

```tsx
// app/admin/familles/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus(); // lit le <form> parent
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Création..." : "Créer la famille"}
    </button>
  );
}
```

### 2.10 `revalidatePath` et `redirect`

Après une mutation, les données affichées sont périmées. Deux outils depuis l'action :

- `revalidatePath("/admin/familles")` — vide le cache de ce chemin, la prochaine visite refetch.
- `redirect("/admin/familles")` — depuis `next/navigation`, envoie l'utilisateur ailleurs après succès. **`redirect` lance une exception de contrôle** : il ne doit pas être dans un `try/catch` qui l'avalerait.

```tsx
"use server";
import { redirect } from "next/navigation";

export async function createFamilyThenGo(formData: FormData) {
  // ... auth + validation + db.create ...
  redirect("/admin/familles"); // ne rien écrire après : redirect throw
}
```

---

## 3. Worked examples

### Exemple 1 — Server Action `createFamily` sécurisée de bout en bout (TribuZen)

Reprise du cas concret. On corrige les trois failles : validation, autorisation, zéro confiance au client.

```tsx
// ─── app/actions/family-actions.ts ──────────────────────────────
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FamilySchema = z.object({
  name: z.string().trim().min(2).max(80),
  plan: z.enum(["free", "pro"]),
});

export type CreateFamilyState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function createFamily(
  _prev: CreateFamilyState,
  formData: FormData
): Promise<CreateFamilyState> {
  // Étape 1 — autorisation serveur (la faille n°2 du cas concret)
  const session = await auth();
  if (!session?.user) return { error: "Non authentifié" };
  if (session.user.role !== "admin") return { error: "Accès refusé" };

  // Étape 2 — validation (la faille n°1) ; safeParse => pas de throw
  const parsed = FamilySchema.safeParse({
    name: formData.get("name"),
    plan: formData.get("plan"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Étape 3 — parsed.data est TYPÉ et NETTOYÉ ; on n'utilise plus formData
  // (la faille n°3 : plus aucune donnée client brute ne file en base)
  await db.family.create({
    data: {
      name: parsed.data.name,
      plan: parsed.data.plan,
      createdBy: session.user.id, // dérivé de la session, pas du client
    },
  });

  // Étape 4 — la liste des familles est maintenant périmée
  revalidatePath("/admin/familles");
  return { success: true };
}
```

**Ce que chaque étape empêche :**
- Étape 1 : un non-admin qui forge la requête POST est rejeté même sans passer par l'UI.
- Étape 2 : `name: ""` ou `plan: "enterprise"` sont refusés avant toute écriture.
- Étape 3 : `createdBy` vient de `session.user.id`, impossible à usurper via `formData`.

### Exemple 2 — Route Handler `GET /api/familles` pour un client externe

Un partenaire (app mobile tierce) doit lister les familles via HTTP classique. Server Action inadaptée (pas d'URL, pensée pour ton front) → **Route Handler**.

```tsx
// ─── app/api/familles/route.ts ──────────────────────────────────
import { z } from "zod";
import { db } from "@/lib/db";

// Même principe qu'une action : un endpoint public se protège et se valide
const QuerySchema = z.object({
  plan: z.enum(["free", "pro"]).optional(),
});

export async function GET(request: Request) {
  // 1. Auth par clé d'API (client externe, pas de session cookie)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.PARTNER_API_KEY) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 2. Valider les query params (client = non fiable, même en GET)
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    plan: searchParams.get("plan") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  // 3. Lire en base avec un filtre propre
  const familles = await db.family.findMany({
    where: parsed.data.plan ? { plan: parsed.data.plan } : undefined,
    select: { id: true, name: true, plan: true }, // pas de champs sensibles
  });

  return Response.json(familles);
}
```

**Points clés du handler :**
- `Request`/`Response` Web standard suffisent — pas besoin de `NextResponse`.
- Un endpoint public s'authentifie (ici clé d'API) et valide ses entrées, **exactement comme une Server Action**.
- `select` restreint les colonnes renvoyées : on n'expose pas tout le modèle à un tiers.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire qu'une Server Action est privée parce qu'appelée depuis un form

```tsx
// ❌ FAUX modèle mental : "seul mon formulaire admin appelle cette action"
"use server";
export async function deleteFamily(formData: FormData) {
  const id = formData.get("id") as string;
  await db.family.delete({ where: { id } }); // n'importe qui peut POST ça
}
```

Une Server Action est un **endpoint HTTP public**. Le formulaire n'est qu'un déclencheur parmi d'autres ; un attaquant forge la requête directement.

```tsx
// ✅ Autoriser DANS l'action, toujours
"use server";
export async function deleteFamily(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Forbidden");
  const id = z.string().uuid().parse(formData.get("id"));
  await db.family.delete({ where: { id } });
}
```

### PIÈGE #2 — Vérifier le rôle dans le composant, pas dans l'action

```tsx
// ❌ La sécurité vit dans l'UI — inutile
function AdminPage({ user }) {
  if (user.role !== "admin") return <p>Interdit</p>;
  return <form action={createFamily}>...</form>; // l'action, elle, ne vérifie rien
}
```

Cacher le formulaire empêche l'affichage, **pas l'appel**. L'action reste joignable par requête directe. La vérification d'autorisation doit être **dans** `createFamily`, côté serveur.

### PIÈGE #3 — Oublier `await params` en Next 15

```tsx
// ❌ Next 15 : params est une Promise
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return Response.json({ id: params.id }); // undefined ! params est une Promise
}

// ✅ Await obligatoire
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json({ id });
}
```

### PIÈGE #4 — `useFormStatus` dans le même composant que le `<form>`

```tsx
// ❌ pending reste toujours false — le hook ne "voit" pas un form frère/parent défini ici
"use client";
export function Form() {
  const { pending } = useFormStatus(); // hors d'un <form> parent
  return <form action={createFamily}><button disabled={pending}>OK</button></form>;
}

// ✅ Extraire le bouton dans un composant ENFANT du <form>
export function Form() {
  return (
    <form action={createFamily}>
      <SubmitButton /> {/* useFormStatus lit le form parent ici */}
    </form>
  );
}
```

### PIÈGE #5 — `redirect()` dans un `try/catch`

```tsx
// ❌ redirect() lance une exception de contrôle ; le catch l'avale
"use server";
export async function save(formData: FormData) {
  try {
    await db.family.create({ /* ... */ });
    redirect("/admin/familles"); // capturé par le catch => pas de redirection
  } catch (e) {
    return { error: "Échec" };
  }
}

// ✅ redirect APRÈS le bloc à risque, hors du try/catch
"use server";
export async function save(formData: FormData) {
  try {
    await db.family.create({ /* ... */ });
  } catch {
    return { error: "Échec" };
  }
  redirect("/admin/familles"); // hors du try : l'exception de contrôle passe
}
```

### PIÈGE #6 — Utiliser une Server Action pour un webhook ou une API tierce

Une Server Action n'a pas d'URL stable, n'accepte que du `POST` encapsulé par React, et attend un contexte React. Pour un webhook Stripe, un cron externe, ou un partenaire qui fait `fetch`, il faut un **Route Handler** (`app/api/.../route.ts`) avec un contrat HTTP explicite.

---

## 5. Ancrage TribuZen

L'admin TribuZen est une app Next.js 15 (App Router). Ce module câble deux points réels du produit.

**Server Action `createFamily`** (`app/actions/family-actions.ts`) — utilisée par le formulaire d'onboarding admin (`app/admin/familles/CreateFamilyForm.tsx`). Elle applique le triptyque : `auth()` + rôle `admin`, schéma zod `FamilySchema`, puis `db.family.create` et `revalidatePath("/admin/familles")` pour rafraîchir la liste. C'est le garde-fou qui empêche un membre non-admin de créer une famille en forgeant la requête.

**Route Handler `GET /api/familles`** (`app/api/familles/route.ts`) — exposé à un **client externe** (app mobile partenaire) qui ne partage pas la session cookie de l'admin. Authentification par `x-api-key`, validation des query params par zod, `select` restreint pour ne pas fuiter de champs sensibles.

**Feedback UI** — `CreateFamilyForm` (client) branche `useActionState` sur l'action pour afficher `fieldErrors`/`success` ; `SubmitButton` (enfant) utilise `useFormStatus` pour désactiver le bouton pendant l'envoi.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/
  app/
    actions/
      family-actions.ts        # Server Action createFamily (zod + rôle admin)
    admin/
      familles/
        page.tsx               # liste + <CreateFamilyForm/>
        CreateFamilyForm.tsx    # "use client" — useActionState
        SubmitButton.tsx        # "use client" — useFormStatus
    api/
      familles/
        route.ts               # GET public pour client externe (x-api-key)
  lib/
    auth.ts                    # auth() -> session { user: { id, role } }
    db.ts                      # client Prisma/Drizzle
```

---

## 6. Points clés

1. Route Handler (`app/api/.../route.ts`) = endpoint HTTP pour l'extérieur (tiers, webhook, client externe) ; il exporte une fonction par verbe (`GET`, `POST`...).
2. Un Route Handler reçoit une `Request` Web et renvoie une `Response` Web (`Response.json(...)`) — les objets standard suffisent, `NextRequest`/`NextResponse` sont des sur-ensembles.
3. En Next 15, le `params` d'une route dynamique est une **Promise** : `const { id } = await params`.
4. Server Action = fonction `"use server"` appelée depuis `<form action={fn}>` ou un event ; pas d'URL à écrire, pensée pour les mutations de ton propre front.
5. **Une Server Action est un endpoint PUBLIC** : toujours valider les entrées (zod) ET vérifier l'autorisation **dans l'action**, jamais faire confiance au client ni se reposer sur l'UI.
6. Ordre imposé dans une action : autoriser → valider → agir → revalider ; un droit se lit depuis la session serveur, jamais depuis un champ `formData`.
7. `useActionState(action, initial)` gère le résultat (erreurs/succès) ; `useFormStatus` donne `pending` mais **doit être dans un composant enfant** du `<form>`.
8. Après mutation : `revalidatePath` vide le cache d'un chemin ; `redirect` (de `next/navigation`) déplace l'utilisateur et doit rester **hors** d'un `try/catch`.

---

## 7. Seeds Anki

```
Pourquoi une Server Action doit-elle valider ses entrées et vérifier l'autorisation elle-même ?|Parce qu'une Server Action est un endpoint HTTP public : le <form> n'est qu'un déclencheur, un attaquant peut forger la requête directement. La sécurité dans l'UI (cacher le bouton) ne protège rien. Il faut auth + validation zod DANS l'action.
En Next.js 15, comment lit-on le paramètre d'une route dynamique dans un Route Handler ?|params est désormais une Promise : il faut l'await. Ex : export async function GET(req, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; }. Sans await, on lit undefined.
Quand choisir un Route Handler plutôt qu'une Server Action ?|Route Handler pour un contrat HTTP explicite destiné à l'extérieur : API publique, webhook, client tiers, cron externe (URL stable, tout verbe). Server Action pour une mutation déclenchée par ton propre front via <form action={fn}> (POST encapsulé, pas d'URL).
Quel est l'ordre correct des étapes dans une Server Action de mutation ?|Autoriser (auth + rôle depuis la session serveur) → valider les entrées (zod safeParse) → agir (écriture BDD avec les données parsées) → revalider (revalidatePath). On rejette au plus tôt et on n'utilise jamais formData brut après validation.
Quelle contrainte impose useFormStatus et pourquoi ?|useFormStatus (react-dom) doit être appelé dans un composant ENFANT du <form>, pas dans le composant qui définit le <form>. Sinon il ne "voit" pas le form et pending reste false. On extrait donc le bouton dans un SubmitButton dédié.
Que renvoie useActionState et à quoi sert le state ?|useActionState(action, initialState) renvoie [state, formAction, isPending]. Le state est la valeur retournée par la Server Action (ex : { error, fieldErrors, success }), ce qui permet d'afficher erreurs de validation et succès dans le formulaire.
Pourquoi ne faut-il pas mettre redirect() dans un try/catch ?|redirect() (next/navigation) fonctionne en lançant une exception de contrôle interceptée par Next.js. Un catch l'avale et la redirection n'a pas lieu. Il faut appeler redirect() APRÈS le bloc try/catch à risque.
Que fait Response.json() dans un Route Handler et faut-il NextResponse ?|Response.json(data, init?) est la Web API standard : elle crée une Response JSON. NextResponse (next/server) est un sur-ensemble pratique (cookies, redirections typées) mais n'est pas obligatoire ; Request/Response natifs suffisent dans la plupart des handlers.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-27-api-routes-et-server-actions/README.md`. Écrire la Server Action `createFamily` sécurisée (zod + rôle admin + revalidatePath) et le Route Handler `GET /api/familles` pour un client externe, puis les câbler à un formulaire avec `useActionState`/`useFormStatus`.
