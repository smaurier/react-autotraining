---
titre: JSX en profondeur
cours: 04-react
notions: [syntaxe JSX, expressions entre accolades, attributs et className, JSX compilé en appels de fonction, fragments, rendu de listes et clés, échappement et sécurité, différences avec le HTML]
outcomes: [écrire du JSX correct (expressions, attributs, fragments), comprendre que JSX compile en appels de fonction, rendre une liste avec des clés stables]
prerequis: [02-premier-projet-react]
next: 04-props-et-children
libs: [{ name: react, version: "^19" }]
tribuzen: le JSX de la carte famille (FamilyCard) de l'admin TribuZen
last-reviewed: 2026-07
---

# JSX en profondeur

> **Outcomes — tu sauras FAIRE :** écrire du JSX correct (expressions, attributs, fragments), comprendre que JSX compile en appels de fonction, rendre une liste avec des clés stables.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu rejoins l'équipe TribuZen. Ta première tâche : afficher la `FamilyCard` dans le tableau de bord admin — une carte qui montre le nom d'une famille, le nombre de membres, et la liste des prénoms. Un collègue a laissé ce bout de code :

```tsx
// FamilyCard — AVANT correction
function FamilyCard({ family }) {
  return (
    <div class="family-card">
      <h2>{family.name}</h2>
      <p>Membres : {family.members.length}</p>
      <ul>
        {family.members.map((m) => (
          <li>{m.firstName}</li>
        ))}
      </ul>
      {family.isArchived ? <span class="badge-archived">Archivée</span> : null}
    </div>
  )
}
```

**Trois bugs JSX à identifier avant de continuer :**
1. `class=` au lieu de `className=` — `class` est un mot réservé JavaScript.
2. Pas de `key` sur le `<li>` — React avertit et recrée tous les nœuds DOM à chaque rendu.
3. `{family.members.length}` est correct, mais si `members` est `undefined`, c'est un crash au runtime.

Ce module t'explique pourquoi chaque correction est indispensable.

---

## 2. Théorie complète, concise

### 2.1 JSX compilé en appels de fonction

JSX n'existe pas dans le navigateur. Babel (ou le compilateur Vite/TypeScript) transforme chaque élément JSX en appel de fonction avant l'exécution.

Avec React 17+, le **nouveau JSX transform** génère `_jsx()` au lieu de `React.createElement()` — plus besoin d'importer React dans chaque fichier.

```tsx
// Ce que tu écris :
const element = <h1 className="title">Bonjour</h1>

// Ce que le compilateur produit (nouveau transform React 17+ / React 19) :
import { jsx as _jsx } from 'react/jsx-runtime'
const element = _jsx('h1', { className: 'title', children: 'Bonjour' })
```

Implication directe : **JSX n'est pas du HTML**. C'est du sucre syntaxique sur des appels de fonction JavaScript ordinaires. Tout ce qui marche en JavaScript marche dans JSX — et tout ce qui ne marche pas non plus.

```tsx
// JSX imbriqué → appels imbriqués
const card = (
  <div className="card">
    <p>Texte</p>
  </div>
)
// Équivaut à :
const card = _jsx('div', {
  className: 'card',
  children: _jsx('p', { children: 'Texte' }),
})
```

### 2.2 Expressions entre accolades

Les `{}` en JSX acceptent **toute expression JavaScript** — valeur, appel de fonction, ternaire, opérateur logique — mais **pas de statement** (`if`, `for`, `while`).

```tsx
const user = { name: 'Alice', age: 30 }

// ✅ Expressions valides dans {}
<p>{user.name}</p>
<p>{user.age * 2}</p>
<p>{user.name.toUpperCase()}</p>
<p>{isAdmin ? 'Admin' : 'Membre'}</p>
<p>{count > 0 && <Badge n={count} />}</p>

// ❌ Statements — erreur de compilation
<p>{if (isAdmin) { return 'Admin' }}</p>
<p>{for (let i = 0; i < 3; i++) {}}</p>
```

| Construction | Dans JSX ? | Alternatif si non |
|---|---|---|
| Valeur littérale | ✅ | — |
| Appel de fonction | ✅ | — |
| Ternaire `a ? b : c` | ✅ | — |
| `&&` logique | ✅ | — |
| `if / else` | ❌ | Ternaire ou early return |
| `for / while` | ❌ | `.map()` / `.filter()` |

### 2.3 Attributs et className

JSX utilise les noms de propriétés JavaScript, pas les noms d'attributs HTML. Les divergences les plus courantes :

| Attribut HTML | Prop JSX | Raison |
|---|---|---|
| `class` | `className` | `class` est un mot réservé JS |
| `for` | `htmlFor` | `for` est un mot réservé JS |
| `tabindex` | `tabIndex` | camelCase systématique |
| `style="..."` | `style={{...}}` | objet JS, pas chaîne CSS |
| `onclick` | `onClick` | camelCase pour les événements |

```tsx
// ❌ HTML brut dans JSX — erreur TypeScript ou warning React
<label for="email">Email</label>
<div class="card" style="padding: 1rem">...</div>

// ✅ JSX correct
<label htmlFor="email">Email</label>
<div className="card" style={{ padding: '1rem', color: '#333' }}>...</div>
```

Le `style` en JSX est un objet avec des propriétés en camelCase. Les valeurs numériques sont traitées comme des pixels pour les propriétés longueur :

```tsx
// ✅ Valeur numérique → px automatique pour les propriétés longueur
<div style={{ padding: 16, fontSize: 14 }}>...</div>

// ✅ Valeur string pour les autres unités
<div style={{ width: '50%', opacity: 0.8 }}>...</div>
```

### 2.4 Fragments

Un composant React doit retourner **un seul nœud racine**. Les fragments permettent de grouper plusieurs éléments sans ajouter un `<div>` inutile dans le DOM.

```tsx
// ❌ Deux racines → erreur de compilation
function UserInfo() {
  return (
    <h2>Alice</h2>
    <p>Développeuse</p>
  )
}

// ✅ Fragment court — syntaxe idiomatique
function UserInfo() {
  return (
    <>
      <h2>Alice</h2>
      <p>Développeuse</p>
    </>
  )
}

// ✅ Fragment explicite — obligatoire quand on a besoin d'une key (liste)
import { Fragment } from 'react'

members.map((m) => (
  <Fragment key={m.id}>
    <dt>{m.name}</dt>
    <dd>{m.role}</dd>
  </Fragment>
))
```

`<>...</>` est du sucre pour `<Fragment>...</Fragment>`. La seule différence : `<Fragment key={...}>` peut recevoir une `key` (nécessaire dans les listes) — `<>` ne peut pas recevoir d'attributs.

### 2.5 Rendu de listes et clés

Le rendu de liste en JSX utilise `.map()` — c'est une expression, pas un statement.

```tsx
interface Member {
  id: string
  firstName: string
  isActive: boolean
}

function MemberList({ members }: { members: Member[] }) {
  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>{m.firstName}</li>
      ))}
    </ul>
  )
}
```

**Pourquoi `key` est obligatoire ?**

React utilise la `key` pour son algorithme de réconciliation (diffing). Sans `key` stable, React ne peut pas déterminer quel élément a changé, a été ajouté ou supprimé — il recrée **tous** les nœuds DOM à chaque rendu, perdant l'état local (inputs, focus, animations).

```tsx
// ❌ Index comme key — dangereux si la liste peut changer d'ordre ou être filtrée
{members.map((m, index) => <li key={index}>{m.firstName}</li>)}

// ✅ Identifiant métier unique et stable
{members.map((m) => <li key={m.id}>{m.firstName}</li>)}
```

La `key` doit être :
- **Unique** parmi les frères (siblings), pas globalement
- **Stable** entre les rendus (pas générée avec `Math.random()`)
- **Prévisible** — un ID métier depuis la base de données est idéal

### 2.6 Échappement et sécurité

JSX **échappe automatiquement** tout le contenu injecté dans `{}`. Une chaîne contenant `<script>alert('XSS')</script>` sera affichée comme texte, jamais exécutée.

```tsx
const userInput = '<script>alert("XSS")</script>'

// ✅ Affiché comme texte brut — React échappe automatiquement
<p>{userInput}</p>
// Rendu DOM : <p>&lt;script&gt;alert("XSS")&lt;/script&gt;</p>
```

La seule façon d'injecter du HTML brut est `dangerouslySetInnerHTML` — le nom intentionnellement long signale le risque :

```tsx
// ⚠️ dangerouslySetInnerHTML — UNIQUEMENT si la source est de confiance et sanitisée
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

Ne jamais passer du contenu utilisateur non sanitisé à `dangerouslySetInnerHTML`.

### 2.7 Différences avec le HTML

Récapitulatif des divergences JSX / HTML à connaître pour éviter les erreurs courantes :

| HTML | JSX | Note |
|---|---|---|
| `class` | `className` | Mot réservé JS |
| `for` | `htmlFor` | Mot réservé JS |
| `<br>` | `<br />` | JSX exige la fermeture |
| `<input type="text">` | `<input type="text" />` | Idem |
| `<!-- commentaire -->` | `{/* commentaire */}` | JS dans JSX |
| `style="color: red"` | `style={{ color: 'red' }}` | Objet JS |
| `onclick` | `onClick` | camelCase |
| `onchange` | `onChange` | camelCase |

---

## 3. Worked examples

### Exemple 1 — FamilyCard corrigée (TribuZen)

On reprend le composant du cas concret et on corrige les trois bugs en appliquant la théorie.

```tsx
interface Family {
  id: string
  name: string
  members: { id: string; firstName: string }[]
  isArchived: boolean
}

// ✅ FamilyCard — version corrigée
function FamilyCard({ family }: { family: Family }) {
  // Early return : guard contre les données manquantes
  if (!family) return <p>Famille introuvable</p>

  return (
    // ✅ className, pas class
    <div className="family-card">
      <h2>{family.name}</h2>

      {/* ✅ Commentaire JSX entre accolades */}
      <p>{family.members.length} membre(s)</p>

      <ul>
        {/* ✅ .map() + key métier stable */}
        {family.members.map((m) => (
          <li key={m.id}>{m.firstName}</li>
        ))}
      </ul>

      {/* ✅ isArchived est boolean — && ne peut pas afficher 0 */}
      {family.isArchived && (
        <span className="badge badge--archived">Archivée</span>
      )}
    </div>
  )
}

export default FamilyCard
```

**Ce que TypeScript + React vérifient :**
- `class=` → erreur TS (`className` attendu sur `HTMLDivElement`)
- Absence de `key` → warning console en développement
- Balise non fermée → erreur de compilation Babel/TypeScript

### Exemple 2 — Liste conditionnelle avec Fragment

Afficher les membres actifs avec leur rôle sur deux lignes — sans `<div>` wrapper dans chaque item de liste.

```tsx
import { Fragment } from 'react'

interface Member {
  id: string
  name: string
  role: string
  isActive: boolean
}

function ActiveMemberTable({ members }: { members: Member[] }) {
  const activeMembers = members.filter((m) => m.isActive)

  // Empty state via early return — avant le return JSX principal
  if (activeMembers.length === 0) {
    return <p className="empty-state">Aucun membre actif.</p>
  }

  return (
    <dl className="member-table">
      {activeMembers.map((m) => (
        // Fragment avec key — <> ne prend pas d'attribut
        <Fragment key={m.id}>
          <dt className="member-name">{m.name}</dt>
          <dd className="member-role">{m.role}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `class` au lieu de `className`

```tsx
// ❌ JSX : class est un mot réservé JS
<div class="card">...</div>
// TS Error: Type '{ class: string; }' is not assignable to type 'HTMLAttributes<HTMLDivElement>'

// ✅ Toujours className en JSX
<div className="card">...</div>
```

L'erreur TypeScript est immédiate dans l'IDE — Vite/TS le signale sans lancer le build.

### PIÈGE #2 — `&&` avec un nombre affiche "0"

```tsx
const count = 0

// ❌ Affiche "0" dans le DOM si count vaut 0 — silencieux, pas d'erreur
{count && <Badge n={count} />}

// ✅ Forcer une expression booléenne
{count > 0 && <Badge n={count} />}

// ✅ Ternaire explicite — toujours sûr
{count > 0 ? <Badge n={count} /> : null}
```

L'opérateur `&&` retourne la valeur de gauche si elle est falsy. `0` est falsy mais est une valeur affichable — React affiche `0` tel quel dans le DOM.

### PIÈGE #3 — Index comme `key` dans une liste triable ou filtrable

```tsx
// ❌ Après un tri, React associe l'état local à la position, pas à l'élément
{members.map((m, index) => <li key={index}>{m.name}</li>)}

// ✅ ID métier stable — survit aux tris, filtres, pagination
{members.map((m) => <li key={m.id}>{m.name}</li>)}
```

Le bug se manifeste sur les composants avec état local (inputs, checkboxes, animations) : après un tri, l'état reste attaché à la position, pas à l'élément.

### PIÈGE #4 — Balises HTML sans fermeture

```tsx
// ❌ HTML permissif, JSX strict — erreur de compilation
<br>
<input type="text">
<img src="..." alt="...">

// ✅ JSX exige la fermeture de toutes les balises
<br />
<input type="text" />
<img src="..." alt="..." />
```

### PIÈGE #5 — `style` en chaîne au lieu d'objet

```tsx
// ❌ React n'accepte pas les chaînes pour style
<div style="padding: 1rem; color: red">...</div>
// TS Error: Type 'string' is not assignable to type 'CSSProperties'

// ✅ Objet JS avec propriétés camelCase
<div style={{ padding: '1rem', color: 'red' }}>...</div>
```

---

## 5. Ancrage TribuZen

La `FamilyCard` est la brique centrale du tableau de bord admin TribuZen. Elle affiche le nom de la famille, le nombre de membres (expression `{members.length}`), la liste des prénoms (`.map()` + `key` sur l'ID métier), et un badge "Archivée" conditionnel (`&&` booléen).

```tsx
// tribuzen/src/components/family/FamilyCard.tsx

interface Family {
  id: string
  name: string
  members: { id: string; firstName: string }[]
  isArchived: boolean
}

export function FamilyCard({ family }: { family: Family }) {
  return (
    <article className="family-card">
      <header className="family-card__header">
        <h3 className="family-card__name">{family.name}</h3>
        {family.isArchived && (
          <span className="badge badge--archived">Archivée</span>
        )}
      </header>

      <p className="family-card__count">
        {family.members.length} membre(s)
      </p>

      {family.members.length === 0 ? (
        <p className="family-card__empty">Aucun membre.</p>
      ) : (
        <ul className="family-card__members">
          {family.members.map((m) => (
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

Fichier cible dans `smaurier/tribuzen` :

```
tribuzen/
  src/
    components/
      family/
        FamilyCard.tsx   ← ce module
```

> La gestion des props typées sera formalisée au **module 04 (props et children)**. Ici, la props est typée inline pour rester focalisé sur JSX.

---

## 6. Points clés

1. JSX compile en appels `_jsx()` via `react/jsx-runtime` — ce n'est pas du HTML, c'est du JavaScript.
2. `{}` accepte toute expression JS, jamais un statement (`if`, `for`) — utiliser ternaire ou `.map()`.
3. `className` (pas `class`), `htmlFor` (pas `for`), `style={{}}` (objet camelCase, pas une chaîne).
4. Les balises sans enfants doivent être auto-fermantes (`<br />`, `<img />`, `<input />`).
5. `<> </>` groupe sans ajouter de nœud DOM ; `<Fragment key={...}>` quand une `key` est nécessaire dans une liste.
6. `.map()` + `key` stable (ID métier) pour le rendu de liste — jamais l'index si la liste peut changer d'ordre.
7. `&&` avec un nombre falsy (`0`) affiche le nombre — forcer un booléen avec `> 0` ou utiliser un ternaire.
8. JSX auto-échappe le contenu `{}` — protection XSS native ; `dangerouslySetInnerHTML` est l'unique exception et doit être réservé aux sources sanitisées.

---

## 7. Seeds Anki

```
Que produit le compilateur React quand il voit <h1 className="t">Texte</h1> ?|_jsx('h1', { className: 't', children: 'Texte' }) via react/jsx-runtime — JSX est du sucre syntaxique sur des appels de fonction, pas du HTML.
Pourquoi écrit-on className et non class en JSX ?|class est un mot réservé JavaScript. JSX utilise les noms de propriétés DOM JS (className, htmlFor) et non les attributs HTML.
Quel est le bug de {count && <Badge />} quand count vaut 0 ?|&& retourne la valeur de gauche si elle est falsy. 0 est falsy ET affichable — React affiche "0" dans le DOM. Correction : {count > 0 && <Badge />} ou un ternaire explicite.
Quelle est la différence entre <></> et <Fragment key={id}> ?|<></> est du sucre pour Fragment sans attributs. Quand l'élément est dans une liste et a besoin d'une key, il faut <Fragment key={id}> — <> ne peut pas recevoir d'attributs.
Pourquoi ne faut-il pas utiliser l'index comme key dans une liste filtrable ou triable ?|React associe l'état local (inputs, animations) à la position (index), pas à l'élément. Après un tri, l'état est attaché au mauvais élément. Un ID métier stable résout le problème.
Comment JSX protège-t-il contre les injections XSS ?|JSX échappe automatiquement tout contenu injecté dans {}. Un string contenant <script> est affiché comme texte brut. La seule exception est dangerouslySetInnerHTML, à réserver aux sources sanitisées.
Quelle est la syntaxe correcte pour le style inline en JSX ?|style={{}}, un objet JS avec des propriétés camelCase. style="..." (chaîne) est rejeté par TypeScript avec une erreur d'assignation sur CSSProperties.
Quels sont les trois critères d'une bonne key en JSX ?|Unique parmi les frères (siblings), stable entre les rendus (pas Math.random()), prévisible — un ID métier depuis la base de données est idéal.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-03-jsx-en-profondeur/README.md`. Construire la `FamilyCard` TribuZen de A à Z avec Vite + React 19 — corrigé complet commenté.
