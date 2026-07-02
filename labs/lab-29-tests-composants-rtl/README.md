# Lab 29 — Tests de composants avec React Testing Library

> **Outcome :** à la fin, tu sais écrire de vrais fichiers `.test.tsx` (Vitest + React Testing Library) qui vérifient le comportement de composants React 19 : queries par rôle, interactions user-event, mocks `vi.fn()`, tests d'absence et d'erreur.
> **Vrai outil :** Vitest 3 + `@testing-library/react` 16 + jsdom — le rapport `vitest` (vert/rouge) est ton retour, pas un harnais maison.
> **Feedback :** le coach valide en session que tes tests ciblent le comportement (pas les classes CSS). Aucun test-runner auto-correcteur, aucun `assertEqual` fait main.

---

## Énoncé

Tu écris la suite de tests des composants de la **liste des familles** de l'admin TribuZen. Trois composants te sont fournis **complets** (le code sous test) — ton travail est d'écrire les **tests**, pas les composants.

Comportements à couvrir :

1. **`FamilyCard`** — le nom est un `heading`, le statut s'affiche sous son label lisible, le compteur de membres s'accorde (singulier/pluriel), le bouton « Ouvrir » n'existe que si `onOpen` est fourni et remonte le bon nom au clic.
2. **`InviteForm`** — saisie de l'email + submit valide → `onInvite` appelé avec l'email ; email invalide → message `role="alert"` ET `onInvite` non appelé ; aucune alerte au premier rendu.
3. **`EmptyFamilyList`** — état vide : message d'accueil + bouton « Créer une famille » présents ; aucune liste de familles rendue.

### Setup projet (vrai outil)

```bash
pnpm create vite@latest tribuzen-tests --template react-ts
cd tribuzen-tests
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

`vitest.config.ts` à la racine :

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,               // describe/it/expect sans import
    environment: 'jsdom',        // DOM virtuel pour render()
    setupFiles: './vitest.setup.ts',
  },
});
```

`vitest.setup.ts` à la racine :

```ts
import '@testing-library/jest-dom'; // ajoute toBeInTheDocument, toHaveTextContent, etc.
```

Ajoute le script dans `package.json` : `"test": "vitest"`.

### Composants fournis (à copier tels quels — NE PAS les modifier)

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

```tsx
// src/features/family/EmptyFamilyList.tsx
interface Family {
  id: string;
  name: string;
}

interface EmptyFamilyListProps {
  families: Family[];
  onCreate: () => void;
}

// Composant conditionnel : état vide OU liste
export function EmptyFamilyList({ families, onCreate }: EmptyFamilyListProps) {
  if (families.length === 0) {
    return (
      <div>
        <p>Aucune famille pour le moment.</p>
        <button type="button" onClick={onCreate}>
          Créer une famille
        </button>
      </div>
    );
  }

  return (
    <ul>
      {families.map((f) => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  );
}
```

---

## Étapes (en friction)

Écris **toi-même** chaque fichier de test, du starter vide. Lance `pnpm test` après chaque fichier et lis le rapport Vitest.

1. **`FamilyCard.test.tsx`** — écris 4 tests :
   - le nom est trouvé via `getByRole('heading', { name: /… /i })` ;
   - le statut est vérifié via `getByText('Active')` (jamais via la classe `badge--active`) ;
   - avec `memberCount={1}`, le texte est « 1 membre » (singulier) ;
   - sans `onOpen`, `queryByRole('button', …)` renvoie `null` ; avec un `vi.fn()`, le clic appelle le mock avec le nom.
2. **`InviteForm.test.tsx`** — écris 3 tests :
   - saisie via `getByRole('textbox', { name: /email/i })`, clic « Inviter », `onInvite` appelé avec l'email ;
   - email invalide → `getByRole('alert')` affiche « Email invalide » ET `onInvite` **non** appelé ;
   - au premier rendu, `queryByRole('alert')` est absent.
3. **`EmptyFamilyList.test.tsx`** — écris 2 tests :
   - `families={[]}` → message + bouton « Créer une famille » présents, clic appelle `onCreate` ;
   - `families` non vide → les noms sont rendus (`getByText`) et le message d'état vide est absent (`queryByText`).
4. **Vérifie la robustesse** — renomme volontairement `badge--active` en `badge-x` dans `FamilyCard.tsx` : tes tests doivent **rester verts** (preuve qu'ils testent le comportement). Remets le nom ensuite.

**Rappels non négociables :** `const user = userEvent.setup()` au début de chaque test avec interaction ; `await` devant chaque `user.*` et chaque `findBy`.

---

## Corrigé complet commenté

```tsx
// src/features/family/FamilyCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyCard } from './FamilyCard';

describe('FamilyCard', () => {
  it('affiche le nom comme heading et le statut lisible', () => {
    render(<FamilyCard name="Les Dupont" status="active" memberCount={4} />);

    // Rôle heading = on vérifie l'accessibilité, pas juste un texte
    expect(screen.getByRole('heading', { name: /les dupont/i })).toBeInTheDocument();
    // On cible le LABEL visible, pas la classe CSS badge--active
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('4 membres')).toBeInTheDocument();
  });

  it('accorde "membre" au singulier', () => {
    render(<FamilyCard name="Solo" status="pending" memberCount={1} />);
    expect(screen.getByText('1 membre')).toBeInTheDocument();
  });

  it('n’affiche pas de bouton "Ouvrir" sans onOpen', () => {
    render(<FamilyCard name="Les Dupont" status="active" memberCount={2} />);
    // queryBy → null si absent : la SEULE query correcte pour une absence
    expect(screen.queryByRole('button', { name: /ouvrir/i })).not.toBeInTheDocument();
  });

  it('appelle onOpen avec le nom au clic', async () => {
    const user = userEvent.setup();     // toujours en tête de test
    const onOpen = vi.fn();             // espion
    render(
      <FamilyCard name="Les Dupont" status="active" memberCount={2} onOpen={onOpen} />
    );

    await user.click(screen.getByRole('button', { name: /ouvrir/i }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('Les Dupont');
  });
});
```

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

    // getByRole textbox = input relié au <label>Email
    await user.type(
      screen.getByRole('textbox', { name: /email/i }),
      'alice@tribuzen.app'
    );
    await user.click(screen.getByRole('button', { name: /inviter/i }));

    expect(onInvite).toHaveBeenCalledWith('alice@tribuzen.app');
  });

  it('affiche une alerte et n’appelle pas onInvite si l’email est invalide', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<InviteForm onInvite={onInvite} />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'pas-un-email');
    await user.click(screen.getByRole('button', { name: /inviter/i }));

    // role="alert" : message d'erreur accessible
    expect(screen.getByRole('alert')).toHaveTextContent(/email invalide/i);
    // Comportement négatif crucial : le parent ne doit pas être notifié
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('n’affiche aucune alerte au premier rendu', () => {
    render(<InviteForm onInvite={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

```tsx
// src/features/family/EmptyFamilyList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyFamilyList } from './EmptyFamilyList';

describe('EmptyFamilyList', () => {
  it('affiche l’état vide et déclenche onCreate au clic', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<EmptyFamilyList families={[]} onCreate={onCreate} />);

    expect(screen.getByText(/aucune famille pour le moment/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /créer une famille/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('affiche la liste et masque l’état vide quand des familles existent', () => {
    render(
      <EmptyFamilyList
        families={[
          { id: 'f1', name: 'Les Dupont' },
          { id: 'f2', name: 'Les Martin' },
        ]}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText('Les Dupont')).toBeInTheDocument();
    expect(screen.getByText('Les Martin')).toBeInTheDocument();
    // queryBy pour prouver que le message d'état vide a bien disparu
    expect(screen.queryByText(/aucune famille pour le moment/i)).not.toBeInTheDocument();
  });
});
```

**Pourquoi ce corrigé est correct :**
- Chaque élément est ciblé par **rôle** ou **texte visible** — aucun `container.querySelector`, aucune classe CSS. Renommer `badge--active` ne casse rien.
- Les absences (`bouton sans onOpen`, `alerte au premier rendu`, `message d'état vide masqué`) utilisent `queryBy`, jamais `getBy`.
- Chaque interaction est précédée de `await user.*`, avec `userEvent.setup()` en tête de test → pas de test flaky.
- Les tests de comportement négatif (`onInvite` **non** appelé sur email invalide) sont explicites : c'est là que se cachent les vrais bugs.
- `vi.fn()` remplace les callbacks parents — on teste le composant isolé, sans logique métier ni réseau.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire, sans rouvrir ce corrigé :**

1. Ajoute au composant `FamilyCard` (fourni) une prop `onArchive?: () => void` qui rend un second bouton « Archiver ». Écris le test qui vérifie que **cliquer « Ouvrir » n’appelle pas** `onArchive` (et inversement) — discrimination de deux boutons par leur `name`.
2. `InviteForm` : ajoute un test qui **tape puis efface** le champ (`user.clear`) avant de soumettre, et vérifie que l'alerte « Email invalide » apparaît.
3. Écris un composant asynchrone `FamilyLoader` qui affiche « Chargement… » puis « Chargé » après un `setTimeout`, et teste-le avec `findByText` (async). Contrainte : **en 25 minutes**, sans relire le module.

**Critère de réussite :** `pnpm test` tout vert, chaque nouveau test cible un rôle/texte (jamais une classe), l'async passe par `findBy`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces tests sont colocalisés avec leurs composants :

```
tribuzen/src/features/family/
  FamilyCard.tsx
  FamilyCard.test.tsx
  InviteForm.tsx
  InviteForm.test.tsx
  EmptyFamilyList.tsx
  EmptyFamilyList.test.tsx
vitest.config.ts          ← environment: 'jsdom' + setupFiles
vitest.setup.ts           ← import '@testing-library/jest-dom'
```

**Différences par rapport au lab :**
- Les composants réels utilisent les tokens du design system (classes CSS TribuZen) — mais comme les tests ciblent rôles et texte, ils restent identiques.
- `InviteForm` réel appellera une mutation API (ex. React Query) : au module suivant (`30-tests-api-msw`), on remplacera le `vi.fn()` par un handler MSW pour tester le vrai appel réseau.
- Le CI (`pnpm test --run`) tourne sur chaque PR ; ces tests sont la première barrière avant la revue humaine.

**Commit cible :**
```
test(family): FamilyCard, InviteForm, EmptyFamilyList — RTL + Vitest
```
