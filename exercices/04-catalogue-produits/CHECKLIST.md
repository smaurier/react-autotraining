# Checklist — Exercice 04 : Catalogue produits

Coche chaque element une fois valide :

- [ ] Le fichier `types.ts` contient l'interface `Product` exportee
- [ ] Le fichier `data.ts` contient un tableau de 5 produits types
- [ ] `ProductCard` accepte les props `product` et `onAddToCart` correctement typees
- [ ] Le prix est formate au format francais (ex : `12,99 EUR`)
- [ ] Le badge affiche "En stock" ou "Rupture" selon `inStock`
- [ ] Le bouton "Ajouter au panier" est desactive pour les produits en rupture
- [ ] `CartSummary` affiche le nombre d'articles dans le panier
- [ ] Le callback `onAddToCart` remonte l'information de l'enfant vers le parent
- [ ] L'etat du panier est gere dans le composant parent (`ProductList`)
- [ ] `.map()` utilise `product.id` comme `key`
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
- [ ] La structure des fichiers respecte la separation des responsabilites
