# Exercice 02 — Compteur hooks

**Module** : 01-Les-bases · **Difficulte** : ⭐
**Duree estimee** : 45 minutes
**Cours** : `cours/01-les-bases/01-les-bases.md`

---

## Objectif

Approfondir l'utilisation de `useState` en creant un compteur interactif. Tu apprendras a gerer un etat numerique, a calculer des valeurs derivees sans etat supplementaire, et a bien structurer les handlers d'evenements.

---

## Consignes

1. **Creer le fichier** `src/exercises/ex02/Counter.tsx`.

2. **Implementer l'etat** :
   - `count` : `number` — la valeur courante du compteur, initialisee a `0`.

3. **Calculer les valeurs derivees** (sans `useState` supplementaire) :
   - `double` : le double de `count`.
   - `isEven` : `boolean` indiquant si `count` est pair.

4. **Afficher dans le JSX** :
   - La valeur de `count` dans un `<span>` avec la classe `counter__value`.
   - La valeur de `double` dans un `<span>` avec la classe `counter__double`.
   - Un indicateur textuel "Pair" ou "Impair" selon `isEven`.

5. **Ajouter trois boutons** :
   - **Incrementer** (`+1`) : augmente `count` de 1.
   - **Decrementer** (`-1`) : diminue `count` de 1.
   - **Reset** : remet `count` a `0`.

6. **Creer le fichier** `src/exercises/ex02/App.tsx` :
   - Importer et afficher `<Counter />` avec un titre `<h1>`.

7. **Tester manuellement** dans le navigateur : verifier que les trois boutons fonctionnent et que les valeurs derivees se mettent a jour.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le type de `useState` doit etre explicite : `useState<number>(0)`.
- Les handlers d'evenements doivent etre types implicitement (pas de `any`).
- Les valeurs derivees doivent etre des `const` (pas de `let`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un champ `<input type="number">` pour definir le pas (step) d'incrementation/decrementation.
- [ ] Empecher le compteur de descendre en dessous de `0` (avec un minimum configurable via props).
- [ ] Afficher l'historique des 5 dernieres valeurs dans une liste `<ul>`.

---

## Fichiers

```
src/exercises/ex02/
  ├── Counter.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                     | Attendu |
| ------------------------------------------- | ------- |
| Le compteur affiche la valeur courante      | oui     |
| Les boutons +1, -1 et Reset fonctionnent    | oui     |
| `double` et `isEven` sont des valeurs derivees | oui  |
| Aucun `useState` supplementaire pour les valeurs derivees | oui |
| Aucun `any` dans le code                    | oui     |
| Le code compile sans erreur TS              | oui     |

---

## Ressources

- [Documentation React — useState](https://react.dev/reference/react/useState)
- [React — Responding to Events](https://react.dev/learn/responding-to-events)
- [React — State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
