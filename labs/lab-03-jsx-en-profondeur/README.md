# Lab 03 — JSX en profondeur

> **Outcome :** à la fin, tu sais écrire du JSX correct avec expressions, attributs, fragments et liste avec clés stables dans un vrai projet Vite + React 19.
> **Vrai outil :** Vite dev server + React 19 (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis `FamilyCard.tsx`, la carte famille centrale du tableau de bord admin TribuZen. Cahier des charges **exact** :

1. Afficher le nom de la famille dans un `<h3>`.
2. Afficher le nombre de membres : « N membre(s) ».
3. Lister les prénoms des membres avec `<ul>` / `<li>` — chaque `<li>` avec une `key` sur l'ID métier.
4. Afficher un badge « Archivée » uniquement si `isArchived` est `true`.
5. Si la liste `members` est vide, afficher « Aucun membre. » à la place de la liste.
6. Utiliser `className` pour les classes CSS — jamais `class`.

**Interface de données :**

```tsx
interface Member {
  id: string
  firstName: string
}

interface Family {
  id: string
  name: string
  members: Member[]
  isArchived: boolean
}
```

**Pas de gap-fill** — tu écris le composant complet à partir du starter minimal ci-dessous.

### Données de test

Crée `src/data/families.ts` dans le projet `04-react` :

```ts
export const demoFamilies = [
  {
    id: 'f1',
    name: 'Famille Martin',
    members: [
      { id: 'm1', firstName: 'Alice' },
      { id: 'm2', firstName: 'Bob' },
      { id: 'm3', firstName: 'Cara' },
    ],
    isArchived: false,
  },
  {
    id: 'f2',
    name: 'Famille Dupont',
    members: [],
    isArchived: true,
  },
]
```

### Starter minimal

Crée `src/components/family/FamilyCard.tsx` :

```tsx
// FamilyCard.tsx — starter

interface Member {
  id: string
  firstName: string
}

interface Family {
  id: string
  name: string
  members: Member[]
  isArchived: boolean
}

// À toi de compléter : className, liste .map() + key, badge conditionnel, empty state
export function FamilyCard({ family }: { family: Family }) {
  return (
    <article>
      {/* Construis le JSX ici */}
    </article>
  )
}
```

Puis branche le composant dans `src/App.tsx` pour voir le résultat en direct :

```tsx
import { demoFamilies } from './data/families'
import { FamilyCard } from './components/family/FamilyCard'

function App() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {demoFamilies.map((f) => (
        <FamilyCard key={f.id} family={f} />
      ))}
    </main>
  )
}

export default App
```

Lance le dev server (`pnpm dev`) et valide les deux cartes visuellement.

---

## Étapes (en friction)

1. **Écris le header** — `<h3>` avec `{family.name}` et le badge `{family.isArchived && <span>Archivée</span>}`.
2. **Ajoute le compteur** — expression `{family.members.length} membre(s)` dans un `<p>`.
3. **Gère l'empty state** — ternaire ou early return avant la liste ; message « Aucun membre. » quand `members.length === 0`.
4. **Écris la liste** — `.map()` dans un `<ul>` avec `<li key={m.id}>{m.firstName}</li>`.
5. **Ajoute `className`** sur chaque élément structurant (`article`, `h3`, `span`, `ul`, `li`).
6. **Vérifie les cas limites** — `demoFamilies[1]` (Dupont : 0 membres, archivée) → empty state + badge visible ; aucun warning `key` dans la console ; TypeScript sans erreur.

---

## Corrigé complet commenté

```tsx
// FamilyCard.tsx — corrigé

interface Member {
  id: string
  firstName: string
}

interface Family {
  id: string
  name: string
  members: Member[]
  isArchived: boolean
}

export function FamilyCard({ family }: { family: Family }) {
  return (
    // ✅ className, pas class — class est un mot réservé JS
    <article className="family-card">

      <header className="family-card__header">
        {/* ✅ Expression simple : accès propriété dans {} */}
        <h3 className="family-card__name">{family.name}</h3>

        {/* ✅ isArchived est boolean — && ne risque pas d'afficher 0 ou false */}
        {family.isArchived && (
          <span className="badge badge--archived">Archivée</span>
        )}
      </header>

      {/* ✅ Expression arithmétique dans {} — retourne un number, React l'affiche */}
      <p className="family-card__count">
        {family.members.length} membre(s)
      </p>

      {/* ✅ Ternaire pour l'empty state — expression JS, pas un if statement */}
      {family.members.length === 0 ? (
        <p className="family-card__empty">Aucun membre.</p>
      ) : (
        <ul className="family-card__members">
          {/* ✅ .map() est une expression — retourne un tableau de JSX elements */}
          {family.members.map((m) => (
            // ✅ key sur l'ID métier — unique, stable, prévisible
            // La key ne s'affiche pas dans le DOM : c'est interne à React
            <li key={m.id} className="family-card__member">
              {m.firstName}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
```

**Pourquoi ce corrigé est correct :**

- `className` sur chaque élément — TypeScript refuse `class` sur les éléments JSX (erreur immédiate dans l'IDE).
- `{family.isArchived && ...}` : `isArchived` est `boolean` — pas de risque d'afficher `false` ou `0` dans le DOM.
- `.map()` retourne un tableau — React sait rendre un tableau de JSX elements.
- `key={m.id}` : ID métier stable — si la liste est triée ou filtrée plus tard, React maintient les états locaux correctement.
- Ternaire pour l'empty state : un `if` statement dans le JSX ne compilerait pas.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 20 minutes :**

1. Ajoute un **champ de recherche** dans `App.tsx` — `<input>` + `useState` — qui filtre les familles par nom (`name.toLowerCase().includes(query.toLowerCase())`).
2. La `FamilyCard` reste inchangée — seul `App.tsx` change.
3. Les familles filtrées doivent **conserver leur `key` originale** (pas l'index du résultat filtré).
4. Affiche « Aucune famille trouvée. » si le filtre ne correspond à rien.
5. **Sans ouvrir ce corrigé ni le module 03.**

**Critère de réussite :** recherche fonctionnelle, aucun warning `key` dans la console, TypeScript sans erreur.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, `FamilyCard.tsx` vit ici :

```
tribuzen/
  src/
    components/
      family/
        FamilyCard.tsx   ← ce lab
    data/
      families.ts        ← données de test (remplacé par appel API en prod)
```

**Différences par rapport au lab :**

- Les données viendront d'une prop typée via les patterns du module 04 (props et children) — plus de données locales en dur.
- L'interface `Family` sera importée depuis `src/types/family.ts`, partagé entre composants.
- Le style sera géré par le design system TribuZen (CSS modules ou variables CSS) — la logique `className` reste identique.

**Commit cible :**

```
feat(family): FamilyCard — JSX expressions, liste membres, badge archivée, empty state
```
