# Cours 10 — useEffect

> **Objectif** : Comprendre le modèle mental de `useEffect` — synchroniser un composant avec un système externe, maîtriser les 3 formes (sans deps, `[]`, `[deps]`), la cleanup function, et éviter les anti-patterns. Transposer `watch`/`watchEffect`/`effect()` vers `useEffect`.

---

## Rappel du cours précédent

<details>
<summary>1. Pourquoi faut-il utiliser l'updater function `(prev) => prev + 1` plutôt que `setCount(count + 1)` ?</summary>

Avec la valeur directe, si plusieurs appels au setter sont effectués dans le même handler, ils lisent tous la même valeur issue de la closure. L'updater function se base sur la **valeur précédente réelle**, garantissant des mises à jour séquentielles correctes.
</details>

<details>
<summary>2. Comment ajouter un élément à un tableau dans le state de manière immutable ?</summary>

`setItems((prev) => [...prev, newItem])` — on crée un nouveau tableau via le spread operator au lieu de muter l'existant avec `push()`.
</details>

<details>
<summary>3. Qu'est-ce que le lazy initialization de `useState` ?</summary>

Passer une **fonction** (pas une valeur) comme argument initial : `useState(() => expensiveComputation())`. La fonction n'est exécutée qu'au **premier rendu**, évitant un calcul coûteux à chaque re-render.
</details>

---

## Analogie

`useEffect` est comme un **abonnement à un journal**. Vous dites : "Quand je déménage (changement de dépendance), annulez mon ancien abonnement (cleanup) et souscrivez-en un nouveau à ma nouvelle adresse (effet)." Si vous ne précisez pas de condition, vous recevez un nouveau journal à chaque instant (chaque rendu). Si vous précisez "seulement quand je déménage" (`[address]`), l'abonnement ne change que quand l'adresse change. Et `[]` signifie "abonnez-moi une seule fois quand j'emménage, et résiliez quand je quitte".

---

## Théorie

### 1. Le modèle mental : synchronisation avec l'extérieur

`useEffect` ne sert **pas** à "réagir à un changement d'état". Il sert à **synchroniser** votre composant avec un système extérieur : API réseau, DOM, timers, WebSocket, localStorage…

```tsx
// ✅ useEffect pour synchroniser avec une API (système externe)
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);

// ❌ useEffect pour calculer une valeur dérivée (pas un système externe)
useEffect(() => {
  setFullName(firstName + " " + lastName); // Anti-pattern !
}, [firstName, lastName]);

// ✅ Valeur dérivée — simple variable, pas de useEffect
const fullName = firstName + " " + lastName;
```

### 2. Les 3 formes de useEffect

```tsx
// Forme 1 : pas de tableau de dépendances → s'exécute APRÈS chaque rendu
useEffect(() => {
  console.log("Rendu effectué");
});

// Forme 2 : tableau vide [] → s'exécute UNE SEULE FOIS après le montage
useEffect(() => {
  console.log("Composant monté");
  return () => console.log("Composant démonté"); // cleanup
}, []);

// Forme 3 : dépendances [a, b] → s'exécute quand a OU b change
useEffect(() => {
  console.log("userId ou token a changé");
  const controller = new AbortController();
  fetchData(userId, token, controller.signal).then(setData);
  return () => controller.abort(); // cleanup
}, [userId, token]);
```

| Forme            | Quand ça s'exécute                 | Cas d'usage                    |
|------------------|------------------------------------|--------------------------------|
| `useEffect(fn)`  | Après **chaque** rendu             | Logging, mesure DOM            |
| `useEffect(fn, [])` | Au **montage** uniquement      | Init WebSocket, event listener |
| `useEffect(fn, [deps])` | Quand une **dep** change    | Fetch, sync avec URL           |

### 3. La cleanup function

La fonction retournée par l'effet est appelée :
- **Avant** la ré-exécution de l'effet (quand les deps changent)
- **Au démontage** du composant

```tsx
// ✅ Timer avec cleanup
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalId); // Nettoyer le timer
  }, []); // [] = monté une fois, démonté = cleanup

  return <p>Temps : {seconds}s</p>;
}

// ✅ Event listener sur window
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

// ✅ AbortController pour annuler un fetch
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((err) => {
      if (err.name !== "AbortError") setError(err.message);
    });

  return () => controller.abort();
}, [userId]);
```

### 4. Règles importantes

#### Pas de callback `async` directe

```tsx
// ❌ useEffect ne peut PAS retourner une Promise
useEffect(async () => {
  const data = await fetchData(); // TS error + warning React
  setData(data);
}, []);

// ✅ Fonction async interne
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await fetchData();
      setData(data);
    } catch (err) {
      setError("Erreur de chargement");
    }
  };
  loadData();
}, []);
```

#### Dépendances exhaustives

React (et le plugin ESLint `react-hooks/exhaustive-deps`) exige que **toutes les valeurs** lues dans l'effet soient dans le tableau de dépendances :

```tsx
// ❌ Dépendance manquante — userId est lu mais pas dans les deps
useEffect(() => {
  fetchUser(userId).then(setUser);
}, []); // ESLint warning: missing dependency 'userId'

// ✅ Dépendance déclarée
useEffect(() => {
  fetchUser(userId).then(setUser);
}, [userId]);
```

> **Ne trichez jamais** avec `// eslint-disable-next-line`. Si vous avez besoin de supprimer un warning, c'est un signe que votre effet est mal structuré.

### 5. Strict Mode et double-invoke

En mode développement, React 18+ avec `<StrictMode>` **monte, démonte, puis remonte** le composant pour vérifier que votre cleanup fonctionne :

```tsx
// Ce que vous voyez en console (dev uniquement) :
// "Effect mounted"
// "Effect cleanup"     ← démontage Strict Mode
// "Effect mounted"     ← remontage Strict Mode

useEffect(() => {
  console.log("Effect mounted");
  return () => console.log("Effect cleanup");
}, []);
```

> **Ce n'est pas un bug.** C'est intentionnel pour détecter les effets sans cleanup. En production, l'effet ne s'exécute qu'une fois.

### 6. Anti-pattern : useEffect pour l'état dérivé

C'est l'erreur la plus fréquente chez les développeurs venant de Vue/Angular :

```tsx
// ❌ Anti-pattern : useEffect pour calculer une valeur dérivée
function Cart({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  }, [items]);

  return <p>Total : {total} EUR</p>;
}

// ✅ Calcul direct pendant le rendu — simple et performant
function Cart({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return <p>Total : {total} EUR</p>;
}

// ✅ Si le calcul est coûteux, utilisez useMemo (pas useEffect)
function Cart({ items }: { items: CartItem[] }) {
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return <p>Total : {total} EUR</p>;
}
```

### 7. Pattern : fetch avec gestion loading/error

```tsx
import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`https://api.example.com/users/${userId}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: User) => setUser(data))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [userId]);

  if (isLoading) return <p>Chargement...</p>;
  if (error) return <p>Erreur : {error}</p>;
  if (!user) return <p>Utilisateur introuvable</p>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### 8. Comparaison : watch / watchEffect / effect() vs useEffect

| Aspect              | Vue 3 `watch`            | Vue 3 `watchEffect`    | Angular `effect()`      | React `useEffect`         |
|---------------------|--------------------------|------------------------|-------------------------|---------------------------|
| Dépendances         | Explicites               | Auto-trackées          | Auto-trackées           | Explicites (tableau)      |
| Cleanup             | `onCleanup(fn)`          | `onCleanup(fn)`        | `onCleanup(fn)`         | `return () => { ... }`   |
| Exécution initiale  | Non (sauf `immediate`)   | Oui                    | Oui                     | Oui (après 1er rendu)    |
| Granularité         | Valeur précise            | Toutes les refs lues   | Tous les signals lus    | Deps explicites           |
| Lazy                | Oui (pas immédiat)       | Non                    | Non                     | Non                       |

```tsx
// Vue 3 — watch
watch(() => userId.value, async (newId) => {
  user.value = await fetchUser(newId);
});

// Vue 3 — watchEffect
watchEffect(async (onCleanup) => {
  const controller = new AbortController();
  onCleanup(() => controller.abort());
  user.value = await fetchUser(userId.value, controller.signal);
});

// Angular 19 — effect()
effect((onCleanup) => {
  const id = this.userId();
  const sub = this.http.get(`/users/${id}`).subscribe(data => this.user.set(data));
  onCleanup(() => sub.unsubscribe());
});

// React — useEffect
useEffect(() => {
  const controller = new AbortController();
  fetchUser(userId, controller.signal).then(setUser);
  return () => controller.abort();
}, [userId]);
```

> **Point clé** : en Vue/Angular, les dépendances sont trackées automatiquement. En React, vous devez les déclarer manuellement — c'est plus verbeux mais évite les ré-exécutions surprises.

---

## Pratique

### Exercice : horloge temps réel avec fuseau horaire

Créez un composant `WorldClock` qui :
1. Affiche l'heure actuelle, mise à jour chaque seconde
2. Permet de choisir un fuseau horaire via un `<select>` (Europe/Paris, America/New_York, Asia/Tokyo)
3. **Nettoie** le timer quand le composant est démonté
4. Affiche "Chargement..." brièvement au changement de fuseau (simulation)

<details>
<summary>Voir la solution</summary>

```tsx
import { useState, useEffect } from "react";

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris" },
  { value: "America/New_York", label: "New York" },
  { value: "Asia/Tokyo", label: "Tokyo" },
];

function WorldClock() {
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [time, setTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    // Simuler un bref chargement au changement de fuseau
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    const updateTime = () => {
      const now = new Date().toLocaleTimeString("fr-FR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(now);
    };

    updateTime(); // Première mise à jour immédiate
    const intervalId = setInterval(updateTime, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalId);
    };
  }, [timezone]);

  return (
    <div>
      <h2>Horloge mondiale</h2>

      <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>

      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <p style={{ fontSize: "2rem", fontFamily: "monospace" }}>
          {time}
        </p>
      )}
    </div>
  );
}

export default WorldClock;
```
</details>

---

## Résumé

| Concept                     | Ce qu'il faut retenir                                         |
|-----------------------------|---------------------------------------------------------------|
| `useEffect(fn)`             | S'exécute après **chaque** rendu — rare en pratique           |
| `useEffect(fn, [])`         | S'exécute au **montage** uniquement — init, listeners         |
| `useEffect(fn, [deps])`     | S'exécute quand les **deps** changent — fetch, sync           |
| Cleanup `return () => {}`   | Nettoyer timers, listeners, AbortController                   |
| Pas d'async directe         | Créer une fonction async interne                              |
| Deps exhaustives             | Toujours déclarer TOUT ce qui est lu dans l'effet             |
| Anti-pattern                | Ne pas utiliser useEffect pour calculer un état dérivé        |

> **Prochain cours** : [Cours 11 — useRef et le DOM](./03-useref-et-dom.md)
