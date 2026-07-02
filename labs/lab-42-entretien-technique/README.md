# Lab 42 — Entretien technique React

> **Outcome :** à la fin, tu sais dérouler trois exercices de live coding React 19 typiques d'entretien ESN, en verbalisant ta démarche à voix haute et en défendant chaque décision.
> **Vrai outil :** React 19 + Vite + TypeScript (projet réel, code qui compile et tourne dans le navigateur), et ta voix (tu parles pendant que tu codes).
> **Feedback :** le coach joue l'examinateur en session — il te coupe, demande « pourquoi ? », et note ta verbalisation. Pas de test-runner auto-correcteur.

---

## Énoncé

Tu simules la partie live coding d'un entretien. Trois exercices, chacun donné comme un examinateur le donnerait. **Règle absolue : tu parles à voix haute pendant tout l'exercice** — cadrage, hypothèses, décision, alternative écartée, doute. Un exercice résolu en silence est un exercice raté.

Crée un projet neuf :

```
pnpm create vite@latest entretien-lab --template react-ts
cd entretien-lab && pnpm install && pnpm dev
```

Puis traite les trois exercices ci-dessous **dans l'ordre**, chacun dans son propre fichier branché sur `App.tsx`.

### Exercice A — Recherche débouncée sur grande liste

> « Champ de recherche qui filtre 2000 membres. Ça rame à chaque frappe. Corrige-le, et extrais la logique de debounce dans un hook réutilisable. »

Contraintes :
- L'input doit rester réactif (on ne débounce pas l'affichage du champ, seulement le filtre).
- Extraire `useDebounce<T>` typé générique.
- Justifier à voix haute `useMemo` vs `useEffect+setState`.

### Exercice B — Fetch avec états loading / error / annulation

> « Charge le profil d'un membre depuis `/api/members/:id`. Gère loading, error, success. Et le cas où `id` change avant la fin de la requête. »

Contraintes :
- État en **union discriminée** (pas trois booléens).
- Annuler la requête précédente avec `AbortController`.
- Dire à voix haute pourquoi, et ce que React Query ferait à la place.

### Exercice C — Corriger un stale closure

> « Ce compteur reste bloqué à 1. Explique pourquoi, puis corrige-le. »

Point de départ **buggé** à copier tel quel :

```tsx
import { useState, useEffect } from 'react';

export function BrokenCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // bug ici
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <p>{count}</p>;
}
```

Contrainte : expliquer la cause (stale closure) **avant** de toucher au code, puis corriger sans ajouter `count` aux dépendances.

---

## Étapes (en friction)

1. **Mets un minuteur de 15 min par exercice.** En entretien tu es sous contrainte de temps — reproduis-la.
2. **Avant de coder**, dis à voix haute : l'objectif reformulé, tes hypothèses, ta première décision. Enregistre-toi si tu es seul.
3. **Exercice A** — écris `useDebounce`, puis le composant `MemberSearch`, mémoïse la ligne. Génère 2000 membres factices pour sentir le lag avant/après.
4. **Exercice B** — écris `useMember(id)` avec l'union discriminée et `AbortController`, puis le composant qui rend les trois états.
5. **Exercice C** — verbalise la cause du bug, puis applique l'updater fonctionnel.
6. **Après chaque exercice**, anticipe une question de suivi et réponds-y à voix haute (elles sont listées dans le corrigé).

---

## Corrigé complet commenté

```tsx
// ═══════════════════════════════════════════════════════════════
// EXERCICE A — src/exo-a/MemberSearch.tsx
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, memo } from 'react';

// Hook générique réutilisable : encapsule UNIQUEMENT la logique de debounce
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    // cleanup : annule le timer si value change avant la fin → seule la dernière frappe passe
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface Member {
  id: string;
  name: string;
}

// Ligne mémoïsée : ne re-rend que si SA prop member change (pas à chaque frappe)
const Row = memo(function Row({ member }: { member: Member }) {
  return <li>{member.name}</li>;
});

// Données factices pour sentir le lag
const MEMBERS: Member[] = Array.from({ length: 2000 }, (_, i) => ({
  id: `m${i}`,
  name: `Membre ${i}`,
}));

export function MemberSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // on filtre après la pause de frappe

  // Dérivé PENDANT le rendu (pas d'useEffect+setState) + useMemo car 2000 × includes est non trivial
  const filtered = useMemo(
    () => MEMBERS.filter((m) => m.name.toLowerCase().includes(debouncedQuery.toLowerCase())),
    [debouncedQuery], // MEMBERS est constant ici
  );

  return (
    <div>
      {/* input reste contrôlé et réactif : on ne débounce QUE le calcul, pas l'affichage */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher…"
      />
      <p>{filtered.length} résultat(s)</p>
      <ul>
        {filtered.slice(0, 50).map((m) => (
          <Row key={m.id} member={m} />
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXERCICE B — src/exo-b/MemberProfile.tsx
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';

interface MemberFull {
  id: string;
  name: string;
  email: string;
}

// Union discriminée : rend impossible un état incohérent (ex : loading + data)
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: MemberFull };

function useMember(id: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(`/api/members/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MemberFull>;
      })
      .then((data) => setState({ status: 'success', data }))
      .catch((err) => {
        if (err.name === 'AbortError') return; // annulation volontaire : on ignore
        setState({ status: 'error', message: err.message });
      });

    // id change (ou démontage) → annule la requête en vol : pas de race condition, pas de setState fantôme
    return () => controller.abort();
  }, [id]);

  return state;
}

export function MemberProfile({ id }: { id: string }) {
  const state = useMember(id);

  // Le switch sur status est exhaustif — TypeScript garantit qu'on traite tous les cas
  if (state.status === 'loading') return <p>Chargement…</p>;
  if (state.status === 'error') return <p role="alert">Erreur : {state.message}</p>;

  return (
    <article>
      <h2>{state.data.name}</h2>
      <p>{state.data.email}</p>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXERCICE C — src/exo-c/FixedCounter.tsx
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';

export function FixedCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // FIX : updater fonctionnel → lit toujours la valeur fraîche, sans dépendre de la closure
      setCount((c) => c + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // deps vides OK : l'updater ne capture plus count, donc l'effet n'a pas besoin de le connaître

  return <p>{count}</p>;
}
```

**Pourquoi ce corrigé est correct — et ce qu'il faut DIRE :**

- **Exo A** — *« Je débounce l'entrée, je dérive `filtered` dans le rendu (pas d'effet), et je memo la ligne. useMemo plutôt que useEffect+setState parce que `filtered` se calcule des props/state : le dériver évite un rendu de plus et supprime la désync. Suivi anticipé : si la liste montait à 50k, je virtualiserais avec @tanstack/react-virtual — le goulot deviendrait le nombre de noeuds DOM. »*
- **Exo B** — *« Union discriminée pour que loading+data soit impossible à la compilation. AbortController pour annuler la requête précédente quand id change vite : sinon une réponse lente écrase une réponse récente (race condition). En vrai projet, React Query me donnerait cache, dédup, retry et revalidation gratuitement — je code la version manuelle pour montrer que je comprends ce qu'il abstrait. »*
- **Exo C** — *« C'est un stale closure : le callback de setInterval est créé au montage et capture `count = 0` pour toujours, donc setCount(0 + 1) refait toujours 1. L'updater fonctionnel `c => c + 1` reçoit la valeur courante du state, plus besoin de la closure ni d'ajouter count aux deps (ce qui recréerait l'intervalle à chaque tick). »*

---

## Variante J+30 (fading)

Reproduis les trois exercices **de mémoire, en 30 minutes au total** (10 min chacun), sans rouvrir ce corrigé ni le module 42, avec ces contraintes ajoutées :

1. **Exo A** — ajoute un état « aucun résultat » affiché quand `filtered.length === 0`, et fais en sorte que le hook `useDebounce` annule proprement au démontage (vérifie mentalement le cleanup).
2. **Exo B** — ajoute un bouton « Réessayer » visible en état `error` qui relance le fetch (indice : un state `retryCount` en dépendance de l'effet).
3. **Exo C** — après avoir corrigé, explique à voix haute une **deuxième** façon de corriger (ajouter `count` aux deps) et pourquoi elle est inférieure ici (recrée l'intervalle à chaque seconde).

**Critère de réussite :** les trois compilent et tournent, et surtout tu as verbalisé chaque décision + une question de suivi par exercice, sans blanc de plus de 5 secondes.

---

## Application TribuZen

Ces trois patterns sont exactement ceux du vrai produit — prépare-les comme des arguments d'entretien sur TribuZen (`smaurier/tribuzen`) :

- **Recherche débouncée** → la barre de recherche membres de l'admin TribuZen : même `useDebounce`, mais branché sur `useQuery` de React Query (le filtre se fait côté serveur via un param `?q=`).
- **Fetch + états** → dans TribuZen, ce `useMember` manuel est remplacé par `useQuery(['member', id], …)`. Sache dire en entretien *pourquoi* React Query plutôt que le hook manuel : cache partagé entre composants, dédup, revalidation en arrière-plan.
- **Stale closure** → tout callback dans un `useEffect`/timer de TribuZen (auto-save d'un formulaire, polling de notifications) est un candidat au stale closure. L'updater fonctionnel est le réflexe à ancrer.

**Entraînement ciblé pour Sylvain :** enchaîne une session où tu présentes TribuZen à voix haute (pitch 90 s + trois décisions d'archi défendables), puis fais le pont avec la ligne Eudonet du CV — même muscle « décision → alternative écartée → résultat ». Le coach joue l'examinateur qui creuse.

**Commit cible (repo lab perso) :**
```
chore(entretien): 3 exos live coding — debounce, fetch states, stale closure
```
