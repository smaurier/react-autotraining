# Exercice 01 — Premier composant

**Module** : 00-Introduction · **Difficulte** : ⭐
**Duree estimee** : 45 minutes
**Cours** : `cours/00-introduction/00-introduction.md`

---

## Objectif

Créer ton tout premier composant React avec TypeScript strict. Tu vas découvrir le JSX, le typage des props et l'utilisation du hook `useState` pour gérer un état local simple.

L'exercice te demandé de construire un composant `Greeting` qui affiche un message de bienvenue personnalise, avec la possibilite de basculer entre le français et l'anglais.

---

## Consignes

1. **Créer le fichier** `src/exercises/ex01/Greeting.tsx`.

2. **Définir une interface** `GreetingProps` avec :
   - `name` : `string` — le prenom de l'utilisateur.

3. **Implementer le composant** `Greeting` :
   - Utiliser `useState<"fr" | "en">` pour stocker la langue courante (defaut : `"fr"`).
   - Calculer le message de bienvenue à partir de `name` et de la langue :
     - FR : `"Bonjour, {name} ! Bienvenue sur React."`
     - EN : `"Hello, {name}! Welcome to React."`
   - Afficher le message dans un `<p>`.
   - Afficher un bouton qui bascule la langue (`FR -> EN` ou `EN -> FR`).

4. **Créer le fichier** `src/exercises/ex01/App.tsx` :
   - Importer et utiliser `<Greeting name="Sophie" />`.
   - Ajouter un titre `<h1>` au-dessus du composant.

5. **Vérifier** que le composant fonctionne dans le navigateur : le message change bien à chaque clic sur le bouton.

---

## Contraintes TypeScript

- Mode `strict` active dans `tsconfig.json`.
- L'interface `GreetingProps` doit etre exportee.
- Le type de `useState` doit etre explicite : `useState<"fr" | "en">`.
- Aucun `any` autorise.
- Utiliser la syntaxe avec typage direct des paramètres (pattern recommandé React 19+). Note : `React.FC` est un pattern legacy, à éviter dans du nouveau code.

---

## Bonus

- [ ] Ajouter une troisieme langue (espagnol par exemple) et faire cycler le bouton entre les trois.
- [ ] Ajouter une animation CSS simple lors du changement de langue.
- [ ] Extraire les traductions dans un objet `Record<Language, string>` pour rendre le composant plus maintenable.

---

## Fichiers

```
src/exercises/ex01/
  ├── Greeting.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                  | Attendu |
| ---------------------------------------- | ------- |
| Le composant affiche le bon message      | oui     |
| Le bouton bascule la langue              | oui     |
| Les props sont typees avec une interface | oui     |
| Aucun `any` dans le code                 | oui     |
| Le code compile sans erreur TS           | oui     |

---

## Ressources

- [Documentation React — Your First Component](https://react.dev/learn/your-first-component)
- [Documentation React — useState](https://react.dev/reference/react/useState)
- [TypeScript Handbook — Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html)
