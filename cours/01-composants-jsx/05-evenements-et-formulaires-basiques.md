# Cours 8 — Événements et formulaires basiques

> **Objectif** : Maîtriser la gestion des événements en JSX (typage, propagation), implémenter des formulaires contrôlés et non-contrôlés, et transposer les patterns `v-model` / `ngModel` vers React.

---

## Rappel du cours précédent

<details>
<summary>1. Citez 3 patterns de rendu conditionnel en JSX.</summary>

Ternaire (`cond ? A : B`), opérateur `&&` (`cond && <X />`), early return (`if (!data) return <Fallback />`). On peut aussi utiliser des variables JSX, des objets de mapping ou des IIFE.
</details>

<details>
<summary>2. Pourquoi ne doit-on pas utiliser l'index comme `key` dans une liste dynamique ?</summary>

L'index change quand on insère, supprime ou réordonne un élément. React associe la `key` à l'état interne du composant — un index instable provoque des bugs de rendu et des pertes d'état.
</details>

<details>
<summary>3. Comment rendre plusieurs nœuds frères dans un `.map()` sans wrapper DOM ?</summary>

Avec `<Fragment key={id}>...</Fragment>` (import explicite de `Fragment`). La syntaxe courte `<> </>` ne supporte pas l'attribut `key`.
</details>

---

## Analogie

Un formulaire contrôlé en React, c'est comme un **opérateur téléphonique** à l'ancienne : chaque fois que l'utilisateur dit un chiffre, l'opérateur le note, le relit à haute voix, et attend le suivant. React contrôle chaque caractère — rien ne passe sans passer par le state. En Vue avec `v-model`, c'est comme un système automatique : la valeur se synchronise toute seule. Les deux approches fonctionnent, mais React choisit le contrôle explicite.

---

## Théorie

### 1. Gestion des événements en JSX

Les événements en JSX sont nommés en **camelCase** et reçoivent une **fonction** (pas une chaîne) :

```tsx
// ✅ React — fonction passée en référence
<button onClick={handleClick}>Cliquer</button>

// ❌ Erreur courante — appel immédiat (s'exécute au rendu !)
<button onClick={handleClick()}>Cliquer</button>

// ✅ Si vous devez passer un argument, utilisez une arrow function
<button onClick={() => handleDelete(item.id)}>Supprimer</button>
```

**Comparaison rapide :**

| Framework | Syntaxe                         |
|-----------|---------------------------------|
| Vue 3     | `@click="handleClick"`          |
| Angular   | `(click)="handleClick()"`       |
| React     | `onClick={handleClick}`         |

### 2. Types d'événements React avec TypeScript

React fournit des types génériques pour chaque catégorie d'événement :

```tsx
function EventExamples() {
  // MouseEvent — onClick, onDoubleClick, onMouseEnter…
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Position:", e.clientX, e.clientY);
  };

  // ChangeEvent — onChange pour input, select, textarea
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Valeur:", e.target.value);
  };

  // FormEvent — onSubmit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Formulaire soumis");
  };

  // KeyboardEvent — onKeyDown, onKeyUp, onKeyPress (deprecated)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") console.log("Entrée pressée");
  };

  // FocusEvent — onFocus, onBlur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log("Champ quitté:", e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <button onClick={handleClick}>Envoyer</button>
    </form>
  );
}
```

> **Astuce TypeScript** : laissez votre IDE inférer le type en tapant `onChange={(e) => }` puis survolez `e`. Vous verrez le type exact.

### 3. Événements synthétiques

React encapsule les événements natifs dans des **SyntheticEvent**. Cela garantit un comportement identique sur tous les navigateurs.

```tsx
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  // SyntheticEvent — API identique à l'événement natif
  e.preventDefault();   // Empêcher le comportement par défaut
  e.stopPropagation();  // Arrêter la propagation

  // Accéder à l'événement natif si nécessaire
  const nativeEvent = e.nativeEvent;
};
```

### 4. Inputs contrôlés (controlled components)

Un input contrôlé a sa valeur **pilotée par le state React**. C'est le pattern standard :

```tsx
import { useState } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login:", { email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}                             // Valeur contrôlée
          onChange={(e) => setEmail(e.target.value)} // Mise à jour du state
          required
        />
      </div>

      <div>
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit">Se connecter</button>
    </form>
  );
}
```

**Le cycle contrôlé :**
1. L'utilisateur tape un caractère
2. `onChange` se déclenche
3. Le setter met à jour le state
4. React re-render le composant
5. L'input affiche la nouvelle valeur du state

```tsx
// ❌ Oublier onChange — l'input est "gelé" (read-only)
<input value={name} />  // Warning React + input non modifiable

// ❌ Oublier value — l'input n'est plus contrôlé
<input onChange={(e) => setName(e.target.value)} />  // Fonctionne mais pas contrôlé

// ✅ Les deux ensemble — input contrôlé
<input value={name} onChange={(e) => setName(e.target.value)} />
```

### 5. Inputs non-contrôlés (uncontrolled components)

Avec `useRef`, le DOM conserve l'état de l'input. Utile pour l'intégration de librairies tierces ou les formulaires simples :

```tsx
import { useRef } from "react";

function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = inputRef.current?.value ?? "";
    console.log("Recherche:", query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} type="search" defaultValue="" placeholder="Rechercher…" />
      <button type="submit">Chercher</button>
    </form>
  );
}
```

> **`defaultValue`** (pas `value`) pour les inputs non-contrôlés. `value` rendrait l'input contrôlé et bloquerait la saisie sans `onChange`.

### 6. Select, textarea, checkbox

```tsx
function FormFields() {
  const [country, setCountry] = useState("fr");
  const [bio, setBio] = useState("");
  const [accepted, setAccepted] = useState(false);

  return (
    <>
      {/* Select contrôlé */}
      <select value={country} onChange={(e) => setCountry(e.target.value)}>
        <option value="fr">France</option>
        <option value="be">Belgique</option>
        <option value="ch">Suisse</option>
      </select>

      {/* Textarea contrôlé */}
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />

      {/* Checkbox contrôlée — utilise checked, pas value */}
      <label>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        J'accepte les conditions
      </label>
    </>
  );
}
```

### 7. Comparaison : v-model / ngModel vs contrôlé

| Aspect              | Vue 3 `v-model`          | Angular `[(ngModel)]`      | React contrôlé                |
|---------------------|--------------------------|----------------------------|-------------------------------|
| Syntaxe             | `v-model="name"`         | `[(ngModel)]="name"`       | `value={name} onChange={…}`   |
| Binding             | Two-way automatique      | Two-way automatique        | One-way + callback explicite  |
| Avantage            | Concis                   | Concis                     | Contrôle total, prédictible   |
| Validation inline   | `v-model.trim`           | Directive custom           | Logique dans `onChange`       |
| Custom component    | `defineModel()`          | `ControlValueAccessor`     | `value` + `onChange` props    |

```tsx
// Vue 3 — une ligne suffit
// <input v-model.trim="name" />

// React — plus explicite mais plus contrôlable
const [name, setName] = useState("");
<input
  value={name}
  onChange={(e) => setName(e.target.value.trim())}
/>
```

### 8. Formulaire complet avec validation simple

```tsx
import { useState } from "react";

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

function ContactForm() {
  const [form, setForm] = useState<FormData>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (data: FormData): FormErrors => {
    const errs: FormErrors = {};
    if (!data.name.trim()) errs.name = "Le nom est requis";
    if (!data.email.includes("@")) errs.email = "Email invalide";
    if (data.message.length < 10) errs.message = "Minimum 10 caractères";
    return errs;
  };

  const handleChange = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitted(true);
      console.log("Données envoyées:", form);
    }
  };

  if (submitted) return <p>Merci pour votre message !</p>;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <input placeholder="Nom" value={form.name} onChange={handleChange("name")} />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      <div>
        <input placeholder="Email" type="email" value={form.email} onChange={handleChange("email")} />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      <div>
        <textarea placeholder="Message" value={form.message} onChange={handleChange("message")} />
        {errors.message && <span className="error">{errors.message}</span>}
      </div>
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

---

## Pratique

### Exercice : formulaire d'inscription

Créez un formulaire d'inscription avec :
1. **Champs** : Prénom, Nom, Email, Mot de passe, Confirmation mot de passe, Pays (select), Accepter les CGU (checkbox)
2. **Validation** : tous les champs requis, email valide, mot de passe >= 8 caractères, confirmation identique, CGU acceptées
3. **Affichage** : les erreurs apparaissent sous chaque champ après soumission
4. **Succès** : affiche un message de confirmation avec le nom

<details>
<summary>Voir la solution</summary>

```tsx
import { useState } from "react";

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  acceptCgu: boolean;
}

type SignupErrors = Partial<Record<keyof SignupData, string>>;

const INITIAL_DATA: SignupData = {
  firstName: "", lastName: "", email: "",
  password: "", confirmPassword: "",
  country: "fr", acceptCgu: false,
};

function SignupForm() {
  const [form, setForm] = useState<SignupData>(INITIAL_DATA);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [success, setSuccess] = useState(false);

  const updateField = <K extends keyof SignupData>(key: K, value: SignupData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): SignupErrors => {
    const e: SignupErrors = {};
    if (!form.firstName.trim()) e.firstName = "Requis";
    if (!form.lastName.trim()) e.lastName = "Requis";
    if (!form.email.includes("@")) e.email = "Email invalide";
    if (form.password.length < 8) e.password = "Minimum 8 caractères";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Ne correspond pas";
    if (!form.acceptCgu) e.acceptCgu = "Vous devez accepter les CGU";
    return e;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setSuccess(true);
  };

  if (success) {
    return <p>Bienvenue {form.firstName} {form.lastName} ! Inscription réussie.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input placeholder="Prénom" value={form.firstName}
        onChange={(e) => updateField("firstName", e.target.value)} />
      {errors.firstName && <span className="error">{errors.firstName}</span>}

      <input placeholder="Nom" value={form.lastName}
        onChange={(e) => updateField("lastName", e.target.value)} />
      {errors.lastName && <span className="error">{errors.lastName}</span>}

      <input placeholder="Email" type="email" value={form.email}
        onChange={(e) => updateField("email", e.target.value)} />
      {errors.email && <span className="error">{errors.email}</span>}

      <input placeholder="Mot de passe" type="password" value={form.password}
        onChange={(e) => updateField("password", e.target.value)} />
      {errors.password && <span className="error">{errors.password}</span>}

      <input placeholder="Confirmation" type="password" value={form.confirmPassword}
        onChange={(e) => updateField("confirmPassword", e.target.value)} />
      {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}

      <select value={form.country} onChange={(e) => updateField("country", e.target.value)}>
        <option value="fr">France</option>
        <option value="be">Belgique</option>
        <option value="ch">Suisse</option>
      </select>

      <label>
        <input type="checkbox" checked={form.acceptCgu}
          onChange={(e) => updateField("acceptCgu", e.target.checked)} />
        J'accepte les CGU
      </label>
      {errors.acceptCgu && <span className="error">{errors.acceptCgu}</span>}

      <button type="submit">S'inscrire</button>
    </form>
  );
}

export default SignupForm;
```
</details>

---

## Résumé

| Concept                 | Ce qu'il faut retenir                                         |
|-------------------------|---------------------------------------------------------------|
| Événements JSX          | camelCase, fonction en référence, `SyntheticEvent`            |
| Types d'événements      | `React.MouseEvent`, `React.ChangeEvent`, `React.FormEvent`…  |
| Input contrôlé          | `value={state}` + `onChange={setter}` — le pattern standard   |
| Input non-contrôlé      | `useRef` + `defaultValue` — pour les cas simples              |
| `preventDefault()`      | Indispensable sur `onSubmit` pour éviter le rechargement      |
| Checkbox                | `checked` + `onChange` (pas `value`)                          |

> **Prochain cours** : [Cours 9 — useState](../02-hooks-fondamentaux/01-usestate.md)
