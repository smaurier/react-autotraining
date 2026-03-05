# Checklist — Exercice 01 : Premier composant

Coche chaque element une fois valide :

- [ ] Le fichier `Greeting.tsx` existe dans `src/exercises/ex01/`
- [ ] L'interface `GreetingProps` est definie et exportee avec `name: string`
- [ ] Le composant `Greeting` accepte la prop `name` avec destructuring
- [ ] `useState<"fr" | "en">` est utilise avec un type explicite
- [ ] Le message de bienvenue change selon la langue selectionnee
- [ ] Un bouton permet de basculer entre FR et EN
- [ ] Le bouton a l'attribut `type="button"`
- [ ] Le fichier `App.tsx` importe et utilise `<Greeting name="Sophie" />`
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
- [ ] Le composant s'affiche correctement dans le navigateur
- [ ] Le message change bien a chaque clic sur le bouton de bascule
