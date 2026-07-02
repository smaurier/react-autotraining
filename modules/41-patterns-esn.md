---
titre: Patterns de mission ESN
cours: 04-react
notions: [audit rapide d'un code legacy, quick wins et priorisation, structurer une feature dans une codebase inconnue, conventions d'équipe, revue de code pragmatique, migration incrémentale, communication client et lead, estimation, gestion de la dette technique]
outcomes: [auditer un composant React legacy et repérer les quick wins, structurer une feature dans une codebase inconnue sans tout casser, mener une migration incrémentale class vers function et JS vers TS sous contrainte de mission]
prerequis: [40-deploiement]
next: 42-entretien-technique
libs: [{ name: react, version: "^19" }]
tribuzen: TribuZen sert de terrain d'entraînement aux patterns appliqués en mission — refactor incrémental de composants sans réécriture globale
last-reviewed: 2026-07
---

# Patterns de mission ESN

> **Outcomes — tu sauras FAIRE :** auditer un composant React legacy et repérer les quick wins, structurer une feature dans une codebase inconnue sans tout casser, mener une migration incrémentale sous contrainte de mission.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Premier jour de mission chez un client. On te branche sur une app React/shadcn/MUI qui track les mouvements souris pour prédire l'action suivante de l'utilisateur. Personne n'a le temps de t'onboarder. Le lead te lâche : « Le composant qui affiche les prédictions rame et le code est illisible, tu peux regarder ? » Il te montre ça :

```tsx
// PredictionPanel.tsx — legacy, tel que trouvé en mission
class PredictionPanel extends React.Component {
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
    // filtrage recalculé à CHAQUE render, même si rien n'a changé
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

**Tu as trois heures, pas trois semaines.** La tentation du dev junior : « je réécris tout au propre ». La bonne réponse en mission : **auditer, prioriser les quick wins, migrer par petits pas vérifiables, sans casser ce qui marche.** Ce module te donne cette méthode — c'est du savoir-faire de terrain, pas une API à apprendre.

---

## 2. Théorie complète, concise

### 2.1 Auditer un code legacy en 15 minutes

Tu ne lis pas tout. Tu passes le composant sur une grille de lecture rapide, du plus grave au plus cosmétique :

| Priorité | Ce que tu cherches | Exemple dans le cas concret |
|---|---|---|
| P0 — bugs | Fuites, race conditions, `key` manquante, effets non nettoyés | Deux `fetch` dupliqués (mount + update), aucune annulation |
| P1 — perf | Calculs non mémorisés, re-renders inutiles | `filter` recalculé à chaque frappe |
| P2 — lisibilité | Duplication, nommage, composant trop gros | Logique de fetch copiée-collée |
| P3 — style | Formatage, conventions, imports | Concaténation d'URL au lieu de template |

**Règle d'or :** un audit produit une **liste priorisée écrite**, pas une opinion. Tu la partages au lead avant de toucher au code. Ça transforme « j'ai bidouillé » en « voici ce que j'ai trouvé, dans cet ordre, voilà ce que je propose ».

### 2.2 Quick wins : maximiser l'impact / effort

Un quick win = fort impact, faible risque, faible effort. On les fait **d'abord**, on les livre **séparément**, on les fait valider.

| Changement | Impact | Risque | Verdict |
|---|---|---|---|
| Mémoriser le filtrage (`useMemo`) | Perf visible | Nul | Quick win |
| Dédupliquer les deux `fetch` | Lisibilité | Faible | Quick win |
| Passer class → function | Maintenabilité | Moyen | Planifié, pas en urgence |
| Réécrire tout le module de tracking | Élevé | Élevé | Non — hors périmètre |

Le piège de mission, c'est de partir sur le gros refactor risqué avant les quick wins. Tu livres de la valeur visible vite, tu gagnes la confiance du lead, **puis** tu négocies le refactor plus profond.

### 2.3 Structurer une feature dans une codebase inconnue

Quand on te demande d'ajouter une feature, tu ne devines pas l'architecture : tu la **repères** et tu t'y conformes.

1. **Trouve un précédent.** Cherche une feature comparable déjà en place (`grep`, arborescence `features/`). Copie sa structure, pas ton opinion.
2. **Respecte les frontières existantes.** Si le projet range les appels réseau dans `api/`, tu fais pareil, même si tu préfères autre chose.
3. **Une PR = une intention.** Ta feature n'embarque pas un reformatage global du fichier voisin.
4. **Ajoute, ne réécris pas.** Un composant neuf à côté de l'ancien est toujours moins risqué qu'une modification du chemin critique.

> En mission, la cohérence avec l'existant vaut mieux que la perfection isolée. Un code « moins bon mais homogène » se maintient ; un îlot parfait dans un océan legacy déroute l'équipe.

### 2.4 Conventions d'équipe

Avant d'écrire une ligne, tu absorbes les conventions. Elles vivent dans des fichiers, pas dans ta tête :

- `.eslintrc` / `eslint.config.js`, `.prettierrc` — le style est **automatisé**, tu ne débats pas.
- `tsconfig.json` — `strict` activé ou non ? Ça change ta façon de typer.
- `CONTRIBUTING.md`, `commitlint.config.js` — format des commits, des branches.
- Les fichiers voisins — la meilleure doc de convention, c'est le code qui t'entoure.

Sur la stack du cas concret (React/shadcn/MUI), une convention typique : shadcn pour les primitives (`Button`, `Dialog`), MUI hérité sur l'existant. Tu ne migres pas MUI vers shadcn de ta propre initiative — tu suis la règle en place et tu poses la question au lead si elle manque.

### 2.5 Revue de code pragmatique

En ESN tu donnes **et** reçois des reviews. La review efficace distingue trois registres :

| Registre | Formulation | Bloquant ? |
|---|---|---|
| Bug / correction | « Ici `filter` s'exécute à chaque render, `useMemo` le corrige » | Oui |
| Amélioration | « On pourrait extraire `usePredictions`, à voir plus tard » | Non |
| Préférence | « Nit: j'aurais nommé `items` » | Non — préfixe `nit:` |

Règles de terrain : commenter le **code, pas la personne** ; proposer plutôt qu'imposer ; ne pas bloquer une PR sur du cosmétique quand un linter pourrait le faire. Recevoir une review : tu ne te justifies pas à chaud, tu vérifies techniquement, tu remercies. (Voir le module d'accueil sur la réception de feedback : rigueur avant acquiescement.)

### 2.6 Migration incrémentale

Une migration réussie en mission est une **suite de petits pas dont chacun laisse l'app fonctionnelle et commitable**. Jamais un big bang.

**class → function** (le cas concret) :

```tsx
// Étape unique, isofonctionnelle — même comportement, forme moderne
function PredictionPanel({ sessionId }: { sessionId: string }) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/predictions?session=${sessionId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setPredictions(data); setLoading(false); })
      .catch(() => {}); // abort → on ignore
    return () => controller.abort(); // nettoyage = fix de la race condition
  }, [sessionId]); // un seul effet remplace mount + update

  // filtrage mémorisé : recalcul seulement si predictions ou filter change
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

**JS → TS incrémental** : on active `allowJs`, on renomme fichier par fichier `.jsx → .tsx`, on tolère `any` transitoire (ou `// @ts-expect-error` daté) plutôt que de tout typer d'un coup. Chaque fichier migré est une PR isolée.

**v18 → v19** : on met à jour, on lit le codemod officiel React, on traite les warnings de la console un par un. On ne mélange pas la montée de version avec un refactor métier — sinon le diff devient irrelisible et la review impossible.

### 2.7 Communication, estimation, dette

- **Communiquer avec le lead / client** : tu remontes tôt et en termes d'impact, pas de jargon. « Le panneau rame parce que le filtrage recalcule à chaque frappe ; je peux corriger en 1h, ça n'affecte pas le reste. » Un décideur agit sur un impact chiffré, pas sur « le code est sale ».
- **Estimer** : découpe en tâches, chiffre chacune, ajoute une marge d'incertitude explicite. « Migration class→function du panneau : ~half-day incluant vérif manuelle. » Une estimation honnête avec fourchette bat une estimation précise et fausse.
- **Gérer la dette sans tout réécrire** : tu documentes la dette (`// TODO(dette): fetch dupliqué, ticket PRED-42`), tu la rends visible dans un backlog, et tu la rembourses opportunément quand tu passes à côté (règle du boy-scout : laisse le fichier un peu plus propre que trouvé, sans détour). Réécrire tout un module stable « parce qu'il est moche » n'est jamais ta décision unilatérale de prestataire.

---

## 3. Worked examples

### Exemple 1 — De l'audit au plan de refactor (cas concret)

Reprise du `PredictionPanel` class. Livrable d'audit tel que tu l'enverrais au lead.

**Audit priorisé (ce que tu écris dans le ticket) :**

```
PredictionPanel — audit (30 min)
P0  Deux fetch dupliqués (mount + update), aucune annulation
    → race condition si sessionId change vite. FIX: 1 useEffect + AbortController.
P1  filter recalculé à chaque render (chaque frappe re-filtre tout).
    → FIX: useMemo. Impact perf visible sur grosses sessions.
P2  Composant class, logique fetch dupliquée. → migration function + hook usePredictions.
P3  URL concaténée à la main. → template string.

Plan proposé, 3 PR indépendantes :
  PR1 (quick win, ~1h): useMemo sur le filtrage. Zéro risque.
  PR2 (quick win, ~1h): dédup fetch + AbortController. Corrige le P0.
  PR3 (planifié, ~half-day): class→function + extraction usePredictions.
```

**PR3 — extraction du hook après passage en function :**

```tsx
// features/predictions/hooks/usePredictions.ts
// La logique réseau sort du composant : réutilisable, testable, une seule source
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

// features/predictions/components/PredictionPanel.tsx
// Le composant redevient lisible : il orchestre, il ne fetche plus lui-même
function PredictionPanel({ sessionId }: { sessionId: string }) {
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

**Pourquoi ce découpage est juste en mission :** trois PR indépendantes, chacune vérifiable et livrable seule. Si PR3 est repoussée faute de temps, PR1 et PR2 sont déjà en prod et ont réglé le problème remonté par le lead. Tu as livré de la valeur sans parier tout ton crédit sur un gros refactor.

### Exemple 2 — Ajouter une feature sans casser l'existant

Le lead veut un tri des prédictions par score. Tu ne touches pas au chemin critique existant : tu ajoutes.

```tsx
// AVANT : tu cherches le précédent. Un tri existe déjà ailleurs ?
//   grep -r "sort(" src/features → SessionList trie déjà par date.
//   Convention repérée : le tri est un state local + select, pas une lib.
// Tu copies CE pattern, tu n'inventes pas le tien.

type SortKey = 'score' | 'action';

function PredictionPanel({ sessionId }: { sessionId: string }) {
  const { predictions, loading } = usePredictions(sessionId);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score'); // ajout minimal

  const visible = useMemo(() => {
    const filtered = predictions.filter(p =>
      p.action.toLowerCase().includes(filter.toLowerCase())
    );
    // tri dérivé, non destructif : on copie avant de trier
    return [...filtered].sort((a, b) =>
      sortKey === 'score' ? b.score - a.score : a.action.localeCompare(b.action)
    );
  }, [predictions, filter, sortKey]);

  if (loading) return <div>Chargement...</div>;
  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      {/* nouveau contrôle, isolé — le reste du JSX est inchangé */}
      <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
        <option value="score">Par score</option>
        <option value="action">Par action</option>
      </select>
      {visible.map(p => (
        <div key={p.id}>{p.action} — {Math.round(p.score * 100)}%</div>
      ))}
    </div>
  );
}
```

**Ce qui rend cet ajout sûr :** le tri réutilise le `useMemo` existant (pas un second passage), `[...filtered]` évite de muter le state, et le diff de la PR ne touche que trois lignes plus le `<select>`. Un reviewer valide en une minute.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Le grand refactor du premier jour

```
❌ « Ce code est horrible, je réécris le module entier avant d'ajouter ma feature. »
```

Réécrire un module que tu ne connais pas encore, c'est importer tous ses bugs cachés sans son contexte historique. Tu casses des cas limites que personne ne t'a documentés, et le diff monstrueux est impossible à review. **Le correct :** feature d'abord, refactor ciblé ensuite, et seulement avec l'accord du lead.

### PIÈGE #2 — Confondre quick win et gros chantier

```
❌ « Tant qu'à mémoriser le filtre, je migre aussi tout en TypeScript et je change la lib de state. »
```

Empiler des changements dans une même PR détruit la traçabilité : si un bug apparaît, on ne sait plus lequel des cinq changements l'a causé. **Le correct :** une PR = une intention. `useMemo` d'un côté, migration TS de l'autre, chacune reviewable et revertible seule.

### PIÈGE #3 — Imposer ses conventions au client

```
❌ « Chez moi on nomme les fichiers en PascalCase, je change tout. »
```

Ton confort personnel n'est pas la convention du projet. Un projet homogène « à leur façon » se maintient mieux qu'un projet où chaque prestataire a laissé sa signature. **Le correct :** tu lis `.eslintrc`/`.prettierrc`, tu regardes les fichiers voisins, tu t'alignes. Tu proposes un changement de convention en réunion d'équipe, jamais par un commit unilatéral.

### PIÈGE #4 — Sous-estimer parce qu'on veut plaire

```
❌ « Oui, la migration v18→v19 c'est fait pour ce soir. » (dit pour rassurer)
```

Une estimation gonflée d'optimisme se paie en confiance perdue quand tu rates la deadline. **Le correct :** estimer avec une fourchette et l'incertitude explicite (« entre une demi-journée et un jour selon les warnings de dépréciation rencontrés »). Un lead préfère une fourchette honnête à une promesse fausse.

### PIÈGE #5 — Réécrire au lieu de documenter la dette

```tsx
// ❌ Tu tombes sur du code douteux et tu le réécris en douce, hors périmètre ticket
// ✅ Tu le rends visible, tu le rembourses au bon moment
// TODO(dette): usePredictions ne gère pas l'erreur réseau (ticket PRED-42)
```

La dette invisible est la pire : personne ne sait qu'elle existe, personne ne la budgète. **Le correct :** un `TODO` daté avec référence de ticket, et une mention au lead. La règle du boy-scout (laisser un peu plus propre) s'applique au fichier que tu touches déjà, pas à un détour hors sujet.

---

## 5. Ancrage TribuZen

TribuZen est ton **terrain d'entraînement** : les patterns que tu appliques sous pression en mission, tu les répètes à froid sur ton projet perso, où tu contrôles tout le contexte. C'est là que le geste s'ancre.

**Simuler un legacy à auditer.** Écris volontairement une version « sale » d'un composant TribuZen (par exemple `MemberPanel` en class, avec fetch dupliqué et filtrage non mémorisé), puis applique la grille d'audit P0→P3 sur ton propre code. Tu t'entraînes à voir les problèmes sans la pression du client.

**Migration incrémentale réelle.** Si une partie de TribuZen est encore en JS ou en composants class, migre-la fichier par fichier, une PR par fichier, exactement comme en mission — commits `refactor(member): MemberPanel class → function`. Tu produis un historique Git propre qui reflète la méthode.

**Conventions écrites.** Pose dans TribuZen les fichiers de convention que tu subis chez le client : `eslint.config.js` strict, `commitlint.config.js`, `CONTRIBUTING.md`. T'imposer tes propres règles t'apprend à respecter celles des autres.

**Dette tracée.** Ouvre des issues GitHub `dette:` sur `smaurier/tribuzen` pour tout raccourci pris. Tu t'exerces à rendre la dette visible plutôt qu'à la réécrire en catimini — le réflexe exact attendu en mission.

Fichiers concernés dans `smaurier/tribuzen` :
```
tribuzen/
  eslint.config.js          # convention strict, comme en mission
  commitlint.config.js
  CONTRIBUTING.md
  src/features/member/
    MemberPanel.tsx         # cible des refactors incrémentaux
    hooks/useMembers.ts     # extraction issue de l'audit
```

---

## 6. Points clés

1. En mission tu audites avant de coder : liste priorisée écrite P0 (bugs) → P3 (style), partagée au lead avant tout changement.
2. Les quick wins (fort impact, faible risque) se livrent d'abord et séparément — ils gagnent la confiance qui autorise le refactor plus profond.
3. Structurer une feature dans une codebase inconnue = repérer un précédent et le copier, ajouter à côté plutôt que réécrire le chemin critique.
4. Les conventions vivent dans les fichiers (`.eslintrc`, `tsconfig`, voisins) ; tu t'alignes, tu ne les imposes pas.
5. Une revue pragmatique sépare bug (bloquant), amélioration (non bloquant), préférence (`nit:`) ; on commente le code, pas la personne.
6. Une migration incrémentale est une suite de petits pas isofonctionnels, chacun commitable : une PR = une intention, jamais de big bang.
7. On communique en impact chiffré, on estime avec une fourchette honnête, et on rend la dette visible (TODO daté + ticket) au lieu de la réécrire unilatéralement.

---

## 7. Seeds Anki

```
En mission, dans quel ordre priorises-tu un audit de code legacy ?|Du plus grave au plus cosmétique : P0 bugs (fuites, races, effets non nettoyés), P1 perf (calculs non mémorisés), P2 lisibilité (duplication, nommage), P3 style (formatage). Le livrable est une liste priorisée écrite, partagée au lead avant de toucher au code.
Qu'est-ce qu'un quick win et pourquoi le livrer en premier ?|Un changement à fort impact, faible risque et faible effort (ex: useMemo sur un filtrage). On le livre d'abord et séparément parce qu'il apporte de la valeur visible vite, gagne la confiance du lead, et autorise ensuite la négociation du refactor plus profond et risqué.
Comment ajouter une feature dans une codebase inconnue sans casser l'existant ?|Trouver un précédent comparable et copier sa structure, respecter les frontières existantes, ajouter à côté plutôt que réécrire le chemin critique, et garder une PR = une intention (pas de reformatage global embarqué).
Pourquoi une PR ne doit-elle porter qu'une seule intention ?|Empiler plusieurs changements (useMemo + migration TS + changement de lib) détruit la traçabilité : si un bug surgit on ne sait plus lequel l'a causé, et le diff devient impossible à review ou à revert. Une PR = une intention reste vérifiable et revertible seule.
Comment mène-t-on une migration class → function ou JS → TS en mission ?|Par petits pas isofonctionnels, chacun commitable et vérifiable : un useEffect + AbortController pour remplacer mount/update, un fichier renommé .jsx→.tsx par PR avec allowJs, warnings traités un par un. Jamais un big bang mélangé à du refactor métier.
Quelle est la différence entre les trois registres d'une revue de code ?|Bug/correction (bloquant, ex: filter recalculé à chaque render), amélioration (non bloquant, ex: extraire un hook plus tard), préférence (non bloquant, préfixé nit:). On commente le code pas la personne, et on ne bloque pas une PR sur du cosmétique qu'un linter gère.
Comment gérer la dette technique en tant que prestataire ESN ?|La rendre visible (TODO daté + référence de ticket, issue dans le backlog) plutôt que la réécrire unilatéralement. Appliquer la règle du boy-scout sur le fichier qu'on touche déjà, mais ne jamais décider seul de réécrire un module stable « parce qu'il est moche ».
Comment communiquer et estimer face à un lead ou un client ?|Communiquer en termes d'impact chiffré, pas de jargon (« ça rame car le filtrage recalcule à chaque frappe, 1h pour corriger »). Estimer en découpant en tâches avec une fourchette et l'incertitude explicite : une fourchette honnête bat une promesse précise et fausse.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-41-patterns-esn/README.md`. Auditer un composant React legacy fourni, rédiger un audit priorisé, et proposer un plan de refactor incrémental en PR indépendantes — corrigé complet inclus.
