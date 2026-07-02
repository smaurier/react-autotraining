# Lab 21 — React Hook Form

> **Outcome :** à la fin, tu sais câbler un formulaire de création de famille avec `useForm` + `register`, le valider par un schéma zod partagé (`zodResolver`), et brancher un composant contrôlé via `Controller`.
> **Vrai outil :** React 19 + Vite + `react-hook-form` v7 + `zod` v3 + `@hookform/resolvers` (dev server, validation réelle dans le navigateur).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le formulaire de **création de famille** de l'admin TribuZen. Cahier des charges **exact** :

1. **Schéma zod** (`schema/family.ts`) — source unique de vérité :
   - `name` : string, 2 à 50 caractères.
   - `description` : string, 280 caractères max (peut être vide).
   - `seats` : entier, 1 à 20 (nombre de places).
   - `members` : tableau de strings, au moins 1 membre.
2. **`CreateFamilyForm`** — `useForm` typé depuis `z.infer`, `resolver: zodResolver(familySchema)`, `mode: 'onBlur'`.
   - `name`, `description`, `seats` branchés par `register` (inputs natifs).
   - `members` branché par `Controller` sur un composant contrôlé `MemberPicker`.
3. **Affichage des erreurs** — sous chaque champ, message issu du schéma (`errors.<champ>.message`).
4. **Soumission** — bouton désactivé pendant `isSubmitting`, `reset()` après succès.

**Contraintes :**
- Le schéma zod est écrit **une seule fois** et importé par le formulaire (simule le partage front/back).
- `seats` doit arriver dans `onSubmit` en **number**, pas en string.
- `MemberPicker` reste un composant **contrôlé** pur (`value` / `onChange`) — il ne connaît pas RHF.
- **Pas de gap-fill** — tu écris chaque fichier complet depuis le starter.

### Installation

```bash
pnpm create vite@latest tribuzen-family --template react-ts
cd tribuzen-family
pnpm add react-hook-form zod @hookform/resolvers
pnpm dev
```

### Starter minimal

```
src/
  schema/
    family.ts             ← à écrire (schéma zod + type)
  features/
    family/
      MemberPicker.tsx     ← à écrire (composant contrôlé)
      CreateFamilyForm.tsx ← à écrire (useForm + register + Controller)
  App.tsx                  ← branche <CreateFamilyForm />
```

---

## Étapes (en friction)

1. **Écris `schema/family.ts`** — `familySchema = z.object({ ... })` avec les 4 champs et leurs messages. Exporte `type FamilyForm = z.infer<typeof familySchema>`. Utilise `z.coerce.number().int()` pour `seats`.
2. **Écris `MemberPicker.tsx`** — props `value: string[]`, `onChange: (v: string[]) => void`. Une liste de membres candidats en dur (ex. `['alice', 'bob', 'chris']`), chacun avec une case qui ajoute/retire l'id du tableau. Composant contrôlé pur, aucun state interne de sélection.
3. **Écris `CreateFamilyForm.tsx`** — `useForm<FamilyForm>` avec `resolver`, `mode: 'onBlur'`, `defaultValues`. `register` pour `name`/`description`/`seats`, `Controller` pour `members`. Affiche `errors.<champ>.message` sous chaque champ.
4. **Soumission** — `onSubmit` async qui `await`e un faux POST (`setTimeout`), log les données, puis `reset()`. Bouton `disabled={isSubmitting}`.
5. **Branche `App.tsx`** et vérifie dans le navigateur : soumettre vide → messages d'erreur ; nom d'1 lettre → erreur `name` ; `seats` arrive en number dans la console ; aucun membre coché → erreur `members`.
6. **Vérifie la perf** : tape dans `name` — le compteur de re-render (React DevTools) ne bouge pas (non-contrôlé).

---

## Corrigé complet commenté

```tsx
// ─── src/schema/family.ts ────────────────────────────────────────
import { z } from 'zod';

// Source UNIQUE de vérité — dans TribuZen ce fichier est aussi importé
// par la route backend POST /api/families pour re-valider la requête.
export const familySchema = z.object({
  name: z
    .string()
    .min(2, 'Nom : au moins 2 caractères')
    .max(50, 'Nom : 50 caractères max'),
  description: z
    .string()
    .max(280, 'Description : 280 caractères max'),
  // z.coerce.number convertit la string de l'input <number> en number
  seats: z
    .coerce.number()
    .int('Nombre entier attendu')
    .min(1, 'Au moins 1 place')
    .max(20, 'Maximum 20 places'),
  members: z
    .array(z.string())
    .min(1, 'Ajoute au moins un membre'),
});

// Le type est INFÉRÉ — aucune interface séparée à maintenir
export type FamilyForm = z.infer<typeof familySchema>;

// ─── src/features/family/MemberPicker.tsx ────────────────────────
// Composant CONTRÔLÉ pur : il reçoit value + onChange, ne connaît pas RHF.
// Réutilisable partout, testable seul.
interface MemberPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

const CANDIDATES = ['alice', 'bob', 'chris', 'dana'];

function MemberPicker({ value, onChange }: MemberPickerProps) {
  // Ajoute ou retire un id du tableau, puis remonte le nouveau tableau
  const toggle = (id: string) => {
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <fieldset>
      <legend>Membres</legend>
      {CANDIDATES.map((id) => (
        <label key={id} style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={value.includes(id)}
            onChange={() => toggle(id)}
          />
          {id}
        </label>
      ))}
    </fieldset>
  );
}

export default MemberPicker;

// ─── src/features/family/CreateFamilyForm.tsx ────────────────────
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { familySchema, type FamilyForm } from '../../schema/family';
import MemberPicker from './MemberPicker';

// Faux appel réseau — dans TribuZen : POST /api/families
async function createFamily(data: FamilyForm): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
  console.log('Famille créée :', data);
}

function CreateFamilyForm() {
  const {
    register,          // pour les inputs natifs
    control,           // requis par Controller
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    mode: 'onBlur',    // valide quand un champ perd le focus
    defaultValues: { name: '', description: '', seats: 4, members: [] },
  });

  // data est typé FamilyForm ET déjà validé quand on arrive ici
  const onSubmit = async (data: FamilyForm) => {
    await createFamily(data); // seats est bien un number ici
    reset();                  // vide le formulaire après succès
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="name">Nom de la famille</label>
        {/* input natif → register + spread */}
        <input id="name" {...register('name')} />
        {errors.name && <p style={{ color: 'crimson' }}>{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" rows={3} {...register('description')} />
        {errors.description && (
          <p style={{ color: 'crimson' }}>{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="seats">Places</label>
        {/* z.coerce.number gère la conversion string → number */}
        <input id="seats" type="number" {...register('seats')} />
        {errors.seats && <p style={{ color: 'crimson' }}>{errors.seats.message}</p>}
      </div>

      {/* composant contrôlé tiers → Controller */}
      <Controller
        name="members"
        control={control}
        render={({ field, fieldState }) => (
          <>
            {/* field.value = string[], field.onChange remonte le tableau */}
            <MemberPicker value={field.value} onChange={field.onChange} />
            {fieldState.error && (
              <p style={{ color: 'crimson' }}>{fieldState.error.message}</p>
            )}
          </>
        )}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Création…' : 'Créer la famille'}
      </button>
    </form>
  );
}

export default CreateFamilyForm;

// ─── src/App.tsx ─────────────────────────────────────────────────
import CreateFamilyForm from './features/family/CreateFamilyForm';

function App() {
  return (
    <div style={{ padding: '2rem', maxWidth: 480 }}>
      <h1>TribuZen Admin — Créer une famille</h1>
      <CreateFamilyForm />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- Le schéma zod est **unique** : il produit le type (`z.infer`), les règles et les messages. Dans TribuZen, le même fichier est importé par le backend — plus de divergence front/back.
- `name`, `description`, `seats` passent par `register` : inputs natifs non-contrôlés, aucun re-render à la frappe. `seats` arrive en `number` grâce à `z.coerce.number()`.
- `members` passe par `Controller` : `MemberPicker` est un composant **contrôlé** (module 20) qui ignore RHF ; `Controller` fait le pont via `field.value` / `field.onChange` et expose l'erreur zod via `fieldState.error`.
- `isSubmitting` désactive le bouton et bloque le double envoi ; `reset()` nettoie après succès. Aucun `useState` n'a été nécessaire.

---

## Variante J+30 (fading)

**Même formulaire, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module 21 :**

1. Ajoute un champ `isPrivate` (case à cocher) au schéma (`z.boolean()`) et au formulaire, via `register`.
2. Ajoute un **compteur de caractères** live sous `description` (`0/280`) — utilise `watch('description')`, et note dans un commentaire pourquoi ça réintroduit un re-render.
3. Passe le `mode` à `onChange` et observe la différence d'UX (les erreurs apparaissent pendant la frappe).
4. Ajoute une règle zod croisée avec `.refine` : si `isPrivate` est vrai, alors `members` doit contenir au moins 2 membres (message : « Une famille privée exige au moins 2 membres »).

**Critère de réussite :** le compteur se met à jour en direct, la règle `refine` bloque la soumission d'une famille privée à 1 membre avec le bon message, et `seats` reste un number.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces fichiers vivent ici :

```
tribuzen/src/
  schema/
    family.ts              # familySchema — importé par le FRONT et par la route API
  features/
    family/
      CreateFamilyForm.tsx  # useForm + register + Controller
      MemberPicker.tsx      # composant contrôlé (module 20)
```

**Différences par rapport au lab :**
- `createFamily` sera un vrai `POST /api/families` (fetch ou mutation TanStack Query) ; la route backend importe `familySchema` et re-valide la requête → sécurité côté serveur.
- Les erreurs serveur (nom de famille déjà pris) se posent avec `setError('name', { message })` renvoyé par RHF, en plus des erreurs zod client.
- `MemberPicker` interrogera la vraie liste des membres via une query, mais reste un composant contrôlé branché par `Controller` — la logique du formulaire ne change pas.

**Commit cible :**
```
feat(schema): familySchema zod partagé front/back
feat(family): CreateFamilyForm — useForm + register + Controller (MemberPicker)
```
