# Exercice 25 — Entretien React

**Module** : 12-Recettes ESN · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/12-recettes-esn/01-architecture-projet.md`

---

## Objectif

Se preparer a un entretien technique React en ESN. L'exercice se compose de deux parties : un QCM de 20 questions couvrant l'ensemble du parcours, et 3 exercices de live coding chronometres. C'est une simulation realiste de ce que tu pourrais rencontrer lors d'un entretien.

---

## Partie 1 : QCM — 20 questions (20 minutes)

Reponds a chaque question sans consulter la documentation. Note tes reponses, puis verifie avec la correction.

### Questions

**1.** Quelle est la difference principale entre `useState` et `useReducer` ?

**2.** Que signifie la directive `'use client'` dans Next.js App Router ?

**3.** Quel hook utiliser pour acceder a un element DOM sans provoquer de re-render ?

**4.** Quelle est la difference entre `React.memo` et `useMemo` ?

**5.** Dans Next.js 15, quel est le type de `params` dans un composant page dynamique ?

**6.** Quel est le role de `revalidatePath()` dans une Server Action ?

**7.** Pourquoi `useFormStatus` doit-il etre dans un composant enfant du `<form>` ?

**8.** Quelle est la difference entre un Route Handler et une Server Action ?

**9.** Comment eviter le "prop drilling" dans une application React ?

**10.** Quel est l'avantage de Zustand par rapport a Context pour le state management ?

**11.** Que fait `React.lazy()` et avec quoi doit-il etre combine ?

**12.** Quelle est la difference entre `getByRole` et `getByTestId` dans Testing Library ?

**13.** A quoi sert MSW dans les tests d'integration ?

**14.** Quelle directive ajouter pour transformer un Server Component en Client Component ?

**15.** Quel est le role du fichier `middleware.ts` dans Next.js ?

**16.** Comment Zod s'integre avec React Hook Form ?

**17.** Quelle est la strategie "mobile-first" dans Tailwind CSS ?

**18.** Quel callback de `useEffect` s'execute au demontage du composant ?

**19.** Pourquoi ne faut-il jamais muter le state directement en React ?

**20.** Quel est le role du `key` prop dans une liste React ?

---

## Partie 2 : Live Coding (40 minutes)

### Exercice LC1 — Counter avec hooks (5 minutes)

Creer un composant `Counter` avec TypeScript strict :
- Affiche un compteur qui demarre a 0.
- Boutons "+" et "-" pour incrementer/decrementer.
- Le compteur ne peut pas descendre en dessous de 0.
- Afficher si le nombre est pair ou impair.
- Pas de `any`.

### Exercice LC2 — Custom hook useDebounce (10 minutes)

Creer un hook `useDebounce<T>(value: T, delay: number): T` :
- Retourne la valeur debounced.
- Se met a jour apres `delay` ms sans changement.
- Nettoie le timeout au demontage.
- Utiliser ce hook dans un composant de recherche qui affiche les resultats.

### Exercice LC3 — Composant de data fetching (10 minutes)

Creer un composant `UserList` qui :
- Fetch une liste d'utilisateurs depuis `https://jsonplaceholder.typicode.com/users`.
- Affiche un etat de chargement.
- Affiche un message d'erreur si le fetch echoue.
- Affiche la liste (nom + email) en cas de succes.
- Utiliser un custom hook `useFetch<T>(url: string)`.
- TypeScript strict, pas de `any`.

---

## Contraintes TypeScript

- Mode `strict` active pour tous les exercices de live coding.
- Aucun `any` autorise.
- Les hooks doivent etre generiques la ou c'est pertinent.
- Les interfaces doivent etre explicites.

---

## Bonus

- [ ] Ajouter un chronometre pour mesurer ton temps reel sur chaque exercice.
- [ ] Refaire les exercices de live coding une semaine plus tard sans la correction.
- [ ] Creer 5 questions supplementaires sur Next.js 15 specifiquement.
- [ ] S'entrainer a expliquer a voix haute pendant le coding (comme en entretien).

---

## Fichiers

```
src/exercises/
  ex25/
    Counter.tsx
    useDebounce.ts
    useFetch.ts
    UserList.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| QCM : au moins 16/20 reponses correctes         | oui     |
| LC1 : Counter fonctionnel en moins de 5 minutes | oui     |
| LC2 : useDebounce generique et fonctionnel       | oui     |
| LC3 : Composant avec gestion loading/error/success | oui  |
| Tous les exercices en TypeScript strict          | oui     |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [React — Documentation officielle](https://react.dev)
- [Next.js — Documentation officielle](https://nextjs.org/docs)
- [TypeScript — Handbook](https://www.typescriptlang.org/docs/handbook/)
