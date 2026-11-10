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

> 📐 **Les fondamentaux d'accessibilité sont désormais dans le cours 25 HTML & CSS**, qui en est
> la source unique du curriculum. Ce module ne traite que ce que **React change** : les attributs
> JSX, la gestion du focus par refs, l'annonce des erreurs dans un rendu contrôlé, et les pièges
> propres au JSX. Tout le reste, à savoir la sémantique, le nom accessible, le contraste, les
> titres et le clavier, est traité une seule fois, là-bas.

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

> 📐 **Traité dans le cours 25 HTML & CSS**, module 00, § 4 bis « Le référentiel en bref ». Ce module ne garde que ce qui change en React.
> Le cadre légal lui-même est au cours 23 `23-droit-numerique`.

Le seul point qui appartient à React, et il est décisif : **React ne génère pas de HTML
accessible tout seul.** Il rend exactement le JSX que tu écris. Un `<div onClick>` reste un
`div`, sans rôle, sans focus, sans clavier. La conformité est donc une responsabilité de
composant, à chaque composant.

### 2.2 Les 4 principes POUR, et les 2.3 niveaux de conformité

> 📐 **Traité dans le cours 25 HTML & CSS**, module 00, § 4 bis. Ce module ne garde que ce qui change en React.

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

### 2.8 Texte alternatif, contraste, focus, titres et landmarks

> 📐 **Traité dans le cours 25 HTML & CSS**, module 01 pour les alternatives, la hiérarchie de titres et les landmarks, module 10 pour le contraste, module 16 pour le focus visible. Ce module ne garde que ce qui change en React.

Ce qui change réellement en React, et c'est tout :

- **les attributs sont en camelCase** : `tabIndex` et non `tabindex`, `htmlFor` et non `for`.
  Les attributs `aria-*` et `data-*` gardent en revanche leurs tirets.
- **`alt` vide se met explicitement** : `alt=""` et non `alt={undefined}`, qui disparaît du
  rendu et fait lire le nom de fichier par certains lecteurs d'écran.
- **le focus se gère avec des refs**, pas avec `document.querySelector` : voir le module 36
  pour les patterns, et `useRef` plus `useEffect` pour le déplacer après un rendu.

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

> 📐 **Traité dans le cours 25 HTML & CSS**, module 14, § 2. Ce module ne garde que ce qui change en React.

### PIÈGE #3 — `for` au lieu de `htmlFor` en JSX

```tsx
// ❌ Ignoré par React (warning) — le lien label/champ est cassé
<label for="email">Email</label>

// ✅ htmlFor en JSX
<label htmlFor="email">Email</label>
```

### PIÈGE #4 — `outline: none`, niveaux de titre sautés, listes de `div`

> 📐 **Traité dans le cours 25 HTML & CSS**, module 16 pour le focus, module 01 pour les titres et les listes. Ce module ne garde que ce qui change en React.

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
