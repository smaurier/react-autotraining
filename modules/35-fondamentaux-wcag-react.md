---
titre: Fondamentaux WCAG et accessibilité en React
cours: 04-react
notions: [4 principes POUR perceptible utilisable compréhensible robuste, niveaux A AA AAA et RGAA, HTML sémantique button vs div onClick, labels de formulaire htmlFor et id, texte alternatif des images, contraste des couleurs, focus visible, navigation clavier Tab Enter Espace, hiérarchie des titres h1 h2 h3, landmarks header nav main footer, différences JSX className htmlFor tabIndex, attributs aria conservés avec tirets]
outcomes: [choisir l'élément HTML sémantique juste plutôt qu'un div cliquable, lier chaque champ de formulaire à son label et annoncer ses erreurs, écrire du JSX conforme WCAG 2.2 AA sur images focus et navigation clavier]
prerequis: [34-react-19-nouveautes]
next: 36-aria-patterns-avances
libs: [{ name: react, version: "^19" }]
tribuzen: admin web TribuZen — FamilyCard cliquable en bouton réel, formulaire d'invitation à labels liés et erreurs annoncées, navigation clavier de la liste des familles
last-reviewed: 2026-07
---

# Fondamentaux WCAG et accessibilité en React

> **Outcomes — tu sauras FAIRE :** choisir l'élément HTML sémantique juste plutôt qu'un `div` cliquable, lier chaque champ de formulaire à son label et annoncer ses erreurs, écrire du JSX conforme WCAG 2.2 AA sur les images, le focus et la navigation clavier.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu reprends l'admin TribuZen. Un collègue a livré la carte famille de la liste principale. Elle « marche » à la souris — mais un test rapide au clavier (touche `Tab`) montre qu'on ne peut jamais l'atteindre, et le lecteur d'écran ne l'annonce pas.

```tsx
// FamilyCard.tsx — AVANT (inaccessible)
function FamilyCard({ family, onOpen }: { family: Family; onOpen: (id: string) => void }) {
  return (
    <div className="family-card" onClick={() => onOpen(family.id)}>
      <img src={family.cover} />
      <div className="family-card__title">{family.name}</div>
      <div className="family-card__count">{family.memberCount} membres</div>
    </div>
  );
}
```

**Quatre défauts, tous des critères WCAG 2.2 AA en échec :**
1. `div onClick` — pas focusable au clavier, `Enter`/`Espace` ne l'activent pas, le lecteur d'écran ne dit pas « bouton » (critère 2.1.1 Clavier, 4.1.2 Nom/rôle/valeur).
2. `<img>` sans `alt` — le lecteur d'écran lit l'URL du fichier ou « image » (critère 1.1.1 Contenu non textuel).
3. Le « titre » est un `div` — aucune structure de titres exploitable (critère 1.3.1 Information et relations).
4. Rien ne garantit un focus visible ni un contraste suffisant du texte.

Ce module te donne les fondamentaux WCAG pour corriger tout ça en React, sans ARIA avancé (ce sera le module suivant).

---

## 2. Théorie complète, concise

### 2.1 Pourquoi c'est non négociable

L'accessibilité n'est pas une option de confort. En Europe, l'**European Accessibility Act (EAA)** s'applique depuis juin 2025 aux services numériques du privé. En France, le **RGAA** (Référentiel Général d'Amélioration de l'Accessibilité) est l'application légale des **WCAG** (Web Content Accessibility Guidelines) : c'est le même socle technique, traduit et opposable. La cible légale est le niveau **AA**.

React ne génère **pas** de HTML accessible tout seul : il rend exactement le JSX que tu écris. Un `<div onClick>` reste un `div`. La conformité est donc une responsabilité de développeur, à chaque composant.

### 2.2 Les 4 principes POUR

Tout critère WCAG appartient à l'un de ces 4 principes. Le moyen mnémotechnique français est **POUR** :

| Principe | Signifie | En React, concrètement |
|----------|----------|------------------------|
| **P**erceptible | L'info est perçue par tous les sens | `alt` sur les images, contraste suffisant, ne pas coder l'info par la couleur seule |
| **U**tilisable | Tout est actionnable, notamment au clavier | `<button>`/`<a>` natifs, focus visible, ordre de tabulation logique |
| **C**ompréhensible | Contenu et interface prévisibles | labels liés aux champs, messages d'erreur clairs, `lang` déclaré |
| **R**obuste | Compatible avec les technologies d'assistance | HTML sémantique, structure valide, ARIA correct seulement si nécessaire |

> En anglais l'acronyme est **POUR** aussi : **P**erceivable, **O**perable, **U**nderstandable, **R**obust.

### 2.3 Les niveaux de conformité

| Niveau | Portée | Requis ? |
|--------|--------|----------|
| **A** | Minimum vital | Oui |
| **AA** | Cible légale (RGAA, EAA) | **Oui — c'est l'objectif** |
| **AAA** | Excellence, pas toujours atteignable | Non exigé globalement |

WCAG **2.2** (dernière version stable) ajoute au niveau AA des critères comme **2.4.11 Focus non masqué** (l'élément qui a le focus ne doit pas être caché par un header collant) et **2.5.8 Taille de cible minimale** (24×24 px). On vise 2.2 AA.

### 2.4 JSX n'est pas HTML : les attributs qui changent

JSX est du JavaScript. Certains attributs HTML sont des mots réservés JS et changent de nom.

| HTML | JSX | Pourquoi |
|------|-----|----------|
| `class` | `className` | `class` est réservé en JS |
| `for` | `htmlFor` | `for` est réservé en JS |
| `tabindex` | `tabIndex` | camelCase des attributs standard |
| `aria-label`, `aria-describedby`… | **identiques** | les attributs à tiret restent tels quels |
| `role` | `role` | inchangé |

> Piège fréquent : écrire `<label for="...">`. React émet un warning et **le lien label/champ est cassé**. Toujours `htmlFor` en JSX.

### 2.5 HTML sémantique : `button` vs `div onClick`

C'est le fondamental le plus rentable. Un `<button>` natif t'offre **gratuitement** : focusable au clavier, activation par `Enter` et `Espace`, rôle « bouton » annoncé, gestion des états `disabled`.

```tsx
// ❌ div cliquable — perd tout ce qui précède
<div className="btn" onClick={handleClick}>Inviter</div>

// ✅ button natif — clavier + rôle + focus, sans effort
<button type="button" className="btn" onClick={handleClick}>Inviter</button>
```

Règle de décision :
- Une **action** (ouvrir un panneau, soumettre, basculer) → `<button>`.
- Une **navigation** (changer d'URL/de page) → `<a href>`.
- Ne jamais recréer un bouton avec un `div` + `role="button"` + `tabIndex` + gestion `onKeyDown` manuelle **si un `<button>` fait l'affaire**. Le natif est toujours préférable.

### 2.6 Labels de formulaire : `htmlFor` + `id`

Chaque champ doit avoir un nom accessible. La méthode canonique lie un `<label htmlFor>` à l'`id` du champ. Cliquer le label focalise alors le champ, et le lecteur d'écran lit le libellé.

```tsx
// ✅ label lié explicitement au champ
<label htmlFor="invite-email">Adresse email</label>
<input id="invite-email" type="email" name="email" />
```

Un `placeholder` **n'est pas** un label : il disparaît à la saisie et son contraste est souvent trop faible. Si le design ne montre pas de label visible, utilise un label visuellement masqué (classe `sr-only`) — jamais rien.

### 2.7 Erreurs de formulaire annoncées

Trois attributs se combinent pour rendre une erreur perceptible et reliée à son champ :
- `aria-invalid={true}` sur le champ en erreur ;
- `aria-describedby="id-du-message"` pour rattacher le texte d'erreur au champ ;
- le message d'erreur dans un élément avec `role="alert"` pour qu'il soit annoncé dès son apparition.

```tsx
<label htmlFor="invite-email">Adresse email</label>
<input
  id="invite-email"
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? 'invite-email-error' : undefined}
/>
{error && <p id="invite-email-error" role="alert">{error}</p>}
```

### 2.8 Texte alternatif des images

Le `alt` répond à une question simple : **l'image porte-t-elle de l'information ?**

```tsx
// Informative → alt décrit le contenu utile
<img src={family.cover} alt={`Photo de la famille ${family.name}`} />

// Décorative → alt VIDE (pas d'attribut absent) pour que le lecteur l'ignore
<img src="/motif-fond.svg" alt="" />
```

`alt=""` (vide) et « pas de `alt` du tout » ne sont pas équivalents : sans attribut, beaucoup de lecteurs d'écran lisent le nom de fichier. Le `alt` vide dit explicitement « ignore-moi ».

### 2.9 Contraste des couleurs

Critère 1.4.3 (AA) : le texte doit atteindre un ratio de contraste avec son fond d'au moins **4.5:1** (texte normal) ou **3:1** (grand texte ≥ 24 px, ou 18.66 px gras). Se vérifie avec l'onglet Accessibility des DevTools ou un plugin de design. Corollaire (1.4.1) : ne **jamais** coder une information par la seule couleur (ex. un statut « en erreur » uniquement rouge) — ajouter texte ou icône.

### 2.10 Focus visible et navigation clavier

- **Focus visible (2.4.7)** : ne jamais faire `outline: none` sans remplacement. Fournir un anneau de focus net (`:focus-visible { outline: 2px solid … }`).
- **Ordre de tabulation** : suit l'ordre du DOM. Éviter `tabIndex` positif (`tabIndex={1}`) qui casse l'ordre naturel. `tabIndex={0}` rend focusable un élément normalement non focusable ; `tabIndex={-1}` le rend focusable par script mais pas par `Tab`.

Conventions clavier attendues :

| Touche | Comportement attendu |
|--------|----------------------|
| `Tab` / `Shift+Tab` | Élément focusable suivant / précédent |
| `Enter` | Activer un lien ou un bouton |
| `Espace` | Activer un bouton, cocher une case |
| `Échap` | Fermer une modale, un menu |
| Flèches | Naviguer dans un groupe (listes, onglets) |

Avec des `<button>` et `<a>` natifs, `Tab`/`Enter`/`Espace` marchent **sans code**. Le clavier ne devient du travail que pour les widgets composites (module suivant).

### 2.11 Hiérarchie des titres et landmarks

- **Titres (1.3.1)** : un seul `<h1>` par page, puis `<h2>`, `<h3>`… sans saut de niveau (pas de `<h1>` directement suivi d'un `<h3>`). Les lecteurs d'écran naviguent de titre en titre : la hiérarchie est la table des matières.
- **Landmarks** : les éléments de région structurent la page et permettent le saut direct. `<header>`, `<nav>`, `<main>` (un seul), `<footer>`, `<aside>`. Un `<div>` n'est pas un landmark.

```tsx
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <nav aria-label="Navigation principale">{/* liens */}</nav>
      </header>
      <main id="contenu">{children}</main>
      <footer>{/* mentions */}</footer>
    </>
  );
}
```

> Note : `aria-label` sur un `<nav>` sert à **distinguer** deux navigations (« principale » vs « secondaire »). C'est le seul ARIA utile ici — le reste est natif.

---

## 3. Worked examples

### Exemple 1 — Rendre la `FamilyCard` accessible (TribuZen)

Reprise du cas concret. La carte déclenche une **action** (ouvrir le panneau famille) : c'est donc un `<button>`.

```tsx
// FamilyCard.tsx — APRÈS
interface Family {
  id: string;
  name: string;
  cover: string;
  memberCount: number;
}

function FamilyCard({ family, onOpen }: { family: Family; onOpen: (id: string) => void }) {
  return (
    // <button> = focusable + Enter/Espace + rôle "bouton" annoncé, gratuitement
    <button
      type="button"
      className="family-card"
      onClick={() => onOpen(family.id)}
    >
      {/* alt informatif : le lecteur d'écran décrit la famille, pas l'URL */}
      <img src={family.cover} alt={`Photo de la famille ${family.name}`} />

      {/* vrai titre : entre dans la hiérarchie h2 de la page liste */}
      <h3 className="family-card__title">{family.name}</h3>

      {/* le nombre n'est PAS codé par la seule couleur : texte explicite */}
      <p className="family-card__count">{family.memberCount} membres</p>
    </button>
  );
}
```

```css
/* Focus visible net — remplace tout outline:none éventuel */
.family-card:focus-visible {
  outline: 3px solid #1a73e8;
  outline-offset: 2px;
}
```

**Ce qui a été corrigé, critère par critère :**
- 2.1.1 / 4.1.2 : `<button>` rend la carte focusable, activable au clavier, annoncée comme bouton.
- 1.1.1 : `alt` descriptif sur l'image.
- 1.3.1 : `<h3>` donne un vrai titre exploitable dans la structure.
- 2.4.7 : `:focus-visible` garantit un focus visible.

> Attention à un piège HTML : un `<button>` **ne peut pas** contenir d'élément interactif imbriqué (pas de `<a>` ou `<button>` à l'intérieur). Si la carte doit contenir plusieurs actions distinctes, on passe à un conteneur avec un `<h3>` dont le texte est un lien/bouton — pas toute la carte en bouton.

### Exemple 2 — Formulaire d'invitation accessible (TribuZen)

Le formulaire d'invitation de l'admin : email requis, avec message d'erreur annoncé. En React 19 on peut le câbler avec une Action + `useActionState`, mais l'accessibilité tient d'abord aux **labels liés** et aux **erreurs reliées** — indépendamment du mécanisme de soumission.

```tsx
import { useState } from 'react';

function InviteForm({ onInvite }: { onInvite: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email) {
      setError("L'adresse email est obligatoire.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Le format de l'adresse email est invalide.");
      return;
    }
    setError(null);
    onInvite(email);
  }

  return (
    // aria-label nomme le formulaire ; noValidate pour gérer nous-mêmes les messages
    <form onSubmit={handleSubmit} aria-label="Inviter un membre" noValidate>
      <div className="field">
        {/* label lié au champ par htmlFor/id */}
        <label htmlFor="invite-email">Adresse email</label>
        <input
          id="invite-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          // aria-invalid signale l'état d'erreur aux technologies d'assistance
          aria-invalid={!!error}
          // aria-describedby rattache le message d'erreur au champ
          aria-describedby={error ? 'invite-email-error' : undefined}
        />
        {/* role="alert" => le message est annoncé dès qu'il apparaît */}
        {error && (
          <p id="invite-email-error" role="alert" className="field__error">
            {error}
          </p>
        )}
      </div>

      {/* type="submit" : Enter dans le champ soumet le formulaire */}
      <button type="submit">Envoyer l'invitation</button>
    </form>
  );
}
```

**Pourquoi ce formulaire est conforme :**
- Le champ a un **nom accessible** via `<label htmlFor>` (critère 3.3.2 Étiquettes ou instructions).
- L'erreur est **reliée** au champ (`aria-describedby`) et **annoncée** (`role="alert"`) — critères 3.3.1 Identification des erreurs et 4.1.3.
- `autoComplete="email"` aide au remplissage (critère 1.3.5 Identifier la finalité de saisie).
- `<button type="submit">` déclenche `onSubmit` au clic **et** à `Enter` dans le champ.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `div onClick` avec « juste » un `role` posé dessus

```tsx
// ❌ On croit sauver un div en ajoutant role="button"
<div role="button" onClick={handleClick}>Inviter</div>
// Il manque : tabIndex={0}, la gestion de Enter ET Espace, l'état disabled...
// C'est réimplémenter à la main tout ce qu'un <button> donne gratuitement — et on oublie toujours un cas.

// ✅ Utiliser le natif
<button type="button" onClick={handleClick}>Inviter</button>
```

**Règle :** ARIA est un dernier recours. « La première règle d'ARIA : ne pas utiliser ARIA si un élément HTML natif fait le travail. »

### PIÈGE #2 — `placeholder` pris pour un label

```tsx
// ❌ Aucun <label> : le champ n'a pas de nom accessible stable
<input type="email" placeholder="Email" />

// ✅ Label réel (masqué visuellement si le design l'exige)
<label htmlFor="email" className="sr-only">Adresse email</label>
<input id="email" type="email" placeholder="nom@exemple.fr" />
```

Le placeholder disparaît à la saisie, échoue souvent au contraste, et n'est pas un nom accessible fiable.

### PIÈGE #3 — `for` au lieu de `htmlFor` en JSX

```tsx
// ❌ Ignoré par React (warning) — le lien label/champ est cassé
<label for="email">Email</label>

// ✅ htmlFor en JSX
<label htmlFor="email">Email</label>
```

### PIÈGE #4 — `outline: none` sans focus de remplacement

```css
/* ❌ Supprime tout repère visuel de focus — échec 2.4.7 */
button:focus { outline: none; }

/* ✅ Remplacer par un focus visible net */
button:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
```

### PIÈGE #5 — Sauter des niveaux de titre pour le style

```tsx
// ❌ On choisit <h4> parce qu'il est "plus petit" visuellement — trou dans la hiérarchie
<h2>Familles</h2>
<h4>Les Dupont</h4>

// ✅ Le niveau reflète la STRUCTURE ; la taille se règle en CSS
<h2>Familles</h2>
<h3 className="titre-compact">Les Dupont</h3>
```

Le niveau de titre est une donnée de structure, pas de style. La taille visuelle se gère en CSS.

### PIÈGE #6 — Liste de `div` au lieu de `ul`/`li`

```tsx
// ❌ Le lecteur d'écran n'annonce pas "liste de N éléments"
<div className="list">
  {families.map((f) => <div key={f.id}>{f.name}</div>)}
</div>

// ✅ Sémantique de liste
<ul className="list" aria-label="Familles">
  {families.map((f) => <li key={f.id}>{f.name}</li>)}
</ul>
```

---

## 5. Ancrage TribuZen

Dans l'admin web TribuZen, ces fondamentaux s'appliquent aux trois zones les plus utilisées :

**`FamilyCard`** (`src/components/features/family/FamilyCard.tsx`) — la carte de la liste des familles est une **action** (ouvre le panneau détail). Elle doit être un `<button>` réel avec `alt` sur la couverture, `<h3>` pour le nom, focus visible. C'est le cas concret du module, corrigé en Exemple 1.

**`InviteForm`** (`src/components/features/invite/InviteForm.tsx`) — le formulaire d'invitation : label lié (`htmlFor`/`id`), erreurs `aria-invalid` + `aria-describedby` + `role="alert"`, `autoComplete="email"`. C'est l'Exemple 2. Il se marie avec `useActionState` du module 34, mais l'accessibilité vient d'abord des labels et des erreurs reliées.

**`FamilyList`** (`src/components/features/family/FamilyList.tsx`) — la liste est un `<ul>`/`<li>` (pas des `div`), sous un `<h2>`, dans le landmark `<main>`. Chaque `FamilyCard` étant un `<button>` natif, la navigation `Tab` entre familles marche sans code. Le clavier avancé (flèches, roving tabindex pour naviguer la grille sans multiplier les `Tab`) est le sujet du module suivant.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  components/
    features/
      family/
        FamilyCard.tsx
        FamilyList.tsx
      invite/
        InviteForm.tsx
    layout/
      AdminLayout.tsx     # header / nav / main / footer
  styles/
    a11y.css              # .sr-only, :focus-visible
```

---

## 6. Points clés

1. RGAA = application française et légale des WCAG ; la cible est le niveau **AA** (WCAG 2.2). React ne rend pas accessible tout seul.
2. Les 4 principes **POUR** : Perceptible, Utilisable, Compréhensible, Robuste — tout critère s'y rattache.
3. Une action = `<button>`, une navigation = `<a href>`. Le natif offre clavier, focus et rôle gratuitement ; ARIA est un dernier recours.
4. En JSX : `className`, `htmlFor`, `tabIndex` (camelCase) ; les attributs `aria-*` gardent leurs tirets.
5. Chaque champ a un `<label htmlFor>` lié à l'`id` du champ ; le `placeholder` n'est pas un label.
6. Une erreur de champ se relie et s'annonce : `aria-invalid` + `aria-describedby` + `role="alert"`.
7. Images : `alt` descriptif si informatives, `alt=""` si décoratives (jamais d'attribut absent).
8. Contraste texte ≥ 4.5:1 (AA) et jamais d'info par la seule couleur.
9. Focus toujours visible (`:focus-visible`, pas `outline:none`) ; ordre de tabulation = ordre du DOM, éviter `tabIndex` positif.
10. Un seul `<h1>`, pas de saut de niveau ; structurer avec les landmarks `header`/`nav`/`main`/`footer` et des `ul`/`li`.

---

## 7. Seeds Anki

```
Que signifie l'acronyme POUR des principes WCAG ?|Perceptible, Utilisable, Compréhensible, Robuste. Tout critère WCAG se rattache à l'un de ces 4 principes. (En anglais : Perceivable, Operable, Understandable, Robust.)
Quel est le lien entre RGAA et WCAG, et quel niveau viser ?|Le RGAA est l'application française et légale des WCAG (même socle technique). La cible légale est le niveau AA (WCAG 2.2). AAA est l'excellence, non exigée globalement.
Pourquoi préférer un <button> à un <div onClick> en React ?|Le <button> natif est focusable au clavier, activable par Enter et Espace, annoncé comme "bouton" par le lecteur d'écran et gère disabled — gratuitement. Un div oblige à réimplémenter tout ça à la main (tabIndex, onKeyDown Enter+Espace) et on oublie toujours un cas.
Comment lier un label à un champ en JSX, et quel piège éviter ?|Avec <label htmlFor="id"> pointant vers l'id du champ. Piège : écrire for="..." au lieu de htmlFor — React l'ignore et le lien est cassé. Un placeholder n'est pas un label.
Quels attributs rendent une erreur de formulaire accessible ?|aria-invalid={true} sur le champ, aria-describedby pointant vers l'id du message, et le message dans un élément role="alert" pour qu'il soit annoncé dès son apparition.
Quelle est la différence entre alt="" et une image sans attribut alt ?|alt="" (vide) dit au lecteur d'écran d'ignorer l'image décorative. Sans attribut alt, beaucoup de lecteurs lisent le nom de fichier. Une image informative doit avoir un alt descriptif.
Quel ratio de contraste minimal pour un texte normal en AA, et quelle règle complémentaire ?|4.5:1 pour le texte normal (3:1 pour le grand texte). Règle complémentaire : ne jamais coder une information par la seule couleur (ajouter texte ou icône).
Quelles règles sur la hiérarchie des titres et les landmarks ?|Un seul <h1> par page, pas de saut de niveau (h2 puis h3, jamais h1 vers h3). Structurer avec les landmarks header, nav, main (un seul), footer, et utiliser ul/li pour les listes. Le niveau de titre est de la structure, la taille se règle en CSS.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-35-fondamentaux-wcag-react/README.md`. Corriger la `FamilyCard` inaccessible, écrire le formulaire d'invitation à labels liés et erreurs annoncées, et rendre la liste des familles navigable au clavier — le tout vérifié au clavier et aux DevTools, sans test simulé.
