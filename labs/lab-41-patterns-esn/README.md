# Lab 41 — Patterns de mission ESN : auditer et refactorer un legacy

> **Outcome :** à la fin, tu sais auditer un composant React legacy fourni, rédiger un audit priorisé écrit, et le refactorer par petits pas incrémentaux (class → function, quick wins d'abord) sans tout réécrire.
> **Vrai outil :** React 19 + Vite dev server + Git réel (une branche + trois commits séparés). Pas de harnais simulé.
> **Feedback :** le coach valide en session — la qualité de l'audit écrit et la granularité des commits comptent autant que le code final.

---

## Énoncé

On te confie ce composant tel qu'il existe « en mission ». Il compile et fonctionne — mais il rame et il est illisible. **Tu n'as pas le droit de le réécrire d'un bloc.** Tu dois produire un audit priorisé, puis le refactorer en plusieurs étapes vérifiables, chacune commitée séparément.

**Legacy fourni (à copier tel quel dans `src/features/predictions/PredictionPanel.tsx`) :**

```tsx
import React from 'react';

// Legacy — NE PAS réécrire d'un bloc. Auditer puis migrer par étapes.
export default class PredictionPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = { predictions: [], loading: true, filter: '' };
    this.handleFilter = this.handleFilter.bind(this);
  }

  componentDidMount() {
    fetch('/api/predictions?session=' + this.props.sessionId)
      .then(r => r.json())
      .then(data => this.setState({ predictions: data, loading: false }));
  }

  componentDidUpdate(prevProps) {
    if (prevProps.sessionId !== this.props.sessionId) {
      fetch('/api/predictions?session=' + this.props.sessionId)
        .then(r => r.json())
        .then(data => this.setState({ predictions: data, loading: false }));
    }
  }

  handleFilter(e) {
    this.setState({ filter: e.target.value });
  }

  render() {
    if (this.state.loading) return <div>Chargement...</div>;
    const filtered = this.state.predictions.filter(p =>
      p.action.toLowerCase().includes(this.state.filter.toLowerCase())
    );
    return (
      <div>
        <input value={this.state.filter} onChange={this.handleFilter} />
        {filtered.map(p => (
          <div key={p.id}>{p.action} — {Math.round(p.score * 100)}%</div>
        ))}
      </div>
    );
  }
}
```

**Mock réseau (pour que le composant tourne sans backend — colle dans `src/main.tsx` avant le render) :**

```tsx
// Mock fetch minimal — répond à /api/predictions
const REAL_FETCH = window.fetch;
window.fetch = async (url, init) => {
  if (typeof url === 'string' && url.startsWith('/api/predictions')) {
    return new Response(JSON.stringify([
      { id: 'p1', action: 'click submit', score: 0.92 },
      { id: 'p2', action: 'scroll down', score: 0.71 },
      { id: 'p3', action: 'open menu', score: 0.44 },
    ]), { headers: { 'Content-Type': 'application/json' } });
  }
  return REAL_FETCH(url, init);
};
```

**Contraintes de mission :**
- Interdiction de tout réécrire en une seule fois. **Trois commits minimum**, un par intention.
- Chaque étape laisse l'app fonctionnelle (elle tourne toujours dans le navigateur).
- Tu produis un fichier `AUDIT.md` **avant** de toucher au code.
- Aucun test à écrire — validation visuelle dans le navigateur + relecture du diff Git.

### Starter

```bash
pnpm create vite@latest tribuzen-lab-41 --template react-ts
cd tribuzen-lab-41 && pnpm install
git init && git add -A && git commit -m "chore: legacy PredictionPanel tel que reçu"
pnpm dev
```

Arborescence cible :
```
src/
  features/predictions/
    PredictionPanel.tsx        ← legacy à auditer puis refactorer
    hooks/usePredictions.ts    ← extrait à l'étape 3
  App.tsx                      ← <PredictionPanel sessionId="s1" />
  main.tsx                     ← mock fetch
AUDIT.md                       ← ton livrable d'audit priorisé
```

---

## Étapes (en friction)

1. **Rédige `AUDIT.md` AVANT de coder.** Liste priorisée P0→P3, puis un plan en 3 PR. Ne regarde pas le corrigé tant que tu n'as pas ta propre version.
2. **Commit 1 — quick win perf (`useMemo`).** Migre d'abord en function (pré-requis technique de `useMemo`) mais fais le **plus petit** changement isofonctionnel possible, puis mémorise le filtrage. Vérifie dans le navigateur : comportement identique.
3. **Commit 2 — quick win fiabilité.** Déduplique les deux `fetch` en un seul `useEffect` avec `AbortController`. Vérifie que changer `sessionId` recharge bien.
4. **Commit 3 — refactor planifié.** Extrais `usePredictions(sessionId)` dans `hooks/`. Le composant ne fetche plus lui-même.
5. **Relis ton diff Git** (`git log --oneline`, `git show`). Chaque commit doit raconter une seule intention lisible.

> Friction voulue : écris l'audit et les trois commits **avant** d'ouvrir le corrigé. La compétence de mission, c'est la méthode, pas le code final.

---

## Corrigé complet commenté

**`AUDIT.md` attendu :**

```
PredictionPanel — audit (30 min)
P0  Deux fetch dupliqués (componentDidMount + componentDidUpdate), aucune
    annulation → race condition si sessionId change vite.
    FIX: 1 useEffect + AbortController.
P1  filter recalculé à CHAQUE render (donc à chaque frappe).
    FIX: useMemo. Impact perf visible sur grosses sessions.
P2  Composant class, logique de fetch dupliquée.
    FIX: migration function + extraction hook usePredictions.
P3  URL concaténée à la main ('...' + id). FIX: template string.

Plan — 3 commits indépendants :
  Commit 1 (quick win, ~1h): function + useMemo. Zéro changement de comportement.
  Commit 2 (quick win, ~1h): dédup fetch + AbortController. Corrige le P0.
  Commit 3 (planifié, ~half-day): extraction usePredictions.
```

**Commit 1 — `refactor(predictions): class → function + useMemo sur le filtrage`**

```tsx
// src/features/predictions/PredictionPanel.tsx
import { useEffect, useMemo, useState } from 'react';

interface Prediction { id: string; action: string; score: number; }

export default function PredictionPanel({ sessionId }: { sessionId: string }) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // À ce stade on conserve la logique fetch telle quelle (isofonctionnel).
  // On ne corrige PAS encore la duplication : ce sera le commit 2.
  useEffect(() => {
    fetch(`/api/predictions?session=${sessionId}`)
      .then(r => r.json())
      .then(data => { setPredictions(data); setLoading(false); });
  }, [sessionId]);

  // P1 corrigé : le filtrage ne se recalcule que si predictions ou filter change
  const filtered = useMemo(
    () => predictions.filter(p =>
      p.action.toLowerCase().includes(filter.toLowerCase())
    ),
    [predictions, filter],
  );

  if (loading) return <div>Chargement...</div>;
  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      {filtered.map(p => (
        <div key={p.id}>{p.action} — {Math.round(p.score * 100)}%</div>
      ))}
    </div>
  );
}
```

**Commit 2 — `fix(predictions): dédup fetch + AbortController (race condition)`**

```tsx
  // Seul l'useEffect change. Un seul fetch, annulé au changement de session.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/predictions?session=${sessionId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setPredictions(data); setLoading(false); })
      .catch(() => {}); // abort → on ignore l'erreur
    return () => controller.abort(); // nettoyage = fix P0
  }, [sessionId]);
```

**Commit 3 — `refactor(predictions): extraction du hook usePredictions`**

```tsx
// src/features/predictions/hooks/usePredictions.ts
import { useEffect, useState } from 'react';

export interface Prediction { id: string; action: string; score: number; }

// La logique réseau sort du composant : une seule source, réutilisable.
export function usePredictions(sessionId: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/predictions?session=${sessionId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setPredictions(data); setLoading(false); })
      .catch(() => {});
    return () => controller.abort();
  }, [sessionId]);

  return { predictions, loading };
}

// src/features/predictions/PredictionPanel.tsx — devient lisible
import { useMemo, useState } from 'react';
import { usePredictions } from './hooks/usePredictions';

export default function PredictionPanel({ sessionId }: { sessionId: string }) {
  const { predictions, loading } = usePredictions(sessionId);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => predictions.filter(p =>
      p.action.toLowerCase().includes(filter.toLowerCase())
    ),
    [predictions, filter],
  );

  if (loading) return <div>Chargement...</div>;
  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      {filtered.map(p => (
        <div key={p.id}>{p.action} — {Math.round(p.score * 100)}%</div>
      ))}
    </div>
  );
}
```

**Pourquoi ce corrigé est correct :**
- L'audit écrit précède le code : on prouve qu'on sait voir les problèmes avant de les toucher.
- Trois commits indépendants : si le commit 3 est repoussé faute de temps, les commits 1 et 2 sont déjà en prod et ont réglé le ralentissement remonté par le lead.
- Chaque commit est isofonctionnel du point de vue utilisateur — l'app tourne toujours dans le navigateur après chacun.
- Le commit 1 fait le minimum (function + `useMemo`) sans embarquer la dédup fetch : une PR = une intention.
- Le hook `usePredictions` n'apparaît qu'au commit 3, une fois les quick wins livrés.

---

## Variante J+30 (fading)

**Même méthode, contrainte ajoutée — reproduire de mémoire, sans rouvrir ce corrigé, en 45 minutes :**

1. Nouveau legacy : le même `PredictionPanel`, mais qui reçoit en plus une prop `threshold` et n'affiche que les prédictions dont `score >= threshold`. Le filtrage par seuil est, lui aussi, recalculé à chaque render.
2. Refais l'audit priorisé écrit, puis migre en **trois commits** comme ci-dessus.
3. **Contrainte nouvelle :** ajoute une gestion d'erreur réseau (état `error`) sans casser le découpage — elle doit vivre dans `usePredictions`, pas dans le composant.
4. **Critère de réussite :** `git log --oneline` montre 3 commits à intention unique, l'app filtre par seuil + texte, et une erreur réseau affiche un message au lieu de planter.

---

## Application TribuZen

Porte l'exercice sur ton vrai projet `smaurier/tribuzen`, qui te sert de terrain d'entraînement à froid :

1. **Fabrique ton propre legacy.** Écris (ou retrouve) un composant TribuZen en class ou avec un calcul non mémorisé — par exemple une `MemberList` qui refiltre à chaque frappe.
2. **Applique la méthode réelle.** Branche `refactor/member-list-audit`, un `AUDIT.md` dans la PR, puis trois commits :
   ```
   refactor(member): MemberList class → function + useMemo
   fix(member): dédup fetch + AbortController
   refactor(member): extraction useMembers
   ```
3. **Trace la dette restante.** Ouvre une issue GitHub `dette:` pour tout raccourci laissé (gestion d'erreur absente, typage `any` transitoire), au lieu de le corriger hors périmètre.

**Différence avec le lab :** ici tu contrôles tout le contexte, donc tu peux te concentrer sur le geste (audit → quick wins → refactor tracé). En mission, ce même geste se joue sous contrainte de temps et de code inconnu — l'entraînement TribuZen est ce qui rend le geste automatique le jour J.
