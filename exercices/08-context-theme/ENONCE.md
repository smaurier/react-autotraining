# Exercice 08 — Context theme

**Module** : 03-Gestion-état · **Difficulte** : ⭐⭐
**Duree estimee** : 45 minutes
**Cours** : `cours/03-gestion-etat/03-gestion-etat.md`

---

## Objectif

Implementer un système de theme (clair/sombre) avec l'API Context de React. Tu apprendras a créer un contexte, a le fournir via un Provider, a le consommer avec `useContext`, et a éviter le prop drilling.

---

## Consignes

1. **Créer le fichier** `src/exercises/ex08/ThemeContext.tsx` :
   - Définir le type `Theme` : `"light" | "dark"`.
   - Définir l'interface `ThemeContextValue` avec :
     - `theme: Theme` — le theme courant.
     - `toggleTheme: () => void` — fonction pour basculer le theme.
   - Créer le contexte avec `createContext<ThemeContextValue | null>(null)`.
   - Créer le composant `ThemeProvider` qui :
     - Gere l'état `theme` avec `useState<Theme>("light")`.
     - Fournit `theme` et `toggleTheme` via le Provider.
     - Rend `children`.
   - Créer le hook `useTheme()` qui :
     - Appelle `useContext(ThemeContext)`.
     - Lance une erreur si utilise en dehors du Provider.

2. **Créer le composant** `src/exercises/ex08/Header.tsx` :
   - Utiliser `useTheme()` pour afficher le theme courant.
   - Afficher un bouton "Basculer le theme" qui appelle `toggleTheme`.

3. **Créer le composant** `src/exercises/ex08/Card.tsx` :
   - Utiliser `useTheme()` pour appliquer des styles différents selon le theme.
   - Afficher un contenu exemple (titre + paragraphe).

4. **Créer le fichier** `src/exercises/ex08/App.tsx` :
   - Envelopper les composants dans `<ThemeProvider>`.
   - Afficher `Header` et plusieurs `Card`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le contexte doit etre type avec `ThemeContextValue | null`.
- Le hook `useTheme` doit avoir un type de retour `ThemeContextValue` (pas `null`).
- Aucun `any` autorise.
- Les types doivent etre exportes.

---

## Bonus

- [ ] Persister le theme dans `localStorage` (réutiliser `useLocalStorage` de l'exercice 07).
- [ ] Ajouter un troisieme theme "system" qui suit les preferences du navigateur (`prefers-color-scheme`).
- [ ] Appliquer le theme sur le `document.body` via `useEffect`.

---

## Fichiers

```
src/exercises/ex08/
  ├── ThemeContext.tsx
  ├── Header.tsx
  ├── Card.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                            | Attendu |
| -------------------------------------------------- | ------- |
| Le contexte est créé avec `createContext`           | oui     |
| Le Provider fournit `theme` et `toggleTheme`       | oui     |
| `useTheme()` consomme le contexte correctement     | oui     |
| `useTheme()` lance une erreur si utilise hors Provider | oui |
| Le theme bascule entre light et dark               | oui     |
| Les composants enfants s'adaptent au theme         | oui     |
| Aucun `any` dans le code                           | oui     |

---

## Ressources

- [React — createContext](https://react.dev/reference/react/createContext)
- [React — useContext](https://react.dev/reference/react/useContext)
- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
