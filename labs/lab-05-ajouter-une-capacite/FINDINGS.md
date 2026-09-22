# Findings — avant de toucher à `IconButton.tsx`

À remplir AVANT d'ouvrir `src/IconButton.tsx`. Le correcteur lit ce fichier avant de
regarder ton code.

1. **Quels écrans cette modification touche-t-elle ?** Liste-les depuis `src/screens/`,
   AVANT de les ouvrir. Compare ensuite avec ce que tu trouves réellement — note l'écart
   s'il y en a un.

2. **Pourquoi désactiver le clic à DEUX niveaux** (l'attribut HTML `disabled` ET une garde
   dans le gestionnaire JS) plutôt qu'un seul ? Dans quel cas concret l'attribut `disabled`
   seul ne suffit-il pas ?

3. **Que doit voir/entendre un utilisateur de lecteur d'écran** pendant que `loading` est
   actif ? `aria-busy` seul suffit-il, ou faut-il autre chose ?

4. **Risque par écran consommateur** : lequel des trois (`PinButton`, `DeleteButton`,
   `RefreshButton`) a une particularité (prop supplémentaire, style) que ta modification
   pourrait écraser si tu n'y fais pas attention ?
