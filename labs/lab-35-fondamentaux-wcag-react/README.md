# Lab 35 — Fondamentaux WCAG et accessibilité en React

> **Outcome :** à la fin, tu sais rendre trois zones de l'admin TribuZen conformes WCAG 2.2 AA — une carte-action en `<button>` réel, un formulaire à labels liés et erreurs annoncées, une liste navigable au clavier — et le vérifier au clavier + DevTools.
> **Vrai outil :** React 19 + Vite dev server, et le clavier + l'onglet Accessibility des DevTools du navigateur (aucun harnais simulé).
> **Feedback :** le coach valide en session au clavier et au lecteur d'écran — pas de test-runner auto-correcteur.

---

## Énoncé

Tu reprends la liste des familles de l'admin TribuZen. Le code de départ « marche à la souris » mais échoue au clavier et au lecteur d'écran. Tu dois le rendre conforme **AA** sur trois points, sans introduire d'ARIA avancé.

**Code de départ (inaccessible) — à copier dans ton projet Vite :**

```tsx
// src/types.ts
export interface Family {
  id: string;
  name: string;
  cover: string;
  memberCount: number;
}

// src/StarterFamilyCard.tsx — À CORRIGER
function FamilyCard({ family, onOpen }: { family: Family; onOpen: (id: string) => void }) {
  return (
    <div className="family-card" onClick={() => onOpen(family.id)}>
      <img src={family.cover} />
      <div className="family-card__title">{family.name}</div>
      <div className="family-card__count">{family.memberCount} membres</div>
    </div>
  );
}

// src/StarterInviteForm.tsx — À CORRIGER
function InviteForm() {
  return (
    <div>
      <input type="email" placeholder="Email" />
      <div className="btn" onClick={() => {}}>Inviter</div>
    </div>
  );
}
```

**Cahier des charges exact :**

1. **`FamilyCard`** — transformer la carte en **action** accessible : `<button>` natif, `alt` descriptif sur l'image, vrai titre `<h3>`, focus visible en CSS.
2. **`InviteForm`** — champ email avec `<label htmlFor>` lié, validation (requis + format), erreur reliée (`aria-invalid` + `aria-describedby`) et annoncée (`role="alert"`), bouton `type="submit"`.
3. **`FamilyList`** — rendre la liste en `<ul>`/`<li>` sous un `<h2>`, dans un landmark `<main>`. Comme chaque carte est un `<button>`, la navigation `Tab` doit fonctionner sans code clavier supplémentaire.

**Contraintes :**
- Aucun `div`/`span` cliquable ne subsiste : action = `<button>`, navigation = `<a>`.
- Aucune information codée par la seule couleur.
- Pas de `outline: none` sans focus de remplacement.
- **Pas de gap-fill** — tu réécris chaque composant complet depuis le starter.

### Starter minimal

```
pnpm create vite@latest tribuzen-a11y --template react-ts
```

```
src/
  types.ts            ← Family
  FamilyCard.tsx      ← à écrire (corrige le starter)
  InviteForm.tsx      ← à écrire
  FamilyList.tsx      ← à écrire, mappe des FamilyCard
  a11y.css            ← .sr-only + :focus-visible
  App.tsx             ← branche <main> + <h1> + FamilyList + InviteForm
```

Lance `pnpm dev` et garde le navigateur ouvert. **Débranche ta souris mentalement** : tout doit être atteignable et activable au `Tab` + `Enter`/`Espace`.

---

## Étapes (en friction)

1. **`a11y.css`** — écris d'abord la classe `.sr-only` (masquage visuel accessible) et une règle `:focus-visible` globale nette. Tu t'en serviras partout.
2. **`FamilyCard.tsx`** — remplace le `div onClick` par `<button type="button">`. Ajoute `alt={...}` descriptif, passe le titre en `<h3>`, le compteur en `<p>`. Vérifie au clavier : `Tab` atteint la carte, `Entrée` l'active.
3. **`FamilyList.tsx`** — enveloppe les cartes dans `<ul aria-label="Familles">` / `<li>`, précédé d'un `<h2>Familles</h2>`. Vérifie que `Tab` parcourt les cartes dans l'ordre.
4. **`InviteForm.tsx`** — `<label htmlFor="invite-email">` + `<input id="invite-email">`, state `email` + `error`, validation dans `onSubmit`, message en `role="alert"` relié par `aria-describedby`. Bouton `type="submit"`. Teste : soumettre vide → erreur annoncée ; taper `abc` → erreur format ; email valide → succès.
5. **`App.tsx`** — structure la page : `<h1>`, landmark `<main>`, la liste puis le formulaire.
6. **Audit final** — passe l'onglet Accessibility des DevTools sur chaque champ (nom accessible présent ?), vérifie le contraste des textes, et refais tout le parcours **au clavier seul**.

---

## Corrigé complet commenté

```tsx
// ─── src/types.ts ────────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  cover: string;
  memberCount: number;
}

// ─── src/a11y.css (importé dans main.tsx) ────────────────────────
/*
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}
:focus-visible {
  outline: 3px solid #1a73e8;
  outline-offset: 2px;
}
.family-card { display: block; text-align: left; cursor: pointer; }
.field__error { color: #b00020; }  // couleur EN PLUS du texte, jamais à la place
*/

// ─── src/FamilyCard.tsx ──────────────────────────────────────────
import type { Family } from './types';

// La carte déclenche une ACTION (ouvrir le détail) => <button>, pas <a>.
function FamilyCard({ family, onOpen }: { family: Family; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"                       // pas "submit" : évite de soumettre un form parent
      className="family-card"
      onClick={() => onOpen(family.id)}
    >
      {/* alt informatif : décrit la famille, pas l'URL du fichier */}
      <img src={family.cover} alt={`Photo de la famille ${family.name}`} width={80} height={80} />

      {/* vrai titre : entre dans la hiérarchie (h2 de la liste => h3 ici) */}
      <h3 className="family-card__title">{family.name}</h3>

      {/* info en TEXTE, jamais codée par la seule couleur */}
      <p className="family-card__count">{family.memberCount} membres</p>
    </button>
  );
}

export default FamilyCard;

// ─── src/FamilyList.tsx ──────────────────────────────────────────
import type { Family } from './types';
import FamilyCard from './FamilyCard';

function FamilyList({ families, onOpen }: { families: Family[]; onOpen: (id: string) => void }) {
  return (
    <section aria-labelledby="familles-titre">
      {/* h2 : les cartes contiennent des h3 => hiérarchie cohérente, pas de saut */}
      <h2 id="familles-titre">Familles</h2>

      {/* ul/li : le lecteur d'écran annonce "liste de N éléments" */}
      <ul className="family-list" aria-label="Familles">
        {families.map((family) => (
          <li key={family.id}>
            {/* chaque carte est un <button> natif => Tab + Enter/Espace marchent sans code */}
            <FamilyCard family={family} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FamilyList;

// ─── src/InviteForm.tsx ──────────────────────────────────────────
import { useState } from 'react';

function InviteForm({ onInvite }: { onInvite: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Validation : requis puis format
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
    setEmail('');
  }

  return (
    // aria-label nomme le formulaire ; noValidate => on gère nous-mêmes les messages
    <form onSubmit={handleSubmit} aria-label="Inviter un membre" noValidate>
      <div className="field">
        {/* label lié explicitement au champ par htmlFor/id */}
        <label htmlFor="invite-email">Adresse email</label>
        <input
          id="invite-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          aria-invalid={!!error}                                  // état d'erreur exposé
          aria-describedby={error ? 'invite-email-error' : undefined} // relie le message
        />
        {/* role="alert" => annoncé dès son apparition */}
        {error && (
          <p id="invite-email-error" role="alert" className="field__error">
            {error}
          </p>
        )}
      </div>

      {/* type="submit" : clic ET Entrée dans le champ déclenchent onSubmit */}
      <button type="submit">Envoyer l'invitation</button>
    </form>
  );
}

export default InviteForm;

// ─── src/App.tsx ─────────────────────────────────────────────────
import './a11y.css';
import { useState } from 'react';
import type { Family } from './types';
import FamilyList from './FamilyList';
import InviteForm from './InviteForm';

const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', cover: 'https://picsum.photos/seed/dupont/80', memberCount: 4 },
  { id: 'f2', name: 'Les Martin', cover: 'https://picsum.photos/seed/martin/80', memberCount: 3 },
  { id: 'f3', name: 'Les Nguyen', cover: 'https://picsum.photos/seed/nguyen/80', memberCount: 5 },
];

function App() {
  const [message, setMessage] = useState('');

  return (
    <>
      <header>
        <h1>TribuZen Admin — Familles</h1>
      </header>

      {/* landmark main : un seul par page, cible d'un éventuel skip link */}
      <main id="contenu">
        <FamilyList
          families={DEMO_FAMILIES}
          onOpen={(id) => setMessage(`Ouverture de la famille ${id}`)}
        />

        <h2>Inviter un membre</h2>
        <InviteForm onInvite={(email) => setMessage(`Invitation envoyée à ${email}`)} />

        {/* confirmation annoncée poliment */}
        <p role="status" aria-live="polite">{message}</p>
      </main>

      <footer>
        <p>TribuZen — admin interne</p>
      </footer>
    </>
  );
}

export default App;
```

**Pourquoi ce corrigé est conforme (critères WCAG 2.2 AA visés) :**
- `FamilyCard` en `<button>` : 2.1.1 Clavier, 4.1.2 Nom/rôle/valeur, 2.4.7 Focus visible (via `:focus-visible`).
- Images : 1.1.1 Contenu non textuel (`alt` descriptif).
- Titres et liste : 1.3.1 Information et relations (`h1` > `h2` > `h3` sans saut, `ul`/`li`).
- Formulaire : 3.3.2 Étiquettes (label lié), 3.3.1 Identification des erreurs + 4.1.3 Messages d'état (`aria-invalid`, `aria-describedby`, `role="alert"`), 1.3.5 Finalité de saisie (`autoComplete`).
- Landmarks : `header`/`main`/`footer` structurent la page.
- Aucune info par la seule couleur : le compteur et les erreurs sont du texte.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module :**

1. Ajoute un **skip link** en tout premier élément focusable de la page : « Aller au contenu principal », qui déplace le focus sur `<main id="contenu">` (rappel : `main.tabIndex = -1` puis `main.focus()`), et n'est visible qu'au focus.
2. Ajoute un **deuxième `<nav>`** (secondaire, dans le footer) et distingue les deux navigations avec `aria-label` (« Navigation principale » / « Navigation secondaire »).
3. Dans `InviteForm`, ajoute un **second champ** « Prénom » (requis) avec son propre label lié et sa propre erreur reliée — et déplace le focus sur le **premier** champ en erreur à la soumission.

**Critère de réussite :** parcours complet réalisable **au clavier seul** (skip link → contenu → cartes → formulaire), chaque champ a un nom accessible visible dans l'onglet Accessibility des DevTools, chaque erreur est annoncée et le focus atterrit sur le premier champ fautif.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces composants vivent ici :

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
      AdminLayout.tsx     # header / nav / main / footer + skip link
  styles/
    a11y.css              # .sr-only, :focus-visible
```

**Différences par rapport au lab :**
- Les styles inline/CSS du lab passent par les **tokens du design system** TribuZen (variables de couleur validées pour le contraste AA).
- `InviteForm` sera câblé avec une **Action + `useActionState`** (module 34) : l'accessibilité (labels liés, erreurs reliées) reste identique, seul le mécanisme de soumission change.
- `FamilyList` recevra la navigation clavier avancée (flèches + roving tabindex) au module 36 — ici on s'appuie sur le `Tab` natif des `<button>`.

**Commit cible :**
```
fix(a11y): FamilyCard en button réel + alt + focus visible (WCAG 2.2 AA)
feat(invite): InviteForm — labels liés et erreurs annoncées
refactor(family): FamilyList en ul/li sous landmark main
```
