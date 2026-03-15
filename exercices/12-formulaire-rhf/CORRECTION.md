# Correction — Exercice 12 : Formulaire React Hook Form

## Résultat attendu

Un formulaire d'inscription avec 4 champs (nom, email, mot de passe, confirmation), une validation en temps réel via Zod, des messages d'erreur en français sous chaque champ, et un bouton de soumission qui se désactivé pendant le traitement.

---

## Code corrige

### `src/exercises/ex12/schema.ts`

```ts
import { z } from "zod";

/**
 * Schema de validation Zod pour le formulaire d'inscription.
 * Chaque champ a ses propres regles de validation avec des messages en francais.
 */
export const registrationSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caracteres.")
      .max(50, "Le nom ne doit pas depasser 50 caracteres."),

    email: z
      .string()
      .min(1, "L'email est obligatoire.")
      .email("L'email n'est pas valide."),

    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caracteres.")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule.")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),

    confirmPassword: z.string().min(1, "La confirmation est obligatoire."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"], // L'erreur s'affiche sous confirmPassword
  });

/**
 * Type infere depuis le schema Zod.
 * Utilise par useForm<RegistrationFormData>.
 */
export type RegistrationFormData = z.infer<typeof registrationSchema>;
```

### `src/exercises/ex12/FormField.tsx`

```tsx
import type { ReactNode } from "react";

interface FormFieldProps {
  /** Label du champ */
  label: string;
  /** Message d'erreur (optionnel) */
  error?: string;
  /** Le champ de formulaire (input, select, etc.) */
  children: ReactNode;
  /** Identifiant du champ pour l'attribut htmlFor */
  htmlFor: string;
}

/**
 * Composant FormField
 * Enveloppe reutilisable pour un champ de formulaire avec label et erreur.
 */
export default function FormField({
  label,
  error,
  children,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className="form-field" style={{ marginBottom: "1rem" }}>
      <label
        htmlFor={htmlFor}
        style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}
      >
        {label}
      </label>

      {children}

      {/* Affichage conditionnel du message d'erreur */}
      {error && (
        <p
          role="alert"
          style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
```

### `src/exercises/ex12/RegistrationForm.tsx`

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, type RegistrationFormData } from "./schema";
import FormField from "./FormField";

/**
 * Composant RegistrationForm
 * Formulaire d'inscription avec React Hook Form + Zod.
 */
export default function RegistrationForm() {
  // --- Initialisation de useForm avec le resolver Zod ---
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur", // Valider quand le champ perd le focus
  });

  // --- Handler de soumission ---
  const onSubmit = async (data: RegistrationFormData) => {
    // Simuler un appel API avec un delai
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Donnees du formulaire :", data);
    alert(`Inscription reussie pour ${data.name} !`);
    reset(); // Reinitialiser le formulaire apres soumission
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate // Desactiver la validation native du navigateur
      style={{ maxWidth: "400px" }}
    >
      {/* Champ Nom */}
      <FormField
        label="Nom"
        htmlFor="name"
        error={errors.name?.message}
      >
        <input
          id="name"
          type="text"
          {...register("name")}
          placeholder="Ton nom complet"
          aria-invalid={errors.name ? "true" : "false"}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      {/* Champ Email */}
      <FormField
        label="Email"
        htmlFor="email"
        error={errors.email?.message}
      >
        <input
          id="email"
          type="email"
          {...register("email")}
          placeholder="exemple@email.com"
          aria-invalid={errors.email ? "true" : "false"}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      {/* Champ Mot de passe */}
      <FormField
        label="Mot de passe"
        htmlFor="password"
        error={errors.password?.message}
      >
        <input
          id="password"
          type="password"
          {...register("password")}
          placeholder="Min. 8 caracteres, 1 majuscule, 1 chiffre"
          aria-invalid={errors.password ? "true" : "false"}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      {/* Champ Confirmation */}
      <FormField
        label="Confirmer le mot de passe"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
          placeholder="Repete le mot de passe"
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </FormField>

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "0.75rem",
          marginTop: "1rem",
          cursor: isSubmitting ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? "Inscription en cours..." : "S'inscrire"}
      </button>
    </form>
  );
}
```

### `src/exercises/ex12/App.tsx`

```tsx
import RegistrationForm from "./RegistrationForm";

/**
 * Composant racine de l'exercice 12.
 */
export default function App() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Exercice 12 — Formulaire d'inscription</h1>
      <p>Remplis le formulaire ci-dessous. La validation est geree par Zod.</p>
      <RegistrationForm />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Oublier le resolver Zod dans useForm

- ❌ `useForm<RegistrationFormData>()` sans `resolver`.
  La validation Zod ne s'applique pas, le formulaire se soumet même avec des donnees invalides.
- ✅ `useForm<RegistrationFormData>({ resolver: zodResolver(registrationSchema) })`

### 2. Typer le formulaire manuellement au lieu d'inferer depuis Zod

- ❌ Définir une interface `RegistrationFormData` manuellement en parallele du schema Zod.
  Risque de desynchronisation entre le schema et le type.
- ✅ `type RegistrationFormData = z.infer<typeof registrationSchema>;`
  Le type est toujours synchronise avec le schema.

### 3. Oublier `noValidate` sur le formulaire

- ❌ `<form onSubmit={handleSubmit(onSubmit)}>` laisse la validation native du navigateur.
  Les messages d'erreur du navigateur se melangent avec ceux de Zod.
- ✅ `<form onSubmit={handleSubmit(onSubmit)} noValidate>` désactivé la validation HTML5.

### 4. Ne pas utiliser `path` dans `.refine()`

- ❌ `.refine((data) => data.password === data.confirmPassword, { message: "..." })`
  L'erreur se retrouve au niveau "root" du formulaire, pas sous le champ `confirmPassword`.
- ✅ Ajouter `path: ["confirmPassword"]` pour cibler le bon champ.

### 5. Oublier `aria-invalid` pour l'accessibilité

- ❌ Pas d'attribut ARIA sur les champs en erreur.
  Les lecteurs d'ecran ne signalent pas le champ comme invalide.
- ✅ `aria-invalid={errors.name ? "true" : "false"}` et `role="alert"` sur le message d'erreur.

---

## Concepts clés utilises

| Concept            | Description                                                          | Documentation                              |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| `useForm`          | Hook principal de React Hook Form pour gérer l'état du formulaire    | [RHF docs](https://react-hook-form.com/docs/useform) |
| `register`         | Lie un champ HTML au formulaire (nom, validation, ref)               | [RHF docs](https://react-hook-form.com/docs/useform/register) |
| `handleSubmit`     | Wrapper qui valide avant d'appeler le handler de soumission          | [RHF docs](https://react-hook-form.com/docs/useform/handlesubmit) |
| `zodResolver`      | Connecte un schema Zod a React Hook Form                            | [resolvers](https://github.com/react-hook-form/resolvers) |
| `z.infer`          | Inferer un type TypeScript depuis un schema Zod                      | [Zod docs](https://zod.dev/) |
| `.refine()`        | Validation personnalisee dans Zod (cross-field validation)           | [Zod docs](https://zod.dev/?id=refine) |
| `formState`        | Objet contenant `errors`, `isSubmitting`, `isDirty`, etc.            | [RHF docs](https://react-hook-form.com/docs/useform/formstate) |

---

## Pour aller plus loin

- Ajoute un indicateur visuel de force du mot de passe.
- Utilise `watch("password")` pour afficher en temps réel les criteres de validation.
- Ajoute un champ checkbox "J'accepte les CGU" avec validation Zod.
