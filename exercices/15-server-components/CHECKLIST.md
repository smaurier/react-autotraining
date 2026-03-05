# Checklist — Exercice 15 : Server Components

## Validation

- [ ] Les interfaces `Product` et `CartItem` sont definies et exportees depuis `src/types/product.ts`
- [ ] Le fichier `products.json` contient au moins 6 produits dans 2 categories
- [ ] La page `products/page.tsx` est un Server Component (pas de `'use client'`)
- [ ] La page utilise `async/await` pour simuler un chargement de donnees
- [ ] `ProductCard` est un Server Component qui n'utilise aucun hook React
- [ ] `AddToCartButton` a la directive `'use client'` en premiere ligne du fichier
- [ ] `AddToCartButton` utilise `useState` pour gerer la quantite et le feedback visuel
- [ ] Les props passees de Server a Client sont serialisables (pas de fonctions)
- [ ] `CartSummary` est un Client Component avec `'use client'`
- [ ] Le `loading.tsx` affiche un skeleton pendant le chargement
- [ ] Aucun hook React (`useState`, `useEffect`, etc.) n'est utilise dans les Server Components
- [ ] La frontiere `'use client'` est placee au plus bas possible dans l'arbre de composants
- [ ] Tous les types sont stricts — aucun `any`
- [ ] Le projet compile sans erreur TypeScript (`npx tsc --noEmit`)
