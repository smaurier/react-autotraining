# Exercice 05 — Chronometre

**Module** : 01-Les-bases · **Difficulte** : ⭐⭐
**Duree estimee** : 45 minutes
**Cours** : `cours/01-les-bases/01-les-bases.md`

---

## Objectif

Construire un chronometre fonctionnel pour maitriser `useRef` (stocker une reference mutable sans re-render), `useEffect` avec sa fonction de nettoyage, et le formatage du temps. Cet exercice met en lumiere la difference fondamentale entre `useRef` et `useState`.

---

## Consignes

1. **Creer le fichier** `src/exercises/ex05/Stopwatch.tsx`.

2. **Implementer les etats** :
   - `time` : `number` — le temps ecoule en millisecondes.
   - `isRunning` : `boolean` — indique si le chronometre tourne.

3. **Utiliser `useRef`** pour stocker l'identifiant de l'intervalle :
   - `intervalRef` : `React.MutableRefObject<ReturnType<typeof setInterval> | null>`.
   - La ref permet de conserver l'id de l'intervalle entre les renders sans declencher de re-render.

4. **Implementer les actions** :
   - **Demarrer** : lancer un `setInterval` toutes les 10ms qui incremente `time`.
   - **Arreter** : stopper l'intervalle avec `clearInterval`.
   - **Reset** : stopper l'intervalle et remettre `time` a `0`.

5. **Nettoyer avec `useEffect`** :
   - Ajouter un `useEffect` qui nettoie l'intervalle au demontage du composant.

6. **Formater l'affichage** :
   - Afficher le temps au format `MM:SS.ms` (ex : `01:23.45`).
   - Extraire le formatage dans une fonction utilitaire `formatTime(ms: number): string`.

7. **Creer le fichier** `src/exercises/ex05/App.tsx`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le type de `useRef` doit etre explicite.
- La fonction `formatTime` doit etre typee (parametres et retour).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un systeme de tours (laps) : un bouton "Tour" enregistre le temps courant dans un tableau.
- [ ] Afficher la liste des tours avec le temps de chaque segment.
- [ ] Ajouter une animation visuelle quand le chronometre tourne.

---

## Fichiers

```
src/exercises/ex05/
  ├── Stopwatch.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                        | Attendu |
| ---------------------------------------------- | ------- |
| Le chronometre demarre et s'arrete correctement | oui    |
| Le reset remet le temps a zero                 | oui     |
| `useRef` est utilise pour l'id de l'intervalle | oui     |
| `useEffect` nettoie l'intervalle au demontage  | oui     |
| Le temps est formate en `MM:SS.ms`             | oui     |
| Aucun `any` dans le code                       | oui     |
| Le code compile sans erreur TS                 | oui     |

---

## Ressources

- [React — useRef](https://react.dev/reference/react/useRef)
- [React — useEffect](https://react.dev/reference/react/useEffect)
- [MDN — setInterval](https://developer.mozilla.org/en-US/docs/Web/API/setInterval)
