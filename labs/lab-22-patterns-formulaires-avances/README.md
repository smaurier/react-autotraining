# Lab 22 — Patterns de formulaires avancés

> **Outcome :** à la fin, tu sais construire un wizard multi-étapes avec champs dynamiques (`useFieldArray`), validation asynchrone d'unicité et agrégation d'état entre étapes.
> **Vrai outil :** React 19 + TypeScript + `react-hook-form` (^7) + `zod` (^3) + `@hookform/resolvers`, dans un projet Vite réel. Aucun harnais simulé.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur).

## Énoncé

Tu construis le **wizard de création de famille** de l'admin TribuZen. Trois étapes :

1. **Infos** — nom de la famille + ville.
2. **Membres** — liste dynamique de membres (nom + email) via `useFieldArray`. Deux membres ne peuvent pas partager le même email (intra-formulaire), et un email ne doit pas déjà exister côté serveur (validation async).
3. **Confirmation** — récap en lecture seule + bouton de création.

Contrainte structurante : les données saisies doivent **survivre aux allers-retours** entre étapes (revenir à l'étape 1 ne doit rien effacer).

Starter (dans un projet Vite `react-ts` avec les libs installées) :

```bash
npm create vite@latest tribuzen-forms -- --template react-ts
cd tribuzen-forms
npm i react-hook-form zod @hookform/resolvers
```

```tsx
// src/api/members.ts — stub à garder tel quel (simule le serveur)
const TAKEN = new Set(['paul@dejapris.fr', 'admin@tribuzen.app']);

export async function isEmailTaken(email: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 300)); // latence réseau simulée
  return TAKEN.has(email.toLowerCase());
}
```

À toi d'écrire `src/features/family/CreateFamilyWizard.tsx` et ses étapes.

## Étapes (en friction)

1. Écris `family.schema.ts` : `infoSchema` (familyName ≥ 2, city ≥ 2) et `membersSchema` (tableau `members` de `{ name, email }`, `.min(1)`, un `.refine` qui interdit les emails en double dans le formulaire, et sur l'email un `.refine` **async** qui appelle `isEmailTaken` pour l'unicité serveur). Exporte les types inférés.
2. Écris `StepInfo` : un `useForm` avec `zodResolver(infoSchema)`, `defaultValues` reçus en props, `onNext` appelé au `handleSubmit`.
3. Écris `StepMembers` : `useForm` + `useFieldArray({ control, name: 'members' })`. Boucle sur `fields` avec `key={field.id}`. Boutons ajouter/retirer. N'ajoute **pas** de `validate` sur le `register` de l'email : avec un `resolver` Zod, ce validator serait ignoré — l'unicité serveur vit dans le schéma (`.refine` async). Mets le form en `mode: 'onBlur'`.
4. Écris `StepConfirm` : récap lecture seule + bouton créer (POST simulé).
5. Écris le parent `CreateFamilyWizard` : un state `data` qui agrège les étapes, un state `step`, et réinjecte `data` dans chaque étape via `initial`/`defaultValues`.
6. Vérifie à la main : ajoute 3 membres, saisis `paul@dejapris.fr` → erreur async ; saisis deux fois le même email → erreur de doublon ; reviens à l'étape 1 → les champs sont toujours remplis.

## Corrigé complet commenté

```tsx
// ─── src/features/family/family.schema.ts ────────────────────────
import { z } from 'zod';
import { isEmailTaken } from '../../api/members';

export const infoSchema = z.object({
  familyName: z.string().min(2, 'Nom de famille requis'),
  city: z.string().min(2, 'Ville requise'),
});

export const membersSchema = z
  .object({
    members: z
      .array(
        z.object({
          name: z.string().min(2, 'Nom requis'),
          // unicité SERVEUR : refine ASYNC dans le schéma.
          // zodResolver appelle parseAsync → les refine async s'exécutent.
          // (Avec un resolver, un `validate` dans register serait IGNORÉ.)
          email: z
            .string()
            .email('Email invalide')
            .refine(async (e) => !(await isEmailTaken(e)), 'Email déjà utilisé'),
        })
      )
      .min(1, 'Au moins un membre'),
  })
  // unicité INTRA-formulaire : un Set d'emails doit avoir la même taille que la liste
  .refine(
    (d) => new Set(d.members.map((m) => m.email.toLowerCase())).size === d.members.length,
    { message: 'Deux membres ont le même email', path: ['members'] }
  );

export type InfoData = z.infer<typeof infoSchema>;
export type MembersData = z.infer<typeof membersSchema>;
export type FamilyData = InfoData & MembersData;
```

```tsx
// ─── src/features/family/StepInfo.tsx ────────────────────────────
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { infoSchema, type InfoData } from './family.schema';

interface Props {
  initial: InfoData;
  onNext: (data: InfoData) => void;
}

export function StepInfo({ initial, onNext }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<InfoData>({
    resolver: zodResolver(infoSchema),
    defaultValues: initial, // réinjecte ce qui a déjà été saisi
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <input {...register('familyName')} placeholder="Nom de la famille" />
      {errors.familyName && <p role="alert">{errors.familyName.message}</p>}

      <input {...register('city')} placeholder="Ville" />
      {errors.city && <p role="alert">{errors.city.message}</p>}

      <button type="submit">Suivant</button>
    </form>
  );
}
```

```tsx
// ─── src/features/family/StepMembers.tsx ─────────────────────────
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { membersSchema, type MembersData } from './family.schema';

interface Props {
  initial: MembersData;
  onNext: (data: MembersData) => void;
  onBack: () => void;
}

export function StepMembers({ initial, onNext, onBack }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValidating },
  } = useForm<MembersData>({
    resolver: zodResolver(membersSchema),
    defaultValues: initial,
    mode: 'onBlur', // valide l'unicité serveur au blur, pas à chaque frappe
  });

  // useFieldArray a besoin de `control` pour se brancher sur le form
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      {fields.map((field, i) => (
        // key STABLE = field.id, jamais l'index
        <div key={field.id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
          <input {...register(`members.${i}.name`)} placeholder="Nom" />
          {errors.members?.[i]?.name && <p role="alert">{errors.members[i]?.name?.message}</p>}

          <input
            placeholder="Email"
            // Pas de `validate` ici : avec un resolver Zod, les validators de
            // register ne s'exécutent JAMAIS. L'unicité serveur est dans le
            // schéma (.refine async), exécutée via parseAsync au blur.
            {...register(`members.${i}.email`)}
          />
          {errors.members?.[i]?.email && <p role="alert">{errors.members[i]?.email?.message}</p>}

          <button type="button" onClick={() => remove(i)} disabled={fields.length <= 1}>
            Retirer
          </button>
        </div>
      ))}

      {/* erreur de niveau tableau : min(1) ou doublon (.refine) */}
      {errors.members?.root && <p role="alert">{errors.members.root.message}</p>}
      {typeof errors.members?.message === 'string' && <p role="alert">{errors.members.message}</p>}

      <button type="button" onClick={() => append({ name: '', email: '' })}>
        + Ajouter un membre
      </button>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={onBack}>Précédent</button>
        <button type="submit" disabled={isValidating}>
          {isValidating ? 'Vérification…' : 'Suivant'}
        </button>
      </div>
    </form>
  );
}
```

```tsx
// ─── src/features/family/StepConfirm.tsx ─────────────────────────
import type { FamilyData } from './family.schema';

interface Props {
  data: FamilyData;
  onBack: () => void;
  onSubmitAll: () => void;
  submitting: boolean;
}

export function StepConfirm({ data, onBack, onSubmitAll, submitting }: Props) {
  return (
    <div>
      <h3>Confirmer la création</h3>
      <p>Famille <strong>{data.familyName}</strong> — {data.city}</p>
      <ul>
        {data.members.map((m) => (
          <li key={m.email}>{m.name} · {m.email}</li>
        ))}
      </ul>
      <button type="button" onClick={onBack}>Précédent</button>
      <button type="button" onClick={onSubmitAll} disabled={submitting}>
        {submitting ? 'Création…' : 'Créer la famille'}
      </button>
    </div>
  );
}
```

```tsx
// ─── src/features/family/CreateFamilyWizard.tsx ──────────────────
import { useState } from 'react';
import { StepInfo } from './StepInfo';
import { StepMembers } from './StepMembers';
import { StepConfirm } from './StepConfirm';
import type { FamilyData } from './family.schema';

export function CreateFamilyWizard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);

  // state PARENT qui agrège les étapes → survit aux allers-retours
  const [data, setData] = useState<FamilyData>({
    familyName: '',
    city: '',
    members: [{ name: '', email: '' }],
  });

  const submitAll = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      alert('Famille créée !');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p>Étape {step + 1}/3</p>

      {step === 0 && (
        <StepInfo
          initial={{ familyName: data.familyName, city: data.city }}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d })); // fusion dans le parent
            setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <StepMembers
          initial={{ members: data.members }}
          onBack={() => setStep(0)}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <StepConfirm
          data={data}
          submitting={submitting}
          onBack={() => setStep(1)}
          onSubmitAll={submitAll}
        />
      )}
    </div>
  );
}
```

Vérifications manuelles attendues :
- Ajouter/retirer des membres fonctionne sans mélanger les valeurs (grâce à `field.id`).
- `paul@dejapris.fr` déclenche l'erreur async « Email déjà utilisé » au blur — portée par le `.refine` async du schéma (exécuté par `parseAsync` via `zodResolver`), pas par un `validate` de `register`.
- Deux membres avec le même email → « Deux membres ont le même email » (erreur de niveau tableau).
- Revenir à l'étape 1 conserve nom/ville ; revenir à l'étape 2 conserve les membres.

## Variante J+30 (fading)

Reprends le wizard **de mémoire, en 25 min**, avec deux contraintes ajoutées :
1. Ajoute un composant de champ réutilisable `TextField` (props `label`, `registration: UseFormRegisterReturn`, `error?: FieldError`) et utilise-le partout à la place des `<input> + <p>` bruts.
2. Ajoute à l'étape membres une case « responsable légal » par membre ; si cochée, un champ `phone` (≥ 10 caractères) apparaît via `watch` et devient requis via un `.refine` Zod. Interdit-toi de recopier le corrigé.

## Application TribuZen

Porte le wizard dans le vrai produit `smaurier/tribuzen` :
- Crée `src/features/family/` avec `CreateFamilyWizard.tsx`, `StepInfo.tsx`, `StepMembers.tsx`, `StepConfirm.tsx`, `family.schema.ts`.
- Remplace le stub `isEmailTaken` par un vrai appel à `GET /api/members/exists?email=…`.
- Branche `submitAll` sur le vrai endpoint `POST /api/families`, et mappe les conflits d'unicité renvoyés par le serveur avec `setError('members.<i>.email', { type: 'server', message })`.
- Commit : `feat(family): wizard de création de famille (useFieldArray + email unique async)`.
