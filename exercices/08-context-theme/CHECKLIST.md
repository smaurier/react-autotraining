# Checklist — Exercice 08 : Context theme

Coche chaque element une fois valide :

- [ ] Le type `Theme` est defini comme `"light" | "dark"`
- [ ] L'interface `ThemeContextValue` contient `theme` et `toggleTheme`
- [ ] Le contexte est cree avec `createContext<ThemeContextValue | null>(null)`
- [ ] Le `ThemeProvider` gere l'etat `theme` et fournit la valeur via le Provider
- [ ] Le hook `useTheme()` consomme le contexte avec `useContext`
- [ ] Le hook `useTheme()` lance une erreur si utilise hors du Provider
- [ ] Le composant `Header` affiche le theme courant et un bouton de bascule
- [ ] Le composant `Card` adapte son style selon le theme
- [ ] Le `App.tsx` enveloppe les composants dans `<ThemeProvider>`
- [ ] La bascule light/dark fonctionne correctement
- [ ] Aucun prop drilling n'est utilise pour transmettre le theme
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
