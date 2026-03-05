# Cours 7 — Rendu conditionnel et listes

> **Objectif** : Maîtriser tous les patterns de rendu conditionnel et de rendu de listes en JSX, comprendre pourquoi `key` est essentiel pour la performance, et savoir transposer les directives Vue/Angular vers des patterns JavaScript purs.

---

## Rappel du cours précédent

<details>
<summary>1. Comment un composant enfant communique-t-il avec son parent en React ?</summary>

Via une **callback prop** : le parent passe une fonction en prop, l'enfant l'appelle avec les données à remonter. C'est l'équivalent de `emit()` en Vue ou `output()` en Angular.
</details>

<details>
<summary>2. Qu'est-ce que le "lifting state up" ?</summary>

Quand deux composants frères ont besoin de la même donnée, on remonte l'état dans leur **parent commun**, puis on le redistribue via props.
</details>

<details>
<summary>3. Pourquoi préfère-t-on la composition à l'héritage en React ?</summary>

React est conçu pour la composition : on imbrique des composants via `children` et des props plutôt que d'étendre des classes. C'est plus flexible et plus facile à tester.
</details>

---

## Analogie

Imaginez un **tableau de bord** dans une voiture. Certains voyants s'allument uniquement quand une condition est remplie (essence faible, ceinture non attachée). D'autres affichent une liste variable d'informations (température, vitesse, radio). En JSX, c'est pareil : on affiche ou masque des éléments selon l'état, et on génère des listes dynamiques — sauf qu'au lieu de directives (`v-if`, `@if`), on utilise du **JavaScript pur**.

---

## Théorie

### 1. Les 6 patterns de rendu conditionnel

#### Pattern 1 : Ternaire (deux branches)

Le plus courant pour basculer entre deux rendus :

```tsx
// ✅ Ternaire — clair pour A ou B
function Status({ isOnline }: { isOnline: boolean }) {
  return <span>{isOnline ? "En ligne" : "Hors ligne"}</span>;
}
```

#### Pattern 2 : `&&` (une seule branche)

```tsx
// ✅ Afficher un élément seulement si la condition est vraie
{unreadCount > 0 && <Badge count={unreadCount} />}

// ⚠️ Rappel : attention aux valeurs falsy affichables
{items.length && <List items={items} />}  // ❌ Affiche "0" si length === 0
{items.length > 0 && <List items={items} />}  // ✅ Correct
```

#### Pattern 3 : Early return (garde)

Idéal pour les cas d'erreur, de chargement ou de données manquantes :

```tsx
// ✅ Gérer les cas limites en haut du composant
function UserProfile({ user, isLoading, error }: UserProfileProps) {
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <p>Utilisateur introuvable</p>;

  // Le reste du composant ne gère que le cas nominal
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}
```

#### Pattern 4 : Variable JSX

Quand la logique est trop complexe pour un ternaire inline :

```tsx
// ✅ Stocker le JSX dans une variable
function Notification({ type, message }: NotificationProps) {
  let icon: ReactNode;

  if (type === "success") icon = <CheckIcon />;
  else if (type === "warning") icon = <WarningIcon />;
  else if (type === "error") icon = <ErrorIcon />;
  else icon = <InfoIcon />;

  return (
    <div className={`notification notification-${type}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
```

#### Pattern 5 : Objet de mapping (remplacement du switch)

```tsx
// ✅ Objet map — propre et extensible
const STATUS_CONFIG = {
  draft: { label: "Brouillon", color: "gray" },
  pending: { label: "En attente", color: "orange" },
  published: { label: "Publié", color: "green" },
  archived: { label: "Archivé", color: "red" },
} as const satisfies Record<string, { label: string; color: string }>;

type Status = keyof typeof STATUS_CONFIG;

function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return <span style={{ color: config.color }}>{config.label}</span>;
}
```

#### Pattern 6 : IIFE (Immediately Invoked Function Expression)

Pour des `switch` complexes directement dans le JSX (à utiliser avec modération) :

```tsx
// ✅ IIFE — quand les autres patterns ne suffisent pas
<div>
  {(() => {
    switch (step) {
      case "info": return <InfoStep />;
      case "payment": return <PaymentStep />;
      case "confirm": return <ConfirmStep />;
      default: return null;
    }
  })()}
</div>
```

### 2. Comparaison : directives vs patterns JSX

| Besoin                | Vue 3                      | Angular 19+                  | React JSX                      |
|-----------------------|----------------------------|------------------------------|--------------------------------|
| Afficher si vrai      | `v-if="condition"`         | `@if (condition) { }`       | `{condition && <X />}`         |
| Alterner              | `v-if` / `v-else`          | `@if { } @else { }`         | `{cond ? <A /> : <B />}`      |
| Afficher/masquer      | `v-show="condition"`       | `[hidden]="!condition"`      | `style={{ display: cond ? "block" : "none" }}` |
| Boucle                | `v-for="item in items"`    | `@for (item of items; track item.id)` | `{items.map(item => ...)}`  |
| Boucle + index        | `v-for="(item, i) in items"` | `@for (item of items; track item.id; let i = $index)` | `{items.map((item, i) => ...)}` |

> **Philosophie React** : pas de DSL, pas de directives, juste du JavaScript. Cela rend le rendu conditionnel plus verbeux mais aussi plus explicite et debuggable.

### 3. Listes avec `.map()` et `key`

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

function ProductList({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 4. Pourquoi `key` est crucial

React utilise la `key` lors de la **réconciliation** : il compare l'ancien arbre virtuel au nouveau pour minimiser les opérations DOM.

```tsx
// ❌ Sans key ou avec index — React ne peut pas identifier les éléments
// Si on supprime l'élément du milieu, React va re-render les mauvais éléments
{items.map((item, index) => (
  <TodoItem key={index} item={item} />  // ❌ L'index change quand on supprime/insère
))}

// ✅ Avec un identifiant stable
{items.map((item) => (
  <TodoItem key={item.id} item={item} />  // ✅ L'id est stable
))}
```

**Quand l'index est acceptable comme `key`** :
- La liste est **statique** (jamais réordonnée, ni filtrée, ni modifiée)
- Les éléments n'ont **pas d'état interne**

### 5. Filtrer et trier avant le rendu

```tsx
// ✅ Préparer les données AVANT le JSX
function TaskDashboard({ tasks }: { tasks: Task[] }) {
  const activeTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.priority - b.priority);

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div>
      <h2>Tâches actives ({activeTasks.length})</h2>
      <p>{completedCount} tâche(s) terminée(s)</p>

      {activeTasks.length > 0 ? (
        <ul>
          {activeTasks.map((task) => (
            <li key={task.id}>{task.title} (priorité {task.priority})</li>
          ))}
        </ul>
      ) : (
        <p>Toutes les tâches sont terminées !</p>
      )}
    </div>
  );
}
```

> **Attention** : ne filtrez/triez pas directement dans le JSX. Créez des variables en haut du composant pour garder le JSX lisible.

### 6. Fragment avec `key` dans les listes

Quand un élément de liste doit retourner plusieurs nœuds sans wrapper :

```tsx
import { Fragment } from "react";

interface DefinitionItem {
  id: string;
  term: string;
  definition: string;
}

function Glossary({ items }: { items: DefinitionItem[] }) {
  return (
    <dl>
      {items.map((item) => (
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.definition}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

> **Note** : la syntaxe courte `<> </>` ne supporte **pas** l'attribut `key`. Il faut importer `Fragment` explicitement.

### 7. Pattern : composant de liste vide

```tsx
// ✅ Composant dédié pour l'état vide — réutilisable
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

function List<T>({ items, renderItem, keyExtractor, emptyMessage = "Aucun élément" }: ListProps<T>) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

---

## Pratique

### Exercice : tableau de bord de tâches filtrable

Créez un composant `TaskBoard` qui :
1. Affiche une liste de tâches avec titre, priorité (haute/moyenne/basse), et statut (todo/doing/done)
2. Permet de filtrer par statut via 3 boutons (Tout / En cours / Terminé)
3. Trie les tâches par priorité (haute en premier)
4. Affiche "Aucune tâche" quand le filtre ne retourne rien
5. Met en évidence les tâches de haute priorité avec un style différent

<details>
<summary>Voir la solution</summary>

```tsx
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "doing" | "done";
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

type Filter = "all" | "doing" | "done";

const SAMPLE_TASKS: Task[] = [
  { id: "1", title: "Configurer ESLint", priority: "medium", status: "done" },
  { id: "2", title: "Corriger bug auth", priority: "high", status: "doing" },
  { id: "3", title: "Écrire les tests", priority: "high", status: "todo" },
  { id: "4", title: "Mettre à jour le README", priority: "low", status: "todo" },
  { id: "5", title: "Refactorer le service API", priority: "medium", status: "doing" },
];

function TaskBoard() {
  const [filter, setFilter] = useState<Filter>("all");
  const tasks = SAMPLE_TASKS;

  const filteredTasks = tasks
    .filter((t) => {
      if (filter === "all") return true;
      return t.status === filter;
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div>
      <h1>Tableau de bord</h1>

      <div>
        {(["all", "doing", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ fontWeight: filter === f ? "bold" : "normal" }}
          >
            {f === "all" ? "Tout" : f === "doing" ? "En cours" : "Terminé"}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <p>Aucune tâche pour ce filtre</p>
      ) : (
        <ul>
          {filteredTasks.map((task) => (
            <li
              key={task.id}
              style={{
                fontWeight: task.priority === "high" ? "bold" : "normal",
                color: task.priority === "high" ? "#c0392b" : "inherit",
              }}
            >
              [{task.priority}] {task.title} — {task.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TaskBoard;
```
</details>

---

## Résumé

| Concept                  | Ce qu'il faut retenir                                            |
|--------------------------|------------------------------------------------------------------|
| Ternaire / `&&`          | Patterns de base pour une ou deux branches                       |
| Early return             | Idéal pour les gardes (loading, error, null)                     |
| Objet de mapping         | Remplace élégamment les `switch` pour les configurations         |
| `.map()` + `key`         | Toujours une `key` stable et unique (pas l'index sauf liste statique) |
| Filtrer/trier avant JSX  | Préparer les données dans des variables, garder le JSX propre    |
| `Fragment` avec `key`    | `<Fragment key={id}>` quand on retourne plusieurs nœuds en liste |

> **Prochain cours** : [Cours 8 — Événements et formulaires basiques](./05-evenements-et-formulaires-basiques.md)
