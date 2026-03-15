# Correction — Exercice 13 : Formulaire multi-étapes

## Résultat attendu

Un formulaire en 3 étapes avec une barre de progression. Étape 1 : informations personnelles. Étape 2 : adresses multiples avec ajout/suppression dynamique. Étape 3 : récapitulatif complet avant soumission. La navigation entre étapes valide l'étape courante et ne perd pas les donnees.

---

## Code corrige

### `src/exercises/ex13/schema.ts`

```ts
import { z } from "zod";

// --- Schema pour une adresse ---
const addressSchema = z.object({
  street: z.string().min(1, "La rue est obligatoire."),
  city: z.string().min(1, "La ville est obligatoire."),
  zipCode: z
    .string()
    .min(1, "Le code postal est obligatoire.")
    .regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres."),
  country: z.string().min(1, "Le pays est obligatoire."),
});

// --- Schema global du wizard ---
export const wizardSchema = z.object({
  // Etape 1 : Informations personnelles
  firstName: z
    .string()
    .min(2, "Le prenom doit contenir au moins 2 caracteres."),
  lastName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caracteres."),
  email: z
    .string()
    .min(1, "L'email est obligatoire.")
    .email("L'email n'est pas valide."),
  phone: z
    .string()
    .min(1, "Le telephone est obligatoire.")
    .regex(
      /^(\+33|0)[1-9](\d{2}){4}$/,
      "Le telephone doit etre au format francais (ex : 0612345678)."
    ),

  // Etape 2 : Adresses (tableau dynamique)
  addresses: z
    .array(addressSchema)
    .min(1, "Au moins une adresse est obligatoire."),
});

// --- Schemas partiels pour la validation par etape ---
export const stepOneSchema = wizardSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
});

export const stepTwoSchema = wizardSchema.pick({
  addresses: true,
});

// --- Types inferes ---
export type WizardFormData = z.infer<typeof wizardSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Step = 1 | 2 | 3;
```

### `src/exercises/ex13/components/ProgressBar.tsx`

```tsx
import type { Step } from "../schema";

interface ProgressBarProps {
  currentStep: Step;
}

const steps = [
  { number: 1 as const, label: "Informations" },
  { number: 2 as const, label: "Adresses" },
  { number: 3 as const, label: "Recapitulatif" },
];

/**
 * Composant ProgressBar
 * Affiche les 3 etapes avec un indicateur visuel.
 */
export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div
      className="progress-bar"
      style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}
    >
      {steps.map((step) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;

        return (
          <div
            key={step.number}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isCompleted
                  ? "#16a34a"
                  : isCurrent
                    ? "#2563eb"
                    : "#d1d5db",
                color: isCompleted || isCurrent ? "#fff" : "#6b7280",
                fontWeight: "bold",
              }}
            >
              {isCompleted ? "\u2713" : step.number}
            </div>
            <span
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: isCurrent ? "bold" : "normal",
                color: isCurrent ? "#2563eb" : "#6b7280",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### `src/exercises/ex13/components/FormField.tsx`

```tsx
import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  htmlFor: string;
}

/**
 * Composant FormField reutilisable.
 */
export default function FormField({ label, error, children, htmlFor }: FormFieldProps) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label htmlFor={htmlFor} style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
```

### `src/exercises/ex13/steps/StepPersonal.tsx`

```tsx
import { useFormContext } from "react-hook-form";
import type { WizardFormData } from "../schema";
import FormField from "../components/FormField";

/**
 * Etape 1 : Informations personnelles.
 */
export default function StepPersonal() {
  const {
    register,
    formState: { errors },
  } = useFormContext<WizardFormData>();

  return (
    <div>
      <h2>Etape 1 — Informations personnelles</h2>

      <FormField label="Prenom" htmlFor="firstName" error={errors.firstName?.message}>
        <input
          id="firstName"
          type="text"
          {...register("firstName")}
          placeholder="Ton prenom"
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      <FormField label="Nom" htmlFor="lastName" error={errors.lastName?.message}>
        <input
          id="lastName"
          type="text"
          {...register("lastName")}
          placeholder="Ton nom"
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          {...register("email")}
          placeholder="exemple@email.com"
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      <FormField label="Telephone" htmlFor="phone" error={errors.phone?.message}>
        <input
          id="phone"
          type="tel"
          {...register("phone")}
          placeholder="0612345678"
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>
    </div>
  );
}
```

### `src/exercises/ex13/steps/StepAddresses.tsx`

```tsx
import { useFormContext, useFieldArray } from "react-hook-form";
import type { WizardFormData } from "../schema";
import FormField from "../components/FormField";

/**
 * Etape 2 : Adresses avec useFieldArray.
 */
export default function StepAddresses() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<WizardFormData>();

  // useFieldArray gere le tableau dynamique d'adresses
  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  // Ajouter une adresse vide
  const handleAddAddress = () => {
    append({ street: "", city: "", zipCode: "", country: "France" });
  };

  return (
    <div>
      <h2>Etape 2 — Adresses</h2>

      {/* Message d'erreur global pour le tableau */}
      {errors.addresses?.message && (
        <p role="alert" style={{ color: "#dc2626", marginBottom: "1rem" }}>
          {errors.addresses.message}
        </p>
      )}

      {/* Liste des adresses */}
      {fields.map((field, index) => (
        <fieldset
          key={field.id}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <legend>Adresse {index + 1}</legend>

          <FormField
            label="Rue"
            htmlFor={`addresses.${index}.street`}
            error={errors.addresses?.[index]?.street?.message}
          >
            <input
              id={`addresses.${index}.street`}
              type="text"
              {...register(`addresses.${index}.street`)}
              placeholder="123 rue de la Paix"
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          <FormField
            label="Ville"
            htmlFor={`addresses.${index}.city`}
            error={errors.addresses?.[index]?.city?.message}
          >
            <input
              id={`addresses.${index}.city`}
              type="text"
              {...register(`addresses.${index}.city`)}
              placeholder="Paris"
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          <FormField
            label="Code postal"
            htmlFor={`addresses.${index}.zipCode`}
            error={errors.addresses?.[index]?.zipCode?.message}
          >
            <input
              id={`addresses.${index}.zipCode`}
              type="text"
              {...register(`addresses.${index}.zipCode`)}
              placeholder="75001"
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          <FormField
            label="Pays"
            htmlFor={`addresses.${index}.country`}
            error={errors.addresses?.[index]?.country?.message}
          >
            <input
              id={`addresses.${index}.country`}
              type="text"
              {...register(`addresses.${index}.country`)}
              placeholder="France"
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          {/* Bouton supprimer (visible si plus d'une adresse) */}
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              style={{ color: "#dc2626", marginTop: "0.5rem" }}
            >
              Supprimer cette adresse
            </button>
          )}
        </fieldset>
      ))}

      {/* Bouton ajouter */}
      <button type="button" onClick={handleAddAddress}>
        + Ajouter une adresse
      </button>
    </div>
  );
}
```

### `src/exercises/ex13/steps/StepReview.tsx`

```tsx
import { useFormContext } from "react-hook-form";
import type { WizardFormData } from "../schema";

/**
 * Etape 3 : Recapitulatif des donnees saisies.
 */
export default function StepReview() {
  const { getValues } = useFormContext<WizardFormData>();
  const data = getValues();

  return (
    <div>
      <h2>Etape 3 — Recapitulatif</h2>
      <p>Verifie les informations avant de soumettre.</p>

      {/* Informations personnelles */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3>Informations personnelles</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "0.5rem", fontWeight: 500 }}>Prenom</td>
              <td style={{ padding: "0.5rem" }}>{data.firstName}</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem", fontWeight: 500 }}>Nom</td>
              <td style={{ padding: "0.5rem" }}>{data.lastName}</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem", fontWeight: 500 }}>Email</td>
              <td style={{ padding: "0.5rem" }}>{data.email}</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem", fontWeight: 500 }}>Telephone</td>
              <td style={{ padding: "0.5rem" }}>{data.phone}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Adresses */}
      <section>
        <h3>Adresses ({data.addresses.length})</h3>
        {data.addresses.map((address, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <p>
              <strong>Adresse {index + 1}</strong>
            </p>
            <p>{address.street}</p>
            <p>
              {address.zipCode} {address.city}
            </p>
            <p>{address.country}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### `src/exercises/ex13/WizardForm.tsx`

```tsx
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  wizardSchema,
  stepOneSchema,
  stepTwoSchema,
  type WizardFormData,
  type Step,
} from "./schema";
import ProgressBar from "./components/ProgressBar";
import StepPersonal from "./steps/StepPersonal";
import StepAddresses from "./steps/StepAddresses";
import StepReview from "./steps/StepReview";

/**
 * Composant WizardForm
 * Formulaire multi-etapes avec validation par etape.
 */
export default function WizardForm() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Utiliser le schema complet pour le formulaire global
  const methods = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      addresses: [{ street: "", city: "", zipCode: "", country: "France" }],
    },
    mode: "onBlur",
  });

  const { handleSubmit, trigger, getValues } = methods;

  // --- Navigation entre etapes ---

  /** Valider l'etape courante avant d'avancer */
  const goToNextStep = async () => {
    let isValid = false;

    if (currentStep === 1) {
      // Valider uniquement les champs de l'etape 1
      isValid = await trigger(["firstName", "lastName", "email", "phone"]);
    } else if (currentStep === 2) {
      // Valider uniquement les champs de l'etape 2
      isValid = await trigger(["addresses"]);
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3) as Step);
    }
  };

  /** Revenir a l'etape precedente (sans validation) */
  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  /** Aller directement a une etape (depuis le recapitulatif) */
  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  /** Soumission finale */
  const onSubmit = async (data: WizardFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Donnees du formulaire :", data);
    alert("Formulaire soumis avec succes !");
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ maxWidth: "600px" }}>
        {/* Barre de progression */}
        <ProgressBar currentStep={currentStep} />

        {/* Affichage de l'etape courante */}
        {currentStep === 1 && <StepPersonal />}
        {currentStep === 2 && <StepAddresses />}
        {currentStep === 3 && <StepReview />}

        {/* Boutons de navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "2rem",
          }}
        >
          {/* Bouton Precedent */}
          {currentStep > 1 && (
            <button type="button" onClick={goToPrevStep}>
              Precedent
            </button>
          )}

          {/* Spacer pour aligner a droite si pas de bouton Precedent */}
          {currentStep === 1 && <div />}

          {/* Bouton Suivant ou Soumettre */}
          {currentStep < 3 ? (
            <button type="button" onClick={goToNextStep}>
              Suivant
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => goToStep(1)}>
                Modifier
              </button>
              <button type="submit" disabled={methods.formState.isSubmitting}>
                {methods.formState.isSubmitting
                  ? "Envoi en cours..."
                  : "Soumettre"}
              </button>
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
```

### `src/exercises/ex13/App.tsx`

```tsx
import WizardForm from "./WizardForm";

/**
 * Composant racine de l'exercice 13.
 */
export default function App() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Exercice 13 — Formulaire multi-etapes</h1>
      <WizardForm />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Perdre les donnees entre les étapes

- ❌ Créer un `useForm` par étape : les donnees de l'étape 1 sont perdues quand on passe a l'étape 2.
- ✅ Un seul `useForm` global avec `FormProvider` pour partager les donnees entre toutes les étapes.

### 2. Valider tout le formulaire à chaque étape

- ❌ Utiliser `handleSubmit` pour passer a l'étape suivante : tous les champs sont valides, y compris ceux des étapes suivantes.
- ✅ Utiliser `trigger(["field1", "field2"])` pour valider uniquement les champs de l'étape courante.

### 3. Oublier `key={field.id}` dans `useFieldArray`

- ❌ `{fields.map((field, index) => <div key={index}>...)}` — l'index se decale à la suppression.
- ✅ `{fields.map((field, index) => <div key={field.id}>...)}` — `field.id` est généré par RHF et reste stable.

### 4. Ne pas initialiser le tableau d'adresses

- ❌ `defaultValues: { addresses: [] }` — aucune adresse affichee au depart.
- ✅ `defaultValues: { addresses: [{ street: "", city: "", zipCode: "", country: "France" }] }` — une adresse vide par defaut.

### 5. Oublier `FormProvider`

- ❌ Les sous-composants utilisent `useFormContext` mais le Provider n'est pas en place. Crash a l'exécution.
- ✅ Envelopper le formulaire avec `<FormProvider {...methods}>`.

---

## Concepts clés utilises

| Concept            | Description                                                          | Documentation                              |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| `FormProvider`     | Fournir le contexte de `useForm` aux composants enfants              | [RHF docs](https://react-hook-form.com/docs/formprovider) |
| `useFormContext`   | Consommer le contexte du formulaire dans un composant enfant         | [RHF docs](https://react-hook-form.com/docs/useformcontext) |
| `useFieldArray`    | Gérer un tableau dynamique de champs (ajout, suppression, déplacement) | [RHF docs](https://react-hook-form.com/docs/usefieldarray) |
| `trigger`          | Valider manuellement des champs spécifiques                          | [RHF docs](https://react-hook-form.com/docs/useform/trigger) |
| Schema partiel Zod | `.pick()` pour extraire un sous-ensemble du schema                   | [Zod docs](https://zod.dev/?id=pick) |
| `z.array().min()`  | Valider qu'un tableau contient au moins N éléments                   | [Zod docs](https://zod.dev/?id=arrays) |

---

## Pour aller plus loin

- Persiste les donnees dans `sessionStorage` pour survivre au rechargement.
- Ajoute des animations de transition entre les étapes avec `framer-motion`.
- Ajoute un second `useFieldArray` pour gérer des numéros de telephone multiples dans l'étape 1.
