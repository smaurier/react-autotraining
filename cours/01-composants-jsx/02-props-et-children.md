# Cours 5 — Props et children

> **Objectif** : Maîtriser le système de props de React avec TypeScript strict — typage, destructuring, valeurs par défaut, `children`, spread, et comprendre les différences avec les approches Vue/Angular.

---

## Rappel du cours précédent

<details>
<summary>1. Pourquoi utilise-t-on `className` et non `class` en JSX ?</summary>

`class` est un mot réservé en JavaScript. JSX étant du JavaScript, il utilise `className` pour éviter les conflits.
</details>

<details>
<summary>2. Quel est le piège de l'opérateur `&&` avec un nombre égal à 0 ?</summary>

`{0 && <Component />}` affiche `0` dans le DOM car `0` est une valeur *falsy* mais affichable. La correction : `{count > 0 && <Component />}`.
</details>

<details>
<summary>3. Pourquoi faut-il une `key` stable sur les éléments d'une liste ?</summary>

React utilise la `key` pour identifier les éléments lors de la réconciliation DOM. Sans `key` stable, React ne peut pas optimiser et recrée tous les nœuds.
</details>

---

## Analogie

Les props sont comme les **paramètres d'une fonction**. Quand vous appelez `calculerTVA(prix, taux)`, vous passez des données en entrée et obtenez un résultat. Un composant React fonctionne pareil : `<Invoice price={100} taxRate={0.2} />` reçoit des données et retourne du JSX. La différence avec une fonction classique ? Les props sont regroupées dans **un seul objet** — et elles sont **en lecture seule**.

---

## Théorie

### 1. Typer les props avec `interface` ou `type`

```tsx
// ✅ Avec interface (extensible, recommandé pour les props)
interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary"; // optionnelle
  disabled?: boolean;
}

// ✅ Avec type (fonctionne aussi)
type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};
```

> **Convention** : nommez vos types de props `NomDuComposantProps`. Utilisez `interface` quand il n'y a pas besoin d'union ou d'intersection complexe.

### 2. Destructurer les props

```tsx
// ❌ Accès via props.xxx — verbeux et moins lisible
function Button(props: ButtonProps) {
  return <button disabled={props.disabled}>{props.label}</button>;
}

// ✅ Destructuring direct dans la signature
function Button({ label, variant = "primary", disabled = false }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled}>
      {label}
    </button>
  );
}
```

### 3. Valeurs par défaut

Deux approches — préférez le destructuring :

```tsx
// ✅ Valeur par défaut dans le destructuring (recommandé)
function Card({ title, elevation = 1 }: CardProps) {
  return <div className={`card elevation-${elevation}`}>{title}</div>;
}

// ⚠️ defaultProps — déprécié depuis React 18.3, supprimé en React 19
Card.defaultProps = { elevation: 1 }; // ❌ Ne plus utiliser
```

### 4. La prop `children`

`children` est une prop spéciale qui contient **tout ce qui est entre les balises** du composant :

```tsx
import { type ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode; // accepte JSX, string, number, null, undefined, array…
}

function Panel({ title, children }: PanelProps) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="panel-body">{children}</div>
    </section>
  );
}

// Utilisation
<Panel title="Mon panneau">
  <p>Contenu libre ici</p>
  <Button label="Action" />
</Panel>
```

> **`ReactNode`** est le type le plus large : il accepte du JSX, des strings, des nombres, `null`, `undefined`, des fragments, des tableaux. Pour accepter **uniquement** des éléments React, utilisez `ReactElement`.

```tsx
// Types possibles pour children selon le besoin
children: ReactNode;          // ✅ Tout (le plus courant)
children: ReactElement;       // Uniquement des éléments React
children: string;             // Uniquement du texte
children: (data: T) => ReactNode; // Render prop (pattern avancé)
```

### 5. Spread props avec `...rest`

Le pattern spread permet de transmettre des props HTML natives sans les lister une à une :

```tsx
import { type ComponentPropsWithoutRef } from "react";

interface InputFieldProps extends ComponentPropsWithoutRef<"input"> {
  label: string;
  error?: string;
}

function InputField({ label, error, ...rest }: InputFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <input {...rest} className={error ? "input-error" : ""} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// Utilisation — toutes les props <input> natives sont transmises
<InputField
  label="Email"
  type="email"
  placeholder="ex: jean@mail.com"
  required
  error="Format invalide"
/>
```

> **`ComponentPropsWithoutRef<"input">`** expose tous les attributs HTML d'un `<input>` sans le `ref`. Pour inclure le ref, utilisez `ComponentPropsWithRef<"input">`.

### 6. Les props sont en lecture seule (immutabilité)

```tsx
// ❌ INTERDIT — React ne le détecte pas toujours, mais c'est un bug
function Counter({ count }: { count: number }) {
  count = count + 1; // Mutation de prop !
  return <p>{count}</p>;
}

// ✅ Les props descendent, l'état remonte
// Pour modifier une valeur, utilisez un state local ou une callback
function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

### 7. Comparaison : props Vue / Angular / React

| Aspect                | Vue 3 (Composition API)     | Angular 19+ (Signals)        | React 19 + TS              |
|-----------------------|-----------------------------|------------------------------|-----------------------------|
| Déclarer une prop     | `defineProps<{ x: string }>()`| `x = input.required<string>()`| `{ x }: { x: string }`     |
| Prop optionnelle      | `withDefaults(defineProps…)` | `x = input<string>()`        | `x?: string` + défaut      |
| Enfants (slot/projection)| `<slot />`              | `<ng-content />`             | `{children}`                |
| Slot nommé            | `<slot name="header" />`    | `<ng-content select=".h" />` | Props dédiées ou composition|
| Read-only             | Implicite (warning)         | Implicite (signal readonly)  | Implicite (convention)      |
| Direction             | Parent → enfant             | Parent → enfant              | Parent → enfant             |

**En Vue**, les props sont déclarées avec `defineProps` et on a des slots pour le contenu projeté. **En Angular**, `input()` (signals) remplace `@Input()`. **En React**, tout est une prop — y compris `children`.

### 8. Pattern : props discriminantes (discriminated unions)

Pour les composants polymorphes :

```tsx
// ✅ Union discriminante — TypeScript force la cohérence
type AlertProps =
  | { severity: "info" | "success"; message: string }
  | { severity: "error"; message: string; retryAction: () => void };

function Alert(props: AlertProps) {
  return (
    <div className={`alert alert-${props.severity}`}>
      <p>{props.message}</p>
      {props.severity === "error" && (
        <button onClick={props.retryAction}>Réessayer</button>
      )}
    </div>
  );
}

// ✅ TypeScript exige retryAction quand severity="error"
<Alert severity="error" message="Échec" retryAction={() => refetch()} />

// ✅ Pas de retryAction nécessaire pour info/success
<Alert severity="info" message="Bienvenue" />
```

---

## Pratique

### Exercice : composant `Card` générique

Créez un composant `Card` avec :
- `title` (obligatoire, string)
- `subtitle` (optionnel, string)
- `children` (contenu libre)
- `footer` (optionnel, `ReactNode`)
- `variant` (optionnel, `"default" | "highlighted"`, défaut `"default"`)
- Toutes les props HTML natives d'une `<div>` (via spread)

Utilisez-le ensuite pour afficher une carte avec titre, contenu texte et un bouton en footer.

<details>
<summary>Voir la solution</summary>

```tsx
import { type ReactNode, type ComponentPropsWithoutRef } from "react";

interface CardProps extends ComponentPropsWithoutRef<"div"> {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "highlighted";
}

function Card({
  title,
  subtitle,
  children,
  footer,
  variant = "default",
  className,
  ...rest
}: CardProps) {
  return (
    <div className={`card card-${variant} ${className ?? ""}`} {...rest}>
      <div className="card-header">
        <h3>{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

export default Card;

// Utilisation
function App() {
  return (
    <Card
      title="Bienvenue"
      subtitle="Formation React"
      variant="highlighted"
      footer={<button>Commencer</button>}
      data-testid="welcome-card"
    >
      <p>Cette carte utilise children, footer, variant et le spread des props HTML.</p>
    </Card>
  );
}
```
</details>

---

## Résumé

| Concept                  | Ce qu'il faut retenir                                       |
|--------------------------|-------------------------------------------------------------|
| Typage des props         | `interface NomProps` avec propriétés optionnelles `?`       |
| Destructuring + défauts  | `{ label, size = "md" }: ButtonProps`                       |
| `children`               | Type `ReactNode`, contenu entre les balises                 |
| Spread `...rest`         | Transmet les props HTML natives sans les lister             |
| Immutabilité             | Ne jamais modifier une prop — utiliser un state local       |
| Unions discriminantes    | TypeScript vérifie la cohérence des props combinées         |

> **Prochain cours** : [Cours 6 — Composants et composition](./03-composants-et-composition.md)
