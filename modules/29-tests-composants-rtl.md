---
titre: Tests de composants avec React Testing Library
cours: 04-react
notions: [philosophie tester le comportement pas l'implémentation, render et screen, queries getByRole prioritaire, findBy pour l'async, queryBy pour l'absence, user-event userEvent.setup click type, assertions jest-dom, waitFor, mocks vi.fn]
outcomes: [écrire des tests de composants React qui vérifient le comportement visible, choisir la bonne query selon l'accessibilité et l'asynchronisme, simuler des interactions utilisateur réalistes avec user-event et mocker des callbacks avec vi.fn]
prerequis: [28-middleware-et-config]
next: 30-tests-api-msw
libs: [{ name: react, version: "^19" }, { name: vitest, version: "^3" }, { name: "@testing-library/react", version: "^16" }]
tribuzen: tests des composants admin — FamilyCard, formulaire d'invitation, composant d'état vide de la liste des familles
last-reviewed: 2026-07
---

# Tests de composants avec React Testing Library

> **Outcomes — tu sauras FAIRE :** écrire des tests de composants React qui vérifient le comportement visible (pas l'implémentation), choisir la bonne query selon l'accessibilité et l'asynchronisme, simuler des interactions réalistes avec user-event et vérifier les callbacks avec `vi.fn()`.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu ajoutes un test à la carte membre de l'admin TribuZen. Un collègue a écrit ceci — le test « passe au vert », mais il casse au premier refactor CSS et ne prouve rien d'utile :

```tsx
// FamilyCard.test.tsx — ce qu'il NE FAUT PAS faire
import { render } from '@testing-library/react';
import { FamilyCard } from './FamilyCard';

test('affiche la famille', () => {
  const { container } = render(
    <FamilyCard name="Les Dupont" status="active" memberCount={4} />
  );

  // ❌ On plonge dans le DOM interne par classe CSS
  const badge = container.querySelector('.badge--active');
  expect(badge).not.toBeNull();

  // ❌ On teste un détail d'implémentation (le nom de classe)
  expect(container.querySelector('.family-card__title')?.textContent)
    .toBe('Les Dupont');
});
```

**Trois problèmes :**
1. `container.querySelector('.badge--active')` — le test connaît les **classes CSS internes**. Renomme `.badge--active` en `.badge-active` et le test casse, alors que l'utilisateur voit toujours la même chose.
2. Il ne vérifie jamais ce qu'un **humain** perçoit : le statut « Active » est-il lisible ? Le rôle du titre est-il un vrai titre (`heading`) ?
3. Aucune interaction n'est testée — or une carte a souvent un bouton d'action.

Ce module t'apprend à écrire le **vrai** test : celui qui interroge le composant comme un utilisateur (par rôle, par texte, par label), qui survit aux refactors internes, et qui échoue seulement quand le comportement change réellement.

> **Note importante — ici, on écrit de VRAIS tests.** Vitest et React Testing Library sont de vrais outils de test professionnels : c'est exactement le sujet du module. Ce qu'on bannit toujours dans ce cursus, ce sont les harnais maison auto-correcteurs (un `assertEqual` fait main, un `runTests` maison qui prétend te noter). Ici, l'outil est réel et le feedback vient de toi (tu lis le rapport Vitest) et du coach en session.

---

## 2. Théorie complète, concise

### 2.1 La philosophie : tester le comportement, pas l'implémentation

> *« Plus tes tests ressemblent à la façon dont ton logiciel est réellement utilisé, plus ils te donnent confiance. »* — Kent C. Dodds

Un composant a deux faces : ce que l'utilisateur **perçoit et manipule** (texte, rôles, champs, boutons) et ce qui se passe **à l'intérieur** (noms d'état, classes CSS, structure des `div`). RTL te pousse à ne tester que la première. Conséquence directe : tu peux refactorer l'intérieur librement, les tests ne cassent que si le comportement observable change.

```tsx
// ❌ Teste l'implémentation : fragile, ne prouve rien pour l'utilisateur
const { container } = render(<Counter />);
expect(container.querySelector('.counter-value')?.textContent).toBe('0');

// ✅ Teste le comportement visible : robuste, aligné sur l'usage
render(<Counter />);
expect(screen.getByText('Compteur : 0')).toBeInTheDocument();
```

RTL ne donne **volontairement pas** accès au state interne du composant. C'est une contrainte de conception, pas une limite technique.

### 2.2 `render` et `screen`

`render` monte le composant dans un DOM virtuel (jsdom). `screen` est l'objet global qui expose toutes les queries sur ce DOM.

```tsx
import { render, screen } from '@testing-library/react';

render(<FamilyCard name="Les Dupont" status="active" memberCount={4} />);

// screen interroge le DOM comme le ferait un utilisateur / lecteur d'écran
const titre = screen.getByRole('heading', { name: /les dupont/i });
```

Pas besoin de nettoyer entre les tests : avec la config standard (globals + jsdom), RTL fait le `cleanup()` automatiquement après chaque test.

### 2.3 Les queries : trouver un élément par priorité d'accessibilité

RTL classe ses queries de la plus accessible (proche de l'utilisateur réel) à la dernière de secours :

| Priorité | Query | Quand |
|---|---|---|
| 1 (préférée) | `getByRole` | Tout élément avec un rôle ARIA (button, heading, textbox, checkbox…) |
| 2 | `getByLabelText` | Champ de formulaire relié à un `<label>` |
| 3 | `getByPlaceholderText` | Input sans label (pis-aller) |
| 4 | `getByText` | Texte visible non interactif |
| 5 | `getByDisplayValue` | Valeur courante d'un input |
| 6 | `getByAltText` | Images |
| 7 (dernier recours) | `getByTestId` | Quand rien d'accessible ne marche |

```tsx
screen.getByRole('button', { name: /inviter/i });   // bouton par son texte accessible
screen.getByRole('heading', { level: 2 });           // <h2>
screen.getByRole('textbox', { name: /email/i });     // input relié à un label "Email"
screen.getByRole('checkbox', { name: /actif/i });    // case à cocher
screen.getByLabelText(/adresse email/i);             // priorité 2
screen.getByText(/aucune famille/i);                 // texte visible
```

Privilégier `getByRole` a un effet de bord vertueux : si ta query échoue parce que l'élément n'a pas de rôle accessible, c'est souvent le signe d'un problème d'accessibilité réel dans le composant.

### 2.4 Les trois préfixes : `getBy`, `queryBy`, `findBy`

C'est le point le plus confondu du module. Chaque préfixe a un contrat précis :

| Préfixe | Retour si absent | Synchronicité | Usage |
|---|---|---|---|
| `getBy…` | **jette une erreur** | synchrone | l'élément DOIT être là maintenant |
| `queryBy…` | retourne `null` | synchrone | vérifier une **absence** |
| `findBy…` | rejette la Promise après timeout | **asynchrone** (renvoie une Promise) | l'élément **apparaîtra** plus tard |

```tsx
// getBy : présent immédiatement
const bouton = screen.getByRole('button', { name: /inviter/i });

// queryBy : la SEULE bonne façon de tester une absence
expect(screen.queryByRole('alert')).not.toBeInTheDocument();

// findBy : attend l'apparition (async), toujours avec await
const message = await screen.findByText(/invitation envoyée/i);
```

Règle mnémotechnique : **`get`** pour « c'est là », **`query`** pour « ce n'est pas là », **`find`** pour « ça va arriver ». Les variantes `…AllBy` (`getAllBy`, `queryAllBy`, `findAllBy`) renvoient un tableau quand plusieurs éléments matchent.

### 2.5 `user-event` : simuler de vraies interactions

`@testing-library/user-event` simule les interactions comme un humain (focus, frappe caractère par caractère, événements clavier réels), là où l'ancien `fireEvent` déclenche un événement brut et peu réaliste. On préfère **toujours** user-event.

```tsx
import userEvent from '@testing-library/user-event';

test('…', async () => {
  const user = userEvent.setup();   // à créer AU DÉBUT de chaque test

  await user.click(screen.getByRole('button', { name: /inviter/i }));
  await user.type(screen.getByRole('textbox', { name: /email/i }), 'alice@tribuzen.app');
  await user.clear(screen.getByRole('textbox', { name: /email/i }));
  await user.selectOptions(screen.getByRole('combobox'), 'admin');
});
```

Deux règles non négociables :
1. **`userEvent.setup()` au début du test**, avant `render` de préférence, et on réutilise l'instance `user`.
2. **Toujours `await`** devant chaque interaction — elles sont asynchrones.

```tsx
// ❌ fireEvent : événement brut, ne reproduit pas focus/keydown/keyup
import { fireEvent } from '@testing-library/react';
fireEvent.change(input, { target: { value: 'test' } });

// ✅ user-event : focus + frappe réaliste caractère par caractère
const user = userEvent.setup();
await user.type(input, 'test');
```

### 2.6 Les assertions : `@testing-library/jest-dom`

`@testing-library/jest-dom` ajoute des matchers lisibles et spécifiques au DOM. On l'importe une fois dans le fichier de setup (`vitest.setup.ts`) via `import '@testing-library/jest-dom'`.

```tsx
expect(el).toBeInTheDocument();
expect(el).toHaveTextContent(/au moins 8 caractères/i);
expect(input).toHaveValue('alice@tribuzen.app');
expect(checkbox).toBeChecked();
expect(bouton).toBeDisabled();
expect(el).toBeVisible();
```

Sans jest-dom, tu écrirais des assertions bien plus verbeuses et moins parlantes (`expect(el.textContent).toContain(...)`).

### 2.7 L'asynchrone : `findBy` vs `waitFor`

Deux outils pour l'async, complémentaires :

- **`findBy…`** = « attends qu'un **élément apparaisse** ». C'est le cas le plus courant (données chargées, message affiché).
- **`waitFor(cb)`** = « attends qu'une **assertion arbitraire** devienne vraie ». Utile quand tu attends autre chose qu'un élément — typiquement qu'un **mock ait été appelé**.

```tsx
// findBy : un élément apparaît après un fetch
expect(await screen.findByText('Alice')).toBeInTheDocument();

// waitFor : attendre qu'un callback mock reçoive son appel
await waitFor(() => {
  expect(onInvite).toHaveBeenCalledWith('alice@tribuzen.app');
});
```

`findBy` est en réalité un `waitFor` + `getBy` empaqueté. Préfère `findBy` quand tu attends un élément ; réserve `waitFor` aux assertions non-DOM.

### 2.8 Les mocks : `vi.fn()`

`vi.fn()` (l'équivalent Vitest de `jest.fn()`) crée une **fonction espion**. On la passe en prop callback pour vérifier qu'un composant l'appelle correctement, sans exécuter la vraie logique.

```tsx
import { vi } from 'vitest';

const onInvite = vi.fn();
render(<InviteForm onInvite={onInvite} />);

// … interactions …

expect(onInvite).toHaveBeenCalledTimes(1);
expect(onInvite).toHaveBeenCalledWith('alice@tribuzen.app');
```

Le mock enregistre chaque appel, ses arguments et son nombre d'appels. C'est ainsi qu'on teste qu'un formulaire « remonte » bien la bonne valeur au parent, sans réseau ni store.

> **Portée du module :** on teste ici des composants **isolés** avec des callbacks mockés (`vi.fn()`). Le mocking des vrais appels réseau (`fetch`) se fait proprement avec MSW — c'est tout le module suivant, `30-tests-api-msw`.

---

## 3. Worked examples

### Exemple 1 — Tester `FamilyCard` (rôle, statut, action)

Le composant sous test — la carte d'une famille dans l'admin TribuZen :

```tsx
// src/features/family/FamilyCard.tsx
interface FamilyCardProps {
  name: string;
  status: 'active' | 'pending';
  memberCount: number;
  onOpen?: (name: string) => void;
}

const STATUS_LABEL: Record<FamilyCardProps['status'], string> = {
  active: 'Active',
  pending: 'En attente',
};

export function FamilyCard({ name, status, memberCount, onOpen }: FamilyCardProps) {
  return (
    <article className="family-card">
      <h2>{name}</h2>
      <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
      <p>{memberCount} membre{memberCount > 1 ? 's' : ''}</p>
      {onOpen && (
        <button type="button" onClick={() => onOpen(name)}>
          Ouvrir
        </button>
      )}
    </article>
  );
}
```

Le test — on interroge par **rôle** et **texte**, jamais par classe CSS :

```tsx
// src/features/family/FamilyCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyCard } from './FamilyCard';

describe('FamilyCard', () => {
  it('affiche le nom comme titre et le statut lisible', () => {
    render(<FamilyCard name="Les Dupont" status="active" memberCount={4} />);

    // Le nom est un vrai heading (accessible), pas juste du texte
    expect(screen.getByRole('heading', { name: /les dupont/i })).toBeInTheDocument();
    // Le statut est vérifié par son LABEL visible, pas par la classe badge--active
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('4 membres')).toBeInTheDocument();
  });

  it('accorde "membre" au singulier', () => {
    render(<FamilyCard name="Solo" status="pending" memberCount={1} />);
    expect(screen.getByText('1 membre')).toBeInTheDocument();
  });

  it('n’affiche pas de bouton si onOpen est absent', () => {
    render(<FamilyCard name="Les Dupont" status="active" memberCount={2} />);
    // queryBy : la bonne query pour prouver une ABSENCE
    expect(screen.queryByRole('button', { name: /ouvrir/i })).not.toBeInTheDocument();
  });

  it('appelle onOpen avec le nom au clic', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();                        // fonction espion
    render(<FamilyCard name="Les Dupont" status="active" memberCount={2} onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: /ouvrir/i }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('Les Dupont');
  });
});
```

Ce que ces tests garantissent : le nom est un heading (a11y), le statut est lisible par un humain, le pluriel est correct, le bouton n'apparaît que si `onOpen` existe, et le clic remonte le bon argument. Renommer `.badge--active` ne casse **rien** ici.

### Exemple 2 — Tester le formulaire d'invitation (saisie, submit, erreur)

Le formulaire d'invitation d'un membre à une famille :

```tsx
// src/features/family/InviteForm.tsx
import { useState } from 'react';

interface InviteFormProps {
  onInvite: (email: string) => void;
}

export function InviteForm({ onInvite }: InviteFormProps) {
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim();

    if (!email.includes('@')) {
      setError('Email invalide');
      return;
    }
    setError('');
    onInvite(email);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" name="email" />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Inviter</button>
    </form>
  );
}
```

Le test couvre les trois comportements demandés — saisie + submit valide, message d'erreur, et absence d'erreur au départ :

```tsx
// src/features/family/InviteForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteForm } from './InviteForm';

describe('InviteForm', () => {
  it('appelle onInvite avec l’email saisi quand il est valide', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<InviteForm onInvite={onInvite} />);

    // getByRole textbox = l'input relié au label "Email"
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'alice@tribuzen.app');
    await user.click(screen.getByRole('button', { name: /inviter/i }));

    expect(onInvite).toHaveBeenCalledWith('alice@tribuzen.app');
  });

  it('affiche un message d’erreur si l’email est invalide', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<InviteForm onInvite={onInvite} />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'pas-un-email');
    await user.click(screen.getByRole('button', { name: /inviter/i }));

    // role="alert" est le rôle accessible d'un message d'erreur
    expect(screen.getByRole('alert')).toHaveTextContent(/email invalide/i);
    // Et surtout : le callback ne doit PAS avoir été appelé
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('n’affiche aucune erreur au premier rendu', () => {
    render(<InviteForm onInvite={vi.fn()} />);
    // queryBy pour l'absence — getBy jetterait une erreur ici
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

Points clés du corrigé :
- On tape l'email via `getByRole('textbox', { name: /email/i })` : le champ est trouvé par son **label accessible**, pas par un `data-testid`.
- Le message d'erreur porte `role="alert"` : on le cible par rôle, ce qui vérifie aussi qu'il est annoncé aux lecteurs d'écran.
- Le test d'erreur vérifie **deux** choses : l'alerte s'affiche ET `onInvite` n'est pas appelé (comportement négatif souvent oublié).

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Tester l'implémentation (classes CSS, structure DOM)

```tsx
// ❌ Le test connaît la structure interne
const { container } = render(<FamilyCard name="Les Dupont" status="active" memberCount={2} />);
expect(container.querySelector('.badge--active')).not.toBeNull();

// ✅ Le test interroge ce que l'utilisateur perçoit
render(<FamilyCard name="Les Dupont" status="active" memberCount={2} />);
expect(screen.getByText('Active')).toBeInTheDocument();
```

**Pourquoi c'est faux :** un test qui dépend d'un nom de classe casse au moindre refactor CSS, sans qu'aucun bug utilisateur n'existe. Signal d'alarme : dès que tu écris `container.querySelector` ou que tu importes `container`, tu es probablement en train de tester l'implémentation.

### PIÈGE #2 — Utiliser `getBy` pour tester une absence

```tsx
// ❌ getBy JETTE une erreur si absent — le test plante avant l'assertion
expect(screen.getByRole('alert')).not.toBeInTheDocument(); // throw, pas un échec propre

// ✅ queryBy retourne null → assertion d'absence correcte
expect(screen.queryByRole('alert')).not.toBeInTheDocument();
```

**Pourquoi c'est faux :** `getByRole('alert')` lève immédiatement une exception « Unable to find… » quand l'alerte n'existe pas. Ton test échoue sur une erreur brute au lieu d'une assertion lisible. Pour prouver une absence, c'est **toujours** `queryBy`.

### PIÈGE #3 — Oublier `await` devant `user-event` ou `findBy`

```tsx
// ❌ Sans await : l'assertion s'exécute avant que l'interaction soit finie
user.click(screen.getByRole('button', { name: /inviter/i }));
expect(onInvite).toHaveBeenCalled();   // flaky : parfois vert, parfois rouge

// ✅ Avec await : on attend la fin de l'interaction
await user.click(screen.getByRole('button', { name: /inviter/i }));
expect(onInvite).toHaveBeenCalled();
```

**Pourquoi c'est faux :** `user.click`, `user.type` et toutes les `findBy…` renvoient des Promises. Sans `await`, l'assertion tourne trop tôt → test « flaky ». Règle : toute ligne user-event ou `findBy` commence par `await`.

### PIÈGE #4 — `fireEvent.change` au lieu de `user.type`

```tsx
// ❌ fireEvent : pose la valeur d'un coup, sans focus ni événements clavier
fireEvent.change(input, { target: { value: 'alice@tribuzen.app' } });

// ✅ user-event : focus + frappe caractère par caractère, comme un humain
await user.type(input, 'alice@tribuzen.app');
```

**Pourquoi c'est faux :** `fireEvent.change` court-circuite tout ce qui dépend du focus, du `keydown`/`keyup` ou de la frappe progressive (masques de saisie, validation à la frappe, `onKeyDown`). user-event reproduit le vrai parcours utilisateur — plus fidèle, moins de faux positifs.

### PIÈGE #5 — `waitFor` là où `findBy` suffit (ou l'inverse)

```tsx
// ❌ waitFor + getBy pour attendre un élément : verbeux et redondant
await waitFor(() => {
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

// ✅ findBy : conçu exactement pour ça
expect(await screen.findByText('Alice')).toBeInTheDocument();

// ✅ waitFor reste le bon outil pour une assertion NON-DOM (mock appelé)
await waitFor(() => expect(onInvite).toHaveBeenCalled());
```

**Pourquoi c'est faux :** `findBy` = `waitFor` + `getBy` empaqueté. Pour attendre un **élément**, utilise `findBy`. Garde `waitFor` pour attendre une **assertion arbitraire** (un espion appelé, une valeur calculée).

---

## 5. Ancrage TribuZen

Dans l'admin web TribuZen, ce module couvre la suite de tests des composants de la **liste des familles** — la première vue qu'un admin voit après connexion.

**`FamilyCard`** (`src/features/family/FamilyCard.test.tsx`) — on teste que le nom de famille est un `heading` accessible, que le statut (`active` / `pending`) s'affiche sous son label lisible (« Active » / « En attente »), que le compteur de membres s'accorde, et que le clic « Ouvrir » remonte le bon identifiant via un `vi.fn()`. Aucun test ne référence les classes du design system — ils survivent au restylage.

**`InviteForm`** (`src/features/family/InviteForm.test.tsx`) — le formulaire d'invitation d'un membre : saisie de l'email par label accessible, submit valide qui appelle `onInvite('…@…')`, email invalide qui affiche un `role="alert"` et n'appelle **pas** le callback. C'est le composant qui valide le plus de comportements négatifs (ne pas soumettre, ne pas appeler le parent).

**`EmptyFamilyList`** (`src/features/family/EmptyFamilyList.test.tsx`) — le composant d'**état vide** : quand aucune famille n'existe, la liste affiche un message d'accueil et un bouton « Créer une famille ». On teste le rendu conditionnel avec `getByText` (message présent) et `queryByRole` (pas de tableau de familles) — l'usage canonique de `queryBy` pour prouver une absence.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/features/family/
  FamilyCard.tsx
  FamilyCard.test.tsx
  InviteForm.tsx
  InviteForm.test.tsx
  EmptyFamilyList.tsx
  EmptyFamilyList.test.tsx
```

La config de test (`vitest.config.ts` avec `environment: 'jsdom'` + `setupFiles` important `@testing-library/jest-dom`) est mutualisée à la racine du projet — voir le lab pour le contenu exact.

---

## 6. Points clés

1. RTL teste le **comportement visible** (rôles, texte, labels), jamais l'implémentation (classes CSS, DOM interne, state).
2. `render` monte le composant, `screen` expose les queries ; le cleanup entre tests est automatique.
3. `getByRole` est la query **prioritaire** — accessible et robuste ; `getByTestId` est le dernier recours.
4. Trois préfixes : `getBy` (présent maintenant, jette si absent), `queryBy` (absence, retourne `null`), `findBy` (async, attend l'apparition).
5. `userEvent.setup()` au début du test, `await` devant chaque interaction — user-event est plus réaliste que `fireEvent`.
6. `@testing-library/jest-dom` fournit les matchers lisibles (`toBeInTheDocument`, `toHaveTextContent`, `toBeChecked`…).
7. `findBy` pour attendre un **élément**, `waitFor` pour attendre une **assertion arbitraire** (ex. un mock appelé).
8. `vi.fn()` crée un espion pour vérifier qu'un composant appelle bien son callback, avec les bons arguments, le bon nombre de fois.

---

## 7. Seeds Anki

```
Quelle est la règle d'or de React Testing Library ?|Tester le comportement visible par l'utilisateur (rôles, texte, labels), pas l'implémentation (classes CSS, structure DOM, state interne). Les tests survivent alors aux refactors internes.
Différence entre getBy, queryBy et findBy en RTL ?|getBy = élément présent maintenant (jette une erreur si absent). queryBy = retourne null si absent, sert à prouver une ABSENCE. findBy = asynchrone, renvoie une Promise, attend qu'un élément apparaisse.
Quelle query utiliser pour vérifier qu'un élément est ABSENT du DOM ?|queryBy… (ex. queryByRole('alert')) car il retourne null au lieu de jeter une erreur. getBy planterait le test avant l'assertion.
Pourquoi getByRole est-il la query prioritaire de RTL ?|Parce qu'il interroge l'élément par son rôle ARIA, comme un lecteur d'écran. S'il échoue faute de rôle, c'est souvent le signe d'un vrai problème d'accessibilité. getByTestId est le dernier recours.
Comment simuler un clic et une saisie réalistes avec user-event ?|const user = userEvent.setup() au début du test, puis await user.click(el) et await user.type(input, 'texte'). Toujours await. user-event simule focus + frappe caractère par caractère, contrairement à fireEvent.
findBy ou waitFor : lequel choisir ?|findBy pour attendre qu'un ÉLÉMENT apparaisse (findBy = waitFor + getBy). waitFor pour attendre une assertion arbitraire NON-DOM, typiquement qu'un mock vi.fn() ait été appelé.
À quoi sert vi.fn() dans un test de composant ?|Créer une fonction espion passée en prop callback, pour vérifier qu'un composant l'appelle correctement : expect(mock).toHaveBeenCalledWith(...) / toHaveBeenCalledTimes(1), sans exécuter la vraie logique ni le réseau.
Quel package fournit toBeInTheDocument, toHaveTextContent, toBeChecked ?|@testing-library/jest-dom, importé une fois dans le fichier de setup (vitest.setup.ts) via import '@testing-library/jest-dom'. Il ajoute des matchers DOM lisibles à expect.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-29-tests-composants-rtl/README.md`. Écrire de vrais fichiers `.test.tsx` (Vitest + RTL) pour `FamilyCard`, `InviteForm` et `EmptyFamilyList` de l'admin TribuZen : queries par rôle, interactions user-event, mocks `vi.fn()`, corrigé complet inline.
