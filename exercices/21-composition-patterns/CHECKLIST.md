# Checklist — Exercice 21 : Composition patterns

## Validation

- [ ] L'API est declarative : `<Tabs>`, `<Tabs.List>`, `<Tabs.Tab>`, `<Tabs.Panel>`
- [ ] Le Context `TabsContext` est interne et non exporte publiquement
- [ ] Le hook `useTabsContext()` lance une erreur si utilise hors du `<Tabs>`
- [ ] L'onglet actif est géré par un `useState` interne (mode non controle)
- [ ] `role="tablist"` est sur le conteneur des onglets
- [ ] `role="tab"` avec `aria-selected` et `aria-controls` est sur chaque onglet
- [ ] `role="tabpanel"` avec `aria-labelledby` est sur chaque panel
- [ ] La navigation clavier fonctionne (fleches gauche/droite avec bouclage)
- [ ] `tabIndex` est géré correctement (0 pour l'actif, -1 pour les autres)
- [ ] Le composant est headless — aucun style CSS impose
- [ ] Deux instances independantes fonctionnent sur la même page
- [ ] Le support `disabled` empeche la selection d'un onglet
- [ ] `Object.assign` est utilise pour attacher les sous-composants
- [ ] Aucun `any` dans le code — types stricts partout
