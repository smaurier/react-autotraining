# 15 pièges fréquents en React

> Référence rapide. Relis ce fichier une fois par semaine pendant ton premier mois.
> Format : problème, code ❌/✅, analogie, impact Vue/Angular -> React.

---

## 1. Muter le state directement

**Problème** : modifier un objet/tableau du state sans créer de nouvelle référence. React ne détecte pas le changement.

```tsx
// ❌ Mutation directe
user.age += 1;
setUser(user); // même référence = pas de re-render

// ✅ Nouvelle référence
setUser({ ...user, age: user.age + 1 });
```

**Analogie** : donner la même enveloppe après avoir changé la lettre dedans. Ton ami ne l'ouvre pas. Donne une **nouvelle** enveloppe.

**Vue/Angular -> React** : en Vue `ref.value.age++` marche grâce au proxy. En React, **l'immutabilité est le contrat**.

---

## 2. useEffect sans tableau de dépendances

**Problème** : oublier `[]` provoque une exécution à chaque render, potentiellement une boucle infinie.

```tsx
// ❌ Exécuté à CHAQUE render -> boucle infinie si setState dedans
useEffect(() => { fetch('/api').then(r => r.json()).then(setData); });

// ✅ Tableau vide = une seule fois au montage
useEffect(() => { fetch('/api').then(r => r.json()).then(setData); }, []);
```

**Analogie** : un réveil qui se redéclenche dès qu'il sonne. Le `[]` est la condition d'arrêt.

**Vue/Angular -> React** : `watchEffect`/`effect()` trackent automatiquement. En React, **tu déclares manuellement** les dépendances.

---

## 3. useEffect pour du state dérivé

**Problème** : `useEffect` + `useState` pour recalculer une valeur = anti-pattern qui ajoute un render inutile.

```tsx
// ❌ Re-render supplémentaire
useEffect(() => {
  setTotal(items.reduce((s, i) => s + i.price, 0));
}, [items]);

// ✅ Variable directe ou useMemo
const total = items.reduce((s, i) => s + i.price, 0);
// Ou si coûteux : const total = useMemo(() => ..., [items]);
```

**Analogie** : demander à un comptable de recalculer par courrier au lieu d'additionner toi-même.

**Vue/Angular -> React** : `computed()` existe pour cela en Vue/Angular. En React, une variable ou `useMemo` suffit.

---

## 4. Créer un composant dans un render

**Problème** : déclarer un composant dans un autre. A chaque render, React crée un nouveau type et détruit le state.

```tsx
// ❌ SearchBar recréé à chaque render, state perdu
function Page() {
  function SearchBar() { const [q, setQ] = useState(''); return <input value={q} onChange={e => setQ(e.target.value)} />; }
  return <SearchBar />;
}

// ✅ Déclarer en dehors
function SearchBar() { const [q, setQ] = useState(''); return <input value={q} onChange={e => setQ(e.target.value)} />; }
function Page() { return <SearchBar />; }
```

**Analogie** : démolir et reconstruire ta cuisine pour chaque café. Le frigo (state) est vidé.

**Vue/Angular -> React** : en Vue/Angular les composants sont dans des fichiers séparés. En React, **ne déclare jamais un composant dans un autre**.

---

## 5. Oublier la `key` dans les listes

**Problème** : `.map()` sans `key` unique et stable. React mélange les states internes.

```tsx
// ❌ Pas de key / index comme key
{items.map((item, i) => <li key={i}>{item.name}</li>)}

// ✅ Identifiant métier
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

**Analogie** : identifier des élèves par leur position dans la rangée. Dès qu'un élève bouge, tout se mélange.

**Vue/Angular -> React** : équivalent de `:key` (Vue) et `track` (Angular `@for`).

---

## 6. Closure stale dans useEffect/useCallback

**Problème** : la fonction capture la valeur du state au moment de sa création. Si les deps ne sont pas à jour, valeur périmée.

```tsx
const [count, setCount] = useState(0);

// ❌ count capturé à 0, ne change jamais
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000); // toujours 0+1
  return () => clearInterval(id);
}, []);

// ✅ Forme fonctionnelle du setter
useEffect(() => {
  const id = setInterval(() => setCount(prev => prev + 1), 1000);
  return () => clearInterval(id);
}, []);
```

**Analogie** : une photo de ta montre à 14h. Deux heures plus tard, la photo dit toujours 14h. Regarde la vraie montre (setter fonctionnel).

**Vue/Angular -> React** : ce piège n'existe pas avec les `ref` (proxy) et les `signal` (lecture à l'exécution). En React, les closures capturent des **valeurs**.

---

## 7. Fetch dans useEffect sans cleanup

**Problème** : pas d'annulation = race condition si le composant se démonte ou si les deps changent.

```tsx
// ❌ Race condition
useEffect(() => {
  fetch(`/api/user/${id}`).then(r => r.json()).then(setUser);
}, [id]);

// ✅ AbortController
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/api/user/${id}`, { signal: ctrl.signal })
    .then(r => r.json()).then(setUser)
    .catch(e => { if (e.name !== 'AbortError') throw e; });
  return () => ctrl.abort();
}, [id]);
```

**Analogie** : commander un plat puis changer d'avis sans annuler. Tu reçois le mauvais plat.

**En pratique** : utilise **TanStack Query** ou les **Server Components** Next.js qui gèrent cela automatiquement.

---

## 8. Trop de re-renders

**Problème** : lever le state trop haut. Chaque changement re-rend tout le sous-arbre.

```tsx
// ❌ mousePos dans App -> Header et HeavyDashboard re-rendus pour rien
function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  return <div onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>
    <Header /><HeavyDashboard /><Cursor position={mousePos} />
  </div>;
}

// ✅ Isoler le state
function MouseTracker() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}><Cursor position={pos} /></div>;
}
```

**Analogie** : allumer tout l'immeuble quand quelqu'un entre dans une pièce. Un interrupteur par pièce.

**Vue/Angular -> React** : la réactivité fine (proxy/signals) limite naturellement les updates. En React, **tout le sous-arbre re-rend**.

---

## 9. Confondre controlled et uncontrolled inputs

**Problème** : `value` sans `onChange` = input verrouillé. Alterner entre `undefined` et string = warning.

```tsx
// ❌ Verrouillé
<input value={name} />

// ✅ Controlled : value + onChange
const [name, setName] = useState('');
<input value={name} onChange={e => setName(e.target.value)} />

// ✅ Uncontrolled : defaultValue + ref
const ref = useRef<HTMLInputElement>(null);
<input defaultValue="Alice" ref={ref} />
```

**Analogie** : controlled = pantin (React tire les ficelles). Uncontrolled = acteur libre (React lui demande sa valeur quand besoin).

**Vue/Angular -> React** : `v-model`/`[(ngModel)]` fait le two-way binding automatiquement. En React, **tu choisis un mode et tu t'y tiens**.

---

## 10. Objets/fonctions inline comme props

**Problème** : nouvel objet/fonction à chaque render = re-render des enfants `memo`.

```tsx
// ❌ Nouvelle référence à chaque render
<UserCard style={{ color: 'red' }} />
<Button onClick={() => handleDelete(id)} />

// ✅ Mémoïser si l'enfant utilise React.memo
const style = useMemo(() => ({ color: 'red' }), []);
const onDel = useCallback(() => handleDelete(id), [id]);
```

**Analogie** : réimprimer une carte de visite identique à chaque poignée de main.

**Important** : ne compte que si l'enfant est wrappé par `React.memo`. Sinon, le re-render a lieu de toute façon.

---

## 11. useCallback/useMemo partout

**Problème** : envelopper systématiquement tout "au cas où". Complexifie sans bénéfice.

```tsx
// ❌ Optimisation prématurée
const fullName = useMemo(() => `${first} ${last}`, [first, last]);

// ✅ Variable simple suffit
const fullName = `${first} ${last}`;
// useMemo/useCallback uniquement si : enfant memo, dep de useEffect, ou calcul > 1ms
```

**Analogie** : mettre un cadenas sur chaque tiroir de ta maison. Protège seulement les objets de valeur.

**React 19** : le compilateur React rend la mémoïsation **automatique**. Les `useMemo`/`useCallback` manuels vont progressivement disparaître.

---

## 12. Ignorer les rules of hooks

**Problème** : appeler un hook dans une condition/boucle. React identifie les hooks par leur **ordre d'appel**.

```tsx
// ❌ Hook conditionnel : l'ordre change
if (userId) { const [user, setUser] = useState(null); }

// ✅ Hooks toujours au top-level, condition DANS l'effet
const [user, setUser] = useState(null);
useEffect(() => {
  if (!userId) return;
  fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
}, [userId]);
```

**Analogie** : tiroirs numérotés. Si tu sautes un tiroir, tout le contenu se décale.

**Règle absolue** : ne jamais désactiver `eslint-plugin-react-hooks` / `rules-of-hooks`.

---

## 13. async dans useEffect

**Problème** : la callback de `useEffect` doit retourner `void` ou une cleanup, pas une `Promise`.

```tsx
// ❌ Retourne une Promise
useEffect(async () => { const data = await fetch('/api'); }, []);

// ✅ Fonction async interne
useEffect(() => {
  async function load() { const r = await fetch('/api'); setData(await r.json()); }
  load();
}, []);
```

**Analogie** : `useEffect` demande "comment te nettoyer ?". Une promesse répond "je te dirai plus tard" -- il ne sait pas quoi en faire.

**TypeScript** te signale l'erreur. En JS pur, c'est silencieux.

---

## 14. Prop drilling au lieu de Context ou Zustand

**Problème** : passer une prop à travers 4-5 niveaux de composants qui ne l'utilisent pas.

```tsx
// ❌ theme passe par App -> Layout -> Sidebar -> Item -> Icon
<Layout theme={theme} setTheme={setTheme} />

// ✅ Context
const ThemeCtx = createContext<{ theme: string; toggle: () => void }>(null!);
// Provider dans App, useContext dans Icon
```

**Analogie** : passer un mot en classe en le faisant transiter par tous les élèves. Le Context = écrire au tableau.

**Vue/Angular -> React** : `provide`/`inject` (Vue), DI (Angular). En React : **Context** (simple) ou **Zustand** (complexe).

---

## 15. Ne pas gérer loading/error state

**Problème** : afficher les données sans gérer chargement/erreur = écran blanc ou crash.

```tsx
// ❌ Pas de loading, pas d'erreur
return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;

// ✅ Toujours les 3 états
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage message={error} />;
return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
```

**Analogie** : commander un livre sans suivi de livraison. `loading`/`error`/`data` = ton numéro de suivi.

**En pratique** : utilise **TanStack Query** qui gère `isLoading`, `isError`, `data`, cache et retries automatiquement.

---

## Résumé

| # | Piège | Règle |
|---|---|---|
| 1 | Mutation directe | Toujours nouvelle référence |
| 2 | useEffect sans `[]` | Toujours fournir les dépendances |
| 3 | useEffect pour state dérivé | Variable ou `useMemo` |
| 4 | Composant dans un render | Déclarer au top-level |
| 5 | Pas de `key` | Key unique et stable |
| 6 | Closure stale | Setter fonctionnel ou deps à jour |
| 7 | Fetch sans cleanup | `AbortController` dans le return |
| 8 | Trop de re-renders | Isoler le state, `React.memo` si besoin |
| 9 | Controlled/uncontrolled | Choisir un mode, s'y tenir |
| 10 | Inline props | Mémoïser si enfant `memo` |
| 11 | memo partout | Optimiser seulement ce qui est mesuré lent |
| 12 | Hook conditionnel | Toujours au top-level, même ordre |
| 13 | async useEffect | Fonction async interne |
| 14 | Prop drilling | Context ou Zustand |
| 15 | Pas de loading/error | Toujours 3 états (ou TanStack Query) |
