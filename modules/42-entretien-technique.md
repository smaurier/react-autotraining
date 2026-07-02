---
titre: Entretien technique React
cours: 04-react
notions: [questions React fréquentes, réconciliation et keys, closures et état obsolète, useEffect vs valeur dérivée, contrôlé vs non contrôlé, mémoïsation, RSC vs client, state vs props, live coding, structurer sa réponse à voix haute, défendre son CV à froid]
outcomes: [répondre avec précision aux questions React récurrentes en entretien, dérouler un exercice de live coding en verbalisant sa démarche, défendre un choix d'architecture et son propre CV sans se contredire]
prerequis: [41-patterns-esn]
next: 43-capacitor-fondamentaux
libs: [{ name: react, version: "^19" }]
tribuzen: TribuZen comme projet à présenter en entretien — choix d'archi défendables et décisions verbalisées
last-reviewed: 2026-07
---

# Entretien technique React

> **Outcomes — tu sauras FAIRE :** répondre avec précision aux questions React récurrentes, dérouler un live coding en verbalisant, défendre un choix d'archi et ton propre CV sans te contredire.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Entretien technique React, 45 minutes, deux personnes en face. Après cinq minutes de présentation, l'un ouvre son écran et te dit :

> « Tu as une liste de 2000 membres qui re-rend à chaque frappe dans le champ de recherche. Explique-moi ce qui se passe et comment tu corriges. Partage ton raisonnement à voix haute. »

Puis, quinze minutes plus tard, l'autre reprend ton CV :

> « Tu écris ici : *Eudonet — migration Nuxt/Vue, SSR/ISR, design tokens, features IA*. Raconte-moi une décision d'archi que tu as prise sur ce projet, et pourquoi. »

Ces deux moments décident de l'entretien. Le premier teste ta **compréhension du modèle React** sous pression. Le second teste si tes **claims de CV tiennent à froid**. Aucun des deux ne se joue sur la récitation : les deux se jouent sur ta capacité à **raisonner à voix haute et à assumer tes choix**.

Ce module te donne le stock de réponses précises (théorie), la méthode de live coding (worked examples), les pièges de discours (misconceptions), et l'entraînement à défendre TribuZen et ton CV comme des projets réels.

---

## 2. Théorie complète, concise

Un entretien React tourne toujours autour du même noyau de questions. Les réponses ci-dessous sont calibrées « niveau confirmé » : assez courtes pour être dites en 30-60 secondes, assez précises pour ouvrir une question de suivi que tu maîtrises.

### 2.1 Réconciliation et `key`

React ne compare pas le DOM réel : il compare deux arbres d'éléments (l'ancien et le nouveau rendu) et n'applique au DOM que le diff minimal. C'est la **réconciliation**.

Dans une liste, `key` est l'identité stable qui permet à React de savoir *quel* élément a bougé, été ajouté ou supprimé — sans elle, il apparie par position.

```tsx
// ❌ index comme key : à l'insertion en tête, tous les items sont "réécrits"
{members.map((m, i) => <Row key={i} member={m} />)}

// ✅ id stable : React déplace le noeud existant au lieu de le recréer
{members.map((m) => <Row key={m.id} member={m} />)}
```

Phrase à dire : *« La key doit être stable et unique dans la liste. L'index casse l'état local et les inputs non contrôlés dès qu'on réordonne ou insère au milieu. »*

### 2.2 Closures et état obsolète (stale state)

Chaque rendu est une **fonction figée** : les variables de state y sont des constantes capturées par closure. Un callback asynchrone défini au rendu N voit la valeur du rendu N, même s'il s'exécute plus tard.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // ❌ count est figé à 0 : la closure capture le rendu du montage
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // deps vides → l'effet ne re-capture jamais count

  return <p>{count}</p>; // reste bloqué à 1
}
```

Deux corrections à connaître : la **forme fonctionnelle** `setCount(c => c + 1)` (ne dépend plus de la closure), ou ajouter `count` aux dépendances (recrée l'intervalle à chaque tick — souvent indésirable). La forme fonctionnelle est la bonne réponse.

Phrase à dire : *« C'est un stale closure : mon callback capture le count du montage. Je passe l'updater fonctionnel pour lire la valeur fraîche sans dépendance. »*

### 2.3 `useEffect` vs valeur dérivée

Le piège d'entretien le plus fréquent : synchroniser du state avec `useEffect` alors qu'une **dérivation pendant le rendu** suffit.

```tsx
// ❌ Effect inutile : double rendu, state redondant, risque de désync
const [filtered, setFiltered] = useState<Member[]>([]);
useEffect(() => {
  setFiltered(members.filter(m => m.name.includes(query)));
}, [members, query]);

// ✅ Dérivé pendant le rendu : une seule source de vérité
const filtered = members.filter(m => m.name.includes(query));
// (useMemo seulement si le calcul est réellement coûteux)
```

Règle à énoncer : *« Si une valeur se calcule à partir des props/state, je la calcule pendant le rendu. useEffect sert à synchroniser avec un système extérieur — réseau, DOM, abonnement, timer — pas à recalculer du state. »*

### 2.4 Contrôlé vs non contrôlé

Un champ **contrôlé** a sa valeur pilotée par le state React (`value` + `onChange`) : React est source de vérité, validation en direct facile. Un champ **non contrôlé** laisse le DOM détenir la valeur, lue via `ref` (ou à la soumission).

```tsx
// Contrôlé
const [email, setEmail] = useState('');
<input value={email} onChange={(e) => setEmail(e.target.value)} />

// Non contrôlé
const ref = useRef<HTMLInputElement>(null);
<input ref={ref} defaultValue="" />
// lecture : ref.current?.value
```

À dire : *« Contrôlé pour la validation temps réel et les champs interdépendants. Non contrôlé quand la perf compte sur de gros formulaires — c'est ce que fait React Hook Form par défaut. »*

### 2.5 Mémoïsation (`memo`, `useMemo`, `useCallback`)

- `React.memo(Composant)` : évite le re-rendu si les props (comparaison superficielle) n'ont pas changé.
- `useMemo(fn, deps)` : mémorise un **résultat** de calcul.
- `useCallback(fn, deps)` : mémorise une **référence de fonction** (équivaut à `useMemo(() => fn, deps)`).

La bonne réponse d'entretien n'est pas « j'en mets partout ». C'est : *« Je mesure d'abord avec le Profiler. La mémoïsation a un coût — comparaison + occupation mémoire. Je l'applique quand un composant coûteux re-rend avec les mêmes props, ou pour stabiliser une référence passée à un enfant memo / à des deps d'effet. »*

Bonus actualité : *« Le React Compiler (stable dans l'écosystème React 19) mémoïse automatiquement, ce qui réduit le besoin d'écrire ces hooks à la main. »*

### 2.6 RSC vs composant client

Un **React Server Component** s'exécute sur le serveur, n'envoie aucun JS au client, peut accéder directement à la base ou au filesystem, et n'a ni state ni effet ni event handler. Un **composant client** (`"use client"`) est nécessaire dès qu'il y a interactivité : hooks, événements, API navigateur.

À dire : *« En Next.js App Router, tout est Server Component par défaut ; je passe en client uniquement pour l'îlot interactif, le plus bas possible dans l'arbre, pour garder un bundle minimal. Les RSC ne remplacent pas React Query côté client — ils déplacent le data fetching initial sur le serveur. »*

### 2.7 State vs props

`props` = entrée immuable reçue du parent (le composant ne les modifie pas). `state` = donnée interne, mutable via un setter, dont le changement déclenche un re-rendu. Le flux de données est **descendant** : un enfant remonte une intention via un callback en prop, le parent détenteur du state décide.

À dire : *« Je fais remonter le state au plus proche ancêtre commun qui en a besoin — lifting state up — et je descends la donnée + un callback. Si ça devient trop profond, je passe à un contexte ou un store, jamais à du prop drilling sur cinq niveaux. »*

### 2.8 Structurer sa réponse à voix haute

Le fond ne suffit pas : l'examinateur note **comment** tu penses. Trame en quatre temps, valable pour toute question ouverte ou tout live coding :

1. **Reformuler / cadrer** — « Donc l'objectif c'est X, avec la contrainte Y. »
2. **Énoncer les hypothèses** — « Je suppose que la liste tient en mémoire, que les ids sont uniques. »
3. **Dérouler à voix haute** — nommer chaque décision *et son alternative écartée*.
4. **Conclure + limites** — « Ça marche ; si la liste passe à 100k, je virtualiserais. »

Et la phrase qui sauve : *« Je ne suis pas certain, mais voici comment je vérifierais »* — toujours mieux qu'un silence ou qu'un bluff.

### 2.9 Défendre son CV à froid

Chaque ligne de CV est un **contrat** : l'examinateur peut creuser n'importe laquelle. Pour Sylvain, la ligne Eudonet (Nuxt/Vue, SSR/ISR, design tokens, features IA) doit tenir sans hésitation. Méthode STAR compressée par claim :

- **Situation / tâche** : le contexte en une phrase (quoi, pour qui, contrainte).
- **Action** : *ta* décision technique, pas celle de l'équipe — « j'ai choisi X plutôt que Y parce que… ».
- **Résultat** : l'effet mesurable ou observable (perf, DX, délai, bug évité).

Règles anti-piège : ne jamais claimer ce que tu ne peux pas expliquer à froid ; distinguer « ce que j'ai fait » de « ce que l'équipe a fait » ; si tu ne connais pas un détail d'implémentation, dire ce que tu sais et où tu chercherais. Un claim défendu à moitié est pire qu'un claim absent.

---

## 3. Worked examples

Deux exercices de live coding parmi les plus donnés. On les déroule **comme en entretien** : cadrage, hypothèses, code, verbalisation.

### Exemple 1 — Recherche débouncée sur grande liste (custom hook + perf)

**Énoncé examinateur :** « Champ de recherche filtrant 2000 membres, ça rame à chaque frappe. Corrige, et extrais la logique de debounce. »

**Verbalisation attendue :** *« Trois problèmes possibles : filtrage à chaque frappe, filtrage non mémoïsé, et re-rendu de toutes les lignes. Je débounce l'entrée pour ne filtrer qu'après la pause de frappe, je dérive la liste filtrée pendant le rendu (useMemo car 2000 items × includes est non trivial), et je memo la ligne. »*

```tsx
import { useState, useEffect, useMemo, memo } from 'react';

// 1) Custom hook réutilisable — encapsule la logique de debounce
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // cleanup : annule le timer si value change avant la fin
  }, [value, delay]);
  return debounced;
}

interface Member {
  id: string;
  name: string;
}

// 2) Ligne mémoïsée — ne re-rend que si SA prop member change
const Row = memo(function Row({ member }: { member: Member }) {
  return <li>{member.name}</li>;
});

function MemberSearch({ members }: { members: Member[] }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // filtre après la pause

  // 3) Dérivé pendant le rendu + useMemo car le filtre est coûteux sur 2000 items
  const filtered = useMemo(
    () => members.filter((m) => m.name.toLowerCase().includes(debouncedQuery.toLowerCase())),
    [members, debouncedQuery],
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un membre…"
      />
      <ul>
        {filtered.map((m) => (
          <Row key={m.id} member={m} />
        ))}
      </ul>
    </div>
  );
}
```

**Conclusion à dire :** *« L'input reste contrôlé et réactif — je ne débounce que le calcul, pas l'affichage du champ. Si la liste montait à 50k lignes, j'ajouterais de la virtualisation (@tanstack/react-virtual) parce que le goulot deviendrait le nombre de noeuds DOM, pas le filtre. »*

Piège de suivi anticipé : *« Pourquoi useMemo et pas useEffect+setState ? »* → « Parce que `filtered` se dérive des props/state : le calculer dans le rendu évite un rendu supplémentaire et supprime le risque de désynchronisation. »

### Exemple 2 — Fetch avec états loading / error / annulation

**Énoncé examinateur :** « Charge le profil d'un membre depuis `/api/members/:id`. Gère les états, et le cas où `id` change vite. »

**Verbalisation :** *« Je gère trois états explicites, j'annule la requête précédente avec AbortController pour éviter une race condition et un setState après démontage, et je relance quand id change. »*

```tsx
import { useState, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
  email: string;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Member };

function useMember(id: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(`/api/members/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Member>;
      })
      .then((data) => setState({ status: 'success', data }))
      .catch((err) => {
        if (err.name === 'AbortError') return; // annulation volontaire : on ignore
        setState({ status: 'error', message: err.message });
      });

    return () => controller.abort(); // id change ou démontage → annule la requête en vol
  }, [id]);

  return state;
}

function MemberProfile({ id }: { id: string }) {
  const state = useMember(id);

  if (state.status === 'loading') return <p>Chargement…</p>;
  if (state.status === 'error') return <p role="alert">Erreur : {state.message}</p>;

  return (
    <article>
      <h2>{state.data.name}</h2>
      <p>{state.data.email}</p>
    </article>
  );
}
```

**Conclusion à dire :** *« Le state en union discriminée rend les états impossibles à confondre — pas de `isLoading && data` incohérent. En vrai projet je remplacerais ce hook par React Query : il me donne cache, dédup, retry et revalidation gratuitement. Ici je code la version manuelle pour montrer que je comprends ce que React Query fait sous le capot. »*

Cette dernière phrase est un **signal de séniorité** : montrer qu'on connaît l'outil ET le mécanisme qu'il abstrait.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Réciter au lieu de raisonner

Débiter une définition apprise par coeur sans la relier au problème posé sonne « bachotage ». L'examinateur enchaîne alors sur un « et concrètement, dans ton dernier projet ? » qui te prend à défaut.

**Correct :** ancrer chaque réponse dans un cas — « sur TribuZen, j'ai eu exactement ce cas avec la liste des membres… ». Le concret prouve la compréhension.

### PIÈGE #2 — Mémoïser par réflexe

Dire « je mettrais `useMemo`/`useCallback`/`memo` » en réponse automatique à toute question de perf. C'est un red flag : ça montre qu'on optimise sans mesurer.

**Correct :** *« Je profile d'abord. La mémoïsation a un coût et peut même ralentir si les deps changent tout le temps. »* Nommer le React Compiler qui rend une partie de ces hooks obsolète marque des points.

### PIÈGE #3 — Confondre « ce que j'ai fait » et « ce que l'équipe a fait »

En défendant le CV, gonfler son rôle (« j'ai mis en place le SSR ») quand on a en réalité suivi une archi existante. La question de suivi (« quel cache-control tu avais sur l'ISR ? ») fait tomber le bluff.

**Correct :** délimiter précisément sa contribution. *« L'archi SSR existait ; ma contribution a été les design tokens et l'intégration des features IA. Sur l'ISR je connais le principe (revalidate, stale-while-revalidate) mais ce n'est pas moi qui l'ai configuré. »* L'honnêteté calibrée inspire plus confiance qu'un claim total.

### PIÈGE #4 — `useEffect` pour tout

Proposer un `useEffect` pour dériver du state, formater une valeur, ou réagir à un clic. Symptôme d'une mauvaise carte mentale de React.

**Correct :** dérivation dans le rendu pour le calculé ; event handler pour ce qui répond à une action utilisateur ; `useEffect` uniquement pour synchroniser avec l'extérieur (réseau, abonnement, DOM impératif, timer).

### PIÈGE #5 — Bluffer un « je ne sais pas »

Inventer une réponse sur une API qu'on ne connaît pas. L'examinateur le repère presque toujours, et ça contamine la confiance sur le reste.

**Correct :** *« Je n'ai pas utilisé cette API précise. Ce que je sais, c'est [ce dont tu es sûr]. Pour trancher je regarderais [doc / test / mesure]. »* Montrer sa méthode de résolution vaut mieux qu'une fausse certitude.

### PIÈGE #6 — Coder en silence pendant le live coding

Taper sans parler : l'examinateur ne voit qu'un curseur bouger et ne peut pas noter ton raisonnement. Même du bon code obtient une note tiède si la démarche est muette.

**Correct :** verbaliser en continu — hypothèses, décision, alternative écartée, doute. Le code est le sous-produit ; la pensée est ce qu'on évalue.

---

## 5. Ancrage TribuZen

TribuZen est **ton projet de démonstration** en entretien : un vrai produit dont tu connais chaque décision, donc défendable sous n'importe quelle question de suivi. Prépare-le comme un dossier.

**Le pitch de 90 secondes** — à réciter fluide : *« TribuZen, c'est une app d'organisation familiale. Front React 19 + TypeScript, une admin en composants découpés (ui/ générique, features/ métier), server state avec React Query, back NestJS + PostgreSQL. »* Une phrase par couche, aucune hésitation.

**Trois décisions d'archi à savoir défendre**, chacune avec l'alternative écartée :

1. *« React Query plutôt que Redux pour les données membres/familles »* — parce que c'est du **server state** (cache, revalidation, dédup) et pas du client state ; Redux aurait dupliqué à la main ce que Query fait nativement.
2. *« Découpage ui/ vs features/ »* — les composants génériques (`Avatar`, `Badge`, `Card`) ne connaissent pas le domaine et restent réutilisables ; les containers `features/member` orchestrent. Alternative écartée : structure plate, ingérable au-delà de 10 composants.
3. *« Union discriminée pour les états de chargement »* plutôt que trois booléens `isLoading/isError/isSuccess` — rend les états incohérents impossibles à la compilation.

**S'entraîner à expliquer** : prends une session, ouvre le code TribuZen, et pour chaque fichier demande-toi *« si on me demande pourquoi c'est écrit comme ça, qu'est-ce que je réponds en 20 secondes ? »*. C'est l'exercice qui transforme un projet en argument d'entretien.

**Pont avec ton CV** : le raisonnement « server state vs client state » que tu prépares sur TribuZen est exactement celui qu'on te demandera sur la ligne Eudonet. Entraîne le même muscle : décision → alternative écartée → résultat observable.

---

## 6. Points clés

1. La `key` doit être stable et unique : l'index casse l'état local dès qu'on réordonne ou insère.
2. Un stale closure capture la valeur du rendu où le callback a été créé — l'updater fonctionnel `setX(x => …)` lit toujours la valeur fraîche.
3. Une valeur calculée à partir des props/state se dérive dans le rendu ; `useEffect` sert à synchroniser avec l'extérieur, pas à recalculer du state.
4. Contrôlé = React source de vérité (validation temps réel) ; non contrôlé = DOM détenteur (perf gros formulaires).
5. La mémoïsation se mesure avant de s'appliquer ; le React Compiler en automatise une grande part en React 19.
6. Un RSC s'exécute au serveur sans JS client ni interactivité ; on passe `"use client"` le plus bas possible dans l'arbre.
7. Le flux de données est descendant : lifting state up + callback, jamais du prop drilling profond.
8. En live coding on verbalise en continu : cadrer, hypothèses, décision + alternative écartée, limites.
9. Chaque ligne de CV est un contrat défendable à froid : distinguer sa contribution réelle de celle de l'équipe.
10. Un « je ne sais pas, voici comment je chercherais » vaut mieux qu'un bluff ou un silence.

---

## 7. Seeds Anki

```
En entretien, pourquoi ne faut-il pas utiliser l'index comme key dans une liste ?|La key est l'identité stable qui permet à React d'apparier les éléments lors de la réconciliation. L'index change quand on réordonne ou insère, ce qui casse l'état local des composants et les inputs non contrôlés, et force des re-rendus inutiles. Utiliser un id stable.
Qu'est-ce qu'un stale closure et comment le corriger ?|Un callback créé à un rendu capture par closure les valeurs de state de CE rendu ; exécuté plus tard (timer, event), il voit une valeur figée. Correction : l'updater fonctionnel setX(x => x + 1) lit la valeur fraîche sans dépendre de la closure.
Quand dériver une valeur dans le rendu plutôt que d'utiliser useEffect + setState ?|Dès que la valeur se calcule à partir des props/state (ex : liste filtrée). La dériver dans le rendu (avec useMemo si coûteux) évite un rendu supplémentaire et supprime le risque de désynchronisation. useEffect est réservé à la synchro avec un système extérieur (réseau, DOM, abonnement, timer).
Quelle est la bonne réponse d'entretien sur la mémoïsation (memo/useMemo/useCallback) ?|Mesurer avec le Profiler avant d'optimiser : la mémoïsation a un coût (comparaison + mémoire) et peut ralentir si les deps changent souvent. L'appliquer sur un composant coûteux qui re-rend avec les mêmes props, ou pour stabiliser une référence. Le React Compiler (React 19) en automatise une grande part.
Différence entre un RSC et un composant client ?|Un React Server Component s'exécute au serveur, n'envoie aucun JS au client, peut accéder à la base directement, mais n'a ni state, ni effet, ni event handler. Un composant client ("use client") est requis dès qu'il y a interactivité (hooks, événements, API navigateur). On passe en client le plus bas possible dans l'arbre.
Comment structurer une réponse à voix haute en entretien ?|Quatre temps : (1) reformuler/cadrer l'objectif et les contraintes, (2) énoncer les hypothèses, (3) dérouler la décision à voix haute en nommant l'alternative écartée, (4) conclure avec les limites. Et : "je ne sais pas mais voici comment je chercherais" plutôt qu'un bluff.
Comment défendre une ligne de CV à froid sans se faire piéger ?|Chaque claim est un contrat : méthode STAR (situation, action = TA décision, résultat mesurable). Distinguer sa contribution de celle de l'équipe, ne jamais claimer ce qu'on ne peut expliquer à froid, et sur un détail inconnu dire ce qu'on sait + où on chercherait. Un claim à moitié défendu est pire qu'un claim absent.
Pourquoi coder en verbalisant pendant un live coding ?|L'examinateur évalue le raisonnement, pas seulement le code final. Coder en silence ne laisse rien à noter et fait chuter la note même avec du bon code. Il faut énoncer en continu hypothèses, décisions, alternatives écartées et doutes.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-42-entretien-technique/README.md`. Trois exercices de live coding typiques à résoudre avec corrigé commenté et script de verbalisation à dire à voix haute.
